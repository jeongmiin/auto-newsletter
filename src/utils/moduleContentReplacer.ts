import type { TableRow, AdditionalContent } from '@/types'
import { shouldRenderElement, safeFormatText, isEmptyValue } from './textUtils'
import {
  DEFAULT_TWO_COLUMN_IMAGE_URL,
  DEFAULT_IMAGE_URL,
  REGEX_PATTERNS,
  HTML_MARKERS,
} from '@/constants/defaults'
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
import { processQuillHtml } from './quillHtmlProcessor'

/**
 * ModuleBasicHeader 모듈 콘텐츠 교체 - 플레이스홀더 기반 방식
 */
export function replaceModuleBasicHeaderContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  let headerHtml = html

  console.log('[ModuleBasicHeader] 🔧 플레이스홀더 교체 시작')

  // === 로고 이미지 URL 플레이스홀더 교체 ===
  const logoImageUrl =
    properties.logoImageUrl || 'https://design.messeesang.com/e-dm/newsletter/images/logo-gray.png'
  headerHtml = headerHtml.replace(/\{\{logoImageUrl\}\}/g, String(logoImageUrl))
  console.log('[ModuleBasicHeader] ✅ logoImageUrl:', logoImageUrl)

  // === 로고 대체 텍스트 플레이스홀더 교체 ===
  const logoAlt = properties.logoAlt || '로고'
  headerHtml = headerHtml.replace(/\{\{logoAlt\}\}/g, String(logoAlt))
  console.log('[ModuleBasicHeader] ✅ logoAlt:', logoAlt)

  // === 헤더 텍스트 플레이스홀더 교체 (Quill HTML 처리) ===
  const headerText = isEmptyValue(properties.headerText)
    ? ''
    : processQuillHtml(String(properties.headerText))
  headerHtml = headerHtml.replace(/\{\{headerText\}\}/g, headerText)
  console.log('[ModuleBasicHeader] ✅ headerText 처리 완료 (길이:', headerText.length, 'bytes)')

  console.log('[ModuleBasicHeader] ✅ 플레이스홀더 교체 완료')

  return headerHtml
}

/**
 * ModuleDescText 모듈 콘텐츠 교체 - 플레이스홀더 기반 방식
 */
export function replaceModuleDescTextContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  let descHtml = html

  console.log('[ModuleDescText] 🔧 플레이스홀더 교체 시작')

  // === 설명 텍스트 플레이스홀더 교체 (Quill HTML 처리) ===
  const descriptionText = isEmptyValue(properties.descriptionText)
    ? ''
    : processQuillHtml(String(properties.descriptionText))
  descHtml = descHtml.replace(/\{\{descriptionText\}\}/g, descriptionText)
  console.log(
    '[ModuleDescText] ✅ descriptionText 처리 완료 (길이:',
    descriptionText.length,
    'bytes)',
  )

  console.log('[ModuleDescText] ✅ 플레이스홀더 교체 완료')

  return descHtml
}

/**
 * ModuleImg 모듈 콘텐츠 교체 - 플레이스홀더 기반 방식
 */
export function replaceModuleImgContent(html: string, properties: Record<string, unknown>): string {
  let imgHtml = html

  console.log('[ModuleImg] 🔧 플레이스홀더 교체 시작')

  // === 이미지 URL 플레이스홀더 교체 ===
  const imageUrl =
    properties.imageUrl || 'https://design.messeesang.com/e-dm/newsletter/images/img-1column.png'
  imgHtml = imgHtml.replace(/\{\{imageUrl\}\}/g, String(imageUrl))
  console.log('[ModuleImg] ✅ imageUrl:', imageUrl)

  // === 이미지 Alt 텍스트 플레이스홀더 교체 ===
  const imageAlt = properties.imageAlt || '이미지'
  imgHtml = imgHtml.replace(/\{\{imageAlt\}\}/g, String(imageAlt))
  console.log('[ModuleImg] ✅ imageAlt:', imageAlt)

  console.log('[ModuleImg] ✅ 플레이스홀더 교체 완료')

  return imgHtml
}

/**
 * ModuleOneButton 모듈 콘텐츠 교체 - 플레이스홀더 기반 방식
 */
export function replaceModuleOneButtonContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  let buttonHtml = html

  console.log('[ModuleOneButton] 🔧 플레이스홀더 교체 시작')

  // === 버튼 텍스트 플레이스홀더 교체 ===
  const buttonText = properties.buttonText || '큰 버튼 →'
  buttonHtml = buttonHtml.replace(/\{\{buttonText\}\}/g, String(buttonText))
  console.log('[ModuleOneButton] ✅ buttonText:', buttonText)

  // === 버튼 URL 플레이스홀더 교체 ===
  const buttonUrl = properties.buttonUrl || '#'
  buttonHtml = buttonHtml.replace(/\{\{buttonUrl\}\}/g, String(buttonUrl))
  console.log('[ModuleOneButton] ✅ buttonUrl:', buttonUrl)

  // === 버튼 배경색 플레이스홀더 교체 ===
  const buttonBgColor = properties.buttonBgColor || '#111111'
  buttonHtml = buttonHtml.replace(/\{\{buttonBgColor\}\}/g, String(buttonBgColor))
  console.log('[ModuleOneButton] ✅ buttonBgColor:', buttonBgColor)

  // === 버튼 글자색 플레이스홀더 교체 ===
  const buttonTextColor = properties.buttonTextColor || '#ffffff'
  buttonHtml = buttonHtml.replace(/\{\{buttonTextColor\}\}/g, String(buttonTextColor))
  console.log('[ModuleOneButton] ✅ buttonTextColor:', buttonTextColor)

  console.log('[ModuleOneButton] ✅ 플레이스홀더 교체 완료')

  return buttonHtml
}

