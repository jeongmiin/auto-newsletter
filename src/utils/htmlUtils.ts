import type { TableRow } from '@/types'
import { formatTextWithBreaks } from './textUtils'

/**
 * 테이블 행 제거
 */
export function removeTableFromHtml(html: string): string {
  return html.replace(
    /<tr>\s*<td style="padding:0px 20px; box-sizing: border-box;">\s*<table align="center"[\s\S]*?<\/table>\s*<\/td>\s*<\/tr>/,
    ''
  )
}

/**
 * 버튼 제거
 */
export function removeButtonFromHtml(html: string): string {
  return html.replace(
    /<!-- 버튼 -->\s*<tr>\s*<td align="center"[\s\S]*?<\/tr>\s*<!-- \/\/버튼 -->/,
    ''
  )
}

/**
 * 서브 타이틀 전체 요소 제거 (tr 태그 포함)
 */
export function removeSubTitleDiv(html: string): string {
  // 1. 주석으로 마킹된 서브 타이틀 블록 제거 (권장)
  let result = html.replace(
    /<!-- 서브 타이틀 -->\s*<tr>[\s\S]*?<\/tr>\s*<!-- \/\/서브 타이틀 -->/g,
    ''
  )

  // 2. 플레이스홀더를 포함하는 td 태그 제거 (백업)
  result = result.replace(
    /<tr>\s*<td[^>]*>[\s\S]*?{{subTitle}}[\s\S]*?<\/td>\s*<\/tr>/g,
    ''
  )

  // 3. "서브 타이틀 영역" 텍스트를 포함하는 div 제거 (레거시 지원)
  result = result.replace(
    /<div[^>]*>[\s\S]*?서브 타이틀 영역[\s\S]*?<\/div>/g,
    ''
  )

  return result
}

/**
 * 동적 테이블 행 HTML 생성
 */
export function generateTableRowsHtml(rows: TableRow[]): string {
  return rows
    .map(
      (row) => `
            <tr>
              <th scope="row" style="font-size:14px; font-weight:400; border-bottom:1px #a7a7a7 solid; background:#f6f6f6; bgcolor: #f6f6f6; text-align:center; color:#333333; letter-spacing:-0.03em; line-height:2em; font-family:AppleSDGothic, malgun gothic, nanum gothic, Noto Sans KR, sans-serif; word-break:keep-all;" width="20%"><strong>${formatTextWithBreaks(row.header || '')}</strong></th>
              <td style="font-size:14px; font-weight:400; border-bottom:1px #a7a7a7 solid; background:#ffffff; bgcolor: #ffffff; text-align:left; word-break:keep-all; color:#333333; padding-left:10px; letter-spacing:-0.03em; line-height:2em; font-family:AppleSDGothic, malgun gothic, nanum gothic, Noto Sans KR, sans-serif; box-sizing: border-box;" width="80%">${formatTextWithBreaks(row.data || '')}</td>
            </tr>`
    )
    .join('')
}

/**
 * 스타일 객체를 CSS 문자열로 변환
 */
export function stylesToCssString(styles: Record<string, unknown>): string {
  return Object.entries(styles)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
      return `${cssKey}: ${value}`
    })
    .join('; ')
}

/**
 * HTML에 스타일 적용
 */
export function applyStylesToHtml(html: string, styles: Record<string, unknown>): string {
  const cssString = stylesToCssString(styles)
  if (!cssString) return html

  // 첫 번째 table이나 div에 스타일 적용
  return html.replace(/(<(?:table|div)[^>]*?)>/i, `$1 style="${cssString}">`)
}

/**
 * HTML 마커 제거
 */
export function removeMarker(html: string, marker: string): string {
  return html.replace(new RegExp(marker, 'g'), '')
}

/**
 * 순차적 교체 함수 (인덱스 기반)
 */
export function replaceSequentially(
  html: string,
  pattern: RegExp,
  replacements: (string | undefined)[]
): string {
  let index = 0
  return html.replace(pattern, () => {
    const replacement = replacements[index] || ''
    index++
    return replacement
  })
}

/**
 * 고유 ID 생성
 */
export function generateUniqueId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
