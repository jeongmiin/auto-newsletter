/**
 * 모듈별 특수 프로세서 함수들
 * 각 모듈의 고유한 비즈니스 로직만 포함
 */

import type { ContentProcessor } from '../moduleContentProcessor'
import { removeSubTitleDiv, removeTableFromHtml, removeButtonFromHtml } from '../htmlUtils'
import { shouldRenderElement } from '../textUtils'
import {
  applyModule04SmallButtonStyles,
  applyModule04BigButtonStyles,
  handleModule04ButtonVisibility,
  applyModule02ButtonStyles,
  applyModule053ButtonStyles,
  handleModule053ButtonVisibility,
} from '../buttonUtils'
import { REGEX_PATTERNS, DEFAULT_TWO_COLUMN_IMAGE_URL, HTML_MARKERS } from '@/constants/defaults'
import { removeMarker } from '../htmlUtils'

/**
 * 서브 타이틀 제거 프로세서 (SectionTitle 전용)
 */
export const removeEmptySubTitleProcessor: ContentProcessor = (html, properties) => {
  if (!shouldRenderElement(properties.subTitle)) {
    return removeSubTitleDiv(html)
  }
  return html
}

/**
 * 테이블 제거 프로세서 (showTable 플래그 확인)
 */
export const removeTableProcessor: ContentProcessor = (html, properties) => {
  if (properties.showTable !== true) {
    return removeTableFromHtml(html)
  }
  return html
}

/**
 * 버튼 제거 프로세서 (showButton 플래그 확인)
 */
export const removeButtonProcessor: ContentProcessor = (html, properties) => {
  if (properties.showButton !== true) {
    return removeButtonFromHtml(html)
  }
  return html
}

/**
 * Module04 이미지 URL 교체 프로세서
 */
export const module04ImageProcessor: ContentProcessor = (html, properties) => {
  let result = html
  let imgIndex = 0
  result = result.replace(REGEX_PATTERNS.imageUrl2Column, () => {
    const url =
      imgIndex === 0
        ? properties.leftImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL
        : properties.rightImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL
    imgIndex++
    return `src="${url}"`
  })
  return result
}

/**
 * Module04 href 교체 프로세서
 */
export const module04HrefProcessor: ContentProcessor = (html, properties) => {
  const hrefReplacements = [
    properties.leftSmallBtnUrl || '#',
    properties.leftBigBtnUrl || '#',
    properties.rightSmallBtnUrl || '#',
    properties.rightBigBtnUrl || '#',
  ]
  let hrefIndex = 0
  return html.replace(REGEX_PATTERNS.href, () => {
    const url = hrefReplacements[hrefIndex] || '#'
    hrefIndex++
    return `href="${url}"`
  })
}

/**
 * Module04 버튼 스타일 프로세서
 */
export const module04ButtonStyleProcessor: ContentProcessor = (html, properties) => {
  let result = html
  result = applyModule04SmallButtonStyles(result, properties)
  result = applyModule04BigButtonStyles(result, properties)
  result = handleModule04ButtonVisibility(result, properties)
  return result
}

/**
 * Module04 추가 콘텐츠 프로세서
 */
export const module04AdditionalContentProcessor: ContentProcessor = async (
  html,
  properties,
  context,
) => {
  if (!context?.insertAdditionalContents) return html

  if (
    properties.additionalContents &&
    Array.isArray(properties.additionalContents) &&
    properties.additionalContents.length > 0
  ) {
    return await context.insertAdditionalContents(
      html,
      properties.additionalContents as any[],
      HTML_MARKERS.additionalContentRight,
    )
  } else {
    return removeMarker(html, HTML_MARKERS.additionalContentRight)
  }
}

/**
 * Module02 이미지 URL 교체 프로세서
 */
export const module02ImageProcessor: ContentProcessor = (html, properties) => {
  let result = html
  result = result.replace(
    REGEX_PATTERNS.imageUrl1Column,
    `src="${properties.imageUrl || 'https://design.messeesang.com/e-dm/newsletter/images/img-1column.png'}"`,
  )
  result = result.replace(REGEX_PATTERNS.imageAlt, `alt="${properties.imageAlt || '이미지'}"`)
  return result
}

/**
 * Module02 버튼 스타일 프로세서
 */
