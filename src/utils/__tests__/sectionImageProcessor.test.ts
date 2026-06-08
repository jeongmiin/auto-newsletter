import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { removeSectionImageProcessor, removeMainTitleProcessor } from '../processors'

// 실제 SectionTitle.html을 읽어 이미지 타이틀 토글 처리를 검증
const sectionHtml = readFileSync(
  resolve(process.cwd(), 'public/modules/SectionTitle.html'),
  'utf-8',
)

const run = (props: Record<string, unknown>) => removeSectionImageProcessor(sectionHtml, props) as string

describe('removeSectionImageProcessor - 이미지 타이틀 토글', () => {
  it('템플릿이 이미지 타이틀 마커를 포함해야 함 (사전 조건)', () => {
    expect(sectionHtml).toContain('<!-- 이미지 타이틀 -->')
    expect(sectionHtml).toContain('{{sectionImageUrl}}')
  })

  it('미설정(기본 비노출) 시 이미지 블록이 제거됨', () => {
    const result = run({})
    expect(result).not.toContain('<!-- 이미지 타이틀 -->')
    expect(result).not.toContain('{{sectionImageUrl}}')
    // 메인 타이틀은 유지
    expect(result).toContain('{{mainTitle}}')
  })

  it('showSectionImage=false 면 이미지 블록이 제거됨', () => {
    const result = run({ showSectionImage: false })
    expect(result).not.toContain('{{sectionImageUrl}}')
  })

  it('showSectionImage=true 면 이미지 블록과 링크가 유지됨', () => {
    const result = run({ showSectionImage: true })
    expect(result).toContain('{{sectionImageUrl}}')
    expect(result).toContain('{{sectionImageLinkUrl}}')
  })
})

const runMain = (props: Record<string, unknown>) =>
  removeMainTitleProcessor(sectionHtml, props) as string

describe('removeMainTitleProcessor - 메인 타이틀 토글', () => {
  it('미설정(기본 노출) 시 메인 타이틀이 유지됨', () => {
    const result = runMain({})
    expect(result).toContain('{{mainTitle}}')
  })

  it('showMainTitle=true 면 메인 타이틀이 유지됨', () => {
    const result = runMain({ showMainTitle: true })
    expect(result).toContain('{{mainTitle}}')
  })

  it('showMainTitle=false 면 메인 타이틀 블록이 제거됨', () => {
    const result = runMain({ showMainTitle: false })
    expect(result).not.toContain('<!-- 메인 타이틀 -->')
    expect(result).not.toContain('{{mainTitle}}')
    // 서브 타이틀은 유지
    expect(result).toContain('{{subTitle}}')
  })
})
