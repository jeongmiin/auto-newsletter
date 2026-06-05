import { describe, it, expect } from 'vitest'
import { resolvePointColors, POINT_COLOR_SUFFIX } from '../pointColor'

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
