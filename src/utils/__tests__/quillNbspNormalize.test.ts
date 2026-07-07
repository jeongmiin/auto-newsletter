import { describe, it, expect } from 'vitest'
import { normalizeNbspForWordBreak, processQuillHtml } from '../quillHtmlProcessor'

describe('normalizeNbspForWordBreak (띄어쓰기 &nbsp; → 일반 공백)', () => {
  it('단어 사이 &nbsp;는 일반 공백으로 바뀐다 (word-break 동작용)', () => {
    expect(normalizeNbspForWordBreak('가나&nbsp;다라')).toBe('가나 다라')
    expect(normalizeNbspForWordBreak('a&nbsp;b&nbsp;c')).toBe('a b c')
  })

  it('리터럴 U+00A0(타이핑된 공백)도 일반 공백으로 바뀐다', () => {
    expect(normalizeNbspForWordBreak('가나 다라')).toBe('가나 다라')
  })

  it('빈 줄 스페이서(>&nbsp;<)는 보존한다', () => {
    expect(normalizeNbspForWordBreak('<p style="line-height:1.7;">&nbsp;</p>')).toBe(
      '<p style="line-height:1.7;">&nbsp;</p>',
    )
  })

  it('본문 &nbsp;는 공백으로, 빈 줄 스페이서는 유지 (혼합)', () => {
    const input = '<p>케이팜&nbsp;소식</p><p>&nbsp;</p><p>안녕&nbsp;하세요</p>'
    expect(normalizeNbspForWordBreak(input)).toBe(
      '<p>케이팜 소식</p><p>&nbsp;</p><p>안녕 하세요</p>',
    )
  })

  it('빈 값은 빈 문자열', () => {
    expect(normalizeNbspForWordBreak('')).toBe('')
  })
})

describe('processQuillHtml — &nbsp; 정규화 통합', () => {
  it('본문 &nbsp;가 일반 공백이 되어 keep-all/break-all이 실제로 끊을 수 있게 된다', () => {
    const out = processQuillHtml('<p style="word-break:keep-all;">케이팜&nbsp;소식&nbsp;공개</p>')
    expect(out).toContain('케이팜 소식 공개')
    expect(out).not.toContain('케이팜&nbsp;소식')
  })

  it('엔터 빈 줄 스페이서는 &nbsp;로 유지된다 (여백 보존)', () => {
    const out = processQuillHtml('<p><br></p>')
    expect(out).toContain('&nbsp;')
  })
})
