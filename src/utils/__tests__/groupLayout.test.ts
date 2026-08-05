import { describe, it, expect } from 'vitest'
import { resolveGroupRows, computeGroupLayout, clampColumns } from '../groupLayout'
import type { ModuleGroup, ModuleInstance } from '@/types/module'

// 테스트용 최소 멤버 생성
const mk = (id: string, extra: Partial<ModuleInstance> = {}): ModuleInstance => ({
  id,
  moduleId: 'ModuleDescText',
  order: 0,
  properties: {},
  styles: {},
  ...extra,
})

describe('groupLayout', () => {
  describe('clampColumns', () => {
    it('1~3 범위로 클램프하고 미지정/0은 1로', () => {
      expect(clampColumns(undefined)).toBe(1)
      expect(clampColumns(0)).toBe(1)
      expect(clampColumns(3)).toBe(3)
      expect(clampColumns(9)).toBe(3)
    })
  })

  describe('신모델 (group.rows + rowIndex)', () => {
    it('행별 컬럼 수를 그대로 사용하고 멤버를 (행,컬럼)에 배치', () => {
      const group: Pick<ModuleGroup, 'rows'> = { rows: [1, 2] }
      const members = [
        mk('title', { rowIndex: 0, columnIndex: 0 }),
        mk('text', { rowIndex: 0, columnIndex: 0 }),
        mk('img', { rowIndex: 1, columnIndex: 0 }),
        mk('rtitle', { rowIndex: 1, columnIndex: 1 }),
        mk('btn', { rowIndex: 1, columnIndex: 1 }),
      ]
      const rows = computeGroupLayout(group, members)
      expect(rows).toHaveLength(2)
      // 0행: 1컬럼, title/text 스택
      expect(rows[0].columns).toBe(1)
      expect(rows[0].cells[0].map((m) => m.id)).toEqual(['title', 'text'])
      // 1행: 2컬럼, 좌=img, 우=rtitle/btn 스택
      expect(rows[1].columns).toBe(2)
      expect(rows[1].cells[0].map((m) => m.id)).toEqual(['img'])
      expect(rows[1].cells[1].map((m) => m.id)).toEqual(['rtitle', 'btn'])
    })

    it('행별로 다른 컬럼 수를 독립적으로 처리 (1단 + 3단)', () => {
      const group: Pick<ModuleGroup, 'rows'> = { rows: [1, 3] }
      const members = [
        mk('a', { rowIndex: 0, columnIndex: 0 }),
        mk('b', { rowIndex: 1, columnIndex: 0 }),
        mk('c', { rowIndex: 1, columnIndex: 1 }),
        mk('d', { rowIndex: 1, columnIndex: 2 }),
      ]
      const rows = computeGroupLayout(group, members)
      expect(rows[0].columns).toBe(1)
      expect(rows[1].columns).toBe(3)
      expect(rows[1].cells.map((c) => c.map((m) => m.id))).toEqual([['b'], ['c'], ['d']])
    })

    it('범위를 벗어난 rowIndex/columnIndex는 클램프', () => {
      const group: Pick<ModuleGroup, 'rows'> = { rows: [2] }
      const members = [mk('x', { rowIndex: 5, columnIndex: 9 })]
      const res = resolveGroupRows(group, members)
      expect(res.rowIndexById['x']).toBe(0)
      expect(res.colIndexById['x']).toBe(1) // 2컬럼 → 최대 인덱스 1
    })
  })

  describe('레거시 유도 (group.columns + fullWidth)', () => {
    it('columns=1 그룹은 전체 멤버를 1개의 1컬럼 행으로', () => {
      const group: Pick<ModuleGroup, 'columns'> = { columns: 1 }
      const members = [mk('a'), mk('b'), mk('c')]
      const rows = computeGroupLayout(group, members)
      expect(rows).toHaveLength(1)
      expect(rows[0].columns).toBe(1)
      expect(rows[0].cells[0].map((m) => m.id)).toEqual(['a', 'b', 'c'])
    })

    it('fullWidth 상단 + 2컬럼 하단을 행으로 분리 (모듈05형)', () => {
      const group: Pick<ModuleGroup, 'columns'> = { columns: 2 }
      const members = [
        mk('title', { fullWidth: true }),
        mk('text', { fullWidth: true }),
        mk('img', { columnIndex: 0 }),
        mk('rtitle', { columnIndex: 1 }),
        mk('rtext', { columnIndex: 1 }),
      ]
      const res = resolveGroupRows(group, members)
      expect(res.rowCols).toEqual([1, 2]) // 전체폭 행 + 2컬럼 행
      const rows = computeGroupLayout(group, members)
      expect(rows[0].cells[0].map((m) => m.id)).toEqual(['title', 'text'])
      expect(rows[1].cells[0].map((m) => m.id)).toEqual(['img'])
      expect(rows[1].cells[1].map((m) => m.id)).toEqual(['rtitle', 'rtext'])
    })

    it('전체폭 사이에 낀 컬럼 밴드도 별개 행으로', () => {
      const group: Pick<ModuleGroup, 'columns'> = { columns: 2 }
      const members = [
        mk('a', { fullWidth: true }),
        mk('l', { columnIndex: 0 }),
        mk('r', { columnIndex: 1 }),
        mk('b', { fullWidth: true }),
      ]
      const res = resolveGroupRows(group, members)
      expect(res.rowCols).toEqual([1, 2, 1])
    })
  })
describe('컬럼 너비(colWidths) 정규화', () => {
    const twoColGroup = (colWidths) => ({ rows: [2], colWidths })
    const twoColMembers = () => [mk('l', { rowIndex: 0, columnIndex: 0 }), mk('r', { rowIndex: 0, columnIndex: 1 })]

    it('합이 100이 아닌 너비를 100이 되도록 비례 배분한다', () => {
      // 51 + 50 = 101 → 그대로 두면 2단이 세로로 무너진다 (모듈 07번 실제 값)
      const rows = computeGroupLayout(twoColGroup([[51, 50]]), twoColMembers())
      const w = rows[0].widths
      expect(w[0] + w[1]).toBeCloseTo(100, 6)
      expect(w[0]).toBeCloseTo(50.495, 3)
    })

    it('합이 100보다 작아도 채워 넣어 오른쪽 쏠림을 막는다', () => {
      const rows = computeGroupLayout(twoColGroup([[30, 30]]), twoColMembers())
      expect(rows[0].widths).toEqual([50, 50])
    })

    it('쓸 수 없는 값이면 너비를 지정하지 않는다 (균등 분할)', () => {
      expect(computeGroupLayout(twoColGroup([[0, 100]]), twoColMembers())[0].widths).toBeUndefined()
      expect(computeGroupLayout(twoColGroup([[50]]), twoColMembers())[0].widths).toBeUndefined()
    })

    it('1컬럼 행에는 너비를 지정하지 않는다', () => {
      const rows = computeGroupLayout({ rows: [1], colWidths: [[100]] }, [mk('a', { rowIndex: 0, columnIndex: 0 })])
      expect(rows[0].widths).toBeUndefined()
    })
  })
})