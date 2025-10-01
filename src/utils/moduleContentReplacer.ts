import type { ModuleInstance, TableRow, AdditionalContent } from '@/types'
import { formatTextWithBreaks, shouldRenderElement, safeFormatText } from './textUtils'
import { DEFAULT_TWO_COLUMN_IMAGE_URL, DEFAULT_IMAGE_URL, REGEX_PATTERNS, HTML_MARKERS } from '@/constants/defaults'
import {
  applyModule04SmallButtonStyles,
  applyModule04BigButtonStyles,
  handleModule04ButtonVisibility,
  applyModule05ButtonStyles,
  handleModule05ButtonVisibility,
  applyModule02ButtonStyles,
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

  // 메인 타이틀 처리
  const mainTitle = shouldRenderElement(properties.mainTitle)
    ? safeFormatText(String(properties.mainTitle))
    : '모듈 섹션 타이틀 영역'
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

  // 타이틀 교체
  let titleIndex = 0
  modifiedHtml = modifiedHtml.replace(REGEX_PATTERNS.contentTitle, () => {
    const isLeft = titleIndex === 0
    const titleValue = isLeft ? properties.leftTitle : properties.rightTitle
    const replacement = shouldRenderElement(titleValue)
      ? safeFormatText(String(titleValue))
      : '콘텐츠 타이틀'
    titleIndex++
    return replacement
  })

  // 콘텐츠 텍스트 교체
  let contentIndex = 0
  modifiedHtml = modifiedHtml.replace(REGEX_PATTERNS.contentText, () => {
    const isLeft = contentIndex === 0
    const contentValue = isLeft ? properties.leftContent : properties.rightContent
    const replacement = shouldRenderElement(contentValue)
      ? safeFormatText(String(contentValue))
      : '콘텐츠 텍스트'
    contentIndex++
    return replacement
  })

  // 작은 버튼 텍스트 교체
  let smallBtnIndex = 0
  modifiedHtml = modifiedHtml.replace(REGEX_PATTERNS.smallButton, () => {
    const isLeft = smallBtnIndex === 0
    const btnValue = isLeft ? properties.leftSmallBtnText : properties.rightSmallBtnText
    const replacement = shouldRenderElement(btnValue) ? String(btnValue) : '작은 버튼 →'
    smallBtnIndex++
    return replacement
  })

  // 큰 버튼 텍스트 교체
  let bigBtnIndex = 0
  modifiedHtml = modifiedHtml.replace(REGEX_PATTERNS.bigButton, () => {
    const isLeft = bigBtnIndex === 0
    const btnValue = isLeft ? properties.leftBigBtnText : properties.rightBigBtnText
    const replacement = shouldRenderElement(btnValue) ? String(btnValue) : '큰 버튼 →'
    bigBtnIndex++
    return replacement
  })

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

  // 콘텐츠 타이틀 처리
  const title = shouldRenderElement(properties.title)
    ? safeFormatText(String(properties.title))
    : '콘텐츠 타이틀'
  module02Html = module02Html.replace(REGEX_PATTERNS.contentTitle, title)

  // 테이블 타이틀 처리
  const tableTitle = shouldRenderElement(properties.tableTitle)
    ? safeFormatText(String(properties.tableTitle))
    : '테이블 타이틀'
  module02Html = module02Html.replace(REGEX_PATTERNS.tableTitle, tableTitle)

  // 🐛 버그 수정 1: "테이블 콘텐츠 텍스트"를 먼저 교체해야 "콘텐츠 텍스트"와 충돌하지 않음
  // 테이블 콘텐츠 처리 (먼저 교체)
  const tableContent = shouldRenderElement(properties.tableContent)
    ? safeFormatText(String(properties.tableContent))
    : '테이블 콘텐츠 텍스트'
  module02Html = module02Html.replace(REGEX_PATTERNS.tableContent, tableContent)

  // 콘텐츠 텍스트 처리 (나중에 교체)
  const description = shouldRenderElement(properties.description)
    ? safeFormatText(String(properties.description))
    : '콘텐츠 텍스트'
  module02Html = module02Html.replace(REGEX_PATTERNS.contentText, description)

  // 버튼 텍스트 처리
  const buttonText = shouldRenderElement(properties.buttonText)
    ? String(properties.buttonText)
    : '큰 버튼 →'
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
 * Module05 콘텐츠 교체
 */
export async function replaceModule05Content(
  html: string,
  properties: Record<string, unknown>,
  insertAdditionalContents: (html: string, contents: AdditionalContent[], marker: string) => Promise<string>
): Promise<string> {
  let module05Html = html

  // 이미지 URL 교체
  let imgIndex = 0
  module05Html = module05Html.replace(REGEX_PATTERNS.imageUrl2Column, () => {
    const url = imgIndex === 0
      ? (properties.topLeftImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL)
      : (properties.bottomLeftImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL)
    imgIndex++
    return `src="${url}"`
  })

  // 콘텐츠 타이틀 교체
  let titleIndex = 0
  module05Html = module05Html.replace(/>콘텐츠 타이틀</g, () => {
    let titleValue
    if (titleIndex === 0) {
      titleValue = properties.topRightTitle
    } else if (titleIndex === 2) {
      titleValue = properties.bottomRightTitle
    } else {
      titleValue = properties.topRightTableTitle
    }

    const replacement = shouldRenderElement(titleValue)
      ? `>${safeFormatText(String(titleValue))}<`
      : `>콘텐츠 타이틀<`
    titleIndex++
    return replacement
  })

  // 작은 버튼 텍스트 교체
  let smallBtnIndex = 0
  module05Html = module05Html.replace(REGEX_PATTERNS.smallButton, () => {
    const isTop = smallBtnIndex === 0
    const btnValue = isTop ? properties.topRightSmallBtnText : properties.bottomRightSmallBtnText
    const replacement = shouldRenderElement(btnValue) ? String(btnValue) : '작은 버튼 →'
    smallBtnIndex++
    return replacement
  })

  // 큰 버튼 텍스트 교체
  const bigButtonText = shouldRenderElement(properties.bigButtonText)
    ? String(properties.bigButtonText)
    : '큰 버튼 →'
  module05Html = module05Html.replace(REGEX_PATTERNS.bigButton, bigButtonText)

  // href 교체
  const hrefReplacements = [
    properties.topRightSmallBtnUrl || '#',
    properties.bottomRightSmallBtnUrl || '#',
    properties.bigButtonUrl || '#',
  ]
  let hrefIndex = 0
  module05Html = module05Html.replace(REGEX_PATTERNS.href, () => {
    const url = hrefReplacements[hrefIndex] || '#'
    hrefIndex++
    return `href="${url}"`
  })

  // 추가 콘텐츠 삽입 (상단)
  if (properties.additionalContentsTop && Array.isArray(properties.additionalContentsTop) && properties.additionalContentsTop.length > 0) {
    module05Html = await insertAdditionalContents(
      module05Html,
      properties.additionalContentsTop as AdditionalContent[],
      HTML_MARKERS.additionalContentTop
    )
  } else {
    module05Html = removeMarker(module05Html, HTML_MARKERS.additionalContentTop)
  }

  // 추가 콘텐츠 삽입 (하단)
  if (properties.additionalContentsBottom && Array.isArray(properties.additionalContentsBottom) && properties.additionalContentsBottom.length > 0) {
    module05Html = await insertAdditionalContents(
      module05Html,
      properties.additionalContentsBottom as AdditionalContent[],
      HTML_MARKERS.additionalContentBottom
    )
  } else {
    module05Html = removeMarker(module05Html, HTML_MARKERS.additionalContentBottom)
  }

  // 버튼 표시/숨김 처리
  module05Html = handleModule05ButtonVisibility(module05Html, properties)

  // 버튼 스타일 적용
  module05Html = applyModule05ButtonStyles(module05Html, properties)

  return module05Html
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
