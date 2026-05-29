import { describe, it, expect, beforeAll } from 'vitest'
import Quill from 'quill'
import { registerLineHeight, LINE_HEIGHT_OPTIONS } from '../quillLineHeight'

// vitest(happy-dom) 환경에서 행간(line-height) 블록 포맷 검증

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
  registerLineHeight()
})

describe('quillLineHeight', () => {
  it('배수 옵션 5개를 제공해야 함', () => {
    expect(LINE_HEIGHT_OPTIONS).toEqual(['1.0', '1.2', '1.5', '1.7', '2.0'])
  })

  it('lineHeight 포맷이 Quill 레지스트리에 등록되어야 함', () => {
    expect(Quill.import('formats/lineHeight')).toBeTruthy()
  })

  it('문단 단위로 line-height가 인라인 스타일로 적용됨', () => {
    const q = createEditor()
    q.setText('line one\nline two\n')
    q.formatLine(0, 1, 'lineHeight', '1.7')
    const html = q.getSemanticHTML()
    expect(html).toContain('line-height: 1.7')
    // 첫 문단만 적용 — 둘째 문단엔 line-height 없음
    const firstP = html.split('</p>')[0]
    expect(firstP).toContain('line-height: 1.7')
  })

  it('해당 문단에만 적용되고 다른 문단은 영향 없음', () => {
    const q = createEditor()
    q.setText('a\nb\n')
    q.formatLine(0, 1, 'lineHeight', '2.0')
    const html = q.getSemanticHTML()
    expect((html.match(/line-height/g) || []).length).toBe(1)
  })

  it('저장된 HTML 재로드 시 행간이 보존됨 (round-trip)', () => {
    const q = createEditor()
    q.setText('hello\n')
    q.formatLine(0, 1, 'lineHeight', '1.5')
    const saved = q.getSemanticHTML()

    const q2 = createEditor()
    q2.setContents(q2.clipboard.convert({ html: saved }))
    expect(q2.getSemanticHTML()).toContain('line-height: 1.5')
  })

  it('whitelist 외 값은 적용되지 않음', () => {
    const q = createEditor()
    q.setText('x\n')
    q.formatLine(0, 1, 'lineHeight', '3.3') // 허용 목록에 없음
    expect(q.getSemanticHTML()).not.toContain('line-height: 3.3')
  })
})