export const module02ButtonStyleProcessor: ContentProcessor = (html, properties) => {
  let result = html
  result = result.replace(REGEX_PATTERNS.href, `href="${properties.buttonUrl || '#'}"`)
  result = applyModule02ButtonStyles(
    result,
    properties.buttonBgColor as string | undefined,
    properties.buttonTextColor as string | undefined,
  )
  return result
}

/**
 * Module02 추가 콘텐츠 프로세서
 */
export const module02AdditionalContentProcessor: ContentProcessor = async (
  html,
  properties,
  context,
) => {
  if (!context?.insertAdditionalContents) return html

  if (
    properties.additionalContents &&
    Array.isArray(properties.additionalContents) &&
    properties.additionalContents.length > 0
  ) {
    return await context.insertAdditionalContents(
      html,
      properties.additionalContents as any[],
      HTML_MARKERS.additionalContent,
    )
  } else {
    return removeMarker(html, HTML_MARKERS.additionalContent)
  }
}

/**
 * Module053 이미지 URL 교체 프로세서
 */
export const module053ImageProcessor: ContentProcessor = (html, properties) => {
  let result = html
  let imgIndex = 0
  result = result.replace(REGEX_PATTERNS.imageUrl2Column, () => {
    const url =
      imgIndex === 0
        ? properties.topLeftImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL
        : properties.bottomLeftImageUrl || DEFAULT_TWO_COLUMN_IMAGE_URL
    imgIndex++
    return `src="${url}"`
  })

  let altIndex = 0
  result = result.replace(REGEX_PATTERNS.imageAlt, () => {
    const alt =
      altIndex === 0 ? properties.topLeftImageAlt || '이미지' : properties.bottomLeftImageAlt || '이미지'
    altIndex++
    return `alt="${alt}"`
  })

  return result
}

/**
 * Module053 href 교체 프로세서
 */
export const module053HrefProcessor: ContentProcessor = (html, properties) => {
  const hrefReplacements = [
    properties.topSmallBtnUrl || '#',
    properties.bottomSmallBtnUrl || '#',
    properties.bigBtnUrl || '#',
  ]
  let hrefIndex = 0
  return html.replace(REGEX_PATTERNS.href, () => {
    const url = hrefReplacements[hrefIndex] || '#'
    hrefIndex++
    return `href="${url}"`
  })
}

/**
 * Module053 버튼 스타일 프로세서
 */
export const module053ButtonStyleProcessor: ContentProcessor = (html, properties) => {
  let result = html
  result = applyModule053ButtonStyles(result, properties)
  result = handleModule053ButtonVisibility(result, properties)
  return result
}

/**
 * Module05 조건부 요소 제거 프로세서
 */
export const module05ConditionalProcessor: ContentProcessor = (html, properties) => {
  let result = html

  // 타이틀 제거
  if (!properties.topRightTitle || String(properties.topRightTitle).trim() === '') {
    result = result.replace(/<!-- 위쪽 타이틀 -->[\s\S]*?<!-- \/\/위쪽 타이틀 -->/g, '')
    result = result.replace(/<div[^>]*>[\s\S]*?{{topRightTitle}}[\s\S]*?<\/div>/g, '')
    result = result.replace(/{{topRightTitle}}/g, '')
  }

  // 테이블 타이틀 제거
  if (!properties.topRightTableTitle || String(properties.topRightTableTitle).trim() === '') {
    result = result.replace(/<!-- 위쪽 테이블 -->[\s\S]*?<!-- \/\/위쪽 테이블 -->/g, '')
    result = result.replace(/<table[^>]*>[\s\S]*?{{topRightTableTitle}}[\s\S]*?<\/table>/g, '')
    result = result.replace(/{{topRightTableTitle}}/g, '')
  }

  // 작은 버튼 제거
  if (properties.showTopSmallBtn !== true) {
    result = result.replace(/<!-- 위쪽 작은 버튼 -->[\s\S]*?<!-- \/\/위쪽 작은 버튼 -->/g, '')
  }

  // 큰 버튼 제거
  if (properties.showBigBtn !== true) {
    result = result.replace(/<!-- 큰 버튼 -->[\s\S]*?<!-- \/\/큰 버튼 -->/g, '')
  }

  return result
}

/**
 * Module05 추가 콘텐츠 프로세서
 */
