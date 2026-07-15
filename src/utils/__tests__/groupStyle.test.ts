import { describe, it, expect } from 'vitest'
import {
  groupBorderShorthand,
  groupDivStyle,
  wrapGroupHtmlForEmail,
  resolveGroupStyles,
  DEFAULT_GROUP_STYLES,
  columnCellStyle,
  buildColumnLayoutHtml,
  COLUMN_BREAKPOINT_PX,
  groupBoxSide,
  groupBoxShorthand,
} from '@/utils/groupStyle'

describe('groupStyle', () => {
  describe('groupBorderShorthand', () => {
    it('두께가 0이면 빈 문자열', () => {
      expect(groupBorderShorthand({ borderWidth: '0px' })).toBe('')
      expect(groupBorderShorthand({ borderWidth: '0' })).toBe('')
      expect(groupBorderShorthand({})).toBe('')
    })

    it('두께가 있으면 단축 표기 생성', () => {
      expect(
        groupBorderShorthand({ borderWidth: '1px', borderStyle: 'dashed', borderColor: '#f00' }),
      ).toBe('1px dashed #f00')
    })

    it('스타일/색상 미지정 시 기본값 사용', () => {
      expect(groupBorderShorthand({ borderWidth: '2px' })).toBe('2px solid #000000')
    })
  })

  describe('groupDivStyle', () => {
    it('빈 스타일은 빈 객체', () => {
      expect(groupDivStyle({})).toEqual({})
    })

    it('0값 padding/margin은 제외', () => {
      expect(groupDivStyle({ padding: '0px', margin: '0px 0px' })).toEqual({})
    })

    it('일부 변만 선택하면 해당 border-{side}만 적용', () => {
      const style = groupDivStyle({
        borderWidth: '1px',
        borderColor: '#ccc',
        borderSides: ['top', 'bottom'],
      })
      expect(style.borderTop).toBe('1px solid #ccc')
      expect(style.borderBottom).toBe('1px solid #ccc')
      expect(style.borderLeft).toBeUndefined()
      expect(style.borderRight).toBeUndefined()
      expect(style.border).toBeUndefined()
    })

    it('borderSides가 빈 배열이면 테두리 없음', () => {
      const style = groupDivStyle({ borderWidth: '2px', borderColor: '#000', borderSides: [] })
      expect(style.border).toBeUndefined()
      expect(style.borderTop).toBeUndefined()
    })

    it('실제 값만 포함', () => {
      expect(
        groupDivStyle({
          backgroundColor: '#fff',
          borderWidth: '1px',
          borderColor: '#ccc',
          padding: '16px',
          margin: '10px 0',
        }),
      ).toEqual({
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        padding: '16px',
        margin: '10px 0',
      })
    })
  })

  describe('resolveGroupStyles', () => {
    it('포인트 색상 플래그가 켜지면 배경/테두리 색을 포인트 색으로 덮어쓴다', () => {
      const out = resolveGroupStyles(
        {
          backgroundColor: '#ffffff',
          backgroundColorUsePoint: true,
          borderColor: '#dddddd',
          borderColorUsePoint: true,
        },
        '#ff0000',
      )
      expect(out.backgroundColor).toBe('#ff0000')
      expect(out.borderColor).toBe('#ff0000')
    })

    it('배경이 비어있으면(배경색 미사용) 포인트 색을 적용하지 않는다', () => {
      const out = resolveGroupStyles(
        { backgroundColor: '', backgroundColorUsePoint: true },
        '#ff0000',
      )
      expect(out.backgroundColor).toBe('')
    })

    it('플래그가 꺼져 있으면 수동 색을 유지한다', () => {
      const out = resolveGroupStyles(
        { backgroundColor: '#ffffff', borderColor: '#dddddd' },
        '#ff0000',
      )
      expect(out.backgroundColor).toBe('#ffffff')
      expect(out.borderColor).toBe('#dddddd')
    })

    it('pointColor가 없으면 원본을 그대로 반환', () => {
      const s = { backgroundColor: '#fff', backgroundColorUsePoint: true }
      expect(resolveGroupStyles(s, '')).toBe(s)
    })
  })

  describe('wrapGroupHtmlForEmail', () => {
    it('단일 셀 table로 감싼다', () => {
      const html = wrapGroupHtmlForEmail('<p>inner</p>', DEFAULT_GROUP_STYLES, '#ffffff')
      expect(html).toContain('<table')
      expect(html).toContain('role="presentation"')
      expect(html).toContain('<p>inner</p>')
      expect(html).toContain('</table>')
    })

    it('배경/테두리/안쪽여백은 td에, 바깥여백은 table에 적용', () => {
      const html = wrapGroupHtmlForEmail('X', {
        backgroundColor: '#eee',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: '#000',
        padding: '20px',
        margin: '12px 0',
      }, '#ffffff')
      expect(html).toMatch(/<td style="[^"]*background-color:#eee/)
      expect(html).toMatch(/<td style="[^"]*border:2px solid #000/)
      expect(html).toMatch(/<td style="[^"]*padding:20px/)
      // 바깥 여백(margin)은 바깥쪽 td의 padding으로 처리 (오버플로우 방지)
      expect(html).toMatch(/<td style="padding:12px 0"/)
      // width:100% 테이블에 margin을 직접 주지 않는다
      expect(html).not.toMatch(/<table[^>]*style="[^"]*margin:/)
    })

    it('바깥 여백이 있으면 바깥 td padding으로 감싸 안쪽 테이블을 중첩한다', () => {
      const html = wrapGroupHtmlForEmail('X', { margin: '10px' }, '#ffffff')
      expect(html).toMatch(/<td style="padding:10px"/)
      // 테이블이 2개(바깥 래퍼 + 안쪽 스타일 테이블)
      expect((html.match(/<table/g) || []).length).toBe(2)
    })

    it('바깥 여백이 없으면 안쪽 테이블 하나만 출력', () => {
      const html = wrapGroupHtmlForEmail('X', { backgroundColor: '#eee' }, '#ffffff')
      expect((html.match(/<table/g) || []).length).toBe(1)
    })

    it('스타일이 없으면 td에 style 속성을 넣지 않는다', () => {
      const html = wrapGroupHtmlForEmail('X', {}, '#ffffff')
      expect(html).toContain('<td>')
    })

    it('일부 변만 선택하면 border-{side}만 출력', () => {
      const html = wrapGroupHtmlForEmail('X', {
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#000',
        borderSides: ['top', 'left'],
      }, '#ffffff')
      expect(html).toMatch(/border-top:1px solid #000/)
      expect(html).toMatch(/border-left:1px solid #000/)
      expect(html).not.toMatch(/border-right:/)
      expect(html).not.toMatch(/border-bottom:/)
    })
  })

  describe('그룹 여백 4방향 (안/밖)', () => {
    it('4방향 필드가 없으면 기존 shorthand를 그대로 사용(하위 호환)', () => {
      expect(groupBoxShorthand({ padding: '16px' }, 'padding')).toBe('16px')
      expect(groupBoxShorthand({ margin: '12px 0' }, 'margin')).toBe('12px 0')
      expect(groupBoxShorthand({}, 'padding')).toBe('')
    })

    it('4방향 값이 하나라도 있으면 상·우·하·좌로 조합(미설정 변은 shorthand 폴백)', () => {
      // shorthand 16px + top만 20px 지정 → "20px 16px 16px 16px"
      expect(groupBoxShorthand({ padding: '16px', paddingTop: '20px' }, 'padding')).toBe(
        '20px 16px 16px 16px',
      )
      // 4방향 전부 지정
      expect(
        groupBoxShorthand(
          { marginTop: '4px', marginRight: '8px', marginBottom: '4px', marginLeft: '8px' },
          'margin',
        ),
      ).toBe('4px 8px 4px 8px')
    })

    it('모두 0/빈값이면 빈 문자열', () => {
      expect(
        groupBoxShorthand(
          { paddingTop: '0px', paddingRight: '0', paddingBottom: '0px', paddingLeft: '0' },
          'padding',
        ),
      ).toBe('')
    })

    it('groupBoxSide: 명시 4방향 우선, 없으면 shorthand 파싱값', () => {
      // shorthand "10px 20px" → 상/하 10px, 좌/우 20px
      expect(groupBoxSide({ padding: '10px 20px' }, 'padding', 'top')).toBe('10px')
      expect(groupBoxSide({ padding: '10px 20px' }, 'padding', 'right')).toBe('20px')
      // 명시 필드가 있으면 그 값
      expect(groupBoxSide({ padding: '10px 20px', paddingTop: '30px' }, 'padding', 'top')).toBe(
        '30px',
      )
    })
  })

  describe('columnCellStyle (컬럼 fluid-hybrid)', () => {
    it('컬럼 수에 따라 min-width 비율이 정확히 균등 분할된다', () => {
      expect(columnCellStyle(2)).toContain('min-width:50.0000%')
      expect(columnCellStyle(3)).toContain('min-width:33.3333%')
      expect(columnCellStyle(4)).toContain('min-width:25.0000%')
    })

    it('모바일 스택용 fluid-hybrid width 공식과 inline-block을 포함한다', () => {
      const s = columnCellStyle(2)
      expect(s).toContain('display:inline-block')
      expect(s).toContain(`width:calc((${COLUMN_BREAKPOINT_PX}px - 100%) * ${COLUMN_BREAKPOINT_PX})`)
      expect(s).toContain('max-width:100%')
    })

    it('컬럼 수는 1~4로 클램프된다', () => {
      expect(columnCellStyle(1)).toContain('min-width:100.0000%')
      expect(columnCellStyle(9)).toContain('min-width:25.0000%')
    })
  })

  describe('buildColumnLayoutHtml', () => {
    it('컬럼별 HTML을 각 셀 div로 감싼다', () => {
      const html = buildColumnLayoutHtml(['<p>A</p>', '<p>B</p>'])
      expect((html.match(/display:inline-block/g) || []).length).toBe(2)
      expect(html).toContain('<p>A</p>')
      expect(html).toContain('<p>B</p>')
      // inline-block 공백 제거용 부모 font-size:0
      expect(html).toContain('font-size:0')
    })

    it('빈 컬럼은 &nbsp;로 자리를 유지한다', () => {
      const html = buildColumnLayoutHtml(['<p>A</p>', ''])
      expect(html).toContain('&nbsp;')
    })
  })
})
