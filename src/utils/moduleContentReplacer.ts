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
 * ModuleInlineText 콘텐츠 교체
 */
export function replaceModuleInlineTextContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.ModuleInlineText)
}

/**
 * ModuleImg 콘텐츠 교체
 */
export function replaceModuleImgContent(html: string, properties: Record<string, unknown>): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.ModuleImg)
}

/**
 * ModuleSnsIcons 콘텐츠 교체 (아이콘별 링크/노출 토글)
 */
export function replaceModuleSnsIconsContent(html: string, properties: Record<string, unknown>): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.ModuleSnsIcons)
}

/**
 * ModuleContactInfo(연락처 H·T·E·F) 콘텐츠 교체
 */
export function replaceModuleContactInfoContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.ModuleContactInfo)
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
 * ModuleSmallButton 콘텐츠 교체 (작은 버튼)
 */
export function replaceModuleSmallButtonContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.ModuleSmallButton)
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
  contentType?: 'text' | 'image'
  imageUrl?: string
  imageAlt?: string
  imageLink?: string
}

/**
 * ModuleTable 콘텐츠 교체
 * 커스텀 테이블 셀 데이터를 HTML 테이블로 변환
 */
export function replaceModuleTableContent(
  html: string,
  properties: Record<string, unknown>,
  /** true면 각 셀에 data-row/data-col을 붙인다(캔버스 셀 선택용). 내보내기는 false(기본). */
  interactive = false,
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
  // 타입(제목/내용) 공통 정렬 — '테이블 스타일' 탭에서 설정한다
  const headerAlign = String(properties.headerAlign || 'center')
  const cellAlign = String(properties.cellAlign || 'left')

  // 바깥 td 여백 (미설정 시: 상/하/좌/우 20px)
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
  const tableRowsHtml = cells.map((row, rowIndex) => {
    const cellsHtml = row
      .map((cell, colIndex) => ({ cell, colIndex })) // 원래 열 인덱스 보존 (열 공통 정렬용)
      .filter(({ cell }) => !cell.hidden) // hidden 셀 제외
      .map(({ cell, colIndex }) => {
        const tag = cell.type
        // 셀별 지정 색상 우선, 없으면 타입별(th/td) 일괄 색상으로 폴백
        const bgColor = cell.bgColor || (cell.type === 'th' ? headerBgColor : cellBgColor)
        const textColor = cell.textColor || (cell.type === 'th' ? headerTextColor : cellTextColor)
        const fontWeight = cell.type === 'th' ? '700' : '400'
        // 정렬 우선순위: 셀별 지정 > 열 공통(tableColAligns) > 타입 공통 > 하드코딩 기본.
        // tableColAligns는 열별 정렬 UI가 있던 시절의 값이라 새 테이블에는 더 이상 채우지
        // 않는다. 이미 그 값을 가진 기존 템플릿·저장 파일은 예전 그대로 보이게 남겨 둔다.
        const textAlign =
          cell.align ||
          colAligns[colIndex] ||
          (cell.type === 'th' ? headerAlign : cellAlign)

        // 이미지 셀은 이미지가 셀을 꽉 채우도록 안쪽 여백 제거
        const cellPadding = cell.contentType === 'image' ? '0' : '5px 10px'

        // 인라인 스타일 (이메일 호환성)
        const style = [
          `font-size:14px`,
          `font-weight:${fontWeight}`,
          `border:1px ${cellBorderColor} solid`,
          `background:${bgColor}`,
          `bgcolor:${bgColor}`,
          `text-align:${textAlign}`,
          `color:${textColor}`,
          `padding:${cellPadding}`,
          `letter-spacing:-0.03em`,
          `line-height:1.8em`,
          `font-family:AppleSDGothic, malgun gothic, nanum gothic, Noto Sans KR, sans-serif`,
          // 테이블 셀은 글자 기준 줄바꿈 (좁은 열에서도 넘치지 않도록)
          `word-break:break-all`,
          `box-sizing:border-box`,
        ].join('; ')

        // colspan, rowspan 속성 (열 너비는 colgroup>col로 일괄 관리)
        const colspanAttr = cell.colspan > 1 ? ` colspan="${cell.colspan}"` : ''
        const rowspanAttr = cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : ''
        // 캔버스 셀 선택용 좌표(내보내기에는 미포함)
        const dataAttr = interactive ? ` data-row="${rowIndex}" data-col="${colIndex}"` : ''

        // 이미지 셀: <img> 렌더 (없으면 안내 플레이스홀더)
        let inner: string
        if (cell.contentType === 'image') {
          const url = escapeForHtml(cell.imageUrl || '')
          const alt = escapeForHtml(cell.imageAlt || '')
          if (url) {
            const imgTag = `<img src="${url}" alt="${alt}" style="display:block; width:100%; max-width:100%; height:auto; border:0;" />`
            const link = (cell.imageLink || '').trim()
            // 링크가 있으면 <a>로 감싼다(이미지 모듈과 동일)
            inner = link
              ? `<a href="${escapeForHtml(link)}" target="_blank" style="display:block; text-decoration:none;">${imgTag}</a>`
              : imgTag
          } else {
            inner = `<span style="display:block; padding:16px 0; text-align:center; color:#8b95a1; font-size:13px;">이미지 URL을 입력하세요</span>`
          }
        } else {
          // 텍스트 셀: Quill 리치 에디터 HTML을 그대로 사용(텍스트 모듈과 동일).
          // 정제(sanitize)·리스트 변환·포인트색은 렌더/내보내기 공통 파이프라인이 처리한다.
          inner = cell.content || ''
        }
        return `<${tag}${colspanAttr}${rowspanAttr}${dataAttr} style="${style}">${inner}</${tag}>`
      })
      .join('\n              ')

    return `            <tr>\n              ${cellsHtml}\n            </tr>`
  }).join('\n')

  result = result.replace('{{tableContent}}', tableRowsHtml)

  return result
}
