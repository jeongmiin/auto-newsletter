/**
 * URL 검증 유틸리티 (보안)
 * javascript:, data: 등 위험한 프로토콜 차단
 */

/**
 * 안전한 URL 프로토콜 목록
 */
const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:']

/**
 * URL이 유효하고 안전한지 검증
 * @param url - 검증할 URL 문자열
 * @returns URL이 안전하면 true
 */
export function isValidUrl(url: unknown): boolean {
  if (!url || typeof url !== 'string') return false

  const trimmedUrl = url.trim()

  // 빈 문자열 허용
  if (trimmedUrl === '') return true

  // 상대 경로 허용 (/, #, ./)
  if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('#') || trimmedUrl.startsWith('./')) {
    return true
  }

  // 절대 URL 검증
  try {
    const parsed = new URL(trimmedUrl)
    return SAFE_PROTOCOLS.includes(parsed.protocol.toLowerCase())
  } catch {
    // URL 파싱 실패 시 상대 경로로 간주하여 허용
    // (예: "page.html", "folder/page")
    // 단, 위험한 패턴은 차단
    const lowerUrl = trimmedUrl.toLowerCase()
    if (
      lowerUrl.startsWith('javascript:') ||
      lowerUrl.startsWith('data:') ||
      lowerUrl.startsWith('vbscript:')
    ) {
      return false
    }
    return true
  }
}

/**
 * URL을 안전하게 정제
 * 유효하지 않은 URL은 빈 문자열 또는 '#'으로 대체
 * @param url - 정제할 URL
 * @param fallback - 유효하지 않을 때 반환할 값 (기본: '#')
 * @returns 안전한 URL 또는 fallback 값
 */
export function sanitizeUrl(url: unknown, fallback: string = '#'): string {
  if (!url || typeof url !== 'string') return fallback

  const trimmedUrl = url.trim()

  if (trimmedUrl === '') return ''

  if (isValidUrl(trimmedUrl)) {
    return trimmedUrl
  }

  return fallback
}

/**
 * href 속성에 사용할 안전한 URL 반환
 * @param url - 원본 URL
 * @returns 안전한 URL (위험한 URL은 빈 링크로 대체)
 */
export function safeHref(url: unknown): string {
  return sanitizeUrl(url, '#')
}
