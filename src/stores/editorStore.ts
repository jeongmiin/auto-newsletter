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

  // true면 캔버스에 선택된 모듈/그룹이 있어도 좌측 패널은 activeMenu(레일) 쪽을 그대로 보여준다.
  // 레일 메뉴를 명시적으로 클릭했을 때 켜지고, 모듈/그룹이 "새로" 선택되면(모듈 추가 포함) 자동으로 꺼진다
  // (moduleStore의 selectedModuleId/selectedGroupId 변경 감시 — moduleStore.ts 참고).
  const forceRailPanel = ref(false)

  const setActiveMenu = (m: EditorMenu): void => {
    activeMenu.value = m
    forceRailPanel.value = true
  }

  const canvasSettings = ref<CanvasSettings>({
    width: EDITOR_CONFIG.canvasDefaultWidth,
    backgroundColor: '#ffffff',
    fontFamily: 'Arial, sans-serif',
    zoom: 1
  })

  // 뉴스레터 wrap 설정 (전체 스타일 / 포인트 색상)
  const wrapSettings = ref<WrapSettings>({
    backgroundColor: '#f9f9f9',
    borderEnabled: false,
    borderWidth: '6px',
    borderColor: '#dddddd',
    borderStyle: 'solid',
    pointColor: '#2563eb',
    pointColors: ['#2563eb'],
    fontLanguage: 'default',
    summary: ''
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
   * Wrap 설정 업데이트 (전체 스타일 / 포인트 색상)
   * pointColor(단일, 렌더 파이프라인 전역에서 사용)와 pointColors(좌측 "포인트 색상" 패널의 팔레트,
   * 최대 3개) 는 서로 동기화한다 — 어느 쪽을 갱신하든 [0]번 색상이 실제 적용되는 포인트 색상이다.
   */
  const updateWrapSettings = (settings: Partial<WrapSettings>): void => {
    const next: WrapSettings = { ...wrapSettings.value, ...settings }
    if (settings.pointColors) {
      next.pointColors = settings.pointColors.slice(0, 3)
      next.pointColor = next.pointColors[0] ?? next.pointColor
    } else if (settings.pointColor) {
      next.pointColors = [settings.pointColor, ...(wrapSettings.value.pointColors ?? []).filter((c) => c !== settings.pointColor)].slice(0, 3)
    }
    wrapSettings.value = next
  }

  /**
   * 포인트 색상 팔레트에 색상 추가 (최대 3개 — 가득 찼으면 마지막 슬롯을 교체).
   * 현재 활성(pointColor, [0]번) 색상은 건드리지 않는다.
   */
  const addPointColor = (color: string): void => {
    const current = wrapSettings.value.pointColors ?? []
    if (current.some((c) => c.toLowerCase() === color.toLowerCase())) return
    const next = current.length >= 3 ? [...current.slice(0, 2), color] : [...current, color]
    wrapSettings.value = { ...wrapSettings.value, pointColors: next, pointColor: next[0] ?? wrapSettings.value.pointColor }
  }

  /** 팔레트의 특정 색상을 활성(pointColor)으로 지정 — 맨 앞으로 이동 */
  const setActivePointColor = (color: string): void => {
    const current = wrapSettings.value.pointColors ?? []
    const rest = current.filter((c) => c !== color)
    wrapSettings.value = {
      ...wrapSettings.value,
      pointColors: [color, ...rest].slice(0, 3),
      pointColor: color,
    }
  }

  /** 팔레트에서 색상 제거 (최소 1개는 유지) */
  const removePointColor = (color: string): void => {
    const current = wrapSettings.value.pointColors ?? []
    if (current.length <= 1) return
    const next = current.filter((c) => c !== color)
    wrapSettings.value = {
      ...wrapSettings.value,
      pointColors: next,
      pointColor: next[0] ?? wrapSettings.value.pointColor,
    }
  }

  return {
    canvasWidth,
    canvasSettings,
    wrapSettings,
    modulePanelMode,
    hoveredModuleId,
    activeMenu,
    forceRailPanel,
    setActiveMenu,
    setCanvasWidth,
    setModulePanelMode,
    setHoveredModuleId,
    updateCanvasSettings,
    updateWrapSettings,
    addPointColor,
    setActivePointColor,
    removePointColor,
    setZoom
  }
})