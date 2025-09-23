// types/modules.ts
export interface BaseModuleData {
  title: string
  subtitle: string
}

export interface ModuleItem {
  redtitle: string
  desc: string
}

export interface ModuleOneData extends BaseModuleData {
  items: ModuleItem[]
}

export interface ModuleTwoTableRow {
  header: string
  content: string
}

export interface ModuleTwoData {
  title: string
  imageUrl: string
  imageAlt: string
  mainTitle: string
  description: string
  tableRows: ModuleTwoTableRow[]
  buttonText: string
  buttonUrl: string
  showTable: boolean
  showButton: boolean
}

export interface ModuleThreeData extends BaseModuleData {
  content: string
  buttonText: string
  buttonUrl: string
}

// 다른 모듈용 확장 타입은 필요에 따라 여기에 추가합니다.
export interface ModuleTwentyData extends BaseModuleData {
  // 개별 모듈이 요구하는 데이터 구조
}

export type ModuleData =
  | ModuleOneData
  | ModuleTwoData
  | ModuleThreeData
  // ... 다른 모듈들이 있다면 여기에 추가
  | ModuleTwentyData

export interface Module {
  instanceId: string
  type: string
  data: ModuleData
  order?: number
}

export interface ModuleConfig {
  id: string
  name: string
  description: string
  icon: string
  category: string
  maxInstances?: number
  initialData: () => ModuleData
  formComponent: () => Promise<any>
  previewComponent: () => Promise<any>
}