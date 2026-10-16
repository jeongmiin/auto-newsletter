/**
 * AI 도구 '모듈 조합 추천' 의 Gemini 호출 — 로컬 프록시(translate-proxy.mjs)와 Worker(translate-worker.mjs)가 같이 쓴다.
 *
 * 빈 템플릿에서 시작할 때 "어떤 모듈을 어떤 순서로 놓을지"를 **우리 빌더에 있는 조립형 모듈 안에서** 골라 주고,
 * 각 모듈에 넣을 초안 문구까지 낸다. 화면(recommendStore)은 이 결과를 받아 조립 함수로 캔버스에 깐다.
 *
 * 규칙은 코드가 쥔다:
 * - 머리는 헤더 셋 중 하나, 꼬리는 푸터 — 푸터는 모델이 고르지 않고 화면이 항상 붙인다.
 * - 모듈 id 는 아래 CATALOG 의 enum 으로 묶는다 — 모델이 없는 모듈을 지어내도 스키마에서 걸리고, 혹시 새어 들어와도 버린다.
 * - 문구는 초안이다. 모르는 사실(일정·장소)은 지어내지 말고 [대괄호]로 비워 두라고 지시한다.
 */
import { TranslateRequestError } from './request-error.mjs'
import { callGeminiJson, DEFAULT_GEMINI_MODEL } from './gemini-core.mjs'

/** 전시 분야 — 팀에서 자동으로 채우고 필요하면 바꾼다(프런트 exhibitionFields.ts 와 같은 목록) */
export const FIELDS = [
  '건설 · 건축 · 인테리어', '에너지 · 환경', '관광 · 레저 · 취미', '농수산 · 식음료', '기계 · 설비 · 제조',
  '반려동물', '육아 · 교육', '치안 · 방산', '의료 · 건강', '법률', '미용 · 화장품', '해외',
]
/** 뉴스레터 목적 — 모듈 구성은 분야보다 이것에 따라 갈린다 */
export const PURPOSES = ['사전등록 안내', '개막 D-day', '참가기업 모집', '부대행사 안내', '결과 보고']

/**
 * 추천에 쓸 조립형 모듈 — id 는 moduleStore.composedBuilderMap 의 키와 같아야 한다(화면이 그 함수로 깐다).
 * slots 는 그 모듈 안의 글 자리 수. 화면이 멤버 모듈을 순서대로 훑으며 titles→굵은 설명 텍스트, bodies→일반 설명 텍스트,
 * buttons→버튼, labels→인라인 텍스트 라벨에 채운다. 모델에는 설명과 자리 수만 알려 준다.
 */
export const CATALOG = {
  headers: {
    ModuleNewsHeader: { desc: '로고 + "NEWSLETTER VOL.N" 제목 행 + 웹으로 보기 링크. 간결한 뉴스형', slots: { titles: 1 } },
    ModuleBasicHeader: { desc: '로고 + 한 줄 제목. 가장 단순', slots: { titles: 1 } },
    ModuleImageHeader: {
      desc: '큰 비주얼 이미지 + 일정·장소 한 줄 + 큰 타이틀 + 소개 본문 + 큰 버튼. 사전등록·개막처럼 한 가지를 크게 알릴 때',
      slots: { subtitles: 1, titles: 1, bodies: 1, buttons: 1 },
    },
  },
  body: {
    ComposedTitleSection: { desc: '굵은 선 + 섹션 타이틀 + 한 줄 설명. 새 섹션을 시작할 때', slots: { titles: 1, bodies: 1 } },
    Module01: { desc: '회색 배경 박스에 빨간 강조 타이틀 + 본문. 공지·주의·요약', slots: { titles: 1, bodies: 1 } },
    Module02: { desc: '가로 이미지 + 타이틀 + 본문 + 큰 버튼. 핵심 소개와 행동 유도', slots: { titles: 1, bodies: 1, buttons: 1 } },
    Module04: { desc: '2단 카드 ×2 (이미지 + 타이틀 + 본문 + 작은 버튼). 프로그램·혜택 두 가지 나란히', slots: { titles: 2, bodies: 2, buttons: 2 } },
    'Module01-1': { desc: '2단 (제목 박스 + 내용 박스) ×2. 일시·장소처럼 짧은 정보 두 칸', slots: { titles: 2, bodies: 2 } },
    Module05: { desc: '상단 회색 타이틀 박스 + 섹션 텍스트, 아래 2단 (이미지 | 타이틀 + 본문 + 작은 버튼)', slots: { titles: 2, bodies: 2, buttons: 1 } },
    'Module05-1': { desc: '2단 (이미지 | 강조 타이틀 박스 + 본문 + 작은 버튼)', slots: { titles: 1, bodies: 1, buttons: 1 } },
    Module06: { desc: '2단 대칭 (타이틀 박스 + 이미지 + 본문 + 작은 버튼) ×2. 부대행사·전시관 두 가지', slots: { titles: 2, bodies: 2, buttons: 2 } },
    Module07: { desc: '2단 (왼쪽 이미지 | 타이틀 + 본문 + 작은 버튼). 한 가지를 사진과 함께', slots: { titles: 1, bodies: 1, buttons: 1 } },
    Module07_reverse: { desc: 'Module07 과 같되 이미지가 오른쪽. 07 과 번갈아 쓰면 지그재그', slots: { titles: 1, bodies: 1, buttons: 1 } },
    Module10: { desc: '2단 (작은 인물 이미지 | 라벨 + 시간 + 타이틀). 연사·세션 한 명', slots: { labels: 1, titles: 1 } },
    'Module10-1': { desc: '2단 대칭 (인물 이미지 + 라벨 + 타이틀) ×2. 연사 두 명', slots: { labels: 2, titles: 2 } },
    ModuleMultiImage: { desc: '이미지 두 장 나란히. 글 없음', slots: {} },
    ModuleTwoButton: { desc: '버튼 두 개 나란히. 사전등록 + 홈페이지처럼 행동 둘', slots: { buttons: 2 } },
  },
}
export const HEADER_IDS = Object.keys(CATALOG.headers)
export const BODY_IDS = Object.keys(CATALOG.body)

