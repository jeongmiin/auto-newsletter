/**
 * 라우트 경로 규칙 검사.
 *
 * 화면 주소(라우트)와 정적 파일(`public/`)은 **서버에서 같은 이름 공간**을 쓴다.
 * 앱 안에서 이동할 때는 서버에 묻지 않아 아무 문제가 없다가, 새로고침이나 링크로 바로 들어오면
 * 서버가 먼저 받는다 — 그때 같은 이름의 폴더가 있으면 화면 대신 폴더를 열려다 403을 낸다.
 * 예전 `/templates`가 `public/templates/`에 걸려 그렇게 됐다.
 *
 * 그래서 두 가지를 못 박는다.
 *   1. 라우트 경로의 첫 마디는 `public/` 폴더 이름(과 빌드가 만드는 `assets`)과 겹치면 안 된다.
 *   2. 경로 문자열은 `src/router/index.ts`에만 있다. 다른 곳은 `{ name }`으로 부른다 —
 *      경로를 바꿀 때 흩어진 문자열을 찾아다니지 않게.
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../../..')
const SRC = path.join(ROOT, 'src')
const ROUTER_FILE = path.join(SRC, 'router', 'index.ts')

/** Vite가 빌드 결과물을 모아 두는 폴더 — public에는 없지만 배포물에는 있다 */
const BUILD_DIRS = ['assets']

const walk = (dir: string): string[] =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
    )

/** 라우터 파일에 적힌 경로들 — 파일을 글자로 읽는다(앱 코드를 import하면 스토어·뷰까지 딸려온다) */
const routePaths = (): string[] => {
  const src = fs.readFileSync(ROUTER_FILE, 'utf8')
  const paths = [...src.matchAll(/path:\s*['"`]([^'"`]+)['"`]/g)].map((m) => m[1])
  expect(paths.length, '라우터 파일에서 path를 하나도 못 읽었다 — 표기가 바뀌었는지 확인').toBeGreaterThan(0)
  return paths
}

/** 서버가 정적 파일로 먼저 잡아 버릴 이름들 */
const reservedNames = (): string[] => {
  const publicDirs = fs
    .readdirSync(path.join(ROOT, 'public'), { withFileTypes: true })
    .map((e) => e.name)
  return [...publicDirs, ...BUILD_DIRS]
}

/** 경로의 첫 마디 — `/design` → `design`, `/`(루트)와 `/:id` 같은 파라미터는 건너뛴다 */
const firstSegment = (routePath: string): string | null => {
  const seg = routePath.split('/')[1] ?? ''
  if (!seg || seg.startsWith(':')) return null
  return seg
}

describe('라우트 경로 규칙', () => {
  it('경로가 public/ 폴더·빌드 폴더 이름과 겹치지 않는다 (겹치면 새로고침 시 403)', () => {
    const reserved = new Set(reservedNames())
    const clashes = routePaths().filter((p) => {
      const seg = firstSegment(p)
      return seg !== null && reserved.has(seg)
    })
    expect(
      clashes,
      `라우트 경로가 정적 폴더와 같은 이름이다 — 다른 이름으로 바꿀 것:\n  ${clashes.join('\n  ')}` +
        `\n(금지 이름: ${[...reserved].join(', ')})`,
    ).toEqual([])
  })

  it("경로 문자열은 router/index.ts에만 있다 — 다른 곳은 { name: '…' }으로 부른다", () => {
    const literalPaths = routePaths().filter((p) => p !== '/')
    const files = walk(SRC).filter(
      (f) =>
        /\.(ts|vue)$/.test(f) &&
        f !== ROUTER_FILE &&
        !f.includes(`${path.sep}__tests__${path.sep}`),
    )

    const offenders: string[] = []
    for (const file of files) {
      const lines = fs.readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, i) => {
        for (const p of literalPaths) {
          if (line.includes(`'${p}'`) || line.includes(`"${p}"`) || line.includes(`\`${p}\``)) {
            offenders.push(`${path.relative(ROOT, file)}:${i + 1}  ${line.trim()}`)
          }
        }
      })
    }
    expect(
      offenders,
      `라우트 경로를 글자로 박아 썼다 — router.push({ name: '…' })로 바꿀 것:\n  ${offenders.join('\n  ')}`,
    ).toEqual([])
  })
})
