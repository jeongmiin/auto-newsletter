import { describe, it, expect } from 'vitest'
import {
  removeTableFromHtml,
  removeButtonFromHtml,
  removeSubTitleDiv,
  generateTableRowsHtml,
  stylesToCssString,
  applyStylesToHtml,
  removeMarker,
  replaceSequentially,
  generateUniqueId,
} from '../htmlUtils'
import type { TableRow } from '@/types'

describe('htmlUtils', () => {
  describe('removeTableFromHtml', () => {
    it('테이블 요소를 제거해야 함', () => {
      const html = `
        <tr>
          <td style="padding:0px 20px; box-sizing: border-box;">
            <table align="center">
              <tr><td>테이블 내용</td></tr>
            </table>
          </td>
        </tr>
      `

      const result = removeTableFromHtml(html)

      expect(result).not.toContain('테이블 내용')
      expect(result.trim()).toBe('')
    })

    it('테이블이 없으면 원본 HTML을 반환해야 함', () => {
      const html = '<div>테이블 없음</div>'

      const result = removeTableFromHtml(html)

      expect(result).toBe(html)
    })
  })

  describe('removeButtonFromHtml', () => {
    it('버튼 요소를 제거해야 함', () => {
      const html = `
        <!-- 버튼 -->
        <tr>
          <td align="center"><a href="#">버튼</a></td>
        </tr>
        <!-- //버튼 -->
      `

      const result = removeButtonFromHtml(html)

      expect(result).not.toContain('버튼')
    })

    it('버튼이 없으면 원본 HTML을 반환해야 함', () => {
      const html = '<div>버튼 없음</div>'

      const result = removeButtonFromHtml(html)

      expect(result).toBe(html)
    })
  })

  describe('removeSubTitleDiv', () => {
    it('주석으로 마킹된 서브 타이틀을 제거해야 함', () => {
      const html = `
        <h1>메인 타이틀</h1>
        <!-- 서브 타이틀 -->
        <tr><td>서브 타이틀</td></tr>
        <!-- //서브 타이틀 -->
      `

      const result = removeSubTitleDiv(html)

      expect(result).not.toContain('서브 타이틀')
      expect(result).toContain('메인 타이틀')
    })

    it('플레이스홀더를 포함하는 서브 타이틀을 제거해야 함', () => {
      const html = `
        <h1>메인 타이틀</h1>
        <tr><td>{{subTitle}}</td></tr>
      `

      const result = removeSubTitleDiv(html)

      expect(result).not.toContain('{{subTitle}}')
    })

    it('여러 패턴의 서브 타이틀을 모두 처리해야 함', () => {
      const html = `
        <div>서브 타이틀 영역</div>
        <tr><td>{{subTitle}}</td></tr>
      `

      const result = removeSubTitleDiv(html)

      expect(result).not.toContain('서브 타이틀 영역')
      expect(result).not.toContain('{{subTitle}}')
    })
  })

  describe('generateTableRowsHtml', () => {
    it('테이블 행 HTML을 생성해야 함', () => {
      const rows: TableRow[] = [
        { id: '1', header: '항목1', data: '내용1' },
        { id: '2', header: '항목2', data: '내용2' },
      ]

      const result = generateTableRowsHtml(rows)

      expect(result).toContain('항목1')
      expect(result).toContain('내용1')
      expect(result).toContain('항목2')
      expect(result).toContain('내용2')
    })

    it('빈 배열에 대해 빈 문자열을 반환해야 함', () => {
      const rows: TableRow[] = []

      const result = generateTableRowsHtml(rows)

      expect(result).toBe('')
    })

    it('빈 값에 대해 오류 없이 처리해야 함', () => {
      const rows: TableRow[] = [{ id: '1', header: '', data: '' }]

      const result = generateTableRowsHtml(rows)

      expect(result).toContain('<tr>')
      expect(result).toContain('</tr>')
    })

    it('특수 문자를 포함한 데이터를 처리해야 함', () => {
      const rows: TableRow[] = [
        { id: '1', header: 'A & B', data: '<script>alert("XSS")</script>' },
      ]

      const result = generateTableRowsHtml(rows)

      expect(result).toBeDefined()
    })
  })

  describe('stylesToCssString', () => {
    it('스타일 객체를 CSS 문자열로 변환해야 함', () => {
      const styles = {
        backgroundColor: '#ff0000',
        fontSize: '16px',
        padding: '10px',
      }

      const result = stylesToCssString(styles)

      expect(result).toContain('background-color: #ff0000')
      expect(result).toContain('font-size: 16px')
      expect(result).toContain('padding: 10px')
    })

    it('camelCase를 kebab-case로 변환해야 함', () => {
      const styles = {
        marginTop: '20px',
        borderBottomWidth: '2px',
      }

      const result = stylesToCssString(styles)

      expect(result).toContain('margin-top')
      expect(result).toContain('border-bottom-width')
    })

    it('빈 값을 필터링해야 함', () => {
      const styles = {
        color: '#000',
        backgroundColor: '',
        fontSize: null,
        padding: undefined,
      }

      const result = stylesToCssString(styles)

      expect(result).toContain('color: #000')
      expect(result).not.toContain('backgroundColor')
      expect(result).not.toContain('fontSize')
      expect(result).not.toContain('padding')
    })

    it('빈 객체에 대해 빈 문자열을 반환해야 함', () => {
      const styles = {}

      const result = stylesToCssString(styles)

      expect(result).toBe('')
    })
  })

  describe('applyStylesToHtml', () => {
    it('table 태그에 스타일을 적용해야 함', () => {
      const html = '<table><tr><td>내용</td></tr></table>'
      const styles = {
        backgroundColor: '#f0f0f0',
        width: '600px',
      }

      const result = applyStylesToHtml(html, styles)

      expect(result).toContain('style="background-color: #f0f0f0; width: 600px"')
    })

    it('div 태그에 스타일을 적용해야 함', () => {
      const html = '<div>내용</div>'
      const styles = {
        padding: '20px',
      }

      const result = applyStylesToHtml(html, styles)

      expect(result).toContain('style="padding: 20px"')
    })

    it('스타일이 비어있으면 원본 HTML을 반환해야 함', () => {
      const html = '<div>내용</div>'
      const styles = {}

      const result = applyStylesToHtml(html, styles)

      expect(result).toBe(html)
    })

    it('첫 번째 요소에만 스타일을 적용해야 함', () => {
      const html = '<div>첫번째</div><div>두번째</div>'
      const styles = { color: 'red' }

      const result = applyStylesToHtml(html, styles)

      const matches = result.match(/style="/g)
      expect(matches).toHaveLength(1)
    })
  })

  describe('removeMarker', () => {
    it('마커를 제거해야 함', () => {
      const html = '<div>{{MARKER}}</div>'
      const marker = '{{MARKER}}'

      const result = removeMarker(html, marker)

      expect(result).toBe('<div></div>')
    })

    it('여러 개의 마커를 모두 제거해야 함', () => {
      const html = '<div>{{MARKER}}</div><p>{{MARKER}}</p>'
      const marker = '{{MARKER}}'

      const result = removeMarker(html, marker)

      expect(result).toBe('<div></div><p></p>')
    })

    it('마커가 없으면 원본 HTML을 반환해야 함', () => {
      const html = '<div>내용</div>'
      const marker = '{{MARKER}}'

      const result = removeMarker(html, marker)

      expect(result).toBe(html)
    })

    it('특수 정규식 문자를 포함한 마커도 처리해야 함', () => {
      const html = '<div>{{TEST.MARKER}}</div>'
      const marker = '{{TEST.MARKER}}'

      const result = removeMarker(html, marker)

      expect(result).toBe('<div></div>')
    })
  })

  describe('replaceSequentially', () => {
    it('순차적으로 교체해야 함', () => {
      const html = '<a href="#"></a><a href="#"></a><a href="#"></a>'
      const pattern = /href="#"/g
      const replacements = ['href="url1"', 'href="url2"', 'href="url3"']

      const result = replaceSequentially(html, pattern, replacements)

      expect(result).toBe('<a href="url1"></a><a href="url2"></a><a href="url3"></a>')
    })

    it('교체 값이 부족하면 빈 문자열로 교체해야 함', () => {
      const html = '<div>{{1}}</div><div>{{2}}</div>'
      const pattern = /\{\{\d+\}\}/g
      const replacements = ['첫번째']

      const result = replaceSequentially(html, pattern, replacements)

      expect(result).toBe('<div>첫번째</div><div></div>')
    })

    it('undefined 값을 빈 문자열로 처리해야 함', () => {
      const html = '<div>{{1}}</div><div>{{2}}</div>'
      const pattern = /\{\{\d+\}\}/g
      const replacements = ['첫번째', undefined]

      const result = replaceSequentially(html, pattern, replacements)

      expect(result).toBe('<div>첫번째</div><div></div>')
    })

    it('패턴이 없으면 원본 HTML을 반환해야 함', () => {
      const html = '<div>내용</div>'
      const pattern = /{{test}}/g
      const replacements = ['대체']

      const result = replaceSequentially(html, pattern, replacements)

      expect(result).toBe(html)
    })
  })

  describe('generateUniqueId', () => {
    it('고유한 ID를 생성해야 함', () => {
      const id1 = generateUniqueId()
      const id2 = generateUniqueId()

      expect(id1).not.toBe(id2)
    })

    it('접두사가 포함되어야 함', () => {
      const id = generateUniqueId('module')

      expect(id).toMatch(/^module-/)
    })

    it('기본 접두사는 "id"여야 함', () => {
      const id = generateUniqueId()

      expect(id).toMatch(/^id-/)
    })

    it('타임스탬프가 포함되어야 함', () => {
      const id = generateUniqueId('test')
      const parts = id.split('-')

      expect(parts.length).toBeGreaterThanOrEqual(3)
      expect(Number(parts[1])).toBeGreaterThan(0)
    })

    it('랜덤 문자열이 포함되어야 함', () => {
      const id = generateUniqueId('test')
      const parts = id.split('-')

      expect(parts[2]).toMatch(/^[a-z0-9]+$/)
      expect(parts[2].length).toBeGreaterThan(0)
    })

    it('여러 번 호출해도 충돌하지 않아야 함', () => {
      const ids = new Set()
      for (let i = 0; i < 100; i++) {
        ids.add(generateUniqueId())
      }

      expect(ids.size).toBe(100)
    })
  })

  describe('엣지 케이스', () => {
    it('null 입력을 처리해야 함', () => {
      expect(() => removeMarker('', '')).not.toThrow()
      expect(() => stylesToCssString({})).not.toThrow()
    })

    it('매우 긴 HTML을 처리해야 함', () => {
      const longHtml = '<div>' + 'a'.repeat(10000) + '</div>'
      const result = removeMarker(longHtml, 'nonexistent')

      expect(result).toBe(longHtml)
    })

    it('특수 문자가 포함된 HTML을 처리해야 함', () => {
      const html = '<div>한글 & <special> 문자 "테스트"</div>'
      const result = removeMarker(html, 'nonexistent')

      expect(result).toBe(html)
    })
  })
})