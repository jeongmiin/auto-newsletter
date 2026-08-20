import { describe, it, expect } from 'vitest'
import {
  resolvePointColors,
  resolvePointColorVar,
  resolvePointColorVars,
  POINT_COLOR_SUFFIX,
  POINT_COLOR_INDEX_SUFFIX,
} from '../pointColor'

describe('resolvePointColors', () => {
  const POINT = '#2563eb'

  it("플래그가 켜진 색상 키를 포인트 색상으로 덮어쓴다", () => {
    const props = {
      headerTextColor: '#111111',
      [`headerTextColor${POINT_COLOR_SUFFIX}`]: true,
    }
    const result = resolvePointColors(props, [POINT])
    expect(result.headerTextColor).toBe(POINT)
  })

  it('플래그가 꺼져 있으면 수동 색상을 그대로 유지한다', () => {
    const props = {
      headerTextColor: '#111111',
      [`headerTextColor${POINT_COLOR_SUFFIX}`]: false,
    }
    const result = resolvePointColors(props, [POINT])
    expect(result.headerTextColor).toBe('#111111')
  })

  it('원본 properties는 변경하지 않는다 (수동 색상 보존 → 해제 시 원복 가능)', () => {
    const props = {
      headerTextColor: '#111111',
      [`headerTextColor${POINT_COLOR_SUFFIX}`]: true,
    }
    resolvePointColors(props, [POINT])
    expect(props.headerTextColor).toBe('#111111')
  })

  it('포인트 색상 목록이 비어 있으면 원본을 그대로 반환한다', () => {
    const props = {
      headerTextColor: '#111111',
      [`headerTextColor${POINT_COLOR_SUFFIX}`]: true,
    }
    expect(resolvePointColors(props, [])).toBe(props)
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
    const result = resolvePointColors(props, [POINT])
    expect(result.textColor).toBe(POINT)
    expect(result.borderColor).toBe(POINT)
    expect(result.bgColor).toBe('#ffffff') // 플래그 없음 → 유지
  })

  it('__pointIndex로 지정한 포인트 색상(최대 3개 중)을 사용한다', () => {
    const pointColors = ['#2563eb', '#000000', '#ec4899']
    const props = {
      textColor: '#111111',
      [`textColor${POINT_COLOR_SUFFIX}`]: true,
      [`textColor${POINT_COLOR_INDEX_SUFFIX}`]: 2,
    }
    const result = resolvePointColors(props, pointColors)
    expect(result.textColor).toBe('#ec4899')
  })

  it('__pointIndex가 없으면 0번(첫 번째) 포인트 색상을 사용한다', () => {
    const pointColors = ['#2563eb', '#000000', '#ec4899']
    const props = {
      textColor: '#111111',
      [`textColor${POINT_COLOR_SUFFIX}`]: true,
    }
    const result = resolvePointColors(props, pointColors)
    expect(result.textColor).toBe('#2563eb')
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

describe('resolvePointColorVars (본문 리치텍스트 — 포인트 색상 최대 3개 인덱스별)', () => {
  const pointColors = ['#2563eb', '#000000', '#ec4899']

  it('var(--point-color-N, #fallback) 토큰을 해당 인덱스의 포인트 색상으로 치환한다', () => {
    const html = '<span style="color: var(--point-color-2, #999999)">강조</span>'
    expect(resolvePointColorVars(html, pointColors)).toBe(
      '<span style="color: #ec4899">강조</span>',
    )
  })

  it('인덱스 0/1/2 각각 올바른 색상으로 치환한다', () => {
    const html =
      '<b style="color:var(--point-color-0)">a</b>' +
      '<i style="color:var(--point-color-1)">b</i>' +
      '<u style="color:var(--point-color-2)">c</u>'
    expect(resolvePointColorVars(html, pointColors)).toBe(
      '<b style="color:#2563eb">a</b><i style="color:#000000">b</i><u style="color:#ec4899">c</u>',
    )
  })

  it('인덱스 없는 레거시 var(--point-color) 토큰은 0번 포인트 색상으로 치환한다(하위호환)', () => {
    const html = '<span style="background-color: var(--point-color, #111)">A</span>'
    expect(resolvePointColorVars(html, pointColors)).toBe(
      '<span style="background-color: #2563eb">A</span>',
    )
  })

  it('인덱스 토큰과 레거시 토큰이 섞여 있어도 각각 올바르게 치환한다', () => {
    const html =
      '<b style="color:var(--point-color-1)">new</b><i style="color:var(--point-color)">legacy</i>'
    expect(resolvePointColorVars(html, pointColors)).toBe(
      '<b style="color:#000000">new</b><i style="color:#2563eb">legacy</i>',
    )
  })

  it('포인트 색상 배열이 비어 있으면 기본 포인트 색상(#2563eb)으로 치환한다', () => {
    const html = '<span style="color: var(--point-color-1)">z</span>'
    expect(resolvePointColorVars(html, [])).toBe('<span style="color: #2563eb">z</span>')
    expect(resolvePointColorVars(html, null)).toBe('<span style="color: #2563eb">z</span>')
  })

  it('해당 인덱스의 색상이 없으면 0번으로 폴백한다', () => {
    const html = '<span style="color: var(--point-color-2)">z</span>'
    expect(resolvePointColorVars(html, ['#2563eb'])).toBe(
      '<span style="color: #2563eb">z</span>',
    )
  })

  it('포인트 변수가 없는 HTML은 그대로 둔다', () => {
    const html = '<span style="color: #abcdef">no point</span>'
    expect(resolvePointColorVars(html, pointColors)).toBe(html)
  })

  it('빈 입력은 빈 문자열을 반환한다', () => {
    expect(resolvePointColorVars('', pointColors)).toBe('')
  })
})
