/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 템플릿 카탈로그(public/templates/templates-config.json) 무결성 검사.
 *
 * 템플릿은 손으로 고치는 큰 JSON이라, 로드해 보기 전에는 깨진 걸 알기 어렵다.
 * 실제 파일을 읽어 스키마·모듈 id·그룹 참조가 맞는지, 그리고 스토어에 로드했을 때
 * 모듈 수와 그룹 배치가 그대로 살아나는지 확인한다.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import fs from 'node:fs'
import path from 'node:path'
import { useModuleStore } from '@/stores/moduleStore'
import type { NewsletterTemplate, TemplateDepartment } from '@/types'

const PUBLIC = path.resolve(__dirname, '../../../public')

const catalog: { departments: TemplateDepartment[]; templates: NewsletterTemplate[] } = JSON.parse(
  fs.readFileSync(path.join(PUBLIC, 'templates/templates-config.json'), 'utf8'),
)
const moduleIds = new Set<string>(
  JSON.parse(fs.readFileSync(path.join(PUBLIC, 'modules/modules-config.json'), 'utf8')).modules.map(
    (m: any) => m.id,
  ),
)

/** 본부/팀 트리 — 설정 파일에 함께 들어 있다 (화면·등록 스크립트도 이 한 곳을 본다) */
const DEPARTMENTS = catalog.departments
/** 본부 id → 그 본부의 팀 id 목록 */
const DEPARTMENT_TEAM_IDS: Record<string, string[]> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.id, d.teams.map((t) => t.id)]),
)
const ALL_TEAMS = DEPARTMENTS.flatMap((d) => d.teams)

/**
 * 한 번이라도 배포된 팀 id 목록 — **추가만 가능하고 삭제·변경은 금지**한다.
 *
 * 이 id는 S3 업로드 경로·저장 파일처럼 되돌릴 수 없는 곳에 박힌다. 지우거나 철자를
 * 바꾸면 과거 데이터가 가리키던 대상이 사라진다. 조직이 폐지되면 설정에서 지우는 대신
 * `active: false`로 두고, 통합·분할이면 새 id를 만든 뒤 옛 id에 `mergedInto`를 적는다.
 *
 * 팀이 새로 생기면 이 배열에 한 줄 추가한다.
 */
const KNOWN_TEAM_IDS = [
  'arch-plan',
  'arch-strategy',
  'growth-strategy',
  'mice',
  'growth-plan',
  'conv-industry-1',
  'life-content',
  'pet-industry',
  'leisure-industry',
]

/** id 표기 규칙 — 소문자 영숫자와 하이픈만 (URL·S3 키에 그대로 쓰인다) */
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

