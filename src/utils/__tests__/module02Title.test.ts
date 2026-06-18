import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { module12TitleProcessor } from '../processors'

// 실제 Module02.html을 읽어 콘텐츠 타이틀 노출 토글을 검증
const html = readFileSync(resolve(process.cwd(), 'public/modules/Module02.html'), 'utf-8')

const run = (props: Record<string, unknown>) => module12TitleProcessor(html, props) as string

describe('Module02 - 콘텐츠 타이틀 노출 토글', () => {
  it('템플릿이 타이틀 마커를 포함해야 함 (사전 조건)', () => {
    expect(html).toContain('<!-- 타이틀 -->')
    expect(html).toContain('<!-- //타이틀 -->')
    expect(html).toContain('{{title}}')
  })

  it('미설정(기본 노출) 시 타이틀이 유지됨', () => {
    const result = run({})
    expect(result).toContain('{{title}}')
  })

  it('showTitle=true 면 타이틀이 유지됨', () => {
    const result = run({ showTitle: true })
    expect(result).toContain('{{title}}')
  })

  it('showTitle=false 면 타이틀 블록이 제거됨', () => {
    const result = run({ showTitle: false })
    expect(result).not.toContain('<!-- 타이틀 -->')
    expect(result).not.toContain('{{title}}')
    // 본문(description)은 유지
    expect(result).toContain('{{description}}')
  })
})
