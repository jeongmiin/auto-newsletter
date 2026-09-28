// 기본값 상수
export const DEFAULT_IMAGE_URL = 'https://design.messeesang.com/e-dm/newsletter/images/img-1column.png'
export const DEFAULT_TWO_COLUMN_IMAGE_URL = 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png'

/**
 * '아직 이미지를 안 넣음'을 뜻하는 자리표시 이미지들 (modules-config.json의 이미지 기본값들).
 *
 * 이미지 필드에서 '삭제'하면 값을 비우지 않고 이 중 하나로 되돌린다 — 값을 비우면 캔버스와
 * 내보낸 메일에 깨진 이미지(엑스박스)가 뜨기 때문이다.
 * 여기 있는 주소는 '내용'이 아니라 '빈 자리'로 취급해, 업로드 영역을 계속 보여준다.
 */
export const PLACEHOLDER_IMAGE_URLS: ReadonlySet<string> = new Set([
  DEFAULT_IMAGE_URL,
  DEFAULT_TWO_COLUMN_IMAGE_URL,
  'https://design.messeesang.com/e-dm/newsletter/images/img-speaker.png',
  'https://design.messeesang.com/e-dm/newsletter/images/logo-gray.png',
  'https://esang-newsletter.s3.ap-northeast-2.amazonaws.com/e-dm/newsletter/images/logo-gray.png',
  'https://esang-newsletter.s3.ap-northeast-2.amazonaws.com/e-dm/newsletter/images/img-visual.png',
])

/** 자리표시 이미지인지 — 빈 값도 '아직 안 넣음'으로 본다 */
export const isPlaceholderImage = (url?: string | null): boolean => {
  const value = (url ?? '').trim()
  return value === '' || PLACEHOLDER_IMAGE_URLS.has(value)
}

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
