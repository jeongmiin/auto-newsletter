import { describe, it, expect, beforeAll } from 'vitest'
import Quill from 'quill'
import { registerHighlightMarker, HIGHLIGHT_COLORS } from '../quillHighlightMarker'

// vitest 환경(happy-dom)에서 Quill 동작 검증
// - 형광펜 적용 결과 HTML
// - 기존 background 포맷 회귀 없음
// - 저장 후 재로드(round-trip) 보존

const createEditor = () => {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return new Quill(el)
}

beforeAll(() => {
  // Quill 일부 경로가 execCommand를 호출할 수 있어 happy-dom에 stub 보강
  if (typeof document.execCommand !== 'function') {
    // @ts-expect-error happy-dom 환경 보강
    document.execCommand = () => false
  }
  registerHighlightMarker()
})

describe('quillHighlightMarker', () => {
  it('형광펜 색상 팔레트가 6색을 제공해야 함', () => {
    expect(HIGHLIGHT_COLORS.length).toBe(6)
    expect(HIGHLIGHT_COLORS[0]).toBe('#fff555')
  })

  it('highlightMarker 포맷이 Quill 레지스트리에 등록되어야 함', () => {
    expect(Quill.import('formats/highlightMarker')).toBeTruthy()
  })

  it('형광펜 적용 시 반투명 그라디언트 span을 생성해야 함', () => {
    const q = createEditor()
    q.setText('hello world\n')
    q.formatText(6, 5, 'highlightMarker', '#fff555')
    const html = q.getSemanticHTML()
    expect(html).toContain('linear-gradient(transparent 50%, #fff555 50%)')
    expect(html).toContain('data-highlight-color="#fff555"')
    expect(html).toContain('world')
  })

  it('기존 background 포맷이 회귀 없이 동작해야 함', () => {
    const q = createEditor()
    q.setText('hello world\n')
    q.formatText(0, 5, 'background', '#ff0000')
    const html = q.getSemanticHTML()
    expect(html).toContain('background-color: #ff0000')
    expect(html).toContain('hello')
  })

  it('background와 highlightMarker가 공존할 수 있어야 함', () => {
    const q = createEditor()
    q.setText('hello world\n')
    q.formatText(0, 5, 'background', '#ff0000')
    q.formatText(6, 5, 'highlightMarker', '#cce4ff')
    const html = q.getSemanticHTML()
    expect(html).toContain('background-color: #ff0000')
    expect(html).toContain('linear-gradient(transparent 50%, #cce4ff 50%)')
  })

  it('저장된 HTML을 재로드해도 형광펜이 보존되어야 함 (round-trip)', () => {
    const q = createEditor()
    q.setText('hello world\n')
    q.formatText(6, 5, 'highlightMarker', '#fff555')
    const saved = q.getSemanticHTML()

    const q2 = createEditor()
    q2.setContents(q2.clipboard.convert({ html: saved }))
    const reloaded = q2.getSemanticHTML()

    expect(reloaded).toContain('linear-gradient(transparent 50%, #fff555 50%)')
    expect(reloaded).toContain('data-highlight-color="#fff555"')
  })

  it('형광펜 해제(false) 시 그라디언트가 사라져야 함', () => {
    const q = createEditor()
    q.setText('hello world\n')
    q.formatText(6, 5, 'highlightMarker', '#fff555')
    expect(q.getSemanticHTML()).toContain('linear-gradient')
    q.formatText(6, 5, 'highlightMarker', false)
    expect(q.getSemanticHTML()).not.toContain('linear-gradient')
  })
})
