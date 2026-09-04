/**
 * Azure Translator 호출의 공통 부분 — 로컬 Node 프록시(azure-translate-proxy.mjs)와
 * Cloudflare Worker(azure-translate-worker.mjs)가 같이 쓴다.
 *
 * 요청 검증 · 45,000자/100개 단위 분할 · Azure 호출 · 응답 정리만 담당하고,
 * HTTP(헤더·CORS·응답 객체)는 각 실행 환경이 맡는다. Node 20+와 Workers 런타임 둘 다에서
 * 돌아가야 하므로 전역 fetch/AbortController만 쓰고 node: 모듈은 들이지 않는다.
 */

export const TARGET_LANGUAGES = new Set(['en', 'ja', 'zh-Hans'])
export const DEFAULT_AZURE_ENDPOINT = 'https://api.cognitive.microsofttranslator.com'

const MAX_AZURE_CHARS = 45_000
const MAX_AZURE_ITEMS = 100
const AZURE_TIMEOUT_MS = 30_000

/** 클라이언트 잘못(형식·언어·빈 요청)은 400, Azure 쪽 문제는 502로 구분한다 */
export class TranslateRequestError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'TranslateRequestError'
    this.status = status
  }
}

/** 쉼표로 구분된 출처 목록을 Set으로 */
export const parseAllowedOrigins = (value, fallback = 'http://localhost:5173') =>
  new Set(
    (value || fallback)
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  )

const wrapHtml = (text) => `<div data-newsletter-translation-root="1">${text}</div>`
const unwrapHtml = (text) =>
  text
    .replace(/^<div data-newsletter-translation-root="1">/i, '')
    .replace(/<\/div>$/i, '')

export function batchesOf(items) {
  const batches = []
  let current = []
  let chars = 0
  for (const item of items) {
    const length = item.text.length
    if (length > MAX_AZURE_CHARS) throw new TranslateRequestError('번역할 문장 하나가 너무 깁니다.')
    if (current.length && (current.length >= MAX_AZURE_ITEMS || chars + length > MAX_AZURE_CHARS)) {
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

async function translateBatch(items, sourceLanguage, targetLanguage, format, config) {
  const url = new URL(`${config.endpoint}/translate`)
  url.searchParams.set('api-version', '3.0')
  url.searchParams.set('from', sourceLanguage)
  url.searchParams.set('to', targetLanguage)
  url.searchParams.set('textType', format)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AZURE_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Ocp-Apim-Subscription-Key': config.key,
        ...(config.region ? { 'Ocp-Apim-Subscription-Region': config.region } : {}),
      },
      body: JSON.stringify(
        items.map((item) => ({ Text: format === 'html' ? wrapHtml(item.text) : item.text })),
      ),
      signal: controller.signal,
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      const detail = payload?.error?.message || `Azure Translator 오류 (${response.status})`
      throw new TranslateRequestError(detail, 502)
    }
    return items.map((item, index) => {
      const translated = payload?.[index]?.translations?.[0]?.text
      if (typeof translated !== 'string') {
        throw new TranslateRequestError('Azure 번역 결과 일부가 누락되었습니다.', 502)
      }
      return { id: item.id, text: format === 'html' ? unwrapHtml(translated) : translated }
    })
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * POST /api/translate 본문을 받아 번역 결과를 돌려준다.
 * @param body   { sourceLanguage: 'ko', targetLanguage, items: [{ id, text, format? }] }
 * @param config { key, region?, endpoint? }
 */
export async function handleTranslation(body, config) {
  if (!config?.key) throw new TranslateRequestError('서버에 AZURE_TRANSLATOR_KEY가 설정되지 않았습니다.', 500)
  if (body?.sourceLanguage !== 'ko') throw new TranslateRequestError('현재 원문 언어는 한국어만 지원합니다.')
  if (!TARGET_LANGUAGES.has(body?.targetLanguage)) throw new TranslateRequestError('지원하지 않는 대상 언어입니다.')
  if (!Array.isArray(body?.items) || body.items.length === 0) throw new TranslateRequestError('번역할 문장이 없습니다.')

  const items = body.items.map((item) => {
    if (!item || typeof item.id !== 'string' || typeof item.text !== 'string') {
      throw new TranslateRequestError('번역 항목 형식이 올바르지 않습니다.')
    }
    return { id: item.id, text: item.text, format: item.format === 'html' ? 'html' : 'plain' }
  })

  const resolved = {
    key: config.key,
    region: config.region || '',
    endpoint: (config.endpoint || DEFAULT_AZURE_ENDPOINT).replace(/\/$/, ''),
  }

  const translations = []
  for (const format of ['plain', 'html']) {
    const sameFormat = items.filter((item) => item.format === format)
    for (const batch of batchesOf(sameFormat)) {
      translations.push(...(await translateBatch(batch, body.sourceLanguage, body.targetLanguage, format, resolved)))
    }
  }
  return { translations }
}
