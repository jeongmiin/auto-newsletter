// 기본값 상수
export const DEFAULT_IMAGE_URL = 'https://design.messeesang.com/e-dm/newsletter/images/img-1column.png'
export const DEFAULT_TWO_COLUMN_IMAGE_URL = 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png'

// 정규식 패턴
export const REGEX_PATTERNS = {
  imageUrl1Column: /src="https:\/\/design\.messeesang\.com\/e-dm\/newsletter\/images\/img-1column\.png"/g,
  imageUrl2Column: /src="https:\/\/design\.messeesang\.com\/e-dm\/newsletter\/images\/img-2column\.png"/g,
  imageAlt: /alt="이미지"/g,
  href: /href="#"/g,
  contentTitle: /콘텐츠 타이틀/g,
  contentText: /콘텐츠 텍스트/g,
  tableTitle: /테이블 타이틀/g,
  tableContent: /테이블 콘텐츠 텍스트/g,
  bigButton: /큰 버튼 →/g,
  smallButton: /작은 버튼 →/g,
  sectionTitle: /{{mainTitle}}|모듈 섹션 타이틀 영역/g,  // 플레이스홀더 또는 레거시 텍스트
  subTitle: /{{subTitle}}|서브 타이틀 영역/g,  // 플레이스홀더 또는 레거시 텍스트
}

// HTML 마커
export const HTML_MARKERS = {
  additionalContent: '<!-- 추가 콘텐츠 위치 -->',
  additionalContentRight: '<!-- 추가 콘텐츠 위치 (오른쪽) -->',
  additionalContentTop: '<!-- 추가 콘텐츠 위치 (상단) -->',
  additionalContentBottom: '<!-- 추가 콘텐츠 위치 (하단) -->',
  tableRow: '<!-- 추가 tr 위치 -->',
  buttonStart: '<!-- 버튼 -->',
  buttonEnd: '<!-- //버튼 -->',
}

// 버튼 색상 기본값
export const BUTTON_COLORS = {
  smallBg: '#e5e5e5',
  smallText: '#333333',
  bigBg: '#111111',
  bigText: '#ffffff',
}

// 에디터 설정
export const EDITOR_CONFIG = {
  maxHistoryStates: 50,
  canvasDefaultWidth: 600,
  zoomMin: 0.25,
  zoomMax: 2,
}