/**
 * ModuleTwoButton 모듈 콘텐츠 교체 - 플레이스홀더 기반 방식
 */
export function replaceModuleTwoButtonContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  let buttonHtml = html

  console.log('[ModuleTwoButton] 🔧 플레이스홀더 교체 시작')

  // === 첫 번째 버튼 텍스트 플레이스홀더 교체 ===
  const button1Text = properties.button1Text || '버튼 1 →'
  buttonHtml = buttonHtml.replace(/\{\{button1Text\}\}/g, String(button1Text))
  console.log('[ModuleTwoButton] ✅ button1Text:', button1Text)

  // === 첫 번째 버튼 URL 플레이스홀더 교체 ===
  const button1Url = properties.button1Url || '#'
  buttonHtml = buttonHtml.replace(/\{\{button1Url\}\}/g, String(button1Url))
  console.log('[ModuleTwoButton] ✅ button1Url:', button1Url)

  // === 첫 번째 버튼 배경색 플레이스홀더 교체 ===
  const button1BgColor = properties.button1BgColor || '#111111'
  buttonHtml = buttonHtml.replace(/\{\{button1BgColor\}\}/g, String(button1BgColor))
  console.log('[ModuleTwoButton] ✅ button1BgColor:', button1BgColor)

  // === 첫 번째 버튼 글자색 플레이스홀더 교체 ===
  const button1TextColor = properties.button1TextColor || '#ffffff'
  buttonHtml = buttonHtml.replace(/\{\{button1TextColor\}\}/g, String(button1TextColor))
  console.log('[ModuleTwoButton] ✅ button1TextColor:', button1TextColor)

  // === 두 번째 버튼 텍스트 플레이스홀더 교체 ===
  const button2Text = properties.button2Text || '버튼 2 →'
  buttonHtml = buttonHtml.replace(/\{\{button2Text\}\}/g, String(button2Text))
  console.log('[ModuleTwoButton] ✅ button2Text:', button2Text)

  // === 두 번째 버튼 URL 플레이스홀더 교체 ===
  const button2Url = properties.button2Url || '#'
  buttonHtml = buttonHtml.replace(/\{\{button2Url\}\}/g, String(button2Url))
  console.log('[ModuleTwoButton] ✅ button2Url:', button2Url)

  // === 두 번째 버튼 배경색 플레이스홀더 교체 ===
  const button2BgColor = properties.button2BgColor || '#111111'
  buttonHtml = buttonHtml.replace(/\{\{button2BgColor\}\}/g, String(button2BgColor))
  console.log('[ModuleTwoButton] ✅ button2BgColor:', button2BgColor)

  // === 두 번째 버튼 글자색 플레이스홀더 교체 ===
  const button2TextColor = properties.button2TextColor || '#ffffff'
  buttonHtml = buttonHtml.replace(/\{\{button2TextColor\}\}/g, String(button2TextColor))
  console.log('[ModuleTwoButton] ✅ button2TextColor:', button2TextColor)

  console.log('[ModuleTwoButton] ✅ 플레이스홀더 교체 완료')

  return buttonHtml
}

/**
 * SectionTitle 모듈 콘텐츠 교체 - 플레이스홀더 기반 방식
 */
