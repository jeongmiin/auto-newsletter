import { describe, it, expect } from 'vitest'
import { removeNewsHeaderLogoProcessor } from '../processors'

// ModuleNewsHeader.html 의 로고 마커 블록을 반영한 최소 HTML
const HTML = `
  <tbody>
    <!-- 로고 -->
    <tr>
      <td align="center" style="border-bottom:5px solid #000000; padding: 30px;">
        <img alt="로고" src="logo.png" style="display: inline-block; max-width:100%;">
      </td>
    </tr>
    <!-- //로고 -->
    <tr>
      <td>타이틀 영역</td>
    </tr>
  </tbody>
`

describe('removeNewsHeaderLogoProcessor (로고 노출 토글)', () => {
  it('showLogo가 false이면 로고 <tr>과 마커를 통째로 제거한다', () => {
    const result = removeNewsHeaderLogoProcessor(HTML, { showLogo: false }) as string
    expect(result).not.toContain('<img')
    expect(result).not.toContain('로고')
    expect(result).not.toContain('border-bottom:5px')
    // 타이틀 영역은 유지
    expect(result).toContain('타이틀 영역')
  })

  it('showLogo가 true이면 로고를 그대로 유지한다', () => {
    const result = removeNewsHeaderLogoProcessor(HTML, { showLogo: true }) as string
    expect(result).toContain('<img')
    expect(result).toContain('타이틀 영역')
  })

  it('showLogo가 미설정이면(기존 인스턴스) 로고를 유지한다', () => {
    const result = removeNewsHeaderLogoProcessor(HTML, {}) as string
    expect(result).toContain('<img')
  })
})
