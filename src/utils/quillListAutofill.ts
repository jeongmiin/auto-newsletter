/**
 * Quill '목록 자동 변환'에서 숫자 항목만 끈다.
 *
 * Quill 기본 바인딩(list autofill)은 줄 앞에서 `숫자.` + 스페이스를 치면 번호 목록으로
 * 바꾼다. 프리픽스가 `/^\s*?(\d+\.|-|\*|\[ ?\]|\[x\])$/`라서 `2023. `처럼 흔한 날짜 표기가
 * 그대로 목록이 되어버린다 — 뉴스레터 본문에서는 날짜가 목록보다 훨씬 자주 쓰인다.
 *
 * `-`/`*`/`[ ]`/`[x]`는 그대로 둔다(오타로 걸릴 일이 거의 없다).
 * 번호 목록이 필요하면 툴바의 '목록' 드롭다운으로 만들면 된다.
 */

import Quill from 'quill'

/** `\d+\.`만 뺀 프리픽스 — 나머지 트리거는 원본과 동일하게 유지한다 */
const PREFIX_WITHOUT_NUMBERS = /^\s*?(-|\*|\[ ?\]|\[x\])$/

type KeyboardBinding = { prefix?: RegExp }
type KeyboardModule = { DEFAULTS?: { bindings?: Record<string, KeyboardBinding | undefined> } }

let applied = false

/**
 * Quill 인스턴스(또는 PrimeVue Editor) 생성 **전에** 1회 호출해야 한다.
 * 기본 바인딩 정의를 고치는 방식이라, 이후 만들어지는 모든 에디터에 함께 적용된다.
 */
export const disableNumericListAutofill = (): void => {
  if (applied) return

  const Keyboard = Quill.import('modules/keyboard') as unknown as KeyboardModule
  const binding = Keyboard?.DEFAULTS?.bindings?.['list autofill']
  // Quill 내부 구조가 바뀌면 조용히 넘어간다 — 자동 변환이 남을 뿐 에디터는 정상 동작한다
  if (!binding) return

  binding.prefix = PREFIX_WITHOUT_NUMBERS
  applied = true
}
