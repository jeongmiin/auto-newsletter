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
  // 이 모듈이 속한 행을 나눌 수 있는 최대 컬럼 수.
  // 미지정 시 전역 MAX_COLUMNS(=2). 전역 상한보다 큰 값은 무시되고 상한으로 잘린다.
  maxColumns?: number
}

export interface EditableProp {
  key: string
  label: string
  type: 'text' | 'textarea' | 'color' | 'number' | 'url' | 'image' | 'select' | 'boolean' | 'checkbox' | 'table-rows' | 'content-titles' | 'content-texts' | 'additional-contents' | 'table-editor' | 'sns-icons' | 'contact-items'
  options?: { label: string; value: string }[]
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
/** 셀 텍스트 정렬 — td의 text-align으로 그대로 나간다 */
export type TableCellAlign = 'left' | 'center' | 'right' | 'justify'

export interface TableCell {
  id: string
  type: 'th' | 'td'        // 헤더 또는 데이터 셀
  content: string          // 셀 내용 (HTML 지원)
  colspan: number          // 열 병합 (기본 1)
  rowspan: number          // 행 병합 (기본 1)
  width?: string           // 셀 너비 (예: '20%', '100px')
  align?: TableCellAlign   // 텍스트 정렬 (미지정 시 테이블 공통값)
  bgColor?: string         // 셀 배경색 (미지정 시 타입별 일괄 색상 사용)
  textColor?: string       // 셀 글자색 (미지정 시 타입별 일괄 색상 사용)
  hidden?: boolean         // 병합으로 인해 숨겨진 셀 여부
  contentType?: 'text' | 'image'  // 셀 콘텐츠 종류 (미지정=text)
  imageUrl?: string        // contentType='image'일 때 이미지 URL
  imageAlt?: string        // contentType='image'일 때 이미지 설명(alt)
  imageLink?: string       // 이미지 링크 URL. undefined=링크 없음(토글 OFF)
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
  /**
   * 컬럼 분할 그룹에서 이 모듈이 속한 컬럼(0-based).
   * 그룹이 columns>1일 때만 의미가 있으며, 미지정이면 0번 컬럼으로 간주한다.
   */
  columnIndex?: number
  /**
   * 컬럼 그룹 안에서 이 모듈이 속한 '행(row)'(0-based).
   * 행별 독립 컬럼 모델에서 사용 — 그룹은 여러 행을 가지고 각 행이 자기 컬럼 수를 갖는다.
   * columnIndex는 '그 행 안에서의' 컬럼 위치를 뜻한다. 미지정이면 0행으로 간주.
   */
  rowIndex?: number
  /**
   * [레거시] 컬럼 그룹 안에서 이 모듈이 '전체폭'으로 모든 컬럼을 가로지르는지 여부.
   * 행별 독립 컬럼 모델(rowIndex + ModuleGroup.rows) 도입 이후에는 "컬럼 1개짜리 행"으로 대체된다.
   * 예전 데이터 마이그레이션을 위해서만 읽는다.
   */
  fullWidth?: boolean
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
  /** 배경색이 따를 포인트 색상 인덱스(0~2, 최대 3개 중). 미지정 시 0번 */
  backgroundColorPointIndex?: number
  borderWidth?: string
  borderStyle?: string
  borderColor?: string
  /** 테두리 색상에 전역 포인트 색상 사용 */
  borderColorUsePoint?: boolean
  /** 테두리 색상이 따를 포인트 색상 인덱스(0~2, 최대 3개 중). 미지정 시 0번 */
  borderColorPointIndex?: number
  /**
   * 테두리를 적용할 변. 미지정(undefined)이면 4면 전체(구버전 호환),
   * 빈 배열([])이면 테두리 없음.
   */
  borderSides?: BorderSide[]
  /** 안쪽 여백 shorthand (하위 호환). 4방향 값이 있으면 그쪽이 우선한다. */
  padding?: string
  /** 바깥 여백 shorthand (하위 호환). 4방향 값이 있으면 그쪽이 우선한다. */
  margin?: string
  /** 안쪽 여백 4방향 (상/우/하/좌) — 지정 시 shorthand보다 우선 */
  paddingTop?: string
  paddingRight?: string
  paddingBottom?: string
  paddingLeft?: string
  /** 바깥 여백 4방향 (상/우/하/좌) — 지정 시 shorthand보다 우선 */
  marginTop?: string
  marginRight?: string
  marginBottom?: string
  marginLeft?: string
}

/**
 * 모듈 그룹 — id와 그룹 단위 스타일을 가진다.
 * 어떤 모듈이 이 그룹에 속하는지는 ModuleInstance.groupId로 표현된다.
 */
export interface ModuleGroup {
  id: string
  /** 조립형(v2) 템플릿으로 만들어진 그룹의 표시용 이름(예: "이미지형 헤더"). 컬럼 분할 등으로 만들어진
   *  임의 그룹은 없을 수 있다 — 없으면 좌측 패널에서 "그룹 구성" 같은 일반 라벨로 대체해 보여준다. */
  name?: string
  styles: ModuleGroupStyles
  /**
   * 행별 독립 컬럼 수 배열. rows[r] = r번째 행의 컬럼 수(1~4).
   * 각 행이 자기 컬럼 수를 가지므로 "1단 행 + 2단 행"처럼 행마다 다른 분할이 가능하다.
   * 멤버는 rowIndex(행)·columnIndex(그 행 안 컬럼)로 배치된다.
   * 미지정이면 레거시 columns/fullWidth로부터 유도된다.
   */
  rows?: number[]
  /**
   * 행별 컬럼 너비(%) — colWidths[rowIndex] = 그 행 컬럼들의 너비 배열(합계 100).
   * 미지정이거나 길이가 그 행 컬럼 수와 다르면 균등 분할(기본)로 렌더한다. 데스크톱에만 적용되고
   * 모바일(폭 좁음)에서는 기존처럼 세로 100% 스택된다.
   */
  colWidths?: number[][]
  /**
   * 행별 '모바일에서도 가로 유지' 여부 — keepInlineRows[rowIndex] = true면 그 다단 행이
   * 좁은 폭에서도 세로로 쌓이지 않고 컬럼 비율 그대로 나란히 남는다.
   * (뉴스 헤드라인 헤더의 "제목 | 웹으로 보기"처럼 한 줄로 읽혀야 하는 짧은 행에 쓴다)
   * 미지정이면 기존 동작(모바일 폭에서 100% 세로 스택).
   */
  keepInlineRows?: boolean[]
  /**
   * [레거시] 그룹 전체의 단일 컬럼 분할 수 (1~4).
   * 행별 독립 컬럼 모델(rows) 도입 이후에는 rows로 대체된다. 마이그레이션 용도로만 읽는다.
   */
  columns?: number
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
 * 조직 식별자 규칙 (본부·팀 공통) — 어기면 과거 데이터와의 연결이 끊긴다.
 *
 * · `id`는 **한 번 정하면 절대 바꾸지 않는다.** S3 업로드 경로·저장 파일 등
 *   되돌릴 수 없는 곳에 박히기 때문이다. 표시명이 바뀌면 `name`만 고친다.
 * · 조직이 없어져도 **id를 지우지 않는다.** `active: false`로 두면 화면에서만
 *   사라지고, 과거 데이터가 가리키는 대상은 살아 있다.
 * · 통합·분할은 **새 id를 발급한다.** 옛 조직은 비활성 + `mergedInto`로 후속을
 *   가리킨다. id를 재활용하면 과거 데이터의 소속이 조용히 뒤바뀐다.
 *
 * 규칙은 `templatesCatalog.test.ts`의 KNOWN_TEAM_IDS 가드가 강제한다.
 */
interface OrgNode {
  /** 불변 식별자. 소문자 영숫자와 하이픈만 (URL·S3 키에 그대로 쓰인다) */
  id: string
  /** 표시명. 조직개편으로 바뀔 수 있다 */
  name: string
  /** 생략 시 활성. 폐지된 조직만 false로 둔다(삭제 금지) */
  active?: boolean
  /** 통합·분할로 후속 조직이 있으면 그 id */
  mergedInto?: string
}

/** 템플릿 선택 화면 좌측 트리의 팀 한 항목 */
export type TemplateTeam = OrgNode

/**
 * 템플릿 선택 화면의 좌측 본부/팀 트리 한 항목.
 * 정의는 `public/templates/templates-config.json`의 `departments`에 있다 —
 * 화면·검사 테스트·등록 스크립트가 모두 그 한 곳을 본다. 배열 순서가 곧 표시 순서다.
 */
export interface TemplateDepartment extends OrgNode {
  teams: TemplateTeam[]
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
  /**
   * 소속 본부 **id**(표시·분류용). 표시명이 아니다 — 트리에서 이름을 찾아 쓴다.
   * 필터는 teamId로 하고, 본부 트리는 TemplateSelectView가 갖는다.
   */
  divisionId?: string
  /** 소속 팀 **id**(좌측 부서/팀 필터용). 미지정이면 '전체'에서만 보인다. */
  teamId?: string
  wrapSettings: {
    backgroundColor: string
    borderWidth: string
    borderColor: string
    borderStyle: string
    // 포인트 색상 — 기존 템플릿 호환을 위해 optional (없으면 기본값 유지)
    pointColor?: string
    /** 포인트 색상 팔레트(최대 3개). [0]번이 pointColor와 동기화된다. */
    pointColors?: string[]
  }
  modules: Array<{
    moduleId: string
    /** 호환용 필드 — 무시됨. 실제 순서는 배열 순서를 따름. */
    order?: number
    properties: Record<string, unknown>
    styles: Record<string, unknown>
    /** 소속 그룹 id (없으면 그룹에 속하지 않음) */
    groupId?: string
    /** 행별 독립 컬럼 그룹에서의 행 인덱스(0-based) */
    rowIndex?: number
    /** 그 행 안에서의 컬럼 인덱스(0-based) */
    columnIndex?: number
    /** [레거시] 전체폭 여부 — 로드 시 rows로 유도됨 */
    fullWidth?: boolean
  }>
  /** 모듈 그룹 정의 (그룹 단위 스타일). 없으면 그룹 없음. */
  groups?: ModuleGroup[]
}
