<template>
  <div
    @click="$emit('select', module.id)"
    :class="[
      'relative group cursor-pointer border-2 transition-all',
      isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-transparent hover:border-gray-300',
    ]"
  >
    <!-- 모듈 컨텐츠 -->
    <div v-html="renderedHtml" class="module-content"></div>

    <!-- 선택시 표시되는 컨트롤 버튼들 -->
    <div
      v-if="isSelected"
      class="absolute top-2 right-2 flex space-x-1 bg-white rounded shadow-md border"
    >
      <button
        @click.stop="$emit('move-up', module.id)"
        :disabled="index === 0"
        class="p-1 text-xs hover:bg-gray-100 disabled:text-gray-300"
        title="위로 이동"
      >
        ↑
      </button>
      <button
        @click.stop="$emit('move-down', module.id)"
        class="p-1 text-xs hover:bg-gray-100"
        title="아래로 이동"
      >
        ↓
      </button>
      <button
        @click.stop="$emit('duplicate', module.id)"
        class="p-1 text-xs hover:bg-gray-100"
        title="복사"
      >
        복사 📋
      </button>
      <button
        @click.stop="$emit('delete', module.id)"
        class="p-1 text-xs hover:bg-gray-100 text-red-600"
        title="삭제"
      >
        삭제 🗑️
      </button>
    </div>

    <!-- 호버시 표시되는 레이블 -->
    <div
      v-if="!isSelected"
      class="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity"
    >
      {{ moduleMetadata?.name }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ModuleInstance } from '@/types'
import { useModuleRenderer } from '@/composables/useModuleRenderer'

interface Props {
  module: ModuleInstance
  index: number
  isSelected: boolean
}

const props = defineProps<Props>()

defineEmits<{
  select: [moduleId: string]
  'move-up': [moduleId: string]
  'move-down': [moduleId: string]
  duplicate: [moduleId: string]
  delete: [moduleId: string]
}>()

const { renderedHtml, moduleMetadata } = useModuleRenderer(props.module.id)
</script>

<style scoped>
.module-content :deep(*) {
  max-width: 100%;
}

.module-content :deep(img) {
  max-width: 100%;
  height: auto;
}

/* Quill 에디터 콘텐츠 스타일 - 미리보기에서 서식 표시 */
/* 블록 요소: margin, padding 제거 (인라인 스타일과 일치) */
.module-content :deep(p),
.module-content :deep(h1),
.module-content :deep(h2),
.module-content :deep(h3) {
  margin: 0;
  padding: 0;
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

.module-content :deep(ul) {
  padding: 0;
  margin: 0;
}
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

/* data-list="bullet"일 때 · 표시 */
.module-content :deep(ol:has(li[data-list='bullet'])) {
  counter-reset: none;
}

.module-content :deep(ol li[data-list='bullet']) {
  counter-increment: none;
}

.module-content :deep(ol li[data-list='bullet']::before) {
  content: '· ';
  font-weight: 700;
}
.module-content :deep(a) {
  color: #0066cc;
  font-weight: 600;
  text-decoration: underline;
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