global.fetch = vi.fn(async (url: any) => {
  const text = fs.readFileSync(path.join(PUBLIC, String(url).replace(/^\//, '')), 'utf8')
  return { ok: true, status: 200, text: async () => text, json: async () => JSON.parse(text) } as any
}) as any

describe('템플릿 카탈로그', () => {
  it('19개 전시 템플릿이 있다', () => {
    expect(catalog.templates).toHaveLength(19)
  })

  it('본부/팀 트리가 설정 파일에 들어 있다', () => {
    // 화면(TemplateSelectView)·등록 스크립트가 이 값을 그대로 쓴다 — 없으면 좌측 트리가 빈다
    expect(catalog.departments.length).toBeGreaterThan(0)
    catalog.departments.forEach((d) => {
      expect(d.id, `본부 "${d.name}"에 id가 없다`).toBeDefined()
      expect(d.name.trim()).not.toBe('')
      expect(d.teams.length).toBeGreaterThan(0)
      d.teams.forEach((t) => {
        expect(t.id, `팀 "${t.name}"에 id가 없다`).toBeDefined()
        expect(t.name.trim()).not.toBe('')
      })
    })
    const teamIds = ALL_TEAMS.map((t) => t.id)
    expect(new Set(teamIds).size, '팀 id가 본부 사이에 중복된다').toBe(teamIds.length)
    const teamNames = ALL_TEAMS.map((t) => t.name)
    expect(new Set(teamNames).size, '팀 이름이 본부 사이에 중복된다').toBe(teamNames.length)
  })

  it('id가 표기 규칙(소문자 영숫자·하이픈)을 지킨다', () => {
    // URL·S3 키에 그대로 들어가므로 한글·공백·대문자가 섞이면 인코딩이 생긴다
    DEPARTMENTS.forEach((d) => {
      expect(d.id, `본부 id "${d.id}"`).toMatch(ID_PATTERN)
      d.teams.forEach((t) => expect(t.id, `팀 id "${t.id}"`).toMatch(ID_PATTERN))
    })
  })

  it('본부 id와 팀 id가 겹치지 않는다', () => {
    // 로그·경로에서 어느 계층인지 구분되지 않는 것을 막는다
    const divisionIds = new Set(DEPARTMENTS.map((d) => d.id))
    const collide = ALL_TEAMS.map((t) => t.id).filter((id) => divisionIds.has(id))
    expect(collide, `본부와 겹치는 팀 id: ${collide.join(', ')}`).toEqual([])
  })

  it('기존 팀 id가 사라지지 않았다', () => {
    // ⚠ 이 테스트가 깨졌다면 id를 지웠거나 철자를 바꾼 것이다. 되돌려라 —
    //   과거 업로드 이미지·저장 파일이 그 id를 가리키고 있다.
    //   조직 폐지는 삭제가 아니라 active: false 다.
    const current = new Set(ALL_TEAMS.map((t) => t.id))
    const lost = KNOWN_TEAM_IDS.filter((id) => !current.has(id))
    expect(lost, `사라진 팀 id: ${lost.join(', ')}`).toEqual([])
  })

  it('새로 생긴 팀 id가 KNOWN_TEAM_IDS에 등록돼 있다', () => {
    // 목록에 없으면 다음에 누가 지워도 위 가드가 잡지 못한다
    const known = new Set(KNOWN_TEAM_IDS)
    const unlisted = ALL_TEAMS.map((t) => t.id).filter((id) => !known.has(id))
    expect(unlisted, `KNOWN_TEAM_IDS에 추가해야 할 id: ${unlisted.join(', ')}`).toEqual([])
  })

  it('mergedInto가 실제 존재하는 팀 id를 가리킨다', () => {
    const current = new Set(ALL_TEAMS.map((t) => t.id))
    const dangling = ALL_TEAMS.filter((t) => t.mergedInto && !current.has(t.mergedInto)).map(
      (t) => `${t.id} → ${t.mergedInto}`,
    )
    expect(dangling, `후속 조직을 찾을 수 없다: ${dangling.join(', ')}`).toEqual([])
  })

  it('쓰이지 않는 팀이 트리에 남아 있지 않다', () => {
    // 폐지된 팀(active: false)은 예외 — 정의는 남기고 화면에서만 감춘다
    const used = new Set(catalog.templates.map((t) => t.teamId))
    const empty = ALL_TEAMS.filter((t) => t.active !== false && !used.has(t.id)).map((t) => t.id)
    expect(empty, `템플릿이 하나도 없는 팀: ${empty.join(', ')}`).toEqual([])
  })

  it('id가 중복되지 않는다', () => {
    const ids = catalog.templates.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('이름이 중복되지 않는다', () => {
    const names = catalog.templates.map((t) => t.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('본부 → 팀 → 이름(가나다ABC) 순으로 정렬돼 있다', () => {
    const rank = (t: NewsletterTemplate): [number, number] => {
      const d = DEPARTMENTS.findIndex((x) => x.id === t.divisionId)
      if (d === -1) return [DEPARTMENTS.length, 0]
      const i = DEPARTMENTS[d].teams.findIndex((x) => x.id === t.teamId)
      return [d, i === -1 ? DEPARTMENTS[d].teams.length : i]
    }
    const sorted = [...catalog.templates].sort((a, b) => {
      const [ad, at] = rank(a)
      const [bd, bt] = rank(b)
      return ad - bd || at - bt || a.name.localeCompare(b.name, 'ko')
    })
    expect(catalog.templates.map((t) => t.name)).toEqual(sorted.map((t) => t.name))
  })

  it('모든 템플릿에 썸네일 이미지가 짝지어져 있다', () => {
    const files = new Set(fs.readdirSync(path.resolve(__dirname, '../../assets/img/thumbnail')))
    catalog.templates.forEach((t) => {
      expect(t.thumbnail, `${t.name}에 thumbnail이 없다`).toBeDefined()
      expect(files.has(t.thumbnail!), `${t.name}의 ${t.thumbnail} 파일이 없다`).toBe(true)
    })
  })

  it('같은 썸네일을 두 템플릿이 쓰지 않는다', () => {
    const used = catalog.templates.map((t) => t.thumbnail)
    expect(new Set(used).size).toBe(used.length)
  })

  it('본부가 지정한 순서대로 나온다', () => {
    const seen: string[] = []
    catalog.templates.forEach((t) => {
      if (seen[seen.length - 1] !== t.divisionId) seen.push(t.divisionId!)
    })
    // 한 본부가 떨어져 두 번 나오면 안 된다
    expect(new Set(seen).size).toBe(seen.length)
    expect(seen).toEqual(DEPARTMENTS.map((d) => d.id).filter((id) => seen.includes(id)))
  })

  catalog.templates.forEach((t) => {
    describe(`${t.name} (${t.id})`, () => {
      it('필수 항목을 갖춘다', () => {
        expect(t.id).toMatch(/^[a-z0-9-]+$/)
        expect(t.name.trim()).not.toBe('')
        expect(t.description.trim()).not.toBe('')
        expect(t.modules.length).toBeGreaterThan(0)
      })

      it('본부/팀 id가 템플릿 선택 화면의 트리에 있다', () => {
        // 어긋나면 그 팀 필터에서 조용히 사라지고 '전체'에서만 보인다
        expect(t.divisionId, '본부 id가 없다').toBeDefined()
        expect(DEPARTMENT_TEAM_IDS[t.divisionId!], `트리에 없는 본부 id: ${t.divisionId}`).toBeDefined()
        expect(DEPARTMENT_TEAM_IDS[t.divisionId!], `${t.divisionId}에 없는 팀 id`).toContain(t.teamId)
      })

      it('모듈 id가 모두 실제 모듈 정의에 있다', () => {
        const unknown = [...new Set(t.modules.map((m) => m.moduleId))].filter(
          (id) => !moduleIds.has(id),
        )
        expect(unknown).toEqual([])
      })

      it('그룹 참조가 정의된 그룹만 가리킨다', () => {
        const defined = new Set((t.groups ?? []).map((g) => g.id))
        const dangling = [
          ...new Set(t.modules.map((m) => m.groupId).filter((g): g is string => !!g)),
        ].filter((g) => !defined.has(g))
        expect(dangling).toEqual([])
      })

      it('그룹 멤버가 연속으로 놓여 있다', () => {
        const seen = new Set<string>()
        let prev: string | undefined
        t.modules.forEach((m) => {
          if (m.groupId && m.groupId !== prev) {
            // 한 번 끝난 그룹이 다시 나오면 연속이 아니다
            expect(seen.has(m.groupId)).toBe(false)
            seen.add(m.groupId)
          }
          prev = m.groupId
        })
      })

      it('정의된 그룹은 멤버를 2개 이상 갖는다', () => {
        // 멤버가 1개 이하인 그룹은 로드 시 cleanupGroup이 지운다
        const counts = new Map<string, number>()
        t.modules.forEach((m) => {
          if (m.groupId) counts.set(m.groupId, (counts.get(m.groupId) ?? 0) + 1)
        })
        const tooSmall = (t.groups ?? []).filter((g) => (counts.get(g.id) ?? 0) < 2).map((g) => g.id)
        expect(tooSmall).toEqual([])
      })
    })
  })
})

describe('템플릿 로드', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  catalog.templates.forEach((t) => {
    it(`${t.name}을(를) 로드하면 모듈·그룹 배치가 그대로 살아난다`, async () => {
      const store = useModuleStore()
      await store.loadAvailableTemplates()
      const ok = await store.loadTemplate(t.id)
      expect(ok).toBe(true)

      expect(store.modules).toHaveLength(t.modules.length)
      expect(store.modules.map((m) => m.moduleId)).toEqual(t.modules.map((m) => m.moduleId))

      // 그룹 소속이 템플릿과 같은 모양이어야 한다 (id는 그대로 쓰므로 직접 비교)
      expect(store.modules.map((m) => m.groupId ?? null)).toEqual(
        t.modules.map((m) => m.groupId ?? null),
      )
      // 컬럼 배치가 유지돼야 2단이 무너지지 않는다
      expect(store.modules.map((m) => m.columnIndex ?? 0)).toEqual(
        t.modules.map((m) => m.columnIndex ?? 0),
      )
      expect(store.groups).toHaveLength((t.groups ?? []).length)
    })
  })
})
