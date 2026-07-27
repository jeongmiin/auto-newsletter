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
      <div class="px-[25px] py-3 border-b">
        <!-- 그룹 멤버일 때만 그룹 복귀 브레드크럼 -->
        <button v-if="memberGroup" type="button" class="back-to-group" @click="backToGroup">
          <i class="pi pi-chevron-left"></i>
          <span class="truncate">{{ memberGroup.name || '그룹' }}</span>
        </button>
        <h2 class="font-medium text-sm truncate" :class="{ 'mt-1': memberGroup }">
          {{ selectedModuleMetadata?.name }}
        </h2>
        <p v-if="memberGroup" class="text-xs text-gray-400 mt-0.5">
          이 그룹 안의 모듈입니다 · 다른 모듈은 캔버스에서 선택하세요
        </p>
      </div>
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
const selectedModuleMetadata = computed(() => moduleStore.selectedModuleMetadata)

// 그룹 '자체'가 선택된 상태(캔버스 그룹 핸들 클릭)에서만 그룹 스타일을 보여준다.
// 멤버 드릴다운(모듈 선택)은 selectedGroup이 null이므로 여기 해당되지 않는다.
const isGroupItselfSelected = computed(() => !!moduleStore.selectedGroup)

// 선택된 모듈이 그룹 멤버라면 그 그룹(복귀 버튼·안내용). 단독 모듈이면 null.
const memberGroup = computed(() => (selectedModule.value?.groupId ? moduleStore.activeGroup : null))

const backToGroup = (): void => {
  if (memberGroup.value) moduleStore.selectGroup(memberGroup.value.id)
}
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

/* 그룹 멤버 편집 시 그룹으로 복귀하는 브레드크럼 */
.back-to-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  max-width: 100%;
  padding: 0;
  border: none;
  background: none;
  color: #8b95a1;
  font-size: 12px;
  cursor: pointer;
}
.back-to-group:hover {
  color: #4083f3;
}
.back-to-group .pi {
  font-size: 11px;
}
</style>
