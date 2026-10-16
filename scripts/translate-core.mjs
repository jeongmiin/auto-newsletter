/**
 * Gemini 번역 호출의 공통 부분 — 로컬 Node 프록시(translate-proxy.mjs)와
 * Cloudflare Worker(translate-worker.mjs)가 같이 쓴다.
 *
 * 2026-10-12까지는 Azure Translator 를 썼다. Azure 구독이 꺼지면서(무료 체험 종료) 키가 거절됐고,
 * 다시 살리려면 카드 등록이 필요해 **맞춤법 검사에 이미 붙여 둔 Gemini 무료 키**로 번역까지 옮겼다.
 * 요청·응답 계약(docs/gemini-translate.md)은 Azure 때와 같아 화면 쪽 코드는 그대로다.
 *
 * 요청 검증 · 묶음 분할 · Gemini 호출 · **서식 검증**(뼈대 태그가 원문과 같은지) · 응답 정리만 담당하고,
 * HTTP(헤더·CORS·응답 객체)는 각 실행 환경이 맡는다. Node 20+와 Workers 런타임 둘 다에서
 * 돌아가야 하므로 전역 fetch 만 쓰고 node: 모듈·DOMParser 는 들이지 않는다.
 */
import { TranslateRequestError } from './request-error.mjs'
import { callGeminiJson, DEFAULT_GEMINI_MODEL } from './gemini-core.mjs'

export { TranslateRequestError, parseAllowedOrigins } from './request-error.mjs'

export const TARGET_LANGUAGES = new Set(['en', 'ja', 'zh-Hans', 'th'])
const LANGUAGE_NAMES = {
  en: '영어(English)',
  ja: '일본어(日本語)',
  'zh-Hans': '중국어 간체(简体中文)',
  th: '태국어(ภาษาไทย)',
}

/**
 * 한 번에 보내는 양. 출력 한도(8,192 토큰) 안에 번역문이 들어와야 한다 — 일본어·중국어는 글자당
 * 토큰이 많아 넉넉히 잡지 않는다. 뉴스레터 한 편(3,000~7,000자)이 요청 2~3회가 된다.
 */
const MAX_BATCH_CHARS = 3_000
const MAX_BATCH_ITEMS = 80
/** 값 하나가 이보다 길면 거절한다 — 한 값은 한 요청 안에 있어야 서식 검증이 된다 */
const MAX_ITEM_CHARS = 12_000
/** 뉴스레터 한 편의 상한 — 붙여 넣은 긴 글로 한도를 태우지 않게 막는다 */
const MAX_TOTAL_CHARS = 60_000

const SYSTEM_INSTRUCTION = `당신은 전시회·행사 뉴스레터 전문 번역가입니다. 입력은 JSON {target, items} 이고
items 는 {id, text, format} 목록입니다. 각 text 는 한국어 원문입니다. target 언어로 자연스럽게 번역합니다 —
홍보 뉴스레터답게 간결하고 또렷한 문장으로, 원문의 어투(안내·권유·강조)를 살립니다.

서식 규칙 — 가장 중요합니다:
- format 이 "html" 인 항목은 HTML 조각입니다. **태그와 속성(i="숫자")은 글자 하나 바꾸지 말고 그대로** 두고
  태그 사이의 글만 번역합니다. 태그를 더하거나 빼거나 순서를 바꾸지 않고, 태그 안에 있던 글은 그 태그 안에 둡니다.
  번역문의 태그 수와 순서는 원문과 정확히 같아야 합니다.
- 글이 없는 태그(빈 문단 <p i="4"> </p>, 줄바꿈 <br i="7">)도 빼지 말고 그 자리에 그대로 둡니다 — 문단 사이 간격입니다.
- HTML 엔티티(&nbsp; &amp; &lt; 등)는 그대로 둡니다.
- format 이 "plain" 인 항목에는 태그를 넣지 않습니다. 줄바꿈은 줄 수를 그대로 유지합니다.

내용 규칙:
- 고유명사·브랜드·행사명: 공식 표기가 널리 알려져 있으면 그것을, 아니면 원문 그대로 둡니다. 영문 표기는 그대로.
- 숫자·날짜·시간·금액·URL·이메일·전화번호·기호(→ • ※)·이모지는 그대로 둡니다.
- 숫자나 기호뿐이라 번역할 글이 없는 항목은 원문을 그대로 돌려줍니다.
- 설명을 덧붙이거나 내용을 빼지 않습니다.

출력: [{id, text}] — 입력의 모든 항목을 빠짐없이, 같은 id 로.`

const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      id: { type: 'STRING' },
      text: { type: 'STRING' },
    },
    required: ['id', 'text'],
  },
}

