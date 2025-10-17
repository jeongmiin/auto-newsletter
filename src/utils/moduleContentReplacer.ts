import type { ModuleInstance, TableRow, AdditionalContent } from '@/types'
import { formatTextWithBreaks, shouldRenderElement, safeFormatText, replaceTextOrRemoveElement, isEmptyValue } from './textUtils'
import { DEFAULT_TWO_COLUMN_IMAGE_URL, DEFAULT_IMAGE_URL, REGEX_PATTERNS, HTML_MARKERS } from '@/constants/defaults'
import {
  applyModule04SmallButtonStyles,
  applyModule04BigButtonStyles,
  handleModule04ButtonVisibility,
  applyModule02ButtonStyles,
  applyModule053ButtonStyles,
  handleModule053ButtonVisibility,
} from './buttonUtils'
import {
  removeTableFromHtml,
  removeButtonFromHtml,
  removeSubTitleDiv,
  generateTableRowsHtml,
  removeMarker,
} from './htmlUtils'

/**
 * SectionTitle 모듈 콘텐츠 교체
 */
export function replaceSectionTitleContent(html: string, properties: Record<string, unknown>): string {
  let sectionHtml = html

  // 메인 타이틀 처리 - 빈 값이면 빈 문자열 (필수 항목이므로 요소는 유지)
  const mainTitle = isEmptyValue(properties.mainTitle)
    ? ''  // 빈 값이면 빈 문자열 표시
    : safeFormatText(String(properties.mainTitle))
  sectionHtml = sectionHtml.replace(REGEX_PATTERNS.sectionTitle, mainTitle)

  // 서브 타이틀 처리 - 빈 값이면 요소 제거
  if (shouldRenderElement(properties.subTitle)) {
    const subTitle = safeFormatText(String(properties.subTitle))
    sectionHtml = sectionHtml.replace(REGEX_PATTERNS.subTitle, subTitle)
  } else {
    sectionHtml = removeSubTitleDiv(sectionHtml)
  }

  return sectionHtml
}

/**
 * Module04 콘텐츠 교체
 */
