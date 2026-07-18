<template>
  <!-- min-w-0: 고정폭 래퍼(flex-1 자식) 안에서 내용이 패널을 밀어내지 못하도록 (기본 min-width:auto 무력화) -->
  <div class="h-full flex flex-col min-w-0">
    <!-- 패널 헤더 — 선택된 모듈/그룹이 있으면 그 이름을, 없으면 "속성"을 보여준다 -->
    <div class="p-3 border-b">
      <h2 class="font-medium text-sm truncate">{{ headerTitle }}</h2>
    </div>

    <!-- 스크롤 영역 (가로는 패널 폭으로 클리핑 — 넘치는 편집기는 자체 가로 스크롤을 가진다) -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden">
      <!-- 그룹이 선택되었을 때: 그룹 스타일 편집 -->
      <GroupPropertiesPanel v-if="selectedGroup" />

      <!-- 모듈이 선택되지 않았을 때 안내 -->
      <div v-else-if="!selectedModule" class="flex-1 flex items-center justify-center text-gray-500 px-4 py-12">
        <div class="text-center">
          <div class="text-3xl mb-3"><i class="pi pi-pencil text-gray-400"></i></div>
          <div class="font-medium text-gray-600 mb-1">모듈을 선택하세요</div>
          <div class="text-sm/5 text-gray-400">
            중앙의 편집 영역에서 모듈을 클릭하면<br />
            여기서 텍스트와 이미지를 편집할 수 있습니다
          </div>
        </div>
      </div>

      <!-- 선택된 모듈이 있을 때: 실제 속성 폼(ModuleForm.vue, 좌측 SelectedItemPanel과 공유) -->
      <ModuleForm v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import GroupPropertiesPanel from './GroupPropertiesPanel.vue'
import ModuleForm from './ModuleForm.vue'

const moduleStore = useModuleStore()

const selectedGroup = computed(() => moduleStore.selectedGroup)
const selectedModule = computed(() => moduleStore.selectedModule)
const selectedModuleMetadata = computed(() => moduleStore.selectedModuleMetadata)

const headerTitle = computed(() => {
  if (selectedGroup.value) return '그룹 스타일'
  if (selectedModule.value) return selectedModuleMetadata.value?.name ?? '속성'
  return '속성'
})
</script>