const MAX_OPTIONS = 3
const MAX_BODY_MODULES = 7
const MAX_BRIEF_CHARS = 2_000

const catalogText = (section) =>
  Object.entries(section)
    .map(([id, { desc, slots }]) => {
      const s = Object.entries(slots).map(([k, n]) => `${k} ${n}`).join(', ')
      return `- ${id}: ${desc}${s ? ` (글 자리: ${s})` : ' (글 자리 없음)'}`
    })
    .join('\n')

const SYSTEM_INSTRUCTION = `당신은 전시회·박람회 이메일 뉴스레터 기획자입니다. 입력은 JSON {field, purpose, brief} 입니다.
field 는 전시 분야, purpose 는 이 뉴스레터의 목적, brief 는 담당자가 적은 핵심 정보(행사명·일정·장소·메시지 등)입니다.

우리 빌더에 있는 모듈만 써서 뉴스레터 구성안을 2~3개 만듭니다. 구성안은 서로 달라야 합니다
(예: 이미지 중심 임팩트형 / 정보 정리형 / 간결형). 각 구성안은 헤더 하나로 시작하고 본문 모듈 3~6개를 순서대로 둡니다.
푸터는 넣지 않습니다(시스템이 붙입니다).

헤더(하나 선택):
${catalogText(CATALOG.headers)}

본문 모듈(순서대로 3~6개, 같은 모듈은 최대 2번):
${catalogText(CATALOG.body)}

구성 규칙:
- 첫 본문은 인사·소개, 마지막 본문은 행동 유도(버튼이 있는 모듈)로 끝냅니다.
- purpose 에 맞게 고릅니다. 사전등록 안내·개막 D-day 는 이미지형 헤더와 큰 버튼, 참가기업 모집은 혜택·절차 정리,
  부대행사 안내는 2단 카드와 연사 모듈, 결과 보고는 숫자·사진 중심 정보 정리형이 어울립니다.
- 결과 보고는 이미 끝난 행사이므로 사전등록을 유도하지 않습니다(감사 인사·결과 보기·다음 회차 안내로 끝냅니다).
- 2단 모듈의 글 자리 수가 2인 것은 두 칸에 서로 다른 내용을 넣습니다.

문구 규칙(모두 한국어, 초안):
- 각 모듈의 글 자리 수만큼 배열에 채웁니다(titles·bodies·buttons·labels). 자리가 없는 종류는 빈 배열.
- 타이틀 25자 이내, 본문 40~120자, 버튼 12자 이내(끝에 " →" 가능), 라벨 8자 이내.
- 홍보 뉴스레터답게 간결하고 또렷하게, field 에 맞는 어휘와 어투로. 이모지는 타이틀에 한 개까지.
- brief 에 적힌 일정·장소·행사명은 그대로 씁니다. brief 에 없는 사실(날짜·장소·숫자·이름)만 지어내지 말고
  [일정], [장소]처럼 대괄호로 비워 둡니다.
- header 의 subtitles 는 일정·장소 한 줄, titles 는 행사명이나 머리글(뉴스 헤드라인 헤더는 "NEWSLETTER VOL.N" 꼴 유지).

출력: {options: [{name, summary, header: {module, titles, subtitles, bodies, buttons}, body: [{module, reason, titles, bodies, buttons, labels}]}]}
name 은 구성안 이름(6자 이내), summary 는 한 줄, reason 은 그 모듈을 그 자리에 둔 이유 한 줄.`

