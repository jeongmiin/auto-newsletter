/**
 * Quill 자간(letter-spacing) 커스텀 인라인 스타일 attributor
 * - 형광펜처럼 드래그로 선택한 텍스트 범위에만 부분 적용 (INLINE 스코프)
 * - <span style="letter-spacing:Npx">로 감싸 출력 → 이메일 클라이언트 호환
 * - 에디터 툴바 드롭다운(ql-letterSpacing, "자간")과 연동
 */

import Quill from 'quill'

/** 자간 슬라이더 범위(px) (Figma 640-3517 — 드롭다운 고정 목록 → 슬라이더 연속값) */
export const LETTER_SPACING_MIN = -2
export const LETTER_SPACING_MAX = 5
export const LETTER_SPACING_STEP = 0.1
/** 값이 지정되지 않았을 때 슬라이더가 서는 위치 (실제 적용은 사용자가 움직였을 때만) */
export const LETTER_SPACING_FALLBACK = 0

/** 숫자 → 저장 값('-0.5px'). 불필요한 소수점은 떼어낸다. */
export const toLetterSpacingValue = (n: number): string => `${Number(n.toFixed(1))}px`

/** 저장 값('-0.5px') → 숫자(px). 파싱 실패 시 null. */
export const parseLetterSpacing = (value: unknown): number | null => {
  const n = Number.parseFloat(String(value ?? ''))
  return Number.isFinite(n) ? n : null
}

type ParchmentLike = {
  StyleAttributor: new (
    attrName: string,
    keyName: string,
    options?: { scope?: number; whitelist?: string[] },
  ) => unknown
  Scope: { INLINE: number }
}

let registered = false

/**
 * 자간 인라인 StyleAttributor를 Quill 전역 레지스트리에 등록한다.
 * Quill 인스턴스(또는 PrimeVue Editor) 생성 전에 1회 호출해야 한다.
 */
export const registerLetterSpacing = (): void => {
  if (registered) return
  const Parchment = Quill.import('parchment') as unknown as ParchmentLike

  // whitelist 없음 — 슬라이더가 -2~5px를 0.1 단위로 만들어내고, 예전 값('-1px' 등)도 그대로 유효하다.
  const LetterSpacingStyle = new Parchment.StyleAttributor('letterSpacing', 'letter-spacing', {
    scope: Parchment.Scope.INLINE,
  })

  Quill.register('formats/letterSpacing', LetterSpacingStyle as never, true)
  registered = true
}
