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
 * 2단(좌/우) 컬럼 사이 공백·패딩 흡수용 차감값(px)
 * 인라인 블록 사이의 공백/거터를 흡수해 PC에서 두 컬럼이 항상 한 줄에 나란히 배치되게 한다.
 */
const COLUMN_GUTTER_PX = 5

/**
 * 좌/우 영역 퍼센트 값 파싱 — 숫자 또는 "50%" 형태를 받아 5~95% 범위의 숫자로 정규화한다.
 * (한쪽이 0%이거나 100%이면 나란히 배치가 불가능하므로 범위를 제한)
 */
const parseColumnPercent = (value: unknown, fallback: number): number => {
  const raw = typeof value === 'number' || typeof value === 'string' ? value : ''
  const n = Number.parseFloat(String(raw).replace('%', '').trim())
  if (!Number.isFinite(n)) return fallback
  return Math.min(95, Math.max(5, n))
}

/** 좌/우 컬럼 min-width(=PC에서의 컬럼 폭) 계산 — calc(퍼센트 - 거터) */
const columnMinWidth = (percent: number): string => `calc(${percent}% - ${COLUMN_GUTTER_PX}px)`

/**
 * 2단(좌/우) 모듈 컬럼 비율 프로세서 (Module04·05·05-1·05-3·06·07·07_reverse 공용)
 * leftWidthPercent / rightWidthPercent(숫자 %)로 좌·우 컬럼의 min-width를 계산해
 * {{leftColMinWidth}} / {{rightColMinWidth}} 플레이스홀더를 치환한다.
 *
 * 반응형 스택 트릭(width: calc((570px - 100%) * 570); max-width: 100%)은 HTML에 그대로 유지되며,
 * 이 프로세서는 min-width(PC에서의 컬럼 폭)만 결정한다 → PC: 좌우 나란히 / 모바일: 세로 적층.
 * 미설정 시 50:50.
 */
export const twoColumnRatioProcessor: ContentProcessor = (html, properties) => {
  const left = parseColumnPercent(properties.leftWidthPercent, 50)
  const right = parseColumnPercent(properties.rightWidthPercent, 50)
  return html
    .replace(/\{\{\s*leftColMinWidth\s*\}\}/g, columnMinWidth(left))
    .replace(/\{\{\s*rightColMinWidth\s*\}\}/g, columnMinWidth(right))
}

/**
 * 서브 타이틀 제거 프로세서 (SectionTitle 전용)
 */
export const removeEmptySubTitleProcessor: ContentProcessor = (html, properties) => {
  // 토글이 꺼져 있거나(서브 타이틀 표시=false) 내용이 비어 있으면 서브 타이틀 블록 제거
  if (properties.showSubTitle === false || !shouldRenderElement(properties.subTitle)) {
    return removeSubTitleDiv(html)
  }
  return html
}

/**
 * 메인 타이틀 제거 프로세서 (SectionTitle 전용)
 * showMainTitle이 false면(기본 노출) 메인 타이틀 블록을 제거한다.
 */
export const removeMainTitleProcessor: ContentProcessor = (html, properties) => {
  if (properties.showMainTitle === false) {
    return html.replace(
      /<!-- 메인 타이틀 -->\s*<tr>[\s\S]*?<\/tr>\s*<!-- \/\/메인 타이틀 -->/g,
      '',
    )
  }
  return html
}

/**
 * 이미지 타이틀 제거 프로세서 (SectionTitle 전용)
 * showSectionImage가 true가 아니면(기본 비노출) 이미지 블록을 제거한다.
 */
export const removeSectionImageProcessor: ContentProcessor = (html, properties) => {
  if (properties.showSectionImage !== true) {
    return html.replace(
      /<!-- 이미지 타이틀 -->\s*<tr>[\s\S]*?<\/tr>\s*<!-- \/\/이미지 타이틀 -->/g,
      '',
    )
  }
  return html
}

/**
 * SectionTitle 정렬 프로세서
 * 속성 패널의 titleAlign 셀렉트가 정렬의 단일 제어권을 가짐
 * Quill의 text-align이 있더라도 셀렉트 값으로 덮어씀
 */
