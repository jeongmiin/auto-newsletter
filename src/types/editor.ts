import type { FontLanguage } from '@/utils/fontFamily'

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
  // 테두리 표시 여부 (좌측 "전체 스타일" 패널의 테두리 토글)
  borderEnabled: boolean
  borderWidth: string
  borderColor: string
  borderStyle: string
  // 뉴스레터 포인트(강조) 색상 — 각 색상 속성에서 '포인트 색상 사용' 체크 시 이 값을 따른다
  pointColor: string
  // 좌측 "포인트 색상" 패널에 저장된 포인트 색상 팔레트(최대 3개). [0]번이 pointColor와 동기화된다.
  pointColors: string[]
  // 다국어 폰트 — 선택 언어에 따라 모든 모듈의 기본 폰트 스택을 일괄 치환한다 (기본=한국어·영어)
  fontLanguage?: FontLanguage
  // 뉴스레터 한 줄 요약 (시각장애인을 위한 설명)
  summary?: string
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