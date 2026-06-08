import { describe, it, expect } from 'vitest'
import { migrateModuleProperties, buildCompanyInfoFromLegacy } from '../moduleMigrations'

describe('migrateModuleProperties - ModuleFooter companyInfo', () => {
  it('구버전 필드를 companyInfo로 합성하고 레거시 키를 제거함', () => {
    const result = migrateModuleProperties('ModuleFooter', {
      topTextTitle: '고카프 사무국',
      topTextTitleFontSize: '18px',
      topTextCompany: '(주)메쎄이상',
      topTextCompanyFontSize: '16px',
      addressText: '서울시 마포구',
      websiteUrl: 'www.example.com',
    })
    expect(result.companyInfo).toContain('고카프 사무국')
    expect(result.companyInfo).toContain('(주)메쎄이상')
    expect(result.companyInfo).toContain('서울시 마포구')
    // 레거시 키 제거
    expect(result.topTextTitle).toBeUndefined()
    expect(result.addressText).toBeUndefined()
    // 무관한 필드는 유지
    expect(result.websiteUrl).toBe('www.example.com')
  })

  it('이미 companyInfo가 있으면 변환하지 않고 원본을 반환함', () => {
    const props = { companyInfo: '<p>신규</p>', topTextTitle: '구버전' }
    const result = migrateModuleProperties('ModuleFooter', props)
    expect(result).toBe(props)
  })

  it('레거시 필드가 없으면 원본을 그대로 반환함', () => {
    const props = { websiteUrl: 'www.example.com' }
    const result = migrateModuleProperties('ModuleFooter', props)
    expect(result).toBe(props)
  })

  it('다른 모듈은 변환하지 않음', () => {
    const props = { topTextTitle: '제목' }
    expect(migrateModuleProperties('ModuleImg', props)).toBe(props)
  })

  it('buildCompanyInfoFromLegacy는 폰트 크기를 인라인 스타일로 반영함', () => {
    const html = buildCompanyInfoFromLegacy({
      topTextTitle: '제목',
      topTextTitleFontSize: '20px',
    })
    expect(html).toContain('font-size:20px')
    expect(html).toContain('<strong')
  })
})
