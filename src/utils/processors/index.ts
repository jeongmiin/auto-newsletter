/**
 * 모듈별 특수 프로세서 함수들
 * 각 모듈의 고유한 비즈니스 로직만 포함
 */

import type { ContentProcessor } from '../moduleContentProcessor'
import {
  removeSubTitleDiv,
  removeButtonFromHtml,
  escapeForHtml,
  removeMarker,
} from '../htmlUtils'
import { shouldRenderElement } from '../textUtils'
import { applyModule02ButtonStyles } from '../buttonUtils'
import { REGEX_PATTERNS, DEFAULT_TWO_COLUMN_IMAGE_URL, HTML_MARKERS } from '@/constants/defaults'

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
 * Module04 좌/우 타이틀 조건부 제거 프로세서 (미설정 시 표시)
 * showLeftTitle / showRightTitle이 false이면 해당 타이틀 블록을 제거한다.
 */
export const module04TitleProcessor: ContentProcessor = (html, properties) => {
  let result = html
  if (properties.showLeftTitle === false) {
    result = result.replace(/<!-- 왼쪽 타이틀 -->[\s\S]*?<!-- \/\/왼쪽 타이틀 -->/g, '')
  }
  if (properties.showRightTitle === false) {
    result = result.replace(/<!-- 오른쪽 타이틀 -->[\s\S]*?<!-- \/\/오른쪽 타이틀 -->/g, '')
  }
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

  // 버튼 4개가 모두 비노출이면 감싸는 빈 div(상단 padding 여백) 제거
  result = result.replace(
    /<div style="padding:10px 0px 0px; box-sizing: border-box; text-align: left;">\s*<\/div>/g,
    '',
  )

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

  // 버튼 4개가 모두 비노출이면 감싸는 빈 div(상단 padding 여백) 제거
  result = result.replace(
    /<div style="padding:10px 0px 0px; box-sizing: border-box; text-align: left;">\s*<\/div>/g,
    '',
  )

  return result
}

/**
 * Module05-3(통합 05) 섹션·오른쪽 타이틀 토글 프로세서
 * - showTopSectionTitle / showTopSectionText로 상단 섹션 타이틀·텍스트 개별 표시 (둘 다 숨김 시 배너 행 제거)
 * - showRightTitle이 false면 오른쪽 타이틀 제거 → 모듈 05 형태(텍스트+버튼) 재현
 * - rightTitleEmphasis가 true면 오른쪽 타이틀에 배경색 강조 박스(전체 너비) 적용 → 모듈 05-1 형태 재현
 * (미설정 시 모두 표시 = 기존 05-3 형태)
 */
