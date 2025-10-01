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
</style>
