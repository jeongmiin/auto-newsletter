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
 * SectionTitle 모듈 콘텐츠 교체 - 플레이스홀더 기반 방식
 */
export function replaceSectionTitleContent(html: string, properties: Record<string, unknown>): string {
  let sectionHtml = html

  // === 메인 타이틀 플레이스홀더 교체 - 빈 값이면 빈 문자열 (필수 항목이므로 요소는 유지) ===
  sectionHtml = sectionHtml.replace(/\{\{mainTitle\}\}/g,
    isEmptyValue(properties.mainTitle) ? '' : safeFormatText(String(properties.mainTitle)))

  // === 서브 타이틀 플레이스홀더 교체 - 빈 값이면 요소 제거 ===
  if (shouldRenderElement(properties.subTitle)) {
    sectionHtml = sectionHtml.replace(/\{\{subTitle\}\}/g,
      safeFormatText(String(properties.subTitle)))
  } else {
    sectionHtml = removeSubTitleDiv(sectionHtml)
  }

  return sectionHtml
}

/**
 * Module04 콘텐츠 교체 - 플레이스홀더 기반 방식
 */
export async function replaceModule04Content(
  html: string,
  properties: Record<string, unknown>,
  insertAdditionalContents: (html: string, contents: AdditionalContent[], marker: string) => Promise<string>
): Promise<string> {
  let modifiedHtml = html

  // === 왼쪽 타이틀 플레이스홀더 교체 - 빈 값이면 빈 문자열 ===
  modifiedHtml = modifiedHtml.replace(/\{\{leftTitle\}\}/g,
    isEmptyValue(properties.leftTitle) ? '' : safeFormatText(String(properties.leftTitle)))

  // === 왼쪽 콘텐츠 플레이스홀더 교체 - 빈 값이면 빈 문자열 ===
  modifiedHtml = modifiedHtml.replace(/\{\{leftContent\}\}/g,
    isEmptyValue(properties.leftContent) ? '' : safeFormatText(String(properties.leftContent)))

  // === 왼쪽 작은 버튼 텍스트 플레이스홀더 교체 ===
  modifiedHtml = modifiedHtml.replace(/\{\{leftSmallBtnText\}\}/g,
    isEmptyValue(properties.leftSmallBtnText) ? '' : String(properties.leftSmallBtnText))

  // === 왼쪽 큰 버튼 텍스트 플레이스홀더 교체 ===
  modifiedHtml = modifiedHtml.replace(/\{\{leftBigBtnText\}\}/g,
    isEmptyValue(properties.leftBigBtnText) ? '' : String(properties.leftBigBtnText))

  // === 오른쪽 타이틀 플레이스홀더 교체 - 빈 값이면 빈 문자열 ===
  modifiedHtml = modifiedHtml.replace(/\{\{rightTitle\}\}/g,
    isEmptyValue(properties.rightTitle) ? '' : safeFormatText(String(properties.rightTitle)))

  // === 오른쪽 콘텐츠 플레이스홀더 교체 - 빈 값이면 빈 문자열 ===
  modifiedHtml = modifiedHtml.replace(/\{\{rightContent\}\}/g,
    isEmptyValue(properties.rightContent) ? '' : safeFormatText(String(properties.rightContent)))

  // === 오른쪽 작은 버튼 텍스트 플레이스홀더 교체 ===
  modifiedHtml = modifiedHtml.replace(/\{\{rightSmallBtnText\}\}/g,
    isEmptyValue(properties.rightSmallBtnText) ? '' : String(properties.rightSmallBtnText))

  // === 오른쪽 큰 버튼 텍스트 플레이스홀더 교체 ===
  modifiedHtml = modifiedHtml.replace(/\{\{rightBigBtnText\}\}/g,
    isEmptyValue(properties.rightBigBtnText) ? '' : String(properties.rightBigBtnText))

  // === href 링크 교체 ===
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

  // === 이미지 URL 교체 ===
  let imgIndex = 0
  modifiedHtml = modifiedHtml.replace(REGEX_PATTERNS.imageUrl2Column, () => {
    const url = imgIndex === 0
      ? (properties.leftImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL)
      : (properties.rightImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL)
    imgIndex++
    return `src="${url}"`
  })

  // === 추가 콘텐츠 삽입 ===
  if (properties.additionalContents && Array.isArray(properties.additionalContents) && properties.additionalContents.length > 0) {
    modifiedHtml = await insertAdditionalContents(
      modifiedHtml,
      properties.additionalContents as AdditionalContent[],
      HTML_MARKERS.additionalContentRight
    )
  } else {
    modifiedHtml = removeMarker(modifiedHtml, HTML_MARKERS.additionalContentRight)
  }

  // === 버튼 스타일 적용 ===
  modifiedHtml = applyModule04SmallButtonStyles(modifiedHtml, properties)
  modifiedHtml = applyModule04BigButtonStyles(modifiedHtml, properties)

  // === 버튼 표시/숨김 처리 ===
  modifiedHtml = handleModule04ButtonVisibility(modifiedHtml, properties)

  return modifiedHtml
}

