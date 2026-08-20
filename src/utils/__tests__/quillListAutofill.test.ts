/**
 * 목록 자동 변환(숫자) 비활성화 검사.
 *
 * Quill 기본 바인딩의 내부 구조(modules/keyboard → DEFAULTS.bindings)에 기대는 코드라,
 * Quill을 올렸을 때 조용히 무력화되면 `2023. `이 다시 목록으로 바뀐다. 그걸 잡는 가드다.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import Quill from 'quill'
import { disableNumericListAutofill } from '@/utils/quillListAutofill'

type KeyboardModule = {
  DEFAULTS: { bindings: Record<string, { prefix?: RegExp } | undefined> }
}

const keyboard = () => Quill.import('modules/keyboard') as unknown as KeyboardModule
const autofillPrefix = (): RegExp | undefined =>
  keyboard().DEFAULTS.bindings['list autofill']?.prefix

describe('Quill 목록 자동 변환', () => {
  it('패치 전에는 숫자+마침표가 목록으로 변환된다 (Quill 기본 동작)', () => {
    // 이 기대가 깨졌다면 Quill이 기본값을 바꾼 것 — 패치 자체가 필요 없어졌는지 확인해야 한다
    expect(autofillPrefix()?.test('2023.')).toBe(true)
  })

  describe('패치 후', () => {
    beforeAll(() => {
      disableNumericListAutofill()
    })

    it('바인딩을 찾아 실제로 고쳤다 (구조 변경 시 조용히 넘어가는 것을 잡는다)', () => {
      expect(autofillPrefix(), 'list autofill 바인딩을 찾지 못했다').toBeDefined()
      expect(autofillPrefix()!.source).not.toContain('\\d+')
    })

    it.each(['2023.', '2023. ', '1.', '12.'])('"%s"는 입력한 그대로 남는다', (input) => {
      expect(autofillPrefix()!.test(input)).toBe(false)
    })

    it.each(['-', '*', '[ ]', '[x]'])('"%s"는 기존대로 목록으로 변환된다', (input) => {
      expect(autofillPrefix()!.test(input)).toBe(true)
    })
  })
})
