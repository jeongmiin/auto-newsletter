/**
 * Module02 버튼 스타일 적용
 * 버튼 <a>만 대상으로 한다. (이미지 링크 <a>는 style에 background-color가 없어 제외)
 * → 이미지에 모서리 둥글기를 줘도 버튼 배경색이 이미지 링크로 새지 않음
 */
export function applyModule02ButtonStyles(
  html: string,
  bgColor?: string,
  textColor?: string,
): string {
  if (!bgColor && !textColor) return html

  const existingStyleRegex = /(<a[^>]*style="[^"]*background-color:[^"]*)/g
  return html.replace(existingStyleRegex, (match) => {
    let styleAdditions = ''
    if (bgColor) {
      styleAdditions += ` background-color:${bgColor} !important;`
    }
    if (textColor) {
      styleAdditions += ` color:${textColor} !important;`
    }
    return match + styleAdditions
  })
}
