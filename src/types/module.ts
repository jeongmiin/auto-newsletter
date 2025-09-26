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
  type: 'text' | 'textarea' | 'color' | 'number' | 'url' | 'image' | 'select' | 'boolean'
  options?: string[]
  placeholder?: string
  required?: boolean
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