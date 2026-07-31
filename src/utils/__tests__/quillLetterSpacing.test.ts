import { describe, it, expect, beforeAll } from 'vitest'
import Quill from 'quill'
import {
  registerLetterSpacing,
  LETTER_SPACING_MIN,
  LETTER_SPACING_MAX,
  LETTER_SPACING_STEP,
  toLetterSpacingValue,
  parseLetterSpacing,
} from '../quillLetterSpacing'

// vitest(happy-dom) 환경에서 자간(letter-spacing) 인라인 포맷 검증

const createEditor = () => {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return new Quill(el)
}

beforeAll(() => {
  if (typeof document.execCommand !== 'function') {
    // @ts-expect-error happy-dom 환경 보강
    document.execCommand = () => false
  }
  registerLetterSpacing()
})

describe('quillLetterSpacing', () => {
  it('슬라이더 범위(-2~5px, 0.1 단위)를 제공해야 함', () => {
    expect([LETTER_SPACING_MIN, LETTER_SPACING_MAX, LETTER_SPACING_STEP]).toEqual([-2, 5, 0.1])
  })

  it('숫자 ↔ 저장 값 변환 (불필요한 소수점 제거)', () => {
    expect(toLetterSpacingValue(-0.5)).toBe('-0.5px')
    expect(toLetterSpacingValue(0)).toBe('0px')
    expect(toLetterSpacingValue(2)).toBe('2px')
    expect(parseLetterSpacing('-0.5px')).toBe(-0.5)
    expect(parseLetterSpacing('')).toBeNull()
    expect(parseLetterSpacing(undefined)).toBeNull()
  })

  it('letterSpacing 포맷이 Quill 레지스트리에 등록되어야 함', () => {
    expect(Quill.import('formats/letterSpacing')).toBeTruthy()
  })

  it('드래그 선택 범위에만 인라인 letter-spacing이 적용됨', () => {
    const q = createEditor()
    q.setText('hello world\n')
    q.formatText(0, 5, 'letterSpacing', '-1px') // 'hello'만 선택
    const html = q.getSemanticHTML()
    expect(html).toContain('letter-spacing: -1px')
    expect(html).toContain('hello')
    expect((html.match(/letter-spacing: -1px/g) || []).length).toBe(1)
  })

  it('저장된 HTML 재로드 시 자간이 보존됨 (round-trip)', () => {
    const q = createEditor()
    q.setText('hi there\n')
    q.formatText(0, 2, 'letterSpacing', '-0.5px')
    const saved = q.getSemanticHTML()

    const q2 = createEditor()
    q2.setContents(q2.clipboard.convert({ html: saved }))
    expect(q2.getSemanticHTML()).toContain('letter-spacing: -0.5px')
  })

  it('슬라이더가 만드는 임의 값(양수·0 포함)도 그대로 적용됨 (whitelist 없음)', () => {
    const q = createEditor()
    q.setText('hello\n')
    q.formatText(0, 5, 'letterSpacing', toLetterSpacingValue(1.5))
    expect(q.getSemanticHTML()).toContain('letter-spacing: 1.5px')
  })

  it('예전에 저장된 고정 옵션 값도 계속 유효함 (하위호환)', () => {
    const q = createEditor()
    q.setText('hello\n')
    q.formatText(0, 5, 'letterSpacing', '-0.3px')
    expect(q.getSemanticHTML()).toContain('letter-spacing: -0.3px')
  })
})
