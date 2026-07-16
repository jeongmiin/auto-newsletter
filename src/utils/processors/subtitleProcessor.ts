/**
 * ModuleSubTitle 전용 프로세서
 */

import type { ContentProcessor } from '../moduleContentProcessor'
import { isEmptyValue, safeFormatText } from '../textUtils'

/**
 * SubTitle 기본값 처리 프로세서
 */
export const subtitleDefaultProcessor: ContentProcessor = (html, properties) => {
  // subtitleText가 비어있으면 기본값 사용
  const subtitleText = isEmptyValue(properties.subtitleText)
    ? '기조연설 (14:20~14:40)'
    : safeFormatText(String(properties.subtitleText))

  // autoReplacePlaceholders=false 모듈이라 나머지 플레이스홀더도 직접 치환한다.
  const val = (key: string, fallback: string): string =>
    isEmptyValue(properties[key]) ? fallback : String(properties[key])

  return html
    .replace(/\{\{subtitleText\}\}/g, subtitleText)
    .replace(/\{\{subtitleTextFontSize\}\}/g, val('subtitleTextFontSize', '16px'))
    .replace(/\{\{paddingTop\}\}/g, val('paddingTop', '20px'))
    .replace(/\{\{paddingRight\}\}/g, val('paddingRight', '20px'))
    .replace(/\{\{paddingBottom\}\}/g, val('paddingBottom', '20px'))
    .replace(/\{\{paddingLeft\}\}/g, val('paddingLeft', '20px'))
}
