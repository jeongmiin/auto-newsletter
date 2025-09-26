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