export function replaceSectionTitleContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  let sectionHtml = html

  // === 메인 타이틀 플레이스홀더 교체 - 빈 값이면 빈 문자열 (필수 항목이므로 요소는 유지) ===
  sectionHtml = sectionHtml.replace(
    /\{\{mainTitle\}\}/g,
    isEmptyValue(properties.mainTitle) ? '' : safeFormatText(String(properties.mainTitle)),
  )

  // === 서브 타이틀 플레이스홀더 교체 - 빈 값이면 요소 제거 ===
  if (shouldRenderElement(properties.subTitle)) {
    sectionHtml = sectionHtml.replace(
      /\{\{subTitle\}\}/g,
      safeFormatText(String(properties.subTitle)),
    )
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
  insertAdditionalContents: (
    html: string,
    contents: AdditionalContent[],
    marker: string,
  ) => Promise<string>,
): Promise<string> {
  let modifiedHtml = html

  // === 왼쪽 타이틀 플레이스홀더 교체 - 빈 값이면 빈 문자열 ===
  modifiedHtml = modifiedHtml.replace(
    /\{\{leftTitle\}\}/g,
    isEmptyValue(properties.leftTitle) ? '' : safeFormatText(String(properties.leftTitle)),
  )

  // === 왼쪽 콘텐츠 플레이스홀더 교체 - 빈 값이면 빈 문자열 ===
  modifiedHtml = modifiedHtml.replace(
    /\{\{leftContent\}\}/g,
    isEmptyValue(properties.leftContent) ? '' : safeFormatText(String(properties.leftContent)),
  )

  // === 왼쪽 작은 버튼 텍스트 플레이스홀더 교체 ===
  modifiedHtml = modifiedHtml.replace(
    /\{\{leftSmallBtnText\}\}/g,
    isEmptyValue(properties.leftSmallBtnText) ? '' : String(properties.leftSmallBtnText),
  )

  // === 왼쪽 큰 버튼 텍스트 플레이스홀더 교체 ===
  modifiedHtml = modifiedHtml.replace(
    /\{\{leftBigBtnText\}\}/g,
    isEmptyValue(properties.leftBigBtnText) ? '' : String(properties.leftBigBtnText),
  )

  // === 오른쪽 타이틀 플레이스홀더 교체 - 빈 값이면 빈 문자열 ===
  modifiedHtml = modifiedHtml.replace(
    /\{\{rightTitle\}\}/g,
    isEmptyValue(properties.rightTitle) ? '' : safeFormatText(String(properties.rightTitle)),
  )

  // === 오른쪽 콘텐츠 플레이스홀더 교체 - 빈 값이면 빈 문자열 ===
  modifiedHtml = modifiedHtml.replace(
    /\{\{rightContent\}\}/g,
    isEmptyValue(properties.rightContent) ? '' : safeFormatText(String(properties.rightContent)),
  )

  // === 오른쪽 작은 버튼 텍스트 플레이스홀더 교체 ===
  modifiedHtml = modifiedHtml.replace(
    /\{\{rightSmallBtnText\}\}/g,
    isEmptyValue(properties.rightSmallBtnText) ? '' : String(properties.rightSmallBtnText),
  )

  // === 오른쪽 큰 버튼 텍스트 플레이스홀더 교체 ===
  modifiedHtml = modifiedHtml.replace(
    /\{\{rightBigBtnText\}\}/g,
    isEmptyValue(properties.rightBigBtnText) ? '' : String(properties.rightBigBtnText),
  )

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
    const url =
      imgIndex === 0
        ? properties.leftImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL
        : properties.rightImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL
    imgIndex++
    return `src="${url}"`
  })

  // === 추가 콘텐츠 삽입 ===
  if (
    properties.additionalContents &&
    Array.isArray(properties.additionalContents) &&
    properties.additionalContents.length > 0
  ) {
    modifiedHtml = await insertAdditionalContents(
      modifiedHtml,
      properties.additionalContents as AdditionalContent[],
      HTML_MARKERS.additionalContentRight,
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
  insertAdditionalContents: (
    html: string,
    contents: AdditionalContent[],
    marker: string,
  ) => Promise<string>,
): Promise<string> {
  let module02Html = html

  // === 이미지 URL/Alt 교체 ===
  module02Html = module02Html.replace(
    REGEX_PATTERNS.imageUrl1Column,
    `src="${properties.imageUrl || DEFAULT_IMAGE_URL}"`,
  )
  module02Html = module02Html.replace(
    REGEX_PATTERNS.imageAlt,
    `alt="${properties.imageAlt || '이미지'}"`,
  )

  // === 콘텐츠 타이틀 플레이스홀더 교체 - 빈 값이면 빈 문자열 ===
  module02Html = module02Html.replace(
    /\{\{title\}\}/g,
    isEmptyValue(properties.title) ? '' : safeFormatText(String(properties.title)),
  )

  // === 콘텐츠 설명 플레이스홀더 교체 - 빈 값이면 빈 문자열 ===
  module02Html = module02Html.replace(
    /\{\{description\}\}/g,
    isEmptyValue(properties.description) ? '' : safeFormatText(String(properties.description)),
  )

  // === 테이블 타이틀 플레이스홀더 교체 - 빈 값이면 빈 문자열 ===
  module02Html = module02Html.replace(
    /\{\{tableTitle\}\}/g,
    isEmptyValue(properties.tableTitle) ? '' : safeFormatText(String(properties.tableTitle)),
  )

  // === 테이블 콘텐츠 플레이스홀더 교체 - 빈 값이면 빈 문자열 ===
  module02Html = module02Html.replace(
    /\{\{tableContent\}\}/g,
    isEmptyValue(properties.tableContent) ? '' : safeFormatText(String(properties.tableContent)),
  )

  // === 버튼 텍스트 플레이스홀더 교체 - 빈 값이면 빈 문자열 ===
  module02Html = module02Html.replace(
    /\{\{buttonText\}\}/g,
    isEmptyValue(properties.buttonText) ? '' : String(properties.buttonText),
  )

  // === href 교체 ===
  module02Html = module02Html.replace(REGEX_PATTERNS.href, `href="${properties.buttonUrl || '#'}"`)

  // === 버튼 스타일 적용 ===
  module02Html = applyModule02ButtonStyles(
    module02Html,
    properties.buttonBgColor as string | undefined,
    properties.buttonTextColor as string | undefined,
  )

  // === 동적 테이블 행 추가 ===
  if (
    properties.tableRows &&
    Array.isArray(properties.tableRows) &&
    properties.tableRows.length > 0
  ) {
    const dynamicRows = generateTableRowsHtml(properties.tableRows as TableRow[])
    module02Html = module02Html.replace(HTML_MARKERS.tableRow, dynamicRows)
  }

  // === 추가 콘텐츠 삽입 ===
  if (
    properties.additionalContents &&
    Array.isArray(properties.additionalContents) &&
    properties.additionalContents.length > 0
  ) {
    module02Html = await insertAdditionalContents(
      module02Html,
      properties.additionalContents as AdditionalContent[],
      HTML_MARKERS.additionalContent,
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
  insertAdditionalContents: (
    html: string,
    contents: AdditionalContent[],
    marker: string,
  ) => Promise<string>,
): Promise<string> {
  let module05Html = html

  console.log('[Module05] 콘텐츠 교체 시작:', properties)

  // === 이미지 URL 교체 ===
  module05Html = module05Html.replace(
    /{{topLeftImageUrl}}/g,
    String(properties.topLeftImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL),
  )
  module05Html = module05Html.replace(
    /{{topLeftImageAlt}}/g,
    String(properties.topLeftImageAlt || '이미지'),
  )

  // === 타이틀 교체 - 빈 값이면 요소 제거 ===
  if (isEmptyValue(properties.topRightTitle)) {
    // 타이틀을 포함하는 div 전체 제거
    module05Html = module05Html.replace(/<!-- 위쪽 타이틀 -->[\s\S]*?<!-- \/\/위쪽 타이틀 -->/g, '')
    module05Html = module05Html.replace(/<div[^>]*>[\s\S]*?{{topRightTitle}}[\s\S]*?<\/div>/g, '')
    module05Html = module05Html.replace(/{{topRightTitle}}/g, '')
  } else {
    module05Html = module05Html.replace(/{{topRightTitle}}/g, String(properties.topRightTitle))
  }

  // === 테이블 타이틀 교체 - 빈 값이면 요소 제거 ===
  if (isEmptyValue(properties.topRightTableTitle)) {
    // 테이블을 포함하는 전체 제거
    module05Html = module05Html.replace(/<!-- 위쪽 테이블 -->[\s\S]*?<!-- \/\/위쪽 테이블 -->/g, '')
    module05Html = module05Html.replace(
      /<table[^>]*>[\s\S]*?{{topRightTableTitle}}[\s\S]*?<\/table>/g,
      '',
    )
    module05Html = module05Html.replace(/{{topRightTableTitle}}/g, '')
  } else {
    module05Html = module05Html.replace(
      /{{topRightTableTitle}}/g,
      safeFormatText(String(properties.topRightTableTitle)),
    )
  }

  // === 버튼 색상 ===
  const smallBtnBgColor = properties.smallBtnBgColor || '#000000'
  const smallBtnTextColor = properties.smallBtnTextColor || '#ffffff'
  const bigBtnBgColor = properties.bigBtnBgColor || '#111111'
  const bigBtnTextColor = properties.bigBtnTextColor || '#ffffff'

  module05Html = module05Html.replace(/{{smallBtnBgColor}}/g, String(smallBtnBgColor))
  module05Html = module05Html.replace(/{{smallBtnTextColor}}/g, String(smallBtnTextColor))
  module05Html = module05Html.replace(/{{bigBtnBgColor}}/g, String(bigBtnBgColor))
  module05Html = module05Html.replace(/{{bigBtnTextColor}}/g, String(bigBtnTextColor))

  // === 작은 버튼 처리 ===
  if (properties.showTopSmallBtn !== true) {
    module05Html = module05Html.replace(
      /<!-- 위쪽 작은 버튼 -->[\s\S]*?<!-- \/\/위쪽 작은 버튼 -->/g,
      '',
    )
  } else {
    const topSmallBtnText = isEmptyValue(properties.topRightSmallBtnText)
      ? ''
      : String(properties.topRightSmallBtnText)
    module05Html = module05Html.replace(/{{topRightSmallBtnText}}/g, topSmallBtnText)
    module05Html = module05Html.replace(
      /{{topRightSmallBtnUrl}}/g,
      String(properties.topRightSmallBtnUrl || '#'),
    )
  }

  // === 큰 버튼 처리 ===
  if (properties.showBigBtn !== true) {
    module05Html = module05Html.replace(/<!-- 큰 버튼 -->[\s\S]*?<!-- \/\/큰 버튼 -->/g, '')
  } else {
    const bigBtnText = isEmptyValue(properties.bigButtonText)
      ? ''
      : String(properties.bigButtonText)
    module05Html = module05Html.replace(/{{bigButtonText}}/g, bigBtnText)
    module05Html = module05Html.replace(/{{bigButtonUrl}}/g, String(properties.bigButtonUrl || '#'))
  }

  // === 추가 콘텐츠 삽입 ===
  if (
    properties.additionalContentsTop &&
    Array.isArray(properties.additionalContentsTop) &&
    properties.additionalContentsTop.length > 0
  ) {
    module05Html = await insertAdditionalContents(
      module05Html,
      properties.additionalContentsTop as AdditionalContent[],
      HTML_MARKERS.additionalContentTop,
    )
  } else {
    module05Html = removeMarker(module05Html, HTML_MARKERS.additionalContentTop)
  }

  console.log('[Module05] 콘텐츠 교체 완료')
  return module05Html
}

/**
 * Module05-3 콘텐츠 교체 - 플레이스홀더 기반 방식
 */
export async function replaceModule053Content(
  html: string,
  properties: Record<string, unknown>,
): Promise<string> {
  let module053Html = html

  // === 섹션 타이틀/텍스트 플레이스홀더 교체 ===
  module053Html = module053Html.replace(
    /\{\{topSectionTitle\}\}/g,
    isEmptyValue(properties.topSectionTitle)
      ? ''
      : safeFormatText(String(properties.topSectionTitle)),
  )

  module053Html = module053Html.replace(
    /\{\{topSectionText\}\}/g,
    isEmptyValue(properties.topSectionText)
      ? ''
      : safeFormatText(String(properties.topSectionText)),
  )

  module053Html = module053Html.replace(
    /\{\{bottomSectionTitle\}\}/g,
    isEmptyValue(properties.bottomSectionTitle)
      ? ''
      : safeFormatText(String(properties.bottomSectionTitle)),
  )

  module053Html = module053Html.replace(
    /\{\{bottomSectionText\}\}/g,
    isEmptyValue(properties.bottomSectionText)
      ? ''
      : safeFormatText(String(properties.bottomSectionText)),
  )

  // === 이미지 URL 교체 ===
  let imgIndex = 0
  module053Html = module053Html.replace(REGEX_PATTERNS.imageUrl2Column, () => {
    const url =
      imgIndex === 0
        ? properties.topLeftImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL
        : properties.bottomLeftImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL
    imgIndex++
    return `src="${url}"`
  })

  // === 이미지 alt 교체 ===
  let altIndex = 0
  module053Html = module053Html.replace(REGEX_PATTERNS.imageAlt, () => {
    const alt =
      altIndex === 0
        ? properties.topLeftImageAlt || '이미지'
        : properties.bottomLeftImageAlt || '이미지'
    altIndex++
    return `alt="${alt}"`
  })

  // === 오른쪽 타이틀/텍스트 플레이스홀더 교체 ===
  module053Html = module053Html.replace(
    /\{\{topRightTitle1\}\}/g,
    isEmptyValue(properties.topRightTitle1)
      ? ''
      : safeFormatText(String(properties.topRightTitle1)),
  )

  module053Html = module053Html.replace(
    /\{\{topRightText1\}\}/g,
    isEmptyValue(properties.topRightText1) ? '' : safeFormatText(String(properties.topRightText1)),
  )

  module053Html = module053Html.replace(
    /\{\{topRightTitle2\}\}/g,
    isEmptyValue(properties.topRightTitle2)
      ? ''
      : safeFormatText(String(properties.topRightTitle2)),
  )

  module053Html = module053Html.replace(
    /\{\{topRightText2\}\}/g,
    isEmptyValue(properties.topRightText2) ? '' : safeFormatText(String(properties.topRightText2)),
  )

  module053Html = module053Html.replace(
    /\{\{bottomRightTitle1\}\}/g,
    isEmptyValue(properties.bottomRightTitle1)
      ? ''
      : safeFormatText(String(properties.bottomRightTitle1)),
  )

  module053Html = module053Html.replace(
    /\{\{bottomRightText1\}\}/g,
    isEmptyValue(properties.bottomRightText1)
      ? ''
      : safeFormatText(String(properties.bottomRightText1)),
  )

  module053Html = module053Html.replace(
    /\{\{bottomRightTitle2\}\}/g,
    isEmptyValue(properties.bottomRightTitle2)
      ? ''
      : safeFormatText(String(properties.bottomRightTitle2)),
  )

  module053Html = module053Html.replace(
    /\{\{bottomRightText2\}\}/g,
    isEmptyValue(properties.bottomRightText2)
      ? ''
      : safeFormatText(String(properties.bottomRightText2)),
  )

  // === 작은 버튼 텍스트 플레이스홀더 교체 ===
  module053Html = module053Html.replace(
    /\{\{topSmallBtnText\}\}/g,
    isEmptyValue(properties.topSmallBtnText) ? '' : String(properties.topSmallBtnText),
  )

  module053Html = module053Html.replace(
    /\{\{bottomSmallBtnText\}\}/g,
    isEmptyValue(properties.bottomSmallBtnText) ? '' : String(properties.bottomSmallBtnText),
  )

  // === 큰 버튼 텍스트 플레이스홀더 교체 ===
  module053Html = module053Html.replace(
    /\{\{bigBtnText\}\}/g,
    isEmptyValue(properties.bigBtnText) ? '' : String(properties.bigBtnText),
  )

  // === href 교체 ===
  const hrefReplacements = [
    properties.topSmallBtnUrl || '#',
    properties.bottomSmallBtnUrl || '#',
    properties.bigBtnUrl || '#',
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
 * 공통 플레이스홀더 교체 헬퍼 함수
 */
function replacePlaceholder(html: string, key: string, value: unknown): string {
  const regex = new RegExp(`{{${key}}}`, 'g')
  return html.replace(regex, String(value))
}

/**
 * 여러 플레이스홀더를 한번에 교체하는 헬퍼 함수
 */
function replacePlaceholders(html: string, replacements: Record<string, unknown>): string {
  let result = html
  for (const [key, value] of Object.entries(replacements)) {
    result = replacePlaceholder(result, key, value)
  }
  return result
}

/**
 * Module01-1 모듈 콘텐츠 교체 - 플레이스홀더 기반 방식
 */
export function replaceModule011Content(html: string, properties: Record<string, unknown>): string {
  let result = html

  console.log('[Module01-1] 🔧 플레이스홀더 교체 시작')

  // 왼쪽 컬럼
  const leftTitle = properties.leftTitle || ''
  const leftContent = isEmptyValue(properties.leftContent)
    ? ''
    : processQuillHtml(String(properties.leftContent))

  result = replacePlaceholder(result, 'leftTitle', leftTitle)
  result = replacePlaceholder(result, 'leftContent', leftContent)

  // 오른쪽 컬럼
  const rightTitle = properties.rightTitle || ''
  const rightContent = isEmptyValue(properties.rightContent)
    ? ''
    : processQuillHtml(String(properties.rightContent))

  result = replacePlaceholder(result, 'rightTitle', rightTitle)
  result = replacePlaceholder(result, 'rightContent', rightContent)

  console.log('[Module01-1] ✅ 플레이스홀더 교체 완료')
  return result
}

/**
 * Module01-2 모듈 콘텐츠 교체 - 플레이스홀더 기반 방식
 */
export function replaceModule012Content(html: string, properties: Record<string, unknown>): string {
  let result = html

  console.log('[Module01-2] 🔧 플레이스홀더 교체 시작')

  // 카테고리
  const categoryText = properties.categoryText || ''
  const categoryBgColor = properties.categoryBgColor || '#666666'
  const categoryTextColor = properties.categoryTextColor || '#ffffff'

  result = replacePlaceholder(result, 'categoryText', categoryText)
  result = replacePlaceholder(result, 'categoryBgColor', categoryBgColor)
  result = replacePlaceholder(result, 'categoryTextColor', categoryTextColor)

  // 콘텐츠 텍스트
  const contentText = isEmptyValue(properties.contentText)
    ? ''
    : processQuillHtml(String(properties.contentText))

  result = replacePlaceholder(result, 'contentText', contentText)

  console.log('[Module01-2] ✅ 플레이스홀더 교체 완료')
  return result
}

/**
 * Module05-1 모듈 콘텐츠 교체 - 플레이스홀더 기반 방식
 */
export function replaceModule051Content(html: string, properties: Record<string, unknown>): string {
  let result = html

  console.log('[Module05-1] 🔧 플레이스홀더 교체 시작')

  // 이미지
  const ImageUrl = properties.ImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL
  const ImageAlt = properties.ImageAlt || '이미지'

  result = replacePlaceholder(result, 'ImageUrl', ImageUrl)
  result = replacePlaceholder(result, 'ImageAlt', ImageAlt)

  // 박스 타이틀 및 색상
  const boxTitle = properties.boxTitle || ''
  const boxBgColor = properties.boxBgColor || '#e5e5e5'
  const boxColor = properties.boxColor || '#111111'

  result = replacePlaceholder(result, 'boxTitle', boxTitle)
  result = replacePlaceholder(result, 'boxBgColor', boxBgColor)
  result = replacePlaceholder(result, 'boxColor', boxColor)

  // 콘텐츠 텍스트
  const contentText = isEmptyValue(properties.contentText)
    ? ''
    : processQuillHtml(String(properties.contentText))

  result = replacePlaceholder(result, 'contentText', contentText)

  console.log('[Module05-1] ✅ 플레이스홀더 교체 완료')
  return result
}

/**
 * Module05-2 모듈 콘텐츠 교체 - 플레이스홀더 기반 방식
 * 4개의 독립적인 버튼을 각각 제어
 */
export function replaceModule052Content(html: string, properties: Record<string, unknown>): string {
  let module052Html = html

  console.log('[Module05-2] 🔧 플레이스홀더 교체 시작')

  // 이미지 URL & Alt
  const imageUrl = properties.imageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL
  module052Html = module052Html.replace(/\{\{imageUrl\}\}/g, String(imageUrl))
  const imageAlt = properties.imageAlt || '이미지'
  module052Html = module052Html.replace(/\{\{imageAlt\}\}/g, String(imageAlt))

  // 텍스트 (Quill HTML 처리)
  const contentText = isEmptyValue(properties.contentText)
    ? ''
    : processQuillHtml(String(properties.contentText))
  module052Html = module052Html.replace(/\{\{contentText\}\}/g, contentText)

  // 버튼 1 표시/숨김
  if (properties.showButton1 === true) {
    const button1Text = properties.button1Text || '버튼 1 →'
    const button1Url = properties.button1Url || '#'
    const button1BgColor = properties.button1BgColor || '#111111'
    const button1TextColor = properties.button1TextColor || '#ffffff'
    module052Html = module052Html.replace(/\{\{button1Text\}\}/g, String(button1Text))
    module052Html = module052Html.replace(/\{\{button1Url\}\}/g, String(button1Url))
    module052Html = module052Html.replace(/\{\{button1BgColor\}\}/g, String(button1BgColor))
    module052Html = module052Html.replace(/\{\{button1TextColor\}\}/g, String(button1TextColor))
    console.log('[Module05-2] ✅ 버튼 1 표시')
  } else {
    // 한 줄에 있어도 제거 가능 (s 플래그 추가)
    module052Html = module052Html.replace(/<!-- 버튼 1 -->.*?<!-- \/\/버튼 1 -->/gs, '')
    console.log('[Module05-2] ❌ 버튼 1 숨김')
  }

  // 버튼 2 표시/숨김
  if (properties.showButton2 === true) {
    const button2Text = properties.button2Text || '버튼 2 →'
    const button2Url = properties.button2Url || '#'
    const button2BgColor = properties.button2BgColor || '#2196F3'
    const button2TextColor = properties.button2TextColor || '#ffffff'
    module052Html = module052Html.replace(/\{\{button2Text\}\}/g, String(button2Text))
    module052Html = module052Html.replace(/\{\{button2Url\}\}/g, String(button2Url))
    module052Html = module052Html.replace(/\{\{button2BgColor\}\}/g, String(button2BgColor))
    module052Html = module052Html.replace(/\{\{button2TextColor\}\}/g, String(button2TextColor))
    console.log('[Module05-2] ✅ 버튼 2 표시')
  } else {
    module052Html = module052Html.replace(/<!-- 버튼 2 -->.*?<!-- \/\/버튼 2 -->/gs, '')
    console.log('[Module05-2] ❌ 버튼 2 숨김')
  }

  // 버튼 3 표시/숨김
  if (properties.showButton3 === true) {
    const button3Text = properties.button3Text || '버튼 3 →'
    const button3Url = properties.button3Url || '#'
    const button3BgColor = properties.button3BgColor || '#4CAF50'
    const button3TextColor = properties.button3TextColor || '#ffffff'
    module052Html = module052Html.replace(/\{\{button3Text\}\}/g, String(button3Text))
    module052Html = module052Html.replace(/\{\{button3Url\}\}/g, String(button3Url))
    module052Html = module052Html.replace(/\{\{button3BgColor\}\}/g, String(button3BgColor))
    module052Html = module052Html.replace(/\{\{button3TextColor\}\}/g, String(button3TextColor))
    console.log('[Module05-2] ✅ 버튼 3 표시')
  } else {
    module052Html = module052Html.replace(/<!-- 버튼 3 -->.*?<!-- \/\/버튼 3 -->/gs, '')
    console.log('[Module05-2] ❌ 버튼 3 숨김')
  }

  // 버튼 4 표시/숨김
  if (properties.showButton4 === true) {
    const button4Text = properties.button4Text || '버튼 4 →'
    const button4Url = properties.button4Url || '#'
    const button4BgColor = properties.button4BgColor || '#FF5722'
    const button4TextColor = properties.button4TextColor || '#ffffff'
    module052Html = module052Html.replace(/\{\{button4Text\}\}/g, String(button4Text))
    module052Html = module052Html.replace(/\{\{button4Url\}\}/g, String(button4Url))
    module052Html = module052Html.replace(/\{\{button4BgColor\}\}/g, String(button4BgColor))
    module052Html = module052Html.replace(/\{\{button4TextColor\}\}/g, String(button4TextColor))
    console.log('[Module05-2] ✅ 버튼 4 표시')
  } else {
    module052Html = module052Html.replace(/<!-- 버튼 4 -->.*?<!-- \/\/버튼 4 -->/gs, '')
    console.log('[Module05-2] ❌ 버튼 4 숨김')
  }

  console.log('[Module05-2] ✅ 플레이스홀더 교체 완료')
  return module052Html
}

/**
 * Module06 모듈 콘텐츠 교체 - 플레이스홀더 기반 방식
 */
export function replaceModule06Content(html: string, properties: Record<string, unknown>): string {
  let module06Html = html

  console.log('[Module06] 🔧 플레이스홀더 교체 시작')

  // 왼쪽 섹션
  const leftTitle = properties.leftTitle || ''
  const leftTitleBgColor = properties.leftTitleBgColor || '#e5e5e5'
  const leftTitleColor = properties.leftTitleColor || '#333333'
  const leftImageUrl = properties.leftImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL
  const leftImageAlt = properties.leftImageAlt || '이미지'
  const leftContent = isEmptyValue(properties.leftContent)
    ? ''
    : processQuillHtml(String(properties.leftContent))

  module06Html = module06Html.replace(/\{\{leftTitle\}\}/g, String(leftTitle))
  module06Html = module06Html.replace(/\{\{leftTitleBgColor\}\}/g, String(leftTitleBgColor))
  module06Html = module06Html.replace(/\{\{leftTitleColor\}\}/g, String(leftTitleColor))
  module06Html = module06Html.replace(/\{\{leftImageUrl\}\}/g, String(leftImageUrl))
  module06Html = module06Html.replace(/\{\{leftImageAlt\}\}/g, String(leftImageAlt))
  module06Html = module06Html.replace(/\{\{leftContent\}\}/g, leftContent)

  // 왼쪽 버튼 표시/숨김
  if (properties.showLeftButton === true) {
    const leftButtonText = properties.leftButtonText || '더보기 →'
    const leftButtonUrl = properties.leftButtonUrl || '#'
    const leftButtonBgColor = properties.leftButtonBgColor || '#e5e5e5'
    const leftButtonTextColor = properties.leftButtonTextColor || '#333333'

    module06Html = module06Html.replace(/\{\{leftButtonText\}\}/g, String(leftButtonText))
    module06Html = module06Html.replace(/\{\{leftButtonUrl\}\}/g, String(leftButtonUrl))
    module06Html = module06Html.replace(/\{\{leftButtonBgColor\}\}/g, String(leftButtonBgColor))
    module06Html = module06Html.replace(/\{\{leftButtonTextColor\}\}/g, String(leftButtonTextColor))
    console.log('[Module06] ✅ 왼쪽 버튼 표시')
  } else {
    module06Html = module06Html.replace(/<!-- 왼쪽 버튼 -->.*?<!-- \/\/왼쪽 버튼 -->/gs, '')
    console.log('[Module06] ❌ 왼쪽 버튼 숨김')
  }

  // 오른쪽 섹션
  const rightTitle = properties.rightTitle || ''
  const rightTitleBgColor = properties.rightTitleBgColor || '#e5e5e5'
  const rightTitleColor = properties.rightTitleColor || '#333333'
  const rightImageUrl = properties.rightImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL
  const rightImageAlt = properties.rightImageAlt || '이미지'
  const rightContent = isEmptyValue(properties.rightContent)
    ? ''
    : processQuillHtml(String(properties.rightContent))

  module06Html = module06Html.replace(/\{\{rightTitle\}\}/g, String(rightTitle))
  module06Html = module06Html.replace(/\{\{rightTitleBgColor\}\}/g, String(rightTitleBgColor))
  module06Html = module06Html.replace(/\{\{rightTitleColor\}\}/g, String(rightTitleColor))
  module06Html = module06Html.replace(/\{\{rightImageUrl\}\}/g, String(rightImageUrl))
  module06Html = module06Html.replace(/\{\{rightImageAlt\}\}/g, String(rightImageAlt))
  module06Html = module06Html.replace(/\{\{rightContent\}\}/g, rightContent)

  // 오른쪽 버튼 표시/숨김
  if (properties.showRightButton === true) {
    const rightButtonText = properties.rightButtonText || '더보기 →'
    const rightButtonUrl = properties.rightButtonUrl || '#'
    const rightButtonBgColor = properties.rightButtonBgColor || '#e5e5e5'
    const rightButtonTextColor = properties.rightButtonTextColor || '#333333'

    module06Html = module06Html.replace(/\{\{rightButtonText\}\}/g, String(rightButtonText))
    module06Html = module06Html.replace(/\{\{rightButtonUrl\}\}/g, String(rightButtonUrl))
    module06Html = module06Html.replace(/\{\{rightButtonBgColor\}\}/g, String(rightButtonBgColor))
    module06Html = module06Html.replace(
      /\{\{rightButtonTextColor\}\}/g,
      String(rightButtonTextColor),
    )
    console.log('[Module06] ✅ 오른쪽 버튼 표시')
  } else {
    module06Html = module06Html.replace(/<!-- 오른쪽 버튼 -->.*?<!-- \/\/오른쪽 버튼 -->/gs, '')
    console.log('[Module06] ❌ 오른쪽 버튼 숨김')
  }

  console.log('[Module06] ✅ 플레이스홀더 교체 완료')
  return module06Html
}

/**
 * Module07 / Module07_reverse 공통 교체 로직
 */
function replaceModule07Common(
  html: string,
  properties: Record<string, unknown>,
  moduleName: string,
): string {
  let module07Html = html
  console.log(`[${moduleName}] 🔧 플레이스홀더 교체 시작`)

  const contentText = isEmptyValue(properties.contentText)
    ? ''
    : processQuillHtml(String(properties.contentText))

  // 기본 콘텐츠 교체
  const imageUrl = properties.imageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL
  const imageAlt = properties.imageAlt || '이미지'
  const title = properties.title || ''

  module07Html = module07Html.replace(/\{\{imageUrl\}\}/g, String(imageUrl))
  module07Html = module07Html.replace(/\{\{imageAlt\}\}/g, String(imageAlt))
  module07Html = module07Html.replace(/\{\{title\}\}/g, String(title))
  module07Html = module07Html.replace(/\{\{contentText\}\}/g, contentText)

  // 버튼 표시/숨김
  if (properties.showButton === true) {
    const buttonText = properties.buttonText || '더보기 →'
    const buttonUrl = properties.buttonUrl || '#'
    const buttonBgColor = properties.buttonBgColor || '#e5e5e5'
    const buttonTextColor = properties.buttonTextColor || '#333333'

    module07Html = module07Html.replace(/\{\{buttonText\}\}/g, String(buttonText))
    module07Html = module07Html.replace(/\{\{buttonUrl\}\}/g, String(buttonUrl))
    module07Html = module07Html.replace(/\{\{buttonBgColor\}\}/g, String(buttonBgColor))
    module07Html = module07Html.replace(/\{\{buttonTextColor\}\}/g, String(buttonTextColor))
    console.log(`[${moduleName}] ✅ 버튼 표시`)
  } else {
    module07Html = module07Html.replace(/<!-- 버튼 -->.*?<!-- \/\/버튼 -->/gs, '')
    console.log(`[${moduleName}] ❌ 버튼 숨김`)
  }

  console.log(`[${moduleName}] ✅ 플레이스홀더 교체 완료`)
  return module07Html
}

/**
 * Module07 모듈 콘텐츠 교체 - 플레이스홀더 기반 방식
 */
export function replaceModule07Content(html: string, properties: Record<string, unknown>): string {
  return replaceModule07Common(html, properties, 'Module07')
}

/**
 * Module07_reverse 모듈 콘텐츠 교체 - 플레이스홀더 기반 방식
 */
export function replaceModule07ReverseContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  return replaceModule07Common(html, properties, 'Module07_reverse')
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
