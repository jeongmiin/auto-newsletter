<script setup lang="ts">
import { ref, defineAsyncComponent, watch, computed } from 'vue'
import Module01Form from '@/components/newsletterForm/Module01Form.vue'
import Module02Form from '@/components/newsletterForm/Module02Form.vue'
import Filter from '@/components/layout/FilterLayout.vue'
import EmailPreviewWithExtraction from '@/components/EmailPreviewWithExtraction.vue'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Badge from 'primevue/badge'
import Toast from 'primevue/toast'

// 동적 컴포넌트 매핑
const formComponents = {
  module1: Module01Form,
  module2: Module02Form,
}

const previewComponents = {
  module1: defineAsyncComponent(() => import('@/components/newsletterModule/ModuleNum01.vue')),
  module2: defineAsyncComponent(() => import('@/components/newsletterModule/ModuleNum02.vue')),
}
interface TableRow {
  header: string
  content: string
}
// 타입 정의
export type ModuleOneData = {
  title: string
  subtitle: string
  items: { redtitle: string; desc: string }[]
}

export type ModuleTwoData = {
  //01
  title: string
  subtitle: string
  items: { redtitle: string; desc: string }[]
  // 02
  imageUrl: string
  imageAlt: string
  mainTitle: string
  description: string
  tableRows: TableRow[]
  buttonText: string
  buttonUrl: string
  showTable: boolean
  showButton: boolean
}

export type Module = {
  instanceId: string
  type: string
  data: ModuleOneData | ModuleTwoData | any
  order?: number
}

// 초기 데이터 팩토리
const moduleInitialData = {
  module1: (): ModuleOneData => ({
    title: '모듈 01 타이틀',
    subtitle: '모듈 01 서브타이틀',
    items: [{ redtitle: '아이템 1', desc: '설명 1' }],
  }),
  module2: (): ModuleTwoData => ({
    title: '모듈02 타이틀 영역',
    imageUrl: 'https://design.messeesang.com/e-dm/newsletter/images/img-1column.png',
    imageAlt: '이미지',
    mainTitle:
      '2022 대한민국 기계설비전시회 사전등록 혜택 3가지!\n대한민국 기계설비전시회 홈페이지에서 사전등록 하시면 무료입장 가능',
    description:
      '기후변화와 탄소중립 2050 정책에 부응하여 기계설비기술을 선도하는 LH가 2022 기계설비전시회 에서 탄소중립 특별관을 운영합니다. 도시 및 주택의 제로에너지 정책 방향, 기존 주택 그린 리모델링, 저에너지 및 친환경 미래주택 기술을 선보일 예정이니 많은 관심 바랍니다.',
    tableRows: [
      { header: '관람시간', content: '10:00 – 18:00 (입장마감 17:30)' },
      { header: '입장료', content: '일반 12,000원 / 단체(10인 이상) 사무국 별도 문의' },
      {
        header: '무료 입장 대상',
        content: '· 공공기관 및 공무원(공무원증 및 명함 지참)\n· 초청장 소지자, 사전등록자',
      },
    ],
    buttonText: '사전등록 →',
    buttonUrl: '#',
    showTable: false,
    showButton: false,
  }),
}

const selectedModules = ref<Module[]>([])
const toast = useToast()

// Watch 개선: 새로 추가된 모듈에만 초기 데이터 설정
watch(
  selectedModules,
  (newModules, oldModules) => {
    if (newModules.length > oldModules.length) {
      const newModule = newModules[newModules.length - 1]
      const moduleType = newModule.type as keyof typeof moduleInitialData

      if (moduleInitialData[moduleType] && !newModule.data) {
        newModule.data = moduleInitialData[moduleType]()
      }
    }
  },
  { deep: true },
)

// 컴포넌트 존재 여부 확인
const hasFormComponent = (moduleType: string) => {
  return moduleType in formComponents
}

const hasPreviewComponent = (moduleType: string) => {
  return moduleType in previewComponents
}

// 안전한 타입 캐스팅을 위한 헬퍼 함수
const getModuleData = (module: Module, type: 'module1' | 'module2') => {
  return module.data as ModuleOneData | ModuleTwoData
}

// 모듈 데이터 업데이트
const updateModuleData = (moduleInstanceId: string, field: string, value: any) => {
  const module = selectedModules.value.find((m) => m.instanceId === moduleInstanceId)
  if (!module) return

  // 중첩된 속성 처리
  if (field.includes('.')) {
    const keys = field.split('.')
    let target = module.data
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) target[keys[i]] = {}
      target = target[keys[i]]
    }
    target[keys[keys.length - 1]] = value
  } else {
    module.data[field] = value
  }
}

