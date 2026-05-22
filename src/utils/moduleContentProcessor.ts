/**
 * 모듈 콘텐츠 처리를 위한 플러그인 시스템
 * 코드 중복을 제거하고 확장 가능한 아키텍처 제공
 */

import type { AdditionalContent } from '@/types'
import { processQuillHtml } from './quillHtmlProcessor'
import { isEmptyValue, safeFormatText } from './textUtils'
import { applyLineHeightToParagraphs } from './lineHeightUtils'

/**
 * 프로세서 함수 타입 정의
 */
export type ContentProcessor = (
  html: string,
  properties: Record<string, unknown>,
  context?: ProcessorContext,
) => string | Promise<string>

/**
 * 프로세서 컨텍스트 (공유 함수 제공)
 */
export interface ProcessorContext {
  insertAdditionalContents?: (
    html: string,
    contents: AdditionalContent[],
    marker: string,
  ) => Promise<string>
}

/**
 * 모듈 설정
 */
export interface ModuleConfig {
  /** 기본 플레이스홀더 교체 여부 */
  autoReplacePlaceholders?: boolean
  /** Quill HTML 처리가 필요한 필드 목록 */
  quillFields?: string[]
  /**
   * Quill 필드별 line-height 속성 키 매핑
   * 예: { descriptionText: 'lineHeight' } — descriptionText의 내부 <p>들에 properties.lineHeight 값 적용
   */
  lineHeightMap?: Record<string, string>
  /** 기본값 설정 */
  defaults?: Record<string, unknown>
  /** 특수 처리가 필요한 프로세서들 */
  processors?: ContentProcessor[]
}

/**
 * 기본 플레이스홀더 교체 함수
 */
export function replacePlaceholder(html: string, key: string, value: unknown): string {
  const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
  return html.replace(regex, String(value))
}

/**
 * 범용 콘텐츠 교체 엔진
 */
export async function replaceModuleContent(
  html: string,
  properties: Record<string, unknown>,
  config: ModuleConfig = {},
  context?: ProcessorContext,
): Promise<string> {
  let result = html

  // 1. 기본값 병합
  const mergedProps = { ...config.defaults, ...properties }

  // 2. 자동 플레이스홀더 교체
  if (config.autoReplacePlaceholders !== false) {
    for (const [key, value] of Object.entries(mergedProps)) {
      // Quill 필드는 HTML 처리 적용
      if (config.quillFields?.includes(key)) {
        let processedValue = isEmptyValue(value) ? '' : processQuillHtml(String(value))
        // 필드별 line-height 매핑이 있으면 <p> 태그들에 일괄 적용
        const lhKey = config.lineHeightMap?.[key]
        if (lhKey && processedValue) {
          const lhVal = mergedProps[lhKey]
          if (typeof lhVal === 'string' && lhVal.trim()) {
            processedValue = applyLineHeightToParagraphs(processedValue, lhVal)
          }
        }
        result = replacePlaceholder(result, key, processedValue)
      }
      // 일반 필드는 안전한 텍스트 포맷 적용
      else if (typeof value === 'string') {
        const formattedValue = isEmptyValue(value) ? '' : safeFormatText(value)
        result = replacePlaceholder(result, key, formattedValue)
      }
      // 기타 타입은 그대로 문자열 변환
      else {
        result = replacePlaceholder(result, key, value)
      }
    }
  }

  // 3. 커스텀 프로세서 실행
  if (config.processors) {
    for (const processor of config.processors) {
      result = await processor(result, mergedProps, context)
    }
  }

  return result
}

/**
 * 동기 버전 (async가 필요 없는 경우)
 */
export function replaceModuleContentSync(
  html: string,
  properties: Record<string, unknown>,
  config: ModuleConfig = {},
): string {
  let result = html
  const mergedProps = { ...config.defaults, ...properties }

  if (config.autoReplacePlaceholders !== false) {
    for (const [key, value] of Object.entries(mergedProps)) {
      if (config.quillFields?.includes(key)) {
        let processedValue = isEmptyValue(value) ? '' : processQuillHtml(String(value))
        const lhKey = config.lineHeightMap?.[key]
        if (lhKey && processedValue) {
          const lhVal = mergedProps[lhKey]
          if (typeof lhVal === 'string' && lhVal.trim()) {
            processedValue = applyLineHeightToParagraphs(processedValue, lhVal)
          }
        }
        result = replacePlaceholder(result, key, processedValue)
      } else if (typeof value === 'string') {
        const formattedValue = isEmptyValue(value) ? '' : safeFormatText(value)
        result = replacePlaceholder(result, key, formattedValue)
      } else {
        result = replacePlaceholder(result, key, value)
      }
    }
  }

  // 동기 프로세서만 실행
  if (config.processors) {
    for (const processor of config.processors) {
      const res = processor(result, mergedProps)
      if (res instanceof Promise) {
        throw new Error('Async processor cannot be used in sync mode')
      }
      result = res
    }
  }

  return result
}