import { describe, it, expect } from 'vitest'
import { convertQuillListsToEmailHtml, processQuillHtml } from '../quillHtmlProcessor'

// 설계: 리스트 변환은 최종 내보내기에서만 수행한다.
// 에디터·미리보기 공용 processQuillHtml은 Quill 네이티브 data-list 형식을 그대로 유지한다.

// Quill 2 리스트 출력 → 이메일 호환 리스트 변환 검증

describe('convertQuillListsToEmailHtml', () => {
  it('글머리(bullet) 목록을 <ul> + 인라인 list-style로 변환', () => {
    const input =
      '<ol><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>가</li>' +
      '<li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>나</li></ol>'
    const out = convertQuillListsToEmailHtml(input)
    expect(out).toContain('<ul')
    expect(out).toContain('list-style-type:disc')
    expect(out).not.toContain('data-list')
    expect(out).not.toContain('ql-ui')
    expect(out).toContain('가')
    expect(out).toContain('나')
  })

  it('번호(ordered) 목록을 <ol> + decimal로 변환', () => {
    const input =
      '<ol><li data-list="ordered"><span class="ql-ui" contenteditable="false"></span>첫째</li></ol>'
    const out = convertQuillListsToEmailHtml(input)
    expect(out).toContain('list-style-type:decimal')
    expect(out).toContain('첫째')
  })

  it('글머리·번호가 섞인 경우 타입별로 <ul>/<ol> 분리', () => {
    const input =
      '<ol><li data-list="bullet">b1</li><li data-list="ordered">o1</li><li data-list="bullet">b2</li></ol>'
    const out = convertQuillListsToEmailHtml(input)
    expect((out.match(/<ul/g) || []).length).toBe(2)
    expect((out.match(/<ol/g) || []).length).toBe(1)
  })

  it('리스트가 없으면 입력을 그대로 반환 (멱등)', () => {
    const input = '<p style="margin: 0;">일반 텍스트</p>'
    expect(convertQuillListsToEmailHtml(input)).toBe(input)
  })

  it('processQuillHtml은 리스트를 변환하지 않고 Quill 네이티브 data-list를 유지', () => {
    const input = '<ol><li data-list="bullet"><span class="ql-ui"></span>항목</li></ol>'
    const out = processQuillHtml(input)
    // 에디터·미리보기 공용 경로에서는 data-list 보존 (마커는 각 환경의 CSS가 렌더)
    expect(out).toContain('data-list="bullet"')
    expect(out).not.toContain('<ul')
  })
})
