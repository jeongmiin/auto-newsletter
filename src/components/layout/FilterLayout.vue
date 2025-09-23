<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import Badge from 'primevue/badge'
import type { Module, ModuleOneData, ModuleTwoData } from '@/components/types/modules'

const selectedModules = defineModel<Module[]>('selectedModules', { default: [] })

const modules = ref([
  { id: 'module1', name: '모듈 1', icon: 'pi pi-box', description: '기본 모듈' },
  { id: 'module2', name: '모듈 2', icon: 'pi pi-star', description: '기본 모듈' },
])

const moduleInitialData: Record<string, () => ModuleOneData | ModuleTwoData | any> = {
  module1: () => ({
    title: '모듈 01 타이틀',
    subtitle: '모듈 01 서브 타이틀',
    items: [{ redtitle: '하이라이트 1', desc: '설명 1' }],
  }),
  module2: () => ({
    title: '모듈 02 타이틀 문구',
    imageUrl: 'https://design.messeesang.com/e-dm/newsletter/images/img-1column.png',
    imageAlt: '대표 이미지',
    mainTitle: '모듈 02 대표 타이틀을 입력해 주세요.',
    description: '모듈 02 본문 설명을 입력해 주세요.',
    tableRows: [{ header: '항목명', content: '상세 내용' }],
    buttonText: '자세히 보기',
    buttonUrl: '#',
    showTable: false,
    showButton: false,
  }),
}

const addModule = (moduleId: string) => {
  const newModule: Module = {
    instanceId: `module_${Date.now()}_${Math.random()}`,
    type: moduleId,
    data: {},
  }

  const getInitialData = moduleInitialData[moduleId]
  if (getInitialData) {
    newModule.data = getInitialData()
  }

  selectedModules.value.push(newModule)
}

const removeModule = (moduleId: string) => {
  const lastIndex = selectedModules.value.map((m) => m.type).lastIndexOf(moduleId)
  if (lastIndex !== -1) {
    selectedModules.value.splice(lastIndex, 1)
  }
}

const getModuleCount = (moduleId: string) => {
  return selectedModules.value.filter((m) => m.type === moduleId).length
}

// 모듈별 선택 가능 여부 확인 (옵션: 최대 개수 제한)
const canAddModule = (moduleId: string) => {
  // 각 모듈 최대 5개까지 사용 가능
  return getModuleCount(moduleId) < 5
}

const canRemoveModule = (moduleId: string) => {
  return getModuleCount(moduleId) > 0
}
</script>

<template>
  <aside class="w-64 bg-gray-50 border-r border-gray-200">
    <div class="p-4">
      <h2 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <i class="pi pi-th-large mr-2"></i>
        모듈 선택
      </h2>

      <div class="space-y-3">
        <div
          v-for="module in modules"
          :key="module.id"
          class="bg-white rounded-lg p-3 shadow-sm border border-gray-200"
        >
          <!-- 모듈 정보 -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
              <i :class="module.icon" class="text-blue-500 mr-2"></i>
              <div>
                <h3 class="font-medium text-gray-800">{{ module.name }}</h3>
                <p class="text-xs text-gray-500">{{ module.description }}</p>
              </div>
            </div>
            <Badge
              :value="getModuleCount(module.id)"
              :severity="getModuleCount(module.id) > 0 ? 'success' : 'secondary'"
            />
          </div>

          <!-- 액션 버튼들 -->
          <div class="flex gap-2">
            <Button
              @click="addModule(module.id)"
              :disabled="!canAddModule(module.id)"
              size="small"
              severity="success"
              class="flex-1"
            >
              추가
            </Button>
            <Button
              @click="removeModule(module.id)"
              :disabled="!canRemoveModule(module.id)"
              size="small"
              severity="danger"
              outlined
              class="flex-1"
            >
              제거
            </Button>
          </div>

          <!-- 사용 가능 상태 표시 -->
          <div class="mt-2 text-xs text-center">
            <span v-if="!canAddModule(module.id)" class="text-orange-600"> 최대 개수 도달 </span>
            <span v-else-if="getModuleCount(module.id) === 0" class="text-gray-500">
              추가 가능
            </span>
            <span v-else class="text-green-600">
              {{ 5 - getModuleCount(module.id) }}개 추가 가능
            </span>
          </div>
        </div>
      </div>

      <!-- 전체 모듈 요약 -->
      <div class="mt-6 pt-4 border-t border-gray-200">
        <div class="text-sm text-gray-600">
          <div class="flex justify-between">
            <span>총 모듈:</span>
            <span class="font-medium">{{ selectedModules.length }}개</span>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
