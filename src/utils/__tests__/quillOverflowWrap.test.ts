import { describe, it, expect } from 'vitest'
import { addZeroSpacingToBlocks, processQuillHtml } from '../quillHtmlProcessor'

// '단어기준(word-break: keep-all)' 문단이 2단 모듈 컬럼을 넘치지 않도록
// overflow-wrap: anywhere 가 적용되는지 검증한다.
describe('quill overflow-wrap (단어기준 줄바꿈 레이아웃 깨짐 방지)', () => {
  it('keep-all 문단에는 overflow-wrap: anywhere 적용', () => {
    const out = addZeroSpacingToBlocks('<p style="word-break: keep-all;">긴텍스트</p>')
    expect(out).toContain('overflow-wrap: anywhere')
    expect(out).not.toContain('overflow-wrap: break-word')
    // 단어 단위 줄바꿈 규칙 자체는 유지
    expect(out).toContain('word-break: keep-all')
  })

  it('word-break 미지정(기본) 스타일 문단은 break-all + overflow-wrap: break-word 부여', () => {
    const out = addZeroSpacingToBlocks('<p style="color:#333333;">일반 텍스트</p>')
    expect(out).toContain('word-break: break-all')
    expect(out).toContain('overflow-wrap: break-word')
    expect(out).not.toContain('overflow-wrap: anywhere')
  })

  it('명시적 break-all 문단도 overflow-wrap: break-word 유지', () => {
    const out = addZeroSpacingToBlocks('<p style="word-break: break-all;">텍스트</p>')
    expect(out).toContain('overflow-wrap: break-word')
    expect(out).not.toContain('overflow-wrap: anywhere')
  })

  it('processQuillHtml 전체 경로에서도 keep-all → anywhere', () => {
    const out = processQuillHtml('<p style="word-break: keep-all;">콘텐츠</p>')
    expect(out).toContain('overflow-wrap: anywhere')
  })
})
