/**
 * Quill 행간(line-height) 블록 포맷
 * - 문단(<p>) 단위로 line-height를 배수로 지정 (인라인 스타일 → 이메일 호환)
 * - 에디터 툴바 드롭다운(ql-lineHeight)과 연동
 */

import Quill from 'quill'

/** 행간 배수 옵션 (드롭다운 값) */
export const LINE_HEIGHT_OPTIONS = ['1.0', '1.2', '1.5', '1.7', '2.0']

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

  const LineHeightStyle = new Parchment.StyleAttributor('lineHeight', 'line-height', {
    scope: Parchment.Scope.BLOCK,
    whitelist: LINE_HEIGHT_OPTIONS,
  })

  Quill.register('formats/lineHeight', LineHeightStyle, true)
  registered = true
}
