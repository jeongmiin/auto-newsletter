import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CanvasSettings, WrapSettings } from '@/types'
import { EDITOR_CONFIG } from '@/constants/defaults'

export const useEditorStore = defineStore('editor', () => {
  const canvasWidth = ref<'mobile' | 'desktop'>('desktop')

  // 좌측 모듈 패널 탭 모드 (모듈 / 모듈 v2[임시])
  // 'modules-v2': 원소 모듈을 그룹으로 조립하는 실험용 임시 탭 (POC)
  const modulePanelMode = ref<'modules' | 'modules-v2'>('modules')

  // 목차 패널 ↔ 캔버스 하이라이트 동기화용 (마우스 올린 모듈 id)
  const hoveredModuleId = ref<string | null>(null)

  // 현재 편집 중인 템플릿 이름 (헤더 브레드크럼 표시용) — 빈 문서면 '빈 템플릿'
  const currentTemplateName = ref('빈 템플릿')
  const setCurrentTemplateName = (name: string): void => {
    currentTemplateName.value = name || '빈 템플릿'
  }

  /**
   * 현재 작업의 소속 팀/템플릿 **id**.
   *
   * 표시명이 아니라 불변 id를 담는다 — 팀명이 조직개편으로 바뀌어도 이 값이 가리키는
   * 대상은 그대로다(`templates-config.json`의 departments 규칙 참고). 헤더에 보여줄
   * 팀 이름은 이 id로 트리에서 찾아 쓴다.
   *
   * 앞으로 팀별 이미지 업로드 경로·저장 파일 메타데이터가 이 값을 참조한다.
   * ⚠ 새로고침하면 사라진다(작업 내용 자체가 메모리에만 있으므로 동작이 어긋나지 않는다).
   */
  const currentTeamId = ref<string | null>(null)
  const currentTemplateId = ref<string | null>(null)

  /** 템플릿을 골라 에디터로 들어올 때 한 번에 지정한다 */
  const setCurrentTemplate = (info: {
    templateId: string | null
    templateName: string
    teamId: string | null
  }): void => {
    currentTemplateId.value = info.templateId
    currentTeamId.value = info.teamId
    setCurrentTemplateName(info.templateName)
  }

  // 좌측 아이콘 레일 활성 메뉴 (신규 디자인 IA)
  // '모듈 순서'는 좌측 패널을 바꾸지 않고 캔버스 오른쪽 패널을 여닫으므로 여기 포함되지 않는다.
  type EditorMenu =
    | 'style' | 'point' | 'modules' | 'text' | 'image' | 'button' | 'table' | 'ai'
  const activeMenu = ref<EditorMenu>('modules')

  // 캔버스 오른쪽 '모듈 순서' 패널 열림 상태 (기본 닫힘 — 레일 메뉴나 패널 가장자리 탭으로 여닫는다)
  const isOrderPanelOpen = ref(false)

  const toggleOrderPanel = (): void => {
    isOrderPanelOpen.value = !isOrderPanelOpen.value
  }

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

  /**
   * 뉴스레터 wrap 설정(전체 스타일 / 포인트 색상)의 **처음 값**.
   * '빈 템플릿'·'전체 삭제'가 여기로 되돌리므로, 기본값은 반드시 이 한 곳에서만 정한다.
   */
  const createDefaultWrapSettings = (): WrapSettings => ({
    backgroundColor: '#f9f9f9',
    borderEnabled: false,
    borderWidth: '6px',
    borderColor: '#dddddd',
    borderStyle: 'solid',
    pointColor: '#2563eb',
    pointColors: ['#2563eb'],
    fontLanguage: 'default',
    summary: '',
    volume: '',
  })

  // 뉴스레터 wrap 설정 (전체 스타일 / 포인트 색상)
  const wrapSettings = ref<WrapSettings>(createDefaultWrapSettings())

  /**
   * 캔버스 너비 설정 (모바일/데스크톱)
   */
  const setCanvasWidth = (width: 'mobile' | 'desktop'): void => {
    canvasWidth.value = width
  }

  /**
   * 좌측 모듈 패널 탭 모드 설정
   */
  const setModulePanelMode = (mode: 'modules' | 'modules-v2'): void => {
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
      // 팔레트를 통째로 넘기면 그 값이 전부다 — 빈 팔레트면 적용 색상도 비운다(removePointColor와 동일).
      next.pointColors = settings.pointColors.slice(0, 3)
      next.pointColor = next.pointColors[0] ?? ''
    } else if (settings.pointColor) {
      next.pointColors = [settings.pointColor, ...(wrapSettings.value.pointColors ?? []).filter((c) => c !== settings.pointColor)].slice(0, 3)
    }
    wrapSettings.value = next
  }

  /**
   * 전체 스타일을 처음 값으로 되돌린다 — '빈 템플릿'·'전체 삭제'용.
   * 배경색·테두리·포인트 색상·뉴스레터 요약이 모두 기본값으로 돌아간다.
   */
  const resetWrapSettings = (): void => {
    wrapSettings.value = createDefaultWrapSettings()
  }

  /**
   * 파일·템플릿을 열 때의 전체 스타일 적용.
   *
   * 포인트 색상 팔레트는 **여는 쪽이 정한다**. 그냥 updateWrapSettings로 넘기면 예전 파일처럼
   * 단일 pointColor만 있는 경우 그 색만 [0]번에 꽂히고, 직전에 열어 둔 템플릿의 2·3번 색이
   * 팔레트에 그대로 남는다(파일에는 1개뿐인데 3개가 보인다).
   * 팔레트가 없는 파일은 단일 색 하나짜리 팔레트로 본다.
   * 색상 정보가 아예 없는 파일이면 판단 근거가 없으므로 지금 팔레트를 그대로 둔다.
   */
  const applyLoadedWrapSettings = (settings: Partial<WrapSettings>): void => {
    const palette =
      settings.pointColors ??
      (settings.pointColor !== undefined ? [settings.pointColor].filter(Boolean) : null)
    updateWrapSettings(palette ? { ...settings, pointColors: palette } : settings)
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

  /**
   * 새 포인트 색상 슬롯을 하나 추가하고 그 인덱스를 반환한다(중복 검사 없음, 최대 3개).
   * 포인트 색상 추가 모달에서 "색을 고르는 즉시" 새 슬롯을 만들 때 사용한다.
   * 이후 같은 슬롯을 updatePointColorAt로 갱신하면 슬롯이 계속 늘지 않는다.
   */
  const appendPointColor = (color: string): number => {
    const current = wrapSettings.value.pointColors ?? []
    const next = current.length >= 3 ? [...current.slice(0, 2), color] : [...current, color]
    const index = next.length - 1
    wrapSettings.value = { ...wrapSettings.value, pointColors: next, pointColor: color }
    return index
  }

  /** 특정 인덱스의 포인트 색상 값을 교체(추가 모달에서 편집 중인 슬롯 실시간 갱신용) */
  const updatePointColorAt = (index: number, color: string): void => {
    const current = wrapSettings.value.pointColors ?? []
    if (index < 0 || index >= current.length) return
    const prev = current[index]
    const next = current.slice()
    next[index] = color
    wrapSettings.value = {
      ...wrapSettings.value,
      pointColors: next,
      pointColor: wrapSettings.value.pointColor === prev ? color : wrapSettings.value.pointColor,
    }
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

  /** 팔레트에서 색상 제거 (전부 삭제 가능 — 비면 pointColor는 '' → 렌더는 기본색으로 폴백) */
  const removePointColor = (color: string): void => {
    const current = wrapSettings.value.pointColors ?? []
    const next = current.filter((c) => c !== color)
    wrapSettings.value = {
      ...wrapSettings.value,
      pointColors: next,
      pointColor: next[0] ?? '',
    }
  }

  return {
    canvasWidth,
    canvasSettings,
    wrapSettings,
    modulePanelMode,
    hoveredModuleId,
    currentTemplateName,
    setCurrentTemplateName,
    currentTeamId,
    currentTemplateId,
    setCurrentTemplate,
    activeMenu,
    forceRailPanel,
    setActiveMenu,
    isOrderPanelOpen,
    toggleOrderPanel,
    setCanvasWidth,
    setModulePanelMode,
    setHoveredModuleId,
    updateCanvasSettings,
    updateWrapSettings,
    resetWrapSettings,
    applyLoadedWrapSettings,
    addPointColor,
    appendPointColor,
    updatePointColorAt,
    setActivePointColor,
    removePointColor,
    setZoom
  }
})