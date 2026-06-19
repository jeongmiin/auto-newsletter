/**
 * 모듈 콘텐츠 교체 함수들 (리팩토링 버전)
 * 새로운 플러그인 패턴 기반 아키텍처 사용
 */

import { replaceModuleContent, replaceModuleContentSync } from './moduleContentProcessor'
import { MODULE_CONFIG_REGISTRY } from './moduleConfigs'
import { buildCompanyInfoFromLegacy } from './moduleMigrations'
import { escapeForHtml } from './htmlUtils'
import type { ProcessorContext } from './moduleContentProcessor'

/**
 * ModuleNewsHeader 콘텐츠 교체 (뉴스 헤드라인 헤더)
 */
export function replaceModuleNewsHeaderContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.ModuleNewsHeader)
}

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
 * ModuleImageHeader 콘텐츠 교체 (이미지형 헤더)
 */
export function replaceModuleImageHeaderContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.ModuleImageHeader)
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
 * TopLanguageButton 콘텐츠 교체 (상단 언어 선택 버튼)
 */
export function replaceTopLanguageButtonContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.TopLanguageButton)
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
 * 렌더 시점 안전망: companyInfo가 없고 구버전 필드만 있는 인스턴스도 올바로 출력한다.
 * (정상 경로에서는 로드 시 migrateModuleProperties가 이미 변환한다)
 */
export function replaceModuleFooterContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  const props = { ...properties }
  if (
    !props.companyInfo &&
    (props.topTextTitle || props.topTextCompany || props.addressText)
  ) {
    props.companyInfo = buildCompanyInfoFromLegacy(props)
  }
  return replaceModuleContentSync(html, props, MODULE_CONFIG_REGISTRY.ModuleFooter)
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
 * Module01 콘텐츠 교체
 */
export function replaceModule01Content(html: string, properties: Record<string, unknown>): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.Module01)
}

/**
 * Module11 콘텐츠 교체
 */
export function replaceModule11Content(html: string, properties: Record<string, unknown>): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.Module11)
}

/**
 * Module12 콘텐츠 교체
 */
export function replaceModule12Content(html: string, properties: Record<string, unknown>): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.Module12)
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
  bgColor?: string
  textColor?: string
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
  const colWidths = (properties.tableColWidths as string[] | undefined) || []
  const colAligns = (properties.tableColAligns as string[] | undefined) || []
  const borderTopWidth = String(properties.borderTopWidth || '2px')
  const borderTopColor = String(properties.borderTopColor || '#333333')
  const cellBorderColor = String(properties.cellBorderColor || '#a7a7a7')
  const headerBgColor = String(properties.headerBgColor || '#f6f6f6')
  const cellBgColor = String(properties.cellBgColor || '#ffffff')
  const headerTextColor = String(properties.headerTextColor || '#333333')
  const cellTextColor = String(properties.cellTextColor || '#333333')

  // 바깥 td 상하좌우 여백 (미설정 시 기존 기본값 20px 유지)
  const paddingTop = String(properties.paddingTop ?? '20px')
  const paddingRight = String(properties.paddingRight ?? '20px')
  const paddingBottom = String(properties.paddingBottom ?? '20px')
  const paddingLeft = String(properties.paddingLeft ?? '20px')
  html = html
    .replace(/\{\{\s*paddingTop\s*\}\}/g, paddingTop)
    .replace(/\{\{\s*paddingRight\s*\}\}/g, paddingRight)
    .replace(/\{\{\s*paddingBottom\s*\}\}/g, paddingBottom)
    .replace(/\{\{\s*paddingLeft\s*\}\}/g, paddingLeft)

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

  // colgroup 생성 (열별 너비 지정; 비어있으면 기본 너비 사용)
  const colCount = cells[0]?.length || 0
  if (colCount > 0) {
    const hasAnyWidth = colWidths.slice(0, colCount).some((w) => (w || '').trim() !== '')
    if (hasAnyWidth) {
      const colTags = Array.from({ length: colCount }, (_, i) => {
        const w = (colWidths[i] || '').trim()
        return w ? `<col style="width:${w};" width="${w}">` : '<col>'
      }).join('\n            ')
      const colgroupHtml = `<colgroup>\n            ${colTags}\n          </colgroup>`
      // 동적 테이블의 <tbody> 바로 앞에 colgroup 삽입
      result = result.replace(
        /<tbody>(\s*\{\{tableContent\}\})/,
        `${colgroupHtml}\n          <tbody>$1`
      )
    }
  }

  // 테이블 셀들을 HTML로 변환
  const tableRowsHtml = cells.map((row) => {
    const cellsHtml = row
      .map((cell, colIndex) => ({ cell, colIndex })) // 원래 열 인덱스 보존 (열 공통 정렬용)
      .filter(({ cell }) => !cell.hidden) // hidden 셀 제외
      .map(({ cell, colIndex }) => {
        const tag = cell.type
        // 셀별 지정 색상 우선, 없으면 타입별(th/td) 일괄 색상으로 폴백
        const bgColor = cell.bgColor || (cell.type === 'th' ? headerBgColor : cellBgColor)
        const textColor = cell.textColor || (cell.type === 'th' ? headerTextColor : cellTextColor)
        const fontWeight = cell.type === 'th' ? '700' : '400'
        // 정렬 우선순위: 셀별 지정 > 열 공통(tableColAligns) > 타입 기본
        const textAlign =
          cell.align || colAligns[colIndex] || (cell.type === 'th' ? 'center' : 'left')

        // 인라인 스타일 (이메일 호환성)
        const style = [
          `font-size:14px`,
          `font-weight:${fontWeight}`,
          `border:1px ${cellBorderColor} solid`,
          `background:${bgColor}`,
          `bgcolor:${bgColor}`,
          `text-align:${textAlign}`,
          `color:${textColor}`,
          `padding:5px 10px`,
          `letter-spacing:-0.03em`,
          `line-height:1.8em`,
          `font-family:AppleSDGothic, malgun gothic, nanum gothic, Noto Sans KR, sans-serif`,
          `word-break:keep-all`,
          `box-sizing:border-box`,
        ].join('; ')

        // colspan, rowspan 속성 (열 너비는 colgroup>col로 일괄 관리)
        const colspanAttr = cell.colspan > 1 ? ` colspan="${cell.colspan}"` : ''
        const rowspanAttr = cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : ''

        // & < > " → HTML 엔티티로 변환(&부터 처리해 이중 이스케이프 방지) 후
        // 줄바꿈/굵게 마커만 태그로 복원
        const safeContent = escapeForHtml(cell.content || '')
          .replace(/\r?\n/g, '<br>')
          // **드래그 선택 텍스트** → 굵게 (escape 이후 마커만 변환, 이메일 호환 inline style)
          .replace(/\*\*([^*]+?)\*\*/g, '<strong style="font-weight:700;">$1</strong>')
        return `<${tag}${colspanAttr}${rowspanAttr} style="${style}">${safeContent}</${tag}>`
      })
      .join('\n              ')

    return `            <tr>\n              ${cellsHtml}\n            </tr>`
  }).join('\n')

  result = result.replace('{{tableContent}}', tableRowsHtml)

  return result
}
