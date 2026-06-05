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
