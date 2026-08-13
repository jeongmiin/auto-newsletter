<template>
  <div
    @click="$emit('select', module.id)"
    :class="[
      'relative group cursor-pointer border-2 transition-all',
      isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-transparent hover:border-blue-500',
    ]"
  >
    <!-- 로딩 스피너 -->
    <div v-if="isLoading" class="flex items-center justify-center py-12 bg-gray-50">
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span class="text-sm text-gray-500">모듈 로딩 중...</span>
      </div>
    </div>

    <!-- 모듈 컨텐츠 - isolation 레이어로 CSS 리셋 방지 -->
    <div v-else class="module-content-wrapper">
      <div ref="contentEl" v-html="renderedHtml" class="module-content" @click="onContentClick"></div>
    </div>

    <!-- 우측 세로 플로팅 툴바 (모듈 바깥 오른쪽) — 위로/아래로/복제/삭제.
         **선택했을 때만** 보인다. 호버만으로 뜨면 마우스가 지나가는 모듈마다 툴바가 깜빡여
         미리보기를 훑어보기 어렵다(호버 때는 테두리만 표시). -->
    <!-- ⚠ 툴바 컨테이너에는 툴팁을 걸지 않는다. 버튼마다 이미 툴팁이 있어서
         버튼에 마우스를 올리면 컨테이너 툴팁(모듈 이름)과 겹쳐 두 개가 함께 뜬다. -->
    <div class="module-toolbar" :class="{ 'is-visible': isSelected, 'is-left': toolbarOnLeft }">
      <button
        type="button"
        class="module-toolbar-btn"
        :disabled="!canGoUp"
        @click.stop="$emit('move-up', module.id)"
        v-tooltip.left="'위로 이동'"
      >
        <span class="material-symbols-outlined">arrow_upward</span>
      </button>
      <button
        type="button"
        class="module-toolbar-btn"
        :disabled="!canGoDown"
        @click.stop="$emit('move-down', module.id)"
        v-tooltip.left="'아래로 이동'"
      >
        <span class="material-symbols-outlined">arrow_downward</span>
      </button>
      <button
        type="button"
        class="module-toolbar-btn"
        @click.stop="$emit('duplicate', module.id)"
        v-tooltip.left="'복제'"
      >
        <span class="material-symbols-outlined">content_copy</span>
      </button>
      <button
        type="button"
        class="module-toolbar-btn is-danger"
        @click.stop="$emit('delete', module.id)"
        v-tooltip.left="'삭제'"
      >
        <span class="material-symbols-outlined">delete</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import type { ModuleInstance } from '@/types'
import { useModuleRenderer } from '@/composables/useModuleRenderer'
import { useModuleStore } from '@/stores/moduleStore'

interface Props {
  module: ModuleInstance
  index: number
  isSelected: boolean
  /** 컬럼 그룹 멤버일 때 좌/우 이동 버튼 표시용 (컬럼 수 + 현재 컬럼) */
  columnInfo?: { columns: number; columnIndex: number }
  /**
   * 위/아래 이동 가능 여부. 그룹 멤버는 전역 order가 아니라 **그룹 안 위치**로 판단해야 해서
   * 캔버스가 직접 넘겨준다(2단 행 안의 모듈은 혼자 위아래로 못 움직이므로 둘 다 false).
   * 넘기지 않으면 단독 모듈 기준(맨 위면 위로 비활성)으로 동작한다.
   */
  canMoveUp?: boolean
  canMoveDown?: boolean
}

const props = defineProps<Props>()

defineEmits<{
  select: [moduleId: string]
  'move-up': [moduleId: string]
  'move-down': [moduleId: string]
  duplicate: [moduleId: string]
  delete: [moduleId: string]
}>()

const moduleStore = useModuleStore()

// 캔버스가 넘겨주면 그 값을, 아니면 단독 모듈 기준으로 판단한다
const canGoUp = computed(() => props.canMoveUp ?? props.index !== 0)
const canGoDown = computed(() => props.canMoveDown ?? true)

