/**
 * Gemini 맞춤법 검사 호출의 공통 부분 — 로컬 Node 프록시(translate-proxy.mjs)와
 * Cloudflare Worker(translate-worker.mjs)가 같이 쓴다(번역의 translate-core.mjs와 같은 자리).
 *
 * 요청 검증 · 지시문 · 응답 정리만 담당한다. Gemini 호출 자체(시간 제한·재시도·오류 문구)는
 * gemini-core.mjs 가, HTTP(헤더·CORS)는 각 실행 환경이 맡는다.
 *
 * 모델 선택 근거(2026-10-01, 실제 뉴스레터 3편): Flash Lite 가 1~3초에 모두 응답했고 일부러 넣은
 * 오류 15개를 다 찾으면서 고유명사를 건드린 제안이 없었다. 상위 Flash 는 무료 등급에서 503이 잦았다.
 */
import { TranslateRequestError } from './request-error.mjs'
import { callGeminiJson, DEFAULT_GEMINI_MODEL } from './gemini-core.mjs'

export { DEFAULT_GEMINI_MODEL, GEMINI_ENDPOINT } from './gemini-core.mjs'

const MAX_ITEMS = 400
/** 뉴스레터 한 편은 3,000~7,000자다. 넉넉히 잡되, 붙여 넣은 긴 글로 한도를 태우지 않게 막는다 */
const MAX_TOTAL_CHARS = 40_000

/** 검사가 다루는 언어 — 번역 도구가 내는 언어(영·일·중)와 원문 한국어. 응답의 lang 도 이 중 하나로 받는다 */
export const PROOFREAD_LANGS = ['ko', 'en', 'ja', 'zh', 'th']

/**
 * 다국어 교정 지시.
 *
 * 언어는 **항목(text) 단위로** 판단한다 — 일본어 뉴스레터 안에 영어 문단이 통째로 있으면 그 항목만 영어 기준으로
 * 본다. 한 문장 안에 섞인 다른 문자(일본어 문장 속 영어 단어 등)는 대개 브랜드·행사명이라 건드리지 않는다.
 * hint 는 "대개 이 언어"라는 참고일 뿐, 명백히 다른 언어인 항목은 그 언어 규칙을 따른다.
 * 언어별 "고치지 않는 것"이 핵심이다 — 이게 없으면 영국식↔미국식 철자, 일본어 표기 흔들림, 간체↔번체처럼
 * 오류가 아닌 선택을 교정하려 든다.
 */
const SYSTEM_INSTRUCTION = `당신은 뉴스레터 교정자입니다. 입력은 JSON {hint, items} 이고 items 는 {id, text} 목록입니다.
각 text 의 언어를 **항목마다** 판단한 뒤, 그 언어의 맞춤법 기준으로 **명백한 오류만** 찾아 고칩니다:
오탈자, 맞춤법, 띄어쓰기, 잘못 들어간 문장부호. hint 는 이 뉴스레터의 주 언어이지만 참고일 뿐입니다 —
항목이 명백히 다른 언어이면 그 언어 기준으로 봅니다.

모든 언어에서 고치지 않는 것:
- 고유명사·브랜드·회사·행사·제품·사람 이름, 숫자·날짜·시간·금액 표기 방식, 이모지, 기호(→ • ※ 등), URL
- 한 항목 안에서 주 언어와 **다른 문자로 적힌 조각**(한국어·일본어 문장 속 영어 단어 등) — 대개 이름입니다
- 문체와 어투(구어체·광고 문구), 단어 선택, 문장 다듬기, 줄바꿈
- 확신이 없는 것. 틀렸다고 단정할 수 없으면 내지 않습니다.

언어별로 고치지 않는 것:
- 한국어(ko): 외래어 표기 선택, 구어체 종결어미
- 영어(en): 영국식·미국식 철자 차이(color/colour), 옥스퍼드 콤마, 제목·버튼의 대문자 스타일, 축약형(don't)
- 일본어(ja): 표기 흔들림(表記ゆれ — 한자·히라가나·가타카나 선택, 送り仮名 차이), 경어 수준
- 중국어(zh): 간체·번체 혼용, 전각·반각 문장부호 스타일, 지역별 어휘 차이
- 태국어(th): 외래어 음차 표기(ทับศัพท์)의 선택, 문장 사이 띄어쓰기 스타일, 격식 수준(ครับ/ค่ะ 유무)

출력 규칙:
- lang 은 그 항목을 어느 언어 기준으로 봤는지(ko·en·ja·zh·th 중 하나)
- original 은 해당 text 안에 **글자 그대로 있는** 가장 짧은 구절(오류가 든 단어와 필요하면 앞뒤 한 단어)
- corrected 는 original 을 고친 것
- reason 은 **반드시 한국어로** 한 줄(20자 이내) — 영어·일본어·중국어 항목의 이유도 한국어로 씁니다(읽는 사람이 한국인)
- 오류가 없으면 빈 목록`

