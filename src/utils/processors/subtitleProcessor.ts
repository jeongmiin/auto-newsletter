/**
 * ModuleSubTitle 전용 프로세서
 */

import type { ContentProcessor } from '../moduleContentProcessor'
import { isEmptyValue, safeFormatText } from '../textUtils'

/** 글자 크기를 안 정했을 때 — modules-config 의 subtitleTextFontSize 기본값과 같다 */
const DEFAULT_FONT_SIZE = '16px'

/**
 * SubTitle 기본값 처리 프로세서
 *
 * 이 모듈은 자동 치환(autoReplacePlaceholders)을 끄고 여기서 직접 바꾼다 — 그래서 템플릿에
 * 새 치환자를 넣으면 **여기에도 한 줄 더해야** 한다. `{{subtitleTextFontSize}}` 가 그렇게 빠져
 * 발송 HTML 에 `font-size: {{subtitleTextFontSize}}` 가 글자 그대로 나간 적이 있다.
 */
export const subtitleDefaultProcessor: ContentProcessor = (html, properties) => {
  // subtitleText가 비어있으면 기본값 사용
  const subtitleText = isEmptyValue(properties.subtitleText)
    ? '기조연설 (14:20~14:40)'
    : safeFormatText(String(properties.subtitleText))
  const fontSize = isEmptyValue(properties.subtitleTextFontSize)
    ? DEFAULT_FONT_SIZE
    : String(properties.subtitleTextFontSize)

  return html
    .replace(/\{\{subtitleText\}\}/g, subtitleText)
    .replace(/\{\{subtitleTextFontSize\}\}/g, fontSize)
}