/**
 * 툴바는 모듈 오른쪽 바깥에 뜨는데, 2단 이상 행의 왼쪽 컬럼에서는
 * 그 '바깥'이 옆 컬럼 위라서 내용을 가린다. 그래서 첫 컬럼만 왼쪽 바깥으로 옮긴다.
 * (3단 가운데 컬럼은 좌우 어느 쪽도 비어 있지 않아 그대로 둔다)
 */
const toolbarOnLeft = computed(() => {
  const info = props.columnInfo
  return !!info && info.columns > 1 && info.columnIndex === 0
})

const { renderedHtml, isLoading } = useModuleRenderer(props.module.id)
const contentEl = ref<HTMLElement | null>(null)


// ── 테이블 셀 선택 (캔버스 미리보기) ─────────────────────────────
// data-row/col을 가진 셀(ModuleTable)만 처리. 그 외 클릭은 버블돼 일반 모듈 선택.
const onContentClick = (e: MouseEvent) => {
  const cellEl = (e.target as HTMLElement).closest('[data-row]') as HTMLElement | null
  if (!cellEl) return
  const row = Number(cellEl.dataset.row)
  const col = Number(cellEl.dataset.col)
  if (Number.isNaN(row) || Number.isNaN(col)) return
  e.stopPropagation() // 루트의 전체-선택 대신 셀 선택으로 처리
  // 모듈도 선택되게(속성 패널 전환) — 직접 선택 경로
  moduleStore.selectModule(props.module.id)
  if (e.metaKey || e.ctrlKey) moduleStore.toggleTableCell(props.module.id, row, col)
  else if (e.shiftKey) moduleStore.rangeSelectTableCell(props.module.id, row, col)
  else moduleStore.selectTableCell(props.module.id, row, col)
}

// 선택된 셀에 .cell-selected 클래스를 토글(런타임 DOM만 — 내보내기 HTML엔 없음)
const applyCellHighlight = () => {
  const el = contentEl.value
  if (!el) return
  const sel = moduleStore.tableCellSelection
  const selCells = sel && sel.moduleId === props.module.id ? sel.cells : []
  el.querySelectorAll<HTMLElement>('[data-row]').forEach((c) => {
    const r = Number(c.dataset.row)
    const co = Number(c.dataset.col)
    c.classList.toggle('cell-selected', selCells.some((s) => s.row === r && s.col === co))
  })
}

watch(
  [renderedHtml, () => moduleStore.tableCellSelection],
  () => nextTick(applyCellHighlight),
  { deep: true, immediate: true },
)
</script>

<style scoped>
/*
  ⚠️ 핵심 문제 해결:

  문제:
  - 테이블의 inline style="padding:30px 20px"가 미리보기에서 무시됨
  - Tailwind preflight가 전역적으로 padding: 0을 적용하기 때문

  해결:
  - 테이블 요소에 padding 값을 명시적으로 허용
  - inline 스타일이 항상 우선순위를 갖도록 설정
*/

/* 우측 세로 플로팅 툴바 (모듈 바깥 오른쪽) */
.module-toolbar {
  position: absolute;
  right: -50px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 41px;
  padding: 16px 0;
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: 12px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.07);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s;
}
/* 2단 이상 행의 왼쪽 컬럼: 오른쪽에 두면 옆 컬럼을 덮으므로 왼쪽 바깥으로 */
.module-toolbar.is-left {
  right: auto;
  left: -55px;
}
/* 호버로는 열지 않는다 — 선택(is-visible)했을 때만 */
.module-toolbar.is-visible {
  opacity: 1;
  pointer-events: auto;
}
.module-toolbar-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: var(--gray-700);
  cursor: pointer;
  border-radius: 6px;
}
.module-toolbar-btn .material-symbols-outlined {
  font-size: 20px;
}
.module-toolbar-btn:hover {
  background: var(--gray-100);
}
.module-toolbar-btn:disabled {
  color: var(--gray-300);
  cursor: not-allowed;
}
.module-toolbar-btn:disabled:hover {
  background: none;
}
.module-toolbar-btn.is-danger {
  color: var(--red-400);
}
.module-toolbar-btn.is-danger:hover {
  background: var(--red-50);
}

