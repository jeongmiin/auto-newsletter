import { describe, it, expect, beforeAll } from 'vitest'
import Quill from 'quill'
import { registerFontSize, FONT_SIZE_OPTIONS } from '../quillFontSize'

// vitest(happy-dom) 환경에서 글자 크기(font-size) 인라인 포맷 검증

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
  registerFontSize()
})

describe('quillFontSize', () => {
  it('글자 크기 옵션 목록을 제공해야 함', () => {
    expect(FONT_SIZE_OPTIONS).toEqual(['28px', '26px', '24px', '22px', '20px', '18px', '16px', '14px', '12px'])
  })

  it('fontSize 포맷이 Quill 레지스트리에 등록되어야 함', () => {
    expect(Quill.import('formats/fontSize')).toBeTruthy()
  })

  it('드래그 선택 범위에만 인라인 font-size가 적용됨', () => {
    const q = createEditor()
    q.setText('hello world\n')
    q.formatText(0, 5, 'fontSize', '28px') // 'hello'만 선택
    const html = q.getSemanticHTML()
    expect(html).toContain('font-size: 28px')
    expect(html).toContain('hello')
    // 선택하지 않은 'world'는 영향 없음 — font-size span은 하나만
    expect((html.match(/font-size: 28px/g) || []).length).toBe(1)
  })

  it('저장된 HTML 재로드 시 글자 크기가 보존됨 (round-trip)', () => {
    const q = createEditor()
    q.setText('hi there\n')
    q.formatText(0, 2, 'fontSize', '22px')
    const saved = q.getSemanticHTML()

    const q2 = createEditor()
    q2.setContents(q2.clipboard.convert({ html: saved }))
    expect(q2.getSemanticHTML()).toContain('font-size: 22px')
  })

  it('whitelist 외 값은 적용되지 않음', () => {
    const q = createEditor()
    q.setText('x\n')
    q.formatText(0, 1, 'fontSize', '99px') // 허용 목록에 없음
    expect(q.getSemanticHTML()).not.toContain('font-size: 99px')
  })
})
