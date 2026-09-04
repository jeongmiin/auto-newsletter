/**
 * Azure Translator 키를 브라우저에 노출하지 않는 작은 서버 프록시.
 *
 * 실행:
 *   AZURE_TRANSLATOR_KEY=... npm run proxy:translate
 * 선택:
 *   AZURE_TRANSLATOR_REGION=koreacentral
 *   TRANSLATE_ALLOWED_ORIGINS=https://newsletter.example.com
 *
 * 운영에서는 이 파일과 같은 계약의 POST /api/translate를 기존 API 서버나
 * 서버리스 함수에 배포하고, 프런트의 VITE_AZURE_TRANSLATE_URL에는 공개 주소만 넣는다.
 */
import http from 'node:http'
import { loadEnvFile } from 'node:process'

// .gitignore의 `*.local` 규칙으로 제외되는 로컬 비밀 설정을 자동으로 읽는다.
// 셸에서 이미 설정한 환경변수는 Node가 우선하므로 CI/운영 배포 방식도 그대로 사용할 수 있다.
try {
  loadEnvFile('.env.local')
} catch (error) {
  if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error
}

const port = Number(process.env.TRANSLATE_PROXY_PORT || 5175)
const azureKey = (process.env.AZURE_TRANSLATOR_KEY || '').trim()
const azureRegion = (process.env.AZURE_TRANSLATOR_REGION || '').trim()
const azureEndpoint = (process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com').replace(/\/$/, '')
const allowedOrigins = new Set(
  (process.env.TRANSLATE_ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
)

const targets = new Set(['en', 'ja', 'zh-Hans'])
const maxBodyBytes = 2 * 1024 * 1024
const maxAzureChars = 45_000
const maxAzureItems = 100

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
        reject(new Error('요청 본문이 너무 큽니다.'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new Error('요청 JSON 형식이 올바르지 않습니다.'))
      }
    })
    req.on('error', reject)
  })

const wrapHtml = (text) => `<div data-newsletter-translation-root="1">${text}</div>`
const unwrapHtml = (text) =>
  text
    .replace(/^<div data-newsletter-translation-root="1">/i, '')
    .replace(/<\/div>$/i, '')

function batchesOf(items) {
  const batches = []
  let current = []
  let chars = 0
  for (const item of items) {
    const length = item.text.length
    if (length > maxAzureChars) throw new Error('번역할 문장 하나가 너무 깁니다.')
    if (current.length && (current.length >= maxAzureItems || chars + length > maxAzureChars)) {
      batches.push(current)
      current = []
      chars = 0
    }
    current.push(item)
    chars += length
  }
  if (current.length) batches.push(current)
  return batches
}

async function translateBatch(items, sourceLanguage, targetLanguage, format) {
  const url = new URL(`${azureEndpoint}/translate`)
  url.searchParams.set('api-version', '3.0')
  url.searchParams.set('from', sourceLanguage)
  url.searchParams.set('to', targetLanguage)
  url.searchParams.set('textType', format)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Ocp-Apim-Subscription-Key': azureKey,
        ...(azureRegion ? { 'Ocp-Apim-Subscription-Region': azureRegion } : {}),
      },
      body: JSON.stringify(
        items.map((item) => ({ Text: format === 'html' ? wrapHtml(item.text) : item.text })),
      ),
      signal: controller.signal,
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      const detail = payload?.error?.message || `Azure Translator 오류 (${response.status})`
      throw new Error(detail)
    }
    return items.map((item, index) => {
      const translated = payload?.[index]?.translations?.[0]?.text
      if (typeof translated !== 'string') throw new Error('Azure 번역 결과 일부가 누락되었습니다.')
      return {
        id: item.id,
        text: format === 'html' ? unwrapHtml(translated) : translated,
      }
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function handleTranslation(body) {
  if (!azureKey) throw new Error('서버에 AZURE_TRANSLATOR_KEY가 설정되지 않았습니다.')
  if (body?.sourceLanguage !== 'ko') throw new Error('현재 원문 언어는 한국어만 지원합니다.')
  if (!targets.has(body?.targetLanguage)) throw new Error('지원하지 않는 대상 언어입니다.')
  if (!Array.isArray(body?.items) || body.items.length === 0) throw new Error('번역할 문장이 없습니다.')

  const items = body.items.map((item) => {
    if (!item || typeof item.id !== 'string' || typeof item.text !== 'string') {
      throw new Error('번역 항목 형식이 올바르지 않습니다.')
    }
    return { id: item.id, text: item.text, format: item.format === 'html' ? 'html' : 'plain' }
  })

  const translations = []
  for (const format of ['plain', 'html']) {
    const sameFormat = items.filter((item) => item.format === format)
    for (const batch of batchesOf(sameFormat)) {
      translations.push(
        ...(await translateBatch(batch, body.sourceLanguage, body.targetLanguage, format)),
      )
    }
  }
  return { translations }
}

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
    return json(res, 200, { ok: true, configured: !!azureKey }, origin)
  }
  if (req.method !== 'POST' || req.url !== '/api/translate') {
    return json(res, 404, { error: 'Not found' }, origin)
  }
  if (origin && !allowedOrigins.has(origin)) {
    return json(res, 403, { error: '허용되지 않은 출처입니다.' })
  }
  try {
    const body = await readJson(req)
    return json(res, 200, await handleTranslation(body), origin)
  } catch (error) {
    const message = error instanceof Error ? error.message : '번역 중 오류가 발생했습니다.'
    return json(res, 400, { error: message }, origin)
  }
})

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Azure Translator proxy: http://127.0.0.1:${port}/api/translate\n`)
  if (!azureKey) process.stdout.write('AZURE_TRANSLATOR_KEY가 없어 요청은 설정 오류를 반환합니다.\n')
})
