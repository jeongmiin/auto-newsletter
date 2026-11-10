<template>
  <!-- 행 전체를 고른 상태의 좌측 패널 — 레이아웃(단 수)·너비 조정·모바일 가로 유지만 다룬다.
       모듈 속성은 그 열을 한 번 더 눌러 고른다. ModuleForm 과 같은 모양이라 같은 스타일 범위(.module-form)를 쓴다. -->
  <div v-if="row" class="module-form row-layout-panel">
    <div class="gg-panel-title-bar p-4 pb-3 flex items-center justify-between gap-2">
      <p class="gg-panel-title truncate">{{ row.columns }}단 컬럼</p>
    </div>

    <div class="px-[25px] pt-4 pb-4 border-b">
      <!-- 1단으로 합치면 이 행의 모듈이 한 열에 위아래로 쌓인다(사라지지 않는다) -->
      <p class="gg-field-label !mb-2.5">레이아웃</p>
      <div class="col-seg">
        <button
          v-for="n in MAX_COLUMNS"
          :key="`rowseg-${n}`"
          type="button"
          class="col-seg-btn"
          :class="{ 'is-active': row.columns === n }"
          @click="setColumnsTo(n)"
          v-tooltip.top="n === 1 ? '이 행을 1단으로 (모듈은 한 열에 위아래로 쌓여요)' : `이 행을 ${n}단으로 (모바일은 세로로 쌓임)`"
        >{{ n }}단</button>
      </div>

      <ColumnWidthControls
        v-if="row.columns > 1"
        class="mt-6"
        :group-id="row.groupId"
        :row-index="row.rowIndex"
        :columns="row.columns"
      />

      <!-- 모바일에서도 가로 유지 — 켜면 좁은 폭에서도 세로로 쌓지 않고 컬럼 비율 그대로 나란히 둔다 -->
      <template v-if="row.columns > 1">
        <div class="flex items-center gap-2 mt-6">
          <span class="gg-field-label !mb-0 flex-1">모바일에서도 가로 유지</span>
          <ToggleSwitch :modelValue="keepInline" @update:modelValue="onKeepInlineToggle" />
        </div>
        <p class="hint-text">끄면 모바일 폭에서 컬럼이 세로로 쌓입니다</p>

        <!-- 모바일 배치 — 세로로 쌓였을 때의 모양을 그대로 그린 카드 두 장 중에서 고른다.
             칸 번호를 떠올리지 않아도 되게, 그림은 그 행의 실제 칸 내용(이미지/글)으로 그린다. -->
        <template v-if="!keepInline">
          <p class="gg-field-label !mb-2.5 mt-6">모바일 배치</p>
          <div class="mb-cards" role="radiogroup" aria-label="모바일 배치">
            <!-- key 는 자리(i)로 둔다. reverse 로 두면 좌우를 바꿀 때 카드 DOM 두 개가 자리를 맞바꾸며
                 각각 is-active 가 켜졌다 꺼져 테두리 전환이 깜빡였다. 카드 순서는 내용 기준으로 고정이라 자리가 곧 카드다 -->
            <button
              v-for="(opt, i) in layoutOptions"
              :key="i"
              type="button"
              class="mb-card"
              :class="{ 'is-active': mobileReverse === opt.reverse }"
              role="radio"
              :aria-checked="mobileReverse === opt.reverse"
              :aria-label="opt.label"
              :title="opt.label"
              @click="setMobileReverse(opt.reverse)"
            >
              <span v-if="mobileReverse === opt.reverse" class="material-symbols-outlined mb-card-check" aria-hidden="true">check</span>
              <!-- 왼쪽에 칸 이름(A·B), 오른쪽에 휴대폰 화면 — 이름은 칸과 같은 높이에 나란히 둔다.
                   카드 아래 글로 'A 칸 위'라 적는 대신, 그림 옆 글자만 보고 순서를 알아보게 한다 -->
              <span class="mb-visual" aria-hidden="true">
                <span class="mb-letters">
                  <span v-for="blk in opt.blocks" :key="blk.column" class="mb-letter"><span class="col-badge mb-letter-dot">{{ blk.colorName }}</span></span>
                </span>
                <span class="mb-phone">
                  <span
                    v-for="blk in opt.blocks"
                    :key="blk.column"
                    class="mb-block"
                    :class="`mb-block--${blk.kind}`"
                  >
                    <template v-if="blk.kind === 'image'">
                      <span class="material-symbols-outlined mb-img-icon">image</span>
                    </template>
                    <template v-else>
                      <span class="mb-line mb-line--title"></span>
                      <span class="mb-line"></span>
                      <span class="mb-line mb-line--short"></span>
                      <span v-if="blk.button" class="mb-pill"></span>
                    </template>
                  </span>
                </span>
              </span>
            </button>
          </div>
          <p class="hint-text">PC에서는 나란히 그대로 보여요</p>
        </template>
      </template>
    </div>

    <p class="hint-text px-[25px] pt-4">*열 안의 모듈을 한 번 더 누르면 그 모듈의 내용을 고칠 수 있어요.</p>
  </div>
