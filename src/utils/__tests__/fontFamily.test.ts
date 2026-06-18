import { describe, it, expect } from 'vitest'
import { applyFontFamily, FONT_FAMILY_BY_LANGUAGE } from '@/utils/fontFamily'

describe('applyFontFamily', () => {
  const KO = 'font-family:AppleSDGothic, malgun gothic, nanum gothic, Noto Sans KR, sans-serif'

  it('기본(default) 선택 시 원본을 그대로 반환한다', () => {
    const html = `<td style="${KO};">x</td>`
    expect(applyFontFamily(html, 'default')).toBe(html)
  })

  it('일본어 선택 시 기본 폰트 스택을 일본어 스택으로 치환한다', () => {
    const html = `<td style="font-size:14px; ${KO}; word-break:keep-all;">x</td>`
    const out = applyFontFamily(html, 'ja')
    expect(out).toContain(FONT_FAMILY_BY_LANGUAGE.ja)
    expect(out).not.toContain('AppleSDGothic')
  })

  it('일본어 스택은 큰따옴표를 쓰지 않는다 (style="..." 속성 조기 종료 방지)', () => {
    // 큰따옴표가 들어가면 인라인 style 속성이 깨져 버튼 색이 기본 링크색으로 풀린다
    expect(FONT_FAMILY_BY_LANGUAGE.ja).not.toContain('"')
    const out = applyFontFamily(`<a style="color:#333333; ${KO};">btn</a>`, 'ja')
    expect(out).toContain('color:#333333')
    expect(out).not.toContain('font-family:"')
  })

  it('태국어 선택 시 태국어 스택으로 치환한다', () => {
    const out = applyFontFamily(`<p style="${KO};">x</p>`, 'th')
    expect(out).toContain(FONT_FAMILY_BY_LANGUAGE.th)
  })

  it('콜론·콤마 주변 공백 변형(예: Module01의 누락 공백)도 치환한다', () => {
    const variants = [
      'font-family: AppleSDGothic, malgun gothic, nanum gothic, Noto Sans KR, sans-serif',
      'font-family: AppleSDGothic, malgun gothic, nanum gothic,Noto Sans KR, sans-serif',
    ]
    for (const v of variants) {
      expect(applyFontFamily(v, 'ja')).not.toContain('AppleSDGothic')
    }
  })

  it('기본 스택이 아닌 다른 font-family 선언(예: 문서 -apple-system)은 건드리지 않는다', () => {
    const html = 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    expect(applyFontFamily(html, 'ja')).toBe(html)
  })

  it('한 HTML 안의 여러 폰트 선언을 모두 치환한다', () => {
    const html = `<td style="${KO};">a</td><th style="${KO};">b</th>`
    const out = applyFontFamily(html, 'ja')
    expect(out.match(/AppleSDGothic/g)).toBeNull()
    expect(out.match(/Hiragino Kaku Gothic ProN/g)?.length).toBe(2)
  })
})
