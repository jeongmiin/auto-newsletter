import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { twoColumnRatioProcessor } from '../processors'
import {
  replaceModule04Content,
  replaceModule052Content,
  replaceModule051Content,
  replaceModule053Content,
  replaceModule06Content,
  replaceModule07Content,
  replaceModule07ReverseContent,
} from '../moduleContentReplacer'

const readModule = (file: string) =>
  readFileSync(resolve(process.cwd(), 'public/modules', file), 'utf-8')

describe('twoColumnRatioProcessor - 좌/우 영역 비율 계산', () => {
  const html =
    '<div style="min-width: {{leftColMinWidth}};"></div><div style="min-width: {{rightColMinWidth}};"></div>'

  it('미설정 시 50:50 (calc(50% - 5px))', () => {
    const result = twoColumnRatioProcessor(html, {}) as string
    expect(result).toContain('min-width: calc(50% - 5px);')
    expect(result).not.toContain('{{leftColMinWidth}}')
    expect(result).not.toContain('{{rightColMinWidth}}')
  })

  it('숫자 입력(70/30)이 calc로 반영됨', () => {
    const result = twoColumnRatioProcessor(html, {
      leftWidthPercent: '70',
      rightWidthPercent: '30',
    }) as string
    expect(result).toContain('min-width: calc(70% - 5px);')
    expect(result).toContain('min-width: calc(30% - 5px);')
  })

  it('"%" 가 붙은 입력도 허용', () => {
    const result = twoColumnRatioProcessor(html, {
      leftWidthPercent: '65%',
      rightWidthPercent: '35%',
    }) as string
    expect(result).toContain('min-width: calc(65% - 5px);')
    expect(result).toContain('min-width: calc(35% - 5px);')
  })

  it('5~95% 범위로 제한 (0·100·음수·과대값 클램프)', () => {
    const lo = twoColumnRatioProcessor(html, { leftWidthPercent: '0', rightWidthPercent: '-10' }) as string
    expect(lo).toContain('min-width: calc(5% - 5px);')
    const hi = twoColumnRatioProcessor(html, { leftWidthPercent: '100', rightWidthPercent: '999' }) as string
    expect(hi).toContain('min-width: calc(95% - 5px);')
  })

  it('잘못된 값은 50%로 폴백', () => {
    const result = twoColumnRatioProcessor(html, {
      leftWidthPercent: 'abc',
      rightWidthPercent: '',
    }) as string
    expect(result).toContain('min-width: calc(50% - 5px);')
  })
})

describe('실제 모듈 템플릿 통합 — 반응형 트릭 유지 + 비율 적용', () => {
  const ratioCases: Array<[string, (html: string, props: Record<string, unknown>) => string]> = [
    ['Module05.html', replaceModule052Content],
    ['Module05-1.html', replaceModule051Content],
    ['Module06.html', replaceModule06Content],
    ['Module07.html', replaceModule07Content],
    ['Module07_reverse.html', replaceModule07ReverseContent],
  ]

  it.each(ratioCases)('%s — 플레이스홀더가 남지 않고 좌우 비율이 적용됨', (file, replacer) => {
    const html = readModule(file)
    // 사전 조건: 템플릿에 좌/우 플레이스홀더가 존재
    expect(html).toContain('{{leftColMinWidth}}')
    expect(html).toContain('{{rightColMinWidth}}')

    const result = replacer(html, { leftWidthPercent: '60', rightWidthPercent: '40' })
    expect(result).toContain('calc(60% - 5px)')
    expect(result).toContain('calc(40% - 5px)')
    expect(result).not.toContain('{{leftColMinWidth}}')
    expect(result).not.toContain('{{rightColMinWidth}}')
    // 반응형 스택 트릭은 그대로 유지되어야 함 (PC 양옆 / 모바일 적층)
    expect(result).toContain('calc((570px - 100%) * 570)')
    expect(result).toContain('max-width: 100%')
  })

  it('Module04 — 좌/우 컬럼 비율이 적용되고 플레이스홀더가 남지 않음', async () => {
    const html = readModule('Module04.html')
    // 추가 콘텐츠 삽입은 no-op 스텁
    const noopInsert = async (h: string) => h
    const result = await replaceModule04Content(
      html,
      { leftWidthPercent: '65', rightWidthPercent: '35' },
      noopInsert,
    )
    expect(result).toContain('calc(65% - 5px)')
    expect(result).toContain('calc(35% - 5px)')
    expect(result).not.toContain('{{leftColMinWidth}}')
    expect(result).not.toContain('{{rightColMinWidth}}')
    expect(result).toContain('calc((570px - 100%) * 570)')
  })

  it('Module05-3 — 상단 풀폭 섹션은 유지하고 2단 영역만 비율 적용', async () => {
    const html = readModule('Module05-3.html')
    const result = await replaceModule053Content(html, {
      leftWidthPercent: '70',
      rightWidthPercent: '30',
    })
    expect(result).toContain('calc(70% - 5px)')
    expect(result).toContain('calc(30% - 5px)')
    expect(result).not.toContain('{{leftColMinWidth}}')
    expect(result).not.toContain('{{rightColMinWidth}}')
  })
})
