import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useModuleStore } from '../moduleStore'
import type { ModuleMetadata } from '@/types'

global.fetch = vi.fn()

const meta: ModuleMetadata = {
  id: 'TestModule',
  name: '테스트 모듈',
  description: '설명',
  category: 'common',
  icon: 'T',
  htmlFile: 'TestModule.html',
  editableProps: [{ key: 'title', label: '제목', type: 'text', default: 't' }],
}

/** n개의 모듈을 추가하고 id 배열을 반환 */
function addModules(store: ReturnType<typeof useModuleStore>, n: number): string[] {
  // addModule은 '선택된 모듈 뒤'에 삽입하므로, 매번 선택을 해제하고 끝에 추가되도록 한다
  for (let i = 0; i < n; i++) {
    store.selectedModuleId = null
    store.addModule(meta)
  }
  return store.modules.map((m) => m.id)
}

describe('moduleStore - 그룹', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('연속된 2개 모듈을 그룹으로 묶을 수 있다', () => {
    const store = useModuleStore()
    const ids = addModules(store, 3)

    const gid = store.createGroup([ids[0], ids[1]])

    expect(gid).not.toBeNull()
    expect(store.groups.length).toBe(1)
    expect(store.modules.find((m) => m.id === ids[0])?.groupId).toBe(gid)
    expect(store.modules.find((m) => m.id === ids[1])?.groupId).toBe(gid)
    expect(store.modules.find((m) => m.id === ids[2])?.groupId).toBeUndefined()
  })

  it('이미 그룹인 모듈이 포함되면 묶지 않고 null을 반환한다', () => {
    const store = useModuleStore()
    const ids = addModules(store, 4)
    const gid = store.createGroup([ids[0], ids[1]])! // 첫 그룹

    // 그룹 멤버(ids[0])를 다른 모듈(ids[2])과 다시 묶으려 시도
    const result = store.createGroup([ids[0], ids[2]])

    expect(result).toBeNull()
    // 기존 그룹은 그대로 유지되어야 함
    expect(store.groups.length).toBe(1)
    expect(store.modules.find((m) => m.id === ids[0])?.groupId).toBe(gid)
    expect(store.modules.find((m) => m.id === ids[2])?.groupId).toBeUndefined()
  })

  it('모듈 1개도 그룹으로 만들 수 있다 (그룹 스타일 적용용)', () => {
    const store = useModuleStore()
    const ids = addModules(store, 2)
    const gid = store.createGroup([ids[0]])
    expect(gid).not.toBeNull()
    expect(store.groups.length).toBe(1)
    expect(store.modules.find((m) => m.id === ids[0])?.groupId).toBe(gid)
  })

  it('빈 배열이면 그룹을 만들 수 없다', () => {
    const store = useModuleStore()
    addModules(store, 2)
    expect(store.createGroup([])).toBeNull()
    expect(store.groups.length).toBe(0)
  })

  it('비연속 모듈을 묶으면 연속되도록 재배치된다', () => {
    const store = useModuleStore()
    const ids = addModules(store, 4) // 0,1,2,3

    const gid = store.createGroup([ids[0], ids[2]])

    // 0,2가 인접 배치되어야 함
    const order = store.modules.map((m) => m.id)
    const i0 = order.indexOf(ids[0])
    const i2 = order.indexOf(ids[2])
    expect(Math.abs(i0 - i2)).toBe(1)
    expect(store.modules.filter((m) => m.groupId === gid).length).toBe(2)
  })

  it('displayItems가 연속 그룹을 한 항목으로 묶는다', () => {
    const store = useModuleStore()
    const ids = addModules(store, 3)
    store.createGroup([ids[0], ids[1]])

    const items = store.displayItems
    // [group(2개), module]
    expect(items.length).toBe(2)
    expect(items[0].type).toBe('group')
    expect(items[1].type).toBe('module')
    if (items[0].type === 'group') {
      expect(items[0].modules.length).toBe(2)
    }
  })

  it('그룹 해제 시 멤버 groupId와 그룹 정의가 제거된다', () => {
    const store = useModuleStore()
    const ids = addModules(store, 3)
    const gid = store.createGroup([ids[0], ids[1]])!

    store.ungroup(gid)

    expect(store.groups.length).toBe(0)
    expect(store.modules.every((m) => m.groupId === undefined)).toBe(true)
  })

  it('그룹 스타일을 업데이트할 수 있다', () => {
    const store = useModuleStore()
    const ids = addModules(store, 2)
    const gid = store.createGroup([ids[0], ids[1]])!

    store.updateGroupStyle(gid, 'backgroundColor', '#abcdef')
    expect(store.groups[0].styles.backgroundColor).toBe('#abcdef')
  })

  it('멤버를 1개 남기고 제거해도 그룹은 유지된다 (1개짜리 그룹 허용)', () => {
    const store = useModuleStore()
    const ids = addModules(store, 3)
    const gid = store.createGroup([ids[0], ids[1]])!

    store.removeModule(ids[0])

    // 남은 멤버 1개 → 그룹 유지
    expect(store.groups.find((g) => g.id === gid)).toBeDefined()
    expect(store.modules.find((m) => m.id === ids[1])?.groupId).toBe(gid)
  })

  it('마지막 멤버까지 제거하면 빈 그룹이 자동 해제된다', () => {
    const store = useModuleStore()
    const ids = addModules(store, 3)
    const gid = store.createGroup([ids[0], ids[1]])!

    store.removeModule(ids[0])
    store.removeModule(ids[1])

    expect(store.groups.find((g) => g.id === gid)).toBeUndefined()
  })

  it('moveGroup으로 그룹을 통째로 이동한다', () => {
    const store = useModuleStore()
    const ids = addModules(store, 3) // m0, m1, m2
    const gid = store.createGroup([ids[1], ids[2]])! // [m0, (m1,m2)]

    store.moveGroup(gid, 'up') // [(m1,m2), m0]

    const order = store.modules.map((m) => m.id)
    expect(order).toEqual([ids[1], ids[2], ids[0]])
  })

  it('setDisplayOrder는 그룹을 펼쳐 평평한 배열로 재구성한다', () => {
    const store = useModuleStore()
    const ids = addModules(store, 3)
    store.createGroup([ids[0], ids[1]])

    const items = [...store.displayItems].reverse() // 그룹과 모듈 순서 뒤집기
    store.setDisplayOrder(items)

    // 단독 모듈이 맨 앞, 그룹 멤버가 뒤로
    const order = store.modules.map((m) => m.id)
    expect(order[0]).toBe(ids[2])
    expect(order.slice(1).sort()).toEqual([ids[0], ids[1]].sort())
  })

  it('그룹 내 모듈 위/아래 이동은 그룹 경계를 넘지 않는다', () => {
    const store = useModuleStore()
    const ids = addModules(store, 3) // m0, m1, m2
    const gid = store.createGroup([ids[1], ids[2]])! // [m0, (m1,m2)]

    // m1은 그룹 첫 멤버 — 위로 이동 시도해도 그룹 밖(m0)으로 나가지 않음
    store.moveModuleUp(ids[1])
    expect(store.modules.find((m) => m.id === ids[1])?.groupId).toBe(gid)
    expect(store.modules[0].id).toBe(ids[0])
  })

  it('normalizeGroupContiguity가 흩어진 그룹 멤버를 다시 모은다', () => {
    const store = useModuleStore()
    const ids = addModules(store, 4)
    const gid = store.createGroup([ids[0], ids[1]])!

    // 강제로 비연속 상태 조작 (가져오기 등 외부 입력 시뮬레이션)
    const m1 = store.modules.find((m) => m.id === ids[1])!
    // 순서를 직접 흩뜨림: m1을 맨 뒤로
    store.modules.splice(store.modules.indexOf(m1), 1)
    store.modules.push(m1)
    store.modules.forEach((m, i) => (m.order = i))

    store.normalizeGroupContiguity()

    const groupIndexes = store.modules
      .map((m, i) => (m.groupId === gid ? i : -1))
      .filter((i) => i !== -1)
    expect(groupIndexes[1] - groupIndexes[0]).toBe(1)
  })
})