// 전체 초기화
const clearAllModules = () => {
  if (selectedModules.value.length === 0) return

  if (confirm(`${selectedModules.value.length}개의 모듈이 모두 삭제됩니다. 계속하시겠습니까?`)) {
    selectedModules.value = []
    toast.add({
      severity: 'info',
      summary: '초기화 완료',
      detail: '모든 모듈이 삭제되었습니다.',
      life: 3000,
    })
  }
}
</script>

<template>
  <div class="flex h-screen bg-gray-50">
    <!-- 사이드바 -->
    <Filter v-model:selectedModules="selectedModules" />

    <!-- 메인 콘텐츠 -->
    <div class="flex-1 flex flex-col">
      <!-- 상단 툴바 -->
      <div class="bg-white border-b border-gray-200 px-6 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-xl font-semibold text-gray-800">이메일 뉴스레터 빌더</h1>
            <Badge
              v-if="selectedModules.length > 0"
              :value="`${selectedModules.length}개 모듈`"
              severity="info"
            />
          </div>

          <div class="flex gap-2">
            <!-- 전체 초기화 -->
            <Button
              size="small"
              severity="danger"
              @click="clearAllModules"
              :disabled="selectedModules.length === 0"
              v-tooltip="'모든 모듈 삭제'"
            >
              초기화
            </Button>
          </div>
        </div>
      </div>

      <!-- 메인 편집 영역 -->
      <div class="flex-1 flex">
        <!-- 폼 영역 -->
        <section class="w-1/2 flex flex-col gap-6 overflow-y-auto max-h-screen bg-white">
          <div v-if="selectedModules.length === 0" class="text-center py-16 px-6">
            <div class="text-gray-400 mb-6">
              <i class="pi pi-plus-circle text-6xl"></i>
            </div>
            <h3 class="text-xl font-medium text-gray-600 mb-3">뉴스레터 제작을 시작해보세요</h3>
            <p class="text-gray-500 mb-6 max-w-lg mx-auto">
              왼쪽 사이드바에서 원하는 모듈을 선택하여 이메일 뉴스레터를 구성할 수 있습니다.
            </p>
            <div class="text-sm text-gray-400">
              <p>💡 팁: 모듈을 추가한 후 실시간으로 미리보기를 확인할 수 있습니다</p>
            </div>
          </div>

          <div v-else class="p-6 space-y-6">
            <template v-for="(module, index) in selectedModules" :key="module.instanceId">
              <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <!-- 모듈 헤더 -->
                <div class="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                  <h3 class="text-sm font-medium text-gray-700">
                    모듈 {{ index + 1 }} ({{ module.type }})
                  </h3>
                  <span class="text-xs text-gray-500">{{ module.instanceId.split('_')[1] }}</span>
                </div>

                <!-- 모듈 1 폼 -->
                <component
                  v-if="module.type === 'module1' && hasFormComponent(module.type)"
                  :is="formComponents[module.type as keyof typeof formComponents]"
                  v-model:moduleOneTitle="getModuleData(module, 'module1').title"
                  v-model:moduleOneSubtitle="getModuleData(module, 'module1').subtitle"
                  v-model:moduleOneItems="getModuleData(module, 'module1').items"
                />

                <!-- 모듈 2 폼 -->
                <component
                  v-else-if="module.type === 'module2' && hasFormComponent(module.type)"
                  :is="formComponents[module.type as keyof typeof formComponents]"
                  v-model:moduleTwoTitle="getModuleData(module, 'module2').title"
                  v-model:moduleTwoImageUrl="getModuleData(module, 'module2').imageUrl"
                  v-model:moduleTwoImageAlt="getModuleData(module, 'module2').imageAlt"
                  v-model:moduleTwoMainTitle="getModuleData(module, 'module2').mainTitle"
                  v-model:moduleTwoDescription="getModuleData(module, 'module2').description"
                  v-model:moduleTwoTableRows="getModuleData(module, 'module2').tableRows"
                  v-model:moduleTwoButtonText="getModuleData(module, 'module2').buttonText"
                  v-model:moduleTwoButtonUrl="getModuleData(module, 'module2').buttonUrl"
                  v-model:moduleTwoShowTable="getModuleData(module, 'module2').showTable"
                  v-model:moduleTwoShowButton="getModuleData(module, 'module2').showButton"
                />

                <!-- 지원하지 않는 모듈 타입 -->
                <div v-else class="text-center py-4 text-gray-500">
                  <i class="pi pi-exclamation-triangle text-yellow-500 mb-2"></i>
                  <p class="text-sm">지원하지 않는 모듈 타입: {{ module.type }}</p>
                </div>
              </div>
            </template>
          </div>
        </section>

        <!-- 미리보기 영역 -->
        <EmailPreviewWithExtraction :modules="selectedModules" class="w-1/2" />
      </div>
    </div>

    <!-- Toast 컴포넌트 -->
    <Toast />
  </div>
</template>

<style scoped>
/* 스크롤바 스타일링 */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
