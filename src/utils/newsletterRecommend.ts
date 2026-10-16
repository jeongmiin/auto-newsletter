/**
 * 모듈 조합 추천 — 서버(scripts/recommend-core.mjs)가 돌려준 구성안을 캔버스에 깔 때 쓰는 순수 로직.
 *
 * 구성안은 "모듈 id 순서 + 각 모듈에 넣을 초안 문구(titles·bodies·buttons·labels)"다.
 * 모듈 자체는 스토어의 조립 함수(composedBuilderMap)가 기본 문구로 만들고, 여기서는 그 그룹의
 * **멤버 원소 모듈을 순서대로 훑으며** 문구를 어느 멤버에 넣을지 정한다(`planMemberFill`).
 *
 * 어느 멤버가 타이틀이고 본문인지는 조립 함수가 만든 HTML 의 꼴로 가린다 — 굵게(<strong> 또는
 * font-weight:700)면 타이틀, 아니면 본문, 링크(<a>)가 든 것은 '웹으로 보기' 같은 고정 문구라 건너뛴다.
 * 조립 함수마다 멤버 종류를 따로 적어 두지 않는 이유: 함수가 바뀌어도 여기가 따라서 틀어지지 않게.
 * 예외는 꼴만으로 못 가리는 둘뿐이다 — 이미지형 헤더(첫 글이 '볼·날짜·홈' 세 문단)와
 * 모듈 01번(문단 둘이 든 글 하나).
 */

export type RecommendHeaderId = 'ModuleNewsHeader' | 'ModuleBasicHeader' | 'ModuleImageHeader'

/** 모듈 하나에 넣을 초안 문구. 자리 수보다 적게 올 수 있다(그 자리는 기본 문구가 남는다) */
export interface RecommendCopy {
  titles: string[]
  bodies: string[]
  buttons: string[]
  labels: string[]
}
export interface RecommendHeader extends RecommendCopy {
  module: RecommendHeaderId
  /** 일정·장소 한 줄 — 이미지형 헤더에만 자리가 있다 */
  subtitles: string[]
}
export interface RecommendBodyModule extends RecommendCopy {
  /** composedBuilderMap 의 키 */
  module: string
  reason: string
}
export interface RecommendOption {
  name: string
  summary: string
  header: RecommendHeader
  body: RecommendBodyModule[]
}

/** 캔버스에 깔 순서 — 헤더, 본문…, 푸터. 푸터는 모델이 고르지 않고 늘 붙는다 */
export interface RecommendStep extends Partial<RecommendCopy> {
  module: string
  subtitles?: string[]
}
export const FOOTER_MODULE = 'ModuleFooter'
export const stepsOf = (option: RecommendOption): RecommendStep[] => [
  option.header,
  ...option.body,
  { module: FOOTER_MODULE },
]

/** 조립 함수 키 → 보여 줄 이름. 모듈 메타데이터에 이름이 있으면 그걸 먼저 쓰고 없을 때만 이걸 쓴다 */
export const RECOMMEND_MODULE_LABELS: Record<string, string> = {
  ModuleNewsHeader: '뉴스 헤드라인 헤더',
  ModuleBasicHeader: '기본 헤더',
  ModuleImageHeader: '이미지형 헤더',
  ComposedTitleSection: '섹션 타이틀',
  Module01: '모듈 01번',
  Module02: '모듈 02번',
  Module04: '모듈 04번',
  'Module01-1': '모듈 01-1번',
  Module05: '모듈 05번',
  'Module05-1': '모듈 05-1번',
  Module06: '모듈 06번',
  Module07: '모듈 07번',
  Module07_reverse: '모듈 07번 (반대 방향)',
  Module10: '모듈 10번',
  'Module10-1': '모듈 10-1번',
  ModuleMultiImage: '복수 이미지',
  ModuleTwoButton: '복수 버튼',
  ModuleFooter: '하단 푸터',
}

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** 초안 문구를 문단 안에 넣을 HTML 로 — 태그는 글자로, 줄바꿈은 <br> 로 */
export const toInlineHtml = (text: string): string => escapeHtml(text.trim()).replace(/\r?\n/g, '<br>')

const PARAGRAPH_RE = /<p\b[^>]*>[\s\S]*?<\/p>/gi

/**
 * 문단 하나의 글만 바꾼다 — 조립 함수가 준 꼴(문단 스타일과 맨 앞의 굵게·크기 span)은 그대로 두고
 * 안의 글만 갈아 끼운다. `<p style="…"><strong style="font-size:20px;">옛 글</strong></p>` →
 * 같은 틀에 새 글. 문단이 아니면(빈 값 등) 기본 문단으로 감싼다.
 */
