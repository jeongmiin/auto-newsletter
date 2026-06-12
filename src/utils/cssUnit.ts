/**
 * CSS 길이 단위 보정 유틸리티
 *
 * 속성 패널의 px 전용 길이 입력 필드에서, 사용자가 단위 없이 숫자만 입력하면
 * 'px'를 자동으로 붙인다. (컬러피커의 '%' 자동 표기와 동일한 입력 편의 기능)
 * %·px를 함께 쓰는 필드(커스텀 테이블 열 너비 등)에는 적용하지 않는다.
 */

/** 단위 없는 순수 숫자(정수·소수·음수·부호 포함) 여부. 예: '10', '-1', '0.5', '+2' */
const BARE_NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)$/

/**
 * 값이 단위 없는 숫자면 'px'를 붙여 반환한다.
 * - 이미 단위가 있거나(10px·1.5em·100%), 빈 값·'auto' 등 비숫자면 그대로(trim만) 반환
 * - 앞뒤 공백은 제거
 */
export function appendPxIfBareNumber(value: string): string {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return trimmed
  return BARE_NUMBER.test(trimmed) ? `${trimmed}px` : trimmed
}

/**
 * px 전용 입력 필드의 값을 정규화한다. (포커스·블러 시 호출)
 * - 빈 값 → '0px' (기본값)
 * - 단위 없는 숫자 → 'Npx'
 * - 그 외(이미 단위 있음·키워드 등) → 공백만 정리해 그대로 반환
 */
export function normalizePxLength(value: string): string {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return '0px'
  return appendPxIfBareNumber(trimmed)
}
