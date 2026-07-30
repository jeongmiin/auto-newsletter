<template>
  <!-- 직접 구성 패널 (Figma 717-9607) — 캔버스의 빈 컬럼에서 '직접 구성'을 누르면 열린다.
       그 컬럼에 넣을 구성 요소를 체크하면 즉시 해당 컬럼에 추가되고, 추가된 모듈이 선택되어
       좌측 패널이 그 모듈의 속성 폼(구성 요소 + 세부 속성)으로 전환된다. -->
  <div v-if="target" class="column-compose-panel">
    <h2 class="panel-title">직접 구성</h2>
    <p class="panel-desc">
      {{ positionLabel }}에 넣을 요소를 선택하세요.<br />
      체크하면 이 컬럼에 바로 추가됩니다.
    </p>

    <ColumnElementsField
      :group-id="target.groupId"
      :row-index="target.rowIndex"
      :column-index="target.columnIndex"
    />

    <button type="button" class="cancel-btn" @click="moduleStore.clearColumnTarget()">
      직접 구성 취소
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import ColumnElementsField from './ColumnElementsField.vue'

const moduleStore = useModuleStore()

const target = computed(() => moduleStore.columnTarget)

// "2단 중 2번 컬럼"처럼 대상 위치를 알려준다(여러 행 그룹이면 행 번호도 함께).
const positionLabel = computed(() => {
  const t = target.value
  if (!t) return '이 컬럼'
  const group = moduleStore.groups.find((g) => g.id === t.groupId)
  const rows = group?.rows ?? []
  const columns = rows[t.rowIndex] ?? 1
  const colPart = `${columns}단 중 ${t.columnIndex + 1}번 컬럼`
  return rows.length > 1 ? `${t.rowIndex + 1}행 ${colPart}` : colPart
})
</script>

<style scoped>
.column-compose-panel {
  width: var(--left-panel-width, 360px);
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e5e8eb;
  height: 100%;
  overflow-y: auto;
  padding: 24px 23px 29px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.panel-title {
  font-size: 20px;
  font-weight: 500;
  color: #191f28;
  letter-spacing: -0.2px;
}
.panel-desc {
  font-size: 13px;
  line-height: 1.6;
  color: #6b7684;
  word-break: keep-all;
  margin-top: -8px;
}
.cancel-btn {
  align-self: flex-start;
  height: 36px;
  padding: 0 14px;
  border: 1px solid #e5e8eb;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  color: #4e5968;
  cursor: pointer;
}
.cancel-btn:hover {
  background: #f7f8fa;
}
</style>
