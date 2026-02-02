import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CanvasSettings, WrapSettings } from '@/types'
import { EDITOR_CONFIG } from '@/constants/defaults'

export const useEditorStore = defineStore('editor', () => {
  const canvasWidth = ref<'mobile' | 'desktop'>('desktop')

  const canvasSettings = ref<CanvasSettings>({
    width: EDITOR_CONFIG.canvasDefaultWidth,
    backgroundColor: '#ffffff',
    fontFamily: 'Arial, sans-serif',
    zoom: 1
  })

  // 뉴스레터 wrap 설정 (공통 속성)
  const wrapSettings = ref<WrapSettings>({
    backgroundColor: '#f9f9f9',
    borderWidth: '0px',
    borderColor: '#dddddd',
    borderStyle: 'solid'
  })

  /**
   * 캔버스 너비 설정 (모바일/데스크톱)
   */
  const setCanvasWidth = (width: 'mobile' | 'desktop'): void => {
    canvasWidth.value = width
  }

  /**
   * 캔버스 설정 업데이트
   */
  const updateCanvasSettings = (settings: Partial<CanvasSettings>): void => {
    canvasSettings.value = { ...canvasSettings.value, ...settings }
  }

  /**
   * 줌 레벨 설정 (0.25 ~ 2.0)
   */
  const setZoom = (zoom: number): void => {
    canvasSettings.value.zoom = Math.max(
      EDITOR_CONFIG.zoomMin,
      Math.min(EDITOR_CONFIG.zoomMax, zoom)
    )
  }

  /**
   * Wrap 설정 업데이트 (공통 속성)
   */
  const updateWrapSettings = (settings: Partial<WrapSettings>): void => {
    wrapSettings.value = { ...wrapSettings.value, ...settings }
  }

  return {
    canvasWidth,
    canvasSettings,
    wrapSettings,
    setCanvasWidth,
    updateCanvasSettings,
    updateWrapSettings,
    setZoom
  }
})