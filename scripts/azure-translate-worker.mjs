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
 *
 * 맞춤법 검사(/api/proofread)도 이 Worker가 받는다 — Gemini 키(GEMINI_API_KEY)를 같은 방식으로
 * 숨긴다(proofread-core.mjs). 키는 `npx wrangler secret put GEMINI_API_KEY --config scripts/wrangler.jsonc`.
 *
 * ⚠ Gemini 호출만은 Worker가 직접 하지 않고 **북미에 고정한 Durable Object(GeminiRelay)** 를 거친다.
 *   Worker는 요청이 들어온 Cloudflare 지점에서 돌고 바깥 호출도 거기서 나간다. 통신사 경로에 따라
 *   Gemini API 서비스 지역이 아닌 지점을 타면 "User location is not supported"로 거절당한다
 *   (2026-10-08 실측). DO는 만들 때 locationHint 로 지역을 못 박을 수 있어 그 안에서
 *   부르면 늘 북미에서 나간다. 번역(Azure)은 지역 제한이 없어 그대로 둔다.
 */
import { handleTranslation, parseAllowedOrigins, TranslateRequestError } from './translate-core.mjs'
import { handleProofread } from './proofread-core.mjs'
import { DurableObject } from 'cloudflare:workers'

/** 맞춤법 검사를 Gemini 서비스 지역(북미)에서 대신 부르는 중계 객체 — 상태는 쓰지 않는다 */
export class GeminiRelay extends DurableObject {
  async fetch(request) {
    try {
      const body = await request.json()
      const result = await handleProofread(body, {
        key: (this.env.GEMINI_API_KEY || '').trim(),
        model: this.env.GEMINI_MODEL,
      })
      return Response.json(result)
    } catch (error) {
      const status = error instanceof TranslateRequestError ? error.status : 500
      const message = error instanceof Error ? error.message : '요청을 처리하는 중 오류가 발생했습니다.'
      return Response.json({ error: message }, { status })
    }
  }
}

/** 중계 객체 하나를 북미(enam)에 만들어 두고 계속 쓴다 — locationHint 는 처음 만들 때만 적용된다 */
const proofreadViaRelay = async (env, body) => {
  const stub = env.GEMINI_RELAY.get(env.GEMINI_RELAY.idFromName('relay'), { locationHint: 'enam' })
  const res = await stub.fetch('https://relay/proofread', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: res.status, payload: await res.json() }
}

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
      return json(
        200,
        { ok: true, configured: !!env.AZURE_TRANSLATOR_KEY, proofread: !!env.GEMINI_API_KEY },
        origin,
        allowed,
      )
    }
    const isProofread = pathname === '/api/proofread'
    if (request.method !== 'POST' || (pathname !== '/api/translate' && !isProofread)) {
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
      if (isProofread) {
        const { status, payload } = await proofreadViaRelay(env, body)
        return json(status, payload, origin, allowed)
      }
      const result = await handleTranslation(body, {
        key: (env.AZURE_TRANSLATOR_KEY || '').trim(),
        region: (env.AZURE_TRANSLATOR_REGION || '').trim(),
        endpoint: env.AZURE_TRANSLATOR_ENDPOINT,
      })
      return json(200, result, origin, allowed)
    } catch (error) {
      const status = error instanceof TranslateRequestError ? error.status : 500
      const message = error instanceof Error ? error.message : '요청을 처리하는 중 오류가 발생했습니다.'
      return json(status, { error: message }, origin, allowed)
    }
  },
}
