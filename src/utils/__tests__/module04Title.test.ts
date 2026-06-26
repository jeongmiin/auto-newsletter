import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { replaceModule04Content } from '../moduleContentReplacer'

const html = () => readFileSync(join('public/modules', 'Module04.html'), 'utf8')
const noop = async (h: string) => h
const base = { leftTitle: 'LEFT_T', rightTitle: 'RIGHT_T' }

describe('Module04 좌/우 타이틀 토글 + 작은버튼 공통속성', () => {
  it('기본(undefined)이면 좌/우 타이틀 모두 표시', async () => {
    const out = await replaceModule04Content(html(), { ...base }, noop as never)
    expect(out).toContain('LEFT_T')
    expect(out).toContain('RIGHT_T')
  })

  it('showLeftTitle=false면 왼쪽 타이틀만 제거', async () => {
    const out = await replaceModule04Content(html(), { ...base, showLeftTitle: false }, noop as never)
    expect(out).not.toContain('LEFT_T')
    expect(out).toContain('RIGHT_T')
    expect(out).not.toContain('왼쪽 타이틀')
  })

  it('showRightTitle=false면 오른쪽 타이틀만 제거', async () => {
    const out = await replaceModule04Content(html(), { ...base, showRightTitle: false }, noop as never)
    expect(out).toContain('LEFT_T')
    expect(out).not.toContain('RIGHT_T')
  })

  it('왼쪽 작은버튼 공통 너비/모서리가 4개 버튼에 적용', async () => {
    const out = await replaceModule04Content(
      html(),
      {
        ...base,
        showLeftSmallBtn1: true,
        showLeftSmallBtn2: true,
        showLeftSmallBtn3: true,
        showLeftSmallBtn4: true,
        leftSmallBtnWidth: '100%',
        leftSmallBtnBorderRadius: '0px',
      },
      noop as never,
    )
    expect((out.match(/width:100%;/g) || []).length).toBeGreaterThanOrEqual(4)
    expect(out).toContain('border-radius:0px;')
    expect(out).not.toContain('{{leftSmallBtnWidth}}')
  })
})