export function replaceParagraphText(html: string, text: string): string {
  const inline = toInlineHtml(text)
  const match = /^\s*(<p\b[^>]*>)\s*(?:<(strong|span|b)\b[^>]*>)?/i.exec(html)
  if (!match) return `<p style="margin:0; padding:0; line-height:1.7;">${inline}</p>`
  const open = match[1]
  const innerOpen = match[2] ? match[0].slice(match[0].indexOf(`<${match[2]}`)) : ''
  return innerOpen ? `${open}${innerOpen}${inline}</${match[2]}></p>` : `${open}${inline}</p>`
}

/** 여러 문단 중 n번째 문단의 글만 바꾼다. 그 문단이 없으면 그대로 */
export function replaceParagraphAt(html: string, index: number, text: string): string {
  let at = -1
  return html.replace(PARAGRAPH_RE, (paragraph) => (++at === index ? replaceParagraphText(paragraph, text) : paragraph))
}

/** 타이틀 자리인가 — 조립 함수는 타이틀을 <strong> 이나 font-weight:700 으로 만든다 */
export const isTitleHtml = (html: string): boolean => /<strong\b|font-weight:\s*(700|bold)\b/i.test(html)
/** 고정 문구(웹으로 보기·홈페이지 링크)인가 — 바꾸지 않는다 */
export const isLinkHtml = (html: string): boolean => /<a\b/i.test(html)

/** planMemberFill 이 보는 멤버 — 스토어의 ModuleInstance 에서 필요한 둘만 */
export interface FillMember {
  moduleId: string
  properties: Record<string, unknown>
}
export interface MemberFill {
  /** members 배열에서의 자리 */
  index: number
  props: Record<string, string>
}

const str = (value: unknown): string => (typeof value === 'string' ? value : '')
/**
 * 버튼·라벨처럼 모듈 HTML 에 그대로 끼워 넣는 속성 값 — 꺾쇠를 지워 마크업이 되지 않게 한다.
 * (서버도 같은 일을 하지만, 응답을 믿지 않고 여기서 한 번 더)
 */
const plain = (text: string): string => text.replace(/[<>]/g, '').trim()

/**
 * 조립된 그룹의 멤버들에 초안 문구를 어느 속성으로 넣을지 정한다. 스토어는 건드리지 않는다.
 *
 * 멤버를 순서대로 훑으며 종류별 문구를 하나씩 꺼내 쓴다(2단 모듈은 왼쪽 칸 멤버가 먼저 온다 —
 * 조립 함수가 그 순서로 만든다). 문구가 모자라면 그 자리는 기본 문구가 남고, 남으면 버린다.
 *
 * @param key 조립 함수 키 — 꼴만으로 못 가리는 모듈(이미지형 헤더·모듈 01번)을 알아보는 데 쓴다
 */
export function planMemberFill(members: FillMember[], copy: RecommendStep, key: string): MemberFill[] {
  const titles = [...(copy.titles ?? [])]
  const bodies = [...(copy.bodies ?? [])]
  const buttons = [...(copy.buttons ?? [])]
  const labels = [...(copy.labels ?? [])]
  const subtitles = [...(copy.subtitles ?? [])]
  const fills: MemberFill[] = []
  const push = (index: number, props: Record<string, string>): void => {
    fills.push({ index, props })
  }

  if (key === 'Module01') {
    // 글 하나에 문단 둘 — 첫 문단이 강조 타이틀, 둘째가 본문
    const index = members.findIndex((m) => m.moduleId === 'ModuleDescText')
    if (index === -1) return fills
    let html = str(members[index].properties.descriptionText)
    if (titles.length) html = replaceParagraphAt(html, 0, titles[0])
    if (bodies.length) html = replaceParagraphAt(html, 1, bodies[0])
    push(index, { descriptionText: html })
    return fills
  }

  // 이미지형 헤더의 첫 글은 '볼 · 날짜 · 홈 링크' 세 문단이다 — 가운데 날짜 줄만 부제로 바꾼다
  let imageHeaderLead = key === 'ModuleImageHeader'

  members.forEach((member, index) => {
    const props = member.properties
    switch (member.moduleId) {
      case 'ModuleDescText': {
        const html = str(props.descriptionText)
        if (imageHeaderLead) {
          imageHeaderLead = false
          if (subtitles.length) push(index, { descriptionText: replaceParagraphAt(html, 1, subtitles[0]) })
          return
        }
        if (isLinkHtml(html)) return
        const pool = isTitleHtml(html) ? titles : bodies
        if (pool.length) push(index, { descriptionText: replaceParagraphText(html, pool.shift()!) })
        return
      }
      case 'ModuleOneButton':
        if (buttons.length) push(index, { buttonText: plain(buttons.shift()!) })
        return
      case 'ModuleSmallButton':
        if (buttons.length) push(index, { btn1Text: plain(buttons.shift()!) })
        return
      case 'ModuleInlineText':
        if (labels.length) push(index, { text1: plain(labels.shift()!) })
        return
      default:
        return
    }
  })
  return fills
}
