/**
 * Gemini 호출의 공통부 — 번역(translate-core.mjs)과 맞춤법 검사(proofread-core.mjs)가 같이 쓴다.
 *
 * 하는 일: JSON 모드 호출(systemInstruction + 입력 JSON + 응답 스키마), 시간 제한, 503 한 번 재시도,
 * 오류를 사람이 읽을 문구로. HTTP(헤더·CORS)는 각 실행 환경이 맡는다.
 *
 * 무료 등급으로 쓴다 — 결제를 붙이지 않은 프로젝트의 키는 한도를 넘으면 과금되지 않고
 * 요청이 거절(429)된다. 그래서 429·503을 문구로 바꿔 돌려주는 게 이 파일의 큰 일이다.
 */
import { TranslateRequestError } from './request-error.mjs'

/**
 * 기본 모델.
 *
 * 2026-10-01에 실제 뉴스레터 3편으로 견줬다: 3.7/3.8 Flash는 조금 더 꼼꼼하지만 무료 등급에서
 * 12번 중 10번이 503(수요 과다)이었고 11~16초가 걸렸다. Flash Lite는 1~3초에 3편 모두 응답했다.
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite'
export const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta'

const GEMINI_TIMEOUT_MS = 40_000
/** 503(수요 과다)은 잠깐 뒤에 풀리는 일이 많아 한 번만 더 해 본다 */
const RETRY_DELAY_MS = 1_500

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Gemini 오류를 사람이 읽을 문구로. `what`은 '번역'·'검사'처럼 문구에 들어갈 일 이름.
 * 429는 '분당'과 '하루' 한도가 같은 코드로 온다 — 어느 쪽인지는 본문의 quotaId에만 적혀 있다.
 */
export function geminiError(status, payload, what = '요청') {
  if (status === 429) {
    const perDay = /PerDay/i.test(JSON.stringify(payload ?? ''))
    return new TranslateRequestError(
      perDay
        ? `오늘 쓸 수 있는 무료 ${what} 횟수를 모두 썼어요. 내일 다시 시도해 주세요.`
        : `${what} 요청이 잠시 몰렸어요. 1분 뒤 다시 시도해 주세요.`,
      429,
    )
  }
  if (status === 503) {
    return new TranslateRequestError(`지금 ${what} 서버가 붐벼요. 잠시 뒤 다시 시도해 주세요.`, 503)
  }
  const detail = payload?.error?.message || `Gemini 오류 (${status})`
  return new TranslateRequestError(detail, 502)
}

/**
 * JSON 모드로 한 번 묻고 파싱한 답을 돌려준다.
 * @param {object} p
 * @param {string} p.key               API 키 — 헤더로만 보낸다(주소에 실리면 로그에 남는다)
 * @param {string} p.model
 * @param {string} p.systemInstruction
 * @param {unknown} p.input            사용자 턴에 JSON 으로 직렬화해 넣는다
 * @param {object} p.responseSchema    Gemini responseSchema
 * @param {number} [p.maxOutputTokens] 글 속에 섞인 지시문에 끌려 장문을 뱉어도 여기서 끊는다
 * @param {number} [p.temperature]
 * @param {string} [p.what]            오류 문구에 들어갈 일 이름('번역'·'검사')
 */
export async function callGeminiJson({
  key,
  model,
  systemInstruction,
  input,
  responseSchema,
  maxOutputTokens = 8192,
  temperature = 0,
  what = '요청',
}) {
  const url = `${GEMINI_ENDPOINT}/models/${encodeURIComponent(model)}:generateContent`
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }],
    generationConfig: {
      temperature,
      maxOutputTokens,
      responseMimeType: 'application/json',
      responseSchema,
    },
  })

  let payload
  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body,
        signal: controller.signal,
      })
      payload = await response.json().catch(() => null)
      if (response.status === 503 && attempt === 0) {
        await sleep(RETRY_DELAY_MS)
        continue
      }
      if (!response.ok) throw geminiError(response.status, payload, what)
      break
    } catch (error) {
      if (error instanceof TranslateRequestError) throw error
      throw new TranslateRequestError(`${what} 서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.`, 502)
    } finally {
      clearTimeout(timeout)
    }
  }

  const text = (payload?.candidates?.[0]?.content?.parts ?? []).map((part) => part?.text ?? '').join('')
  try {
    return JSON.parse(text)
  } catch {
    // 답이 잘렸거나(출력 한도) 안전 필터에 막혀 빈 답이 온 경우
    throw new TranslateRequestError(`${what} 결과를 읽지 못했어요. 다시 시도해 주세요.`, 502)
  }
}
