<template>
  <!-- 구성 요소 (Figma 717-9607) — 나눈 컬럼(직접 구성)에 넣을 원소를 체크로 추가/제거한다.
       체크 = 그 종류의 원소 모듈을 이 (그룹, 행, 컬럼)에 기본값으로 생성, 해제 = 그 원소를 제거.
       캔버스에서 직접 삭제해도 체크가 풀린다(존재 여부로 상태를 판정하므로 별도 저장 값이 없다).
       추가된 요소는 왼쪽 drag_indicator 핸들을 끌어 위아래 순서를 바꿀 수 있다(캔버스 배치 순서와 동일).
       ModuleForm(모듈 선택 상태)과 ColumnComposePanel(빈 컬럼 상태)이 함께 쓴다. -->
  <div class="cmp-field">
    <p class="cmp-title">구성 요소</p>
    <div class="cmp-list">
      <!-- 이미 추가된 요소 — 실제 배치 순서대로, 핸들 드래그로 순서 변경 -->
      <draggable
        v-if="presentRows.length"
        :model-value="presentRows"
        item-key="moduleId"
        handle=".cmp-drag"
        ghost-class="cmp-row--ghost"
        chosen-class="cmp-row--chosen"
        animation="180"
        class="cmp-list"
        @update:model-value="onReorder"
      >
        <template #item="{ element: row }">
          <div class="cmp-row">
            <span
              class="cmp-drag material-symbols-outlined"
              title="마우스로 끌어서 이 컬럼 안 순서를 변경하세요"
              >drag_indicator</span
            >
            <label class="cmp-check">
              <Checkbox
                :modelValue="true"
                :binary="true"
                @update:modelValue="toggleElement(row.kind, $event)"
              />
              <span class="cmp-label">{{ labelOf(row.kind) }}</span>
            </label>
          </div>
        </template>
      </draggable>

      <!-- 아직 추가되지 않은 요소 — 순서가 없으므로 핸들은 비활성(체크하면 맨 아래에 추가된다) -->
      <div v-for="el in absentRows" :key="el.kind" class="cmp-row">
        <span class="cmp-drag cmp-drag--off material-symbols-outlined">drag_indicator</span>
        <label class="cmp-check">
          <Checkbox
            :modelValue="false"
            :binary="true"
            @update:modelValue="toggleElement(el.kind, $event)"
          />
          <span class="cmp-label">{{ el.label }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Checkbox from 'primevue/checkbox'
import draggable from 'vuedraggable'
import { useModuleStore, type ComposedKind } from '@/stores/moduleStore'

const props = defineProps<{
  groupId: string
  rowIndex: number
  columnIndex: number
}>()

const moduleStore = useModuleStore()

// 미추가 요소를 보여주는 기본 순서 + 라벨
const COMPOSED_ELEMENTS: { kind: ComposedKind; label: string }[] = [
  { kind: 'image', label: '이미지' },
  { kind: 'title', label: '타이틀' },
  { kind: 'text', label: '텍스트' },
  { kind: 'button', label: '버튼' },
  { kind: 'smallButton', label: '작은 버튼' },
]
const labelOf = (kind: ComposedKind): string =>
  COMPOSED_ELEMENTS.find((el) => el.kind === kind)?.label ?? kind

// 이 컬럼에 이미 있는 요소 (배치 순서대로)
const presentRows = computed(() =>
  moduleStore.columnElements(props.groupId, props.rowIndex, props.columnIndex),
)
const absentRows = computed(() => {
  const present = new Set(presentRows.value.map((r) => r.kind))
  return COMPOSED_ELEMENTS.filter((el) => !present.has(el.kind))
})

const toggleElement = (kind: ComposedKind, on: boolean): void => {
  moduleStore.setColumnElement(props.groupId, props.rowIndex, props.columnIndex, kind, on)
}

// 드래그 종료 — 새 순서를 그대로 캔버스 배치 순서에 반영
const onReorder = (rows: { kind: ComposedKind; moduleId: string }[]): void => {
  moduleStore.reorderColumnElements(
    props.groupId,
    props.rowIndex,
    props.columnIndex,
    rows.map((r) => r.moduleId),
  )
}
</script>

<style scoped>
/* 구성 요소 리스트 (Figma 717-9607) — 드래그 핸들 + 체크박스 + 라벨 행 */
.cmp-title {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: -0.16px;
  color: #333d4b;
  margin-bottom: 12px;
}
.cmp-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cmp-row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 45px;
  padding: 0 12px 0 10px;
  background: #f7f8fa;
  border-radius: 8px;
}
.cmp-check {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  height: 100%;
  cursor: pointer;
}
.cmp-label {
  font-size: 14px;
  color: #333d4b;
  letter-spacing: -0.14px;
}
.cmp-drag {
  font-size: 24px;
  color: #8b95a1;
  cursor: grab;
  flex-shrink: 0;
  user-select: none;
}
.cmp-drag:active {
  cursor: grabbing;
}
/* 아직 추가되지 않은 요소 — 바꿀 순서가 없으므로 잡히지 않는다 */
.cmp-drag--off {
  color: #d1d6db;
  cursor: default;
}
.cmp-row--ghost {
  opacity: 0.45;
}
.cmp-row--chosen {
  background: #ebf3ff;
}
</style>
