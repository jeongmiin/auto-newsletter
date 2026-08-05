/**
 * 조립형(원소 모듈 그룹) 추가 위치 — 항상 "선택한 것 바로 아래".
 *
 * 예전에는 조립형 빌더가 무조건 `modules.value.push(...)`로 맨 끝에 붙여서,
 * 중간 모듈을 선택하고 갤러리에서 모듈을 추가해도 뉴스레터 맨 아래에 생겼다.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useModuleStore } from '../moduleStore'
import type { ModuleMetadata } from '@/types'

global.fetch = vi.fn()

const meta = (id: string): ModuleMetadata => ({
  id,
  name: id,
  description: '',
  category: 'common',
  icon: 'T',
  htmlFile: `${id}.html`,
  editableProps: [{ key: 'label', label: '라벨', type: 'text', default: '' }],
})

/** 조립형 빌더가 찾는 원소 모듈들 */
const ELEMENT_IDS = [
  'ModuleImg',
  'ModuleDescText',
  'ModuleOneButton',
  'ModuleSmallButton',
  'ModuleDivider',
  'Marker',
]

const setup = () => {
  const store = useModuleStore()
  store.availableModules = ELEMENT_IDS.map(meta)
  return store
}

/** 그룹에 속하지 않은 표식 모듈을 맨 끝에 하나 추가하고 id를 돌려준다 */
const addMarker = (store: ReturnType<typeof useModuleStore>, label: string): string => {
  store.selectedModuleId = null
  store.selectedGroupId = null
  store.addModule(meta('Marker'))
  const m = store.modules[store.modules.length - 1]
  m.properties.label = label
  return m.id
}

/** 현재 모듈 배열에서 id의 위치 */
const indexOf = (store: ReturnType<typeof useModuleStore>, id: string): number =>
  store.modules.findIndex((m) => m.id === id)

describe('조립형 추가 위치', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('아무것도 선택돼 있지 않으면 맨 끝에 추가한다', () => {
    const store = setup()
    const first = addMarker(store, '첫째')
    const last = addMarker(store, '둘째')

    store.selectedModuleId = null
    store.selectedGroupId = null
    const gid = store.addComposedTwoButton()!

    const members = store.modules.filter((m) => m.groupId === gid)
    expect(members).toHaveLength(2)
    expect(indexOf(store, members[0].id)).toBeGreaterThan(indexOf(store, last))
    expect(indexOf(store, first)).toBe(0)
  })

  it('단독 모듈을 선택하면 그 모듈 바로 아래에 추가한다', () => {
    const store = setup()
    const first = addMarker(store, '첫째')
    const last = addMarker(store, '둘째')

    store.selectModule(first)
    const gid = store.addComposedTwoButton()!

    const members = store.modules.filter((m) => m.groupId === gid)
    expect(indexOf(store, members[0].id)).toBe(indexOf(store, first) + 1)
    expect(indexOf(store, last)).toBe(store.modules.length - 1)
  })

  it('그룹을 선택하면 그 그룹 전체 다음에 추가한다', () => {
    const store = setup()
    const firstGid = store.addComposedTwoButton()!
    const last = addMarker(store, '마지막')

    store.selectedModuleId = null
    store.selectedGroupId = firstGid
    const secondGid = store.addComposedTwoButton()!

    const firstMembers = store.modules.filter((m) => m.groupId === firstGid)
    const secondMembers = store.modules.filter((m) => m.groupId === secondGid)
    const firstEnd = Math.max(...firstMembers.map((m) => indexOf(store, m.id)))
    expect(Math.min(...secondMembers.map((m) => indexOf(store, m.id)))).toBe(firstEnd + 1)
    expect(indexOf(store, last)).toBe(store.modules.length - 1)
  })

  it('그룹 멤버를 선택해도 그룹 안이 아니라 그룹 전체 다음에 추가한다', () => {
    const store = setup()
    const firstGid = store.addComposedTwoButton()!
    const last = addMarker(store, '마지막')

    // 멤버 드릴다운 선택 (그룹 안에 그룹을 만들 수는 없다)
    const member = store.modules.find((m) => m.groupId === firstGid)!
    store.selectModule(member.id)
    const secondGid = store.addComposedTwoButton()!

    const secondMembers = store.modules.filter((m) => m.groupId === secondGid)
    expect(secondMembers.every((m) => m.groupId === secondGid)).toBe(true)
    const firstEnd = Math.max(
      ...store.modules.filter((m) => m.groupId === firstGid).map((m) => indexOf(store, m.id)),
    )
    expect(Math.min(...secondMembers.map((m) => indexOf(store, m.id)))).toBe(firstEnd + 1)
    expect(indexOf(store, last)).toBe(store.modules.length - 1)
  })

  it('연달아 추가하면 방금 추가한 그룹 아래로 쌓인다', () => {
    const store = setup()
    const last = addMarker(store, '마지막')

    store.selectModule(last)
    const a = store.addComposedTwoButton()!
    const b = store.addComposedTwoButton()!

    const aEnd = Math.max(
      ...store.modules.filter((m) => m.groupId === a).map((m) => indexOf(store, m.id)),
    )
    const bStart = Math.min(
      ...store.modules.filter((m) => m.groupId === b).map((m) => indexOf(store, m.id)),
    )
    expect(bStart).toBe(aEnd + 1)
  })

  it('그룹 멤버를 선택하고 원소 모듈을 추가하면 그 그룹 안 같은 컬럼에 들어간다', () => {
    // 조립형 편집 규칙(그룹 구성 바꾸기)은 그대로여야 한다
    const store = setup()
    const gid = store.addComposedTwoButton()!
    const right = store.modules.find((m) => m.groupId === gid && m.columnIndex === 1)!

    store.selectModule(right.id)
    store.addModule(meta('ModuleDescText'))

    const added = store.modules[indexOf(store, right.id) + 1]
    expect(added.moduleId).toBe('ModuleDescText')
    expect(added.groupId).toBe(gid)
    expect(added.columnIndex).toBe(1)
  })
})
