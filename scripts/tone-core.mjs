/**
 * AI 도구 '어투 변환(톤 변환)' 의 Gemini 호출 — 로컬 프록시(translate-proxy.mjs)와 Worker(translate-worker.mjs)가 같이 쓴다.
 *
 * 다 쓴 글의 **어투만** 바꾼다: 격식 있게 · 친근하게 · 간결하게. 내용·정보·서식은 그대로다.
 * 엔진은 번역과 같다(translate-core.mjs 의 rewriteAll): 뼈대 HTML 을 보내고, 태그가 원문과 같은지 검증하고,
 * 어긋난 항목은 단독으로 한 번 더 묻는다. 다른 것은 지시문뿐이다 — "target 언어로" 대신 "이 어투로".
 *
 * 항목마다 언어가 다를 수 있다(번역한 뉴스레터도 다듬는다). 언어는 바꾸지 않고 그 언어 안에서 어투만 바꾼다.
 */
import { TranslateRequestError } from './request-error.mjs'
import { normalizeItems, rewriteAll } from './translate-core.mjs'

/** 어투 선택지 — 키는 화면(toneStore)과 같아야 한다 */
export const TONES = {
  formal: {
    label: '격식 있게',
    guide:
      '공식 안내문처럼 정중하고 격식 있는 어투. 한국어는 "~합니다/~드립니다/~바랍니다" 체, 반말·구어체·감탄사·이모지는 뺍니다. ' +
      '영어는 contractions 없이 정중한 문장, 일본어는 です・ます체, 중국어·태국어도 그에 맞는 정중한 문체.',
  },
  friendly: {
    label: '친근하게',
    guide:
      '가까운 사람에게 말하듯 부드럽고 친근한 어투. 한국어는 "~해요/~이에요/~해 보세요" 체, 딱딱한 한자어는 쉬운 말로. ' +
      '다만 반말은 쓰지 않고, 이모지는 원문에 있던 것만 둡니다.',
  },
  concise: {
    label: '간결하게',
    guide:
      '군더더기를 덜어 짧고 또렷하게. 중복되는 수식어·접속사·상투적 인사말을 빼고 핵심만 남깁니다. ' +
      '원문 어투(존댓말 여부)는 유지하고, 정보(날짜·장소·숫자·이름·혜택)는 하나도 빼지 않습니다.',
  },
}
export const TONE_KEYS = Object.keys(TONES)

const SYSTEM_INSTRUCTION = `당신은 전시회·행사 이메일 뉴스레터 교정자입니다. 입력은 JSON {tone, guide, items} 이고
items 는 {id, text, format} 목록입니다. 각 text 를 **같은 언어 안에서, 같은 내용으로** tone 어투로 다시 씁니다.
guide 가 그 어투의 기준입니다. 당신이 바꾸는 것은 말투와 표현뿐입니다 — 글이 무엇에 관한 것인지는 절대 바꾸지 않습니다.

서식 규칙 — 가장 중요합니다:
- format 이 "html" 인 항목은 HTML 조각입니다. **태그와 속성(i="숫자")은 글자 하나 바꾸지 말고 그대로** 두고
  태그 사이의 글만 바꿉니다. 태그를 더하거나 빼거나 순서를 바꾸지 않고, 태그 안에 있던 글은 그 태그 안에 둡니다.
  결과의 태그 수와 순서는 원문과 정확히 같아야 합니다.
- 글이 없는 태그(빈 문단 <p i="4"> </p>, 줄바꿈 <br i="7">)도 빼지 말고 그 자리에 그대로 둡니다.
- HTML 엔티티(&nbsp; &amp; &lt; 등)는 그대로 둡니다.
- format 이 "plain" 인 항목에는 태그를 넣지 않습니다. 줄바꿈은 줄 수를 그대로 유지합니다.

내용 규칙:
- 주제·대상·사실을 바꾸지 않습니다. 뷰티 행사 글은 뷰티 행사 글로 남습니다 — 다른 업계·다른 행사 이야기로 바꾸거나
  원문에 없는 내용(동향·혜택·프로그램)을 지어 넣지 않습니다. 원문의 낱말을 되도록 살리고 말투만 바꿉니다.
- 언어를 바꾸지 않습니다. 한국어는 한국어로, 영어는 영어로 — 항목마다 그 글의 언어 그대로.
- 고유명사·브랜드·행사명·숫자·날짜·시간·금액·URL·이메일·전화번호·기호(→ • ※)는 그대로 둡니다.
- 정보를 더하거나 빼지 않습니다. 길이는 원문과 비슷하게(간결하게는 더 짧게).
- 버튼 글귀처럼 짧은 항목(10자 안팎)과 "타이틀을 입력하세요"류의 입력 안내 문구는 원문을 그대로 돌려줍니다.
- 바꿀 게 없는 항목은 원문을 그대로 돌려줍니다.

출력: [{id, text}] — 입력의 모든 항목을 빠짐없이, 같은 id 로.`

/**
 * POST /api/tone 본문을 받아 어투를 바꾼 글을 돌려준다.
 * @param body   { tone: 'formal'|'friendly'|'concise', items: [{ id, text, format? }] }
 * @param config { key, model? }
 * @returns      { rewrites: [{ id, text }] }  입력 순서 그대로. 바꿀 게 없던 항목은 원문 그대로 온다
 *
 * ⚠ 전시 분야는 보내지 않는다. 실측(2026-10-16)에서 분야 '법률'을 힌트로 주자 뷰티 행사 글을
 *   "법률 및 규제 동향"으로 **내용까지** 바꿨다. 어투 변환에 분야 맥락은 득보다 실이 크다.
 */
export async function handleTone(body, config) {
  if (!config?.key) throw new TranslateRequestError('서버에 GEMINI_API_KEY가 설정되지 않았습니다.', 500)
  const tone = TONES[body?.tone]
  if (!tone) throw new TranslateRequestError('지원하지 않는 어투입니다.')
  const items = normalizeItems(body?.items, '어투 변환')
  const task = {
    systemInstruction: SYSTEM_INSTRUCTION,
    input: { tone: tone.label, guide: tone.guide },
    strictNote: '앞 시도에서 태그 뼈대가 원문과 달랐습니다. 태그와 i="숫자" 속성을 원문 그대로 두고 글만 바꾸세요.',
    what: '어투 변환',
  }
  return { rewrites: await rewriteAll(items, task, config) }
}
