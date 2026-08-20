import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { replaceModuleFooterContent } from '../moduleContentReplacer'

const html = () => readFileSync(join('public/modules', 'ModuleFooter.html'), 'utf8')

describe('ModuleFooter 공통 배경/텍스트 색상', () => {
  it('커스텀 색상이 배경과 노출 텍스트 전체에 적용, 하드코딩 잔존 없음', () => {
    const out = replaceModuleFooterContent(html(), {
      footerBgColor: '#000000',
      footerTextColor: '#ffeeaa',
    })
    expect(out).toContain('background-color:#000000')
    // 노출되는 모든 텍스트 색상이 공통값으로 (회사정보·연락처·국문 안내·수신거부)
    expect((out.match(/color:#ffeeaa/g) || []).length).toBeGreaterThanOrEqual(4)
    // 기존 하드코딩 텍스트/배경 색상 잔존 없음
    expect(out).not.toMatch(/color:#(333|555)\b/)
    expect(out).not.toContain('background-color:#e9e9e9')
    expect(out).not.toContain('{{footer')
  })

  it('기본값은 기존 색상으로 폴백', () => {
    const out = replaceModuleFooterContent(html(), {})
    expect(out).toContain('background-color:#e9e9e9')
    expect(out).toContain('color:#333333')
    expect(out).not.toContain('{{footer')
  })
})
