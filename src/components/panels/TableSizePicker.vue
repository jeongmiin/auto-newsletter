<template>
  <!-- 테이블 크기 선택(사각형 그리드) + 직접 입력(행/열 스테퍼) — 두 값이 서로 연동된다 (Figma 640-3379).
       '테이블' 레일 메뉴(CategoryModulePanel)와 2단 컬럼의 '직접 구성'(ColumnComposePanel)이 같이 쓴다.
       크기는 여기서 고르기만 하고, 실제로 넣는 일은 부모가 `add`를 받아 한다. -->
  <div class="table-add">
    <!-- 크기 선택 헤더: 좌 라벨 + 우 현재 크기 -->
    <div class="ts-head">
      <span class="ts-head-label">테이블 크기 선택</span>
      <span class="ts-head-size">{{ gridHiRows }} × {{ gridHiCols }} 테이블</span>
    </div>

    <!-- 사각형 그리드(6열 × 5행): 호버 미리보기 + 클릭 확정 -->
    <div class="ts-grid" @mouseleave="onGridLeave">
      <div v-for="r in TABLE_MAX_ROWS" :key="r" class="ts-grid-row">
        <button
          v-for="c in TABLE_MAX_COLS"
          :key="c"
          type="button"
          class="ts-cell"
          :class="{ 'ts-cell--on': r <= gridHiRows && c <= gridHiCols }"
          @mouseenter="onCellHover(r, c)"
          @click="onCellClick(r, c)"
          :aria-label="`${r}행 ${c}열`"
        />
      </div>
    </div>

    <div class="ts-divider"></div>

    <span class="ts-section-label">직접 입력</span>

    <!-- 직접 입력: 행/열 스테퍼 — 그리드와 양방향 연동 -->
    <div class="ts-inputs">
      <div class="ts-input-field">
        <span class="ts-input-label">행</span>
        <div class="ts-stepper">
          <button type="button" class="ts-step-btn" @click="stepRows(-1)" aria-label="행 감소">
            <span class="material-symbols-outlined">remove</span>
          </button>
          <span class="ts-step-div"></span>
          <input
            type="number"
            class="ts-step-val"
            :value="tableRows"
            min="1"
            max="50"
            @input="onRowsInput"
          />
          <span class="ts-step-div"></span>
          <button type="button" class="ts-step-btn" @click="stepRows(1)" aria-label="행 증가">
            <span class="material-symbols-outlined">add</span>
          </button>
        </div>
      </div>
      <div class="ts-input-field">
        <span class="ts-input-label">열</span>
        <div class="ts-stepper">
          <button type="button" class="ts-step-btn" @click="stepCols(-1)" aria-label="열 감소">
            <span class="material-symbols-outlined">remove</span>
          </button>
          <span class="ts-step-div"></span>
          <input
            type="number"
            class="ts-step-val"
            :value="tableCols"
            min="1"
            max="20"
            @input="onColsInput"
          />
          <span class="ts-step-div"></span>
          <button type="button" class="ts-step-btn" @click="stepCols(1)" aria-label="열 증가">
            <span class="material-symbols-outlined">add</span>
          </button>
        </div>
      </div>
    </div>

    <button type="button" class="ts-add-btn" @click="emit('add', tableRows, tableCols)">
      테이블 추가
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const emit = defineEmits<{ add: [rows: number, cols: number] }>()

// 그리드는 6열 × 5행(Figma 640-3379). 세로 = 행, 가로 = 열.
const TABLE_MAX_ROWS = 5
const TABLE_MAX_COLS = 6
// 확정 값(직접 입력·그리드 클릭으로 갱신)
const tableRows = ref(2)
const tableCols = ref(2)
// 그리드 호버 미리보기(0 = 호버 없음)
const hoverRows = ref(0)
const hoverCols = ref(0)

