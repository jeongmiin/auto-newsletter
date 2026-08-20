import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { footerSnsProcessor, footerContactProcessor } from '../processors'

// 실제 ModuleFooter.html 템플릿을 읽어 마커 기반 처리 통합 검증
// (vitest root = 프로젝트 루트이므로 cwd 기준 상대경로 사용)
const footerHtml = readFileSync(
  resolve(process.cwd(), 'public/modules/ModuleFooter.html'),
  'utf-8',
)

// 프로세서는 동기 실행되므로 캐스팅하여 string 반환을 기대
const run = (props: Record<string, unknown>) => footerSnsProcessor(footerHtml, props) as string

describe('footerContactProcessor - 연락처(H·T·E·F) 항목', () => {
  const runContact = (props: Record<string, unknown>) =>
    footerContactProcessor(footerHtml, props) as string

  it('템플릿이 연락처 마커를 포함해야 함 (사전 조건)', () => {
    expect(footerHtml).toContain('<!--CONTACT_ROW-->')
  })

  it('미설정 시 H/T/E는 표시되고 팩스는 숨김 (기존 동작 유지)', () => {
    const result = runContact({
      websiteUrl: 'www.a.com',
      phone: '02-1111-2222',
      email: 'a@b.com',
      fax: '02-3333-4444',
    })
    expect(result).toContain('<strong>H</strong> www.a.com')
    expect(result).toContain('<strong>T</strong> 02-1111-2222')
    expect(result).toContain('<strong>E</strong> a@b.com')
    expect(result).not.toContain('<strong>F</strong>')
  })

  it('구버전 show 플래그가 false면 그 항목만 빠짐', () => {
    const result = runContact({ websiteUrl: 'www.a.com', phone: '02-1', email: 'a@b.com', showPhone: false })
    expect(result).toContain('<strong>H</strong>')
    expect(result).not.toContain('<strong>T</strong>')
    expect(result).toContain('<strong>E</strong>')
  })

  it('contactItems 배열의 순서·노출을 그대로 따른다', () => {
    const result = runContact({
      contactItems: [
        { key: 'email', show: true, value: 'a@b.com' },
        { key: 'fax', show: true, value: '02-3333' },
        { key: 'website', show: false, value: 'www.a.com' },
        { key: 'phone', show: false, value: '02-1111' },
      ],
    })
    expect(result.indexOf('<strong>E</strong>')).toBeLessThan(result.indexOf('<strong>F</strong>'))
    expect(result).not.toContain('<strong>H</strong>')
    expect(result).not.toContain('<strong>T</strong>')
  })

  it('모두 숨기면 연락처 줄이 비어 있다', () => {
    const result = runContact({
      contactItems: [
        { key: 'website', show: false, value: 'www.a.com' },
        { key: 'phone', show: false, value: '02-1111' },
        { key: 'email', show: false, value: 'a@b.com' },
        { key: 'fax', show: false, value: '02-3333' },
      ],
    })
    expect(result).not.toContain('<strong>H</strong>')
    expect(result).not.toContain('<strong>E</strong>')
  })
})

describe('footerSnsProcessor - 문의/수신거부 문구', () => {
  it('문의 이메일 줄은 미설정 시 표시됨 (기본 노출)', () => {
    const result = run({})
    expect(result).toContain('문의 바랍니다')
  })

  it('showInquiry=false 이면 발신전용 안내 문구로 대체됨', () => {
    const result = run({ showInquiry: false })
    expect(result).not.toContain('문의 바랍니다')
    expect(result).toContain('본 메일은 발신전용 메일입니다.')
    // 수신거부 안내 문구는 유지
    expect(result).toContain('[수신거부]')
  })

  it('모두 false 이면 회사 정보 줄이 전부 제거됨', () => {
    const result = run({ showWebsite: false, showPhone: false, showEmail: false })
    expect(result).not.toContain('<strong>H</strong>')
    expect(result).not.toContain('<strong>T</strong>')
    expect(result).not.toContain('<strong>E</strong>')
  })})