/* CSS 격리 레이어 */
.module-content-wrapper {
  isolation: isolate;
}

.module-content :deep(*) {
  max-width: 100%;
}

.module-content :deep(img) {
  max-width: 100%;
  height: auto;
}

/*
  ✅ 테이블 inline 스타일 보존 전략:

  문제:
  - Tailwind preflight의 * { margin: 0 }이 inline style을 덮어쓸 수 있음
  - 테이블의 style="padding:30px 20px"이 적용 안 됨

  해결:
  - 테이블 요소들만 all: unset으로 리셋 해제
  - 그 다음 필요한 기본 스타일만 재적용
*/

/*
  ✅ 최종 해결책: inline 스타일 강제 적용

  문제:
  - Tailwind의 * { margin: 0 }이 inline 스타일을 덮어씀
  - all: unset도 작동하지 않음

  해결:
  - 테이블 요소에 대해서만 전역 리셋을 무효화
  - initial 또는 unset 사용하여 브라우저 기본값으로 복원
*/

.module-content :deep(table) {
  border-spacing: 0;
  border-collapse: collapse;
  /* Tailwind/base.css의 margin: 0을 무효화 */
  margin: initial;
  padding: initial;
}

/* 테이블 셀 선택(캔버스): 클릭 가능 표시 + 선택 셀 파란 아웃라인 */
.module-content :deep(td[data-row]),
.module-content :deep(th[data-row]) {
  cursor: pointer;
}
.module-content :deep(td.cell-selected),
.module-content :deep(th.cell-selected) {
  outline: 2px solid var(--blue-400);
  outline-offset: -2px;
}

/*
  Quill 에디터 콘텐츠 스타일 - 미리보기에서 서식 표시
  블록 요소: margin, padding 제거 (인라인 스타일과 일치)
  단, td/th 내부의 텍스트 요소만 적용하여 테이블 자체의 padding은 보존
*/
.module-content :deep(td p),
.module-content :deep(td h1),
.module-content :deep(td h2),
.module-content :deep(td h3),
.module-content :deep(th p),
.module-content :deep(th h1),
.module-content :deep(th h2),
.module-content :deep(th h3) {
  margin: 0 !important;
  padding: 0 !important;
}

.module-content :deep(strong) {
  font-weight: 700;
}

.module-content :deep(em) {
  font-style: italic;
}

.module-content :deep(u) {
  text-decoration: underline;
}

.module-content :deep(s) {
  text-decoration: line-through;
}

/*
  Quill getSemanticHTML는 글머리=<ul>, 번호=<ol>로 시맨틱 태그를 출력한다(data-list 없음).
  Tailwind preflight가 ul/ol의 마커를 list-style:none으로 제거하므로,
  태그 기준으로 글머리(<ul>)는 블릿(•), 번호(<ol>)는 숫자(1.)가 보이도록 복원한다.
  → 상단 미리보기 버튼/이메일 출력과 동일하게 표시된다.
*/

/* 글머리 기호(<ul>): 네이티브 블릿(•) 표시 */
.module-content :deep(ul) {
  margin: 0;
  padding-left: 1.5em;
  list-style: disc outside;
}

/* 번호 목록(<ol>): 카운터(::before)로 1. 2. 3. 표시 */
.module-content :deep(ol) {
  padding: 0;
  margin: 0;
  counter-reset: item;
  list-style: none;
}

.module-content :deep(li) {
  margin: 0.25em 0;
}
.module-content :deep(ol li) {
  counter-increment: item;
}
.module-content :deep(ol li::before) {
  content: counter(item) '. ';
  font-weight: bold;
}
.module-content :deep(a) {
  color: #0066cc;
  font-weight: 600;
  text-decoration: underline;
  pointer-events: none; /* 캔버스에서 링크 클릭 방지 */
}

/* 헤더 크기 설정 (margin은 위의 통합 규칙에서 0으로 설정됨) */
.module-content :deep(h1) {
  font-size: 22px;
  font-weight: 700;
}

.module-content :deep(h2) {
  font-size: 20px;
  font-weight: 700;
}

.module-content :deep(h3) {
  font-size: 18px;
  font-weight: 700;
}
</style>
