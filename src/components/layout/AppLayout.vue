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
        <!-- 캔버스 빈 컬럼에서 '직접 구성'을 누른 상태 — 그 컬럼의 구성 요소를 고르는 패널이 최우선 -->
        <ColumnComposePanel v-if="showComposePanel" />
        <GlobalStylePanel v-else-if="!hasSelection && editorStore.activeMenu === 'style'" />
        <PointColorPanel v-else-if="!hasSelection && editorStore.activeMenu === 'point'" />
        <CategoryModulePanel
          v-else-if="!hasSelection && activeCategory"
          :category="activeCategory"
        />
        <!-- AI 도구 — HTML 웹 링크 생성 -->
        <AiToolsPanel v-else-if="!hasSelection && editorStore.activeMenu === 'ai'" />
        <SelectedItemPanel v-else-if="hasSelection" />
        <ModulePanel
          v-else
          class="border-r bg-white flex-shrink-0"
          :style="{ width: `${leftPanelWidth}px` }"
        />

        <!-- 리사이즈 핸들 (좌측 패널 오른쪽 가장자리, 오른쪽으로 끌면 넓어짐) -->
        <div
          class="resize-handle cursor-col-resize flex-shrink-0 relative group"
          :class="{ 'is-resizing': isLeftResizing }"
          @mousedown="startLeftResize"
        >
          <div class="absolute inset-0 bg-gray-200 group-hover:bg-blue-100 transition-colors"></div>
          <div class="absolute inset-y-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity"></div>
          <div
            class="absolute right-0 top-0 bottom-0 w-0.5 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
            :class="{ 'opacity-100': isLeftResizing }"
          ></div>
        </div>
      </div>

      <!-- 번역 결과 도크 — '모듈 순서'의 왼쪽 버전. AI 도구 메뉴에서 번역을 돌려 둔 동안만 붙어 있고,
           다른 메뉴로 가면 숨고 돌아오면 다시 펼쳐진다(결과는 translationStore에 남아 있다).
           캔버스에서 모듈을 골라도 그대로다 — 카드를 눌러 모듈로 이동하는 흐름을 끊지 않기 위해. -->
      <TranslationPreviewPanel v-if="showTranslationPreview" />

      <!-- 중앙 캔버스 (화면 크기 토글·실행취소는 상단 헤더로 이동 · 전체 삭제는 추후 추가 예정) -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- 캔버스 영역 -->
        <CanvasArea class="flex-1" />
      </div>

      <!-- 우측 '모듈 순서' 패널 — 기본 닫힘. 레일의 '모듈 순서' 메뉴나 패널 왼쪽 탭으로 여닫는다 -->
      <ModuleOutlinePanel />
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
import ModuleOutlinePanel from '@/components/editor/ModuleOutlinePanel.vue'
import CanvasArea from '@/components/editor/CanvasArea.vue'
import GlobalStylePanel from '@/components/panels/GlobalStylePanel.vue'
import PointColorPanel from '@/components/panels/PointColorPanel.vue'
import CategoryModulePanel from '@/components/panels/CategoryModulePanel.vue'
import SelectedItemPanel from '@/components/panels/SelectedItemPanel.vue'
import ColumnComposePanel from '@/components/panels/ColumnComposePanel.vue'
import AiToolsPanel from '@/components/panels/AiToolsPanel.vue'
import TranslationPreviewPanel from '@/components/editor/TranslationPreviewPanel.vue'
import { useEditorStore } from '@/stores/editorStore'
import { useModuleStore } from '@/stores/moduleStore'
import { useTranslationStore } from '@/stores/translationStore'

const editorStore = useEditorStore()
const moduleStore = useModuleStore()
const translationStore = useTranslationStore()

// 캔버스에서 모듈/그룹을 선택 중이면 좌측 컨텍스트 패널이 그 속성 편집으로 전환된다(레일 메뉴보다 우선).
// 단, 레일 메뉴를 방금 명시적으로 클릭했으면(forceRailPanel) 선택이 남아있어도 그 메뉴를 그대로 보여준다
// — 그룹 멤버를 선택한 채로 카테고리 메뉴에서 원소 모듈을 추가하면 그 그룹에 삽입되는 흐름을 유지하기 위함.
const hasSelection = computed(
  () => (!!moduleStore.selectedModuleId || !!moduleStore.selectedGroupId) && !editorStore.forceRailPanel,
)

// 캔버스 빈 컬럼의 '직접 구성'으로 대상 컬럼이 지정된 상태 → 그 컬럼의 '구성 요소' 패널을 보여준다.
// (대상 컬럼에 요소가 추가되면 그 모듈이 선택되어 아래 SelectedItemPanel의 속성 폼으로 자연히 전환된다.
//  단, 레일 메뉴를 명시적으로 클릭했으면 그 메뉴가 우선 — 거기서 추가하는 모듈도 이 컬럼으로 들어간다.)
const showComposePanel = computed(
  () => !!moduleStore.columnTarget && !hasSelection.value && !editorStore.forceRailPanel,
)

// 번역 결과 도크 — AI 도구 메뉴에 있고 번역 결과가 있을 때만. 번역 전에는 아예 없다.
const showTranslationPreview = computed(
  () => editorStore.activeMenu === 'ai' && translationStore.preview.length > 0,
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
const LEFT_DEFAULT_WIDTH = 360 // 좌측 패널 기본 폭 — 진입 시 항상 이 값으로 시작(폭은 저장하지 않음)

// 리사이즈는 세션 내에서만 유지되고, 재진입 시 항상 360px로 초기화된다(localStorage 저장 안 함).
const leftPanelWidth = ref(LEFT_DEFAULT_WIDTH)
const isLeftResizing = ref(false)
const leftStartX = ref(0)
const leftStartWidth = ref(0)

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
  if (isLeftResizing.value) isLeftResizing.value = false
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
  background-color: var(--blue-100); /* blue-100 */
}

.resize-handle.is-resizing .w-0\.5.h-6 {
  background-color: var(--blue-400); /* blue-500 */
}
</style>