const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      id: { type: 'STRING' },
      lang: { type: 'STRING', enum: PROOFREAD_LANGS },
      original: { type: 'STRING' },
      corrected: { type: 'STRING' },
      reason: { type: 'STRING' },
    },
    required: ['id', 'lang', 'original', 'corrected', 'reason'],
  },
}

/** 라틴 문자(영어 등) — 이 글자로 시작·끝나는 구절은 단어 경계에서만 찾는다 */
const LATIN = /[A-Za-zÀ-ɏ]/
const WORD_CHAR = /[A-Za-z0-9À-ɏ]/

/**
 * text 안에서 phrase 가 있는 자리. 영어처럼 띄어 쓰는 글은 **단어 경계**에서만 찾는다 —
 * 'the' 를 'then' 안에서 찾아 바꾸면 안 된다. 한국어·일본어·중국어 구절은 경계 규칙 없이 그대로 찾는다.
 * (프런트 src/utils/newsletterProofread.ts 의 indexOfPhrase 와 같은 규칙 — 둘을 같이 고친다)
 */
export function indexOfPhrase(text, phrase, from = 0) {
  if (!phrase) return -1
  const headBound = LATIN.test(phrase[0])
  const tailBound = LATIN.test(phrase[phrase.length - 1])
  let at = text.indexOf(phrase, from)
  while (at !== -1) {
    const before = at > 0 ? text[at - 1] : ''
    const after = text[at + phrase.length] ?? ''
    const headOk = !headBound || !WORD_CHAR.test(before)
    const tailOk = !tailBound || !WORD_CHAR.test(after)
    if (headOk && tailOk) return at
    at = text.indexOf(phrase, at + 1)
  }
  return -1
}

/**
 * 모델이 돌려준 목록에서 **그대로 적용할 수 있는 것만** 남긴다.
 *
 * original 이 원문에 글자 그대로 없으면 화면에서 그 자리를 찾아 바꿀 수 없다 — 모델이 구절을
 * 다듬어 적었거나 없는 id를 지어낸 경우다. 영어 구절은 단어 경계에 있어야 한다(indexOfPhrase).
 * 고친 게 없는 항목(original === corrected)도 버린다. lang 은 아는 값이 아니면 비운다.
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
    const text = textById.get(id)
    if (typeof text !== 'string' || indexOfPhrase(text, original) === -1) continue
    // 같은 자리를 두 번 적어 보내는 일이 있다
    const key = `${id}\u0000${original}`
    if (seen.has(key)) continue
    seen.add(key)
    const lang = PROOFREAD_LANGS.includes(row.lang) ? row.lang : ''
    out.push({ id, lang, original, corrected, reason: typeof row.reason === 'string' ? row.reason : '' })
  }
  return out
}

/**
 * POST /api/proofread 본문을 받아 고칠 곳 목록을 돌려준다.
 * @param body   { items: [{ id, text }], hint?: 'ko'|'en'|'ja'|'zh' } — hint 는 뉴스레터의 주 언어(있으면)
 * @param config { key, model? }
 * @returns      { corrections: [{ id, lang, original, corrected, reason }] }
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

  const hint = PROOFREAD_LANGS.includes(body.hint) ? body.hint : ''
  const parsed = await callGeminiJson({
    key: config.key,
    model: (config.model || DEFAULT_GEMINI_MODEL).trim(),
    systemInstruction: SYSTEM_INSTRUCTION,
    input: { hint: hint || 'unknown', items },
    responseSchema: RESPONSE_SCHEMA,
    what: '검사',
  })
  return { corrections: usableCorrections(parsed, items) }
}
