/**
 * Azure Translator 프록시 — **Cloudflare Worker** 버전(배포본용).
 *
 * GitHub Pages(jeongmiin.github.io)와 운영 도메인(newsletter.messeesang.com)은 정적 호스팅이라
 * 서버 코드를 못 돌린다. 이 Worker가 그 자리를 맡는다: Azure 키는 Worker 시크릿에만 있고,
 * 브라우저는 Worker 주소(VITE_AZURE_TRANSLATE_URL)만 안다. 로직은 로컬 Node 프록시와 같다(translate-core.mjs).
 *
 * 배포(최초 한 번):
 *   npx wrangler login
 *   npx wrangler secret put AZURE_TRANSLATOR_KEY --config scripts/wrangler.jsonc
 *   npm run deploy:translate
 * 이후 코드가 바뀌면 npm run deploy:translate만 다시 실행한다.
 *
 * 설정은 scripts/wrangler.jsonc의 vars에 있다(허용 출처·Azure 지역).
 * 무료 플랜(하루 10만 요청)이면 충분하다 — 뉴스레터 한 통 번역이 요청 1~2개다.
 */
import { handleTranslation, parseAllowedOrigins, TranslateRequestError } from './translate-core.mjs'

const MAX_BODY_BYTES = 2 * 1024 * 1024

const json = (status, body, origin, allowed) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(origin && allowed.has(origin)
        ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
        : {}),
    },
  })

export default {
  async fetch(request, env) {
    const allowed = parseAllowedOrigins(env.TRANSLATE_ALLOWED_ORIGINS)
    const origin = request.headers.get('Origin') || ''
    const { pathname } = new URL(request.url)

    if (request.method === 'OPTIONS') {
      if (!allowed.has(origin)) return json(403, { error: '허용되지 않은 출처입니다.' }, origin, allowed)
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin',
        },
      })
    }

    if (request.method === 'GET' && pathname === '/health') {
      return json(200, { ok: true, configured: !!env.AZURE_TRANSLATOR_KEY }, origin, allowed)
    }
    if (request.method !== 'POST' || pathname !== '/api/translate') {
      return json(404, { error: 'Not found' }, origin, allowed)
    }
    // 공개 주소이므로 허용된 사이트의 브라우저 요청만 받는다(브라우저는 POST에 Origin을 항상 붙인다).
    // 로컬 프록시와 달리 Origin이 없는 요청(curl 등)도 거절해 무료 한도를 남이 쓰지 못하게 한다.
    if (!allowed.has(origin)) {
      return json(403, { error: '허용되지 않은 출처입니다.' }, origin, allowed)
    }
    const length = Number(request.headers.get('Content-Length') || 0)
    if (length > MAX_BODY_BYTES) {
      return json(413, { error: '요청 본문이 너무 큽니다.' }, origin, allowed)
    }

    try {
      const body = await request.json().catch(() => {
        throw new TranslateRequestError('요청 JSON 형식이 올바르지 않습니다.')
      })
      const result = await handleTranslation(body, {
        key: (env.AZURE_TRANSLATOR_KEY || '').trim(),
        region: (env.AZURE_TRANSLATOR_REGION || '').trim(),
        endpoint: env.AZURE_TRANSLATOR_ENDPOINT,
      })
      return json(200, result, origin, allowed)
    } catch (error) {
      const status = error instanceof TranslateRequestError ? error.status : 500
      const message = error instanceof Error ? error.message : '번역 중 오류가 발생했습니다.'
      return json(status, { error: message }, origin, allowed)
    }
  },
}
