export interface EditorPanel {
  id: string
  title: string
  isCollapsed: boolean
}

export interface CanvasSettings {
  width: number
  backgroundColor: string
  fontFamily: string
  zoom: number
}

export interface WrapSettings {
  backgroundColor: string
  borderWidth: string
  borderColor: string
  borderStyle: string
  // 뉴스레터 포인트(강조) 색상 — 각 색상 속성에서 '포인트 색상 사용' 체크 시 이 값을 따른다
  pointColor: string
}

export interface ExportOptions {
  format: 'html' | 'png' | 'pdf'
  includeStyles: boolean
  minifyHtml: boolean
  responsiveDesign: boolean
}

export interface HistoryState {
  modules: unknown[]
  timestamp: number
  action: string
}

export interface EditorConfig {
  maxHistoryStates: number
  autoSaveInterval: number
  defaultCanvasWidth: number
  supportedImageFormats: string[]
}