/** 글자 수·항목 수 기준으로 묶는다. 한 항목이 한도를 넘으면 혼자 한 묶음이 된다 */
export function batchesOf(items, maxChars = MAX_BATCH_CHARS, maxItems = MAX_BATCH_ITEMS) {
  const batches = []
  let current = []
  let chars = 0
  for (const item of items) {
    const length = item.text.length
    if (current.length && (current.length >= maxItems || chars + length > maxChars)) {
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

const TAG = /<\/?([a-z][a-z0-9]*)(\s[^<>]*)?>/gi
const INDEX_ATTR = /\bi="(\d+)"/i

/**
 * HTML 조각의 태그 뼈대 — 여는/닫는 태그 이름과 뼈대 번호(i="n")만 순서대로.
 * 번역문이 원문과 같은 뼈대면 서식(굵게·색상·링크)을 그대로 되붙일 수 있다(프런트 restoreSkeleton).
 */
export function tagSignature(html) {
  const out = []
  for (const match of String(html).matchAll(TAG)) {
    const closing = match[0].startsWith('</')
    const name = match[1].toLowerCase()
    const index = closing ? null : INDEX_ATTR.exec(match[2] ?? '')?.[1]
    const suffix = index ? '#' + index : ''
    out.push((closing ? '/' : '') + name + suffix)
  }
  return out.join(' ')
}

/** 번호를 뺀 뼈대 — 태그 이름과 순서만 */
const tagNames = (html) => tagSignature(html).replace(/#\d+/g, '')

const hasTag = (text) => /<[a-z][a-z0-9]*(\s[^<>]*)?>/i.test(text)

/**
 * 태그 이름·순서는 원문과 같은데 **번호(i="n")만 틀린** 번역문을 고친다 — 원문의 k번째 여는 태그 번호를
 * 번역문의 k번째 여는 태그에 그대로 옮긴다. 실측에서 긴 글(문단 20개 이상)의 마지막 문단 번호를 하나 작게
 * 적는 일이 있었다(23 → 22). 구조가 같으니 자리가 곧 짝이다. 번호 말고 다른 속성은 두지 않는다(원문 뼈대에도 없다).
 * 구조가 다르면 null.
 */
export function repairSkeleton(originalHtml, translatedHtml) {
  if (tagNames(originalHtml) !== tagNames(translatedHtml)) return null
  const opening = [...String(originalHtml).matchAll(TAG)].filter((m) => !m[0].startsWith('</'))
  let k = 0
  const out = String(translatedHtml).replace(TAG, (tag, name, attrs) => {
    if (tag.startsWith('</')) return tag
    const source = opening[k++]
    const index = INDEX_ATTR.exec(source?.[2] ?? '')?.[1]
    const selfClosing = /\/\s*$/.test(attrs ?? '') ? '/' : ''
    return index === undefined ? `<${name}${selfClosing}>` : `<${name} i="${index}"${selfClosing}>`
  })
  return out
}

/**
 * 번역문 하나를 쓸 수 있는 꼴로 — 서식 항목은 뼈대가 같아야 하고(번호만 틀린 건 고쳐 받는다),
 * 평문 항목에는 태그가 없어야 한다. 못 쓰면 null.
 */
export function usableTranslation(item, text) {
  if (typeof text !== 'string' || !text.trim()) return null
  if (item.format !== 'html') return hasTag(text) ? null : text
  if (tagSignature(item.text) === tagSignature(text)) return text
  return repairSkeleton(item.text, text)
}

/**
 * "글만 바꾸고 뼈대는 그대로" 작업의 정의 — 번역과 어투 변환(tone-core.mjs)이 같은 엔진을 쓴다.
 * @typedef {object} RewriteTask
 * @property {string} systemInstruction  모델에 줄 지시문(서식 규칙 포함)
 * @property {object} input              items 앞에 붙일 입력(target·tone 등)
 * @property {string} strictNote         재시도 때 덧붙일 한 줄
 * @property {string} what               오류 문구에 들어갈 일 이름('번역'·'어투 변환')
 */

/** 번역 작업 — target 언어 하나 */
const translationTask = (targetLanguage) => ({
  systemInstruction: SYSTEM_INSTRUCTION,
  input: { target: LANGUAGE_NAMES[targetLanguage] },
  strictNote: '앞 시도에서 태그 뼈대가 원문과 달랐습니다. 태그와 i="숫자" 속성을 원문 그대로 두고 글만 번역하세요.',
  what: '번역',
})

/**
 * 묶음 하나를 작업에 맞게 다시 써서 {id → text} 와 실패 항목을 돌려준다.
 * `strict` 는 재시도용 — 앞 시도에서 뼈대가 어긋난 항목이라고 알리고 온도를 조금 올려 같은 답을 피한다.
 * @param {RewriteTask} task
 */
export async function rewriteBatch(items, task, config, strict = false) {
  const input = {
    ...task.input,
    ...(strict ? { note: task.strictNote } : {}),
    items: items.map(({ id, text, format }) => ({ id, text, format })),
  }
  const raw = await callGeminiJson({
    key: config.key,
    model: config.model,
    systemInstruction: task.systemInstruction,
    input,
    responseSchema: RESPONSE_SCHEMA,
    temperature: strict ? 0.3 : 0,
    what: task.what,
  })
  const byId = new Map()
  for (const row of Array.isArray(raw) ? raw : []) {
    if (row && typeof row.id === 'string' && !byId.has(row.id)) byId.set(row.id, row.text)
  }
  const ok = new Map()
  const failed = []
  for (const item of items) {
    const text = usableTranslation(item, byId.get(item.id))
    if (text !== null) ok.set(item.id, text)
    else failed.push(item)
  }
  // raw 는 디버깅용 — 뼈대가 어긋난 항목이 어떻게 왔는지 볼 때
  return { ok, failed, raw: byId }
}

/** 묶음 하나를 번역한다 — rewriteBatch 의 번역 전용 꼴(테스트·호환용) */
export const translateBatch = (items, targetLanguage, config, strict = false) =>
  rewriteBatch(items, translationTask(targetLanguage), config, strict)

/**
 * 요청 본문의 items 를 검증해 {id, text, format} 목록으로. 번역·어투 변환이 같은 규칙을 쓴다.
 * @param {string} what  오류 문구에 들어갈 일 이름
 */
export function normalizeItems(rawItems, what = '번역') {
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw new TranslateRequestError(`${what}할 문장이 없습니다.`)
  const items = rawItems.map((item) => {
    if (!item || typeof item.id !== 'string' || typeof item.text !== 'string') {
      throw new TranslateRequestError(`${what} 항목 형식이 올바르지 않습니다.`)
    }
    if (item.text.length > MAX_ITEM_CHARS) throw new TranslateRequestError(`${what}할 문장 하나가 너무 깁니다.`)
    return { id: item.id, text: item.text, format: item.format === 'html' ? 'html' : 'plain' }
  })
  const total = items.reduce((sum, item) => sum + item.text.length, 0)
  if (total > MAX_TOTAL_CHARS) throw new TranslateRequestError(`${what}할 글이 너무 깁니다.`)
  return items
}

/**
 * 항목 전부를 작업에 맞게 다시 쓴다 — 묶음 분할 · 동시 호출 · 뼈대 검증 · 실패 항목 단독 재시도.
 * 돌려주는 값은 입력 순서 그대로의 [{id, text}].
 *
 * 묶음은 **동시에** 보낸다 — 생성 모델이라 묶음 하나가 5~10초인데, 차례로 보내면 한 편이 묶음 수만큼
 * 늘어진다(실측 2묶음 9~11초 → 동시 5~6초). 한 편이 2~3묶음이라 무료 등급의 분당 한도 안에 든다.
 * 뼈대가 어긋난 항목은 **하나씩 따로** 한 번 더 묻는다 — 실측에서 긴 묶음 속 짧은 항목의 바깥 태그를
 * 빼먹는 일이 간혹 있었고(44개 중 1개꼴), 단독으로 다시 물으면 대개 맞게 온다.
 * 그래도 안 되면 사람이 다시 시도하게 알린다(틀린 서식을 캔버스에 넣지 않는다).
 * @param {RewriteTask} task
 */
export async function rewriteAll(items, task, config) {
  const resolved = { key: config.key, model: (config.model || DEFAULT_GEMINI_MODEL).trim() }
  const runAll = async (batches, strict) => {
    const results = await Promise.all(batches.map((batch) => rewriteBatch(batch, task, resolved, strict)))
    const ok = new Map()
    const failed = []
    for (const result of results) {
      for (const [id, text] of result.ok) ok.set(id, text)
      failed.push(...result.failed)
    }
    return { ok, failed }
  }
  const done = new Map()
  const first = await runAll(batchesOf(items), false)
  for (const [id, text] of first.ok) done.set(id, text)
  let failed = first.failed
  if (failed.length) {
    const retry = await runAll(batchesOf(failed, MAX_BATCH_CHARS, 1), true)
    for (const [id, text] of retry.ok) done.set(id, text)
    failed = retry.failed
  }
  if (failed.length) {
    throw new TranslateRequestError(
      `${task.what} 결과 ${failed.length}곳의 서식이 원문과 달라 적용할 수 없어요. 다시 시도해 주세요.`,
      502,
    )
  }
  return items.map((item) => ({ id: item.id, text: done.get(item.id) }))
}

/**
 * POST /api/translate 본문을 받아 번역 결과를 돌려준다.
 * @param body   { sourceLanguage: 'ko', targetLanguage, items: [{ id, text, format? }] }
 * @param config { key, model? }  — Gemini 키·모델
 * @returns      { translations: [{ id, text }] }  입력 순서 그대로
 */
export async function handleTranslation(body, config) {
  if (!config?.key) throw new TranslateRequestError('서버에 GEMINI_API_KEY가 설정되지 않았습니다.', 500)
  if (body?.sourceLanguage !== 'ko') throw new TranslateRequestError('현재 원문 언어는 한국어만 지원합니다.')
  if (!TARGET_LANGUAGES.has(body?.targetLanguage)) throw new TranslateRequestError('지원하지 않는 대상 언어입니다.')
  const items = normalizeItems(body?.items, '번역')
  return { translations: await rewriteAll(items, translationTask(body.targetLanguage), config) }
}
