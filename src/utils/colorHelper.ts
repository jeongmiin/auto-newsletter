/**
 * Color Helper Utilities
 * HEX 컬러 입력 및 유효성 검사를 위한 유틸리티 함수들
 */

/**
 * HEX 컬러 유효성 검사
 * @param color - 검사할 컬러 문자열
 * @returns 유효한 HEX 컬러면 true
 */
export function isValidHexColor(color: string): boolean {
  if (!color) return false
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  return hexRegex.test(color)
}

/**
 * HEX 컬러 포맷팅 (# 자동 추가, 소문자 변환)
 * @param color - 포맷할 컬러 문자열
 * @returns 포맷팅된 HEX 컬러
 */
export function formatHexColor(color: string): string {
  if (!color) return ''

  let formatted = color.trim()

  // # 없으면 추가
  if (!formatted.startsWith('#')) {
    formatted = '#' + formatted
  }

  // 소문자로 통일
  formatted = formatted.toLowerCase()

  return formatted
}

/**
 * 3자리 HEX를 6자리로 확장 (#abc → #aabbcc)
 * @param color - 확장할 컬러 문자열
 * @returns 6자리 HEX 컬러
 */
export function expandHexColor(color: string): string {
  if (!color) return '#000000'

  const hex = color.replace('#', '')

  // 3자리면 6자리로 확장
  if (hex.length === 3) {
    return '#' + hex.split('').map((char) => char + char).join('')
  }

  return '#' + hex
}

/**
 * 컬러 미리보기 스타일 생성
 * @param color - 미리보기할 컬러
 * @returns CSS 스타일 문자열
 */
export function getColorPreviewStyle(color: string): string {
  const validColor = isValidHexColor(color) ? color : '#cccccc'
  return `background-color: ${validColor};`
}

/**
 * 컬러 값 정규화 (입력 시 자동 보정)
 * @param color - 정규화할 컬러 문자열
 * @returns 정규화된 HEX 컬러
 */
export function normalizeColorInput(color: string): string {
  if (!color) return ''

  // 공백 제거
  let normalized = color.trim()

  // # 자동 추가
  if (normalized && !normalized.startsWith('#')) {
    normalized = '#' + normalized
  }

  // 유효한 문자만 허용 (0-9, A-F, a-f)
  normalized = normalized.replace(/[^#0-9A-Fa-f]/g, '')

  // 길이 제한 (# + 6자리)
  if (normalized.length > 7) {
    normalized = normalized.substring(0, 7)
  }

  return normalized
}

/**
 * 자주 사용하는 컬러 프리셋
 */
export const COLOR_PRESETS = [
  { label: '검정', value: '#111111' },
  { label: '흰색', value: '#ffffff' },
  { label: '회색', value: '#e5e5e5' },
  { label: '진한 회색', value: '#666666' },
  { label: '파랑', value: '#2196F3' },
  { label: '초록', value: '#4CAF50' },
  { label: '빨강', value: '#FF5722' },
  { label: '주황', value: '#FF9800' },
  { label: '보라', value: '#9C27B0' },
  { label: '남색', value: '#3F51B5' },
]