export async function replaceModule04Content(
  html: string,
  properties: Record<string, unknown>,
  insertAdditionalContents: (html: string, contents: AdditionalContent[], marker: string) => Promise<string>
): Promise<string> {
  let modifiedHtml = html

  // 타이틀 교체 - 빈 값이면 요소 제거
  let titleIndex = 0
  modifiedHtml = modifiedHtml.replace(REGEX_PATTERNS.contentTitle, () => {
    const isLeft = titleIndex === 0
    const titleValue = isLeft ? properties.leftTitle : properties.rightTitle
    titleIndex++

    // 빈 값이면 빈 문자열 반환 (요소가 제거됨)
    if (isEmptyValue(titleValue)) {
      return ''
    }
    return safeFormatText(String(titleValue))
  })

  // 콘텐츠 텍스트 교체 - 빈 값이면 요소 제거
  let contentIndex = 0
  modifiedHtml = modifiedHtml.replace(REGEX_PATTERNS.contentText, () => {
    const isLeft = contentIndex === 0
    const contentValue = isLeft ? properties.leftContent : properties.rightContent
    contentIndex++

    // 빈 값이면 빈 문자열 반환 (요소가 제거됨)
    if (isEmptyValue(contentValue)) {
      return ''
    }
    return safeFormatText(String(contentValue))
  })

  // 작은 버튼 텍스트 교체 (span 내부의 a 태그 텍스트) - 빈 값이면 기본 텍스트 제거
  let smallBtnIndex = 0
  modifiedHtml = modifiedHtml.replace(
    /(<span align="left"[^>]*>[\s\S]*?<a [^>]*>)([^<]*)(작은[\s\n]*버튼[^<]*)?(<\/a>[\s\S]*?<\/span>)/g,
    (match, prefix, text, btnText, suffix) => {
      const isLeft = smallBtnIndex === 0
      const btnValue = isLeft ? properties.leftSmallBtnText : properties.rightSmallBtnText
      smallBtnIndex++

      // 빈 값이면 빈 문자열 (버튼은 남기되 텍스트만 제거)
      const replacement = isEmptyValue(btnValue) ? '' : String(btnValue)
      return `${prefix}${replacement}${suffix}`
    }
  )

  // 큰 버튼 텍스트 교체 (width:100% 스타일을 가진 a 태그) - 빈 값이면 기본 텍스트 제거
  let bigBtnIndex = 0
  modifiedHtml = modifiedHtml.replace(
    /(<a [^>]*width:100%[^>]*>)([^<]*)(큰[\s\n]*버튼[^<]*)?(<\/a>)/g,
    (match, prefix, text, btnText, suffix) => {
      const isLeft = bigBtnIndex === 0
      const btnValue = isLeft ? properties.leftBigBtnText : properties.rightBigBtnText
      bigBtnIndex++

      // 빈 값이면 빈 문자열 (버튼은 남기되 텍스트만 제거)
      const replacement = isEmptyValue(btnValue) ? '' : String(btnValue)
      return `${prefix}${replacement}${suffix}`
    }
  )

  // href 링크 교체
  const hrefReplacements = [
    properties.leftSmallBtnUrl || '#',
    properties.leftBigBtnUrl || '#',
    properties.rightSmallBtnUrl || '#',
    properties.rightBigBtnUrl || '#',
  ]
  let hrefIndex = 0
  modifiedHtml = modifiedHtml.replace(REGEX_PATTERNS.href, () => {
    const url = hrefReplacements[hrefIndex] || '#'
    hrefIndex++
    return `href="${url}"`
  })

  // 이미지 URL 교체
  let imgIndex = 0
  modifiedHtml = modifiedHtml.replace(REGEX_PATTERNS.imageUrl2Column, () => {
    const url = imgIndex === 0
      ? (properties.leftImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL)
      : (properties.rightImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL)
    imgIndex++
    return `src="${url}"`
  })

  // 추가 콘텐츠 삽입
  if (properties.additionalContents && Array.isArray(properties.additionalContents) && properties.additionalContents.length > 0) {
    modifiedHtml = await insertAdditionalContents(
      modifiedHtml,
      properties.additionalContents as AdditionalContent[],
      HTML_MARKERS.additionalContentRight
    )
  } else {
    modifiedHtml = removeMarker(modifiedHtml, HTML_MARKERS.additionalContentRight)
  }

  // 버튼 스타일 적용
  modifiedHtml = applyModule04SmallButtonStyles(modifiedHtml, properties)
  modifiedHtml = applyModule04BigButtonStyles(modifiedHtml, properties)

  // 버튼 표시/숨김 처리
  modifiedHtml = handleModule04ButtonVisibility(modifiedHtml, properties)

  return modifiedHtml
}

/**
 * Module02 콘텐츠 교체
 */