const STRINGS = { type: 'ARRAY', items: { type: 'STRING' } }
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    options: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          summary: { type: 'STRING' },
          header: {
            type: 'OBJECT',
            properties: {
              module: { type: 'STRING', enum: HEADER_IDS },
              titles: STRINGS,
              subtitles: STRINGS,
              bodies: STRINGS,
              buttons: STRINGS,
            },
            required: ['module', 'titles', 'subtitles', 'bodies', 'buttons'],
          },
          body: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                module: { type: 'STRING', enum: BODY_IDS },
                reason: { type: 'STRING' },
                titles: STRINGS,
                bodies: STRINGS,
                buttons: STRINGS,
                labels: STRINGS,
              },
              required: ['module', 'reason', 'titles', 'bodies', 'buttons', 'labels'],
            },
          },
        },
        required: ['name', 'summary', 'header', 'body'],
      },
    },
  },
  required: ['options'],
}

/**
 * 문구 배열 다듬기 — 글자만 남긴다. 버튼·라벨 문구는 화면이 모듈 HTML 에 **그대로** 끼워 넣으므로
 * 꺾쇠(<, >)는 지운다: brief 속 지시문에 끌려 모델이 태그를 내도 마크업이 되지 않게.
 */
const strings = (value, max = 4) =>
  (Array.isArray(value) ? value : [])
    .filter((s) => typeof s === 'string')
    .map((s) => s.replace(/[<>]/g, '').trim())
    .filter(Boolean)
    .slice(0, max)

/**
 * 모델 답을 화면이 그대로 쓸 수 있는 꼴로 — 모르는 모듈·빈 구성안은 버리고, 글은 다듬고, 수를 제한한다.
 * 머리는 헤더 enum 안이어야 하고(아니면 기본 헤더), 본문이 하나도 안 남은 구성안은 뺀다.
 */
export function usableOptions(raw) {
  const options = Array.isArray(raw?.options) ? raw.options : []
  const out = []
  for (const option of options) {
    if (!option || typeof option !== 'object') continue
    const header = option.header && typeof option.header === 'object' ? option.header : {}
    const body = (Array.isArray(option.body) ? option.body : [])
      .filter((item) => item && BODY_IDS.includes(item.module))
      .slice(0, MAX_BODY_MODULES)
      .map((item) => ({
        module: item.module,
        reason: typeof item.reason === 'string' ? item.reason.trim() : '',
        titles: strings(item.titles),
        bodies: strings(item.bodies),
        buttons: strings(item.buttons),
        labels: strings(item.labels),
      }))
    if (!body.length) continue
    out.push({
      name: typeof option.name === 'string' && option.name.trim() ? option.name.trim() : `구성안 ${out.length + 1}`,
      summary: typeof option.summary === 'string' ? option.summary.trim() : '',
      header: {
        module: HEADER_IDS.includes(header.module) ? header.module : 'ModuleBasicHeader',
        titles: strings(header.titles),
        subtitles: strings(header.subtitles),
        bodies: strings(header.bodies),
        buttons: strings(header.buttons),
      },
      body,
    })
    if (out.length >= MAX_OPTIONS) break
  }
  return out
}

/**
 * POST /api/recommend 본문을 받아 구성안 목록을 돌려준다.
 * @param body   { field?: string, purpose: string, brief: string }
 * @param config { key, model? }
 * @returns      { options: [...] }  — 비어 있으면 502(모델이 쓸 만한 답을 못 냈다)
 */
export async function handleRecommend(body, config) {
  if (!config?.key) throw new TranslateRequestError('서버에 GEMINI_API_KEY가 설정되지 않았습니다.', 500)
  const purpose = typeof body?.purpose === 'string' ? body.purpose.trim() : ''
  const brief = typeof body?.brief === 'string' ? body.brief.trim() : ''
  const field = typeof body?.field === 'string' ? body.field.trim() : ''
  if (!purpose) throw new TranslateRequestError('뉴스레터의 목적을 골라 주세요.')
  if (!brief) throw new TranslateRequestError('행사 정보를 한두 줄이라도 적어 주세요.')
  if (brief.length > MAX_BRIEF_CHARS) throw new TranslateRequestError('행사 정보가 너무 깁니다.')

  const raw = await callGeminiJson({
    key: config.key,
    model: (config.model || DEFAULT_GEMINI_MODEL).trim(),
    systemInstruction: SYSTEM_INSTRUCTION,
    input: { field: field || '(미지정)', purpose, brief },
    responseSchema: RESPONSE_SCHEMA,
    // 구성안 셋 × 모듈 예닐곱 × 문구 — 넉넉히
    maxOutputTokens: 8192,
    temperature: 0.7,
    what: '추천',
  })
  const options = usableOptions(raw)
  if (!options.length) throw new TranslateRequestError('쓸 만한 구성안을 받지 못했어요. 다시 시도해 주세요.', 502)
  return { options }
}
