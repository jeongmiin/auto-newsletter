import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { footerSnsProcessor } from '../processors'

// 실제 ModuleFooter.html 템플릿을 읽어 마커 기반 처리 통합 검증
// (vitest root = 프로젝트 루트이므로 cwd 기준 상대경로 사용)
const footerHtml = readFileSync(
  resolve(process.cwd(), 'public/modules/ModuleFooter.html'),
  'utf-8',
)

// 프로세서는 동기 실행되므로 캐스팅하여 string 반환을 기대
const run = (props: Record<string, unknown>) => footerSnsProcessor(footerHtml, props) as string

describe('footerSnsProcessor - 회사 정보 H/T/E 토글', () => {
  it('템플릿이 H/T/E 마커를 포함해야 함 (사전 조건)', () => {
    expect(footerHtml).toContain('<!-- 홈페이지 -->')
    expect(footerHtml).toContain('<!-- 전화 -->')
    expect(footerHtml).toContain('<!-- 이메일 -->')
    expect(footerHtml).toContain('<strong>H</strong>')
    expect(footerHtml).toContain('<strong>T</strong>')
    expect(footerHtml).toContain('<strong>E</strong>')
  })

  it('미설정 시 H/T/E가 모두 표시되어야 함 (기존 동작 유지)', () => {
    const result = run({})
    expect(result).toContain('<strong>H</strong>')
    expect(result).toContain('<strong>T</strong>')
    expect(result).toContain('<strong>E</strong>')
  })

  it('showWebsite=false 이면 H만 제거되고 구분 여백도 사라짐', () => {
    const result = run({ showWebsite: false })
    expect(result).not.toContain('<strong>H</strong>')
    expect(result).toContain('<strong>T</strong>')
    expect(result).toContain('<strong>E</strong>')
    // H·T 둘 다일 때만 유지되는 구분 여백 제거
    expect(result).not.toContain('<!-- HT구분 -->')
    // T가 남아있으므로 1행 줄바꿈은 유지
    expect(result).toContain('<!-- 행1여백 -->')
  })

  it('showPhone=false 이면 T만 제거됨', () => {
    const result = run({ showPhone: false })
    expect(result).toContain('<strong>H</strong>')
    expect(result).not.toContain('<strong>T</strong>')
    expect(result).toContain('<strong>E</strong>')
    expect(result).not.toContain('<!-- HT구분 -->')
    expect(result).toContain('<!-- 행1여백 -->')
  })

  it('showWebsite=false + showPhone=false 이면 H/T와 1행 줄바꿈이 모두 제거됨', () => {
    const result = run({ showWebsite: false, showPhone: false })
    expect(result).not.toContain('<strong>H</strong>')
    expect(result).not.toContain('<strong>T</strong>')
    expect(result).toContain('<strong>E</strong>')
    expect(result).not.toContain('<!-- 행1여백 -->')
    // E는 남아있으므로 2행 줄바꿈은 유지
    expect(result).toContain('<!-- 행2여백 -->')
  })

  it('showEmail=false 이면 E와 2행 줄바꿈이 제거됨', () => {
    const result = run({ showEmail: false })
    expect(result).toContain('<strong>H</strong>')
    expect(result).toContain('<strong>T</strong>')
    expect(result).not.toContain('<strong>E</strong>')
    expect(result).not.toContain('<!-- 행2여백 -->')
  })

  it('H/T 모두 표시될 때만 구분 여백이 유지됨', () => {
    const both = run({ showWebsite: true, showPhone: true })
    expect(both).toContain('<!-- HT구분 -->')
  })

  it('모두 false 이면 회사 정보 줄과 여백이 전부 제거됨', () => {
    const result = run({ showWebsite: false, showPhone: false, showEmail: false })
    expect(result).not.toContain('<strong>H</strong>')
    expect(result).not.toContain('<strong>T</strong>')
    expect(result).not.toContain('<strong>E</strong>')
    expect(result).not.toContain('<!-- 행1여백 -->')
    expect(result).not.toContain('<!-- 행2여백 -->')
    expect(result).not.toContain('<!-- HT구분 -->')
  })
})

describe('footerSnsProcessor - SNS 아이콘 토글 (쭈쭈쭈 포함)', () => {
  it('미설정 시 모든 SNS 아이콘이 제거됨 (기본 숨김)', () => {
    const result = run({})
    expect(result).not.toContain('sns_01.png') // 홈
    expect(result).not.toContain('sns_zuzuzu.png') // 쭈쭈쭈
    expect(result).not.toContain('kcoupet.com')
  })

  it('showZuzuzu=true 이면 쭈쭈쭈 링크가 표시됨', () => {
    const result = run({ showZuzuzu: true })
    expect(result).toContain('sns_zuzuzu.png')
    expect(result).toContain('kcoupet.com')
  })

  it('showZuzuzu=false 이면 쭈쭈쭈 블록이 제거됨', () => {
    const result = run({ showZuzuzu: false })
    expect(result).not.toContain('sns_zuzuzu.png')
    expect(result).not.toContain('<!-- 쭈쭈쭈 -->')
  })

  it('개별 SNS 토글이 독립적으로 동작함', () => {
    const result = run({ showHome: true, showInstagram: true })
    expect(result).toContain('sns_01.png') // 홈 표시
    expect(result).toContain('sns_05.png') // 인스타그램 표시
    expect(result).not.toContain('sns_02.png') // 페이스북 미표시
    expect(result).not.toContain('sns_zuzuzu.png') // 쭈쭈쭈 미표시
  })

  it('X(트위터) 마커처럼 정규식 특수문자가 포함된 라벨도 안전하게 처리됨', () => {
    const shown = run({ showX: true })
    expect(shown).toContain('sns_08.png') // X 아이콘 표시
    const hidden = run({ showX: false })
    expect(hidden).not.toContain('sns_08.png')
    // 마커가 깨끗하게 제거되어 잔여 주석이 없어야 함
    expect(hidden).not.toContain('<!-- X(트위터) -->')
  })

  it('처리 후 회사 정보/SNS 마커 주석이 남지 않아야 함 (전체 토글 ON 기준)', () => {
    const result = run({
      showWebsite: true,
      showPhone: true,
      showEmail: true,
      showHome: true,
      showFacebook: true,
      showBlog: true,
      showYoutube: true,
      showInstagram: true,
      showKakao: true,
      showX: true,
      showZuzuzu: true,
    })
    // 모두 표시이므로 어떤 마커 블록도 제거되지 않지만, 콘텐츠는 모두 존재해야 함
    expect(result).toContain('<strong>H</strong>')
    expect(result).toContain('sns_zuzuzu.png')
    expect(result).toContain('sns_01.png')
  })
})