export async function replaceModule02Content(
  html: string,
  properties: Record<string, unknown>,
  insertAdditionalContents: (html: string, contents: AdditionalContent[], marker: string) => Promise<string>
): Promise<string> {
  let module02Html = html
    .replace(REGEX_PATTERNS.imageUrl1Column, `src="${properties.imageUrl || DEFAULT_IMAGE_URL}"`)
    .replace(REGEX_PATTERNS.imageAlt, `alt="${properties.imageAlt || '이미지'}"`)

  // 콘텐츠 타이틀 처리 - 빈 값이면 빈 문자열 (필수 항목이므로 요소는 유지)
  const title = isEmptyValue(properties.title)
    ? ''
    : safeFormatText(String(properties.title))
  module02Html = module02Html.replace(REGEX_PATTERNS.contentTitle, title)

  // 테이블 타이틀 처리 - 빈 값이면 빈 문자열
  const tableTitle = isEmptyValue(properties.tableTitle)
    ? ''
    : safeFormatText(String(properties.tableTitle))
  module02Html = module02Html.replace(REGEX_PATTERNS.tableTitle, tableTitle)

  // 🐛 버그 수정 1: "테이블 콘텐츠 텍스트"를 먼저 교체해야 "콘텐츠 텍스트"와 충돌하지 않음
  // 테이블 콘텐츠 처리 (먼저 교체) - 빈 값이면 빈 문자열
  const tableContent = isEmptyValue(properties.tableContent)
    ? ''
    : safeFormatText(String(properties.tableContent))
  module02Html = module02Html.replace(REGEX_PATTERNS.tableContent, tableContent)

  // 콘텐츠 텍스트 처리 (나중에 교체) - 빈 값이면 빈 문자열
  const description = isEmptyValue(properties.description)
    ? ''
    : safeFormatText(String(properties.description))
  module02Html = module02Html.replace(REGEX_PATTERNS.contentText, description)

  // 버튼 텍스트 처리 - 빈 값이면 빈 문자열
  const buttonText = isEmptyValue(properties.buttonText)
    ? ''
    : String(properties.buttonText)
  module02Html = module02Html.replace(REGEX_PATTERNS.bigButton, buttonText)
  module02Html = module02Html.replace(REGEX_PATTERNS.href, `href="${properties.buttonUrl || '#'}"`)

  // 버튼 스타일 적용
  module02Html = applyModule02ButtonStyles(
    module02Html,
    properties.buttonBgColor as string | undefined,
    properties.buttonTextColor as string | undefined
  )

  // 동적 테이블 행 추가
  if (properties.tableRows && Array.isArray(properties.tableRows) && properties.tableRows.length > 0) {
    const dynamicRows = generateTableRowsHtml(properties.tableRows as TableRow[])
    module02Html = module02Html.replace(HTML_MARKERS.tableRow, dynamicRows)
  }

  // 추가 콘텐츠 삽입
  if (properties.additionalContents && Array.isArray(properties.additionalContents) && properties.additionalContents.length > 0) {
    module02Html = await insertAdditionalContents(
      module02Html,
      properties.additionalContents as AdditionalContent[],
      HTML_MARKERS.additionalContent
    )
  } else {
    module02Html = removeMarker(module02Html, HTML_MARKERS.additionalContent)
  }

  // 테이블 완전 제거 (showTable이 false인 경우)
  if (properties.showTable !== true) {
    module02Html = removeTableFromHtml(module02Html)
  }

  // 버튼 완전 제거 (showButton이 false인 경우)
  if (properties.showButton !== true) {
    module02Html = removeButtonFromHtml(module02Html)
  }

  return module02Html
}

/**
 * Module05 콘텐츠 교체 - 완전히 새로운 플레이스홀더 기반 방식
 */
