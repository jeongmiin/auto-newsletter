/**
 * SNS 아이콘 원형(45×45)은 CSS width 가 아니라 HTML 속성으로 고정돼야 한다.
 *
 * 일부 메일 클라이언트가 `<a>` 의 width 와 `<img>` 의 % 폭을 버려 원형이 이미지 원본 비율(페이스북 14×26 → 24×45 타원)로
 * 찌그러진 적이 있다. 그래서 원형은 `<td width="45" height="45">`, 아이콘은 px `width`/`height` 속성으로 못 박는다.
 * 독립 SNS 모듈(snsIcons.ts)과 레거시 푸터(ModuleFooter.html)가 같은 마크업을 쓰는지도 본다.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildSnsRowHtml, defaultSnsIcons, SNS_ICON_META, SNS_CIRCLE_SIZE } from '@/constants/snsIcons'

const footerHtml = readFileSync(resolve(process.cwd(), 'public/modules/ModuleFooter.html'), 'utf-8')

/** 원형 셀 — 폭·높이가 HTML 속성으로 45 */
const CIRCLE_TD = /<td width="45" height="45" align="center" valign="middle" style="[^"]*background-color:[^;"]+;border-radius:50%;"/g
/** 아이콘 이미지 — px 속성 + 같은 값의 인라인 스타일 */
const ICON_IMG = /<img src="[^"]+" alt="[^"]*" width="(\d+)" height="(\d+)" style="display:block;width:(\d+)px;height:(\d+)px;/g

describe('SNS 아이콘 마크업 — 크기를 HTML 속성으로 고정', () => {
  it('원형 한 변은 45px', () => {
    expect(SNS_CIRCLE_SIZE).toBe(45)
  })

  it('노출 아이콘마다 45×45 셀과 px 크기의 이미지를 만든다', () => {
    const html = buildSnsRowHtml(defaultSnsIcons(), '#333333')
    const shown = defaultSnsIcons().filter((i) => i.show)
    expect(html.match(CIRCLE_TD)).toHaveLength(shown.length)
    const imgs = [...html.matchAll(ICON_IMG)]
    expect(imgs).toHaveLength(shown.length)
    imgs.forEach((m, idx) => {
      const meta = SNS_ICON_META[shown[idx].key]
      // 속성과 스타일이 같은 px 값이고, 원형 안에 들어간다
      expect([m[1], m[2], m[3], m[4]].map(Number)).toEqual([meta.w, meta.h, meta.w, meta.h])
      expect(meta.w).toBeLessThanOrEqual(45)
      expect(meta.h).toBeLessThanOrEqual(45)
    })
  })

  it('% 폭이나 a 의 width 처럼 클라이언트가 버릴 수 있는 치수에 기대지 않는다', () => {
    const html = buildSnsRowHtml(defaultSnsIcons(), '#333333')
    expect(html).not.toMatch(/width:\d+%/)
    expect(html).not.toMatch(/<a [^>]*width:45px/)
    expect(html).not.toContain('object-fit')
    // td 의 border-radius 는 collapse 에서 무시되므로 테이블은 separate 여야 한다
    expect(html.match(/border-collapse:separate/g)).toHaveLength(7)
  })

  it('배경색과 링크·순서·노출을 그대로 반영한다', () => {
    const html = buildSnsRowHtml(
      [
        { key: 'instagram', show: true, url: 'https://insta.example' },
        { key: 'home', show: false, url: 'https://home.example' },
        { key: 'facebook', show: true, url: '' },
      ],
      '#ff0000',
    )
    expect(html.match(/background-color:#ff0000/g)).toHaveLength(2)
    expect(html.indexOf('icon_instagram.png')).toBeLessThan(html.indexOf('icon_facebook.png'))
    expect(html).not.toContain('icon_home.png')
    expect(html).toContain('href="https://insta.example"')
    expect(html).toContain('href="#"') // 빈 링크는 #
  })

  it('레거시 푸터의 SNS 줄도 같은 마크업이다', () => {
    expect(footerHtml.match(CIRCLE_TD)).toHaveLength(12)
    const imgs = [...footerHtml.matchAll(ICON_IMG)]
    expect(imgs).toHaveLength(12)
    expect(footerHtml).not.toMatch(/<img[^>]*width:\s*\d+%/)
    expect(footerHtml).not.toMatch(/<a [^>]*width:\s*45px/)
    // 이미지 크기는 독립 모듈의 메타와 동일
    const metaSizes = Object.values(SNS_ICON_META).map((m) => `${m.w}x${m.h}`)
    expect(imgs.map((m) => `${m[1]}x${m[2]}`)).toEqual(metaSizes)
  })
})
