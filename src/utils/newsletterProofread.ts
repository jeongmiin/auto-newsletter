import type { ModuleInstance } from '@/types'
import { sanitizeHtml } from '@/utils/sanitize'
import {
  blockElements,
  parseBody,
  resolveParent,
  textNodesIn,
  type TranslationUnit,
} from '@/utils/newsletterTranslation'

/**
 * 맞춤법 검사 — 뉴스레터의 글을 검사기에 보내고, 돌아온 '고칠 곳'을 제자리에 되돌려 넣는다.
 *
 * 글을 모으는 일은 번역과 같아 `collectTranslationUnits`를 그대로 쓴다(편집 필드 하나 = 값 하나).
 * 다른 점은 둘이다.
 * - 번역은 값 전체를 바꾸지만, 여기서는 값 안의 **구절 하나**만 바꾼다. 그래서 굵게·색상·링크
 *   같은 서식을 건드리지 않고 글자만 갈아 끼울 수 있다.
 * - 검사기에는 태그 없는 평문만 보낸다 — 서식을 돌려받을 필요가 없어 보내는 양이 훨씬 적다.
 */

/** 검사기에 보내는 한 줄 */
export interface ProofreadItem {
  id: string
  text: string
}

/** 검사기가 돌려주는 고칠 곳 — `original`은 그 항목의 글 안에 글자 그대로 있는 구절이다 */
export interface ProofreadCorrection {
  id: string
  original: string
  corrected: string
  reason: string
}

/** 화면의 카드 한 장 — 고칠 곳 하나 */
export interface ProofreadSuggestion {
  id: string
  unit: TranslationUnit
  original: string
  corrected: string
  reason: string
  /** 고칠 구절의 앞뒤 글 — 어느 문장인지 알아보게 같은 줄에서 잘라 온다 */
  before: string
  after: string
  /** 적용할지 — 사람이 카드마다 끌 수 있다 */
  accepted: boolean
}

/** 카드에 보여 줄 앞뒤 글의 길이 */
const CONTEXT_CHARS = 24

/**
 * 보낼 목록을 만든다. **같은 글은 한 번만** 보낸다 —
 * '이미지'·'자세히 보기 →'처럼 되풀이되는 값이 많아 그대로 보내면 보내는 양만 는다.
 * 돌아온 결과는 같은 글을 가진 값 모두에 적용해야 하므로 짝도 함께 돌려준다.
 */
export function buildProofreadItems(units: TranslationUnit[]): {
  items: ProofreadItem[]
  unitsByItemId: Map<string, TranslationUnit[]>
} {
  const itemIdByText = new Map<string, string>()
  const unitsByItemId = new Map<string, TranslationUnit[]>()
  const items: ProofreadItem[] = []
  for (const unit of units) {
    let itemId = itemIdByText.get(unit.source)
    if (itemId === undefined) {
      itemId = String(items.length)
      itemIdByText.set(unit.source, itemId)
      unitsByItemId.set(itemId, [])
      items.push({ id: itemId, text: unit.source })
    }
    unitsByItemId.get(itemId)!.push(unit)
  }
  return { items, unitsByItemId }
}

/**
 * 검사 결과를 카드 목록으로 옮긴다.
 *
 * 구절이 **한 줄(문단) 안에** 있는 것만 받는다. 문단을 넘나드는 구절은 서식을 지키며
 * 갈아 끼울 수 없고, 검사기가 줄바꿈을 고치려 든 것이기도 하다(고치지 말라고 한 것).
 */
