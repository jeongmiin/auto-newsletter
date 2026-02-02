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