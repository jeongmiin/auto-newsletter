<template>
  <div class="h-full flex flex-col">
    <!-- 검색 + 카테고리 -->
    <div v-if="mode === 'modules'" class="pt-[25px] border-b">
      <!-- 모듈 검색 -->
      <div class="mp-search">
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
          @click="goToCategory(category.id)"
        >
          {{ category.name }}
        </button>
      </div>
    </div>

    <!-- 콘텐츠 영역 -->
    <div ref="contentEl" class="flex-1 overflow-y-auto px-[25px] pt-2 pb-10" @scroll="onModuleLeave">
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
          @click="addComposedModule10"
          class="p-3 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 hover:border-amber-400 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-amber-100 text-amber-700 rounded flex items-center justify-center">
              <i class="pi pi-th-large"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">모듈 10 (조립형·세로)</div>
              <div class="text-xs text-gray-500 truncate">서브타이틀(설명텍스트) → 모듈 10번 본체 (1컬럼 세로 스택)</div>
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

      <!-- 카테고리 아코디언 (기본 열림 · 상단 탭과 연동) -->
      <div v-else class="mp-acc-list">
        <section
          v-for="cat in visibleAccordionCategories"
          :key="cat.id"
          :ref="(el) => setSectionEl(el, cat.id)"
          class="mp-acc"
        >
          <button type="button" class="mp-acc-header" @click="toggleCategory(cat.id)">
            <span class="mp-acc-title">
              {{ cat.name }} <span class="mp-acc-count">({{ categoryModules(cat.id).length }})</span>
            </span>
            <i
              class="pi mp-acc-chevron"
              :class="openCategories[cat.id] ? 'pi-chevron-up' : 'pi-chevron-down'"
            ></i>
          </button>
          <div v-show="openCategories[cat.id]" class="module-card-grid">
            <ModuleCard
              v-for="module in categoryModules(cat.id)"
              :key="module.id"
              :ref="(inst: any) => observeCard(inst?.rootEl ?? null, module.id)"
              :module="module"
              :srcdoc="thumbs[module.id]"
              :iframe-height="thumbIframeHeight(module.id)"
              :box-height="thumbBoxHeight(module.id)"
              @add="addModule(module)"
              @thumb-load="(e: Event) => measureThumbHeight(module.id, e)"
            />
          </div>
        </section>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import ModuleCard from './ModuleCard.vue'
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

// ===== 카테고리 아코디언 (Figma 483-2618 / 637-2113) =====
// '전체'를 제외한 카테고리들이 각각 아코디언 섹션이 되고, 상단 탭은 이 섹션으로 이동시키는 내비게이션이다.
const accordionCategories = categories.filter((c) => c.id !== 'all')

// 아코디언 열림 상태 — 기본 전부 열림
const openCategories = reactive<Record<string, boolean>>(
  Object.fromEntries(accordionCategories.map((c) => [c.id, true])),
)
const toggleCategory = (id: string) => {
  openCategories[id] = !openCategories[id]
}

// 카테고리별 모듈(검색어 반영, hidden 제외)
const categoryModules = (catId: string): ModuleMetadata[] => {
  const ids = CATEGORY_MODULE_IDS[catId] ?? []
  const list = modules.value.filter((m) => !m.hidden && ids.includes(m.id))
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(
    (m) => m.name.toLowerCase().includes(q) || (m.description ?? '').toLowerCase().includes(q),
  )
}

// 검색 중에는 결과가 없는 카테고리 아코디언은 숨긴다
const visibleAccordionCategories = computed(() =>
  accordionCategories.filter((c) => !searchQuery.value.trim() || categoryModules(c.id).length > 0),
)

// ===== 탭 ↔ 아코디언 연동 =====
// 탭 클릭 → 해당 아코디언으로 스크롤(닫혀 있으면 열면서 이동). '전체'는 맨 위로.
const contentEl = ref<HTMLElement | null>(null)
const sectionEls: Record<string, HTMLElement> = {}
const setSectionEl = (el: unknown, id: string) => {
  if (el instanceof HTMLElement) sectionEls[id] = el
}
const goToCategory = (id: string) => {
  selectedCategory.value = id
  if (id === 'all') {
    contentEl.value?.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  openCategories[id] = true
  // 썸네일 높이를 미리 확정(prerenderThumbs)해 두므로 한 번의 부드러운 스크롤로 안착한다(깜빡임 없음).
  nextTick(() => {
    sectionEls[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

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

// [임시/POC] 모듈 10 조립형 (위 서브타이틀=설명텍스트 · 아래 모듈 10번 본체, 세로 스택)
const addComposedModule10 = () => {
  onModuleLeave()
  composedToast(moduleStore.addComposedModule10(), '모듈 10')
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
// CategoryModulePanel.vue와 공유하는 composable로 추출됨(캐시·기하 모두 인스턴스 간 공유).
// 카드 마크업/CSS도 ModuleCard.vue 한 곳에서 관리해 두 패널이 동일한 UI로 렌더된다.
const { thumbs, observeCard, prerenderThumbs, measureThumbHeight, thumbIframeHeight, thumbBoxHeight } =
  useModuleThumbnails()

// 조립형 핸들러 호환용 — 인라인 썸네일에선 닫을 미리보기가 없음(no-op)
const onModuleLeave = () => {}

const applyTemplate = (template: NewsletterTemplate) => {
  const doLoad = async () => {
    const ok = await moduleStore.loadTemplate(template.id)
    if (ok) {
      // 세그먼트 토글을 없앴으므로, 템플릿 적용 후 모듈 목록으로 자동 복귀
      // (템플릿 모드는 캔버스 빈 화면의 '템플릿으로 시작'에서만 진입한다)
      mode.value = 'modules'
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
  // 카테고리 아코디언에 들어가는 모든 모듈 썸네일을 미리 렌더 → 카드 높이 확정 → 탭 이동 시 깜빡임 방지
  const ids = new Set<string>()
  for (const catId of Object.keys(CATEGORY_MODULE_IDS)) {
    for (const id of CATEGORY_MODULE_IDS[catId]) ids.add(id)
  }
  prerenderThumbs([...ids])
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
  margin: 0 25px;
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

/* 카드 그리드 레이아웃은 전역 .module-card-grid(main.css)로 통일 — CategoryModulePanel과 공용 */

/* 카테고리 아코디언 (Figma 483-2618 / 637-2113) */
.mp-acc-list {
  display: flex;
  flex-direction: column;
}
.mp-acc {
  border-bottom: 1px solid #f2f4f6;
}
.mp-acc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 16px 2px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}
.mp-acc-title {
  font-size: 15px;
  font-weight: 500;
  color: #333d4b;
  letter-spacing: -0.15px;
}
.mp-acc-count {
  color: #8b95a1;
  font-weight: 400;
}
.mp-acc-chevron {
  font-size: 13px;
  color: #8b95a1;
}
/* 아코디언 본문 — 카드 목록 하단 여백 (아코디언 전용 차이) */
.mp-acc .module-card-grid {
  padding-bottom: 20px;
}
</style>

