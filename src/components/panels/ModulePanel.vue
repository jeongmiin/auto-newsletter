<template>
  <div class="h-full flex flex-col">
    <!-- 패널 헤더 -->
    <div class="p-3 border-b">
      <h2 class="text-lg font-semibold text-gray-800">모듈</h2>
    </div>

    <!-- 카테고리 탭 -->
    <div class="flex border-b">
      <button
        v-for="category in categories"
        :key="category.id"
        @click="selectedCategory = category.id"
        :class="[
          'flex-1 p-2 text-xs font-medium',
          selectedCategory === category.id
            ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
            : 'text-gray-600 hover:text-gray-800',
        ]"
      >
        {{ category.name }}
      </button>
    </div>

    <!-- 모듈 리스트 -->
    <div class="flex-1 overflow-y-auto p-4 pb-10">
      <div class="space-y-2">
        <div
          v-for="module in filteredModules"
          :key="module.id"
          @click="addModule(module)"
          class="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-blue-50 text-blue-600 rounded flex items-center justify-center">
              <i :class="module.icon"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">{{ module.name }}</div>
              <div class="text-xs text-gray-500 truncate">{{ module.description }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import { useToast } from 'primevue/usetoast'
import type { ModuleMetadata } from '@/types'

const moduleStore = useModuleStore()
const toast = useToast()

const selectedCategory = ref<string>('all')
const modules = ref<ModuleMetadata[]>([])

const categories = [
  { id: 'all', name: '전체' },
  { id: 'common', name: '공통' },
  { id: 'text', name: '텍스트' },
  { id: 'image', name: '이미지' },
  { id: 'button', name: '버튼' },
  { id: 'table', name: '테이블' },
]

const filteredModules = computed(() => {
  if (selectedCategory.value === 'all') return modules.value
  return modules.value.filter((module) => module.category === selectedCategory.value)
})

const addModule = (module: ModuleMetadata) => {
  moduleStore.addModule(module)
  toast.add({
    severity: 'success',
    summary: '모듈 추가됨',
    detail: `${module.name} 모듈이 추가되었습니다`,
    life: 2000,
  })
}

onMounted(async () => {
  modules.value = await moduleStore.loadAvailableModules()
})
</script>

