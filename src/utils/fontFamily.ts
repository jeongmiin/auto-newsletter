/**
 * 다국어 폰트 패밀리 전역 치환 유틸
 *
 * 뉴스레터 모듈은 폰트 패밀리를 인라인 스타일로 각각 박아두기 때문에
 * (플레이스홀더가 아님), 렌더/내보내기 후처리 단계에서 기본(한국어) 폰트
 * 스택을 선택 언어 스택으로 일괄 치환한다.
 *
 * 적용 지점은 flattenAlphaColorsInHtml 직후 — 미리보기(useModuleRenderer),
 * 내보내기(moduleStore.generateHtml), 호버 미리보기에서 동일하게 호출한다.
 */

/** 공통 속성에서 선택하는 폰트 언어 키 */
export type FontLanguage = 'default' | 'ja' | 'th'

/** 언어별 font-family 스택 (기본 = 한국어·영어) */
export const FONT_FAMILY_BY_LANGUAGE: Record<FontLanguage, string> = {
  // 한국어·영어 (모듈 HTML에 기본으로 박혀 있는 스택)
  default: 'AppleSDGothic, malgun gothic, nanum gothic, Noto Sans KR, sans-serif',
  // 일본어 — 모듈의 style="..." (큰따옴표) 속성 안에 인라인으로 들어가므로
  // 폰트명은 반드시 작은따옴표로 감싼다 (큰따옴표 사용 시 style 속성이 조기 종료되어 깨짐)
  ja: "'Hiragino Kaku Gothic ProN','Meiryo','Yu Gothic',Arial,sans-serif",
  // 태국어
  th: 'Noto Sans Thai, Tahoma, Arial, sans-serif',
}

/** 공통 속성 UI(드롭다운)용 옵션 */
export const FONT_LANGUAGE_OPTIONS: { label: string; value: FontLanguage }[] = [
  { label: '한국어·영어 (기본)', value: 'default' },
  { label: '일본어', value: 'ja' },
  { label: '태국어', value: 'th' },
]

/**
 * 모듈 HTML에 인라인으로 박힌 기본(한국어) 폰트 스택을 찾아내는 정규식.
 * 콜론·콤마 주변 공백 차이(예: Module01의 `nanum gothic,Noto Sans KR`)까지 흡수한다.
 * 문서 wrapper의 `-apple-system…` 등 다른 폰트 선언은 건드리지 않는다.
 */
const DEFAULT_STACK_PATTERN =
  /font-family\s*:\s*AppleSDGothic\s*,\s*malgun gothic\s*,\s*nanum gothic\s*,\s*Noto Sans KR\s*,\s*sans-serif/gi

/**
 * HTML 내 기본 폰트 스택을 선택 언어의 폰트 스택으로 전역 치환한다.
 * 기본(한국어·영어) 선택 시에는 치환할 필요가 없으므로 원본을 그대로 반환한다.
 */
export function applyFontFamily(html: string, language: FontLanguage = 'default'): string {
  if (language === 'default') return html
  const stack = FONT_FAMILY_BY_LANGUAGE[language] ?? FONT_FAMILY_BY_LANGUAGE.default
  return html.replace(DEFAULT_STACK_PATTERN, `font-family:${stack}`)
}
