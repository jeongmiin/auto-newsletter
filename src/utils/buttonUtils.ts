import { BUTTON_COLORS } from '@/constants/defaults'

export interface ButtonStyleConfig {
  bgColor?: string
  textColor?: string
}

export interface Module04ButtonProperties {
  leftSmallBtnBgColor?: string
  leftSmallBtnTextColor?: string
  leftBigBtnBgColor?: string
  leftBigBtnTextColor?: string
  rightSmallBtnBgColor?: string
  rightSmallBtnTextColor?: string
  rightBigBtnBgColor?: string
  rightBigBtnTextColor?: string
  showLeftSmallBtn?: boolean
  showLeftBigBtn?: boolean
  showRightSmallBtn?: boolean
  showRightBigBtn?: boolean
}

export interface Module05ButtonProperties {
  smallBtnBgColor?: string
  smallBtnTextColor?: string
  bigBtnBgColor?: string
  bigBtnTextColor?: string
  showTopSmallBtn?: boolean
  showBottomSmallBtn?: boolean
  showBigBtn?: boolean
}

/**
 * 버튼 스타일 정규식 매칭을 통해 색상 변경
 */
function replaceButtonColors(
  match: string,
  bgColor: string | undefined,
  textColor: string | undefined,
  defaultBg: string,
  defaultText: string
): string {
  let newMatch = match
  if (bgColor) {
    newMatch = newMatch.replace(new RegExp(`background-color:${defaultBg}`, 'g'), `background-color:${bgColor}`)
    newMatch = newMatch.replace(new RegExp(`bgcolor:\\s*${defaultBg}`, 'g'), `bgcolor: ${bgColor}`)
  }
  if (textColor) {
    newMatch = newMatch.replace(new RegExp(`color:${defaultText}`, 'g'), `color:${textColor}`)
  }
  return newMatch
}

/**
 * Module04 작은 버튼 스타일 적용
 */
export function applyModule04SmallButtonStyles(
  html: string,
  properties: Module04ButtonProperties
): string {
  let styledHtml = html
  let smallBtnStyleIndex = 0

  const smallButtonRegex = /<a href="[^"]*" target="_blank"\s*style="[^"]*display:\s*inline-block[^"]*background-color:#e5e5e5[^"]*"/g

  styledHtml = styledHtml.replace(smallButtonRegex, (match) => {
    const isLeft = smallBtnStyleIndex === 0
    const bgColor = isLeft ? properties.leftSmallBtnBgColor : properties.rightSmallBtnBgColor
    const textColor = isLeft ? properties.leftSmallBtnTextColor : properties.rightSmallBtnTextColor

    smallBtnStyleIndex++
    return replaceButtonColors(match, bgColor, textColor, BUTTON_COLORS.smallBg, BUTTON_COLORS.smallText)
  })

  return styledHtml
}

/**
 * Module04 큰 버튼 스타일 적용
 */
export function applyModule04BigButtonStyles(
  html: string,
  properties: Module04ButtonProperties
): string {
  let styledHtml = html
  let bigBtnStyleIndex = 0

  const bigButtonRegex = /<a href="[^"]*"\s*style="[^"]*background-color:#111111[^"]*"/g

  styledHtml = styledHtml.replace(bigButtonRegex, (match) => {
    const isLeft = bigBtnStyleIndex === 0
    const bgColor = isLeft ? properties.leftBigBtnBgColor : properties.rightBigBtnBgColor
    const textColor = isLeft ? properties.leftBigBtnTextColor : properties.rightBigBtnTextColor

    bigBtnStyleIndex++
    return replaceButtonColors(match, bgColor, textColor, BUTTON_COLORS.bigBg, BUTTON_COLORS.bigText)
  })

  return styledHtml
}

/**
 * Module04 버튼 표시/숨김 처리
 */
