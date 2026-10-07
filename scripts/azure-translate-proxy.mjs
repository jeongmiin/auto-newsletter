/**
 * Azure Translator 키를 브라우저에 노출하지 않는 작은 서버 프록시 — **로컬 개발용**.
 *
 * 맞춤법 검사(/api/proofread)도 여기서 받는다 — Gemini 키를 같은 방식으로 숨긴다(proofread-core.mjs).
 *
 * 실행:
 *   npm run proxy:translate            (.env.local의 AZURE_TRANSLATOR_KEY·GEMINI_API_KEY를 자동으로 읽는다)
 * 선택:
 *   AZURE_TRANSLATOR_REGION=koreacentral
 *   TRANSLATE_ALLOWED_ORIGINS=https://newsletter.example.com
 *
 * 배포본(GitHub Pages·운영 도메인)은 정적 호스팅이라 이 파일을 돌릴 수 없다.
 * 같은 로직(translate-core.mjs)을 Cloudflare Worker로 올린 azure-translate-worker.mjs를 쓴다 —
 * docs/azure-translator.md 참고.
 */
import http from 'node:http'
import { loadEnvFile } from 'node:process'
import { handleTranslation, parseAllowedOrigins, TranslateRequestError } from './translate-core.mjs'
import { handleProofread } from './proofread-core.mjs'

// .gitignore의 `*.local` 규칙으로 제외되는 로컬 비밀 설정을 자동으로 읽는다.
// 셸에서 이미 설정한 환경변수는 Node가 우선하므로 CI/운영 배포 방식도 그대로 사용할 수 있다.
try {
  loadEnvFile('.env.local')
} catch (error) {
  if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error
}

const port = Number(process.env.TRANSLATE_PROXY_PORT || 5175)
const azure = {
  key: (process.env.AZURE_TRANSLATOR_KEY || '').trim(),
  region: (process.env.AZURE_TRANSLATOR_REGION || '').trim(),
  endpoint: process.env.AZURE_TRANSLATOR_ENDPOINT,
}
const gemini = {
  key: (process.env.GEMINI_API_KEY || '').trim(),
  model: process.env.GEMINI_MODEL,
}
const allowedOrigins = parseAllowedOrigins(process.env.TRANSLATE_ALLOWED_ORIGINS)
const maxBodyBytes = 2 * 1024 * 1024

const json = (res, status, body, origin) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...(origin && allowedOrigins.has(origin)
      ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
      : {}),
  })
  res.end(JSON.stringify(body))
}

const readJson = (req) =>
  new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBodyBytes) {
        reject(new TranslateRequestError('요청 본문이 너무 큽니다.', 413))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new TranslateRequestError('요청 JSON 형식이 올바르지 않습니다.'))
      }
    })
    req.on('error', reject)
  })

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || ''
  if (req.method === 'OPTIONS') {
    if (origin && !allowedOrigins.has(origin)) return json(res, 403, { error: '허용되지 않은 출처입니다.' })
    res.writeHead(204, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    })
    return res.end()
  }
  if (req.method === 'GET' && req.url === '/health') {
    return json(res, 200, { ok: true, configured: !!azure.key, proofread: !!gemini.key }, origin)
  }
  const isProofread = req.url === '/api/proofread'
  if (req.method !== 'POST' || (req.url !== '/api/translate' && !isProofread)) {
    return json(res, 404, { error: 'Not found' }, origin)
  }
  if (origin && !allowedOrigins.has(origin)) {
    return json(res, 403, { error: '허용되지 않은 출처입니다.' })
  }
  try {
    const body = await readJson(req)
    const result = isProofread
      ? await handleProofread(body, gemini)
      : await handleTranslation(body, azure)
    return json(res, 200, result, origin)
  } catch (error) {
    const status = error instanceof TranslateRequestError ? error.status : 500
    const message = error instanceof Error ? error.message : '요청을 처리하는 중 오류가 발생했습니다.'
    return json(res, status, { error: message }, origin)
  }
})

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Azure Translator proxy: http://127.0.0.1:${port}/api/translate\n`)
  if (!azure.key) process.stdout.write('AZURE_TRANSLATOR_KEY가 없어 번역 요청은 설정 오류를 반환합니다.\n')
  if (!gemini.key) process.stdout.write('GEMINI_API_KEY가 없어 맞춤법 검사 요청은 설정 오류를 반환합니다.\n')
})
