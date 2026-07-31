import { describe, it, expect } from 'vitest'
import { migrateModuleProperties, buildCompanyInfoFromLegacy } from '../moduleMigrations'
import {
  defaultContactItems,
  readContactItems,
  buildContactRowHtml,
} from '@/constants/contactItems'

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

describe('migrateModuleProperties - 버튼 안쪽 여백 4방향 확장', () => {
  it('단일 버튼: buttonPaddingV → 상/하에 복사하고 좌우는 0px, 레거시 키 제거', () => {
    const result = migrateModuleProperties('ModuleOneButton', {
      buttonPaddingV: '20px',
      buttonText: '큰 버튼',
    })
    expect(result.buttonPaddingTop).toBe('20px')
    expect(result.buttonPaddingBottom).toBe('20px')
    expect(result.buttonPaddingRight).toBe('0px')
    expect(result.buttonPaddingLeft).toBe('0px')
    expect(result.buttonPaddingV).toBeUndefined()
    expect(result.buttonText).toBe('큰 버튼')
  })

  it('복수 버튼: 두 버튼의 레거시 값을 각각 변환함', () => {
    const result = migrateModuleProperties('ModuleTwoButton', {
      button1PaddingV: '12px',
      button2PaddingV: '18px',
    })
    expect(result.button1PaddingTop).toBe('12px')
    expect(result.button1PaddingBottom).toBe('12px')
    expect(result.button2PaddingTop).toBe('18px')
    expect(result.button2PaddingBottom).toBe('18px')
  })

  it('이미 4방향 값이 있으면 건드리지 않음', () => {
    const props = { buttonPaddingTop: '8px', buttonPaddingV: '20px' }
    const result = migrateModuleProperties('ModuleOneButton', props)
    expect(result.buttonPaddingTop).toBe('8px')
    expect(result).toBe(props)
  })

  it('변환 대상이 없으면 원본을 그대로 반환함', () => {
    const props = { buttonText: '버튼' }
    expect(migrateModuleProperties('ModuleOneButton', props)).toBe(props)
  })
})

describe('migrateModuleProperties - SNS 아이콘 자리채움 링크 제거', () => {
  it("'#'로 저장된 링크를 빈 값으로 바꾸고 실제 주소는 유지함", () => {
    const next = migrateModuleProperties('ModuleSnsIcons', {
      snsIcons: [
        { key: 'home', show: true, url: '#' },
        { key: 'zuzuzu', show: false, url: 'https://kcoupet.com/' },
      ],
    })
    expect(next.snsIcons).toEqual([
      { key: 'home', show: true, url: '' },
      { key: 'zuzuzu', show: false, url: 'https://kcoupet.com/' },
    ])
  })

  it("'#'가 없으면 원본을 그대로 반환함", () => {
    const props = { snsIcons: [{ key: 'home', show: true, url: '' }] }
    expect(migrateModuleProperties('ModuleSnsIcons', props)).toBe(props)
  })
})

describe('푸터 연락처(H·T·E·F) 항목', () => {
  it('구버전 속성에서 기본 항목을 만든다 (팩스는 기본 숨김)', () => {
    const items = defaultContactItems({
      websiteUrl: 'www.a.com',
      phone: '02-1111-2222',
      email: 'a@b.com',
      fax: '02-3333-4444',
    })
    expect(items.map((i) => i.key)).toEqual(['website', 'phone', 'email', 'fax'])
    expect(items.map((i) => i.show)).toEqual([true, true, true, false])
    expect(items[1].value).toBe('02-1111-2222')
  })

  it('show 플래그가 false면 숨김으로 읽는다', () => {
    const items = defaultContactItems({ showPhone: false, showFax: true })
    expect(items.find((i) => i.key === 'phone')?.show).toBe(false)
    expect(items.find((i) => i.key === 'fax')?.show).toBe(true)
  })

  it('저장된 배열이 있으면 그 순서를 그대로 쓴다', () => {
    const saved = [
      { key: 'email' as const, show: true, value: 'a@b.com' },
      { key: 'website' as const, show: false, value: 'www.a.com' },
    ]
    const items = readContactItems({ contactItems: saved })
    expect(items.slice(0, 2).map((i) => i.key)).toEqual(['email', 'website'])
    // 빠진 항목은 숨김으로 보강
    expect(items.map((i) => i.key).sort()).toEqual(['email', 'fax', 'phone', 'website'])
  })

  it('표시 항목만 순서대로 HTML을 만든다', () => {
    const html = buildContactRowHtml([
      { key: 'email', show: true, value: 'a@b.com' },
      { key: 'phone', show: false, value: '02-1111-2222' },
      { key: 'website', show: true, value: 'www.a.com' },
    ])
    expect(html.indexOf('<strong>E</strong> a@b.com')).toBeLessThan(
      html.indexOf('<strong>H</strong> www.a.com'),
    )
    expect(html).not.toContain('02-1111-2222')
  })
})
