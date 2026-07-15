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
        <!-- 임시 실험 탭 (조립형 모듈 POC) — 검증 후 제거/정식화 예정 -->
        <button
          @click="mode = 'modules-v2'"
          :class="[
            'flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors',
            mode === 'modules-v2' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700',
          ]"
        >
          모듈 v2
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
    <div class="flex-1 overflow-y-auto p-3 pb-10" @scroll="onModuleLeave">
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

      <!-- [임시] 조립형 모듈 v2 (POC) -->
      <div v-else-if="mode === 'modules-v2'" class="space-y-3">
        <div class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 leading-relaxed">
          <i class="pi pi-info-circle mr-1"></i>실험용 임시 탭입니다. 원소 모듈(단일 이미지·설명 텍스트·단일 버튼)을 하나의 그룹으로 조립합니다.
          그룹 멤버를 선택한 뒤 다른 모듈을 추가하면 <b>그룹 안</b>에 들어가고, 삭제로 노출/비노출을 제어합니다.
        </div>
        <div
          @click="addComposedModule02"
          class="p-3 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 hover:border-amber-400 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-amber-100 text-amber-700 rounded flex items-center justify-center">
              <i class="pi pi-objects-column"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">모듈 02 (조립형)</div>
              <div class="text-xs text-gray-500 truncate">단일 이미지 · 타이틀 · 텍스트 · 단일 버튼 그룹</div>
            </div>
          </div>
        </div>
        <div
          @click="addComposedModule04"
          class="p-3 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 hover:border-amber-400 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-amber-100 text-amber-700 rounded flex items-center justify-center">
              <i class="pi pi-table"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">모듈 04 (조립형·2컬럼)</div>
              <div class="text-xs text-gray-500 truncate">이미지 · 타이틀 · 텍스트 · 작은버튼 × 2컬럼 (모바일 세로 스택)</div>
            </div>
          </div>
        </div>
        <div
          @click="addComposedModule011"
          class="p-3 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 hover:border-amber-400 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-amber-100 text-amber-700 rounded flex items-center justify-center">
              <i class="pi pi-id-card"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">모듈 01-1 (조립형·2컬럼)</div>
              <div class="text-xs text-gray-500 truncate">제목 박스 + 내용 박스 × 2컬럼 (설명 텍스트 배경 박스, 모바일 세로 스택)</div>
            </div>
          </div>
        </div>
        <div
          @click="addComposedModule05"
          class="p-3 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 hover:border-amber-400 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-amber-100 text-amber-700 rounded flex items-center justify-center">
              <i class="pi pi-objects-column"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">모듈 05 (조립형)</div>
              <div class="text-xs text-gray-500 truncate">상단 섹션 타이틀·텍스트 + 하단 2단(좌 이미지·우 타이틀·텍스트·버튼)</div>
            </div>
          </div>
        </div>
        <div
          @click="addComposedModule051"
          class="p-3 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 hover:border-amber-400 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-amber-100 text-amber-700 rounded flex items-center justify-center">
              <i class="pi pi-objects-column"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">모듈 05-1 (조립형·2컬럼)</div>
              <div class="text-xs text-gray-500 truncate">좌 이미지 · 우 강조 타이틀 박스 + 텍스트 + 작은 버튼</div>
            </div>
          </div>
        </div>
        <div
          @click="addComposedModule06"
          class="p-3 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 hover:border-amber-400 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-amber-100 text-amber-700 rounded flex items-center justify-center">
              <i class="pi pi-objects-column"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">모듈 06 (조립형·2컬럼)</div>
              <div class="text-xs text-gray-500 truncate">2단 대칭 · 타이틀 박스 → 이미지 → 텍스트 → 버튼</div>
            </div>
          </div>
        </div>
        <div
          @click="addComposedModule07"
          class="p-3 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 hover:border-amber-400 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-amber-100 text-amber-700 rounded flex items-center justify-center">
              <i class="pi pi-objects-column"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">모듈 07 (조립형·2컬럼)</div>
              <div class="text-xs text-gray-500 truncate">좌 이미지 · 우 타이틀 + 텍스트 + 작은 버튼</div>
            </div>
          </div>
        </div>
        <div
          @click="addComposedModule07Reverse"
          class="p-3 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 hover:border-amber-400 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-amber-100 text-amber-700 rounded flex items-center justify-center">
              <i class="pi pi-objects-column"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">모듈 07 반대 (조립형·2컬럼)</div>
              <div class="text-xs text-gray-500 truncate">우 이미지 · 좌 타이틀 + 텍스트 + 작은 버튼</div>
            </div>
          </div>
        </div>
        <div
          @click="addComposedNewsHeader"
          class="p-3 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 hover:border-amber-400 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-amber-100 text-amber-700 rounded flex items-center justify-center">
              <i class="pi pi-id-card"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">뉴스 헤드라인 헤더 (조립형)</div>
              <div class="text-xs text-gray-500 truncate">로고 → 굵은선 → (제목 | 👀 웹으로 보기 2단) → 얇은선</div>
            </div>
          </div>
        </div>
        <div
          @click="addComposedBasicHeader"
          class="p-3 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 hover:border-amber-400 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-amber-100 text-amber-700 rounded flex items-center justify-center">
              <i class="pi pi-id-card"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">기본 헤더 (조립형)</div>
              <div class="text-xs text-gray-500 truncate">상단선 → 로고 → 하단선 → 헤더 타이틀 (세로 스택)</div>
            </div>
          </div>
        </div>
        <div
          @click="addComposedImageHeader"
          class="p-3 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 hover:border-amber-400 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-amber-100 text-amber-700 rounded flex items-center justify-center">
              <i class="pi pi-id-card"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">이미지형 헤더 (조립형)</div>
              <div class="text-xs text-gray-500 truncate">비주얼 → 볼/날짜/홈 → 구분선 → 타이틀+본문 → 버튼</div>
            </div>
          </div>
        </div>
        <div
          @click="addComposedMultiImage"
          class="p-3 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 hover:border-amber-400 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-amber-100 text-amber-700 rounded flex items-center justify-center">
              <i class="pi pi-images"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">복수 이미지 (조립형·2컬럼)</div>
              <div class="text-xs text-gray-500 truncate">좌·우 이미지 2컬럼 (모바일 세로 스택)</div>
            </div>
          </div>
        </div>
        <div
          @click="addComposedFooter"
          class="p-3 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 hover:border-amber-400 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-amber-100 text-amber-700 rounded flex items-center justify-center">
              <i class="pi pi-align-center"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">하단 푸터 (조립형)</div>
              <div class="text-xs text-gray-500 truncate">회사정보 → 구분선 → SNS 아이콘 → 수신거부 (그룹 배경색)</div>
            </div>
          </div>
        </div>
        <div
          @click="addComposedTwoButton"
          class="p-3 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 hover:border-amber-400 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-amber-100 text-amber-700 rounded flex items-center justify-center">
              <i class="pi pi-clone"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">복수 버튼 (조립형·2컬럼)</div>
              <div class="text-xs text-gray-500 truncate">단일 버튼 2개 좌우 배치 (모바일 세로 스택)</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 모듈 리스트 -->
      <div v-else class="space-y-2">
        <div
          v-for="module in filteredModules"
          :key="module.id"
          :ref="(el) => observeCard(el as Element | null, module.id)"
          :data-module-id="module.id"
          @click="addModule(module)"
          class="module-card border rounded-lg cursor-pointer hover:border-blue-400 transition-colors overflow-hidden"
        >
          <!-- 상시 썸네일 (호버 없이 카드에 바로 표시) -->
          <div class="module-thumb">
            <iframe
              v-if="thumbs[module.id]"
              :srcdoc="thumbs[module.id]"
              class="module-thumb-iframe"
              title="모듈 미리보기"
              sandbox="allow-same-origin"
            ></iframe>
            <div v-else class="module-thumb-loading">
              <i :class="module.icon" class="text-2xl text-gray-300"></i>
            </div>
          </div>
          <div class="px-3 py-2">
            <div class="font-medium text-sm truncate">{{ module.name }}</div>
            <div class="text-xs text-gray-500 truncate">{{ module.description }}</div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
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
  // hidden 모듈은 팔레트에서 제외 (통합/폐기된 모듈 — 기존 데이터 렌더링은 계속 지원)
  const visible = modules.value.filter((module) => !module.hidden)
  if (selectedCategory.value === 'all') return visible
  return visible.filter((module) => module.category === selectedCategory.value)
})

