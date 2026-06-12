import { describe, it, expect } from 'vitest'
import {
  parseColorToRgba,
  compositeOver,
  flattenColor,
  flattenAlphaColorsInHtml,
} from '../colorFlatten'

describe('parseColorToRgba', () => {
  it('6자리 HEX', () => {
    expect(parseColorToRgba('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 })
  })
  it('8자리 HEX (알파)', () => {
    expect(parseColorToRgba('#ff000080')).toEqual({ r: 255, g: 0, b: 0, a: 128 / 255 })
  })
  it('3자리/4자리 HEX', () => {
    expect(parseColorToRgba('#f00')).toEqual({ r: 255, g: 0, b: 0, a: 1 })
    expect(parseColorToRgba('#f008')).toEqual({ r: 255, g: 0, b: 0, a: 136 / 255 })
  })
  it('rgba()', () => {
    expect(parseColorToRgba('rgba(255,0,0,0.5)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 })
  })
  it('transparent', () => {
    expect(parseColorToRgba('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 })
  })
  it('잘못된 값은 null', () => {
    expect(parseColorToRgba('not-a-color')).toBeNull()
    expect(parseColorToRgba('')).toBeNull()
  })
})

describe('compositeOver', () => {
  it('알파 0.5 빨강을 흰 배경 위에 합성 → 분홍', () => {
    const out = compositeOver({ r: 255, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255 })
    expect(out).toEqual({ r: 255, g: 127.5, b: 127.5 })
  })
  it('알파 1이면 원색 유지', () => {
    const out = compositeOver({ r: 10, g: 20, b: 30, a: 1 }, { r: 255, g: 255, b: 255 })
    expect(out).toEqual({ r: 10, g: 20, b: 30 })
  })
})

describe('flattenColor', () => {
  it('알파 없는 값은 그대로', () => {
    expect(flattenColor('#abcdef')).toBe('#abcdef')
    expect(flattenColor('rgb(1,2,3)')).toBe('rgb(1,2,3)')
  })
  it('8자리 HEX를 흰 배경 위 불투명으로', () => {
    // 검정 0x80(=128/255≈0.502) over 흰색 → 255*0.498≈127 → #7f7f7f
    expect(flattenColor('#00000080')).toBe('#7f7f7f')
  })
  it('backdrop 지정', () => {
    // 흰색 50% over 검정 → #808080
    expect(flattenColor('#ffffff80', '#000000')).toBe('#808080')
  })
})

describe('flattenAlphaColorsInHtml', () => {
  it('style 내 8자리 HEX·rgba만 평탄화, 일반 색은 유지', () => {
    const html =
      '<div style="background-color:#00000080; color:#333333; border-color:rgba(255,0,0,0.5)">x</div>'
    const out = flattenAlphaColorsInHtml(html, '#ffffff')
    expect(out).toContain('background-color:#7f7f7f')
    expect(out).toContain('color:#333333') // 6자리는 그대로
    expect(out).toContain('border-color:#ff8080') // rgba 평탄화
    expect(out).not.toContain('#00000080') // 8자리 흔적 없음
    expect(out).not.toContain('rgba(')
  })
  it('알파 1(rgba ...,1)은 건드리지 않음', () => {
    const html = '<i style="color:rgba(0,0,0,1)"></i>'
    expect(flattenAlphaColorsInHtml(html)).toBe(html)
  })
  it('6자리 HEX는 절대 변형하지 않음', () => {
    const html = '<i style="color:#aabbcc"></i>'
    expect(flattenAlphaColorsInHtml(html)).toBe(html)
  })
})
