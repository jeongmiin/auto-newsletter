export interface ModuleMetadata {
  id: string
  name: string
  description: string
  category: 'header' | 'text' | 'image' | 'button' | 'table' | 'divider' | 'social' | 'common'
  icon: string
  htmlFile: string
  editableProps: EditableProp[]
  defaultStyles?: ModuleStyles
  // true이면 모듈 추가 목록(팔레트)에서 숨김 (기존 인스턴스/템플릿 렌더링은 계속 지원)
  hidden?: boolean
}

export interface EditableProp {
  key: string
  label: string
  type: 'text' | 'textarea' | 'color' | 'number' | 'url' | 'image' | 'select' | 'boolean' | 'checkbox' | 'table-rows' | 'content-titles' | 'content-texts' | 'additional-contents' | 'table-editor'
  options?: string[]
  placeholder?: string
  // 입력 필드 아래 표시할 안내 문구 (text 타입 한정)
  hint?: string
  required?: boolean
  default?: string | number | boolean | TableCell[][]  // default 값 지원 (테이블 셀 포함)
  defaultRows?: TableRow[]
  // 조건부 표시: 문자열은 boolean 필드 키 (=== true), 객체는 값 비교
  showWhen?: string | { key: string; equals?: unknown; notEquals?: unknown }
  // 속성 패널 아코디언 그룹 라벨 (모든 prop에 group이 지정되면 아코디언 모드)
  group?: string
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
  bgColor?: string         // 셀 배경색 (미지정 시 타입별 일괄 색상 사용)
  textColor?: string       // 셀 글자색 (미지정 시 타입별 일괄 색상 사용)
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
  /** 소속 그룹 id. 같은 groupId를 가진 '연속된' 모듈이 하나의 그룹으로 묶인다. */
  groupId?: string
}

/**
 * 모듈 그룹의 스타일 (배경/테두리/안쪽 여백/바깥 여백)
 * 내보내기 시 그룹은 단일 셀 <table>로 감싸지고, 이 값들이 적용된다.
 */
export type BorderSide = 'top' | 'right' | 'bottom' | 'left'

export interface ModuleGroupStyles {
  backgroundColor?: string
  /** 배경색에 전역 포인트 색상 사용 */
  backgroundColorUsePoint?: boolean
  borderWidth?: string
  borderStyle?: string
  borderColor?: string
  /** 테두리 색상에 전역 포인트 색상 사용 */
  borderColorUsePoint?: boolean
  /**
   * 테두리를 적용할 변. 미지정(undefined)이면 4면 전체(구버전 호환),
   * 빈 배열([])이면 테두리 없음.
   */
  borderSides?: BorderSide[]
  padding?: string
  margin?: string
}

/**
 * 모듈 그룹 — id와 그룹 단위 스타일을 가진다.
 * 어떤 모듈이 이 그룹에 속하는지는 ModuleInstance.groupId로 표현된다.
 */
export interface ModuleGroup {
  id: string
  styles: ModuleGroupStyles
}

/**
 * 캔버스/목차에서 사용하는 표시 단위.
 * 연속된 같은 그룹 모듈은 하나의 'group' 항목으로 묶여 통째로 드래그된다.
 */
export type DisplayItem =
  | { type: 'module'; id: string; module: ModuleInstance }
  | { type: 'group'; id: string; group: ModuleGroup; modules: ModuleInstance[] }

export interface EmailBuilderState {
  modules: ModuleInstance[]
  selectedModuleId: string | null
  canvasWidth: 'mobile' | 'desktop'
  isDirty: boolean
}

/**
 * 미리 만들어둔 뉴스레터 템플릿
 * 모듈 인스턴스 배열 + wrap 설정의 스냅샷
 */
export interface NewsletterTemplate {
  id: string
  name: string
  description: string
  thumbnail?: string
  wrapSettings: {
    backgroundColor: string
    borderWidth: string
    borderColor: string
    borderStyle: string
    // 포인트 색상 — 기존 템플릿 호환을 위해 optional (없으면 기본값 유지)
    pointColor?: string
  }
  modules: Array<{
    moduleId: string
    /** 호환용 필드 — 무시됨. 실제 순서는 배열 순서를 따름. */
    order?: number
    properties: Record<string, unknown>
    styles: Record<string, unknown>
    /** 소속 그룹 id (없으면 그룹에 속하지 않음) */
    groupId?: string
  }>
  /** 모듈 그룹 정의 (그룹 단위 스타일). 없으면 그룹 없음. */
  groups?: ModuleGroup[]
}
