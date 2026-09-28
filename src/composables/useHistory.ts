import { ref, watch, computed, onScopeDispose, effectScope } from 'vue'
import { storeToRefs } from 'pinia'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import type { ModuleInstance, ModuleGroup, WrapSettings } from '@/types'

interface HistoryState {
  modules: ModuleInstance[]
  groups: ModuleGroup[]
  selectedModuleId: string | null
  wrapSettings: WrapSettings
}

const MAX_HISTORY_SIZE = 50

/**
 * 실행 취소/다시 실행 기능을 제공하는 컴포저블
 */
export function useHistory() {
  const moduleStore = useModuleStore()
  const editorStore = useEditorStore()
  const { modules, groups, selectedModuleId } = storeToRefs(moduleStore)
  const { wrapSettings } = storeToRefs(editorStore)

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
      groups: JSON.parse(JSON.stringify(groups.value)),
      selectedModuleId: selectedModuleId.value,
      wrapSettings: JSON.parse(JSON.stringify(wrapSettings.value)),
    }
  }

  /**
   * 스냅샷을 스토어에 적용
   */
  const applySnapshot = (snapshot: HistoryState) => {
    isApplyingHistory.value = true

    // 모듈 상태 복원 — 스택에 남아있는 스냅샷이 이후 편집으로 오염되지 않도록 딥카피하여 적용
    const restored: ModuleInstance[] = JSON.parse(JSON.stringify(snapshot.modules))
    modules.value.splice(0, modules.value.length, ...restored)
    const restoredGroups: ModuleGroup[] = JSON.parse(JSON.stringify(snapshot.groups || []))
    groups.value.splice(0, groups.value.length, ...restoredGroups)
    selectedModuleId.value = snapshot.selectedModuleId
    if (snapshot.wrapSettings) {
      editorStore.applyLoadedWrapSettings(JSON.parse(JSON.stringify(snapshot.wrapSettings)))
    }

    // debounce 시간(300ms)보다 길게 대기하여 watcher가 이 변경을 무시하도록 함
    setTimeout(() => {
      isApplyingHistory.value = false
    }, 400)
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
    // 스택 맨 위는 '현재 상태'이므로, 그 아래(이전 상태)가 있어야 되돌릴 수 있음
    if (undoStack.value.length <= 1) return false

    // 현재 상태를 꺼내 redo 스택으로 이동
    const current = undoStack.value.pop()!
    redoStack.value.push(current)

    // 새 맨 위(=이전 상태)를 현재로 적용 (스택에는 그대로 유지)
    const previousState = undoStack.value[undoStack.value.length - 1]
    applySnapshot(previousState)

    return true
  }

  /**
   * 다시 실행 (Ctrl+Y / Ctrl+Shift+Z)
   */
  const redo = () => {
    if (redoStack.value.length === 0) return false

    // 다음 상태를 undo 스택으로 복귀시키고 현재로 적용 (맨 위 = 현재 상태 유지)
    const nextState = redoStack.value.pop()!
    undoStack.value.push(nextState)
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
  // 맨 위 항목은 현재 상태이므로, 되돌릴 이전 상태가 존재하려면 2개 이상이어야 함
  const canUndo = computed(() => undoStack.value.length > 1)
  const canRedo = computed(() => redoStack.value.length > 0)

  // 모듈 변경 감시 (자동 저장)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const stopWatcher = watch(
    [modules, groups, wrapSettings],
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

  /**
   * 템플릿·파일을 통째로 불러오는 동안에는 감시를 멈춘다.
   *
   * 위 감시는 `deep: true`라, 모듈 하나를 넣거나 속성 하나를 바꿀 때마다 **모듈 배열 전체를
   * 다시 훑는다.** 평소 편집(한 번에 한 곳)에서는 문제가 없지만, 템플릿을 불러올 때는
   * 모듈 수십 개 × 속성 수백 개가 연달아 바뀌어 훑는 비용이 제곱으로 불어난다.
   * 불러오는 동안에는 되돌릴 중간 상태도 없으니, 멈췄다가 끝나고 한 번만 저장하면 된다.
   *
   * (개발 서버나 Vue DevTools처럼 반응형 한 번의 비용이 비싼 환경에서 특히 크게 차이 난다)
   */
  const runBulk = async <T>(fn: () => T | Promise<T>): Promise<T> => {
    stopWatcher.pause()
    try {
      return await fn()
    } finally {
      stopWatcher.resume()
    }
  }

  // 클린업: watcher와 타이머 정리
  onScopeDispose(() => {
    stopWatcher()
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  })

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
    runBulk,
    undoStackSize: () => undoStack.value.length,
    redoStackSize: () => redoStack.value.length,
  }
}

// 싱글톤 인스턴스
let historyInstance: ReturnType<typeof useHistory> | null = null
let historyScope: ReturnType<typeof effectScope> | null = null

/**
 * 앱 전역에서 공유하는 실행취소 인스턴스.
 *
 * ⚠ **분리된 effect scope(detached)에서 만든다.** 그냥 만들면 `useHistory` 안의 watcher가
 * "이 함수를 처음 부른 컴포넌트"의 scope에 매달려, 그 컴포넌트가 언마운트될 때
 * `onScopeDispose`로 **감시가 죽는다**. 헤더(AppHeader)는 템플릿 선택 화면에도 있으므로
 * 싱글톤이 거기서 만들어지고, 에디터로 넘어오는 순간 감시가 끊겨
 * 실행취소·다시실행 버튼과 Ctrl+Z가 통째로 먹지 않았다.
 */
export function getHistoryInstance() {
  if (!historyInstance) {
    historyScope = effectScope(true)
    historyInstance = historyScope.run(() => useHistory())!
  }
  return historyInstance
}

/** 테스트용 — 싱글톤과 그 scope(watcher)를 정리한다 */
export function disposeHistoryInstance(): void {
  historyScope?.stop()
  historyScope = null
  historyInstance = null
}
