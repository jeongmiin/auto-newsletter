import { describe, expect, it } from 'vitest'
import { columnColorSlots } from '../columnColor'

describe('columnColorSlots', () => {
  it('처음에는 왼쪽 칸이 파랑(0), 오른쪽 칸이 주황(1)', () => {
    expect(columnColorSlots(undefined)).toEqual([0, 1])
    expect(columnColorSlots(false)).toEqual([0, 1])
  })
  it('좌우를 바꾼 행은 색도 내용을 따라 옮겨 간다', () => {
    expect(columnColorSlots(true)).toEqual([1, 0])
  })
})
