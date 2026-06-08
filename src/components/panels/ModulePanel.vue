<template>
  <div class="h-full flex flex-col">
    <!-- 모듈 / 템플릿 세그먼트 토글 -->
    <div class="p-2 border-b">
      <div class="flex bg-gray-100 rounded-lg p-0.5">
        <button
          @click="mode = 'modules'"
          :class="[
            'flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors',
            mode === 'modules' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700',
          ]"
        >
          모듈
        </button>
        <button
          @click="mode = 'templates'"
          :class="[
            'flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors',
            mode === 'templates' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700',
          ]"
        >
          템플릿
        </button>
      </div>
    </div>

    <!-- 카테고리 (모듈 모드에서만) — 세그먼트 트랙 3열 그리드 -->
    <div v-if="mode === 'modules'" class="p-3 border-b">
      <div class="grid grid-cols-3 gap-1 bg-gray-100 rounded-lg p-1">
        <button
          v-for="category in categories"
          :key="category.id"
          @click="selectedCategory = category.id"
          :class="[
            'px-2 py-1.5 text-sm font-medium text-center rounded-md transition-colors',
            selectedCategory === category.id
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          ]"
        >
          {{ category.name }}
        </button>
      </div>
    </div>

    <!-- 콘텐츠 영역 -->
    <div class="flex-1 overflow-y-auto p-3 pb-10">
      <!-- 템플릿 리스트 -->
      <div v-if="mode === 'templates'">
        <div v-if="templates.length === 0" class="text-center py-8 text-gray-500">
          <i class="pi pi-folder-open text-3xl text-gray-300 mb-3 block"></i>
          <div class="text-sm">사용 가능한 템플릿이 없습니다</div>
          <div class="text-xs text-gray-400 mt-1">상단의 "템플릿 내보내기"로<br />현재 작업을 템플릿으로 저장할 수 있습니다</div>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="template in templates"
            :key="template.id"
            @click="applyTemplate(template)"
            class="p-3 border-2 border-dashed border-blue-200 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-colors"
          >
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-blue-100 text-blue-700 rounded flex items-center justify-center">
                <i class="pi pi-file-edit"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm truncate">{{ template.name }}</div>
                <div class="text-xs text-gray-500 truncate">{{ template.description || `${template.modules.length}개 모듈` }}</div>
              </div>
            </div>
          </div>
          <div class="text-xs text-gray-500 mt-3 px-1 flex flex-wrap gap-2 items-center">
            <i class="pi pi-info-circle"></i>
            템플릿을 적용하면 현재 작업이 대체됩니다
          </div>
        </div>
      </div>

      <!-- 모듈 리스트 -->
      <div v-else class="space-y-2">
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
import { storeToRefs } from 'pinia'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import type { ModuleMetadata, NewsletterTemplate } from '@/types'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()
const toast = useToast()
const confirm = useConfirm()

// 모듈/템플릿 탭 모드는 editorStore에서 공유 (캔버스 빈 화면 버튼에서도 전환)
const { modulePanelMode: mode } = storeToRefs(editorStore)
const selectedCategory = ref<string>('all')
const modules = ref<ModuleMetadata[]>([])
const templates = ref<NewsletterTemplate[]>([])

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

const applyTemplate = (template: NewsletterTemplate) => {
  const doLoad = async () => {
    const ok = await moduleStore.loadTemplate(template.id)
    if (ok) {
      toast.add({
        severity: 'success',
        summary: '템플릿 적용됨',
        detail: `${template.name} 템플릿이 적용되었습니다`,
        life: 2500,
      })
    } else {
      toast.add({
        severity: 'error',
        summary: '템플릿 적용 실패',
        detail: '템플릿을 불러올 수 없습니다',
        life: 4000,
      })
    }
  }

  // 작업 내용이 있으면 확인
  if (moduleStore.modules.length > 0) {
    confirm.require({
      message: `현재 ${moduleStore.modules.length}개의 모듈이 있습니다. 템플릿을 적용하면 모두 대체됩니다. 계속하시겠습니까?`,
      header: '템플릿 적용 확인',
      rejectLabel: '취소',
      acceptLabel: '적용',
      rejectClass: 'p-button-secondary',
      acceptClass: 'p-button-primary',
      accept: doLoad,
    })
  } else {
    doLoad()
  }
}

onMounted(async () => {
  modules.value = await moduleStore.loadAvailableModules()
  templates.value = await moduleStore.loadAvailableTemplates()
})
</script>

