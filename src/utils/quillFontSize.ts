/**
 * Quill 글자 크기(font-size) 커스텀 인라인 스타일 attributor
 * - 형광펜처럼 드래그로 선택한 텍스트 범위에만 부분 적용 (INLINE 스코프)
 * - <span style="font-size:NNpx">로 감싸 출력 → 이메일 클라이언트 호환
 * - 에디터 툴바 드롭다운(ql-fontSize, "제목 크기")과 연동
 */

import Quill from 'quill'

/** 선택 가능한 글자 크기 값 (툴바 드롭다운과 동일 순서) */
export const FONT_SIZE_OPTIONS = ['28px', '26px', '24px', '22px', '20px', '18px', '16px'] as const

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
 * 글자 크기 인라인 StyleAttributor를 Quill 전역 레지스트리에 등록한다.
 * Quill 인스턴스(또는 PrimeVue Editor) 생성 전에 1회 호출해야 한다.
 */
export const registerFontSize = (): void => {
  if (registered) return
  const Parchment = Quill.import('parchment') as unknown as ParchmentLike

  const FontSizeStyle = new Parchment.StyleAttributor('fontSize', 'font-size', {
    scope: Parchment.Scope.INLINE,
    whitelist: [...FONT_SIZE_OPTIONS],
  })

  Quill.register('formats/fontSize', FontSizeStyle as never, true)
  registered = true
}