// 그리드 하이라이트 = 호버 중이면 호버 값, 아니면 확정 값(그리드 범위로 캡).
const gridHiRows = computed(() => Math.min(TABLE_MAX_ROWS, hoverRows.value || tableRows.value))
const gridHiCols = computed(() => Math.min(TABLE_MAX_COLS, hoverCols.value || tableCols.value))

const onCellHover = (r: number, c: number) => {
  hoverRows.value = r
  hoverCols.value = c
}
const onGridLeave = () => {
  hoverRows.value = 0
  hoverCols.value = 0
}
const onCellClick = (r: number, c: number) => {
  // 그리드 클릭 → 행/열 숫자가 자동 갱신(직접 입력 인풋과 연동)
  tableRows.value = r
  tableCols.value = c
  hoverRows.value = 0
  hoverCols.value = 0
}
// 직접 입력 → 확정 값 갱신(그리드 하이라이트가 자동으로 따라온다)
const clampInt = (raw: string, min: number, max: number): number | null => {
  const n = parseInt(raw, 10)
  if (Number.isNaN(n)) return null
  return Math.min(max, Math.max(min, n))
}
const onRowsInput = (e: Event) => {
  const v = clampInt((e.target as HTMLInputElement).value, 1, 50)
  if (v !== null) tableRows.value = v
}
const onColsInput = (e: Event) => {
  const v = clampInt((e.target as HTMLInputElement).value, 1, 20)
  if (v !== null) tableCols.value = v
}
// 스테퍼(− / +) — 그리드 하이라이트가 자동으로 따라온다
const stepRows = (delta: number) => {
  tableRows.value = Math.min(50, Math.max(1, tableRows.value + delta))
}
const stepCols = (delta: number) => {
  tableCols.value = Math.min(20, Math.max(1, tableCols.value + delta))
}
</script>

<style scoped>
/* ===== 테이블 크기 선택 (Figma 640-3379) — .ts-head/.ts-head-label/.ts-section-label 은 panels.css 공용 ===== */
.table-add {
  display: flex;
  flex-direction: column;
  gap: 26px;
}
/* 크기 선택 헤더: 좌 라벨 + 우 현재 크기 */
.ts-head-size {
  font-size: 15px;
  color: var(--blue-400);
  letter-spacing: -0.15px;
  white-space: nowrap;
}
/* 사각형 그리드 */
.ts-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ts-grid-row {
  display: flex;
  gap: 8px;
}
.ts-cell {
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--gray-200);
  border-radius: 6px;
  background: var(--gray-100);
  cursor: pointer;
  transition:
    background 0.08s,
    border-color 0.08s;
}
.ts-cell:hover {
  border-color: var(--blue-400);
}
.ts-cell--on {
  background: var(--blue-50);
  border-color: var(--blue-400);
}
.ts-divider {
  height: 1px;
  background: var(--gray-200);
}
/* 직접 입력: 행/열 스테퍼 */
.ts-inputs {
  display: flex;
  gap: 16px;
}
.ts-input-field {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ts-input-label {
  font-size: 15px;
  color: var(--gray-700);
}
.ts-stepper {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 11px;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  background: var(--white);
}
.ts-step-btn {
  flex-shrink: 0;
  width: 34px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: none;
  color: var(--gray-700);
  cursor: pointer;
}
.ts-step-btn:hover {
  color: var(--gray-800);
}
.ts-step-btn .material-symbols-outlined {
  font-size: 22px;
}
.ts-step-div {
  flex-shrink: 0;
  width: 1px;
  height: 30px;
  background: var(--gray-200);
}
.ts-step-val {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: none;
  background: none;
  text-align: center;
  font-size: 15px;
  font-weight: 500;
  color: var(--gray-800);
  -moz-appearance: textfield;
  appearance: textfield;
}
.ts-step-val::-webkit-outer-spin-button,
.ts-step-val::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.ts-step-val:focus {
  outline: none;
}
.ts-add-btn {
  width: 100%;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: var(--blue-400);
  color: var(--white);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.ts-add-btn:hover {
  background: var(--blue-500);
}
</style>
