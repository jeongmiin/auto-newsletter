/**
 * 원소 모듈 '빠른추가' 정의 — 카테고리 레일 메뉴(CategoryModulePanel)와
 * 빈 컬럼 '직접 구성' 패널(ColumnComposePanel)이 같은 목록·같은 카드로 쓰도록 한 곳에 둔다.
 *
 * composedBuilderId가 있는 항목은 클릭 시 '그룹'이 만들어진다 —
 * 그룹은 컬럼 안에 넣을 수 없으므로 직접 구성 패널에서는 쓰지 않는다.
 */
export interface QuickAddItem {
  label: string
  moduleId: string
  /** 조립형 빌더 키(선택) — moduleId와 다른 조립 템플릿을 쓸 때 지정. 예: '타이틀 추가'는
   *  SectionTitle 대신 구분선+텍스트 2개 조립 그룹(ComposedTitleSection)을 만든다.
   *  (같은 SectionTitle을 쓰는 '서브타이틀 추가'가 이 빌더에 휩쓸리지 않도록 분리) */
  composedBuilderId?: string
  /** 추가 직후 덮어쓸 속성 묶음(선택) — 예: "서브타이틀"·"텍스트"는 ModuleDescText에 폰트/여백 기본값을 얹어 재사용 */
  overrides?: Record<string, unknown>
  /** 미리보기 카드 표시(선택) — 이미지: 플레이스홀더, 버튼: 스타일 버튼 미리보기 */
  preview?: 'single-image' | 'double-image' | 'single-button' | 'double-button' | 'small-button'
}

export type QuickAddCategory = 'text' | 'image' | 'button' | 'table'

/** 폰트 크기·굵기를 지정한 한 줄 DescText 내용 HTML (moduleStore.weightedTextHtml과 동일 포맷) */
const weightedTextHtml = (text: string, fontSize: string, weight: number, align = 'left'): string =>
  `<p style="margin:0; padding:0; line-height:1.7; text-align:${align};"><span style="font-size:${fontSize}; font-weight:${weight};">${text}</span></p>`

export const QUICK_ADD_ITEMS: Record<QuickAddCategory, QuickAddItem[]> = {
  text: [
    { label: '타이틀 추가', moduleId: 'SectionTitle', composedBuilderId: 'ComposedTitleSection' },
    {
      // 서브타이틀 = '타이틀 추가' 그룹의 타이틀 텍스트와 같은 속성(18px/700, 여백 15/20/15/20)을 가진 단일 텍스트 모듈
      label: '서브타이틀 추가',
      moduleId: 'ModuleDescText',
      overrides: {
        descriptionText: weightedTextHtml('서브 타이틀을 입력하세요', '18px', 700),
        fontSize: '18px',
        paddingTop: '15px',
        paddingRight: '20px',
        paddingBottom: '15px',
        paddingLeft: '20px',
      },
    },
    // 텍스트 = 좌우 20px 여백을 기본으로 얹은 설명 텍스트 모듈
    {
      label: '텍스트 추가',
      moduleId: 'ModuleDescText',
      overrides: { paddingLeft: '20px', paddingRight: '20px' },
    },
    {
      label: '인라인 텍스트 추가',
      moduleId: 'ModuleInlineText',
      overrides: { paddingLeft: '20px', paddingRight: '20px' },
    },
  ],
  image: [
    // 단일 이미지 = 모듈 자체의 좌우 바깥 여백 20px 기본
    {
      label: '단일 이미지 추가',
      moduleId: 'ModuleImg',
      preview: 'single-image',
      overrides: { paddingLeft: '20px', paddingRight: '20px' },
    },
    { label: '2단 이미지 추가', moduleId: 'ModuleMultiImage', preview: 'double-image' },
  ],
  button: [
    // 단일/작은 버튼 = 배경이 채워지도록 '안쪽' 좌우 20px + 바깥 좌우 20px
    {
      label: '단일 버튼 추가',
      moduleId: 'ModuleOneButton',
      preview: 'single-button',
      overrides: {
        buttonPaddingLeft: '20px',
        buttonPaddingRight: '20px',
        paddingLeft: '20px',
        paddingRight: '20px',
      },
    },
    { label: '2단 버튼 추가', moduleId: 'ModuleTwoButton', preview: 'double-button' },
    {
      label: '작은 버튼 추가 (최대 4단)',
      moduleId: 'ModuleSmallButton',
      preview: 'small-button',
      overrides: {
        btnPaddingLeft: '20px',
        btnPaddingRight: '20px',
        paddingLeft: '20px',
        paddingRight: '20px',
      },
    },
  ],
  // 테이블은 v2 조립 템플릿이 아직 없어 레거시 '커스텀 테이블'(ModuleTable)을 그대로 쓴다.
  table: [{ label: '테이블 추가', moduleId: 'ModuleTable' }],
}

/** 라벨로 빠른추가 항목을 골라 온다(순서는 넘긴 라벨 순). 없는 라벨은 조용히 건너뛴다. */
export function pickQuickAddItems(labels: string[]): QuickAddItem[] {
  const all = Object.values(QUICK_ADD_ITEMS).flat()
  return labels
    .map((label) => all.find((item) => item.label === label))
    .filter((item): item is QuickAddItem => !!item)
}
