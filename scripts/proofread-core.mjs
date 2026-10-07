/**
 * Gemini 맞춤법 검사 호출의 공통 부분 — 로컬 Node 프록시(azure-translate-proxy.mjs)와
 * Cloudflare Worker(azure-translate-worker.mjs)가 같이 쓴다(번역의 translate-core.mjs와 같은 자리).
 *
 * 요청 검증 · Gemini 호출 · 응답 정리만 담당하고, HTTP(헤더·CORS)는 각 실행 환경이 맡는다.
 *
 * 무료 등급으로 쓴다 — 결제를 붙이지 않은 프로젝트의 키는 한도를 넘으면 과금되지 않고
 * 요청이 거절(429)된다. 그래서 429·503을 사람이 읽을 문구로 바꿔 돌려주는 게 이 파일의 큰 일이다.
 */
import { TranslateRequestError } from './translate-core.mjs'

/**
 * 기본 모델.
 *
 * 2026-10-01에 실제 뉴스레터 3편으로 견줬다: 3.7/3.8 Flash는 조금 더 꼼꼼하지만 무료 등급에서
 * 12번 중 10번이 503(수요 과다)이었고 11~16초가 걸렸다. Flash Lite는 1~3초에 3편 모두 응답했고,
 * 일부러 넣은 오류 15개를 다 찾으면서 고유명사를 건드린 제안이 없었다.
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite'
export const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta'

const MAX_ITEMS = 400
/** 뉴스레터 한 편은 3,000~7,000자다. 넉넉히 잡되, 붙여 넣은 긴 글로 한도를 태우지 않게 막는다 */
const MAX_TOTAL_CHARS = 40_000
const GEMINI_TIMEOUT_MS = 40_000
/** 503(수요 과다)은 잠깐 뒤에 풀리는 일이 많아 한 번만 더 해 본다 */
const RETRY_DELAY_MS = 1_500

const SYSTEM_INSTRUCTION = `당신은 한국어 뉴스레터 교정자입니다. 입력은 {id, text} 목록(JSON)입니다.
각 text 에서 **명백한 오류만** 찾아 고칩니다: 오탈자, 맞춤법, 띄어쓰기, 잘못 들어간 문장부호.

고치지 않는 것:
- 고유명사·브랜드·회사·행사·사람 이름, 영문, 숫자·날짜·시간·금액 표기 방식, 이모지, 기호(→ • ※ 등)
- 문체와 어투(구어체·광고 문구), 단어 선택, 문장 다듬기, 줄바꿈
- 확신이 없는 것. 틀렸다고 단정할 수 없으면 내지 않습니다.

출력 규칙:
- original 은 해당 text 안에 **글자 그대로 있는** 가장 짧은 구절(오류가 든 어절과 필요하면 앞뒤 한 어절)
- corrected 는 original 을 고친 것, reason 은 한 줄(20자 이내)
- 오류가 없으면 빈 목록`

const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      id: { type: 'STRING' },
      original: { type: 'STRING' },
      corrected: { type: 'STRING' },
      reason: { type: 'STRING' },
    },
    required: ['id', 'original', 'corrected', 'reason'],
  },
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Gemini 오류를 사람이 읽을 문구로.
 * 429는 '분당'과 '하루' 한도가 같은 코드로 온다 — 어느 쪽인지는 본문의 quotaId에만 적혀 있다.
 */
function geminiError(status, payload) {
  if (status === 429) {
    const perDay = /PerDay/i.test(JSON.stringify(payload ?? ''))
    return new TranslateRequestError(
      perDay
        ? '오늘 쓸 수 있는 무료 검사 횟수를 모두 썼어요. 내일 다시 시도해 주세요.'
        : '검사 요청이 잠시 몰렸어요. 1분 뒤 다시 시도해 주세요.',
      429,
    )
  }
  if (status === 503) {
    return new TranslateRequestError('지금 검사 서버가 붐벼요. 잠시 뒤 다시 시도해 주세요.', 503)
  }
  const detail = payload?.error?.message || `Gemini 오류 (${status})`
  return new TranslateRequestError(detail, 502)
}

