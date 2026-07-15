import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CanvasSettings, WrapSettings } from '@/types'
import { EDITOR_CONFIG } from '@/constants/defaults'

export const useEditorStore = defineStore('editor', () => {
  const canvasWidth = ref<'mobile' | 'desktop'>('desktop')

  // 좌측 모듈 패널 탭 모드 (모듈 / 템플릿 / 모듈 v2[임시]) — 캔버스 빈 화면 등에서 전환 가능하도록 공유
  // 'modules-v2': 원소 모듈을 그룹으로 조립하는 실험용 임시 탭 (POC)
  const modulePanelMode = ref<'modules' | 'templates' | 'modules-v2'>('modules')

  // 목차 패널 ↔ 캔버스 하이라이트 동기화용 (마우스 올린 모듈 id)
  const hoveredModuleId = ref<string | null>(null)

  // 좌측 아이콘 레일 활성 메뉴 (신규 디자인 IA)
  type EditorMenu =
    | 'style' | 'point' | 'modules' | 'text' | 'image' | 'button' | 'table' | 'ai' | 'order'
  const activeMenu = ref<EditorMenu>('modules')
  const setActiveMenu = (m: EditorMenu): void => {
    activeMenu.value = m
  }

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
    borderStyle: 'solid',
    pointColor: '#2563eb',
    fontLanguage: 'default'
  })

  /**
   * 캔버스 너비 설정 (모바일/데스크톱)
   */
  const setCanvasWidth = (width: 'mobile' | 'desktop'): void => {
    canvasWidth.value = width
  }

  /**
   * 좌측 모듈 패널 탭 모드 설정 (모듈 / 템플릿)
   */
  const setModulePanelMode = (mode: 'modules' | 'templates' | 'modules-v2'): void => {
    modulePanelMode.value = mode
  }

  /**
   * 목차 패널에서 마우스 올린 모듈 설정 (캔버스 하이라이트 연동)
   */
  const setHoveredModuleId = (id: string | null): void => {
    hoveredModuleId.value = id
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
    modulePanelMode,
    hoveredModuleId,
    activeMenu,
    setActiveMenu,
    setCanvasWidth,
    setModulePanelMode,
    setHoveredModuleId,
    updateCanvasSettings,
    updateWrapSettings,
    setZoom
  }
})