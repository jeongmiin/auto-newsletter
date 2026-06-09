/**
 * Quill 자간(letter-spacing) 커스텀 인라인 스타일 attributor
 * - 형광펜처럼 드래그로 선택한 텍스트 범위에만 부분 적용 (INLINE 스코프)
 * - <span style="letter-spacing:Npx">로 감싸 출력 → 이메일 클라이언트 호환
 * - 에디터 툴바 드롭다운(ql-letterSpacing, "자간")과 연동
 */

import Quill from 'quill'

/** 선택 가능한 자간 값 (툴바 드롭다운과 동일 순서, -1px이 최소) */
export const LETTER_SPACING_OPTIONS = ['-1px', '-0.7px', '-0.5px', '-0.3px'] as const

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

  const LetterSpacingStyle = new Parchment.StyleAttributor('letterSpacing', 'letter-spacing', {
    scope: Parchment.Scope.INLINE,
    whitelist: [...LETTER_SPACING_OPTIONS],
  })

  Quill.register('formats/letterSpacing', LetterSpacingStyle as never, true)
  registered = true
}
