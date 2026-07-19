<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- 상단 헤더: 로고 + 파일 관리 버튼들 -->
    <AppHeader />

    <!-- 메인 영역: 아이콘 레일 / 모듈 패널 / 캔버스 / 속성 패널 -->
    <div class="flex-1 flex min-h-0">
      <!-- 좌측 아이콘 레일 (신규 디자인 IA) -->
      <EditorSidebar />

      <!-- 좌측 컨텍스트 패널: 캔버스에서 모듈/그룹을 선택 중이면 그게 최우선, 아니면 활성 레일 메뉴에 따라 전환 -->
      <GlobalStylePanel v-if="!hasSelection && editorStore.activeMenu === 'style'" />
      <PointColorPanel v-else-if="!hasSelection && editorStore.activeMenu === 'point'" />
      <CategoryModulePanel
        v-else-if="!hasSelection && activeCategory"
        :category="activeCategory"
      />
      <!-- 모듈 순서(구 '모듈 목차') — 레일의 '모듈 순서' 메뉴에서만 열린다 -->
      <ModuleOutlinePanel v-else-if="!hasSelection && editorStore.activeMenu === 'order'" />
      <SelectedItemPanel v-else-if="hasSelection" />
      <ModulePanel v-else class="w-72 xl:w-80 border-r bg-white flex-shrink-0" />

      <!-- 중앙 캔버스 -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- 캔버스 상단 툴바 (화면 크기 + 전체 삭제) -->
        <EditorToolbar />

        <!-- 캔버스 영역 -->
        <CanvasArea class="flex-1" />
      </div>

      <!-- 오른쪽 속성 패널 (리사이즈 가능) -->
      <div class="flex flex-shrink-0" :style="{ width: `${propertiesPanelWidth}px` }">
        <!-- 리사이즈 핸들 -->
        <div
          class="resize-handle w-2 cursor-col-resize flex-shrink-0 relative group"
          :class="{ 'is-resizing': isResizing }"
          @mousedown="startResize"
        >
          <!-- 핸들 배경 -->
          <div class="absolute inset-0 bg-gray-200 group-hover:bg-blue-100 transition-colors"></div>
          <!-- 핸들 그립 라인들 -->
          <div class="absolute inset-y-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
            <div class="w-0.5 h-6 bg-gray-600 group-hover:bg-blue-500 rounded-full transition-colors"></div>
          </div>
          <!-- 호버/드래그 시 강조 라인 -->
          <div
            class="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
            :class="{ 'opacity-100': isResizing }"
          ></div>
        </div>
        <!-- 속성 패널 -->
        <PropertiesPanel class="flex-1 border-l bg-white" />
      </div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import EditorSidebar from '@/components/editor/EditorSidebar.vue'
import ModulePanel from '@/components/panels/ModulePanel.vue'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import ModuleOutlinePanel from '@/components/editor/ModuleOutlinePanel.vue'
import CanvasArea from '@/components/editor/CanvasArea.vue'
import PropertiesPanel from '@/components/panels/PropertiesPanel.vue'
import GlobalStylePanel from '@/components/panels/GlobalStylePanel.vue'
import PointColorPanel from '@/components/panels/PointColorPanel.vue'
import CategoryModulePanel from '@/components/panels/CategoryModulePanel.vue'
import SelectedItemPanel from '@/components/panels/SelectedItemPanel.vue'
import { useEditorStore } from '@/stores/editorStore'
import { useModuleStore } from '@/stores/moduleStore'

const editorStore = useEditorStore()
const moduleStore = useModuleStore()

// 캔버스에서 모듈/그룹을 선택 중이면 좌측 컨텍스트 패널이 그 속성 편집으로 전환된다(레일 메뉴보다 우선).
// 단, 레일 메뉴를 방금 명시적으로 클릭했으면(forceRailPanel) 선택이 남아있어도 그 메뉴를 그대로 보여준다
// — 그룹 멤버를 선택한 채로 카테고리 메뉴에서 원소 모듈을 추가하면 그 그룹에 삽입되는 흐름을 유지하기 위함.
const hasSelection = computed(
  () => (!!moduleStore.selectedModuleId || !!moduleStore.selectedGroupId) && !editorStore.forceRailPanel,
)

const CATEGORY_MENUS = ['text', 'image', 'button', 'table'] as const
const activeCategory = computed(() => {
  const menu = editorStore.activeMenu
  return (CATEGORY_MENUS as readonly string[]).includes(menu)
    ? (menu as (typeof CATEGORY_MENUS)[number])
    : null
})

// 속성 패널 너비 상태
const MIN_WIDTH = 300
const MAX_WIDTH = 900
const DEFAULT_WIDTH = 640 // 넓게 펼쳐진 상태를 기본값으로 (이후 늘리거나 줄일 수 있음)
const STORAGE_KEY = 'propertiesPanelWidth_v2'

const propertiesPanelWidth = ref(DEFAULT_WIDTH)
const isResizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)

// 로컬 스토리지에서 저장된 너비 불러오기
onMounted(() => {
  const savedWidth = localStorage.getItem(STORAGE_KEY)
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
    localStorage.setItem(STORAGE_KEY, propertiesPanelWidth.value.toString())
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

<style scoped>
/* 리사이즈 핸들 스타일 */
.resize-handle {
  touch-action: none;
  user-select: none;
}

.resize-handle:hover {
  cursor: col-resize;
}

.resize-handle.is-resizing {
  cursor: col-resize;
}

.resize-handle.is-resizing > div:first-child {
  background-color: #dbeafe; /* blue-100 */
}

.resize-handle.is-resizing .w-0\.5.h-6 {
  background-color: #3b82f6; /* blue-500 */
}
</style>
