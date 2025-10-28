// 텍스트 처리 유틸리티 함수들

/**
 * Quill 에디터에서 나온 HTML 또는 일반 텍스트를 처리
 * Quill은 이미 HTML을 반환하므로 변환 없이 그대로 사용
 * 일반 텍스트의 경우에만 줄바꿈을 <br>로 변환
 */
export const formatTextWithBreaks = (text: string): string => {
  if (!text) return ''

  // HTML 태그가 이미 포함되어 있으면 그대로 반환 (Quill 에디터 출력)
  if (/<[^>]+>/.test(text)) {
    return text
  }

  // 일반 텍스트인 경우에만 줄바꿈 변환
  return text.replace(/\n/g, '<br>')
}

export const preserveLineBreaks = (text: string): string => {
  if (!text) return ''

  // HTML 태그가 이미 포함되어 있으면 그대로 반환 (Quill 에디터 출력)
  if (/<[^>]+>/.test(text)) {
    return text
  }

  // 일반 텍스트인 경우에만 줄바꿈 변환
  return text.replace(/\r?\n/g, '<br>')
}

export const stripHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, '')
}

export const escapeHtml = (text: string): string => {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// 빈 값 처리 유틸 함수들
export const isEmptyValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (typeof value === 'number') return false
  if (typeof value === 'boolean') return false
  return !value
}

export const shouldRenderElement = (value: unknown): boolean => {
  return !isEmptyValue(value)
}

// 안전한 텍스트 처리 함수 (빈 값 체크 포함)
export const safeFormatText = (text: string): string => {
  if (isEmptyValue(text)) return ''
  return formatTextWithBreaks(String(text))
}

// HTML 요소 조건부 렌더링을 위한 함수
export const conditionalHtmlWrapper = (content: string, wrapperTag: string, attributes: string = ''): string => {
  if (isEmptyValue(content)) return ''
  const attrs = attributes ? ` ${attributes}` : ''
  return `<${wrapperTag}${attrs}>${content}</${wrapperTag}>`
}

/**
 * 플레이스홀더를 값으로 치환하거나, 빈 값이면 요소 자체를 제거
 * @param html - 원본 HTML
 * @param placeholder - 플레이스홀더 문자열 (예: 'title', 'content')
 * @param value - 치환할 값
 * @param fallbackValue - 빈 값일 때 기본값 (빈 문자열이면 요소 제거)
 * @returns 처리된 HTML
 */
export const replaceOrRemove = (
  html: string,
  placeholder: string,
  value: unknown,
  fallbackValue: string = ''
): string => {
  if (isEmptyValue(value)) {
    // 빈 값이면 전체 요소 제거 (여러 패턴 시도)
    if (fallbackValue === '') {
      // 1. <strong>{{placeholder}}</strong> 형태
      html = html.replace(
        new RegExp(`<strong[^>]*>\\s*{{\\s*${placeholder}\\s*}}\\s*</strong>`, 'gi'),
        ''
      )
      // 2. <div>{{placeholder}}</div> 형태
      html = html.replace(
        new RegExp(`<div[^>]*>\\s*{{\\s*${placeholder}\\s*}}\\s*</div>`, 'gi'),
        ''
      )
      // 3. <p>{{placeholder}}</p> 형태
      html = html.replace(
        new RegExp(`<p[^>]*>\\s*{{\\s*${placeholder}\\s*}}\\s*</p>`, 'gi'),
        ''
      )
      // 4. <h1-6>{{placeholder}}</h1-6> 형태
      html = html.replace(
        new RegExp(`<h[1-6][^>]*>\\s*{{\\s*${placeholder}\\s*}}\\s*</h[1-6]>`, 'gi'),
        ''
      )
      // 5. 플레이스홀더만 제거
      html = html.replace(new RegExp(`{{\\s*${placeholder}\\s*}}`, 'g'), '')
    } else {
      // 기본값으로 치환
      html = html.replace(new RegExp(`{{\\s*${placeholder}\\s*}}`, 'g'), fallbackValue)
    }
  } else {
    // 값으로 치환
    const formattedValue = typeof value === 'string' ? safeFormatText(value) : String(value)
    html = html.replace(new RegExp(`{{\\s*${placeholder}\\s*}}`, 'g'), formattedValue)
  }
  return html
}

/**
 * 특정 텍스트 패턴을 포함하는 요소를 찾아서 제거 또는 치환
 * @param html - 원본 HTML
 * @param pattern - 찾을 텍스트 패턴
 * @param value - 치환할 값
 * @param removeIfEmpty - 빈 값이면 요소 제거 여부
 * @returns 처리된 HTML
 */
export const replaceTextOrRemoveElement = (
  html: string,
  pattern: string | RegExp,
  value: unknown,
  removeIfEmpty: boolean = true
): string => {
  const isEmpty = isEmptyValue(value)
  const patternRegex = typeof pattern === 'string'
    ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    : pattern

  if (isEmpty && removeIfEmpty) {
    // 빈 값이면 해당 텍스트를 포함하는 태그 전체 제거
    // <strong>패턴</strong>, <div>패턴</div> 등
    html = html.replace(
      new RegExp(`<(strong|div|p|h[1-6]|span)[^>]*>\\s*${patternRegex.source}\\s*<\\/\\1>`, 'gi'),
      ''
    )
    // 태그 없이 텍스트만 있는 경우
    html = html.replace(patternRegex, '')
  } else {
    // 값으로 치환
    const formattedValue = typeof value === 'string' ? safeFormatText(value) : String(value)
    html = html.replace(patternRegex, formattedValue)
  }
  return html
}