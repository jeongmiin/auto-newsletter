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
})