const addModule = (module: ModuleMetadata) => {
  onModuleLeave() // 추가 시 미리보기 닫기
  moduleStore.addModule(module)
  toast.add({
    severity: 'success',
    summary: '모듈 추가됨',
    detail: `${module.name} 모듈이 추가되었습니다`,
    life: 2000,
  })
}

// [임시/POC] 모듈 02번을 원소 모듈 그룹으로 조립해 추가
const addComposedModule02 = () => {
  onModuleLeave()
  const groupId = moduleStore.addComposedModule02()
  toast.add({
    severity: groupId ? 'success' : 'error',
    summary: groupId ? '조립형 모듈 추가됨' : '조립 실패',
    detail: groupId
      ? '모듈 02(조립형) 그룹이 추가되었습니다. 각 원소를 선택해 개별 편집하세요.'
      : '원소 모듈을 찾을 수 없습니다.',
    life: 2500,
  })
}

// [임시/POC] 모듈 04번을 2컬럼 조립 그룹으로 추가
const addComposedModule04 = () => {
  onModuleLeave()
  const groupId = moduleStore.addComposedModule04()
  toast.add({
    severity: groupId ? 'success' : 'error',
    summary: groupId ? '조립형 모듈 추가됨' : '조립 실패',
    detail: groupId
      ? '모듈 04(2컬럼 조립) 그룹이 추가되었습니다. 데스크톱은 2단, 모바일은 세로로 쌓입니다.'
      : '원소 모듈을 찾을 수 없습니다.',
    life: 2500,
  })
}

