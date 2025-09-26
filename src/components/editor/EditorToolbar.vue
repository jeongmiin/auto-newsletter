<template>
  <div class="flex items-center justify-between px-4 bg-white border-b p-2">
    <!-- 왼쪽: 기본 액션들 -->
    <div class="flex items-center space-x-2">
      <!-- <button
        @click="undo"
        :disabled="!canUndo"
        class="p-2 text-gray-600 hover:text-gray-800 disabled:text-gray-300"
        title="실행취소"
      >
        ↶
      </button>
      <button
        @click="redo"
        :disabled="!canRedo"
        class="p-2 text-gray-600 hover:text-gray-800 disabled:text-gray-300"
        title="다시실행"
      >
        ↷
      </button>
      <div class="w-px h-6 bg-gray-300"></div> -->
      <button @click="clearAll" class="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded">
        전체 삭제
      </button>
    </div>

    <!-- 중앙: 캔버스 설정 -->
    <div class="flex items-center space-x-4">
      <div class="flex items-center space-x-2">
        <span class="text-sm text-gray-600">미리보기:</span>
        <button
          @click="setCanvasWidth('mobile')"
          :class="[
            'px-3 py-1 text-sm rounded',
            canvasWidth === 'mobile'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100',
          ]"
        >
          📱 모바일
        </button>
        <button
          @click="setCanvasWidth('desktop')"
          :class="[
            'px-3 py-1 text-sm rounded',
            canvasWidth === 'desktop'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100',
          ]"
        >
          🖥️ 데스크톱
        </button>
      </div>
    </div>

    <!-- 오른쪽: 내보내기 -->
    <div class="flex items-center space-x-2">
      <button
        @click="previewEmail"
        class="px-4 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded"
      >
        미리보기
      </button>
      <button
        @click="exportHtml"
        class="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded"
      >
        HTML 복사
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()

// const canUndo = computed(() => editorStore.canUndo)
// const canRedo = computed(() => editorStore.canRedo)
const canvasWidth = computed(() => editorStore.canvasWidth)

// const undo = () => editorStore.undo()
// const redo = () => editorStore.redo()
const clearAll = () => moduleStore.clearAll()
const setCanvasWidth = (width: 'mobile' | 'desktop') => editorStore.setCanvasWidth(width)

const previewEmail = () => {
  window.open('/preview', '_blank')
}

const exportHtml = async () => {
  const html = await moduleStore.generateHtml()
  navigator.clipboard.writeText(html)
  alert('HTML이 복사되었습니다!')
}
</script>
