/**
 * Quill 글자 크기(font-size) 커스텀 인라인 스타일 attributor
 * - 형광펜처럼 드래그로 선택한 텍스트 범위에만 부분 적용 (INLINE 스코프)
 * - <span style="font-size:NNpx">로 감싸 출력 → 이메일 클라이언트 호환
 * - 에디터 툴바 드롭다운(ql-fontSize, "제목 크기")과 연동
 */

import Quill from 'quill'

/** 폰트 크기 슬라이더 범위(px) — 속성 패널의 '폰트 크기' 컨트롤이 만드는 값 (Figma 640-3689) */
export const FONT_SIZE_MIN = 8
export const FONT_SIZE_MAX = 48

/** 숫자 → 저장 값('20px') */
export const toFontSizeValue = (n: number): string => `${Math.round(n)}px`

/** 저장 값('20px') → 숫자. 파싱 실패 시 null */
export const parseFontSize = (value: unknown): number | null => {
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
 * 글자 크기 인라인 StyleAttributor를 Quill 전역 레지스트리에 등록한다.
 * Quill 인스턴스(또는 PrimeVue Editor) 생성 전에 1회 호출해야 한다.
 */
export const registerFontSize = (): void => {
  if (registered) return
  const Parchment = Quill.import('parchment') as unknown as ParchmentLike

  // whitelist 없음 — 슬라이더가 8~48px를 1px 단위로 만들어내고, 예전 저장 값('22px' 등)도 그대로 유효하다.
  const FontSizeStyle = new Parchment.StyleAttributor('fontSize', 'font-size', {
    scope: Parchment.Scope.INLINE,
  })

  Quill.register('formats/fontSize', FontSizeStyle as never, true)
  registered = true
}