// [임시/POC] 모듈 01-1번을 2컬럼 조립 그룹으로 추가 (제목 박스 + 내용 박스)
const addComposedModule011 = () => {
  onModuleLeave()
  const groupId = moduleStore.addComposedModule011()
  toast.add({
    severity: groupId ? 'success' : 'error',
    summary: groupId ? '조립형 모듈 추가됨' : '조립 실패',
    detail: groupId
      ? '모듈 01-1(2컬럼 조립) 그룹이 추가되었습니다. 설명 텍스트의 배경 박스로 제목/내용 카드를 만듭니다.'
      : '원소 모듈을 찾을 수 없습니다.',
    life: 2500,
  })
}

// [임시/POC] 모듈 05번을 2컬럼 조립 그룹으로 추가 (좌 이미지 · 우 텍스트+작은버튼)
const addComposedModule05 = () => {
  onModuleLeave()
  const groupId = moduleStore.addComposedModule05()
  toast.add({
    severity: groupId ? 'success' : 'error',
    summary: groupId ? '조립형 모듈 추가됨' : '조립 실패',
    detail: groupId
      ? '모듈 05(조립) 그룹이 추가되었습니다. 상단 섹션 + 하단 2단, 모바일은 세로로 쌓입니다.'
      : '원소 모듈을 찾을 수 없습니다.',
    life: 2500,
  })
}

const composedToast = (groupId: string | null, name: string) => {
  toast.add({
    severity: groupId ? 'success' : 'error',
    summary: groupId ? '조립형 모듈 추가됨' : '조립 실패',
    detail: groupId
      ? `${name}(조립) 그룹이 추가되었습니다. 각 원소를 선택해 개별 편집하세요.`
      : '원소 모듈을 찾을 수 없습니다.',
    life: 2500,
  })
}

// [임시/POC] 모듈 05-1 조립형 (좌 이미지 · 우 강조 타이틀 박스 + 텍스트 + 버튼)
const addComposedModule051 = () => {
  onModuleLeave()
  composedToast(moduleStore.addComposedModule051(), '모듈 05-1')
}

// [임시/POC] 모듈 06 조립형 (2단 대칭 · 타이틀 박스 → 이미지 → 텍스트 → 버튼)
const addComposedModule06 = () => {
  onModuleLeave()
  composedToast(moduleStore.addComposedModule06(), '모듈 06')
}

// [임시/POC] 모듈 07 조립형 (좌 이미지 · 우 타이틀+텍스트+버튼)
const addComposedModule07 = () => {
  onModuleLeave()
  composedToast(moduleStore.addComposedModule07(false), '모듈 07')
}

// [임시/POC] 모듈 07 반대 방향 조립형 (우 이미지 · 좌 타이틀+텍스트+버튼)
const addComposedModule07Reverse = () => {
  onModuleLeave()
  composedToast(moduleStore.addComposedModule07(true), '모듈 07(반대)')
}

