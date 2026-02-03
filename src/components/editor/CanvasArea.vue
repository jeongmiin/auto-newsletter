<template>
  <div class="flex-1 bg-gray-100 p-8 pb-32 overflow-auto">
    <div class="flex justify-center">
      <!-- 캔버스 컨테이너 -->
      <div
        :class="[
          'shadow-lg transition-all duration-300',
          canvasWidth === 'mobile' ? 'w-80' : 'w-full max-w-[680px]',
        ]"
        :style="canvasContainerStyle"
      >
        <!-- 모듈이 없을 때 -->
        <div
          v-if="modules.length === 0"
          class="h-96 flex items-center justify-center text-gray-500"
        >
          <div class="text-center max-w-sm px-4">
            <div class="text-5xl mb-4"><i class="pi pi-envelope text-blue-500"></i></div>
            <div class="text-xl font-semibold text-gray-700 mb-2">뉴스레터 만들기</div>
            <div class="text-sm text-gray-500 mb-6">
              왼쪽 패널에서 원하는 모듈을 클릭하면<br />
              여기에 추가됩니다
            </div>
            <div class="flex flex-col gap-2 text-left bg-gray-50 rounded-lg p-4 text-xs text-gray-600">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs font-bold">1</span>
                <span>왼쪽에서 모듈 선택하여 추가</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs font-bold">2</span>
                <span>모듈 클릭 후 오른쪽에서 내용 편집</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs font-bold">3</span>
                <span>완성 후 상단에서 파일 저장</span>
              </div>
            </div>
            <div class="mt-4 text-xs text-gray-400">
              또는 상단의 "파일 열기"로 이전 작업을 불러올 수 있습니다
            </div>
          </div>
        </div>

        <!-- 모듈 리스트 (드래그 앤 드롭 지원) -->
        <draggable
          v-else
          v-model="draggableModules"
          item-key="id"
          handle=".drag-handle"
          ghost-class="dragging-ghost"
          chosen-class="dragging-chosen"
          animation="200"
          class="min-h-full"
          @start="onDragStart"
          @end="onDragEnd"
        >
          <template #item="{ element: module, index }">
            <div class="relative group">
              <div
                class="drag-handle absolute left-0 top-0 bottom-0 w-8 flex flex-col items-center justify-center cursor-grab opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-blue-100/90 hover:bg-blue-200/90"
                title="마우스로 끌어서 순서를 변경하세요"
              >
                <i class="pi pi-bars text-blue-600 text-lg"></i>
                <span class="text-blue-600 text-[8px] mt-0.5">이동</span>
              </div>
              <ModuleRenderer
                :module="module"
                :index="index"
                :is-selected="selectedModuleId === module.id"
                @select="selectModule"
                @move-up="moveModuleUp"
                @move-down="moveModuleDown"
                @duplicate="duplicateModule"
                @delete="deleteModule"
              />
            </div>
          </template>
        </draggable>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import ModuleRenderer from '../modules/ModuleRenderer.vue'
import draggable from 'vuedraggable'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()

const modules = computed(() => moduleStore.modules)
const selectedModuleId = computed(() => moduleStore.selectedModuleId)
const canvasWidth = computed(() => editorStore.canvasWidth)
const wrapSettings = computed(() => editorStore.wrapSettings)

// 캔버스 컨테이너 스타일 (공통 속성 반영)
const canvasContainerStyle = computed(() => ({
  minHeight: '600px',
  backgroundColor: wrapSettings.value.backgroundColor,
  border: `${wrapSettings.value.borderWidth} ${wrapSettings.value.borderStyle} ${wrapSettings.value.borderColor}`,
}))

// 드래그 앤 드롭을 위한 양방향 바인딩
const draggableModules = computed({
  get: () => moduleStore.modules,
  set: (value) => {
    // 순서 업데이트
    moduleStore.modules.splice(0, moduleStore.modules.length, ...value)
    // order 값 재정렬
    moduleStore.modules.forEach((m, idx) => {
      m.order = idx
    })
    // 변경사항 표시
    moduleStore.isDirty = true
  },
})

const isDragging = ref(false)

const onDragStart = () => {
  isDragging.value = true
}

const onDragEnd = () => {
  isDragging.value = false
}

const selectModule = (moduleId: string) => {
  moduleStore.selectModule(moduleId)
}

const moveModuleUp = (moduleId: string) => {
  moduleStore.moveModuleUp(moduleId)
}

const moveModuleDown = (moduleId: string) => {
  moduleStore.moveModuleDown(moduleId)
}

const duplicateModule = (moduleId: string) => {
  moduleStore.duplicateModule(moduleId)
}

const deleteModule = (moduleId: string) => {
  moduleStore.removeModule(moduleId)
}
</script>

<style scoped>
/* 드래그 중인 요소의 고스트 스타일 */
.dragging-ghost {
  opacity: 0.5;
  background: #e5e7eb;
}

/* 드래그로 선택된 요소 스타일 */
.dragging-chosen {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 드래그 핸들 호버 효과 */
.drag-handle:active {
  cursor: grabbing;
}
</style>
