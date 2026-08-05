/**
 * 버튼 안쪽 여백이 메일 클라이언트에서 살아남는지 — 실제 모듈 템플릿을 읽어 검사한다.
 *
 * <a>는 인라인 요소라 아웃룩 등 일부 클라이언트가 위아래 여백을 무시한다.
 * 그래서 안쪽 여백·배경·테두리는 <td>에 두고, <a>는 글자만 담당해야 한다.
 * (테스트 메일에서 버튼이 납작하게 나오던 문제)
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const MODULES = path.resolve(__dirname, '../../../public/modules')
const read = (file: string): string => fs.readFileSync(path.join(MODULES, file), 'utf8')

/** 여는 태그의 style 속성만 모아서 돌려준다 */
const styleOf = (html: string, tag: string): string[] =>
  [...html.matchAll(new RegExp(`<${tag}\\b[^>]*style="([^"]*)"`, 'g'))].map((m) => m[1])

describe('버튼 안쪽 여백은 <a>가 아니라 <td>에 있다', () => {
  const cases: Array<{ file: string; padKeys: string[] }> = [
    { file: 'ModuleOneButton.html', padKeys: ['buttonPaddingTop'] },
    { file: 'ModuleTwoButton.html', padKeys: ['button1PaddingTop', 'button2PaddingTop'] },
  ]

  cases.forEach(({ file, padKeys }) => {
    describe(file, () => {
      const html = read(file)

      it('버튼 <a>에는 안쪽 여백을 주지 않는다', () => {
        styleOf(html, 'a').forEach((style) => {
          expect(style).not.toContain('padding')
        })
      })

      it('안쪽 여백 placeholder가 <td> style 안에 있다', () => {
        const tdStyles = styleOf(html, 'td').join(' ')
        padKeys.forEach((key) => {
          expect(tdStyles).toContain(`{{${key}}}`)
        })
      })

      it('배경색·테두리도 <td>로 옮겨 여백과 같은 상자에 둔다', () => {
        const tdStyles = styleOf(html, 'td').join(' ')
        expect(tdStyles).toContain('background-color:')
        expect(tdStyles).toContain('border-radius:')
        styleOf(html, 'a').forEach((style) => {
          expect(style).not.toContain('background-color')
        })
      })

      it('<a>는 글자 스타일만 갖고 셀 전체를 덮는다', () => {
        styleOf(html, 'a').forEach((style) => {
          expect(style).toContain('display: block')
          expect(style).toContain('text-decoration:none')
          expect(style).toContain('color:')
        })
      })

      it('모든 안쪽 여백 4방향 placeholder가 남아 있다', () => {
        padKeys.forEach((topKey) => {
          const base = topKey.replace(/Top$/, '')
          ;['Top', 'Right', 'Bottom', 'Left'].forEach((side) => {
            expect(html).toContain(`{{${base}${side}}}`)
          })
        })
      })
    })
  })
})
