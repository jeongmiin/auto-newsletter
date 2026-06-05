/**
 * Quill word-break(줄바꿈 규칙) 커스텀 블록 스타일 attributor
 * - 문단(block) 단위로 <p>/<h> 요소에 인라인 word-break 스타일을 부여
 *   (정렬 버튼과 동일하게 커서가 위치한 문단 전체에 적용)
 * - 출력 HTML에 인라인 스타일이 그대로 보존되어 이메일 클라이언트 호환성을 유지
 *   (quillHtmlProcessor가 word-break가 이미 있으면 강제 break-all을 덮어쓰지 않음)
 */

import Quill from 'quill'

/** 선택 가능한 word-break 값 */
export const WORD_BREAK_OPTIONS = ['keep-all', 'break-all'] as const

type StyleAttributorConstructor = new (
  attrName: string,
  keyName: string,
  options?: { scope?: number; whitelist?: string[] },
) => unknown

interface ParchmentLike {
  StyleAttributor: StyleAttributorConstructor
  Scope: { BLOCK: number; [key: string]: number }
}

let registered = false

/**
 * word-break 블록 스타일 attributor를 Quill 전역 레지스트리에 등록한다.
 * Quill 인스턴스 생성 전에 1회 호출해야 한다.
 */
export const registerWordBreak = (): void => {
  if (registered) return
  const Parchment = Quill.import('parchment') as unknown as ParchmentLike

  const WordBreakStyle = new Parchment.StyleAttributor('wordBreak', 'word-break', {
    scope: Parchment.Scope.BLOCK,
    whitelist: [...WORD_BREAK_OPTIONS],
  })

  Quill.register('formats/wordBreak', WordBreakStyle as never, true)
  registered = true
}
