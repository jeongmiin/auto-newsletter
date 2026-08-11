import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useModuleStore } from '../moduleStore'
import type { ModuleMetadata } from '@/types'

// Mock fetch
global.fetch = vi.fn()

const mockModuleMetadata: ModuleMetadata = {
  id: 'TestModule',
  name: '테스트 모듈',
  description: '테스트용 모듈입니다',
  category: 'common',
  icon: 'T',
  htmlFile: 'TestModule.html',
  editableProps: [
    {
      key: 'title',
      label: '제목',
      type: 'text',
      default: '기본 제목',
      placeholder: '제목을 입력하세요',
    },
    {
      key: 'content',
      label: '내용',
      type: 'textarea',
      default: '기본 내용',
    },
    {
      key: 'showButton',
      label: '버튼 표시',
      type: 'boolean',
      default: false,
    },
  ],
}

describe('moduleStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('모듈 관리', () => {
    it('모듈을 추가할 수 있어야 함', () => {
      const store = useModuleStore()
      const initialCount = store.modules.length

      store.addModule(mockModuleMetadata)

      expect(store.modules.length).toBe(initialCount + 1)
      expect(store.modules[0].moduleId).toBe('TestModule')
    })

    it('모듈 추가 시 자동으로 선택되어야 함', () => {
      const store = useModuleStore()

      store.addModule(mockModuleMetadata)

      expect(store.selectedModuleId).toBe(store.modules[0].id)
      expect(store.selectedModule).not.toBeNull()
    })

    it('모듈 추가 시 기본 속성이 설정되어야 함', () => {
      const store = useModuleStore()

      store.addModule(mockModuleMetadata)

      expect(store.modules[0].properties.title).toBe('기본 제목')
      expect(store.modules[0].properties.content).toBe('기본 내용')
      expect(store.modules[0].properties.showButton).toBe(false)
    })

    it('모듈을 제거할 수 있어야 함', () => {
      const store = useModuleStore()
      store.addModule(mockModuleMetadata)
      const moduleId = store.modules[0].id

      store.removeModule(moduleId)

      expect(store.modules.length).toBe(0)
    })

    it('선택된 모듈 제거 시 선택이 해제되어야 함', () => {
      const store = useModuleStore()
      store.addModule(mockModuleMetadata)
      const moduleId = store.modules[0].id

      store.removeModule(moduleId)

      expect(store.selectedModuleId).toBeNull()
      expect(store.selectedModule).toBeNull()
    })

    it('모듈을 복제할 수 있어야 함', () => {
      const store = useModuleStore()
      store.addModule(mockModuleMetadata)
      const originalId = store.modules[0].id
      store.updateModuleProperty('title', '수정된 제목')

      store.duplicateModule(originalId)

      expect(store.modules.length).toBe(2)
      expect(store.modules[1].properties.title).toBe('수정된 제목')
      expect(store.modules[1].id).not.toBe(originalId)
    })
  })

  describe('모듈 선택', () => {
    it('모듈을 선택할 수 있어야 함', () => {
      const store = useModuleStore()
      store.addModule(mockModuleMetadata)
      const moduleId = store.modules[0].id

      store.selectModule(moduleId)

      expect(store.selectedModuleId).toBe(moduleId)
    })

    it('선택된 모듈의 메타데이터를 가져올 수 있어야 함', () => {
      const store = useModuleStore()
      store.availableModules = [mockModuleMetadata]
      store.addModule(mockModuleMetadata)

      expect(store.selectedModuleMetadata).not.toBeNull()
      expect(store.selectedModuleMetadata?.name).toBe('테스트 모듈')
    })
  })

  describe('모듈 속성 업데이트', () => {
    it('모듈 속성을 업데이트할 수 있어야 함', () => {
      const store = useModuleStore()
      store.addModule(mockModuleMetadata)

      store.updateModuleProperty('title', '새 제목')

      expect(store.selectedModule?.properties.title).toBe('새 제목')
    })

    it('모듈 스타일을 업데이트할 수 있어야 함', () => {
      const store = useModuleStore()
      store.addModule(mockModuleMetadata)

      store.updateModuleStyle('color', '#ff0000')

      expect(store.selectedModule?.styles.color).toBe('#ff0000')
    })
  })

  describe('모듈 순서 변경', () => {
    it('모듈을 위로 이동할 수 있어야 함', () => {
      const store = useModuleStore()
      store.addModule(mockModuleMetadata)
      store.addModule(mockModuleMetadata)
      const firstId = store.modules[0].id
      const secondId = store.modules[1].id

      store.moveModuleUp(secondId)

      expect(store.modules[0].id).toBe(secondId)
      expect(store.modules[1].id).toBe(firstId)
    })

    it('첫 번째 모듈은 위로 이동할 수 없어야 함', () => {
      const store = useModuleStore()
      store.addModule(mockModuleMetadata)
      const moduleId = store.modules[0].id

      store.moveModuleUp(moduleId)

      expect(store.modules[0].id).toBe(moduleId)
    })

    it('모듈을 아래로 이동할 수 있어야 함', () => {
      const store = useModuleStore()
      store.addModule(mockModuleMetadata)
      store.addModule(mockModuleMetadata)
      const firstId = store.modules[0].id
      const secondId = store.modules[1].id

      store.moveModuleDown(firstId)

      expect(store.modules[0].id).toBe(secondId)
      expect(store.modules[1].id).toBe(firstId)
    })

    it('마지막 모듈은 아래로 이동할 수 없어야 함', () => {
      const store = useModuleStore()
      store.addModule(mockModuleMetadata)
      store.addModule(mockModuleMetadata)
      const lastId = store.modules[1].id

      store.moveModuleDown(lastId)

      expect(store.modules[1].id).toBe(lastId)
    })
  })

  describe('전체 삭제', () => {
    it('모든 모듈을 삭제할 수 있어야 함', () => {
      const store = useModuleStore()
      store.addModule(mockModuleMetadata)
      store.addModule(mockModuleMetadata)

      store.clearAll()

      expect(store.modules.length).toBe(0)
      expect(store.selectedModuleId).toBeNull()
    })
  })

  describe('테이블 행 관리', () => {
    it('테이블 행을 추가할 수 있어야 함', () => {
      const store = useModuleStore()
      store.addModule(mockModuleMetadata)
      const moduleId = store.modules[0].id

      store.addTableRow(moduleId, '헤더', '데이터')

      expect(store.modules[0].properties.tableRows).toHaveLength(1)
      expect((store.modules[0].properties.tableRows as any)[0].header).toBe('헤더')
    })

    it('테이블 행을 업데이트할 수 있어야 함', () => {
      const store = useModuleStore()
      store.addModule(mockModuleMetadata)
      const moduleId = store.modules[0].id
      store.addTableRow(moduleId, '헤더', '데이터')
      const rowId = (store.modules[0].properties.tableRows as any)[0].id

      store.updateTableRow(moduleId, rowId, 'header', '새 헤더')

      expect((store.modules[0].properties.tableRows as any)[0].header).toBe('새 헤더')
    })

    it('테이블 행을 제거할 수 있어야 함', () => {
      const store = useModuleStore()
      store.addModule(mockModuleMetadata)
      const moduleId = store.modules[0].id
      store.addTableRow(moduleId, '헤더', '데이터')
      const rowId = (store.modules[0].properties.tableRows as any)[0].id

      store.removeTableRow(moduleId, rowId)

      expect(store.modules[0].properties.tableRows).toHaveLength(0)
    })
  })

  describe('모듈 메타데이터 로드', () => {
    it('모듈 설정을 성공적으로 로드해야 함', async () => {
      const mockResponse = {
        modules: [mockModuleMetadata],
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const store = useModuleStore()
      const result = await store.loadAvailableModules()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('TestModule')
    })

    it('잘못된 형식의 모듈은 제외되어야 함', async () => {
      const mockResponse = {
        modules: [
          mockModuleMetadata,
          { id: 'Invalid' }, // editableProps 누락
        ],
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const store = useModuleStore()
      const result = await store.loadAvailableModules()

      expect(result).toHaveLength(1)
    })

    it('fetch 실패 시 빈 배열을 반환해야 함', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const store = useModuleStore()
      const result = await store.loadAvailableModules()

      expect(result).toHaveLength(0)
    })
  })

  describe('행별 독립 컬럼 (rows 모델)', () => {
    // 모듈 3개 추가하고 id 반환
    const addThree = (store: ReturnType<typeof useModuleStore>) => {
      store.addModule(mockModuleMetadata)
      store.addModule(mockModuleMetadata)
      store.addModule(mockModuleMetadata)
      return store.modules.map((m) => m.id)
    }

    it('createGroup은 1행·1컬럼 세로 스택 그룹을 만든다', () => {
      const store = useModuleStore()
      const [a, b] = addThree(store)
      const gid = store.createGroup([a, b])
      const group = store.groups.find((g) => g.id === gid)
      expect(group?.rows).toEqual([1])
      expect(store.modules.find((m) => m.id === a)?.rowIndex).toBe(0)
      expect(store.modules.find((m) => m.id === b)?.columnIndex).toBe(0)
    })

    it('splitModuleColumns는 그 모듈이 속한 행만 +1단 한다', () => {
      const store = useModuleStore()
      const [a, b] = addThree(store)
      const gid = store.createGroup([a, b])
      store.splitModuleColumns(a) // 0행만 2단으로
      const group = store.groups.find((g) => g.id === gid)
      expect(group?.rows).toEqual([2])
    })

    it('reorderGroupMembers는 그룹 안 멤버 순서만 바꾸고 그룹 경계는 유지한다', () => {
      const store = useModuleStore()
      const [a, b, c] = addThree(store)
      const gid = store.createGroup([a, b])
      store.reorderGroupMembers(gid!, [b, a])
      // 그룹 멤버 순서만 뒤집히고, 그룹 밖 모듈(c)은 계속 뒤에 남는다
      expect(store.modules.map((m) => m.id)).toEqual([b, a, c])
      expect(store.modules.map((m) => m.order)).toEqual([0, 1, 2])
      expect(store.modules.find((m) => m.id === c)?.groupId).toBeUndefined()
    })

    it('reorderGroupMembers는 행/컬럼 골격을 그대로 두고 멤버만 자리를 바꾼다', () => {
      const store = useModuleStore()
      const [a, b, c] = addThree(store)
      const g1 = store.createGroup([b, c])
      store.splitModuleColumns(b) // g1 0행 → 2단
      store.moveModuleColumn(c, 'right') // C를 1번 컬럼으로
      const merged = store.mergeModulesIntoGroup([a, b, c])!
      const group = store.groups.find((g) => g.id === merged)
      expect(group?.rows).toEqual([1, 2])

      store.reorderGroupMembers(merged, [c, a, b])
      // 슬롯(0행 1컬럼 / 1행 0컬럼 / 1행 1컬럼)은 그대로, 그 자리에 새 순서의 멤버가 들어간다
      expect(group?.rows).toEqual([1, 2])
      expect(store.modules.map((m) => m.id)).toEqual([c, a, b])
      expect(store.modules.find((m) => m.id === c)).toMatchObject({ rowIndex: 0, columnIndex: 0 })
      expect(store.modules.find((m) => m.id === a)).toMatchObject({ rowIndex: 1, columnIndex: 0 })
      expect(store.modules.find((m) => m.id === b)).toMatchObject({ rowIndex: 1, columnIndex: 1 })
      void g1
    })

    it('mergeModulesIntoGroup은 각 그룹의 행 구조를 보존해 합친다 (1행+2행)', () => {
      const store = useModuleStore()
      const [a, b, c] = addThree(store)
      // B·C를 2컬럼 한 행 그룹으로
      const g1 = store.createGroup([b, c])
      store.splitModuleColumns(b) // g1 0행 → 2단
      store.moveModuleColumn(c, 'right') // C를 1번 컬럼으로
      // 단독 A + (2컬럼)B·C 를 한 그룹으로 병합
      const merged = store.mergeModulesIntoGroup([a, b, c])
      const group = store.groups.find((g) => g.id === merged)
      // 0행: A(전체폭 1컬럼), 1행: B·C(2컬럼)
      expect(group?.rows).toEqual([1, 2])
      expect(store.modules.find((m) => m.id === a)).toMatchObject({ rowIndex: 0, columnIndex: 0 })
      expect(store.modules.find((m) => m.id === b)).toMatchObject({ rowIndex: 1, columnIndex: 0 })
      expect(store.modules.find((m) => m.id === c)).toMatchObject({ rowIndex: 1, columnIndex: 1 })
      // 병합된 기존 그룹(g1)은 제거됨
      expect(store.groups.find((g) => g.id === g1)).toBeUndefined()
    })

    it('한 그룹 안에서 행마다 컬럼 수가 독립적으로 바뀐다', () => {
      const store = useModuleStore()
      const [a, b, c] = addThree(store)
      const g1 = store.createGroup([b, c])
      store.splitModuleColumns(b)
      store.moveModuleColumn(c, 'right')
      const merged = store.mergeModulesIntoGroup([a, b, c])
      const group = store.groups.find((g) => g.id === merged)
      expect(group?.rows).toEqual([1, 2])
      // 0행(A) 만 한 번 더 분할 → [2,2], 다시 → [3,2] (1행은 그대로)
      store.splitModuleColumns(a)
      expect(group?.rows).toEqual([2, 2])
      store.splitModuleColumns(a)
      expect(group?.rows).toEqual([3, 2])
      void g1
    })

    it('그룹이 선택된 상태에서 모듈을 추가하면 그 그룹 바로 아래(그룹 밖)에 삽입된다', () => {
      const store = useModuleStore()
      const [a, b, c] = addThree(store) // 순서: a, b, c
      const gid = store.createGroup([a, b]) as string // a,b를 그룹으로 (c는 그룹 밖, 뒤)
      store.selectGroup(gid) // 그룹 선택 (모듈 미선택)
      store.addModule(mockModuleMetadata) // 그룹 아래에 추가되어야 함
      const ids = store.modules.map((m) => m.id)
      const newId = store.selectedModuleId as string
      // 새 모듈은 b(그룹 마지막 멤버) 바로 뒤, c 앞에 위치
      expect(ids.indexOf(newId)).toBe(ids.indexOf(b) + 1)
      expect(ids.indexOf(newId)).toBeLessThan(ids.indexOf(c))
      // 그룹에 속하지 않아야 함
      expect(store.modules.find((m) => m.id === newId)?.groupId).toBeUndefined()
    })
  })
})