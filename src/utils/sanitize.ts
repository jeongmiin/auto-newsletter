/**
 * HTML 정제 유틸리티 (XSS 방어)
 * DOMPurify를 사용하여 악성 스크립트 제거
 */

import DOMPurify from 'dompurify'

/**
 * 뉴스레터 모듈에서 허용되는 HTML 태그
 * 이메일 호환성을 위해 필요한 태그들만 허용
 */
const ALLOWED_TAGS = [
  // 테이블 관련
  'table', 'tr', 'td', 'th', 'tbody', 'thead', 'tfoot', 'colgroup', 'col',
  // 텍스트 서식
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup',
  // 헤더
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  // 리스트
  'ul', 'ol', 'li',
  // 링크 및 미디어
  'a', 'img',
  // 레이아웃
  'div', 'span', 'center',
  // 기타
  'hr', 'blockquote',
]

/**
 * 뉴스레터 모듈에서 허용되는 HTML 속성
 * 이메일 클라이언트 호환성을 위한 인라인 스타일 포함
 */
const ALLOWED_ATTR = [
  // 스타일링
  'style', 'class', 'id',
  // 링크
  'href', 'target', 'rel',
  // 이미지
  'src', 'alt', 'width', 'height',
  // 테이블
  'colspan', 'rowspan', 'align', 'valign', 'bgcolor', 'background',
  'border', 'cellpadding', 'cellspacing',
  // 범용
  'title', 'dir', 'lang',
  // 데이터 속성 (Quill 에디터용)
  'data-list',
]

/**
 * HTML 문자열을 정제하여 XSS 공격 방어
 * @param html - 정제할 HTML 문자열
 * @returns 안전한 HTML 문자열
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true, // data-* 속성 허용 (Quill 에디터 호환)
    // 위험한 URI 스킴 차단
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  })
}

/**
 * 에러 메시지용 안전한 HTML 생성
 * 사용자 입력이 포함될 수 있는 에러 메시지에 사용
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return ''

  // 모든 HTML 태그 제거 (텍스트만 허용)
  return DOMPurify.sanitize(message, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
}
