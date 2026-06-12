import { describe, it, expect } from 'vitest'
import { appendPxIfBareNumber, normalizePxLength } from '../cssUnit'

describe('appendPxIfBareNumber', () => {
  it('단위 없는 정수에는 px를 붙인다', () => {
    expect(appendPxIfBareNumber('10')).toBe('10px')
    expect(appendPxIfBareNumber('0')).toBe('0px')
  })

  it('소수·부호 있는 숫자도 px를 붙인다', () => {
    expect(appendPxIfBareNumber('0.5')).toBe('0.5px')
    expect(appendPxIfBareNumber('-1')).toBe('-1px')
    expect(appendPxIfBareNumber('.5')).toBe('.5px')
  })

  it('앞뒤 공백은 제거하고 px를 붙인다', () => {
    expect(appendPxIfBareNumber('  12  ')).toBe('12px')
  })

  it('이미 px 단위가 있으면 그대로 둔다', () => {
    expect(appendPxIfBareNumber('10px')).toBe('10px')
    expect(appendPxIfBareNumber('0px')).toBe('0px')
  })

  it('다른 단위(em·rem·%)는 건드리지 않는다', () => {
    expect(appendPxIfBareNumber('1.5em')).toBe('1.5em')
    expect(appendPxIfBareNumber('100%')).toBe('100%')
    expect(appendPxIfBareNumber('2rem')).toBe('2rem')
  })

  it('빈 값·비숫자 키워드는 그대로 둔다', () => {
    expect(appendPxIfBareNumber('')).toBe('')
    expect(appendPxIfBareNumber('   ')).toBe('')
    expect(appendPxIfBareNumber('auto')).toBe('auto')
  })

  it('숫자가 섞인 비단위 문자열은 건드리지 않는다', () => {
    expect(appendPxIfBareNumber('10 20')).toBe('10 20')
    expect(appendPxIfBareNumber('1px 2px')).toBe('1px 2px')
  })
})

describe('normalizePxLength', () => {
  it('빈 값·공백은 기본값 0px로 채운다', () => {
    expect(normalizePxLength('')).toBe('0px')
    expect(normalizePxLength('   ')).toBe('0px')
  })

  it('단위 없는 숫자에는 px를 붙인다', () => {
    expect(normalizePxLength('10')).toBe('10px')
    expect(normalizePxLength('0')).toBe('0px')
  })

  it('이미 단위가 있는 값은 그대로 둔다', () => {
    expect(normalizePxLength('12px')).toBe('12px')
    expect(normalizePxLength('1.5em')).toBe('1.5em')
  })
})