</template>

<script setup lang="ts">
/**
 * 2단 행을 '행 전체'로 골랐을 때의 패널 (Figma 745-3908 의 레이아웃·너비 조정 부분만).
 *
 * 전에는 행을 고르면 선택이 비워져 패널이 레일 메뉴로 돌아갔고, 너비 조정은 열을 고른 뒤
 * 그 열이 비어 있을 때만 보였다. 두 열이 다 찬 행은 너비를 바꿀 길이 없어 여기로 뺐다.
 * 행 좌표는 moduleStore.selectedRow 에 있다(캔버스가 고른다).
 */
import { computed } from 'vue'
import ToggleSwitch from 'primevue/toggleswitch'
import { useModuleStore } from '@/stores/moduleStore'
import { MAX_COLUMNS } from '@/utils/groupLayout'
import ColumnWidthControls from './ColumnWidthControls.vue'
import { COLUMN_COLORS, columnColorSlots } from '@/utils/columnColor'

const moduleStore = useModuleStore()

/** 고른 행의 지금 상태 — 행이 지워졌거나 그룹이 사라졌으면 null(패널을 비운다) */
const row = computed(() => {
  const sel = moduleStore.selectedRow
  if (!sel) return null
  const group = moduleStore.groups.find((g) => g.id === sel.groupId)
  const columns = group?.rows?.[sel.rowIndex]
  if (!group || columns === undefined) return null
  const first = moduleStore.modules
    .filter((m) => m.groupId === group.id && (m.rowIndex ?? 0) === sel.rowIndex)
    .sort((a, b) => a.order - b.order)[0]
  return { groupId: group.id, rowIndex: sel.rowIndex, columns, firstMemberId: first?.id ?? null }
})

/** 단 수 바꾸기 — 행 단위 동작이라 행의 아무 모듈로 split/unsplit 하면 된다(ModuleForm 과 같은 반복) */
const setColumnsTo = (n: number): void => {
  const current = row.value
  if (!current?.firstMemberId) return
  const id = current.firstMemberId
  let cur = current.columns
  let guard = 0
  while (cur < n && guard++ < 6) {
    const r = moduleStore.splitModuleColumns(id)
    if (r == null || r === cur) break
    cur = r
  }
  while (cur > n && guard++ < 6) {
    const r = moduleStore.unsplitModuleColumns(id)
    if (r == null || r === cur) break
    cur = r
  }
  // split/unsplit 이 모듈을 선택해 버리면 행 선택이 풀린다 — 행 패널에 머무른다
  moduleStore.selectRow(current.groupId, current.rowIndex)
}

const keepInline = computed(() =>
  row.value ? moduleStore.rowKeepsInline(row.value.groupId, row.value.rowIndex) : false,
)
const onKeepInlineToggle = (on: boolean): void => {
  if (row.value) moduleStore.setRowKeepInline(row.value.groupId, row.value.rowIndex, on)
}

// ── 모바일에서 위에 올 칸 ──────────────────────────────────────────────
const mobileReverse = computed(() =>
  row.value ? moduleStore.rowMobileReversed(row.value.groupId, row.value.rowIndex) : false,
)
const setMobileReverse = (on: boolean): void => {
  if (row.value) moduleStore.setRowMobileReverse(row.value.groupId, row.value.rowIndex, on)
}
/** 카드에 그릴 칸 한 개 — 칸 맨 위 모듈이 단일 이미지면 이미지 블록, 아니면 글 줄(버튼이 있으면 알약 하나 더) */
interface ColumnBlock {
  column: number
  kind: 'image' | 'text'
  button: boolean
  /** 칸 고유 색(utils/columnColor) — 내용을 따라가서 좌우를 바꿔도 같다 */
  color: string
  colorName: string
  colorSlot: number
}
const BUTTON_MODULES = new Set(['ModuleOneButton', 'ModuleSmallButton', 'ModuleTwoButton'])
const columnMembers = (columnIndex: number) => {
  const current = row.value
  return current
    ? moduleStore.modules
        .filter((m) => m.groupId === current.groupId && (m.rowIndex ?? 0) === current.rowIndex && (m.columnIndex ?? 0) === columnIndex)
        .sort((a, b) => a.order - b.order)
    : []
}
const columnBlock = (columnIndex: number, colorSlot: number): ColumnBlock => {
  const members = columnMembers(columnIndex)
  const color = COLUMN_COLORS[colorSlot] ?? COLUMN_COLORS[0]
  return {
    column: columnIndex,
    kind: members[0]?.moduleId === 'ModuleImg' ? 'image' : 'text',
    button: members.some((m) => BUTTON_MODULES.has(m.moduleId)),
    color: color.css,
    colorName: color.name,
    colorSlot,
  }
}
/**
 * 카드 두 장 — 그림은 쌓였을 때의 순서 그대로이고, 칸마다 고유 색 점을 단다(캔버스의 칸 위 점과 같은 색).
 * 칸을 **위치(왼쪽/오른쪽)가 아니라 색**으로 부른다 — 위치로 부르면 캔버스에서 좌우를 바꾸는 순간
 * '왼쪽 칸'이 다른 내용을 가리켜, 체크가 옮겨 가는 것처럼 보였다. 색은 내용을 따라가서 바뀌지 않는다.
 * 이름: 한쪽 칸만 이미지면 '이미지 위 / 글 위', 같은 종류끼리면 'A 칸 위 / B 칸 위'(A=파랑, B=주황 점).
 * 순서: 늘 A가 위인 카드가 앞이다 — 좌우를 바꿔도 카드 자리와 체크가 그대로 남는다.
 */
