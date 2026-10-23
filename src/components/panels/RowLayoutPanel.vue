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
</script>
