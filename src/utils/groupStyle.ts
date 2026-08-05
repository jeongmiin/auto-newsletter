import type { ModuleGroupStyles, BorderSide } from '@/types'
import { flattenAlphaColorsInHtml } from '@/utils/colorFlatten'
import { pointColorAt } from '@/utils/pointColor'

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
 * '포인트 색상 사용'이 켜진 색상(배경/테두리)을 지정된 포인트 색상(최대 3개 중
 * backgroundColorPointIndex/borderColorPointIndex번째)으로 해소한다.
 * 수동 색상값은 보존되므로 체크 해제 시 자동 원복된다. (캔버스/내보내기 직전 호출)
 */
export function resolveGroupStyles(
  s: ModuleGroupStyles,
  pointColors?: string[] | null,
): ModuleGroupStyles {
  if (!pointColors || pointColors.length === 0) return s
  let out = s
  // 배경은 '배경색 사용'(=값이 비어있지 않음)일 때만 포인트 색상으로 덮어쓴다
  if (s.backgroundColorUsePoint && s.backgroundColor && s.backgroundColor.trim()) {
    out = { ...out, backgroundColor: pointColorAt(pointColors, s.backgroundColorPointIndex ?? 0) }
  }
  if (s.borderColorUsePoint) {
    out = { ...out, borderColor: pointColorAt(pointColors, s.borderColorPointIndex ?? 0) }
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

/** CSS 1~4값 box shorthand(padding/margin)를 상/우/하/좌로 파싱 */
function parseBoxShorthand(v?: string): Record<BorderSide, string> {
  const t = (v || '').trim()
  if (!t) return { top: '', right: '', bottom: '', left: '' }
  const p = t.split(/\s+/)
  if (p.length === 1) return { top: p[0], right: p[0], bottom: p[0], left: p[0] }
  if (p.length === 2) return { top: p[0], right: p[1], bottom: p[0], left: p[1] }
  if (p.length === 3) return { top: p[0], right: p[1], bottom: p[2], left: p[1] }
  return { top: p[0], right: p[1], bottom: p[2], left: p[3] }
}

const capSide = (side: BorderSide): string => side.charAt(0).toUpperCase() + side.slice(1)

/**
 * 그룹 여백(안/밖)의 특정 변 현재값.
 * 명시된 4방향 필드(paddingTop 등)가 있으면 우선, 없으면 shorthand 파싱값으로 폴백.
 * (편집 UI가 기존 shorthand 값을 4칸에 그대로 보여주도록)
 */
export function groupBoxSide(
  s: ModuleGroupStyles,
  kind: 'padding' | 'margin',
  side: BorderSide,
): string {
  const explicit = s[`${kind}${capSide(side)}` as keyof ModuleGroupStyles] as string | undefined
  if (explicit != null && explicit !== '') return explicit
  return parseBoxShorthand(kind === 'padding' ? s.padding : s.margin)[side] || ''
}

/**
 * 그룹 여백(안/밖)의 최종 shorthand 문자열.
 * - 4방향 필드가 하나도 없으면 기존 shorthand 그대로 사용(출력 불변 = 하위 호환).
 * - 하나라도 있으면 '상 우 하 좌' 4값으로 조합(미설정 변은 shorthand 파싱값 폴백).
 * - 모두 0/빈값이면 '' (여백 없음).
 */
export function groupBoxShorthand(s: ModuleGroupStyles, kind: 'padding' | 'margin'): string {
  const hasExplicit = ALL_BORDER_SIDES.some((side) => {
    const v = s[`${kind}${capSide(side)}` as keyof ModuleGroupStyles] as string | undefined
    return v != null && v !== ''
  })
  if (!hasExplicit) {
    const v = (kind === 'padding' ? s.padding : s.margin) || ''
    return isZeroOrEmpty(v) ? '' : v.trim()
  }
  const sides = ALL_BORDER_SIDES.map((side) => groupBoxSide(s, kind, side) || '0')
  if (sides.every((v) => isZeroOrEmpty(v))) return ''
  return sides.join(' ')
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
  const pad = groupBoxShorthand(s, 'padding')
  if (pad) style.padding = pad
  const mgn = groupBoxShorthand(s, 'margin')
  if (mgn) style.margin = mgn
  return style
}

/**
 * 컬럼 분할 레이아웃 (fluid-hybrid)
 * - 컨테이너가 BREAKPOINT(px) 이상이면 컬럼들이 가로로 나란히,
 *   미만(모바일)이면 각 컬럼이 100%로 세로 스택된다.
 * - 캔버스 미리보기와 이메일 내보내기가 동일한 CSS를 쓰도록 공용 헬퍼로 둔다.
 *   (ModuleMultiImage·Module04 등에서 검증된 기법과 동일)
 */
export const COLUMN_BREAKPOINT_PX = 570
export const COLUMN_GAP_PX = 5

/**
 * 컬럼 셀(각 컬럼 래퍼)의 인라인 스타일 문자열.
 * box-sizing:border-box + min-width로 컬럼 폭을 잡는다.
 * (좌우 여백 없이 딱 맞으려면 셀 사이 공백이 없어야 하므로, 부모에 font-size:0 을 적용한다 —
 *  buildColumnLayoutHtml / 캔버스 .col-row 가 이를 처리)
 * 컬럼 간 간격은 각 셀 안쪽 padding(box-sizing:border-box라 폭에 포함)으로 준다.
 *
 * ⚠ min-width에서 간격을 빼면 안 된다. `calc(N% - 5px)`로 하면 컬럼 폭 합이
 * `100% - (컬럼수 × 5px)`이 되어 남는 자리가 **전부 오른쪽에 몰린다**
 * (2단이면 왼쪽 5px / 오른쪽 15px). 대신 폭 합이 항상 100%가 되도록
 * `normalizeColumnWidths`로 정규화해서 넘겨, 좌우 여백이 간격(5px)으로 같아지게 한다.
 */
export function columnCellStyle(columns: number, widthPct?: number): string {
  const n = Math.min(Math.max(columns, 1), 4)
  // widthPct(그 컬럼의 지정 너비 %)가 있으면 균등(100/n) 대신 그 값을 데스크톱 폭으로 쓴다.
  const pct = (widthPct != null && widthPct > 0 ? widthPct : 100 / n).toFixed(4)
  return [
    'display:inline-block',
    'vertical-align:top',
    'box-sizing:border-box',
    `padding:${COLUMN_GAP_PX}px`,
    `min-width:${pct}%`,
    'max-width:100%',
    `width:calc((${COLUMN_BREAKPOINT_PX}px - 100%) * ${COLUMN_BREAKPOINT_PX})`,
  ].join('; ')
}

/**
 * 컬럼 너비(%)를 합이 정확히 100이 되도록 비례 배분한다.
 *
 * 사용자가 지정한 값은 합이 100이 아닐 수 있다(예: 레거시 모듈 07번의 51+50=101).
 * 그대로 쓰면 ①합이 100을 넘으면 두 번째 컬럼이 아래로 밀려 2단이 세로로 무너지고
 * ②합이 100보다 작으면 남는 자리가 오른쪽에 몰려 콘텐츠가 왼쪽으로 쏠린다.
 * @returns 정규화된 너비 배열. 쓸 수 없는 값이면 null(균등 분할로 폴백)
 */
export function normalizeColumnWidths(
  widths: number[] | undefined | null,
  columns: number,
): number[] | null {
  if (!Array.isArray(widths) || widths.length !== columns || columns < 1) return null
  const nums = widths.map((v) => Number(v) || 0)
  if (nums.some((v) => v <= 0)) return null
  const sum = nums.reduce((a, b) => a + b, 0)
  if (sum <= 0) return null
  return nums.map((v) => (v / sum) * 100)
}

/**
 * 컬럼별 내부 HTML 배열을 fluid-hybrid 컬럼 레이아웃으로 감싼다.
 * @param columnHtml columnHtml[i] = i번 컬럼에 들어갈 결합 HTML(빈 문자열 허용)
 */
export function buildColumnLayoutHtml(columnHtml: string[], widths?: number[]): string {
  const n = Math.min(Math.max(columnHtml.length, 1), 4)
  const cells = columnHtml
    .slice(0, n)
    .map((inner, i) => `<div style="${columnCellStyle(n, widths?.[i])}">${inner || '&nbsp;'}</div>`)
    .join('')
  // font-size:0 로 inline-block 사이 공백(gap) 제거, letter-spacing:0 보정
  return `<div style="font-size:0; letter-spacing:0;">${cells}</div>`
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
  const pad = groupBoxShorthand(s, 'padding')
  if (pad) cellParts.push(`padding:${pad}`)
  const cellStyle = flattenAlphaColorsInHtml(cellParts.join(';'), flattenBg)

  const cellAttr = cellStyle ? ` style="${cellStyle}"` : ''

  // 스타일이 적용되는 안쪽 테이블 (배경/테두리/안쪽여백)
  const innerTable = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse">
<tr><td${cellAttr}>
${innerHtml}
</td></tr>
</table>`

  // 바깥 여백(margin)이 없으면 안쪽 테이블만 반환
  const mgn = groupBoxShorthand(s, 'margin')
  if (!mgn) return innerTable

  // 바깥 여백은 '바깥쪽 빈 td의 padding'으로 처리한다.
  // width:100% 테이블에 margin을 주면 너비에 더해져 컨테이너 밖으로 삐져나가므로,
  // 바깥 td의 padding으로 동일한 간격을 주면 안쪽 테이블이 줄어든 폭의 100%가 되어 항상 안에 머문다.
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse">
<tr><td style="padding:${mgn}">
${innerTable}
</td></tr>
</table>`
}
