import { describe, it, expect, beforeAll } from 'vitest'
import Quill from 'quill'
import {
  registerLineHeight,
  LINE_HEIGHT_MIN,
  LINE_HEIGHT_MAX,
  LINE_HEIGHT_STEP,
  toLineHeightValue,
  parseLineHeight,
} from '../quillLineHeight'

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
  it('슬라이더 범위(1.0~3.0, 0.1 단위)를 제공해야 함', () => {
    expect([LINE_HEIGHT_MIN, LINE_HEIGHT_MAX, LINE_HEIGHT_STEP]).toEqual([1.0, 3.0, 0.1])
  })

  it('숫자 ↔ 저장 값 변환 (소수 한 자리)', () => {
    expect(toLineHeightValue(1.4)).toBe('1.4')
    expect(toLineHeightValue(2)).toBe('2.0')
    expect(parseLineHeight('1.7')).toBe(1.7)
    expect(parseLineHeight('')).toBeNull()
    expect(parseLineHeight(undefined)).toBeNull()
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

  it('슬라이더가 만드는 임의의 소수 값도 그대로 적용됨 (whitelist 없음)', () => {
    const q = createEditor()
    q.setText('x\n')
    q.formatLine(0, 1, 'lineHeight', toLineHeightValue(1.4))
    expect(q.getSemanticHTML()).toContain('line-height: 1.4')
  })

  it('예전에 저장된 고정 옵션 값도 계속 유효함 (하위호환)', () => {
    const q = createEditor()
    q.setText('x\n')
    q.formatLine(0, 1, 'lineHeight', '1.7')
    expect(q.getSemanticHTML()).toContain('line-height: 1.7')
  })
})
