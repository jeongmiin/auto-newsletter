import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { HistoryState, CanvasSettings } from '@/types'

export const useEditorStore = defineStore('editor', () => {
  const canvasWidth = ref<'mobile' | 'desktop'>('desktop')
  const history = ref<HistoryState[]>([])
  const currentHistoryIndex = ref(-1)
  const maxHistoryStates = 50

  const canvasSettings = ref<CanvasSettings>({
    width: 600,
    backgroundColor: '#ffffff',
    fontFamily: 'Arial, sans-serif',
    zoom: 1
  })

  const canUndo = computed(() => currentHistoryIndex.value > 0)
  const canRedo = computed(() => currentHistoryIndex.value < history.value.length - 1)

  // 캔버스 너비 설정
  const setCanvasWidth = (width: 'mobile' | 'desktop') => {
    canvasWidth.value = width
  }

  // 히스토리 상태 추가
  const addHistoryState = (modules: unknown[], action: string) => {
    // 현재 인덱스 이후의 히스토리 제거 (새로운 액션 시)
    if (currentHistoryIndex.value < history.value.length - 1) {
      history.value.splice(currentHistoryIndex.value + 1)
    }

    const state: HistoryState = {
      modules: JSON.parse(JSON.stringify(modules)), // 깊은 복사
      timestamp: Date.now(),
      action
    }

    history.value.push(state)
    currentHistoryIndex.value = history.value.length - 1

    // 최대 히스토리 개수 초과시 오래된 것부터 제거
    if (history.value.length > maxHistoryStates) {
      history.value.shift()
      currentHistoryIndex.value--
    }
  }

  // 실행 취소
  const undo = (): unknown[] | null => {
    if (!canUndo.value) return null

    currentHistoryIndex.value--
    return history.value[currentHistoryIndex.value].modules
  }

  // 다시 실행
  const redo = (): unknown[] | null => {
    if (!canRedo.value) return null

    currentHistoryIndex.value++
    return history.value[currentHistoryIndex.value].modules
  }

  // 히스토리 초기화
  const clearHistory = () => {
    history.value = []
    currentHistoryIndex.value = -1
  }

  // 캔버스 설정 업데이트
  const updateCanvasSettings = (settings: Partial<CanvasSettings>) => {
    canvasSettings.value = { ...canvasSettings.value, ...settings }
  }

  // 줌 설정
  const setZoom = (zoom: number) => {
    canvasSettings.value.zoom = Math.max(0.25, Math.min(2, zoom))
  }

  return {
    canvasWidth,
    canvasSettings,
    canUndo,
    canRedo,
    setCanvasWidth,
    addHistoryState,
    undo,
    redo,
    clearHistory,
    updateCanvasSettings,
    setZoom
  }
})