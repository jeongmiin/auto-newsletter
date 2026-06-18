import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { replaceTopLanguageButtonContent } from '../moduleContentReplacer'

// 실제 TopLanguageButton.html을 읽어 버튼 생성·색상 적용을 검증
const html = readFileSync(
  resolve(process.cwd(), 'public/modules/TopLanguageButton.html'),
  'utf-8',
)

const render = (props: Record<string, unknown>) => replaceTopLanguageButtonContent(html, props)

describe('TopLanguageButton - 언어 선택 버튼', () => {
  it('템플릿이 버튼 플레이스홀더를 포함해야 함 (사전 조건)', () => {
    expect(html).toContain('{{languageButtons}}')
  })

  it('기본값(버튼1 활성) 렌더 시 플레이스홀더가 모두 치환됨', () => {
    const result = render({
      button1Text: 'EN',
      button1Link: 'https://example.com/en',
      button1Active: true,
      button2Text: 'JP',
      button2Link: 'https://example.com/jp',
      button2Active: false,
      defaultBgColor: '#ffffff',
      defaultTextColor: '#fe5f0d',
      defaultBorderColor: '#fe5f0d',
      activeBgColor: '#fe5f0d',
      activeTextColor: '#ffffff',
      activeBorderColor: '#fe5f0d',
    })
    expect(result).not.toContain('{{languageButtons}}')
    expect(result).not.toContain('{{paddingTop}}')
    expect(result).toContain('EN')
    expect(result).toContain('JP')
    expect(result).toContain('https://example.com/en')
  })

  it('활성 버튼은 액티브 색상, 비활성 버튼은 기본 색상을 사용', () => {
    const result = render({
      button1Text: 'EN',
      button1Active: true,
      button2Text: 'JP',
      button2Active: false,
      defaultBgColor: '#ffffff',
      defaultTextColor: '#fe5f0d',
      activeBgColor: '#fe5f0d',
      activeTextColor: '#ffffff',
      defaultBorderColor: '#fe5f0d',
      activeBorderColor: '#fe5f0d',
    })
    // 활성(EN): 배경 액티브색 + 글자 흰색
    expect(result).toMatch(/background:#fe5f0d;[^"]*"><a[^>]*color:#ffffff[^>]*>EN/)
    // 비활성(JP): 배경 흰색 + 글자 포인트색
    expect(result).toMatch(/background:#ffffff;[^"]*"><a[^>]*color:#fe5f0d[^>]*>JP/)
  })

  it('표시 토글(buttonNShow=false)이 꺼진 버튼은 렌더하지 않음', () => {
    const result = render({
      button1Text: 'EN',
      button2Text: 'JP',
      button2Show: false,
      button3Text: 'TH',
    })
    expect(result).toContain('>EN<')
    expect(result).not.toContain('>JP<')
    expect(result).toContain('>TH<')
    // 보이는 버튼은 2개
    expect(result.match(/<p /g)?.length).toBe(2)
  })

  it('첫 버튼을 숨겨도 남은 첫 버튼은 좌측 테두리를 유지(연결 스타일 유지)', () => {
    const result = render({
      button1Text: 'EN',
      button1Show: false,
      button2Text: 'JP',
      button3Text: 'TH',
      defaultBorderColor: '#fe5f0d',
    })
    // 보이는 첫 버튼(JP)은 border-left:0 가 없어야 함
    expect(result).toMatch(/border:1px solid #fe5f0d;box-sizing[^"]*"><a[^>]*>JP/)
    // 두 번째로 보이는 버튼(TH)에는 border-left:0 적용
    expect(result).toContain('border-left:0;')
  })

  it('buttonNShow 미설정 시 기존 인스턴스 호환을 위해 표시됨', () => {
    const result = render({ button1Text: 'EN' })
    expect(result).toContain('>EN<')
  })

  it('텍스트가 빈 버튼은 렌더하지 않음', () => {
    const result = render({
      button1Text: 'EN',
      button1Active: true,
      button2Text: '',
      button3Text: '   ',
    })
    expect(result).toContain('>EN<')
    // 버튼은 1개만 생성됨
    expect(result.match(/<p /g)?.length).toBe(1)
  })

  it('두 번째 이후 버튼은 좌측 테두리를 제거(border-left:0)해 연결된 모양', () => {
    const result = render({
      button1Text: 'EN',
      button2Text: 'JP',
    })
    expect(result).toContain('border-left:0;')
  })

  it('버튼 텍스트의 HTML 특수문자는 이스케이프됨 (XSS 방어)', () => {
    const result = render({ button1Text: '<b>EN</b>' })
    expect(result).toContain('&lt;b&gt;EN&lt;/b&gt;')
    expect(result).not.toContain('<b>EN</b>')
  })
})