export function handleModule04ButtonVisibility(
  html: string,
  properties: Module04ButtonProperties
): string {
  let visibilityHtml = html

  // 작은 버튼 제거
  let spanIndex = 0
  const spanRegex = /<span align="left" style="display: block; padding:15px 0px; box-sizing: border-box;">[\s\S]*?<\/span>/g
  visibilityHtml = visibilityHtml.replace(spanRegex, (match) => {
    const isLeft = spanIndex === 0
    const shouldShow = isLeft ? properties.showLeftSmallBtn === true : properties.showRightSmallBtn === true
    spanIndex++
    return shouldShow ? match : ''
  })

  // 큰 버튼 제거
  let bigBtnIndex = 0
  const bigButtonRegex = /<a href="[^"]*"\s*style="([^"]*)"[^>]*target="_blank">큰 버튼[\s\S]*?<\/a>/g
  visibilityHtml = visibilityHtml.replace(bigButtonRegex, (match) => {
    const isLeft = bigBtnIndex === 0
    const shouldShow = isLeft ? properties.showLeftBigBtn === true : properties.showRightBigBtn === true
    bigBtnIndex++
    return shouldShow ? match : ''
  })

  return visibilityHtml
}

/**
 * Module05 버튼 스타일 적용
 */
export function applyModule05ButtonStyles(
  html: string,
  properties: Module05ButtonProperties
): string {
  let styledHtml = html

  // 작은 버튼 스타일 적용
  if (properties.smallBtnBgColor || properties.smallBtnTextColor) {
    const smallButtonRegex = /<a href="[^"]*" target="_blank"\s*style="([^"]*)"/g
    styledHtml = styledHtml.replace(smallButtonRegex, (match, existingStyle) => {
      let newStyle = existingStyle
      if (properties.smallBtnBgColor) {
        newStyle = newStyle.replace(/background-color:#e5e5e5/, `background-color:${properties.smallBtnBgColor}`)
        newStyle = newStyle.replace(/bgcolor: #e5e5e5/, `bgcolor: ${properties.smallBtnBgColor}`)
      }
      if (properties.smallBtnTextColor) {
        newStyle = newStyle.replace(/color:#333333/, `color:${properties.smallBtnTextColor}`)
      }
      return match.replace(existingStyle, newStyle)
    })
  }

  // 큰 버튼 스타일 적용
  if (properties.bigBtnBgColor || properties.bigBtnTextColor) {
    const bigButtonRegex = /<a href="[^"]*"\s*style="([^"]*)"/g
    styledHtml = styledHtml.replace(bigButtonRegex, (match, existingStyle) => {
      if (existingStyle.includes('background-color:#111111')) {
        let newStyle = existingStyle
        if (properties.bigBtnBgColor) {
          newStyle = newStyle.replace(/background-color:#111111/, `background-color:${properties.bigBtnBgColor}`)
          newStyle = newStyle.replace(/bgcolor: #111111/, `bgcolor: ${properties.bigBtnBgColor}`)
        }
        if (properties.bigBtnTextColor) {
          newStyle = newStyle.replace(/color:#ffffff/, `color:${properties.bigBtnTextColor}`)
        }
        return match.replace(existingStyle, newStyle)
      }
      return match
    })
  }

  return styledHtml
}

/**
 * Module05 버튼 표시/숨김 처리
 */
export function handleModule05ButtonVisibility(
  html: string,
  properties: Module05ButtonProperties
): string {
  let visibilityHtml = html

  // 위쪽 작은 버튼 제거
  if (properties.showTopSmallBtn !== true) {
    visibilityHtml = visibilityHtml.replace(
      /<span align="left" style="display: block; padding:15px 0px; box-sizing: border-box;">\s*<a href="[^"]*" target="_blank"[^>]*>[^<]*작은 버튼[^<]*<\/a>\s*<\/span>/,
      ''
    )
  }

  // 아래쪽 작은 버튼 제거
  if (properties.showBottomSmallBtn !== true) {
    const spans = visibilityHtml.match(/<span align="left" style="display: block; padding:15px 0px; box-sizing: border-box;">\s*<a href="[^"]*" target="_blank"[^>]*>[^<]*작은 버튼[^<]*<\/a>\s*<\/span>/g)
    if (spans && spans.length > 1) {
      let spanCount = 0
      visibilityHtml = visibilityHtml.replace(
        /<span align="left" style="display: block; padding:15px 0px; box-sizing: border-box;">\s*<a href="[^"]*" target="_blank"[^>]*>[^<]*작은 버튼[^<]*<\/a>\s*<\/span>/g,
        (match) => {
          spanCount++
          return spanCount === 2 ? '' : match
        }
      )
    }
  }

  // 큰 버튼 제거
  if (properties.showBigBtn !== true) {
    visibilityHtml = visibilityHtml.replace(
      /<tr>\s*<td align="center" style="padding:20px; box-sizing: border-box;">\s*<a href="[^"]*"[^>]*>[^<]*큰 버튼[^<]*<\/a>\s*<\/td>\s*<\/tr>/,
      ''
    )
  }

  return visibilityHtml
}

/**
 * Module02 버튼 스타일 적용
 */
export function applyModule02ButtonStyles(
  html: string,
  bgColor?: string,
  textColor?: string
): string {
  if (!bgColor && !textColor) return html

  const existingStyleRegex = /(<a[^>]*style="[^"]*)/g
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
