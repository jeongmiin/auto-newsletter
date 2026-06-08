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

      <!-- 실행 취소 (Ctrl+Z와 동일) -->
      <Button
        @click="undo"
        label="이전으로"
        icon="pi pi-undo"
        outlined
        size="small"
        :disabled="!canUndo"
        v-tooltip.bottom="'직전 작업을 취소합니다 (Ctrl+Z)'"
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

</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { getHistoryInstance } from '@/composables/useHistory'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()
const history = getHistoryInstance()
const toast = useToast()
const confirm = useConfirm()

// ===== 실행 취소 (Ctrl+Z와 동일 동작) =====
const canUndo = history.canUndo

const undo = (): void => {
  if (history.undo()) {
    toast.add({
      severity: 'info',
      summary: '실행 취소',
      detail: '이전 상태로 복원되었습니다',
      life: 2000,
    })
  }
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
