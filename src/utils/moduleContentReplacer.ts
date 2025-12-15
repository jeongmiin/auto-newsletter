/**
 * 모듈 콘텐츠 교체 함수들 (리팩토링 버전)
 * 새로운 플러그인 패턴 기반 아키텍처 사용
 */

import { replaceModuleContent, replaceModuleContentSync } from './moduleContentProcessor'
import { MODULE_CONFIG_REGISTRY } from './moduleConfigs'
import type { ProcessorContext } from './moduleContentProcessor'

/**
 * ModuleBasicHeader 콘텐츠 교체
 */
export function replaceModuleBasicHeaderContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.ModuleBasicHeader)
}

/**
 * ModuleDescText 콘텐츠 교체
 */
export function replaceModuleDescTextContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.ModuleDescText)
}

/**
 * ModuleImg 콘텐츠 교체
 */
export function replaceModuleImgContent(html: string, properties: Record<string, unknown>): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.ModuleImg)
}

/**
 * ModuleOneButton 콘텐츠 교체
 */
export function replaceModuleOneButtonContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.ModuleOneButton)
}

/**
 * ModuleTwoButton 콘텐츠 교체
 */
export function replaceModuleTwoButtonContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.ModuleTwoButton)
}

/**
 * SectionTitle 콘텐츠 교체
 */
export function replaceSectionTitleContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.SectionTitle)
}

/**
 * Module04 콘텐츠 교체
 */
export async function replaceModule04Content(
  html: string,
  properties: Record<string, unknown>,
  insertAdditionalContents: ProcessorContext['insertAdditionalContents'],
): Promise<string> {
  return await replaceModuleContent(html, properties, MODULE_CONFIG_REGISTRY.Module04, {
    insertAdditionalContents,
  })
}

/**
 * Module02 콘텐츠 교체
 */
export async function replaceModule02Content(
  html: string,
  properties: Record<string, unknown>,
  insertAdditionalContents: ProcessorContext['insertAdditionalContents'],
): Promise<string> {
  return await replaceModuleContent(html, properties, MODULE_CONFIG_REGISTRY.Module02, {
    insertAdditionalContents,
  })
}

/**
 * Module05 콘텐츠 교체
 */
export async function replaceModule05Content(
  html: string,
  properties: Record<string, unknown>,
  insertAdditionalContents: ProcessorContext['insertAdditionalContents'],
): Promise<string> {
  return await replaceModuleContent(html, properties, MODULE_CONFIG_REGISTRY.Module05, {
    insertAdditionalContents,
  })
}

/**
 * Module05-3 콘텐츠 교체
 */
export async function replaceModule053Content(
  html: string,
  properties: Record<string, unknown>,
): Promise<string> {
  return await replaceModuleContent(html, properties, MODULE_CONFIG_REGISTRY['Module05-3'])
}

/**
 * Module01-1 콘텐츠 교체
 */
export function replaceModule011Content(html: string, properties: Record<string, unknown>): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY['Module01-1'])
}

/**
 * Module01-2 콘텐츠 교체
 */
export function replaceModule012Content(html: string, properties: Record<string, unknown>): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY['Module01-2'])
}

/**
 * Module05-1 콘텐츠 교체
 */
export function replaceModule051Content(html: string, properties: Record<string, unknown>): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY['Module05-1'])
}

/**
 * Module05-2 콘텐츠 교체
 */
export function replaceModule052Content(html: string, properties: Record<string, unknown>): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY['Module05-2'])
}

/**
 * Module06 콘텐츠 교체
 */
export function replaceModule06Content(html: string, properties: Record<string, unknown>): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.Module06)
}

/**
 * Module07 콘텐츠 교체
 */
export function replaceModule07Content(html: string, properties: Record<string, unknown>): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.Module07)
}

/**
 * Module07_reverse 콘텐츠 교체
 */
export function replaceModule07ReverseContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.Module07_reverse)
}

/**
 * ModuleFooter 콘텐츠 교체
 */
export function replaceModuleFooterContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.ModuleFooter)
}

/**
 * Module10 콘텐츠 교체
 */
export function replaceModule10Content(html: string, properties: Record<string, unknown>): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.Module10)
}

/**
 * Module10-1 콘텐츠 교체
 */
export function replaceModule101Content(html: string, properties: Record<string, unknown>): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY['Module10-1'])
}

/**
 * ModuleSubTitle 콘텐츠 교체
 */
export function replaceModuleSubTitleContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.ModuleSubTitle)
}

/**
 * 기본 템플릿 교체 (설정이 없는 모듈용 폴백)
 */
export function replaceDefaultTemplate(html: string, properties: Record<string, unknown>): string {
  return replaceModuleContentSync(html, properties, {
    autoReplacePlaceholders: true,
  })
}