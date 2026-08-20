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

describe('replaceModuleTableContent - 텍스트 셀 HTML 렌더', () => {
  // 셀 내용 편집기가 Quill 리치 에디터로 바뀌어, 내용은 HTML을 그대로 렌더한다
  // (정제는 렌더/내보내기 공통 파이프라인의 sanitizeHtml이 담당).
  it('리치 텍스트(HTML)를 그대로 렌더한다', () => {
    const cells = [[makeCell({ content: '<p>일반 <strong>강조</strong> 텍스트</p>' })]]
    const result = replaceModuleTableContent(TEMPLATE, { tableCells: cells })
    expect(result).toContain('<p>일반 <strong>강조</strong> 텍스트</p>')
  })

  it('일반 텍스트(태그 없음)도 그대로 렌더한다', () => {
    const cells = [[makeCell({ content: '항목 1' })]]
    const result = replaceModuleTableContent(TEMPLATE, { tableCells: cells })
    expect(result).toContain('항목 1')
  })

  it('이미지 셀은 <img>로 렌더된다', () => {
    const cells = [[makeCell({ type: 'td', content: '', contentType: 'image', imageUrl: 'https://x/y.png', imageAlt: '설명' })]]
    const result = replaceModuleTableContent(TEMPLATE, { tableCells: cells })
    expect(result).toContain('<img src="https://x/y.png"')
    expect(result).toContain('alt="설명"')
  })
})

describe('replaceModuleTableContent - 옛 셀 내용 형식 안전망', () => {
  it('마이그레이션을 거치지 않은 **굵게**·\n도 렌더 시점에 변환한다', () => {
    const cells = [[makeCell({ content: '**주의**\n둘째 줄' })]]
    const result = replaceModuleTableContent(TEMPLATE, { tableCells: cells })
    expect(result).toContain('<strong style="font-weight:700;">주의</strong><br>둘째 줄')
  })

  it('리치 HTML 셀은 그대로 내보낸다', () => {
    const cells = [[makeCell({ content: '<p>이미 <strong>서식</strong>이 있다</p>' })]]
    const result = replaceModuleTableContent(TEMPLATE, { tableCells: cells })
    expect(result).toContain('<p>이미 <strong>서식</strong>이 있다</p>')
  })
})

describe('replaceModuleTableContent - 옛 이미지 셀 안전망', () => {
  it('contentType 없이 imageUrl만 있어도 이미지로 렌더한다', () => {
    const cells = [[makeCell({ content: '내용', imageUrl: 'https://example.com/a.png' })]]
    const result = replaceModuleTableContent(TEMPLATE, { tableCells: cells })
    expect(result).toContain('<img src="https://example.com/a.png"')
    expect(result).toContain('padding:0')
    expect(result).not.toContain('>내용<')
  })

  it('텍스트로 지정한 셀은 옛 imageUrl이 남아 있어도 텍스트로 렌더한다', () => {
    const cells = [[makeCell({ content: '내용', contentType: 'text', imageUrl: 'https://example.com/a.png' })]]
    const result = replaceModuleTableContent(TEMPLATE, { tableCells: cells })
    expect(result).toContain('>내용<')
    expect(result).not.toContain('<img')
  })
})

describe('replaceModuleTableContent - 타입(제목/내용) 공통 정렬', () => {
  it('직접 고른 공통 정렬이 레거시 열 공통 정렬을 이긴다', () => {
    const cells = [[makeCell({ type: 'th', content: '제목' }), makeCell({ type: 'td', content: '내용' })]]
    const result = replaceModuleTableContent(TEMPLATE, {
      tableCells: cells,
      tableColAligns: ['center', 'center'],
      headerAlign: 'right',
    })
    // 제목: 직접 고른 right, 내용: 아직 안 골랐으므로 레거시 열 공통 center 유지
    expect(result).toContain('text-align:right')
    expect(result).toContain('text-align:center')
    expect(result).not.toContain('text-align:left')
  })

  it('공통 정렬을 고르지 않았으면 레거시 열 공통 정렬이 그대로 쓰인다', () => {
    const cells = [[makeCell({ type: 'td', content: '내용' })]]
    const result = replaceModuleTableContent(TEMPLATE, {
      tableCells: cells,
      tableColAligns: ['right'],
    })
    expect(result).toContain('text-align:right')
  })

  it('셀별 지정은 공통 정렬보다 우선한다', () => {
    const cells = [[makeCell({ type: 'td', content: '내용', align: 'center' })]]
    const result = replaceModuleTableContent(TEMPLATE, { tableCells: cells, cellAlign: 'right' })
    expect(result).toContain('text-align:center')
  })
})
