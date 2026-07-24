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

    <!-- 검색 + 카테고리 (모듈 모드에서만) — Figma 334-2630 -->
    <div v-if="mode === 'modules'" class=" pt-3 border-b">
      <!-- 모듈 검색 -->
      <div class="mp-search mx-3">
        <span class="material-symbols-outlined mp-search-icon">search</span>
        <input
          v-model="searchQuery"
          type="text"
          class="mp-search-input"
          placeholder="모듈을 검색하세요"
          spellcheck="false"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="mp-search-clear"
          title="검색어 지우기"
          @click="searchQuery = ''"
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- 카테고리 탭 (한 줄, 활성 탭 밑줄) -->
      <div class="mp-tabs">
        <button
          v-for="category in categories"
          :key="category.id"
          type="button"
          class="mp-tab"
          :class="{ 'is-active': selectedCategory === category.id }"
          @click="selectedCategory = category.id"
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

      <!-- 모듈 리스트 (카드 폭 고정 — 패널이 넓어져도 카드는 안 늘고 열 수만 늘어남) -->
      <div v-else class="module-list">
        <div
          v-for="module in filteredModules"
          :key="module.id"
          :ref="(el) => observeCard(el as Element | null, module.id)"
          :data-module-id="module.id"
          @click="addModule(module)"
          class="module-card border rounded-lg cursor-pointer hover:border-blue-400 transition-colors overflow-hidden"
        >
          <!-- 상시 썸네일 (호버 없이 카드에 바로 표시) — 높이는 각 iframe 실제 콘텐츠 높이×스케일 -->
          <div class="module-thumb" :style="{ height: `${thumbBoxHeight(module.id)}px` }">
            <iframe
              v-if="thumbs[module.id]"
              :srcdoc="thumbs[module.id]"
              class="module-thumb-iframe"
              :style="{ height: `${thumbIframeHeight(module.id)}px` }"
              @load="measureThumbHeight(module.id, $event)"
              title="모듈 미리보기"
              sandbox="allow-same-origin"
            ></iframe>
            <div v-else class="module-thumb-loading">
              <i :class="module.icon" class="text-2xl text-gray-300"></i>
            </div>
          </div>
          <div class="p-3 bg-gray-50">
            <div class="font-medium text-sm truncate">{{ module.name }}</div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useModuleThumbnails } from '@/composables/useModuleThumbnails'
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

const searchQuery = ref('')

const categories = [
  { id: 'all', name: '전체' },
  { id: 'common', name: '공통' },
  { id: 'imageType', name: '이미지형' },
  { id: 'textType', name: '텍스트형' },
  { id: 'col1', name: '1단' },
  { id: 'col2', name: '2단' },
]

// 카테고리별 모듈 목록 — 모듈의 category 필드가 아니라 명시적 id 목록으로 관리한다.
// (한 모듈이 여러 카테고리에 속할 수 있음: 예) 모듈 02 = 이미지형 + 1단)
const CATEGORY_MODULE_IDS: Record<string, string[]> = {
  common: [
    'ModuleNewsHeader', // 뉴스 헤드라인 헤더
    'ModuleBasicHeader', // 기본 헤더
    'ModuleImageHeader', // 이미지형 헤더
    'ModuleFooter', // 하단 푸터
    'ModuleSnsIcons', // SNS 아이콘
    'ModuleDivider', // 구분선, 여백
    'TopLanguageButton', // 언어 선택 버튼
  ],
  imageType: [
    'Module02',
    'Module04',
    'Module05-3', // 노출되는 '모듈 05번' (Module05/05-1은 hidden)
    'Module06',
    'Module07',
    'Module07_reverse', // 모듈 07번 (반대 방향)
    'Module10',
    'Module10-1',
  ],
  textType: ['Module01', 'Module01-1', 'Module01-2', 'Module11', 'Module12'],
  col1: [
    'ModuleImg', // 단일 이미지
    'ModuleOneButton', // 단일 버튼
    'ModuleSmallButton', // 작은 버튼
    'Module01',
    'Module01-2',
    'Module02',
    'Module11',
    'Module12',
  ],
  col2: [
    'ModuleMultiImage', // 복수 이미지
    'ModuleTwoButton', // 복수 버튼
    'Module01-1',
    'Module04',
    'Module05-3',
    'Module06',
    'Module07',
    'Module07_reverse',
    'Module10',
    'Module10-1',
  ],
}

const filteredModules = computed(() => {
  // hidden 모듈은 팔레트에서 제외 (통합/폐기된 모듈 — 기존 데이터 렌더링은 계속 지원)
  const visible = modules.value.filter((module) => !module.hidden)
  const inCategory =
    selectedCategory.value === 'all'
      ? visible
      : visible.filter((module) =>
          (CATEGORY_MODULE_IDS[selectedCategory.value] ?? []).includes(module.id),
        )
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return inCategory
  return inCategory.filter(
    (module) =>
      module.name.toLowerCase().includes(q) ||
      (module.description ?? '').toLowerCase().includes(q),
  )
})

