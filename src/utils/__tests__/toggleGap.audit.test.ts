import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as R from '../moduleContentReplacer'

const cfg = JSON.parse(readFileSync(join('public/modules', 'modules-config.json'), 'utf8'))
const noop = async (h: string) => h

const renderers: Record<string, (html: string, p: any) => string | Promise<string>> = {
  ModuleImageHeader: R.replaceModuleImageHeaderContent,
  SectionTitle: R.replaceSectionTitleContent,
  Module01: R.replaceModule01Content,
  Module02: (h, p) => R.replaceModule02Content(h, p, noop as any),
  Module04: (h, p) => R.replaceModule04Content(h, p, noop as any),
  Module05: R.replaceModule052Content,
  'Module05-1': R.replaceModule051Content,
  'Module05-3': R.replaceModule053Content,
  Module06: R.replaceModule06Content,
  Module07: R.replaceModule07Content,
  Module07_reverse: R.replaceModule07ReverseContent,
  Module10: R.replaceModule10Content,
  'Module10-1': R.replaceModule101Content,
  Module11: R.replaceModule11Content,
  Module12: R.replaceModule12Content,
  ModuleFooter: R.replaceModuleFooterContent,
}

const defaultsFor = (m: any) => {
  const p: Record<string, unknown> = {}
  for (const pr of m.editableProps) p[pr.key] = pr.default !== undefined ? pr.default : ''
  return p
}

const isZero = (v: string) => /^0(px|em|rem|%)?$/.test(v.trim())
const getProp = (style: string, prop: string): string | null => {
  const mm = new RegExp(`(?:^|;|\\s)${prop}\\s*:\\s*([^;]+)`, 'i').exec(style)
  return mm ? mm[1].trim() : null
}
// shorthand에서 top/bottom 추출
const verticalOfShorthand = (v: string): [string, string] => {
  const parts = v.split(/\s+/)
  if (parts.length === 1) return [parts[0], parts[0]]
  if (parts.length === 2) return [parts[0], parts[0]] // top/bottom = 1번째
  if (parts.length === 3) return [parts[0], parts[2]]
  return [parts[0], parts[2]]
}
// 세로 여백(top/bottom·height)만 판정 — 가로 패딩은 세로 간격을 만들지 않음
const hasVerticalSpacing = (style: string): boolean => {
  for (const p of ['padding', 'margin']) {
    const v = getProp(style, p)
    if (v) {
      const [t, b] = verticalOfShorthand(v)
      if (!isZero(t) || !isZero(b)) return true
    }
  }
  for (const p of ['padding-top', 'padding-bottom', 'margin-top', 'margin-bottom', 'height', 'min-height']) {
    const v = getProp(style, p)
    if (v && !isZero(v)) return true
  }
  return false
}

// 비어있는(텍스트·이미지 없는) 요소인지
const isEmptyEl = (el: Element): boolean => {
  if (el.querySelector('img')) return false
  const txt = (el.textContent || '').replace(/ /g, '').trim()
  if (txt !== '') return false
  // border(구분선)를 그리는 자식이 있으면 빈 칸이 아님 — 항상 표시되는 의도된 요소
  for (const child of Array.from(el.querySelectorAll('*'))) {
    const s = child.getAttribute('style') || ''
    if (/border(-top|-bottom)?\s*:\s*(?!none)[^;]*\d/i.test(s)) return false
  }
  return true
}

const auditModule = (id: string, html: string): string[] => {
  const findings: string[] = []
  const doc = new DOMParser().parseFromString(`<table><tbody>${html}</tbody></table>`.includes('<table') ? html : html, 'text/html')
  // 모든 컨테이너 후보
  doc.querySelectorAll('div, td, p, a').forEach((el) => {
    const style = el.getAttribute('style') || ''
    const hasHeightAttr = el.tagName === 'TD' && el.getAttribute('height')
    if (!isEmptyEl(el)) return
    if (hasVerticalSpacing(style)) {
      findings.push(`<${el.tagName.toLowerCase()}> style="${style.slice(0, 90)}"`)
    } else if (hasHeightAttr && el.getAttribute('height') !== '0') {
      // 빈 td[height] 는 대부분 의도된 스페이서이지만 토글로 새로 빈게 됐는지 확인 위해 기록만
    }
  })
  // 잔여 미치환 placeholder
  if (/\{\{\s*\w+\s*\}\}/.test(html)) findings.push('LEFTOVER_PLACEHOLDER')
  return findings
}

describe('AUDIT: 토글 비노출 시 빈 컨테이너/여백 잔존 점검', () => {
  for (const m of cfg.modules) {
    const toggles = m.editableProps.filter((p: any) => p.type === 'boolean' && /^show/i.test(p.key))
    if (!toggles.length || !renderers[m.id]) continue
    it(`${m.id}: 모든 show* OFF`, async () => {
      const html = readFileSync(join('public/modules', m.htmlFile), 'utf8')
      const props = defaultsFor(m)
      for (const t of toggles) props[t.key] = false
      const out = await renderers[m.id](html, props)
      const findings = auditModule(m.id, out)
      if (findings.length) {
        console.log(`\n### ${m.id} (all show* off) — 잔여 ${findings.length}건`)
        findings.forEach((f) => console.log('   ', f))
      }
      // 토글 비노출 시 빈 컨테이너(세로 여백)·미치환 placeholder가 남지 않아야 한다
      expect(findings).toEqual([])
    })
  }
})
