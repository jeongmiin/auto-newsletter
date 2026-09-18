/**
 * 테이블 셀 글자 크기 렌더링 검증.
 *
 * 크기는 두 층으로 나뉜다:
 *   - 셀 바탕 크기 = `cell.fontSize` → td/th 의 인라인 style
 *   - 드래그로 고른 부분만 다르게 준 크기 = `cell.content` 안의 <span style="font-size:…">
 * 아래는 두 층이 서로를 지우지 않고, 크기를 정한 적 없는 기존 표가 그대로 보이는지를 지킨다.
 */
import { describe, it, expect } from 'vitest'
import { replaceModuleTableContent, TABLE_CELL_DEFAULT_FONT_SIZE } from '../moduleContentReplacer'

const TEMPLATE = '<table><tbody>{{tableContent}}</tbody></table>'

const makeCell = (overrides: Record<string, unknown>) => ({
  id: 'c',
  type: 'td',
  content: 'x',
  colspan: 1,
  rowspan: 1,
  ...overrides,
})

describe('replaceModuleTableContent - 셀 글자 크기', () => {
  it('크기를 정하지 않은 셀은 기본값으로 나간다', () => {
    const cells = [[makeCell({ content: '내용' })]]
    const result = replaceModuleTableContent(TEMPLATE, { tableCells: cells })
    expect(result).toContain(`font-size:${TABLE_CELL_DEFAULT_FONT_SIZE}`)
  })

  it('기본값은 14px에서 움직이지 않는다', () => {
    // 이 값이 바뀌면 크기를 정한 적 없는 **기존 뉴스레터가 통째로** 달라 보인다
    expect(TABLE_CELL_DEFAULT_FONT_SIZE).toBe('14px')
  })

  it('셀에 정한 크기가 기본값을 대신한다', () => {
    const cells = [[makeCell({ content: '내용', fontSize: '24px' })]]
    const result = replaceModuleTableContent(TEMPLATE, { tableCells: cells })
    expect(result).toContain('font-size:24px')
    expect(result).not.toContain('font-size:14px')
  })

  it('셀마다 크기를 다르게 줄 수 있다', () => {
    const cells = [
      [makeCell({ type: 'th', content: '제목', fontSize: '20px' }), makeCell({ content: '내용' })],
    ]
    const result = replaceModuleTableContent(TEMPLATE, { tableCells: cells })
    expect(result).toContain('font-size:20px')
    expect(result).toContain('font-size:14px')
  })

  it('부분 지정(인라인 span)은 셀 바탕 크기와 함께 살아남는다', () => {
    const cells = [
      [
        makeCell({
          content: '<p><span style="font-size: 12px;">작게</span>기본</p>',
          fontSize: '24px',
        }),
      ],
    ]
    const result = replaceModuleTableContent(TEMPLATE, { tableCells: cells })
    // 셀 바탕은 24px, 드래그로 고른 '작게'만 12px
    expect(result).toContain('font-size:24px')
    expect(result).toContain('font-size: 12px')
  })
})
