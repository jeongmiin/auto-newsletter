import { describe, it, expect } from 'vitest'
import {
  groupBorderShorthand,
  groupDivStyle,
  wrapGroupHtmlForEmail,
  resolveGroupStyles,
  DEFAULT_GROUP_STYLES,
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
})
