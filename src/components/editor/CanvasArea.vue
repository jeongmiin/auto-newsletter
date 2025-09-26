<template>
  <div class="flex-1 bg-gray-100 p-8 overflow-auto">
    <div class="flex justify-center">
      <!-- 캔버스 컨테이너 -->
      <div
        :class="[
          'bg-white shadow-lg transition-all duration-300',
          canvasWidth === 'mobile' ? 'w-80' : 'w-full max-w-3xl',
        ]"
        style="min-height: 600px"
      >
        <!-- 모듈이 없을 때 -->
        <div
          v-if="modules.length === 0"
          class="h-96 flex items-center justify-center text-gray-500"
        >
          <div class="text-center">
            <div class="text-4xl mb-4">📧</div>
            <div class="text-lg mb-2">이메일 만들기 시작</div>
            <div class="text-sm">왼쪽에서 모듈을 선택하세요.</div>
          </div>
        </div>

        <!-- 모듈 리스트 -->
        <div v-else class="min-h-full">
          <ModuleRenderer
            v-for="(module, index) in modules"
            :key="module.id"
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import ModuleRenderer from '../modules/ModuleRenderer.vue'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()

const modules = computed(() => moduleStore.modules)
const selectedModuleId = computed(() => moduleStore.selectedModuleId)
const canvasWidth = computed(() => editorStore.canvasWidth)

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
