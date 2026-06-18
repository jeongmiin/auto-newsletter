import { describe, it, expect } from 'vitest'
import { applyModule02ButtonStyles } from '../buttonUtils'

// Module02.html 구조를 본뜬 최소 HTML — 이미지 링크 <a>와 버튼 <a>가 함께 존재
const html = `
  <a href="https://example.com" target="_blank" style="display: block; text-decoration: none;"><img src="x.png" style="display: block; width: 100%; border-radius: 12px;"></a>
  <a href="#" style="display: block; padding:15px 0px; background-color:#111111; color:#ffffff; font-weight:700;">버튼</a>
`

describe('applyModule02ButtonStyles - 버튼 색상이 이미지 링크로 새지 않음', () => {
  it('버튼 <a>에는 배경색·글자색이 적용됨', () => {
    const result = applyModule02ButtonStyles(html, '#0f0cb0', '#ffffff')
    expect(result).toContain('background-color:#0f0cb0 !important;')
  })

  it('이미지 링크 <a>(background-color 없음)에는 버튼 배경색이 적용되지 않음', () => {
    const result = applyModule02ButtonStyles(html, '#0f0cb0', '#ffffff')
    // 이미지 링크 줄에는 주입된 배경색이 없어야 함
    const imageLinkLine = result
      .split('\n')
      .find((line) => line.includes('text-decoration: none'))
    expect(imageLinkLine).toBeDefined()
    expect(imageLinkLine).not.toContain('#0f0cb0')
    expect(imageLinkLine).not.toContain('!important')
  })

  it('배경색만 적용되는 <a>는 단 하나(버튼)뿐', () => {
    const result = applyModule02ButtonStyles(html, '#0f0cb0', '#ffffff')
    expect(result.match(/background-color:#0f0cb0 !important;/g)?.length).toBe(1)
  })
})
