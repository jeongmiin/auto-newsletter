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

  // 작은 버튼 텍스트 교체 (span 내부의 a 태그 텍스트)
  let smallBtnIndex = 0
  modifiedHtml = modifiedHtml.replace(
    /(<span align="left"[^>]*>[\s\S]*?<a [^>]*>)([^<]*)(작은[\s\n]*버튼[^<]*)?(<\/a>[\s\S]*?<\/span>)/g,
    (match, prefix, text, btnText, suffix) => {
      const isLeft = smallBtnIndex === 0
      const btnValue = isLeft ? properties.leftSmallBtnText : properties.rightSmallBtnText
      const replacement = shouldRenderElement(btnValue) ? String(btnValue) : '작은 버튼 →'
      smallBtnIndex++
      return `${prefix}${replacement}${suffix}`
    }
  )

  // 큰 버튼 텍스트 교체 (width:100% 스타일을 가진 a 태그)
  let bigBtnIndex = 0
  modifiedHtml = modifiedHtml.replace(
    /(<a [^>]*width:100%[^>]*>)([^<]*)(큰[\s\n]*버튼[^<]*)?(<\/a>)/g,
    (match, prefix, text, btnText, suffix) => {
      const isLeft = bigBtnIndex === 0
      const btnValue = isLeft ? properties.leftBigBtnText : properties.rightBigBtnText
      const replacement = shouldRenderElement(btnValue) ? String(btnValue) : '큰 버튼 →'
      bigBtnIndex++
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
 * Module05-3 콘텐츠 교체
 */
export async function replaceModule053Content(
  html: string,
  properties: Record<string, unknown>
): Promise<string> {
  let module053Html = html

  // 섹션 타이틀 교체
  let titleIndex = 0
  module053Html = module053Html.replace(/상단 섹션 타이틀|하단 섹션 타이틀/g, () => {
    const isTop = titleIndex === 0
    const titleValue = isTop ? properties.topSectionTitle : properties.bottomSectionTitle
    const replacement = shouldRenderElement(titleValue)
      ? safeFormatText(String(titleValue))
      : isTop ? '상단 섹션 타이틀' : '하단 섹션 타이틀'
    titleIndex++
    return replacement
  })

  // 섹션 텍스트 교체
  let textIndex = 0
  module053Html = module053Html.replace(/상단 섹션 텍스트|하단 섹션 텍스트/g, () => {
    const isTop = textIndex === 0
    const textValue = isTop ? properties.topSectionText : properties.bottomSectionText
    const replacement = shouldRenderElement(textValue)
      ? safeFormatText(String(textValue))
      : isTop ? '상단 섹션 텍스트' : '하단 섹션 텍스트'
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

  // 오른쪽 타이틀 1 교체
  let rightTitle1Index = 0
  module053Html = module053Html.replace(/상단 오른쪽 첫 번째 타이틀|하단 오른쪽 첫 번째 타이틀/g, () => {
    const isTop = rightTitle1Index === 0
    const titleValue = isTop ? properties.topRightTitle1 : properties.bottomRightTitle1
    const replacement = shouldRenderElement(titleValue)
      ? safeFormatText(String(titleValue))
      : isTop ? '상단 오른쪽 첫 번째 타이틀' : '하단 오른쪽 첫 번째 타이틀'
    rightTitle1Index++
    return replacement
  })

  // 오른쪽 텍스트 1 교체
  let rightText1Index = 0
  module053Html = module053Html.replace(/상단 오른쪽 첫 번째 텍스트|하단 오른쪽 첫 번째 텍스트/g, () => {
    const isTop = rightText1Index === 0
    const textValue = isTop ? properties.topRightText1 : properties.bottomRightText1
    const replacement = shouldRenderElement(textValue)
      ? safeFormatText(String(textValue))
      : isTop ? '상단 오른쪽 첫 번째 텍스트' : '하단 오른쪽 첫 번째 텍스트'
    rightText1Index++
    return replacement
  })

  // 오른쪽 타이틀 2 교체
  let rightTitle2Index = 0
  module053Html = module053Html.replace(/상단 오른쪽 두 번째 타이틀|하단 오른쪽 두 번째 타이틀/g, () => {
    const isTop = rightTitle2Index === 0
    const titleValue = isTop ? properties.topRightTitle2 : properties.bottomRightTitle2
    const replacement = shouldRenderElement(titleValue)
      ? safeFormatText(String(titleValue))
      : isTop ? '상단 오른쪽 두 번째 타이틀' : '하단 오른쪽 두 번째 타이틀'
    rightTitle2Index++
    return replacement
  })

  // 오른쪽 텍스트 2 교체
  let rightText2Index = 0
  module053Html = module053Html.replace(/상단 오른쪽 두 번째 텍스트|하단 오른쪽 두 번째 텍스트/g, () => {
    const isTop = rightText2Index === 0
    const textValue = isTop ? properties.topRightText2 : properties.bottomRightText2
    const replacement = shouldRenderElement(textValue)
      ? safeFormatText(String(textValue))
      : isTop ? '상단 오른쪽 두 번째 텍스트' : '하단 오른쪽 두 번째 텍스트'
    rightText2Index++
    return replacement
  })

  // 작은 버튼 텍스트 교체
  let smallBtnIndex = 0
  module053Html = module053Html.replace(REGEX_PATTERNS.smallButton, () => {
    const isTop = smallBtnIndex === 0
    const btnValue = isTop ? properties.topSmallBtnText : properties.bottomSmallBtnText
    const replacement = shouldRenderElement(btnValue) ? String(btnValue) : '작은 버튼 →'
    smallBtnIndex++
    return replacement
  })

  // 큰 버튼 텍스트 교체
  const bigButtonText = shouldRenderElement(properties.bigBtnText)
    ? String(properties.bigBtnText)
    : '큰 버튼 →'
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
