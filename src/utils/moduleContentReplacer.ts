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
 * Module05 콘텐츠 교체 (4개 버튼 모듈)
 */
export function replaceModule052Content(html: string, properties: Record<string, unknown>): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY['Module05'])
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
 * ModuleDivider 콘텐츠 교체 (구분선)
 */
export function replaceModuleDividerContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.ModuleDivider)
}

/**
 * 기본 템플릿 교체 (설정이 없는 모듈용 폴백)
 */
export function replaceDefaultTemplate(html: string, properties: Record<string, unknown>): string {
  return replaceModuleContentSync(html, properties, {
    autoReplacePlaceholders: true,
  })
}

/**
 * TableCell 타입 정의 (타입 import 순환 방지)
 */
interface TableCellType {
  id: string
  type: 'th' | 'td'
  content: string
  colspan: number
  rowspan: number
  width?: string
  align?: 'left' | 'center' | 'right'
  hidden?: boolean
}

/**
 * ModuleTable 콘텐츠 교체
 * 커스텀 테이블 셀 데이터를 HTML 테이블로 변환
 */
export function replaceModuleTableContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  const cells = (properties.tableCells as TableCellType[][] | undefined) || []
  const borderTopWidth = String(properties.borderTopWidth || '2px')
  const borderTopColor = String(properties.borderTopColor || '#333333')
  const cellBorderColor = String(properties.cellBorderColor || '#a7a7a7')
  const headerBgColor = String(properties.headerBgColor || '#f6f6f6')
  const cellBgColor = String(properties.cellBgColor || '#ffffff')

  // 테이블 셀이 비어있으면 빈 테이블 반환
  if (cells.length === 0) {
    return html.replace('{{tableContent}}', `
      <tr>
        <td style="padding:20px; text-align:center; color:#999; font-size:14px; font-family:AppleSDGothic, malgun gothic, nanum gothic, Noto Sans KR, sans-serif;">
          테이블을 편집하려면 속성 패널에서 행/열을 추가하세요.
        </td>
      </tr>
    `)
  }

  // 테이블 상단 테두리 스타일 적용
  let result = html.replace(
    'border-top:2px #333333 solid',
    `border-top:${borderTopWidth} ${borderTopColor} solid`
  )

  // 테이블 셀들을 HTML로 변환
  const tableRowsHtml = cells.map((row) => {
    const cellsHtml = row
      .filter(cell => !cell.hidden) // hidden 셀 제외
      .map((cell) => {
        const tag = cell.type
        const bgColor = cell.type === 'th' ? headerBgColor : cellBgColor
        const fontWeight = cell.type === 'th' ? '700' : '400'
        const textAlign = cell.align || (cell.type === 'th' ? 'center' : 'left')

        // 인라인 스타일 (이메일 호환성)
        const style = [
          `font-size:14px`,
          `font-weight:${fontWeight}`,
          `border:1px ${cellBorderColor} solid`,
          `background:${bgColor}`,
          `bgcolor:${bgColor}`,
          `text-align:${textAlign}`,
          `color:#333333`,
          `padding:5px 10px`,
          `letter-spacing:-0.03em`,
          `line-height:1.8em`,
          `font-family:AppleSDGothic, malgun gothic, nanum gothic, Noto Sans KR, sans-serif`,
          `word-break:keep-all`,
          `box-sizing:border-box`,
        ].join('; ')

        // colspan, rowspan, width 속성
        const colspanAttr = cell.colspan > 1 ? ` colspan="${cell.colspan}"` : ''
        const rowspanAttr = cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : ''
        const widthAttr = cell.width ? ` width="${cell.width}"` : ''

        return `<${tag}${colspanAttr}${rowspanAttr}${widthAttr} style="${style}">${cell.content || ''}</${tag}>`
      })
      .join('\n              ')

    return `            <tr>\n              ${cellsHtml}\n            </tr>`
  }).join('\n')

  result = result.replace('{{tableContent}}', tableRowsHtml)

  return result
}
