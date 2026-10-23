/** 가짜 진행률의 시간 → 퍼센트 매핑 — 0~3초 0→40, 3~10초 40→80, 그 뒤 80 멈춤 */
import { describe, expect, it } from 'vitest'
import { fakeProgressAt } from '@/composables/useFakeProgress'

describe('fakeProgressAt', () => {
  it('처음 3초에 40%까지 빠르게 오른다', () => {
    expect(fakeProgressAt(0)).toBe(0)
    expect(fakeProgressAt(1_500)).toBe(20)
    expect(fakeProgressAt(3_000)).toBe(40)
  })
  it('3~10초에 80%까지 천천히 오른다', () => {
    expect(fakeProgressAt(6_500)).toBe(60)
    expect(fakeProgressAt(10_000)).toBe(80)
  })
  it('응답이 올 때까지 80%에 멈춘다 — 100%에 닿지 않는다', () => {
    expect(fakeProgressAt(20_000)).toBe(80)
    expect(fakeProgressAt(600_000)).toBe(80)
  })
  it('음수·정수 반올림을 안전하게 다룬다', () => {
    expect(fakeProgressAt(-100)).toBe(0)
    expect(Number.isInteger(fakeProgressAt(1_234))).toBe(true)
  })
})
