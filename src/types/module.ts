export interface ModuleMetadata {
  id: string
  name: string
  description: string
  category: 'header' | 'text' | 'image' | 'button' | 'table' | 'divider' | 'social' | 'common'
  icon: string
  htmlFile: string
  editableProps: EditableProp[]
  defaultStyles?: ModuleStyles
}

export interface EditableProp {
  key: string
  label: string
  type: 'text' | 'textarea' | 'color' | 'number' | 'url' | 'image' | 'select' | 'boolean' | 'checkbox' | 'table-rows' | 'content-titles' | 'content-texts' | 'additional-contents' | 'table-editor'
  options?: string[]
  placeholder?: string
  required?: boolean
  default?: string | number | boolean | TableCell[][]  // default 값 지원 (테이블 셀 포함)
  defaultRows?: TableRow[]
  showWhen?: string  // 조건부 표시를 위한 필드
}

export interface ModuleStyles {
  backgroundColor?: string
  textColor?: string
  fontSize?: number
  fontWeight?: string
  textAlign?: 'left' | 'center' | 'right'
  padding?: string
  margin?: string
  borderRadius?: string
  borderColor?: string
  borderWidth?: string
}

export interface TableRow {
  id: string
  header: string
  data: string
}

/**
 * 커스텀 테이블 모듈의 셀 정의
 * colspan/rowspan 지원, th/td 타입 구분
 */
export interface TableCell {
  id: string
  type: 'th' | 'td'        // 헤더 또는 데이터 셀
  content: string          // 셀 내용 (HTML 지원)
  colspan: number          // 열 병합 (기본 1)
  rowspan: number          // 행 병합 (기본 1)
  width?: string           // 셀 너비 (예: '20%', '100px')
  align?: 'left' | 'center' | 'right'  // 텍스트 정렬
  hidden?: boolean         // 병합으로 인해 숨겨진 셀 여부
}

export interface ContentTitle {
  id: string
  text: string
}

export interface ContentText {
  id: string
  content: string
}

export interface AdditionalContent {
  id: string
  type: 'title' | 'text'
  htmlTemplate: string
  data: Record<string, string>
  order: number
}

export interface ModuleInstance {
  id: string
  moduleId: string
  order: number
  properties: Record<string, unknown>
  styles: ModuleStyles
  htmlContent?: string
}

export interface EmailBuilderState {
  modules: ModuleInstance[]
  selectedModuleId: string | null
  canvasWidth: 'mobile' | 'desktop'
  isDirty: boolean
}