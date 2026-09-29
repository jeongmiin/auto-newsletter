import { describe, it, expect } from 'vitest'
import {
  convertQuillListsToEmailHtml,
  processQuillHtml,
  restoreListItemFormats,
} from '../quillHtmlProcessor'

/** 에디터 DOM 흉내 — Quill 2 가 실제로 들고 있는 <ol><li data-list> 구조 */
const editorRoot = (html: string): HTMLElement => {
  const root = document.createElement('div')
  root.className = 'ql-editor'
  root.innerHTML = html
  return root
}

// PrimeVue Editor 가 넘기는 getSemanticHTML 은 <li> 의 style·정렬 클래스를 떨어뜨린다 —
// 행간 슬라이더가 li 에 준 line-height 가 캔버스·발송 HTML 에서 사라졌던 원인.
describe('restoreListItemFormats', () => {
  it('에디터 DOM 의 li 인라인 서식을 같은 순서의 semantic li 에 되살린다', () => {
    const root = editorRoot(
      '<ol><li data-list="bullet" style="line-height: 1.9;"><span class="ql-ui"></span>가</li>' +
        '<li data-list="bullet" class="ql-align-center" style="letter-spacing: 0.1em;"><span class="ql-ui"></span>나</li>' +
        '<li data-list="ordered"><span class="ql-ui"></span>다</li></ol>',
    )
    const semantic = '<ul><li>가</li><li>나</li></ul><ol><li>다</li></ol>'

    const out = restoreListItemFormats(semantic, root)

    expect(out).toBe(
      '<ul><li style="line-height: 1.9;">가</li><li style="letter-spacing: 0.1em;" class="ql-align-center">나</li></ul>' +
        '<ol><li>다</li></ol>',
    )
  })

  it('항목 수가 어긋나면(감싸는 li 가 생긴 경우) 손대지 않는다', () => {
    const root = editorRoot('<ol><li data-list="bullet" style="line-height: 2;">가</li></ol>')
    const semantic = '<ul><li><ul><li>가</li></ul></li></ul>'
    expect(restoreListItemFormats(semantic, root)).toBe(semantic)
  })

  it('에디터 DOM 이 없거나 목록이 없으면 그대로 돌려준다', () => {
    expect(restoreListItemFormats('<p>x</p>', null)).toBe('<p>x</p>')
    expect(restoreListItemFormats('<ul><li>가</li></ul>', editorRoot('<p>x</p>'))).toBe('<ul><li>가</li></ul>')
  })

  it('되살린 정렬 클래스는 processQuillHtml 이 인라인 text-align 으로 바꾼다', () => {
    const out = processQuillHtml('<ul><li style="line-height: 1.9;" class="ql-align-center">가</li></ul>')
    expect(out).toContain('text-align: center')
    expect(out).toContain('line-height: 1.9')
    expect(out).not.toContain('ql-align-center')
  })
})

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

  // 행간 슬라이더는 li 에 line-height 인라인 스타일을 준다 — 변환하면서 지우면 발송 HTML 에서 행간이 사라진다
  it('항목에 준 행간·정렬 인라인 스타일을 유지하고 margin 만 보탠다', () => {
    const input =
      '<ol><li data-list="bullet" style="line-height: 1.9;"><span class="ql-ui"></span>가</li>' +
      '<li data-list="bullet" style="line-height: 1.9; text-align: center;"><span class="ql-ui"></span>나</li>' +
      '<li data-list="bullet"><span class="ql-ui"></span>다</li></ol>'
    const out = convertQuillListsToEmailHtml(input)
    const styles = [...out.matchAll(/<li style="([^"]*)"/g)].map((m) => m[1])
    expect(styles).toEqual(['line-height: 1.9; margin:0;', 'line-height: 1.9; text-align: center; margin:0;', 'margin:0;'])
  })

  it('항목에 margin 이 이미 있으면 겹쳐 넣지 않는다', () => {
    const out = convertQuillListsToEmailHtml('<ol><li data-list="ordered" style="margin: 4px 0; line-height: 2;">x</li></ol>')
    // 'margin:0' 은 감싸는 <ol> 에는 남아야 하므로 li 태그만 본다
    expect(out).toContain('<li style="margin: 4px 0; line-height: 2;">x</li>')
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
