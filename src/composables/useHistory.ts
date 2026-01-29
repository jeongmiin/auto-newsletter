import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useModuleStore } from '@/stores/moduleStore'
import type { ModuleInstance } from '@/types'

interface HistoryState {
  modules: ModuleInstance[]
  selectedModuleId: string | null
}

const MAX_HISTORY_SIZE = 50

/**
 * 실행 취소/다시 실행 기능을 제공하는 컴포저블
 */
export function useHistory() {
  const moduleStore = useModuleStore()
  const { modules, selectedModuleId } = storeToRefs(moduleStore)

  // 히스토리 스택
  const undoStack = ref<HistoryState[]>([])
  const redoStack = ref<HistoryState[]>([])
  const isApplyingHistory = ref(false)

  /**
   * 현재 상태의 딥 카피 생성
   */
  const createSnapshot = (): HistoryState => {
    return {
      modules: JSON.parse(JSON.stringify(modules.value)),
      selectedModuleId: selectedModuleId.value,
    }
  }

  /**
   * 스냅샷을 스토어에 적용
   */
  const applySnapshot = (snapshot: HistoryState) => {
    isApplyingHistory.value = true

    // 모듈 상태 복원
    modules.value.splice(0, modules.value.length, ...snapshot.modules)
    selectedModuleId.value = snapshot.selectedModuleId

    // 다음 틱에서 플래그 해제
    setTimeout(() => {
      isApplyingHistory.value = false
    }, 0)
  }

  /**
   * 현재 상태를 히스토리에 저장
   */
  const saveState = () => {
    if (isApplyingHistory.value) return

    const snapshot = createSnapshot()
    undoStack.value.push(snapshot)

    // 최대 크기 초과 시 오래된 항목 제거
    if (undoStack.value.length > MAX_HISTORY_SIZE) {
      undoStack.value.shift()
    }

    // 새 액션 시 redo 스택 클리어
    redoStack.value = []
  }

  /**
   * 실행 취소 (Ctrl+Z)
   */
  const undo = () => {
    if (undoStack.value.length === 0) return false

    // 현재 상태를 redo 스택에 저장
    redoStack.value.push(createSnapshot())

    // 이전 상태 복원
    const previousState = undoStack.value.pop()!
    applySnapshot(previousState)

    return true
  }

  /**
   * 다시 실행 (Ctrl+Y / Ctrl+Shift+Z)
   */
  const redo = () => {
    if (redoStack.value.length === 0) return false

    // 현재 상태를 undo 스택에 저장
    undoStack.value.push(createSnapshot())

    // 다음 상태 복원
    const nextState = redoStack.value.pop()!
    applySnapshot(nextState)

    return true
  }

  /**
   * 히스토리 초기화
   */
  const clearHistory = () => {
    undoStack.value = []
    redoStack.value = []
  }

  /**
   * 실행 취소/다시 실행 가능 여부
   */
  const canUndo = () => undoStack.value.length > 0
  const canRedo = () => redoStack.value.length > 0

  // 모듈 변경 감시 (자동 저장)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  watch(
    modules,
    () => {
      if (isApplyingHistory.value) return

      // 디바운스로 빠른 연속 변경 시 한 번만 저장
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        saveState()
      }, 300)
    },
    { deep: true }
  )

  // 초기 상태 저장
  if (modules.value.length > 0) {
    saveState()
  }

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    saveState,
    undoStackSize: () => undoStack.value.length,
    redoStackSize: () => redoStack.value.length,
  }
}

// 싱글톤 인스턴스
let historyInstance: ReturnType<typeof useHistory> | null = null

export function getHistoryInstance() {
  if (!historyInstance) {
    historyInstance = useHistory()
  }
  return historyInstance
}