const layoutOptions = computed(() => {
  const current = row.value
  const group = current ? moduleStore.groups.find((g) => g.id === current.groupId) : undefined
  const slots = columnColorSlots(current ? group?.swappedRows?.[current.rowIndex] : false)
  const left = columnBlock(0, slots[0])
  const right = columnBlock(1, slots[1])
  const sameKind = left.kind === right.kind
  const name = (top: ColumnBlock): string => {
    if (sameKind) return `${top.colorName} 칸 위`
    return top.kind === 'image' ? '이미지 위' : '글 위'
  }
  const options = [
    { reverse: false, blocks: [left, right], label: name(left) },
    { reverse: true, blocks: [right, left], label: name(right) },
  ]
  if (options[0].blocks[0].colorSlot !== 0) options.reverse()
  return options
})
</script>

<style scoped>
/* 모바일 배치 카드 — 고른 카드는 '2단' 세그먼트와 같은 진한 테두리 */
.mb-cards {
  display: flex;
  gap: 10px;
}
.mb-card {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 10px 10px;
  border: 1px solid var(--gray-200);
  border-radius: 10px;
  background: var(--white);
  cursor: pointer;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}
.mb-card:hover {
  border-color: var(--gray-300);
}
.mb-card.is-active {
  border-color: var(--gray-700);
  box-shadow: inset 0 0 0 1px var(--gray-700);
}
.mb-card-check {
  position: absolute;
  top: 6px;
  right: 6px;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--gray-700);
  color: var(--white);
  font-size: 14px;
}
/* 휴대폰 화면 — 세로로 긴 상자 안에 칸 두 개 */
.mb-phone {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 64px;
  padding: 6px 5px;
  border: 1.5px solid var(--gray-300);
  border-radius: 9px;
  background: var(--white);
}
.mb-block {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  height: 40px;
  border-radius: 3px;
}
.mb-block--image {
  align-items: center;
  background: var(--gray-200);
}
.mb-img-icon {
  font-size: 18px;
  color: var(--gray-500);
}
.mb-block--text {
  padding: 0 3px;
}
.mb-line {
  display: block;
  height: 3px;
  border-radius: 2px;
  background: var(--gray-300);
}
.mb-line--title {
  width: 70%;
  height: 4px;
  background: var(--gray-500);
}
.mb-line--short {
  width: 55%;
}
.mb-pill {
  display: block;
  width: 22px;
  height: 6px;
  margin-top: 1px;
  border-radius: 3px;
  background: var(--gray-400);
}
/* 칸 이름(A·B) — 휴대폰 그림 왼쪽에, 칸과 같은 높이로 나란히 */
.mb-visual {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  /* 왼쪽 글자 줄(18px)+간격(6px)만큼 오른쪽도 비워 휴대폰 그림이 카드 한가운데 오게 한다.
     (글자+휴대폰 묶음을 가운데 두면 휴대폰이 오른쪽으로 쏠려 보였다) */
  padding-right: 24px;
}
.mb-letters {
  display: flex;
  flex-direction: column;
  gap: 4px;
  /* 휴대폰 상자의 테두리(1.5)+안쪽 여백(6)만큼 내려 칸과 줄을 맞춘다 */
  padding-top: 7.5px;
}
.mb-letter {
  display: grid;
  place-items: center;
  height: 40px;
}
/* 모양은 공통 .col-badge(main.css). 카드에서는 고르지 않은 쪽을 옅게, 글자 굵기는 한 단계 가볍게 */
.mb-letter-dot {
  font-weight: 800;
}
.mb-card:not(.is-active) .mb-letter-dot {
  border-color: var(--gray-300);
  color: var(--gray-700);
}
.mb-card.is-active .mb-letter-dot {
  border-color: var(--gray-500);
}

</style>