async function callGemini(items, config) {
  const url = `${GEMINI_ENDPOINT}/models/${encodeURIComponent(config.model)}:generateContent`
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: JSON.stringify(items) }] }],
    generationConfig: {
      temperature: 0,
      // 고칠 곳 목록은 길어야 수백 줄이다 — 글 속에 섞인 지시문에 끌려 장문을 뱉어도 여기서 끊는다
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  })

  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.key },
        body,
        signal: controller.signal,
      })
      const payload = await response.json().catch(() => null)
      if (response.status === 503 && attempt === 0) {
        await sleep(RETRY_DELAY_MS)
        continue
      }
      if (!response.ok) throw geminiError(response.status, payload)
      return payload
    } catch (error) {
      if (error instanceof TranslateRequestError) throw error
      throw new TranslateRequestError('검사 서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.', 502)
    } finally {
      clearTimeout(timeout)
    }
  }
}

/**
 * 모델이 돌려준 목록에서 **그대로 적용할 수 있는 것만** 남긴다.
 *
 * original 이 원문에 글자 그대로 없으면 화면에서 그 자리를 찾아 바꿀 수 없다 — 모델이 구절을
 * 다듬어 적었거나 없는 id를 지어낸 경우다. 고친 게 없는 항목(original === corrected)도 버린다.
 */
export function usableCorrections(raw, items) {
  if (!Array.isArray(raw)) return []
  const textById = new Map(items.map((item) => [item.id, item.text]))
  const seen = new Set()
  const out = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const { id, original, corrected } = row
    if (typeof id !== 'string' || typeof original !== 'string' || typeof corrected !== 'string') continue
    if (!original || original === corrected) continue
    // 고친 글에 태그가 섞여 올 이유가 없다 — 글 속 지시문에 끌려 마크업을 내면 통째로 버린다
    if (/[<>]/.test(corrected)) continue
    if (!textById.get(id)?.includes(original)) continue
    // 같은 자리를 두 번 적어 보내는 일이 있다
    const key = `${id}\u0000${original}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ id, original, corrected, reason: typeof row.reason === 'string' ? row.reason : '' })
  }
  return out
}

/**
 * POST /api/proofread 본문을 받아 고칠 곳 목록을 돌려준다.
 * @param body   { items: [{ id, text }] }
 * @param config { key, model? }
 * @returns      { corrections: [{ id, original, corrected, reason }] }
 */
export async function handleProofread(body, config) {
  if (!config?.key) throw new TranslateRequestError('서버에 GEMINI_API_KEY가 설정되지 않았습니다.', 500)
  if (!Array.isArray(body?.items) || body.items.length === 0) {
    throw new TranslateRequestError('검사할 문장이 없습니다.')
  }
  if (body.items.length > MAX_ITEMS) throw new TranslateRequestError('검사할 문장이 너무 많습니다.')

  const items = body.items.map((item) => {
    if (!item || typeof item.id !== 'string' || typeof item.text !== 'string') {
      throw new TranslateRequestError('검사 항목 형식이 올바르지 않습니다.')
    }
    return { id: item.id, text: item.text }
  })
  const total = items.reduce((sum, item) => sum + item.text.length, 0)
  if (total > MAX_TOTAL_CHARS) throw new TranslateRequestError('검사할 글이 너무 깁니다.')

  const payload = await callGemini(items, {
    key: config.key,
    model: (config.model || DEFAULT_GEMINI_MODEL).trim(),
  })

  const text = (payload?.candidates?.[0]?.content?.parts ?? []).map((part) => part?.text ?? '').join('')
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    // 답이 잘렸거나(출력 한도) 안전 필터에 막혀 빈 답이 온 경우
    throw new TranslateRequestError('검사 결과를 읽지 못했어요. 다시 시도해 주세요.', 502)
  }
  return { corrections: usableCorrections(parsed, items) }
}
