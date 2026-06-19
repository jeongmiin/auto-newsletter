import type { ModuleGroupStyles, BorderSide } from '@/types'
import { flattenAlphaColorsInHtml } from '@/utils/colorFlatten'

/** 테두리 변 순서 (출력 일관성용) */
export const ALL_BORDER_SIDES: BorderSide[] = ['top', 'right', 'bottom', 'left']

/**
 * 그룹 기본 스타일 (새 그룹 생성 시 적용)
 * - backgroundColor 빈 문자열 = 배경 없음(투명)
 */
export const DEFAULT_GROUP_STYLES: ModuleGroupStyles = {
  backgroundColor: '',
  borderWidth: '0px',
  borderStyle: 'solid',
  borderColor: '#dddddd',
  borderSides: ['top', 'right', 'bottom', 'left'],
  padding: '0px',
  margin: '0px',
}

/** 테두리를 적용할 변 (미지정이면 4면 전체로 간주 — 구버전 호환) */
export function groupBorderSides(s: ModuleGroupStyles): BorderSide[] {
  if (!s.borderSides) return [...ALL_BORDER_SIDES]
  return ALL_BORDER_SIDES.filter((side) => s.borderSides!.includes(side))
}

/**
 * '포인트 색상 사용'이 켜진 색상(배경/테두리)을 전역 포인트 색상으로 해소한다.
 * 수동 색상값은 보존되므로 체크 해제 시 자동 원복된다. (캔버스/내보내기 직전 호출)
 */
export function resolveGroupStyles(
  s: ModuleGroupStyles,
  pointColor?: string | null,
): ModuleGroupStyles {
  if (!pointColor) return s
  let out = s
  // 배경은 '배경색 사용'(=값이 비어있지 않음)일 때만 포인트 색상으로 덮어쓴다
  if (s.backgroundColorUsePoint && s.backgroundColor && s.backgroundColor.trim()) {
    out = { ...out, backgroundColor: pointColor }
  }
  if (s.borderColorUsePoint) {
    out = { ...out, borderColor: pointColor }
  }
  return out
}

/** 값이 '실제로 0/빈값'인지 (0, 0px, 0px 0px 등) */
const isZeroOrEmpty = (v?: string): boolean => {
  if (!v) return true
  const t = v.trim()
  if (!t) return true
  // 모든 토큰이 0 또는 0단위면 0으로 취급
  return t.split(/\s+/).every((tok) => /^0[a-z%]*$/i.test(tok))
}

/** 테두리 단축 표기 (두께가 0이면 빈 문자열) */
export function groupBorderShorthand(s: ModuleGroupStyles): string {
  const w = (s.borderWidth || '').trim()
  if (isZeroOrEmpty(w)) return ''
  return `${w} ${s.borderStyle || 'solid'} ${s.borderColor || '#000000'}`
}

/**
 * 캔버스 미리보기용 그룹 래퍼 div 스타일 객체
 */
export function groupDivStyle(s: ModuleGroupStyles): Record<string, string> {
  const style: Record<string, string> = {}
  if (s.backgroundColor && s.backgroundColor.trim()) style.backgroundColor = s.backgroundColor
  const border = groupBorderShorthand(s)
  if (border) {
    const sides = groupBorderSides(s)
    if (sides.length === 4) {
      style.border = border
    } else {
      // 선택된 변에만 적용 (camelCase 키: borderTop/borderRight/...)
      const keyMap: Record<BorderSide, string> = {
        top: 'borderTop',
        right: 'borderRight',
        bottom: 'borderBottom',
        left: 'borderLeft',
      }
      sides.forEach((side) => {
        style[keyMap[side]] = border
      })
    }
  }
  if (s.padding && !isZeroOrEmpty(s.padding)) style.padding = s.padding
  if (s.margin && !isZeroOrEmpty(s.margin)) style.margin = s.margin
  return style
}

/**
 * 내보내기(이메일)용 그룹 래퍼 — 단일 셀 <table>로 감싼다.
 * 배경/테두리/안쪽여백은 <td>에, 바깥여백(margin)은 <table>에 적용.
 * 반투명 색상은 전역 배경색 기준으로 평탄화(이메일 호환).
 *
 * @param innerHtml 그룹에 속한 모듈들의 결합 HTML
 * @param s 그룹 스타일
 * @param flattenBg 알파 평탄화 기준 배경색 (보통 wrap 배경색)
 */
export function wrapGroupHtmlForEmail(
  innerHtml: string,
  s: ModuleGroupStyles,
  flattenBg: string,
): string {
  const cellParts: string[] = []
  if (s.backgroundColor && s.backgroundColor.trim()) {
    cellParts.push(`background-color:${s.backgroundColor}`)
  }
  const border = groupBorderShorthand(s)
  if (border) {
    const sides = groupBorderSides(s)
    if (sides.length === 4) {
      cellParts.push(`border:${border}`)
    } else {
      sides.forEach((side) => cellParts.push(`border-${side}:${border}`))
    }
  }
  if (s.padding && !isZeroOrEmpty(s.padding)) cellParts.push(`padding:${s.padding}`)
  const cellStyle = flattenAlphaColorsInHtml(cellParts.join(';'), flattenBg)

  const cellAttr = cellStyle ? ` style="${cellStyle}"` : ''

  // 스타일이 적용되는 안쪽 테이블 (배경/테두리/안쪽여백)
  const innerTable = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse">
<tr><td${cellAttr}>
${innerHtml}
</td></tr>
</table>`

  // 바깥 여백(margin)이 없으면 안쪽 테이블만 반환
  if (!s.margin || isZeroOrEmpty(s.margin)) return innerTable

  // 바깥 여백은 '바깥쪽 빈 td의 padding'으로 처리한다.
  // width:100% 테이블에 margin을 주면 너비에 더해져 컨테이너 밖으로 삐져나가므로,
  // 바깥 td의 padding으로 동일한 간격을 주면 안쪽 테이블이 줄어든 폭의 100%가 되어 항상 안에 머문다.
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse">
<tr><td style="padding:${s.margin}">
${innerTable}
</td></tr>
</table>`
}
