/**
 * Quill HTML 결과의 모든 <p> 태그에 line-height를 일괄 적용
 * - <p>에 인라인 line-height가 있으면 새 값으로 덮어씀
 * - 없으면 style 속성에 추가
 */
export const applyLineHeightToParagraphs = (html: string, lineHeight: string): string => {
  const value = lineHeight.trim()
  if (!value) return html

  // 1. style 속성이 있는 <p>: 기존 line-height 제거 후 새 값 추가
  let result = html.replace(
    /<p(\s[^>]*)style="([^"]*)"/g,
    (_match, before: string, style: string) => {
      const cleaned = style
        .replace(/;\s*line-height\s*:\s*[^;"]*/g, '')
        .replace(/line-height\s*:\s*[^;"]*;?\s*/g, '')
      return `<p${before}style="${cleaned}; line-height: ${value}"`
    },
  )

  // 2. style 속성이 없는 <p>: style 추가
  result = result.replace(
    /<p(?![^>]*style=)([^>]*)>/g,
    (_match, attrs: string) => `<p${attrs} style="line-height: ${value}">`,
  )

  return result
}
