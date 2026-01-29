<template>
  <div class="h-screen flex bg-gray-50">
    <!-- 왼쪽 모듈 패널 -->
    <ModulePanel class="w-72 xl:w-80 border-r bg-white flex-shrink-0" />

    <!-- 중앙 캔버스 -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- 상단 툴바 -->
      <EditorToolbar class="border-b bg-white" />

      <!-- 캔버스 영역 -->
      <CanvasArea class="flex-1" />
    </div>

    <!-- 오른쪽 속성 패널 (리사이즈 가능) -->
    <div class="flex flex-shrink-0" :style="{ width: `${propertiesPanelWidth}px` }">
      <!-- 리사이즈 핸들 -->
      <div
        class="w-1 hover:w-1.5 bg-transparent hover:bg-blue-400 cursor-col-resize transition-all flex-shrink-0 group"
        @mousedown="startResize"
      >
        <div
          class="w-full h-full opacity-0 group-hover:opacity-100 transition-opacity"
          :class="{ 'opacity-100 bg-blue-500': isResizing }"
        ></div>
      </div>
      <!-- 속성 패널 -->
      <PropertiesPanel class="flex-1 border-l bg-white" />
    </div>

    <!-- 리사이즈 오버레이 (드래그 중일 때만 표시) -->
    <div
      v-if="isResizing"
      class="fixed inset-0 z-50 cursor-col-resize"
      @mousemove="onResize"
      @mouseup="stopResize"
      @mouseleave="stopResize"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import ModulePanel from '@/components/panels/ModulePanel.vue'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import CanvasArea from '@/components/editor/CanvasArea.vue'
import PropertiesPanel from '@/components/panels/PropertiesPanel.vue'

// 속성 패널 너비 상태
const MIN_WIDTH = 280
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 384 // 기본 w-96

const propertiesPanelWidth = ref(DEFAULT_WIDTH)
const isResizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)

// 로컬 스토리지에서 저장된 너비 불러오기
onMounted(() => {
  const savedWidth = localStorage.getItem('propertiesPanelWidth')
  if (savedWidth) {
    const width = parseInt(savedWidth, 10)
    if (width >= MIN_WIDTH && width <= MAX_WIDTH) {
      propertiesPanelWidth.value = width
    }
  }
})

// 리사이즈 시작
const startResize = (e: MouseEvent) => {
  isResizing.value = true
  startX.value = e.clientX
  startWidth.value = propertiesPanelWidth.value
  e.preventDefault()
}

// 리사이즈 중
const onResize = (e: MouseEvent) => {
  if (!isResizing.value) return

  // 왼쪽으로 드래그하면 너비가 커지고, 오른쪽으로 드래그하면 줄어듦
  const diff = startX.value - e.clientX
  const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.value + diff))
  propertiesPanelWidth.value = newWidth
}

// 리사이즈 종료
const stopResize = () => {
  if (isResizing.value) {
    isResizing.value = false
    // 로컬 스토리지에 저장
    localStorage.setItem('propertiesPanelWidth', propertiesPanelWidth.value.toString())
  }
}

// 전역 마우스 이벤트 (오버레이 밖에서 마우스를 놓았을 때 대비)
const handleGlobalMouseUp = () => {
  stopResize()
}

onMounted(() => {
  window.addEventListener('mouseup', handleGlobalMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mouseup', handleGlobalMouseUp)
})
</script>