export const module05AdditionalContentProcessor: ContentProcessor = async (
  html,
  properties,
  context,
) => {
  if (!context?.insertAdditionalContents) return html

  if (
    properties.additionalContentsTop &&
    Array.isArray(properties.additionalContentsTop) &&
    properties.additionalContentsTop.length > 0
  ) {
    return await context.insertAdditionalContents(
      html,
      properties.additionalContentsTop as any[],
      HTML_MARKERS.additionalContentTop,
    )
  } else {
    return removeMarker(html, HTML_MARKERS.additionalContentTop)
  }
}

/**
 * Module052 버튼 조건부 제거 프로세서
 */
export const module052ButtonProcessor: ContentProcessor = (html, properties) => {
  let result = html

  if (properties.showButton1 !== true) {
    result = result.replace(/<!-- 버튼 1 -->.*?<!-- \/\/버튼 1 -->/gs, '')
  }
  if (properties.showButton2 !== true) {
    result = result.replace(/<!-- 버튼 2 -->.*?<!-- \/\/버튼 2 -->/gs, '')
  }
  if (properties.showButton3 !== true) {
    result = result.replace(/<!-- 버튼 3 -->.*?<!-- \/\/버튼 3 -->/gs, '')
  }
  if (properties.showButton4 !== true) {
    result = result.replace(/<!-- 버튼 4 -->.*?<!-- \/\/버튼 4 -->/gs, '')
  }

  return result
}

/**
 * Module04 버튼 조건부 제거 프로세서 (왼쪽 작은버튼 4개 + 큰버튼 1개, 오른쪽 동일)
 */
export const module04ButtonProcessor: ContentProcessor = (html, properties) => {
  let result = html

  // 왼쪽 작은 버튼 1-4
  if (properties.showLeftSmallBtn1 !== true) {
    result = result.replace(/<!-- 왼쪽 작은 버튼 1 -->.*?<!-- \/\/왼쪽 작은 버튼 1 -->/gs, '')
  }
  if (properties.showLeftSmallBtn2 !== true) {
    result = result.replace(/<!-- 왼쪽 작은 버튼 2 -->.*?<!-- \/\/왼쪽 작은 버튼 2 -->/gs, '')
  }
  if (properties.showLeftSmallBtn3 !== true) {
    result = result.replace(/<!-- 왼쪽 작은 버튼 3 -->.*?<!-- \/\/왼쪽 작은 버튼 3 -->/gs, '')
  }
  if (properties.showLeftSmallBtn4 !== true) {
    result = result.replace(/<!-- 왼쪽 작은 버튼 4 -->.*?<!-- \/\/왼쪽 작은 버튼 4 -->/gs, '')
  }
  // 왼쪽 큰 버튼
  if (properties.showLeftBigBtn !== true) {
    result = result.replace(/<!-- 왼쪽 큰 버튼 -->.*?<!-- \/\/왼쪽 큰 버튼 -->/gs, '')
  }

  // 오른쪽 작은 버튼 1-4
  if (properties.showRightSmallBtn1 !== true) {
    result = result.replace(/<!-- 오른쪽 작은 버튼 1 -->.*?<!-- \/\/오른쪽 작은 버튼 1 -->/gs, '')
  }
  if (properties.showRightSmallBtn2 !== true) {
    result = result.replace(/<!-- 오른쪽 작은 버튼 2 -->.*?<!-- \/\/오른쪽 작은 버튼 2 -->/gs, '')
  }
  if (properties.showRightSmallBtn3 !== true) {
    result = result.replace(/<!-- 오른쪽 작은 버튼 3 -->.*?<!-- \/\/오른쪽 작은 버튼 3 -->/gs, '')
  }
  if (properties.showRightSmallBtn4 !== true) {
    result = result.replace(/<!-- 오른쪽 작은 버튼 4 -->.*?<!-- \/\/오른쪽 작은 버튼 4 -->/gs, '')
  }
  // 오른쪽 큰 버튼
  if (properties.showRightBigBtn !== true) {
    result = result.replace(/<!-- 오른쪽 큰 버튼 -->.*?<!-- \/\/오른쪽 큰 버튼 -->/gs, '')
  }

  return result
}

/**
 * Module05-1 버튼 조건부 제거 프로세서 (버튼 4개)
 */
