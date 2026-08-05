/**
 * 그룹의 '행별 독립 컬럼' 레이아웃 계산 (순수 함수 — 렌더/내보내기 공용, 테스트 가능)
 *
 * 모델:
 *  - 그룹은 여러 '행(row)'을 가지며, 각 행이 자기 컬럼 수(1~4)를 갖는다 → ModuleGroup.rows[]
 *  - 멤버는 rowIndex(행) · columnIndex(그 행 안 컬럼)로 배치된다
 *  - 같은 (rowIndex, columnIndex) 멤버들은 그 칸에 세로로 쌓인다
 *  - 컬럼 수 1인 행 = 전체폭(세로 스택)
 *
 * 레거시(구모델: group.columns + member.fullWidth)도 rows로 유도해 하위 호환한다.
 */
import type { ModuleGroup, ModuleInstance } from '@/types/module'
import { normalizeColumnWidths } from '@/utils/groupStyle'

export const MAX_COLUMNS = 3

export const clampColumns = (n: number | undefined): number =>
  Math.min(Math.max(Math.floor(n ?? 1) || 1, 1), MAX_COLUMNS)

export interface ResolvedRows {
  /** rowCols[r] = r번째 행의 컬럼 수 */
  rowCols: number[]
  /** 멤버 id → 속한 행 인덱스 */
  rowIndexById: Record<string, number>
  /** 멤버 id → 그 행 안에서의 컬럼 인덱스 */
  colIndexById: Record<string, number>
}

/**
 * 그룹 + (순서대로 정렬된) 멤버 → 행별 컬럼 수와 각 멤버의 (행, 컬럼) 위치.
 * - 신모델(group.rows 존재): rows를 그대로 쓰고 멤버 rowIndex/columnIndex를 클램프
 * - 레거시(group.rows 없음): group.columns + member.fullWidth로 행을 세그먼트해서 유도
 */
export function resolveGroupRows(
  group: Pick<ModuleGroup, 'rows' | 'columns'>,
  orderedMembers: ModuleInstance[],
): ResolvedRows {
  const rowIndexById: Record<string, number> = {}
  const colIndexById: Record<string, number> = {}

  // ── 신모델 ──
  if (group.rows && group.rows.length > 0) {
    const rowCols = group.rows.map(clampColumns)
    for (const m of orderedMembers) {
      const r = Math.min(Math.max(m.rowIndex ?? 0, 0), rowCols.length - 1)
      rowIndexById[m.id] = r
      colIndexById[m.id] = Math.min(Math.max(m.columnIndex ?? 0, 0), rowCols[r] - 1)
    }
    return { rowCols, rowIndexById, colIndexById }
  }

  // ── 레거시: columns + fullWidth 세그먼트 ──
  const cols = clampColumns(group.columns && group.columns > 1 ? group.columns : 1)
  const rowCols: number[] = []
  let curType: 'full' | 'cols' | null = null
  let curRow = -1
  for (const m of orderedMembers) {
    const isFull = !!m.fullWidth || cols === 1
    if (isFull) {
      if (curType !== 'full') {
        curRow = rowCols.length
        rowCols.push(1)
        curType = 'full'
      }
      rowIndexById[m.id] = curRow
      colIndexById[m.id] = 0
    } else {
      if (curType !== 'cols') {
        curRow = rowCols.length
        rowCols.push(cols)
        curType = 'cols'
      }
      rowIndexById[m.id] = curRow
      colIndexById[m.id] = Math.min(Math.max(m.columnIndex ?? 0, 0), cols - 1)
    }
  }
  if (rowCols.length === 0) rowCols.push(1)
  return { rowCols, rowIndexById, colIndexById }
}

export interface GroupRowLayout<T> {
  /** 이 행의 컬럼 수 */
  columns: number
  /** cells[colIdx] = 그 컬럼에 세로로 쌓인 멤버들(순서 유지) */
  cells: T[][]
  /** 컬럼별 너비(%) — 지정 시 균등 분할 대신 이 비율로 그린다(합계 100). 미지정이면 균등. */
  widths?: number[]
}

/**
 * 멤버들을 행/컬럼 격자로 배치한다. resolveGroupRows 결과를 사용.
 */
export function layoutGroupRows<T extends ModuleInstance>(
  orderedMembers: T[],
  resolved: ResolvedRows,
): GroupRowLayout<T>[] {
  const rows: GroupRowLayout<T>[] = resolved.rowCols.map((c) => ({
    columns: c,
    cells: Array.from({ length: c }, () => [] as T[]),
  }))
  for (const m of orderedMembers) {
    const r = resolved.rowIndexById[m.id] ?? 0
    if (!rows[r]) continue
    const c = Math.min(Math.max(resolved.colIndexById[m.id] ?? 0, 0), rows[r].columns - 1)
    rows[r].cells[c].push(m)
  }
  return rows
}

/**
 * 편의: 그룹 + 멤버 → 바로 행 레이아웃.
 */
export function computeGroupLayout<T extends ModuleInstance>(
  group: Pick<ModuleGroup, 'rows' | 'columns' | 'colWidths'>,
  orderedMembers: T[],
): GroupRowLayout<T>[] {
  const rows = layoutGroupRows(orderedMembers, resolveGroupRows(group, orderedMembers))
  // 행별 컬럼 너비(%) 적용 — 합이 정확히 100이 되도록 비례 배분해서 넘긴다.
  // (그대로 두면 합이 100을 넘길 때 2단이 세로로 무너지고, 모자라면 남는 자리가 오른쪽에 몰린다)
  const cw = group.colWidths
  if (cw) {
    rows.forEach((row, r) => {
      if (row.columns <= 1) return
      const normalized = normalizeColumnWidths(cw[r], row.columns)
      if (normalized) row.widths = normalized
    })
  }
  return rows
}