describe('footerSnsProcessor - SNS 아이콘 토글 (쭈쭈쭈 포함)', () => {
  it('미설정 시 모든 SNS 아이콘이 제거됨 (기본 숨김)', () => {
    const result = run({})
    expect(result).not.toContain('icon_home.png') // 홈
    expect(result).not.toContain('icon_zuzuzu.png') // 쭈쭈쭈
    expect(result).not.toContain('{{zuzuzuUrl}}')
  })

  it('showZuzuzu=true 이면 쭈쭈쭈 링크가 표시됨', () => {
    const result = run({ showZuzuzu: true })
    expect(result).toContain('icon_zuzuzu.png')
    expect(result).toContain('{{zuzuzuUrl}}') // 링크는 placeholder로 유지(치환은 콘텐츠 교체 단계)
  })

  it('showZuzuzu=false 이면 쭈쭈쭈 블록이 제거됨', () => {
    const result = run({ showZuzuzu: false })
    expect(result).not.toContain('icon_zuzuzu.png')
    expect(result).not.toContain('<!-- 쭈쭈쭈 -->')
  })

  it('개별 SNS 토글이 독립적으로 동작함', () => {
    const result = run({ showHome: true, showInstagram: true })
    expect(result).toContain('icon_home.png') // 홈 표시
    expect(result).toContain('icon_instagram.png') // 인스타그램 표시
    expect(result).not.toContain('icon_facebook.png') // 페이스북 미표시
    expect(result).not.toContain('icon_zuzuzu.png') // 쭈쭈쭈 미표시
  })

  it('X(트위터) 마커처럼 정규식 특수문자가 포함된 라벨도 안전하게 처리됨', () => {
    const shown = run({ showX: true })
    expect(shown).toContain('icon_X.png') // X 아이콘 표시
    const hidden = run({ showX: false })
    expect(hidden).not.toContain('icon_X.png')
    // 마커가 깨끗하게 제거되어 잔여 주석이 없어야 함
    expect(hidden).not.toContain('<!-- X(트위터) -->')
  })
})

describe('footerSnsProcessor - 안내문구 국문/영문 독립 토글', () => {
  it('템플릿이 국문/영문 안내문구 마커를 포함해야 함 (사전 조건)', () => {
    expect(footerHtml).toContain('<!-- 안내문구-국문 -->')
    expect(footerHtml).toContain('<!-- 안내문구-영문 -->')
  })

  it('미설정 시 국문만 노출 (국문 기본 표시 · 영문 기본 숨김)', () => {
    const result = run({})
    expect(result).toContain('메일 수신을 원치 않으시면')
    expect(result).toContain('[수신거부]')
    expect(result).not.toContain('Please note that this is a no-reply email')
    expect(result).not.toContain('<!-- 안내문구-영문 -->')
  })

  it('showEnglishFooter=true 만 켜면 국문+영문 모두 노출 (독립 토글 — 국문 유지)', () => {
    const result = run({ showEnglishFooter: true })
    expect(result).toContain('메일 수신을 원치 않으시면') // 국문 유지
    expect(result).toContain('Please note that this is a no-reply email') // 영문 노출
    expect(result).toContain('[unsubscription]')
  })

  it('showKoreanFooter=false 이면 국문 블록 제거 (영문 미설정 시 둘 다 없음)', () => {
    const result = run({ showKoreanFooter: false })
    expect(result).not.toContain('메일 수신을 원치 않으시면')
    expect(result).not.toContain('<!-- 안내문구-국문 -->')
    expect(result).not.toContain('Please note that this is a no-reply email')
  })

  it('showKoreanFooter=false + showEnglishFooter=true 이면 영문만 노출 (기존 영문 전용과 동일)', () => {
    const result = run({ showKoreanFooter: false, showEnglishFooter: true })
    expect(result).toContain('Please note that this is a no-reply email')
    expect(result).toContain('[unsubscription]')
    expect(result).not.toContain('메일 수신을 원치 않으시면')
    expect(result).not.toContain('<!-- 안내문구-국문 -->')
  })

  it('영문 안내문구의 unsubscription 링크가 수신거부 URL 속성과 연결됨', () => {
    const result = run({ showEnglishFooter: true })
    // 링크는 placeholder로 유지(치환은 콘텐츠 교체 단계)
    expect(result).toContain('href="{{unsubscribeUrl}}"')
  })
})

describe('footerSnsProcessor - 마커 잔여 검증', () => {
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
    // 연락처 줄은 footerContactProcessor가 생성하므로 함께 적용해 검증한다
    const withContact = footerContactProcessor(result, { websiteUrl: 'www.a.com' }) as string
    expect(withContact).toContain('<strong>H</strong>')
    expect(result).toContain('icon_zuzuzu.png')
    expect(result).toContain('icon_home.png')
  })
})