export const sectionTitleAlignProcessor: ContentProcessor = (html, properties) => {
  const align = typeof properties.titleAlign === 'string' ? properties.titleAlign : 'center'

  // 1. style 속성이 있는 태그: 기존 text-align 제거 후 셀렉트 값으로 교체
  let result = html.replace(
    /<(p|h[1-3])(\s[^>]*)style="([^"]*)"/g,
    (_match, tag: string, before: string, style: string) => {
      const cleaned = style.replace(/;\s*text-align:\s*[^;"]*/g, '').replace(/text-align:\s*[^;"]*/g, '')
      return `<${tag}${before}style="${cleaned}; text-align: ${align}"`
    }
  )

  // 2. style 속성이 없는 태그: style 추가
  result = result.replace(
    /<(p|h[1-3])(?![^>]*style=)([^>]*)>/g,
    (_match, tag: string, attrs: string) => {
      return `<${tag}${attrs} style="text-align: ${align}">`
    }
  )

  return result
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

  // 작은 버튼 4개가 모두 비노출이면 감싸는 div(빈 컨테이너)도 제거
  // → 빈 div의 padding(10px 0)으로 인한 여백 + 메일 클라이언트의 &nbsp; 삽입 방지
  result = result.replace(
    /<div align="left" style="display: block; padding: 10px 0; box-sizing: border-box;">\s*<\/div>/g,
    '',
  )

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
  // 회사 정보 H/T/E 조건부 표시 (미설정 시 표시 = 기존 동작 유지)
  const showWebsite = properties.showWebsite !== false
  const showPhone = properties.showPhone !== false
  const showEmail = properties.showEmail !== false
  const showFax = properties.showFax === true // 신규 항목 — 미설정 시 숨김
  // 안내문구 다국어 버전: true이면 영문 블록 표시·국문 블록 제거 (미설정 시 국문 표시)
  const showEnglishFooter = properties.showEnglishFooter === true

  // [제거 조건, 마커 라벨] 목록 — 조건이 true이면 해당 마커 블록 제거
  const removals: Array<[boolean, string]> = [
    // 회사 정보
    [!showWebsite, '홈페이지'],
    [!showPhone, '전화'],
    [!showEmail, '이메일'],
    [!showFax, '팩스'],
    // SNS 아이콘 (미설정 시 숨김)
    [properties.showHome !== true, '홈'],
    [properties.showFacebook !== true, '페이스북'],
    [properties.showX !== true, 'X(트위터)'],
    [properties.showBlog !== true, '블로그'],
    [properties.showYoutube !== true, '유튜브'],
    [properties.showInstagram !== true, '인스타그램'],
    [properties.showKakao !== true, '카카오톡'],
    [properties.showLinkedin !== true, '링크드인'],
    [properties.showZuzuzu !== true, '쭈쭈쭈'],
    [properties.showEn !== true, '영어'],
    [properties.showJp !== true, '일본어'],
    [properties.showTh !== true, '태국어'],
    // 안내문구 국문/영문 — 토글에 따라 한쪽만 노출
    [showEnglishFooter, '안내문구-국문'],
    [!showEnglishFooter, '안내문구-영문'],
  ]

  // 문의 이메일 안내 줄: 미설정 시 발신전용 안내 문구로 대체 (설정 시 기존 문구 유지)
  let result = html
  if (properties.showInquiry === false) {
    result = result.replace(
      /<!-- 문의 -->.*?<!-- \/\/문의 -->/gs,
      '<!-- 문의 --><div>본 메일은 발신전용 메일입니다.</div><!-- //문의 -->'
    )
  }

  return removals.reduce((acc, [shouldRemove, label]) => {
    if (!shouldRemove) return acc
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
    return acc.replace(new RegExp(`<!-- ${escaped} -->.*?<!-- //${escaped} -->`, 'gs'), '')
  }, result)
}

/**
 * ModuleImageHeader 상단 정보 조건부 제거 프로세서
 * 상단 라벨 / 일정·장소 / 홈 링크 각각의 표시 토글 처리 (미설정 시 표시)
 */
export const moduleImageHeaderTopProcessor: ContentProcessor = (html, properties) => {
  const removals: Array<[boolean, string]> = [
    [properties.showVol === false, '상단라벨'],
    [properties.showDate === false, '일정장소'],
    [properties.showHome === false, '홈링크'],
    [properties.showTitle === false, '타이틀'],
    [properties.showBody === false, '본문'],
  ]
  return removals.reduce((acc, [shouldRemove, label]) => {
    if (!shouldRemove) return acc
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
    return acc.replace(new RegExp(`<!-- ${escaped} -->.*?<!-- //${escaped} -->`, 'gs'), '')
  }, html)
}

/**
 * 타이틀 조건부 제거 프로세서 (Module01·Module12 공용)
 * showTitle이 false이면 타이틀 영역(감싸는 마커 블록)을 통째로 제거 (미설정 시 표시)
 */
export const module12TitleProcessor: ContentProcessor = (html, properties) => {
  if (properties.showTitle === false) {
    return html.replace(/<!-- 타이틀 -->[\s\S]*?<!-- \/\/타이틀 -->/g, '')
  }
  return html
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
 * Module11 라벨 조건부 제거 프로세서
 * showLabel이 false이면 라벨(<strong>) 영역 제거 (미설정 시 표시)
 */
export const module11LabelProcessor: ContentProcessor = (html, properties) => {
  let result = html
  // 라벨 비노출 (미설정 시 표시)
  if (properties.showLabel === false) {
    result = result.replace(/<!-- 라벨 -->.*?<!-- \/\/라벨 -->/gs, '')
  }
  // 버튼 비노출 — 버튼이 담긴 우측 <td>까지 제거(빈 셀 잔여 방지, 미설정 시 표시)
  if (properties.showButton === false) {
    result = result.replace(/<!-- 버튼 -->[\s\S]*?<!-- \/\/버튼 -->/g, '')
  }
  return result
}

/**
 * Module10 이미지 조건부 제거 + 타이틀 영역 min-width 결정 프로세서
 * showImage가 false이면 이미지 영역 제거, 타이틀 div의 min-width를 100%로 확장
 */
export const module10ImageProcessor: ContentProcessor = (html, properties) => {
  let result = html
  const showImage = properties.showImage !== false
  if (!showImage) {
    result = result.replace(/<!-- 이미지 -->[\s\S]*?<!-- \/\/이미지 -->/g, '')
  }
  const titleMinWidth = showImage ? 'calc(100% - 10.5em)' : '100%'
  result = result.replace(/{{\s*titleWrapMinWidth\s*}}/g, titleMinWidth)
  return result
}

/**
 * Module10 시간 조건부 제거 프로세서
 * showTime이 true가 아니면 라벨 옆 시간 span 제거
 */
export const module10TimeProcessor: ContentProcessor = (html, properties) => {
  if (properties.showTime !== true) {
    return html.replace(/<!-- 시간 -->[\s\S]*?<!-- \/\/시간 -->/g, '')
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
