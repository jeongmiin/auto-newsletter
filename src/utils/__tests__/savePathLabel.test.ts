import { describe, it, expect } from 'vitest'
import { savePathLabel } from '../s3Upload'

describe('savePathLabel — 헤더·전체 설정에 적는 저장 위치', () => {
  it('전시회 폴더부터 회차까지 " / "로 잇고 끝에 "/"를 붙인다', () => {
    expect(savePathLabel('arch-plan/gocaf', 'eng/vol01')).toBe('gocaf / eng / vol01 /')
    expect(savePathLabel('arch-plan/gocaf', 'vol01')).toBe('gocaf / vol01 /')
  })

  it('회차가 아직 없으면 전시회까지만', () => {
    expect(savePathLabel('arch-plan/gocaf', '')).toBe('gocaf /')
    expect(savePathLabel('arch-plan/gocaf', null)).toBe('gocaf /')
  })

  it('팀·전시회가 없으면 빈 문자열', () => {
    expect(savePathLabel(null, 'vol01')).toBe('')
    expect(savePathLabel('', '')).toBe('')
  })

  it('회차 표기는 폴더명 규칙으로 다듬는다', () => {
    expect(savePathLabel('mice/blank', 'Vol 01')).toBe('blank / vol01 /')
  })
})