// 모듈 v2(조립형) 템플릿이 있으면 그걸 추가하고, 없으면 레거시 단일 모듈로 폴백한다
// (CategoryModulePanel.vue의 onGalleryAdd와 동일한 규칙 — "모듈" 탭에서도 v2로 갈아끼울 수 있는 것은 v2로)
const addModule = (module: ModuleMetadata) => {
  onModuleLeave() // 추가 시 미리보기 닫기
  const builder = moduleStore.composedBuilderMap[module.id]
  if (builder) {
    const groupId = builder()
    if (groupId) moduleStore.setGroupName(groupId, module.name)
  } else {
    moduleStore.addModule(module)
  }
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
  if (groupId) moduleStore.setGroupName(groupId, '모듈 02')
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
  if (groupId) moduleStore.setGroupName(groupId, '모듈 04')
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
  if (groupId) moduleStore.setGroupName(groupId, '모듈 01-1')
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
  if (groupId) moduleStore.setGroupName(groupId, '모듈 05')
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
  if (groupId) moduleStore.setGroupName(groupId, name)
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
// CategoryModulePanel.vue와 공유하는 composable로 추출됨(캐시도 인스턴스 간 공유)
const { thumbs, observeCard, thumbHeights, measureThumbHeight } = useModuleThumbnails()

// 썸네일 표시 영역 = 카드 320px − 카드 테두리 1px×2 − .module-thumb padding 10px×2 = 298px.
// 680px 렌더를 298/680 ≈ 0.4382로 축소해 padding을 제외한 영역에 딱 맞춘다.
// (CSS의 .module-thumb padding, .module-thumb-iframe transform: scale()과 반드시 같은 값)
const THUMB_PADDING = 10
const THUMB_SCALE = 0.4382
const THUMB_FALLBACK_H = 900 // 측정 전 임시 높이(미스케일)
const thumbIframeHeight = (id: string): number => thumbHeights[id] || THUMB_FALLBACK_H
// .module-thumb는 box-sizing:border-box라 height에 padding이 포함된다 → 축소 높이 + 상하 padding
const thumbBoxHeight = (id: string): number =>
  Math.round(thumbIframeHeight(id) * THUMB_SCALE) + THUMB_PADDING * 2

// 조립형 핸들러 호환용 — 인라인 썸네일에선 닫을 미리보기가 없음(no-op)
const onModuleLeave = () => {}

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
/* 모듈 검색 (Figma 334-2630) */
.mp-search {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 10px;
  border: 1px solid #e5e8eb;
  border-radius: 8px;
  background: #fff;
}
.mp-search:focus-within {
  border-color: #4083f3;
}
.mp-search-icon {
  font-size: 18px;
  color: #8b95a1;
  flex-shrink: 0;
}
.mp-search-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: none;
  font-size: 14px;
  color: #191f28;
}
.mp-search-input::placeholder {
  color: #b0b8c1;
}
.mp-search-clear {
  display: flex;
  padding: 0;
  border: 0;
  background: none;
  color: #b0b8c1;
  cursor: pointer;
  flex-shrink: 0;
}
.mp-search-clear:hover {
  color: #6b7684;
}
.mp-search-clear .material-symbols-outlined {
  font-size: 16px;
}

/* 카테고리 탭 — 한 줄, 활성 탭 밑줄 (Figma 334-2630) */
.mp-tabs {
  display: flex;
  align-items: center;
  margin-top: 10px;
}
.mp-tab {
  flex: 1;
  min-width: 0;
  padding: 8px 2px;
  border: 0;
  background: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #8b95a1;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: color 0.12s, border-color 0.12s;
}
.mp-tab:hover {
  color: #4e5968;
}
.mp-tab.is-active {
  color: #4083f3;
  border-bottom-color: #4083f3;
}

/* 모듈 카드 폭 고정(320px) + 항상 1열 — 카드 높이가 모듈마다 달라서 다열 그리드는 어긋나 보이므로
   패널이 넓어져도 단일 열을 유지하고, 넓어진 폭은 좌우 여백으로 두어 카드를 중앙 정렬한다. */
.module-list {
  display: grid;
  grid-template-columns: 320px;
  gap: 20px;
}

/* 모듈 카드 인라인 썸네일 — 680px 렌더를 카드 폭에 맞춰 축소, 상단 크롭 */
.module-thumb {
  width: 100%;
  padding: 10px;
  overflow: hidden;
  background: #ffffff;
  border-bottom: 1px solid #eef0f2;
  position: relative;
  box-sizing: border-box;
}
.module-thumb-iframe {
  width: 680px;
  /* height는 실제 콘텐츠 높이로 인라인 지정 */
  border: 0;
  display: block;
  background: #fff;
  /* 298/680 ≈ 0.4382 — 카드 320px − 테두리 2px − padding 20px = 표시 영역 298px 기준 (THUMB_SCALE과 동일 값) */
  transform: scale(0.4382);
  border-radius: 0.5rem;
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

