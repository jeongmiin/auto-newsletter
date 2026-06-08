import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { replaceModuleFooterContent } from '../moduleContentReplacer'

// 실제 ModuleFooter.html을 읽어 companyInfo 합성/렌더링을 검증
const footerHtml = readFileSync(resolve(process.cwd(), 'public/modules/ModuleFooter.html'), 'utf-8')

describe('replaceModuleFooterContent - 회사 정보(companyInfo)', () => {
  it('템플릿이 {{companyInfo}} 자리표시자를 사용하고 구버전 자리표시자는 없어야 함', () => {
    expect(footerHtml).toContain('{{companyInfo}}')
    expect(footerHtml).not.toContain('{{topTextTitle}}')
    expect(footerHtml).not.toContain('{{addressText}}')
  })

  it('companyInfo가 주어지면 그대로 렌더링됨', () => {
    const result = replaceModuleFooterContent(footerHtml, {
      companyInfo: '<p><strong>케이펫페어</strong></p><p>(주)메쎄이상</p>',
    })
    expect(result).toContain('케이펫페어')
    expect(result).toContain('(주)메쎄이상')
    expect(result).not.toContain('{{companyInfo}}')
  })

  it('구버전 필드(topTextTitle/회사명/주소)만 있으면 companyInfo로 합성됨', () => {
    const result = replaceModuleFooterContent(footerHtml, {
      topTextTitle: '고카프 사무국',
      topTextCompany: '(주)메쎄이상',
      addressText: '서울시 마포구 ES타워',
    })
    // 합성된 회사 정보가 모두 출력되어야 함
    expect(result).toContain('고카프 사무국')
    expect(result).toContain('(주)메쎄이상')
    expect(result).toContain('서울시 마포구 ES타워')
    expect(result).not.toContain('{{companyInfo}}')
  })

  it('companyInfo가 있으면 구버전 필드보다 우선함', () => {
    const result = replaceModuleFooterContent(footerHtml, {
      companyInfo: '<p>신규 회사정보</p>',
      topTextTitle: '구버전 제목',
    })
    expect(result).toContain('신규 회사정보')
    expect(result).not.toContain('구버전 제목')
  })
})
