/**
 * Material Symbols 아이콘 목록 검사.
 *
 * index.html에서 폰트를 `icon_names`로 subset해 3.9MB → 13KB로 줄였다.
 * 그 대가로 **목록에 없는 아이콘은 글리프가 없어 이름 글자가 그대로 보인다.**
 * 새 아이콘을 코드에 쓰고 index.html 목록에 넣지 않으면 이 테스트가 잡는다.
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../../..')
const SRC = path.join(ROOT, 'src')
/** CSS에서 아이콘 폰트를 지정하는 표기 — 이게 있는 규칙의 content는 아이콘 이름이다 */
const SYMBOLS_FONT = `font-family: 'Material Symbols Outlined'`

const walk = (dir: string): string[] =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
    )

/** index.html의 icon_names 파라미터에 적힌 아이콘들 */
const declaredIcons = (): string[] => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  const m = /icon_names=([a-z0-9_,]+)/.exec(html)
  expect(m, 'index.html에 icon_names가 없다 — 폰트 subset이 풀렸는지 확인').not.toBeNull()
  return m![1].split(',').filter(Boolean)
}

/**
 * 코드에서 실제로 쓰는 아이콘 이름.
 * Material Symbols를 쓰는 파일만 훑는다 — 다른 파일의 `icon:`은 PrimeIcons 등 무관한 값이다.
 * 클래스(`material-symbols-outlined`)로 쓰는 곳과 CSS `font-family: 'Material Symbols Outlined'`로
 * 쓰는 곳(Quill 툴바의 ::before 아이콘)이 모두 있어 두 표기를 다 본다.
 */
const usedIcons = (): Map<string, string[]> => {
  const byIcon = new Map<string, string[]>()
  const add = (name: string, file: string) => {
    if (!name) return
    const list = byIcon.get(name) ?? []
    if (!list.includes(file)) list.push(file)
    byIcon.set(name, list)
  }

  for (const file of walk(SRC).filter((f) => /\.(vue|ts)$/.test(f))) {
    if (file.includes('__tests__')) continue
    const s = fs.readFileSync(file, 'utf8')
    if (!s.includes('material-symbols-outlined') && !s.includes(SYMBOLS_FONT)) continue
    const rel = path.relative(ROOT, file).replace(/\\/g, '/')

    // 1) 리터럴 — <span class="material-symbols-outlined">icon_name</span>
    for (const m of s.matchAll(/material-symbols-outlined[^>]*>\s*([a-z0-9_]+)\s*</g)) {
      add(m[1], rel)
    }
    // 2) span 안 삼항 — {{ cond ? 'lock' : 'lock_open_right' }}
    for (const m of s.matchAll(/material-symbols-outlined[^>]*>\s*\{\{([^}]+)\}\}/g)) {
      // 함수 인자('padding' 등)가 섞이므로, 삼항의 결과 자리만 본다
      const ternary = /\?\s*'([a-z0-9_]+)'\s*:\s*'([a-z0-9_]+)'/.exec(m[1])
      if (ternary) {
        add(ternary[1], rel)
        add(ternary[2], rel)
      }
    }
    // 3) 같은 파일의 icon: '...' — 레일 메뉴·테두리 변·정렬 옵션 등 동적 공급원
    for (const m of s.matchAll(/\bicon:\s*'([a-z0-9_]*)'/g)) add(m[1], rel)
    // 4) 같은 파일의 *_ICON 맵 값
    for (const m of s.matchAll(/[A-Z_]*ICON[A-Z_]*\s*:\s*Record<[^>]*>\s*=\s*\{([^}]*)\}/g)) {
      for (const n of m[1].matchAll(/'([a-z0-9_]+)'/g)) add(n[1], rel)
    }
    // 5) CSS 의사요소 — 한 규칙 블록 안에 Material Symbols 폰트와 content가 같이 있는 경우.
    //    Quill 툴바처럼 마크업을 우리가 못 만드는 곳은 ::before content로 아이콘을 넣는다.
    for (const block of s.matchAll(/\{[^{}]*\}/g)) {
      if (!block[0].includes(SYMBOLS_FONT)) continue
      const content = /content:\s*'([a-z0-9_]+)'/.exec(block[0])
      if (content) add(content[1], rel)
    }
  }
  return byIcon
}

describe('Material Symbols 폰트 subset', () => {
  it('index.html이 실사용 축만 요청한다 (전체 가변축이면 3.9MB)', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
    expect(html).toContain('Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,300..400,0..1,0')
    expect(html).not.toContain('@20..48,100..700,0..1,-50..200')
  })

  it('코드에서 쓰는 아이콘이 전부 icon_names에 있다', () => {
    const declared = new Set(declaredIcons())
    const missing = [...usedIcons().entries()]
      .filter(([name]) => !declared.has(name))
      .map(([name, files]) => `${name} (${files.join(', ')})`)
    expect(
      missing,
      `index.html의 icon_names에 아이콘을 추가해야 합니다:\n  ${missing.join('\n  ')}`,
    ).toEqual([])
  })

  it('icon_names에 중복이 없다', () => {
    const list = declaredIcons()
    expect(new Set(list).size).toBe(list.length)
  })

  it('icon_names가 정렬돼 있다 (추가할 자리 찾기 쉽게)', () => {
    const list = declaredIcons()
    expect(list).toEqual([...list].sort())
  })

  it('쓰지 않는 아이콘이 목록에 남아 있지 않다', () => {
    const used = usedIcons()
    const unused = declaredIcons().filter((n) => !used.has(n))
    expect(unused, `코드에서 쓰지 않는 아이콘: ${unused.join(', ')}`).toEqual([])
  })
})