// [임시/POC] 뉴스 헤드라인 헤더 조립형 (로고 → 굵은선 → 제목|웹으로보기 → 얇은선)
const addComposedNewsHeader = () => {
  onModuleLeave()
  composedToast(moduleStore.addComposedNewsHeader(), '뉴스 헤드라인 헤더')
}

// [임시/POC] 기본 헤더 조립형 (상단선 → 로고 → 하단선 → 타이틀)
const addComposedBasicHeader = () => {
  onModuleLeave()
  composedToast(moduleStore.addComposedBasicHeader(), '기본 헤더')
}

// [임시/POC] 이미지형 헤더 조립형 (비주얼 → 볼/날짜/홈 → 구분선 → 타이틀+본문 → 버튼)
const addComposedImageHeader = () => {
  onModuleLeave()
  composedToast(moduleStore.addComposedImageHeader(), '이미지형 헤더')
}

// [임시/POC] 복수 이미지 조립형 (좌·우 이미지 2컬럼)
const addComposedMultiImage = () => {
  onModuleLeave()
  composedToast(moduleStore.addComposedMultiImage(), '복수 이미지')
}

// [임시/POC] 하단 푸터 조립형 (회사정보 → 구분선 → SNS 아이콘 → 수신거부, 그룹 배경색)
const addComposedFooter = () => {
  onModuleLeave()
  composedToast(moduleStore.addComposedFooter(), '하단 푸터')
}

// [임시/POC] 복수 버튼 조립형 (단일 버튼 2개 · 2단)
const addComposedTwoButton = () => {
  onModuleLeave()
  composedToast(moduleStore.addComposedTwoButton(), '복수 버튼')
}

// ===== 모듈 인라인 썸네일 (호버 없이 카드에 상시 표시) =====
const MODULE_WIDTH = 680 // 모듈 템플릿 기준 폭(px)

const previewCache = new Map<string, string>()
const thumbs = reactive<Record<string, string>>({}) // module.id → iframe srcdoc

const buildPreviewDoc = (content: string): string =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank">` +
  `<style>html,body{margin:0;padding:0;background:#fff;overflow:hidden;}*{box-sizing:border-box;}</style></head>` +
  `<body><div style="width:${MODULE_WIDTH}px;max-width:${MODULE_WIDTH}px;margin:0;">${content}</div></body></html>`

// 카드가 화면에 들어올 때만 렌더(성능) — 결과는 캐시
const renderThumb = async (id: string) => {
  if (thumbs[id]) return
  const cached = previewCache.get(id)
  if (cached) {
    thumbs[id] = cached
    return
  }
  try {
    const doc = buildPreviewDoc(await moduleStore.renderModulePreview(id))
    previewCache.set(id, doc)
    thumbs[id] = doc
  } catch (e) {
    console.warn('[ModulePanel] 썸네일 렌더 실패:', id, e)
  }
}

// IntersectionObserver로 보이는 카드만 지연 렌더
const cardEls = new Map<string, Element>()
const thumbObserver =
  typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue
            const id = (e.target as HTMLElement).dataset.moduleId
            if (id) renderThumb(id)
            thumbObserver?.unobserve(e.target)
          }
        },
        { rootMargin: '200px' },
      )
    : null

const observeCard = (el: Element | null, id: string) => {
  const prev = cardEls.get(id)
  if (prev && thumbObserver) thumbObserver.unobserve(prev)
  if (!el) {
    cardEls.delete(id)
    return
  }
  cardEls.set(id, el)
  if (thumbObserver) thumbObserver.observe(el)
  else renderThumb(id) // 옵저버 미지원 폴백
}

// 조립형 핸들러 호환용 — 인라인 썸네일에선 닫을 미리보기가 없음(no-op)
const onModuleLeave = () => {}

onUnmounted(() => {
  thumbObserver?.disconnect()
})

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

<style scoped>
/* 모듈 카드 인라인 썸네일 — 680px 렌더를 카드 폭에 맞춰 축소, 상단 크롭 */
.module-thumb {
  width: 100%;
  height: 116px;
  overflow: hidden;
  background: #fff;
  border-bottom: 1px solid #eef0f2;
  position: relative;
}
.module-thumb-iframe {
  width: 680px;
  height: 900px;
  border: 0;
  display: block;
  background: #fff;
  /* 262/680 ≈ 0.385 — 좁은 패널 카드 폭 기준 */
  transform: scale(0.385);
  transform-origin: top left;
  pointer-events: none;
}
.module-thumb-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

