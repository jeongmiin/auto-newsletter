<template>
  <div class="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
    <!-- 화면 크기 선택 -->
    <div class="flex items-center gap-2">
      <span class="text-sm text-gray-600">화면 크기:</span>
      <Button
        @click="setCanvasWidth('desktop')"
        label="PC"
        icon="pi pi-desktop"
        severity="contrast"
        :outlined="canvasWidth !== 'desktop'"
        :text="canvasWidth !== 'desktop'"
        size="small"
        v-tooltip.bottom="'PC 화면에서 어떻게 보이는지 확인'"
      />
      <Button
        @click="setCanvasWidth('mobile')"
        label="모바일"
        icon="pi pi-mobile"
        severity="contrast"
        :outlined="canvasWidth !== 'mobile'"
        :text="canvasWidth !== 'mobile'"
        size="small"
        v-tooltip.bottom="'모바일 화면에서 어떻게 보이는지 확인'"
      />

      <!-- 구분선 -->
      <span class="w-px h-5 bg-gray-300 mx-1"></span>

      <!-- 모듈 순서 변경 -->
      <Button
        @click="openReorder"
        label="모듈 순서"
        icon="pi pi-sort-alt"
        outlined
        size="small"
        v-tooltip.bottom="'추가한 모듈의 순서를 드래그로 변경합니다'"
      />
    </div>

    <!-- 전체 삭제 -->
    <Button
      @click="confirmClearAll"
      label="전체 삭제"
      icon="pi pi-trash"
      severity="danger"
      text
      size="small"
      v-tooltip.bottom="'모든 모듈을 삭제합니다'"
    />
  </div>

  <!-- 모듈 순서 변경 다이얼로그 -->
  <Dialog
    v-model:visible="showReorder"
    header="모듈 순서 변경"
    modal
    :style="{ width: '440px' }"
    :dismissable-mask="true"
  >
    <p class="text-sm text-gray-500 mb-3">
      손잡이를 마우스로 끌어 순서를 바꾸세요. <br /> 변경은 미리보기·내려받기·코드 복사에 바로 반영됩니다.
    </p>

    <div v-if="reorderList.length === 0" class="text-center text-gray-400 py-8 text-sm">
      추가된 모듈이 없습니다.
    </div>

    <draggable
      v-else
      v-model="reorderList"
      item-key="id"
      handle=".reorder-handle"
      ghost-class="reorder-ghost"
      animation="180"
      class="flex flex-col gap-1 max-h-[60vh] overflow-y-auto pr-1"
    >
      <template #item="{ element, index }">
        <div
          class="reorder-item flex items-center gap-2 px-2 py-2 bg-white border border-gray-200 rounded hover:border-blue-300 transition-colors"
        >
          <i class="pi pi-bars reorder-handle cursor-grab text-gray-400 hover:text-blue-500"></i>
          <span class="w-6 text-center text-sm font-semibold text-blue-500">{{ index + 1 }}</span>
          <span class="flex-1 text-sm text-gray-800 truncate">{{ moduleName(element) }}</span>
        </div>
      </template>
    </draggable>

    <template #footer>
      <Button label="닫기" severity="secondary" outlined size="small" @click="showReorder = false" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import draggable from 'vuedraggable'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import type { ModuleInstance } from '@/types'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()
const toast = useToast()
const confirm = useConfirm()

// ===== 모듈 순서 변경 다이얼로그 =====
const showReorder = ref(false)

const openReorder = (): void => {
  if (moduleStore.modules.length === 0) {
    showWarn('이동할 모듈 없음', '현재 추가된 모듈이 없습니다')
    return
  }
  showReorder.value = true
}

// 드래그 정렬 대상 — 스토어의 단일 모듈 배열을 직접 재정렬 (캔버스와 동일 소스)
const reorderList = computed<ModuleInstance[]>({
  get: () => moduleStore.modules,
  set: (value) => {
    moduleStore.modules.splice(0, moduleStore.modules.length, ...value)
    moduleStore.modules.forEach((m, idx) => {
      m.order = idx
    })
  },
})

// 모듈 인스턴스의 표시 이름 (메타데이터에서 조회)
const moduleName = (instance: ModuleInstance): string => {
  const meta = moduleStore.availableModules.find((m) => m.id === instance.moduleId)
  return meta?.name || instance.moduleId
}

const showSuccess = (summary: string, detail?: string) => {
  toast.add({ severity: 'success', summary, detail, life: 3000 })
}

const showWarn = (summary: string, detail?: string) => {
  toast.add({ severity: 'warn', summary, detail, life: 4000 })
}

const canvasWidth = computed(() => editorStore.canvasWidth)

const clearAll = (): void => {
  moduleStore.clearAll()
}

const confirmClearAll = (): void => {
  if (moduleStore.modules.length === 0) {
    showWarn('삭제할 모듈 없음', '현재 추가된 모듈이 없습니다')
    return
  }

  confirm.require({
    message: `현재 ${moduleStore.modules.length}개의 모듈이 있습니다. 모두 삭제하시겠습니까?`,
    header: '전체 삭제 확인',
    rejectLabel: '취소',
    acceptLabel: '삭제',
    rejectClass: 'p-button-secondary',
    acceptClass: 'p-button-danger',
    accept: () => {
      clearAll()
      showSuccess('삭제 완료', '모든 모듈이 삭제되었습니다')
    },
  })
}

const setCanvasWidth = (width: 'mobile' | 'desktop'): void => {
  editorStore.setCanvasWidth(width)
}
</script>

<style scoped>
/* 드래그 중 자리 표시(ghost) 스타일 */
:deep(.reorder-ghost) {
  opacity: 0.5;
  background: #eff6ff;
  border-color: #3b82f6;
}
</style>