export function toSuggestions(
  corrections: ProofreadCorrection[],
  unitsByItemId: Map<string, TranslationUnit[]>,
): ProofreadSuggestion[] {
  const suggestions: ProofreadSuggestion[] = []
  for (const correction of corrections) {
    const { original, corrected } = correction
    if (!original || original === corrected) continue
    for (const unit of unitsByItemId.get(correction.id) ?? []) {
      const line = unit.source.split('\n').find((text) => text.includes(original))
      if (line === undefined) continue
      const at = line.indexOf(original)
      const head = line.slice(0, at)
      const tail = line.slice(at + original.length)
      suggestions.push({
        id: `${unit.id}#${suggestions.length}`,
        unit,
        original,
        corrected,
        reason: correction.reason,
        before: head.length > CONTEXT_CHARS ? `…${head.slice(-CONTEXT_CHARS)}` : head,
        after: tail.length > CONTEXT_CHARS ? `${tail.slice(0, CONTEXT_CHARS)}…` : tail,
        accepted: true,
      })
    }
  }
  return suggestions
}

/** 평문과 같은 눈으로 글자를 본다 — 수집할 때 nbsp를 공백으로 바꿔 보냈다 */
const asPlain = (text: string): string => text.replace(/ /g, ' ')

/**
 * 블록(문단) 하나에서 구절을 찾아 바꾼다. 바꾼 횟수를 돌려준다.
 *
 * 구절이 `<strong>` 같은 태그 경계를 걸쳐 있어도 된다 — 글자 조각(텍스트 노드)을 이어 붙인
 * 글에서 자리를 찾고, 고친 글은 구절이 시작하는 조각에 넣은 뒤 나머지 조각에서는 그 부분만 덜어낸다.
 * 태그는 그대로 두므로 서식이 남는다.
 */
function replaceInBlock(block: HTMLElement, original: string, corrected: string): number {
  let count = 0
  let from = 0
  for (;;) {
    const nodes = textNodesIn(block)
    const joined = nodes.map((node) => asPlain(node.data)).join('')
    const start = joined.indexOf(original, from)
    if (start === -1) return count
    const end = start + original.length

    let offset = 0
    let placed = false
    for (const node of nodes) {
      const nodeStart = offset
      const nodeEnd = offset + node.data.length
      offset = nodeEnd
      if (nodeEnd <= start || nodeStart >= end) continue
      const cutFrom = Math.max(start, nodeStart) - nodeStart
      const cutTo = Math.min(end, nodeEnd) - nodeStart
      node.data = `${node.data.slice(0, cutFrom)}${placed ? '' : corrected}${node.data.slice(cutTo)}`
      placed = true
    }
    count += 1
    // 고친 글 뒤부터 다시 찾는다 — 고친 글 안에 원래 구절이 들어 있어도 맴돌지 않는다
    from = start + corrected.length
  }
}

/**
 * 고르기로 한 수정안을 모듈 복사본에 적용한다.
 *
 * 검사한 뒤에 글이 바뀌었으면 구절을 못 찾을 수 있다 — 그런 건 건너뛰고, 실제로 바꾼
 * 카드 수(`applied`)를 함께 돌려준다.
 */
export function applyProofreadSuggestions(
  modules: ModuleInstance[],
  suggestions: ProofreadSuggestion[],
): { modules: ModuleInstance[]; applied: number } {
  const cloned = JSON.parse(JSON.stringify(modules)) as ModuleInstance[]
  const byId = new Map(cloned.map((module) => [module.id, module]))
  let applied = 0

  for (const { unit, original, corrected } of suggestions) {
    const module = byId.get(unit.moduleInstanceId)
    if (!module) continue
    const parent = resolveParent(module, unit.path)
    const key = unit.path[unit.path.length - 1]
    if (!parent || key === undefined) continue
    const current = parent[key]
    if (typeof current !== 'string') continue

    if (!unit.originalHtml) {
      if (!current.includes(original)) continue
      parent[key] = current.split(original).join(corrected)
      applied += 1
      continue
    }

    const body = parseBody(current)
    const replaced = blockElements(body).reduce(
      (sum, block) => sum + replaceInBlock(block, original, corrected),
      0,
    )
    if (!replaced) continue
    parent[key] = sanitizeHtml(body.innerHTML)
    applied += 1
  }

  return { modules: cloned, applied }
}
