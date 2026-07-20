import { describe, it, expect } from 'vitest'
import {
  migrateModuleProperties,
  buildCompanyInfoFromLegacy,
  buildKoreanNoticeFromLegacy,
} from '../moduleMigrations'

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

describe('migrateModuleProperties - ModuleFooter 안내문구', () => {
  // 실제 구버전 저장 파일(KHF)의 푸터 속성
  const legacy = {
    footerTextColor: '#333333',
    unsubscribeUrl: 'http://edm.esfair.kr/RejectMail.aspx?code=KHOSPITAL',
    showInquiry: true,
    inquiryEmail: 'khf@esgroup.net',
    phone: ' 02-6121-6363',
    showKoreanFooter: true,
    showEnglishFooter: false,
  }

  it('구버전 분리 필드로 국문 안내문구를 복원하고 레거시 키를 제거함', () => {
    const result = migrateModuleProperties('ModuleFooter', legacy)
    const ko = String(result.koreanNoticeText)
    // 저장 파일의 실제 값이 살아나야 한다 (기본값 name@esgroup.net으로 대체되면 안 됨)
    expect(ko).toContain('khf@esgroup.net')
    expect(ko).toContain('href="http://edm.esfair.kr/RejectMail.aspx?code=KHOSPITAL"')
    expect(ko).not.toContain('name@esgroup.net')
    // 더 이상 렌더에 쓰이지 않는 레거시 키는 제거
    expect(result.unsubscribeUrl).toBeUndefined()
    expect(result.inquiryEmail).toBeUndefined()
    expect(result.showInquiry).toBeUndefined()
    // phone은 연락처 영역에서 계속 쓰이므로 유지
    expect(result.phone).toBe(' 02-6121-6363')
  })

  it('영문 안내문구는 노출 토글이 꺼져 있어도 함께 복원함', () => {
    const result = migrateModuleProperties('ModuleFooter', legacy)
    const en = String(result.englishNoticeText)
    expect(en).toContain('khf@esgroup.net')
    expect(en).toContain('02-6121-6363')
    expect(en).toContain('[unsubscription]')
  })

  it('showInquiry가 false면 구버전과 동일하게 발신전용 문구로 치환함', () => {
    const html = buildKoreanNoticeFromLegacy({ ...legacy, showInquiry: false })
    expect(html).toContain('본 메일은 발신전용 메일입니다.')
    expect(html).not.toContain('khf@esgroup.net')
  })

  it('이미 koreanNoticeText가 있으면 덮어쓰지 않음', () => {
    const result = migrateModuleProperties('ModuleFooter', {
      ...legacy,
      koreanNoticeText: '<div>직접 편집한 문구</div>',
    })
    expect(result.koreanNoticeText).toBe('<div>직접 편집한 문구</div>')
  })

  it('레거시 안내문구 필드가 없으면 원본을 그대로 반환함', () => {
    const props = { koreanNoticeText: '<div>신규</div>', footerTextColor: '#333333' }
    expect(migrateModuleProperties('ModuleFooter', props)).toBe(props)
  })
})
