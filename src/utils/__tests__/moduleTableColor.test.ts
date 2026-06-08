import { describe, it, expect } from 'vitest'
import { replaceModuleTableContent } from '../moduleContentReplacer'

// 커스텀 테이블 셀별 배경색/글자색 렌더링 검증
// 우선순위: 셀 지정값 > 타입별(th/td) 일괄 색상 > 시스템 기본값
const TEMPLATE = '<table><tbody>{{tableContent}}</tbody></table>'

const makeCell = (overrides: Record<string, unknown>) => ({
  id: 'c',
  type: 'td',
  content: 'x',
  colspan: 1,
  rowspan: 1,
  ...overrides,
})

describe('replaceModuleTableContent - 셀별 색상', () => {
  it('셀 색상 미지정 시 타입별 일괄 색상이 적용됨 (th/td 구분)', () => {
    const cells = [[makeCell({ type: 'th', content: '제목' }), makeCell({ type: 'td', content: '내용' })]]
    const result = replaceModuleTableContent(TEMPLATE, { tableCells: cells })
    // th 기본 배경 #f6f6f6, td 기본 배경 #ffffff
    expect(result).toContain('background:#f6f6f6')
    expect(result).toContain('background:#ffffff')
  })

  it('셀에 지정한 배경색·글자색이 우선 적용됨', () => {
    const cells = [[makeCell({ type: 'td', content: '강조', bgColor: '#ff0000', textColor: '#00ff00' })]]
    const result = replaceModuleTableContent(TEMPLATE, { tableCells: cells })
    expect(result).toContain('background:#ff0000')
    expect(result).toContain('color:#00ff00')
  })

  it('배경색만 지정하면 글자색은 타입별 일괄 색상으로 폴백됨', () => {
    const cells = [[makeCell({ type: 'td', content: '내용', bgColor: '#123456' })]]
    const result = replaceModuleTableContent(TEMPLATE, {
      tableCells: cells,
      cellTextColor: '#abcdef',
    })
    expect(result).toContain('background:#123456')
    expect(result).toContain('color:#abcdef') // td 일괄 글자색 폴백
  })

  it('셀 지정값이 모듈 단위 일괄 색상보다 우선함', () => {
    const cells = [[makeCell({ type: 'th', content: '제목', bgColor: '#aaaaaa' })]]
    const result = replaceModuleTableContent(TEMPLATE, {
      tableCells: cells,
      headerBgColor: '#000000', // 일괄 헤더 배경
    })
    // 셀 지정값이 우선
    expect(result).toContain('background:#aaaaaa')
    expect(result).not.toContain('background:#000000')
  })

  it('빈 문자열 색상은 폴백으로 처리됨 (|| 연산)', () => {
    const cells = [[makeCell({ type: 'td', content: '내용', bgColor: '', textColor: '' })]]
    const result = replaceModuleTableContent(TEMPLATE, { tableCells: cells })
    expect(result).toContain('background:#ffffff') // td 기본
  })
})

describe('replaceModuleTableContent - 부분 굵게(**마커**)', () => {
  it('**…** 로 감싼 구간만 <strong>으로 변환됨', () => {
    const cells = [[makeCell({ content: '일반 **강조** 텍스트' })]]
    const result = replaceModuleTableContent(TEMPLATE, { tableCells: cells })
    expect(result).toContain('<strong style="font-weight:700;">강조</strong>')
    expect(result).toContain('일반 ')
    expect(result).toContain(' 텍스트')
  })

  it('마커가 없으면 변환되지 않음', () => {
    const cells = [[makeCell({ content: '굵게 없음' })]]
    const result = replaceModuleTableContent(TEMPLATE, { tableCells: cells })
    expect(result).not.toContain('<strong')
  })

  it('HTML escape 이후에만 변환되어 태그 주입이 방지됨', () => {
    const cells = [[makeCell({ content: '**<script>**' })]]
    const result = replaceModuleTableContent(TEMPLATE, { tableCells: cells })
    expect(result).toContain('<strong style="font-weight:700;">&lt;script&gt;</strong>')
    expect(result).not.toContain('<script>')
  })
})