export const module051ButtonProcessor: ContentProcessor = (html, properties) => {
  let result = html

  if (properties.showButton1 !== true) {
    result = result.replace(/<!-- 버튼 1 -->.*?<!-- \/\/버튼 1 -->/gs, '')
  }
  if (properties.showButton2 !== true) {
    result = result.replace(/<!-- 버튼 2 -->.*?<!-- \/\/버튼 2 -->/gs, '')
  }
  if (properties.showButton3 !== true) {
    result = result.replace(/<!-- 버튼 3 -->.*?<!-- \/\/버튼 3 -->/gs, '')
  }
  if (properties.showButton4 !== true) {
    result = result.replace(/<!-- 버튼 4 -->.*?<!-- \/\/버튼 4 -->/gs, '')
  }

  return result
}

/**
 * Module05-3 버튼 조건부 제거 프로세서 (작은버튼 4개 + 큰버튼 1개)
 */
export const module053ButtonProcessor: ContentProcessor = (html, properties) => {
  let result = html

  // 작은 버튼 1-4
  if (properties.showSmallBtn1 !== true) {
    result = result.replace(/<!-- 작은 버튼 1 -->.*?<!-- \/\/작은 버튼 1 -->/gs, '')
  }
  if (properties.showSmallBtn2 !== true) {
    result = result.replace(/<!-- 작은 버튼 2 -->.*?<!-- \/\/작은 버튼 2 -->/gs, '')
  }
  if (properties.showSmallBtn3 !== true) {
    result = result.replace(/<!-- 작은 버튼 3 -->.*?<!-- \/\/작은 버튼 3 -->/gs, '')
  }
  if (properties.showSmallBtn4 !== true) {
    result = result.replace(/<!-- 작은 버튼 4 -->.*?<!-- \/\/작은 버튼 4 -->/gs, '')
  }
  // 큰 버튼
  if (properties.showBigBtn !== true) {
    result = result.replace(/<!-- 큰 버튼 -->.*?<!-- \/\/큰 버튼 -->/gs, '')
  }

  return result
}

/**
 * Module06 다중 버튼 조건부 제거 프로세서 (왼쪽/오른쪽 각각 버튼 4개)
 */
export const module06MultiButtonProcessor: ContentProcessor = (html, properties) => {
  let result = html

  // 왼쪽 버튼 1-4
  if (properties.showLeftButton1 !== true) {
    result = result.replace(/<!-- 왼쪽 버튼 1 -->.*?<!-- \/\/왼쪽 버튼 1 -->/gs, '')
  }
  if (properties.showLeftButton2 !== true) {
    result = result.replace(/<!-- 왼쪽 버튼 2 -->.*?<!-- \/\/왼쪽 버튼 2 -->/gs, '')
  }
  if (properties.showLeftButton3 !== true) {
    result = result.replace(/<!-- 왼쪽 버튼 3 -->.*?<!-- \/\/왼쪽 버튼 3 -->/gs, '')
  }
  if (properties.showLeftButton4 !== true) {
    result = result.replace(/<!-- 왼쪽 버튼 4 -->.*?<!-- \/\/왼쪽 버튼 4 -->/gs, '')
  }

  // 오른쪽 버튼 1-4
  if (properties.showRightButton1 !== true) {
    result = result.replace(/<!-- 오른쪽 버튼 1 -->.*?<!-- \/\/오른쪽 버튼 1 -->/gs, '')
  }
  if (properties.showRightButton2 !== true) {
    result = result.replace(/<!-- 오른쪽 버튼 2 -->.*?<!-- \/\/오른쪽 버튼 2 -->/gs, '')
  }
  if (properties.showRightButton3 !== true) {
    result = result.replace(/<!-- 오른쪽 버튼 3 -->.*?<!-- \/\/오른쪽 버튼 3 -->/gs, '')
  }
  if (properties.showRightButton4 !== true) {
    result = result.replace(/<!-- 오른쪽 버튼 4 -->.*?<!-- \/\/오른쪽 버튼 4 -->/gs, '')
  }

  return result
}

/**
 * Module06 버튼 조건부 제거 프로세서 (기존 단일 버튼용 - 호환성 유지)
 */
export const module06ButtonProcessor: ContentProcessor = (html, properties) => {
  let result = html

  if (properties.showLeftButton !== true) {
    result = result.replace(/<!-- 왼쪽 버튼 -->.*?<!-- \/\/왼쪽 버튼 -->/gs, '')
  }
  if (properties.showRightButton !== true) {
    result = result.replace(/<!-- 오른쪽 버튼 -->.*?<!-- \/\/오른쪽 버튼 -->/gs, '')
  }

  return result
}

