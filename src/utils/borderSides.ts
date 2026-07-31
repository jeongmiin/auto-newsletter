/**
 * 모듈 속성의 '테두리 위치' 값(문자열) ↔ 변 배열 변환.
 *
 * 그룹 스타일은 `ModuleGroupStyles.borderSides`(배열)로 저장하지만, 모듈 속성은
 * `properties.borderPosition`(문자열) 하나만 쓸 수 있어 쉼표로 이어 붙여 저장한다.
 * 구버전 값('bottom' | 'top' | 'both')도 그대로 해석한다.
 */
import type { BorderSide } from '@/types'
import { ALL_BORDER_SIDES } from '@/utils/groupStyle'

/** 'top,bottom' · 'both'(=위·아래) · 'bottom' 등을 변 배열로 파싱 (출력 순서는 항상 상·우·하·좌) */
export function parseBorderSides(value: unknown): BorderSide[] {
  if (Array.isArray(value)) {
    return ALL_BORDER_SIDES.filter((side) => value.includes(side))
  }
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return []
  const tokens = raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  const set = new Set<BorderSide>()
  tokens.forEach((t) => {
    if (t === 'both') {
      // 구버전 '위·아래'
      set.add('top')
      set.add('bottom')
      return
    }
    if ((ALL_BORDER_SIDES as string[]).includes(t)) set.add(t as BorderSide)
  })
  return ALL_BORDER_SIDES.filter((side) => set.has(side))
}

/** 변 배열 → 저장 값('top,bottom'). 빈 배열이면 빈 문자열(테두리 없음) */
export function serializeBorderSides(sides: BorderSide[]): string {
  return ALL_BORDER_SIDES.filter((side) => sides.includes(side)).join(',')
}
