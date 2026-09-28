import { describe, it, expect } from 'vitest'
import { EDIT_FILE_FRESH_DAYS, isFreshEditFile } from '../s3Browse'

const DAY = 24 * 60 * 60 * 1000
const now = new Date(2026, 8, 4, 12, 0, 0)
const file = (agoDays: number | null) => ({
  key: 'k',
  name: 'x_edit.html',
  lastModified: agoDays === null ? null : new Date(now.getTime() - agoDays * DAY),
})

describe('isFreshEditFile — 임시 저장을 이어서 편집 대상으로 보여줄지', () => {
  it('기준일(14일) 안이면 보여준다', () => {
    expect(EDIT_FILE_FRESH_DAYS).toBe(14)
    expect(isFreshEditFile(file(0), now)).toBe(true)
    expect(isFreshEditFile(file(13), now)).toBe(true)
    expect(isFreshEditFile(file(14), now)).toBe(true)
  })

  it('기준일을 넘기면 접는다', () => {
    expect(isFreshEditFile(file(15), now)).toBe(false)
    expect(isFreshEditFile(file(60), now)).toBe(false)
  })

  it('수정 시각을 모르면 보여준다 — 막는 쪽이 더 나쁘다', () => {
    expect(isFreshEditFile(file(null), now)).toBe(true)
  })

  it('파일이 없으면 false', () => {
    expect(isFreshEditFile(undefined, now)).toBe(false)
    expect(isFreshEditFile(null, now)).toBe(false)
  })

  it('기준일을 바꿔 부를 수 있다', () => {
    expect(isFreshEditFile(file(20), now, 30)).toBe(true)
    expect(isFreshEditFile(file(20), now, 7)).toBe(false)
  })
})
