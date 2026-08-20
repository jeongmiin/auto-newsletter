<template>
  <!-- 테두리 위치 — 아이콘 버튼 다중 선택 (전체 · 상단 · 하단 · 좌측 · 우측).
       그룹 스타일 패널과 모듈 속성(테두리 위치)이 함께 쓴다. -->
  <div class="bd-side-row">
    <button
      type="button"
      class="bd-side-btn"
      :class="{ 'is-active': allSelected }"
      v-tooltip.top="'전체'"
      @click="toggleAll"
    >
      <span class="material-symbols-outlined">border_outer</span>
      <span class="bd-side-label">전체</span>
    </button>
    <button
      v-for="opt in SIDE_OPTIONS"
      :key="opt.key"
      type="button"
      class="bd-side-btn"
      :class="{ 'is-active': modelValue.includes(opt.key) }"
      v-tooltip.top="opt.label"
      @click="toggleSide(opt.key)"
    >
      <span class="material-symbols-outlined">{{ opt.icon }}</span>
      <span class="bd-side-label">{{ opt.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BorderSide } from '@/types'
import { ALL_BORDER_SIDES } from '@/utils/groupStyle'

const props = defineProps<{ modelValue: BorderSide[] }>()
const emit = defineEmits<{ 'update:modelValue': [BorderSide[]] }>()

const SIDE_OPTIONS: { key: BorderSide; label: string; icon: string }[] = [
  { key: 'top', label: '상단', icon: 'border_top' },
  { key: 'bottom', label: '하단', icon: 'border_bottom' },
  { key: 'left', label: '좌측', icon: 'border_left' },
  { key: 'right', label: '우측', icon: 'border_right' },
]

const allSelected = computed(() => ALL_BORDER_SIDES.every((s) => props.modelValue.includes(s)))

const emitSides = (sides: BorderSide[]) =>
  emit('update:modelValue', ALL_BORDER_SIDES.filter((s) => sides.includes(s)))

const toggleAll = () => emitSides(allSelected.value ? [] : [...ALL_BORDER_SIDES])

const toggleSide = (side: BorderSide) => {
  const set = new Set(props.modelValue)
  if (set.has(side)) set.delete(side)
  else set.add(side)
  emitSides([...set])
}
</script>

<style scoped>
.bd-side-row {
  display: flex;
  gap: 6px;
}
.bd-side-btn {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 2px;
  padding: 3px 2px;
  border: 1px solid var(--gray-200);
  border-radius: 4px;
  background: var(--white);
  color: var(--gray-700);
  cursor: pointer;
}
.bd-side-btn:hover {
  background: var(--gray-50);
}
.bd-side-btn.is-active {
  background: var(--blue-50);
  border-color: var(--blue-400);
  color: var(--blue-400);
}
.bd-side-btn .material-symbols-outlined {
  font-size: 20px;
  line-height: 1;
}
.bd-side-label {
  font-size: 11px;
  letter-spacing: -0.11px;
  line-height: 1rem;
}
</style>