export const module053UnifyProcessor: ContentProcessor = (html, properties) => {
  let result = html

  // 상단 섹션: 타이틀/텍스트 개별 표시 토글 (미설정 시 각각 표시)
  const showTopTitle = properties.showTopSectionTitle !== false
  const showTopText = properties.showTopSectionText !== false
  if (!showTopTitle && !showTopText) {
    // 둘 다 숨김 → 상단 섹션 배너(행) 자체 제거 (빈 행/여백 방지)
    result = result.replace(/<!-- 상단 섹션 -->[\s\S]*?<!-- \/\/상단 섹션 -->/g, '')
  } else {
    if (!showTopTitle) {
      result = result.replace(/<!-- 상단 섹션 타이틀 -->[\s\S]*?<!-- \/\/상단 섹션 타이틀 -->/g, '')
    }
    if (!showTopText) {
      result = result.replace(/<!-- 상단 섹션 텍스트 -->[\s\S]*?<!-- \/\/상단 섹션 텍스트 -->/g, '')
    }
  }

  // 오른쪽 타이틀 (미설정 시 표시)
  if (properties.showRightTitle === false) {
    result = result.replace(/<!-- 오른쪽 타이틀 -->[\s\S]*?<!-- \/\/오른쪽 타이틀 -->/g, '')
    result = result.replace(/\{\{\s*rightTitleStyle\s*\}\}/g, '')
  } else {
    const str = (v: unknown, fb: string) => (typeof v === 'string' && v.trim() !== '' ? v : fb)
    let style = ''
    // 강조(배경 박스) 스타일 — 모듈 05-1의 색상 타이틀 재현 (전체 너비)
    if (properties.rightTitleEmphasis === true) {
      const bg = str(properties.rightTitleBgColor, '#e5e5e5')
      const color = str(properties.rightTitleTextColor, '#111111')
      style = `display:block; width:100%; background-color:${bg}; color:${color}; padding:6px 12px; margin-bottom:6px; box-sizing:border-box; `
    }
    result = result.replace(/\{\{\s*rightTitleStyle\s*\}\}/g, style)
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

  // 좌/우 버튼이 모두 비노출이면 감싸는 빈 버튼 영역(상단 padding 여백) 제거
  result = result.replace(/<!-- 왼쪽 버튼 영역 --><div[^>]*>\s*<\/div><!-- \/\/왼쪽 버튼 영역 -->/g, '')
  result = result.replace(/<!-- 오른쪽 버튼 영역 --><div[^>]*>\s*<\/div><!-- \/\/오른쪽 버튼 영역 -->/g, '')

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

  result = removals.reduce((acc, [shouldRemove, label]) => {
    if (!shouldRemove) return acc
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
    return acc.replace(new RegExp(`<!-- ${escaped} -->.*?<!-- //${escaped} -->`, 'gs'), '')
  }, result)

  // SNS 아이콘이 모두 비노출이면 감싸는 빈 행(상하 padding 여백) 제거
  result = result.replace(
    /<tr>\s*<td style="padding:15px 5px; text-align: center; box-sizing: border-box;">\s*<\/td>\s*<\/tr>/g,
    '',
  )

  return result
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
  let result = removals.reduce((acc, [shouldRemove, label]) => {
    if (!shouldRemove) return acc
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
    return acc.replace(new RegExp(`<!-- ${escaped} -->.*?<!-- //${escaped} -->`, 'gs'), '')
  }, html)

  // 상단 라벨/일정·장소/홈 링크가 모두 비노출이면 감싸는 빈 행(상하 padding 여백) 제거
  result = result.replace(
    /<tr>\s*<td style="text-align:center; padding:20px 0px;">\s*<\/td>\s*<\/tr>/g,
    '',
  )

  return result
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
 * TopLanguageButton(상단 언어 선택 버튼) 프로세서
 *
 * 버튼 1~3을 생성한다. 각 버튼은 텍스트·링크·활성화 여부를 가지며,
 * 색상은 '기본/액티브' 두 세트를 버튼 전체에 공통 적용한다.
 * (활성화된 버튼은 액티브 색상, 나머지는 기본 색상)
 * 텍스트가 비어 있는 버튼은 렌더하지 않으므로 2개 언어 구성도 가능하다.
 */
export const topLanguageButtonProcessor: ContentProcessor = (html, properties) => {
  const str = (value: unknown, fallback: string): string => {
    const s = typeof value === 'string' ? value.trim() : ''
    return s === '' ? fallback : s
  }

  const defaultColors = {
    bg: str(properties.defaultBgColor, '#ffffff'),
    text: str(properties.defaultTextColor, '#fe5f0d'),
    border: str(properties.defaultBorderColor, '#fe5f0d'),
  }
  const activeColors = {
    bg: str(properties.activeBgColor, '#fe5f0d'),
    text: str(properties.activeTextColor, '#ffffff'),
    border: str(properties.activeBorderColor, '#fe5f0d'),
  }
  const fontSize = str(properties.buttonFontSize, '16px')
  const buttonWidth = str(properties.buttonWidth, '70px')

  const buttons = [1, 2, 3]
    .map((i) => ({
      // 표시 토글: 미설정(undefined)·true면 표시, false면 숨김 (기존 인스턴스 호환)
      show: properties[`button${i}Show`] !== false,
      text: typeof properties[`button${i}Text`] === 'string' ? String(properties[`button${i}Text`]) : '',
      link: str(properties[`button${i}Link`], '#'),
      active: properties[`button${i}Active`] === true,
    }))
    .filter((b) => b.show && b.text.trim() !== '')

  const buttonsHtml = buttons
    .map((b, idx) => {
      const c = b.active ? activeColors : defaultColors
      // 첫 버튼만 좌측 테두리 유지, 이후 버튼은 좌측 테두리를 없애 연결된 모양으로
      const borderLeft = idx === 0 ? '' : 'border-left:0;'
      const safeText = escapeForHtml(b.text)
      const safeLink = escapeForHtml(b.link)
      return `<p style="margin:0;padding:0;width:${buttonWidth};background:${c.bg};border:1px solid ${c.border};${borderLeft}box-sizing:border-box;display:inline-block;"><a href="${safeLink}" target="_blank" style="line-height:28px;height:28px;box-sizing:border-box;display:block;text-align:center;text-decoration:none;color:${c.text};font-weight:700;font-size:${fontSize};padding:0 10px">${safeText}</a></p>`
    })
    .join('')

  return html.replace(/\{\{\s*languageButtons\s*\}\}/g, buttonsHtml)
}

// SubTitle 프로세서
export { subtitleDefaultProcessor } from './subtitleProcessor'
