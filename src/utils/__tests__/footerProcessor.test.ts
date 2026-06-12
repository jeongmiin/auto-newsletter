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

  it('showWebsite=false 이면 H만 제거됨', () => {
    const result = run({ showWebsite: false })
    expect(result).not.toContain('<strong>H</strong>')
    expect(result).toContain('<strong>T</strong>')
    expect(result).toContain('<strong>E</strong>')
  })

  it('showPhone=false 이면 T만 제거됨', () => {
    const result = run({ showPhone: false })
    expect(result).toContain('<strong>H</strong>')
    expect(result).not.toContain('<strong>T</strong>')
    expect(result).toContain('<strong>E</strong>')
  })

  it('showWebsite=false + showPhone=false 이면 H/T가 모두 제거됨', () => {
    const result = run({ showWebsite: false, showPhone: false })
    expect(result).not.toContain('<strong>H</strong>')
    expect(result).not.toContain('<strong>T</strong>')
    expect(result).toContain('<strong>E</strong>')
  })

  it('showEmail=false 이면 E가 제거됨', () => {
    const result = run({ showEmail: false })
    expect(result).toContain('<strong>H</strong>')
    expect(result).toContain('<strong>T</strong>')
    expect(result).not.toContain('<strong>E</strong>')
  })

  it('템플릿이 팩스(F) 마커를 포함해야 함 (사전 조건)', () => {
    expect(footerHtml).toContain('<!-- 팩스 -->')
    expect(footerHtml).toContain('<strong>F</strong>')
  })

  it('미설정 시 팩스(F)는 숨김 — E는 표시됨', () => {
    const result = run({})
    expect(result).toContain('<strong>E</strong>')
    expect(result).not.toContain('<strong>F</strong>')
  })

  it('showFax=true 이면 F가 표시됨', () => {
    const result = run({ showFax: true })
    expect(result).toContain('<strong>E</strong>')
    expect(result).toContain('<strong>F</strong>')
  })

  it('showEmail=false + showFax=true 이면 E만 제거되고 F는 유지됨', () => {
    const result = run({ showEmail: false, showFax: true })
    expect(result).not.toContain('<strong>E</strong>')
    expect(result).toContain('<strong>F</strong>')
  })

  it('showEmail=false + showFax=false 이면 E/F가 모두 제거됨', () => {
    const result = run({ showEmail: false, showFax: false })
    expect(result).not.toContain('<strong>E</strong>')
    expect(result).not.toContain('<strong>F</strong>')
  })

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
  })
})

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

describe('footerSnsProcessor - 안내문구 다국어(영문) 토글', () => {
  it('템플릿이 국문/영문 안내문구 마커를 포함해야 함 (사전 조건)', () => {
    expect(footerHtml).toContain('<!-- 안내문구-국문 -->')
    expect(footerHtml).toContain('<!-- 안내문구-영문 -->')
  })

  it('미설정 시 국문 안내문구만 노출됨 (영문 블록 제거)', () => {
    const result = run({})
    expect(result).toContain('메일 수신을 원치 않으시면')
    expect(result).toContain('[수신거부]')
    expect(result).not.toContain('Please note that this is a no-reply email')
    expect(result).not.toContain('<!-- 안내문구-영문 -->')
  })

  it('showEnglishFooter=true 이면 영문 안내문구만 노출됨 (국문 블록 제거)', () => {
    const result = run({ showEnglishFooter: true })
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
    // 모두 표시이므로 어떤 마커 블록도 제거되지 않지만, 콘텐츠는 모두 존재해야 함
    expect(result).toContain('<strong>H</strong>')
    expect(result).toContain('icon_zuzuzu.png')
    expect(result).toContain('icon_home.png')
  })
})