/**
 * Module02 콘텐츠 교체 - 플레이스홀더 기반 방식
 */
export async function replaceModule02Content(
  html: string,
  properties: Record<string, unknown>,
  insertAdditionalContents: (html: string, contents: AdditionalContent[], marker: string) => Promise<string>
): Promise<string> {
  let module02Html = html

  // === 이미지 URL/Alt 교체 ===
  module02Html = module02Html.replace(REGEX_PATTERNS.imageUrl1Column, `src="${properties.imageUrl || DEFAULT_IMAGE_URL}"`)
  module02Html = module02Html.replace(REGEX_PATTERNS.imageAlt, `alt="${properties.imageAlt || '이미지'}"`)

  // === 콘텐츠 타이틀 플레이스홀더 교체 - 빈 값이면 빈 문자열 ===
  module02Html = module02Html.replace(/\{\{title\}\}/g,
    isEmptyValue(properties.title) ? '' : safeFormatText(String(properties.title)))

  // === 콘텐츠 설명 플레이스홀더 교체 - 빈 값이면 빈 문자열 ===
  module02Html = module02Html.replace(/\{\{description\}\}/g,
    isEmptyValue(properties.description) ? '' : safeFormatText(String(properties.description)))

  // === 테이블 타이틀 플레이스홀더 교체 - 빈 값이면 빈 문자열 ===
  module02Html = module02Html.replace(/\{\{tableTitle\}\}/g,
    isEmptyValue(properties.tableTitle) ? '' : safeFormatText(String(properties.tableTitle)))

  // === 테이블 콘텐츠 플레이스홀더 교체 - 빈 값이면 빈 문자열 ===
  module02Html = module02Html.replace(/\{\{tableContent\}\}/g,
    isEmptyValue(properties.tableContent) ? '' : safeFormatText(String(properties.tableContent)))

  // === 버튼 텍스트 플레이스홀더 교체 - 빈 값이면 빈 문자열 ===
  module02Html = module02Html.replace(/\{\{buttonText\}\}/g,
    isEmptyValue(properties.buttonText) ? '' : String(properties.buttonText))

  // === href 교체 ===
  module02Html = module02Html.replace(REGEX_PATTERNS.href, `href="${properties.buttonUrl || '#'}"`)

  // === 버튼 스타일 적용 ===
  module02Html = applyModule02ButtonStyles(
    module02Html,
    properties.buttonBgColor as string | undefined,
    properties.buttonTextColor as string | undefined
  )

  // === 동적 테이블 행 추가 ===
  if (properties.tableRows && Array.isArray(properties.tableRows) && properties.tableRows.length > 0) {
    const dynamicRows = generateTableRowsHtml(properties.tableRows as TableRow[])
    module02Html = module02Html.replace(HTML_MARKERS.tableRow, dynamicRows)
  }

  // === 추가 콘텐츠 삽입 ===
  if (properties.additionalContents && Array.isArray(properties.additionalContents) && properties.additionalContents.length > 0) {
    module02Html = await insertAdditionalContents(
      module02Html,
      properties.additionalContents as AdditionalContent[],
      HTML_MARKERS.additionalContent
    )
  } else {
    module02Html = removeMarker(module02Html, HTML_MARKERS.additionalContent)
  }

  // === 테이블 완전 제거 (showTable이 false인 경우) ===
  if (properties.showTable !== true) {
    module02Html = removeTableFromHtml(module02Html)
  }

  // === 버튼 완전 제거 (showButton이 false인 경우) ===
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
 * Module05-3 콘텐츠 교체 - 플레이스홀더 기반 방식
 */
export async function replaceModule053Content(
  html: string,
  properties: Record<string, unknown>
): Promise<string> {
  let module053Html = html

  // === 섹션 타이틀/텍스트 플레이스홀더 교체 ===
  module053Html = module053Html.replace(/\{\{topSectionTitle\}\}/g,
    isEmptyValue(properties.topSectionTitle) ? '' : safeFormatText(String(properties.topSectionTitle)))

  module053Html = module053Html.replace(/\{\{topSectionText\}\}/g,
    isEmptyValue(properties.topSectionText) ? '' : safeFormatText(String(properties.topSectionText)))

  module053Html = module053Html.replace(/\{\{bottomSectionTitle\}\}/g,
    isEmptyValue(properties.bottomSectionTitle) ? '' : safeFormatText(String(properties.bottomSectionTitle)))

  module053Html = module053Html.replace(/\{\{bottomSectionText\}\}/g,
    isEmptyValue(properties.bottomSectionText) ? '' : safeFormatText(String(properties.bottomSectionText)))

  // === 이미지 URL 교체 ===
  let imgIndex = 0
  module053Html = module053Html.replace(REGEX_PATTERNS.imageUrl2Column, () => {
    const url = imgIndex === 0
      ? (properties.topLeftImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL)
      : (properties.bottomLeftImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL)
    imgIndex++
    return `src="${url}"`
  })

  // === 이미지 alt 교체 ===
  let altIndex = 0
  module053Html = module053Html.replace(REGEX_PATTERNS.imageAlt, () => {
    const alt = altIndex === 0
      ? (properties.topLeftImageAlt || '이미지')
      : (properties.bottomLeftImageAlt || '이미지')
    altIndex++
    return `alt="${alt}"`
  })

  // === 오른쪽 타이틀/텍스트 플레이스홀더 교체 ===
  module053Html = module053Html.replace(/\{\{topRightTitle1\}\}/g,
    isEmptyValue(properties.topRightTitle1) ? '' : safeFormatText(String(properties.topRightTitle1)))

  module053Html = module053Html.replace(/\{\{topRightText1\}\}/g,
    isEmptyValue(properties.topRightText1) ? '' : safeFormatText(String(properties.topRightText1)))

  module053Html = module053Html.replace(/\{\{topRightTitle2\}\}/g,
    isEmptyValue(properties.topRightTitle2) ? '' : safeFormatText(String(properties.topRightTitle2)))

  module053Html = module053Html.replace(/\{\{topRightText2\}\}/g,
    isEmptyValue(properties.topRightText2) ? '' : safeFormatText(String(properties.topRightText2)))

  module053Html = module053Html.replace(/\{\{bottomRightTitle1\}\}/g,
    isEmptyValue(properties.bottomRightTitle1) ? '' : safeFormatText(String(properties.bottomRightTitle1)))

  module053Html = module053Html.replace(/\{\{bottomRightText1\}\}/g,
    isEmptyValue(properties.bottomRightText1) ? '' : safeFormatText(String(properties.bottomRightText1)))

  module053Html = module053Html.replace(/\{\{bottomRightTitle2\}\}/g,
    isEmptyValue(properties.bottomRightTitle2) ? '' : safeFormatText(String(properties.bottomRightTitle2)))

  module053Html = module053Html.replace(/\{\{bottomRightText2\}\}/g,
    isEmptyValue(properties.bottomRightText2) ? '' : safeFormatText(String(properties.bottomRightText2)))

  // === 작은 버튼 텍스트 플레이스홀더 교체 ===
  module053Html = module053Html.replace(/\{\{topSmallBtnText\}\}/g,
    isEmptyValue(properties.topSmallBtnText) ? '' : String(properties.topSmallBtnText))

  module053Html = module053Html.replace(/\{\{bottomSmallBtnText\}\}/g,
    isEmptyValue(properties.bottomSmallBtnText) ? '' : String(properties.bottomSmallBtnText))

  // === 큰 버튼 텍스트 플레이스홀더 교체 ===
  module053Html = module053Html.replace(/\{\{bigBtnText\}\}/g,
    isEmptyValue(properties.bigBtnText) ? '' : String(properties.bigBtnText))

  // === href 교체 ===
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

  // === 버튼 스타일 적용 ===
  module053Html = applyModule053ButtonStyles(module053Html, properties)

  // === 버튼 표시/숨김 처리 ===
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
