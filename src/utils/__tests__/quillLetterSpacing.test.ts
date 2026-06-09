import { describe, it, expect, beforeAll } from 'vitest'
import Quill from 'quill'
import { registerLetterSpacing, LETTER_SPACING_OPTIONS } from '../quillLetterSpacing'

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
  it('자간 옵션 목록을 제공해야 함 (-1px이 최소)', () => {
    expect(LETTER_SPACING_OPTIONS).toEqual(['-1px', '-0.7px', '-0.5px', '-0.3px'])
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

  it('whitelist 외 값은 적용되지 않음', () => {
    const q = createEditor()
    q.setText('x\n')
    q.formatText(0, 1, 'letterSpacing', '-2px') // 허용 목록에 없음
    expect(q.getSemanticHTML()).not.toContain('letter-spacing: -2px')
  })
})
