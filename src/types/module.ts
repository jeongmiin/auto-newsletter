export interface ModuleMetadata {
  id: string
  name: string
  description: string
  category: 'header' | 'text' | 'image' | 'button' | 'table' | 'divider' | 'social'
  icon: string
  htmlFile: string
  editableProps: EditableProp[]
  defaultStyles?: ModuleStyles
}

export interface EditableProp {
  key: string
  label: string
  type: 'text' | 'textarea' | 'color' | 'number' | 'url' | 'image' | 'select' | 'boolean' | 'table-rows' | 'content-titles' | 'content-texts' | 'additional-contents'
  options?: string[]
  placeholder?: string
  required?: boolean
  default?: string | number | boolean  // 🐛 버그 수정 3: default 값 지원
  defaultRows?: TableRow[]
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