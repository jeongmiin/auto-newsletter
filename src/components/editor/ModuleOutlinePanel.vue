<template>
  <!-- 항상 자리를 차지하는 얇은 레일 (w-10) — 펼친 패널은 이 위로 떠오른다 -->
  <div class="relative flex-shrink-0 w-10 bg-white border-r">
    <!-- 접힌 레일: 펼치기 버튼 + 세로 라벨 -->
    <div
      class="h-full flex flex-col items-center gap-3 cursor-pointer"
      title="목차 펼치기"
      @click="toggleCollapsed"
    >
    <div class="group py-3.5 w-full bg-gray-100 text-center transition-colors">
      <i class="pi pi-angle-double-right text-gray-400 group-hover:text-blue-500 transition-colors" @click.stop="toggleCollapsed"></i>
    </div>
      <span class="text-xs font-bold text-blue-500">{{ modules.length }}</span>
      <span class="text-[10px] text-gray-400 [writing-mode:vertical-rl]">모듈 목차</span>
    </div>

    <!-- 펼쳐졌을 때: 캔버스 위로 떠오르는 플로팅 패널 -->
    <div
      v-if="!collapsed"
      class="absolute top-0 left-0 h-full w-60 z-30 flex flex-col bg-white border-r shadow-2xl"
    >
      <!-- 헤더 -->
      <div class="flex items-center justify-between px-2 py-2 bg-gray-100 flex-shrink-0">
        <span class="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <i class="pi pi-list text-gray-500"></i>
          모듈 목차
          <span class="text-xs font-normal text-gray-400">{{ modules.length }}</span>
        </span>
        <button
          class="p-1 leading-7 text-gray-400 hover:text-blue-500 transition-colors"
          title="목차 접기"
          @click="toggleCollapsed"
        >
          <i class="pi pi-angle-double-left"></i>
        </button>
      </div>

      <div v-if="modules.length === 0" class="text-center text-gray-500 py-10 px-2 text-xs flex-1">
        추가된 모듈이 없습니다.
      </div>

      <draggable
        v-else
        v-model="orderedModules"
        item-key="id"
        handle=".outline-handle"
        ghost-class="outline-ghost"
        animation="180"
        class="flex-1 overflow-y-auto p-1 flex flex-col gap-1 border-t"
      >
        <template #item="{ element, index }">
          <div
            class="outline-row group flex items-center gap-1.5 px-1.5 py-1.5 rounded cursor-pointer border transition-colors"
            :class="
              selectedModuleId === element.id
                ? 'bg-blue-50 border-blue-300'
                : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
            "
            @click="select(element.id)"
            @mouseenter="setHover(element.id)"
            @mouseleave="setHover(null)"
          >
            <i
              class="pi pi-bars outline-handle cursor-grab text-gray-300 hover:text-blue-500 text-xs"
              title="끌어서 순서 변경"
              @click.stop
            ></i>
            <span class="w-4 text-center text-xs font-semibold text-blue-500 flex-shrink-0">{{
              index + 1
            }}</span>
            <span class="flex-1 text-xs text-gray-700 truncate">{{ moduleName(element) }}</span>
          </div>
        </template>
      </draggable>

      <!-- 안내 문구 -->
      <p class="px-2 py-1.5 border-t text-[12px] leading-relaxed text-gray-500 flex-shrink-0 break-keep">
        행에 마우스를 올리면 캔버스에서 위치가 강조됩니다. 아이콘을 끌어 순서를 바꾸세요.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import draggable from 'vuedraggable'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import type { ModuleInstance } from '@/types'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()

// 기본값은 접힘 — 사용자가 '0'(펼침)으로 저장한 경우에만 펼친 상태로 시작
const COLLAPSE_KEY = 'moduleOutlineCollapsed'
const collapsed = ref(localStorage.getItem(COLLAPSE_KEY) !== '0')

const toggleCollapsed = (): void => {
  collapsed.value = !collapsed.value
  localStorage.setItem(COLLAPSE_KEY, collapsed.value ? '1' : '0')
}

const modules = computed(() => moduleStore.modules)
const selectedModuleId = computed(() => moduleStore.selectedModuleId)

// 드래그 정렬 대상 — 캔버스와 동일한 단일 store 배열을 직접 재정렬
const orderedModules = computed<ModuleInstance[]>({
  get: () => moduleStore.modules,
  set: (value) => {
    moduleStore.modules.splice(0, moduleStore.modules.length, ...value)
    moduleStore.modules.forEach((m, idx) => {
      m.order = idx
    })
    moduleStore.isDirty = true
  },
})

// 모듈 인스턴스의 표시 이름 (메타데이터에서 조회)
const moduleName = (instance: ModuleInstance): string => {
  const meta = moduleStore.availableModules.find((m) => m.id === instance.moduleId)
  return meta?.name || instance.moduleId
}

const select = (moduleId: string): void => {
  moduleStore.selectModule(moduleId)
}

const setHover = (moduleId: string | null): void => {
  editorStore.setHoveredModuleId(moduleId)
}
</script>

<style scoped>
/* 드래그 중 자리 표시(ghost) 스타일 */
:deep(.outline-ghost) {
  opacity: 0.5;
  background: #eff6ff;
  border-color: #3b82f6 !important;
}
</style>
