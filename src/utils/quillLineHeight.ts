/**
 * Quill 행간(line-height) 블록 포맷
 * - 문단(<p>) 단위로 line-height를 배수로 지정 (인라인 스타일 → 이메일 호환)
 * - 에디터 툴바 드롭다운(ql-lineHeight)과 연동
 */

import Quill from 'quill'

/** 행간 슬라이더 범위 (Figma 640-3517 — 드롭다운 고정 목록 → 슬라이더 연속값) */
export const LINE_HEIGHT_MIN = 1.0
export const LINE_HEIGHT_MAX = 3.0
export const LINE_HEIGHT_STEP = 0.1
/** 값이 지정되지 않았을 때 슬라이더가 서는 위치 (실제 적용은 사용자가 움직였을 때만) */
export const LINE_HEIGHT_FALLBACK = 1.5

/** 숫자 → 저장 값('1.4'). 소수 한 자리로 통일한다. */
export const toLineHeightValue = (n: number): string => n.toFixed(1)

/** 저장 값('1.4') → 숫자. 파싱 실패 시 null. */
export const parseLineHeight = (value: unknown): number | null => {
  const n = Number.parseFloat(String(value ?? ''))
  return Number.isFinite(n) ? n : null
}

type ParchmentLike = {
  StyleAttributor: new (
    attrName: string,
    keyName: string,
    options?: { scope?: number; whitelist?: string[] },
  ) => unknown
  Scope: { BLOCK: number }
}

let registered = false

/**
 * 행간 StyleAttributor를 Quill 전역 레지스트리에 등록한다.
 * Quill 인스턴스(또는 PrimeVue Editor) 생성 전에 1회 호출해야 한다.
 */
export const registerLineHeight = (): void => {
  if (registered) return
  const Parchment = Quill.import('parchment') as unknown as ParchmentLike

  // whitelist를 두지 않는다 — 슬라이더가 1.0~3.0을 0.1 단위로 만들어내고,
  // 예전에 저장된 값('1.0'/'1.2'/'1.5'/'1.7'/'2.0')도 그대로 유효하다.
  const LineHeightStyle = new Parchment.StyleAttributor('lineHeight', 'line-height', {
    scope: Parchment.Scope.BLOCK,
  })

  Quill.register('formats/lineHeight', LineHeightStyle, true)
  registered = true
}
