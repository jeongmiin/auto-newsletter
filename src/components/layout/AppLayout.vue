<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- 상단 헤더: 로고 + 파일 관리 버튼들 -->
    <AppHeader />

    <!-- 메인 영역: 아이콘 레일 / 모듈 패널 / 캔버스 / 속성 패널 -->
    <div class="flex-1 flex min-h-0">
      <!-- 좌측 아이콘 레일 (신규 디자인 IA) -->
      <EditorSidebar />

      <!-- 좌측 컨텍스트 패널: 캔버스에서 모듈/그룹을 선택 중이면 그게 최우선, 아니면 활성 레일 메뉴에 따라 전환.
           오른쪽 가장자리 리사이즈 핸들로 너비 조절(모든 좌측 패널이 --left-panel-width를 공유). -->
      <div class="flex flex-shrink-0 min-h-0" :style="{ '--left-panel-width': `${leftPanelWidth}px` }">
        <GlobalStylePanel v-if="!hasSelection && editorStore.activeMenu === 'style'" />
        <PointColorPanel v-else-if="!hasSelection && editorStore.activeMenu === 'point'" />
        <CategoryModulePanel
          v-else-if="!hasSelection && activeCategory"
          :category="activeCategory"
        />
        <!-- 모듈 순서(구 '모듈 목차') — 레일의 '모듈 순서' 메뉴에서만 열린다 -->
        <ModuleOutlinePanel v-else-if="!hasSelection && editorStore.activeMenu === 'order'" />
        <SelectedItemPanel v-else-if="hasSelection" />
        <ModulePanel
          v-else
          class="border-r bg-white flex-shrink-0"
          :style="{ width: `${leftPanelWidth}px` }"
        />

        <!-- 리사이즈 핸들 (좌측 패널 오른쪽 가장자리, 오른쪽으로 끌면 넓어짐) -->
        <div
          class="resize-handle w-2 cursor-col-resize flex-shrink-0 relative group"
          :class="{ 'is-resizing': isLeftResizing }"
          @mousedown="startLeftResize"
        >
          <div class="absolute inset-0 bg-gray-200 group-hover:bg-blue-100 transition-colors"></div>
          <div class="absolute inset-y-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
            <div class="w-0.5 h-6 bg-gray-600 group-hover:bg-blue-500 rounded-full transition-colors"></div>
          </div>
          <div
            class="absolute right-0 top-0 bottom-0 w-0.5 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
            :class="{ 'opacity-100': isLeftResizing }"
          ></div>
        </div>
      </div>

      <!-- 중앙 캔버스 (속성 편집은 좌측 컨텍스트 패널로 일원화 — 우측 속성 패널 제거) -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- 캔버스 상단 툴바 (화면 크기 + 전체 삭제) -->
        <EditorToolbar />

        <!-- 캔버스 영역 -->
        <CanvasArea class="flex-1" />
      </div>
    </div>

    <!-- 좌측 패널 리사이즈 오버레이 -->
    <div
      v-if="isLeftResizing"
      class="fixed inset-0 z-50 cursor-col-resize"
      @mousemove="onLeftResize"
      @mouseup="stopLeftResize"
      @mouseleave="stopLeftResize"
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

// ── 좌측 컨텍스트 패널 너비 상태 (오른쪽 가장자리 핸들로 조절) ──
const LEFT_MIN_WIDTH = 280
const LEFT_MAX_WIDTH = 720
const LEFT_DEFAULT_WIDTH = 360 // 기존 좌측 패널 기본 폭
const LEFT_STORAGE_KEY = 'leftPanelWidth_v1'

const leftPanelWidth = ref(LEFT_DEFAULT_WIDTH)
const isLeftResizing = ref(false)
const leftStartX = ref(0)
const leftStartWidth = ref(0)

onMounted(() => {
  const saved = localStorage.getItem(LEFT_STORAGE_KEY)
  if (saved) {
    const width = parseInt(saved, 10)
    if (width >= LEFT_MIN_WIDTH && width <= LEFT_MAX_WIDTH) leftPanelWidth.value = width
  }
})

const startLeftResize = (e: MouseEvent) => {
  isLeftResizing.value = true
  leftStartX.value = e.clientX
  leftStartWidth.value = leftPanelWidth.value
  e.preventDefault()
}

const onLeftResize = (e: MouseEvent) => {
  if (!isLeftResizing.value) return
  // 오른쪽으로 드래그하면 넓어지고, 왼쪽으로 드래그하면 좁아짐 (핸들이 오른쪽 가장자리)
  const diff = e.clientX - leftStartX.value
  leftPanelWidth.value = Math.min(
    LEFT_MAX_WIDTH,
    Math.max(LEFT_MIN_WIDTH, leftStartWidth.value + diff),
  )
}

const stopLeftResize = () => {
  if (isLeftResizing.value) {
    isLeftResizing.value = false
    localStorage.setItem(LEFT_STORAGE_KEY, leftPanelWidth.value.toString())
  }
}

// 전역 마우스 이벤트 (오버레이 밖에서 마우스를 놓았을 때 대비)
const handleGlobalMouseUp = () => {
  stopLeftResize()
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
