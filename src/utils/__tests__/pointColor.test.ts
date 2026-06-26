import { describe, it, expect } from 'vitest'
import { resolvePointColors, resolvePointColorVar, POINT_COLOR_SUFFIX } from '../pointColor'

describe('resolvePointColors', () => {
  const POINT = '#2563eb'

  it("플래그가 켜진 색상 키를 포인트 색상으로 덮어쓴다", () => {
    const props = {
      headerTextColor: '#111111',
      [`headerTextColor${POINT_COLOR_SUFFIX}`]: true,
    }
    const result = resolvePointColors(props, POINT)
    expect(result.headerTextColor).toBe(POINT)
  })

  it('플래그가 꺼져 있으면 수동 색상을 그대로 유지한다', () => {
    const props = {
      headerTextColor: '#111111',
      [`headerTextColor${POINT_COLOR_SUFFIX}`]: false,
    }
    const result = resolvePointColors(props, POINT)
    expect(result.headerTextColor).toBe('#111111')
  })

  it('원본 properties는 변경하지 않는다 (수동 색상 보존 → 해제 시 원복 가능)', () => {
    const props = {
      headerTextColor: '#111111',
      [`headerTextColor${POINT_COLOR_SUFFIX}`]: true,
    }
    resolvePointColors(props, POINT)
    expect(props.headerTextColor).toBe('#111111')
  })

  it('pointColor가 비어 있으면 원본을 그대로 반환한다', () => {
    const props = {
      headerTextColor: '#111111',
      [`headerTextColor${POINT_COLOR_SUFFIX}`]: true,
    }
    expect(resolvePointColors(props, '')).toBe(props)
    expect(resolvePointColors(props, null)).toBe(props)
  })

  it('여러 색상 키를 동시에 해소한다', () => {
    const props = {
      textColor: '#000000',
      [`textColor${POINT_COLOR_SUFFIX}`]: true,
      borderColor: '#dddddd',
      [`borderColor${POINT_COLOR_SUFFIX}`]: true,
      bgColor: '#ffffff',
    }
    const result = resolvePointColors(props, POINT)
    expect(result.textColor).toBe(POINT)
    expect(result.borderColor).toBe(POINT)
    expect(result.bgColor).toBe('#ffffff') // 플래그 없음 → 유지
  })
})

describe('resolvePointColorVar', () => {
  const POINT = '#2563eb'

  it('var(--point-color, #fallback) 토큰을 실제 포인트 색상으로 치환한다', () => {
    const html = '<span style="color: var(--point-color, #999999)">강조</span>'
    expect(resolvePointColorVar(html, POINT)).toBe(
      '<span style="color: #2563eb">강조</span>',
    )
  })

  it('fallback 없는 var(--point-color) 도 치환한다', () => {
    const html = '<span style="background-color: var(--point-color)">A</span>'
    expect(resolvePointColorVar(html, POINT)).toBe(
      '<span style="background-color: #2563eb">A</span>',
    )
  })

  it('한 문서 안의 여러 토큰을 모두 치환한다', () => {
    const html =
      '<b style="color:var(--point-color)">x</b><i style="color: var(--point-color, #111)">y</i>'
    expect(resolvePointColorVar(html, POINT)).toBe(
      '<b style="color:#2563eb">x</b><i style="color: #2563eb">y</i>',
    )
  })

  it('pointColor가 비어 있으면 기본 포인트 색상(#2563eb)으로 치환한다', () => {
    const html = '<span style="color: var(--point-color)">z</span>'
    expect(resolvePointColorVar(html, '')).toBe('<span style="color: #2563eb">z</span>')
    expect(resolvePointColorVar(html, null)).toBe('<span style="color: #2563eb">z</span>')
  })

  it('포인트 변수가 없는 HTML은 그대로 둔다', () => {
    const html = '<span style="color: #abcdef">no point</span>'
    expect(resolvePointColorVar(html, POINT)).toBe(html)
  })

  it('빈 입력은 빈 문자열을 반환한다', () => {
    expect(resolvePointColorVar('', POINT)).toBe('')
  })
})
