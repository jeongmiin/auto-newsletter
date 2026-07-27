<template>
  <div class="selected-item-panel">
    <!-- 1) 그룹 '자체' 선택(캔버스 그룹 핸들 클릭) → 그룹 스타일만 노출.
         멤버 목록·개별 속성은 여기서 다루지 않는다(캔버스에서 모듈을 직접 클릭). -->
    <template v-if="isGroupItselfSelected">
      <div class="flex-1 overflow-y-auto overflow-x-hidden">
        <GroupPropertiesPanel />
      </div>
    </template>

    <!-- 2) 모듈 선택(그룹 멤버 드릴다운 또는 단독) → 그 모듈의 속성 폼만 노출.
         멤버 간 이동/삭제·그룹 스타일은 캔버스 선택으로 전환한다(아코디언 목록 없음). -->
    <template v-else-if="selectedModule">
      <div class="flex-1 overflow-y-auto overflow-x-hidden">
        <ModuleForm />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import GroupPropertiesPanel from './GroupPropertiesPanel.vue'
import ModuleForm from './ModuleForm.vue'

const moduleStore = useModuleStore()

const selectedModule = computed(() => moduleStore.selectedModule)

// 그룹 '자체'가 선택된 상태(캔버스 그룹 핸들 클릭)에서만 그룹 스타일을 보여준다.
// 멤버 드릴다운(모듈 선택)은 selectedGroup이 null이므로 여기 해당되지 않는다.
const isGroupItselfSelected = computed(() => !!moduleStore.selectedGroup)
</script>

<style scoped>
.selected-item-panel {
  width: var(--left-panel-width, 360px);
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e5e8eb;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>
