import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { replaceModule053Content } from '../moduleContentReplacer'

const html = () => readFileSync(join('public/modules', 'Module05-3.html'), 'utf8')
// getDefaultProperties와 동일하게 editableProps default로 기본 속성 구성
const defaults = () => {
  const cfg = JSON.parse(readFileSync(join('public/modules', 'modules-config.json'), 'utf8'))
  const mod = cfg.modules.find((m: { id: string }) => m.id === 'Module05-3')
  const props: Record<string, unknown> = {}
  for (const p of mod.editableProps) props[p.key] = p.default !== undefined ? p.default : ''
  return props
}

describe('Module05-3 통합(모듈 05) 토글 프로세서', () => {
  it('기본값: 상단 섹션·오른쪽 타이틀 표시, 미치환 placeholder 없음', async () => {
    const out = await replaceModule053Content(html(), defaults())
    expect(out).toContain('상단 섹션 타이틀')
    expect(out).not.toContain('{{')
    // 강조 off → 타이틀 <strong> 스타일에 background-color 없음
    const strongStyle = /타이틀 -->\s*<strong style="([^"]*)"/.exec(out)?.[1] ?? ''
    expect(strongStyle).not.toContain('background-color')
  })

  it('상단 섹션 타이틀/텍스트 개별 토글', async () => {
    const base = { ...defaults(), topSectionTitle: 'T_TITLE', topSectionText: 'T_TEXT' }
    const titleOff = await replaceModule053Content(html(), { ...base, showTopSectionTitle: false })
    expect(titleOff).not.toContain('T_TITLE')
    expect(titleOff).toContain('T_TEXT')

    const textOff = await replaceModule053Content(html(), { ...base, showTopSectionText: false })
    expect(textOff).toContain('T_TITLE')
    expect(textOff).not.toContain('T_TEXT')

    const bothOff = await replaceModule053Content(html(), {
      ...base,
      showTopSectionTitle: false,
      showTopSectionText: false,
    })
    expect(bothOff).not.toContain('T_TITLE')
    expect(bothOff).not.toContain('T_TEXT')
    expect(bothOff).not.toContain('상단 섹션 타이틀') // 배너 행 통째 제거
  })

  it('showRightTitle=false면 오른쪽 타이틀 제거', async () => {
    const out = await replaceModule053Content(html(), { ...defaults(), showRightTitle: false })
    expect(out).not.toContain('오른쪽 타이틀')
    expect(out).not.toContain('{{rightTitleStyle}}')
  })

  it('rightTitleEmphasis=true면 전체 너비 배경 박스 스타일', async () => {
    const out = await replaceModule053Content(html(), {
      ...defaults(),
      rightTitleEmphasis: true,
      rightTitleBgColor: '#ff0000',
      rightTitleTextColor: '#ffffff',
    })
    const style = /타이틀 -->\s*<strong style="([^"]*)"/.exec(out)?.[1] ?? ''
    expect(style).toContain('display:block')
    expect(style).toContain('width:100%')
    expect(style).toContain('background-color:#ff0000')
  })

  it('작은 버튼 공통 너비/모서리/정렬이 모든 버튼에 적용', async () => {
    const props = {
      ...defaults(),
      showSmallBtn1: true,
      showSmallBtn2: true,
      showSmallBtn3: true,
      showSmallBtn4: true,
      smallBtnWidth: '100%',
      smallBtnBorderRadius: '0px',
      smallBtnAlign: 'left',
    }
    const out = await replaceModule053Content(html(), props)
    expect((out.match(/width:100%;/g) || []).length).toBeGreaterThanOrEqual(4)
    expect((out.match(/text-align:left;/g) || []).length).toBeGreaterThanOrEqual(4)
    expect(out).toContain('border-radius:0px;')
    expect(out).not.toContain('{{smallBtnWidth}}')
  })
})