/**
 * Module07 버튼 조건부 제거 프로세서
 */
export const module07ButtonProcessor: ContentProcessor = (html, properties) => {
  if (properties.showButton !== true) {
    return html.replace(/<!-- 버튼 -->.*?<!-- \/\/버튼 -->/gs, '')
  }
  return html
}

/**
 * ModuleFooter SNS 아이콘 조건부 제거 프로세서
 */
export const footerSnsProcessor: ContentProcessor = (html, properties) => {
  let result = html

  if (properties.showHome !== true) {
    result = result.replace(/<!-- 홈 -->.*?<!-- \/\/홈 -->/gs, '')
  }
  if (properties.showFacebook !== true) {
    result = result.replace(/<!-- 페이스북 -->.*?<!-- \/\/페이스북 -->/gs, '')
  }
  if (properties.showBlog !== true) {
    result = result.replace(/<!-- 블로그 -->.*?<!-- \/\/블로그 -->/gs, '')
  }
  if (properties.showYoutube !== true) {
    result = result.replace(/<!-- 유튜브 -->.*?<!-- \/\/유튜브 -->/gs, '')
  }
  if (properties.showInstagram !== true) {
    result = result.replace(/<!-- 인스타그램 -->.*?<!-- \/\/인스타그램 -->/gs, '')
  }
  if (properties.showKakao !== true) {
    result = result.replace(/<!-- 카카오톡 -->.*?<!-- \/\/카카오톡 -->/gs, '')
  }

  return result
}

/**
 * Module10 라벨 조건부 제거 프로세서
 */
export const module10LabelProcessor: ContentProcessor = (html, properties) => {
  if (properties.showLabel !== true) {
    return html.replace(/<!-- 라벨 -->.*?<!-- \/\/라벨 -->/gs, '')
  }
  return html
}

/**
 * Module101 라벨 조건부 제거 프로세서
 */
export const module101LabelProcessor: ContentProcessor = (html, properties) => {
  let result = html

  if (properties.showLeftLabel !== true) {
    result = result.replace(/<!-- 왼쪽 라벨 -->.*?<!-- \/\/왼쪽 라벨 -->/gs, '')
  }
  if (properties.showRightLabel !== true) {
    result = result.replace(/<!-- 오른쪽 라벨 -->.*?<!-- \/\/오른쪽 라벨 -->/gs, '')
  }

  return result
}

/**
 * 이미지 링크 조건부 제거 프로세서 (단일 이미지용)
 * showImageLink가 false이면 a 태그를 제거하고 img만 남김
 */
export const imageLinkProcessor: ContentProcessor = (html, properties) => {
  if (properties.showImageLink !== true) {
    return html.replace(
      /<!-- 이미지 링크 --><a[^>]*>([\s\S]*?)<\/a><!-- \/\/이미지 링크 -->/g,
      (_, imgContent) => imgContent,
    )
  }
  return html
}

/**
 * 왼쪽/오른쪽 이미지 링크 조건부 제거 프로세서 (2컬럼용)
 */
export const twoColumnImageLinkProcessor: ContentProcessor = (html, properties) => {
  let result = html

  if (properties.showLeftImageLink !== true) {
    result = result.replace(
      /<!-- 왼쪽 이미지 링크 --><a[^>]*>([\s\S]*?)<\/a><!-- \/\/왼쪽 이미지 링크 -->/g,
      (_, imgContent) => imgContent,
    )
  }
  if (properties.showRightImageLink !== true) {
    result = result.replace(
      /<!-- 오른쪽 이미지 링크 --><a[^>]*>([\s\S]*?)<\/a><!-- \/\/오른쪽 이미지 링크 -->/g,
      (_, imgContent) => imgContent,
    )
  }

  return result
}

/**
 * 복수 이미지 모바일 레이아웃 프로세서
 * keepLayoutOnMobile이 true이면 49.5% (2컬럼 유지), false이면 100% (1컬럼)
 */
export const multiImageLayoutProcessor: ContentProcessor = (html, properties) => {
  // keepLayoutOnMobile이 true면 49.5% (2컬럼 유지), false면 100% (1컬럼으로 떨어짐)
  const minWidth = properties.keepLayoutOnMobile === true ? '49.5%' : '100%'
  return html.replace(/{{mobileMinWidth}}/g, minWidth)
}

// SubTitle 프로세서
export { subtitleDefaultProcessor } from './subtitleProcessor'
