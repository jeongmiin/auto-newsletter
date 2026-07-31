import { describe, it, expect, beforeAll } from 'vitest'
import Quill from 'quill'
import {
  registerFontSize,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
  toFontSizeValue,
  parseFontSize,
} from '../quillFontSize'

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
  it('슬라이더 범위(8~48px)를 제공해야 함', () => {
    expect([FONT_SIZE_MIN, FONT_SIZE_MAX]).toEqual([8, 48])
  })

  it('숫자 ↔ 저장 값 변환', () => {
    expect(toFontSizeValue(20)).toBe('20px')
    expect(toFontSizeValue(17.6)).toBe('18px')
    expect(parseFontSize('22px')).toBe(22)
    expect(parseFontSize('')).toBeNull()
    expect(parseFontSize(undefined)).toBeNull()
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

  it('슬라이더가 만드는 임의 값도 그대로 적용됨 (whitelist 없음)', () => {
    const q = createEditor()
    q.setText('x\n')
    q.formatText(0, 1, 'fontSize', toFontSizeValue(17))
    expect(q.getSemanticHTML()).toContain('font-size: 17px')
  })

  it('인라인 크기를 지우면 모듈 기본값을 따르게 됨 (개별 크기 되돌리기)', () => {
    const q = createEditor()
    q.setText('hello\n')
    q.formatText(0, 5, 'fontSize', '28px')
    expect(q.getSemanticHTML()).toContain('font-size: 28px')
    q.formatText(0, 5, 'fontSize', false)
    expect(q.getSemanticHTML()).not.toContain('font-size')
  })
})