export async function replaceModule05Content(
  html: string,
  properties: Record<string, unknown>,
  insertAdditionalContents: (html: string, contents: AdditionalContent[], marker: string) => Promise<string>
): Promise<string> {
  let module05Html = html

  console.log('[Module05] 콘텐츠 교체 시작:', properties)

  // === 이미지 URL 교체 ===
  module05Html = module05Html.replace(/{{topLeftImageUrl}}/g, String(properties.topLeftImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL))
  module05Html = module05Html.replace(/{{topLeftImageAlt}}/g, String(properties.topLeftImageAlt || '이미지'))
  module05Html = module05Html.replace(/{{bottomLeftImageUrl}}/g, String(properties.bottomLeftImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL))
  module05Html = module05Html.replace(/{{bottomLeftImageAlt}}/g, String(properties.bottomLeftImageAlt || '이미지'))

  // === 위쪽 타이틀 교체 - 빈 값이면 요소 제거 ===
  if (isEmptyValue(properties.topRightTitle)) {
    // 타이틀을 포함하는 div 전체 제거
    module05Html = module05Html.replace(/<!-- 위쪽 타이틀 -->[\s\S]*?<!-- \/\/위쪽 타이틀 -->/g, '')
    module05Html = module05Html.replace(/<div[^>]*>[\s\S]*?{{topRightTitle}}[\s\S]*?<\/div>/g, '')
    module05Html = module05Html.replace(/{{topRightTitle}}/g, '')
  } else {
    module05Html = module05Html.replace(/{{topRightTitle}}/g, String(properties.topRightTitle))
  }

  // === 위쪽 테이블 타이틀 교체 - 빈 값이면 요소 제거 ===
  if (isEmptyValue(properties.topRightTableTitle)) {
    // 테이블을 포함하는 전체 제거
    module05Html = module05Html.replace(/<!-- 위쪽 테이블 -->[\s\S]*?<!-- \/\/위쪽 테이블 -->/g, '')
    module05Html = module05Html.replace(/<table[^>]*>[\s\S]*?{{topRightTableTitle}}[\s\S]*?<\/table>/g, '')
    module05Html = module05Html.replace(/{{topRightTableTitle}}/g, '')
  } else {
    module05Html = module05Html.replace(/{{topRightTableTitle}}/g, safeFormatText(String(properties.topRightTableTitle)))
  }

  // === 아래쪽 타이틀 교체 - 빈 값이면 요소 제거 ===
  if (isEmptyValue(properties.bottomRightTitle)) {
    module05Html = module05Html.replace(/<!-- 아래쪽 타이틀 -->[\s\S]*?<!-- \/\/아래쪽 타이틀 -->/g, '')
    module05Html = module05Html.replace(/<div[^>]*>[\s\S]*?{{bottomRightTitle}}[\s\S]*?<\/div>/g, '')
    module05Html = module05Html.replace(/{{bottomRightTitle}}/g, '')
  } else {
    module05Html = module05Html.replace(/{{bottomRightTitle}}/g, String(properties.bottomRightTitle))
  }

  // === 아래쪽 테이블 타이틀 교체 - 빈 값이면 요소 제거 ===
  if (isEmptyValue(properties.bottomRightTableTitle)) {
    module05Html = module05Html.replace(/<!-- 아래쪽 테이블 -->[\s\S]*?<!-- \/\/아래쪽 테이블 -->/g, '')
    module05Html = module05Html.replace(/<table[^>]*>[\s\S]*?{{bottomRightTableTitle}}[\s\S]*?<\/table>/g, '')
    module05Html = module05Html.replace(/{{bottomRightTableTitle}}/g, '')
  } else {
    module05Html = module05Html.replace(/{{bottomRightTableTitle}}/g, safeFormatText(String(properties.bottomRightTableTitle)))
  }

  // === 버튼 색상 ===
  const smallBtnBgColor = properties.smallBtnBgColor || '#e5e5e5'
  const smallBtnTextColor = properties.smallBtnTextColor || '#ffffff'
  const bigBtnBgColor = properties.bigBtnBgColor || '#111111'
  const bigBtnTextColor = properties.bigBtnTextColor || '#ffffff'

  module05Html = module05Html.replace(/{{smallBtnBgColor}}/g, String(smallBtnBgColor))
  module05Html = module05Html.replace(/{{smallBtnTextColor}}/g, String(smallBtnTextColor))
  module05Html = module05Html.replace(/{{bigBtnBgColor}}/g, String(bigBtnBgColor))
  module05Html = module05Html.replace(/{{bigBtnTextColor}}/g, String(bigBtnTextColor))

  // === 위쪽 작은 버튼 처리 ===
  if (properties.showTopSmallBtn !== true) {
    module05Html = module05Html.replace(/<!-- 위쪽 작은 버튼 -->[\s\S]*?<!-- \/\/위쪽 작은 버튼 -->/g, '')
  } else {
    const topSmallBtnText = isEmptyValue(properties.topRightSmallBtnText) ? '' : String(properties.topRightSmallBtnText)
    module05Html = module05Html.replace(/{{topRightSmallBtnText}}/g, topSmallBtnText)
    module05Html = module05Html.replace(/{{topRightSmallBtnUrl}}/g, String(properties.topRightSmallBtnUrl || '#'))
  }

  // === 아래쪽 작은 버튼 처리 ===
  if (properties.showBottomSmallBtn !== true) {
    module05Html = module05Html.replace(/<!-- 아래쪽 작은 버튼 -->[\s\S]*?<!-- \/\/아래쪽 작은 버튼 -->/g, '')
  } else {
    const bottomSmallBtnText = isEmptyValue(properties.bottomRightSmallBtnText) ? '' : String(properties.bottomRightSmallBtnText)
    module05Html = module05Html.replace(/{{bottomRightSmallBtnText}}/g, bottomSmallBtnText)
    module05Html = module05Html.replace(/{{bottomRightSmallBtnUrl}}/g, String(properties.bottomRightSmallBtnUrl || '#'))
  }

  // === 큰 버튼 처리 ===
  if (properties.showBigBtn !== true) {
    module05Html = module05Html.replace(/<!-- 큰 버튼 -->[\s\S]*?<!-- \/\/큰 버튼 -->/g, '')
  } else {
    const bigBtnText = isEmptyValue(properties.bigButtonText) ? '' : String(properties.bigButtonText)
    module05Html = module05Html.replace(/{{bigButtonText}}/g, bigBtnText)
    module05Html = module05Html.replace(/{{bigButtonUrl}}/g, String(properties.bigButtonUrl || '#'))
  }

  // === 추가 콘텐츠 삽입 (상단) ===
  if (properties.additionalContentsTop && Array.isArray(properties.additionalContentsTop) && properties.additionalContentsTop.length > 0) {
    module05Html = await insertAdditionalContents(
      module05Html,
      properties.additionalContentsTop as AdditionalContent[],
      HTML_MARKERS.additionalContentTop
    )
  } else {
    module05Html = removeMarker(module05Html, HTML_MARKERS.additionalContentTop)
  }

  // === 추가 콘텐츠 삽입 (하단) ===
  if (properties.additionalContentsBottom && Array.isArray(properties.additionalContentsBottom) && properties.additionalContentsBottom.length > 0) {
    module05Html = await insertAdditionalContents(
      module05Html,
      properties.additionalContentsBottom as AdditionalContent[],
      HTML_MARKERS.additionalContentBottom
    )
  } else {
    module05Html = removeMarker(module05Html, HTML_MARKERS.additionalContentBottom)
  }

  console.log('[Module05] 콘텐츠 교체 완료')
  return module05Html
}

