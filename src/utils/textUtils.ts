// 텍스트 처리 유틸리티 함수들

export const formatTextWithBreaks = (text: string): string => {
  if (!text) return ''
  return text.replace(/\n/g, '<br>')
}

export const preserveLineBreaks = (text: string): string => {
  if (!text) return ''
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
export const safeFormatText = (text: string, defaultValue: string = ''): string => {
  if (isEmptyValue(text)) return ''
  return formatTextWithBreaks(String(text))
}

// HTML 요소 조건부 렌더링을 위한 함수
export const conditionalHtmlWrapper = (content: string, wrapperTag: string, attributes: string = ''): string => {
  if (isEmptyValue(content)) return ''
  const attrs = attributes ? ` ${attributes}` : ''
  return `<${wrapperTag}${attrs}>${content}</${wrapperTag}>`
}