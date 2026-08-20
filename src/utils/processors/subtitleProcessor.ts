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

  return html.replace(/\{\{subtitleText\}\}/g, subtitleText)
}