/**
 * Module05-3 콘텐츠 교체
 */
export async function replaceModule053Content(
  html: string,
  properties: Record<string, unknown>
): Promise<string> {
  let module053Html = html

  // 섹션 타이틀 교체 - 빈 값이면 빈 문자열
  let titleIndex = 0
  module053Html = module053Html.replace(/상단 섹션 타이틀|하단 섹션 타이틀/g, () => {
    const isTop = titleIndex === 0
    const titleValue = isTop ? properties.topSectionTitle : properties.bottomSectionTitle
    const replacement = isEmptyValue(titleValue)
      ? ''  // 빈 값이면 빈 문자열
      : safeFormatText(String(titleValue))
    titleIndex++
    return replacement
  })

  // 섹션 텍스트 교체 - 빈 값이면 빈 문자열
  let textIndex = 0
  module053Html = module053Html.replace(/상단 섹션 텍스트|하단 섹션 텍스트/g, () => {
    const isTop = textIndex === 0
    const textValue = isTop ? properties.topSectionText : properties.bottomSectionText
    const replacement = isEmptyValue(textValue)
      ? ''  // 빈 값이면 빈 문자열
      : safeFormatText(String(textValue))
    textIndex++
    return replacement
  })

  // 이미지 URL 교체
  let imgIndex = 0
  module053Html = module053Html.replace(REGEX_PATTERNS.imageUrl2Column, () => {
    const url = imgIndex === 0
      ? (properties.topLeftImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL)
      : (properties.bottomLeftImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL)
    imgIndex++
    return `src="${url}"`
  })

  // 이미지 alt 교체
  let altIndex = 0
  module053Html = module053Html.replace(REGEX_PATTERNS.imageAlt, () => {
    const alt = altIndex === 0
      ? (properties.topLeftImageAlt || '이미지')
      : (properties.bottomLeftImageAlt || '이미지')
    altIndex++
    return `alt="${alt}"`
  })

  // 오른쪽 타이틀 1 교체 - 빈 값이면 빈 문자열
  let rightTitle1Index = 0
  module053Html = module053Html.replace(/상단 오른쪽 첫 번째 타이틀|하단 오른쪽 첫 번째 타이틀/g, () => {
    const isTop = rightTitle1Index === 0
    const titleValue = isTop ? properties.topRightTitle1 : properties.bottomRightTitle1
    const replacement = isEmptyValue(titleValue)
      ? ''
      : safeFormatText(String(titleValue))
    rightTitle1Index++
    return replacement
  })

  // 오른쪽 텍스트 1 교체 - 빈 값이면 빈 문자열
  let rightText1Index = 0
  module053Html = module053Html.replace(/상단 오른쪽 첫 번째 텍스트|하단 오른쪽 첫 번째 텍스트/g, () => {
    const isTop = rightText1Index === 0
    const textValue = isTop ? properties.topRightText1 : properties.bottomRightText1
    const replacement = isEmptyValue(textValue)
      ? ''
      : safeFormatText(String(textValue))
    rightText1Index++
    return replacement
  })

  // 오른쪽 타이틀 2 교체 - 빈 값이면 빈 문자열
  let rightTitle2Index = 0
  module053Html = module053Html.replace(/상단 오른쪽 두 번째 타이틀|하단 오른쪽 두 번째 타이틀/g, () => {
    const isTop = rightTitle2Index === 0
    const titleValue = isTop ? properties.topRightTitle2 : properties.bottomRightTitle2
    const replacement = isEmptyValue(titleValue)
      ? ''
      : safeFormatText(String(titleValue))
    rightTitle2Index++
    return replacement
  })

  // 오른쪽 텍스트 2 교체 - 빈 값이면 빈 문자열
  let rightText2Index = 0
  module053Html = module053Html.replace(/상단 오른쪽 두 번째 텍스트|하단 오른쪽 두 번째 텍스트/g, () => {
    const isTop = rightText2Index === 0
    const textValue = isTop ? properties.topRightText2 : properties.bottomRightText2
    const replacement = isEmptyValue(textValue)
      ? ''
      : safeFormatText(String(textValue))
    rightText2Index++
    return replacement
  })

  // 작은 버튼 텍스트 교체 - 빈 값이면 빈 문자열
  let smallBtnIndex = 0
  module053Html = module053Html.replace(REGEX_PATTERNS.smallButton, () => {
    const isTop = smallBtnIndex === 0
    const btnValue = isTop ? properties.topSmallBtnText : properties.bottomSmallBtnText
    const replacement = isEmptyValue(btnValue) ? '' : String(btnValue)
    smallBtnIndex++
    return replacement
  })

  // 큰 버튼 텍스트 교체 - 빈 값이면 빈 문자열
  const bigButtonText = isEmptyValue(properties.bigBtnText)
    ? ''
    : String(properties.bigBtnText)
  module053Html = module053Html.replace(REGEX_PATTERNS.bigButton, bigButtonText)

  // href 교체
  const hrefReplacements = [
    properties.topSmallBtnUrl || '#',
    properties.bottomSmallBtnUrl || '#',
    properties.bigBtnUrl || '#'
  ]
  let hrefIndex = 0
  module053Html = module053Html.replace(REGEX_PATTERNS.href, () => {
    const url = hrefReplacements[hrefIndex] || '#'
    hrefIndex++
    return `href="${url}"`
  })

  // 버튼 스타일 적용
  module053Html = applyModule053ButtonStyles(module053Html, properties)

  // 버튼 표시/숨김 처리
  module053Html = handleModule053ButtonVisibility(module053Html, properties)

  return module053Html
}

/**
 * 기본 템플릿 교체 ({{key}} 플레이스홀더)
 */
export function replaceDefaultTemplate(html: string, properties: Record<string, unknown>): string {
  let result = html
  Object.entries(properties).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    result = result.replace(placeholder, String(value))
  })
  return result
}
