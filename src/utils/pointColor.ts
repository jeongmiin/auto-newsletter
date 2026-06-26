/**
 * 포인트(강조) 색상 해소 유틸
 *
 * 각 색상 속성 옆 '포인트 색상 사용' 체크 상태는 모듈 properties에
 * `${colorKey}__usePoint: true` 형태로 저장된다. 렌더링 직전 이 유틸로
 * 플래그가 켜진 색상 키의 값을 전역 pointColor로 덮어쓴다.
 *
 * 수동으로 입력한 색상값(properties[colorKey])은 그대로 보존되므로,
 * 체크를 해제하면 자동으로 직전 수동 색상으로 원복된다.
 */
export const POINT_COLOR_SUFFIX = '__usePoint'

/**
 * 본문(리치 텍스트) 인라인 색상이 포인트 색상을 따르도록 하는 CSS 변수 이름.
 *
 * Quill 본문에서 '포인트 색상으로 사용'을 선택하면 색상값을
 * `var(--point-color, #fallback)` 형태로 저장한다. 에디터·미리보기(앱 문서)에서는
 * 전역 :root 에 정의된 --point-color 로 실시간 반영되고, 최종 이메일 HTML로
 * 내보낼 때는 var()를 지원하지 않으므로 resolvePointColorVar 로 실제 색상값으로 치환한다.
 */
export const POINT_COLOR_CSS_VAR = '--point-color'

/** `var(--point-color)` / `var(--point-color, #fallback)` 토큰을 실제 포인트 색상으로 치환 (이메일 내보내기용) */
export function resolvePointColorVar(
  html: string,
  pointColor: string | undefined | null,
): string {
  if (!html) return ''
  const color = pointColor || '#2563eb'
  return html.replace(/var\(\s*--point-color\s*(?:,[^)]*)?\)/gi, color)
}

export function resolvePointColors(
  properties: Record<string, unknown>,
  pointColor: string | undefined | null,
): Record<string, unknown> {
  if (!pointColor) return properties

  let result: Record<string, unknown> | null = null
  for (const key of Object.keys(properties)) {
    if (key.endsWith(POINT_COLOR_SUFFIX) && properties[key] === true) {
      const colorKey = key.slice(0, -POINT_COLOR_SUFFIX.length)
      if (!result) result = { ...properties }
      result[colorKey] = pointColor
    }
  }
  return result ?? properties
}
