/**
 * 맞춤법 검사 결과를 **캔버스 미리보기 안에** 표시한다 — 고칠 구절에 붉은 물결 밑줄.
 *
 * 왜 CSS Custom Highlight API 인가:
 * - 캔버스의 모듈 HTML(v-html)에 `<mark>`를 끼워 넣으면 DOM 이 바뀌어 표 셀 선택·저장·다시 그리기와 얽힌다.
 *   Highlight 는 DOM 을 건드리지 않고 Range 에 스타일만 입힌다 — 태그 경계(`<strong>`)를 걸친 구절도 한 번에.
 * - 지원하지 않는 브라우저(크롬 105 이전 등)에서는 조용히 아무것도 안 한다. 카드 클릭으로 모듈까지 가는
 *   기존 동작은 그대로다. 스타일은 main.css 의 `::highlight(proofread)` / `::highlight(proofread-active)`.
 *
 * 등록은 **모듈 단위**다. 모듈 하나가 다시 그려지면(v-html 교체) 그 모듈의 Range 만 새로 만들어 갈아 끼우고,
 * 문서 전체의 Highlight 객체는 모듈별 Range 를 모두 합쳐 다시 만든다(Highlight 는 문서에 하나다).
 */
import type { ProofreadSuggestion } from '@/utils/newsletterProofread'
import { indexOfPhrase } from '@/utils/newsletterProofread'
import { blockElements, textNodesIn } from '@/utils/newsletterTranslation'

/** main.css 의 ::highlight() 이름 */
export const HIGHLIGHT_ALL = 'proofread'
export const HIGHLIGHT_ACTIVE = 'proofread-active'

export const isHighlightSupported = (): boolean =>
  typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined'

interface ModuleRanges {
  all: Range[]
  /** 패널에서 누른 카드의 구절 — 하나뿐이지만 같은 글이 여러 값에 있으면 카드도 여럿이라 배열 */
  active: Range[]
}

const byModule = new Map<string, ModuleRanges>()
/** 카드를 눌렀을 때 그 구절로 스크롤해 달라는 요청 — 표시가 갱신되는 순간 처리한다 */
let pendingScrollId: string | null = null

/** 수집할 때 nbsp 를 공백으로 바꿔 보냈으므로 같은 눈으로 본다 */
const asPlain = (text: string): string => text.replace(/ /g, ' ')
/** 카드의 앞뒤 글은 길면 '…'로 줄여 두었다 — 비교할 때는 뗀다 */
const strip = (context: string): string => context.replace(/^…/, '').replace(/…$/, '')

/** 이어 붙인 글의 [start, end) 를 실제 텍스트 노드 좌표의 Range 로 */
function toRange(nodes: Text[], start: number, end: number): Range {
  const range = nodes[0]!.ownerDocument.createRange()
  let offset = 0
  let started = false
  for (const node of nodes) {
    const nodeStart = offset
    const nodeEnd = offset + node.data.length
    offset = nodeEnd
    if (node.data.length === 0) continue
    if (!started && start < nodeEnd) {
      range.setStart(node, start - nodeStart)
      started = true
    }
    if (started && end <= nodeEnd) {
      range.setEnd(node, end - nodeStart)
      break
    }
  }
  return range
}

/**
 * 모듈의 그려진 DOM 에서 카드의 구절이 있는 자리를 찾는다.
 *
 * 같은 구절이 여러 번 나올 수 있어 카드의 앞뒤 글(before/after)과 맞는 자리를 먼저 찾고,
 * 못 찾으면(템플릿이 글을 다르게 잘라 그린 경우) 앞뒤 없이 첫 자리를 쓴다 — 아무 표시도 없는 것보다 낫다.
 */
export function findSuggestionRange(root: HTMLElement, suggestion: ProofreadSuggestion): Range | null {
  const { original } = suggestion
  const before = strip(suggestion.before)
  const after = strip(suggestion.after)
  let fallback: Range | null = null

  for (const block of blockElements(root)) {
    const nodes = textNodesIn(block)
    if (!nodes.length) continue
    const joined = nodes.map((node) => asPlain(node.data)).join('')
    let from = 0
    for (;;) {
      const start = indexOfPhrase(joined, original, from)
      if (start === -1) break
      const end = start + original.length
      if (joined.slice(0, start).endsWith(before) && joined.slice(end).startsWith(after)) {
        return toRange(nodes, start, end)
      }
      fallback ??= toRange(nodes, start, end)
      from = start + 1
    }
  }
  return fallback
}

/** 모듈별 Range 를 합쳐 문서의 Highlight 둘(전체·활성)을 다시 만든다 */
function sync(): void {
  if (!isHighlightSupported()) return
  const all: Range[] = []
  const active: Range[] = []
  for (const entry of byModule.values()) {
    all.push(...entry.all)
    active.push(...entry.active)
  }
  if (all.length) CSS.highlights.set(HIGHLIGHT_ALL, new Highlight(...all))
  else CSS.highlights.delete(HIGHLIGHT_ALL)
  if (active.length) CSS.highlights.set(HIGHLIGHT_ACTIVE, new Highlight(...active))
  else CSS.highlights.delete(HIGHLIGHT_ACTIVE)
}

/**
 * 모듈 하나의 표시를 갱신한다 — 모듈이 그려질 때마다, 카드 목록·선택이 바뀔 때마다 부른다.
 * `root` 가 없으면(로딩 중·언마운트) 그 모듈 표시를 지운다.
 */
export function setModuleHighlights(
  moduleId: string,
  root: HTMLElement | null,
  suggestions: ProofreadSuggestion[],
  selectedId: string | null,
): void {
  if (!isHighlightSupported()) return
  if (!root || !suggestions.length) {
    clearModuleHighlights(moduleId)
    return
  }
  const entry: ModuleRanges = { all: [], active: [] }
  let scrollTo: Range | null = null
  for (const suggestion of suggestions) {
    const range = findSuggestionRange(root, suggestion)
    if (!range) continue
    const isActive = suggestion.id === selectedId
    ;(isActive ? entry.active : entry.all).push(range)
    if (isActive && suggestion.id === pendingScrollId) scrollTo = range
  }
  byModule.set(moduleId, entry)
  sync()

  if (scrollTo) {
    pendingScrollId = null
    // Range 자체는 scrollIntoView 가 없다 — 구절이 든 요소(문단)를 가운데로
    const el = scrollTo.startContainer.parentElement
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

export function clearModuleHighlights(moduleId: string): void {
  if (!byModule.delete(moduleId)) return
  sync()
}

/**
 * 카드를 눌렀을 때 — 그 구절이 표시되는 순간 거기로 스크롤해 달라고 적어 둔다.
 * (선택이 바뀌면 모듈이 표시를 다시 만들며 setModuleHighlights 가 처리한다)
 */
export function requestScrollToSuggestion(id: string): void {
  pendingScrollId = id
}
