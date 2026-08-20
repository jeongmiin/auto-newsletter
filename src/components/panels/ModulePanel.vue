<template>
  <div class="h-full flex flex-col">
    <!-- 검색 + 카테고리 -->
    <!-- 아래 구분선은 탭(.p-tablist)이 그린다 — Figma는 패널 전체 폭이 아니라 콘텐츠 폭에만 긋는다 -->
    <div v-if="mode === 'modules'" class="mp-head">
      <!-- 패널 제목 — 다른 레일 메뉴 패널과 같은 panel-title (Figma 1125-2974) -->
      <h2 class="panel-title">모듈</h2>

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

      <!-- 카테고리 탭 — 글자 폭에 맞추고, 패널을 넘치면 좌우 화살표로 넘긴다 (Figma 908-11145).
           PrimeVue Tabs(scrollable)가 넘침 감지와 화살표를 담당하고, 겉모습만 기존 밑줄 탭으로 덮어쓴다. -->
      <Tabs
        :value="selectedCategory"
        scrollable
        class="mp-tabs"
        @update:value="goToCategory(String($event))"
      >
        <TabList>
          <Tab v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </Tab>
        </TabList>
      </Tabs>
    </div>

    <!-- 콘텐츠 영역 -->
    <div ref="contentEl" class="flex-1 overflow-y-auto px-[25px] pt-2 pb-10" @scroll="onModuleLeave">
      <!-- [임시] 조립형 모듈 v2 (POC) -->
      <div v-if="mode === 'modules-v2'" class="space-y-3">
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
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import ModuleCard from './ModuleCard.vue'
import { useModuleThumbnails } from '@/composables/useModuleThumbnails'
import { storeToRefs } from 'pinia'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { useToast } from 'primevue/usetoast'
import type { ModuleMetadata } from '@/types'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()
const toast = useToast()

// 모듈/템플릿 탭 모드는 editorStore에서 공유 (캔버스 빈 화면 버튼에서도 전환)
const { modulePanelMode: mode } = storeToRefs(editorStore)
const selectedCategory = ref<string>('all')
const modules = ref<ModuleMetadata[]>([])

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
// 단일(그룹 아님) 모듈의 기본 좌·우 여백 오버라이드.
// 이미지는 컨테이너 여백, 버튼은 배경이 채워지도록 '안쪽' 여백(바깥은 0).
const SINGLE_SIDE_OVERRIDES: Record<string, Record<string, string>> = {
  ModuleImg: { paddingLeft: '20px', paddingRight: '20px' },
  ModuleOneButton: { buttonPaddingLeft: '20px', buttonPaddingRight: '20px', paddingLeft: '20px', paddingRight: '20px' },
  ModuleSmallButton: { btnPaddingLeft: '20px', btnPaddingRight: '20px', paddingLeft: '20px', paddingRight: '20px' },
  ModuleInlineText: { paddingLeft: '20px', paddingRight: '20px' },
}

// 조립형 그룹 모듈의 기본 좌·우 '안쪽' 여백(그룹 스타일 padding). 배경색이 이 여백까지 채워지도록.
const GROUP_SIDE_PADDING: Record<string, string> = {
  ModuleImageHeader: '20px',
  Module02: '20px',
  ModuleMultiImage: '15px',
  ModuleTwoButton: '15px',
  'Module01-1': '15px',
  Module04: '15px',
  Module05: '15px',
  'Module05-3': '15px',
  Module06: '15px',
  Module07: '15px',
  Module07_reverse: '15px',
  Module10: '15px',
  'Module10-1': '15px',
}

const addModule = (module: ModuleMetadata) => {
  onModuleLeave() // 추가 시 미리보기 닫기
  const builder = moduleStore.composedBuilderMap[module.id]
  if (builder) {
    const groupId = builder()
    if (groupId) {
      moduleStore.setGroupName(groupId, module.name)
      // 그룹은 선택 없이 추가 — 첫 멤버가 선택된 채면 다음 개별 모듈이 그룹 안으로 들어간다.
      moduleStore.clearSelection()
      const sp = GROUP_SIDE_PADDING[module.id]
      if (sp) moduleStore.setGroupSidePadding(groupId, sp)
    }
  } else {
    moduleStore.addModule(module)
    // 단일 모듈의 기본 좌·우 여백 오버라이드
    const ov = SINGLE_SIDE_OVERRIDES[module.id]
    if (ov) {
      for (const [key, value] of Object.entries(ov)) moduleStore.updateModuleProperty(key, value)
    }
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
  if (groupId) {
    moduleStore.setGroupName(groupId, '모듈 02')
    moduleStore.clearSelection()
  }
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
  if (groupId) {
    moduleStore.setGroupName(groupId, '모듈 04')
    moduleStore.clearSelection()
  }
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
  if (groupId) {
    moduleStore.setGroupName(groupId, '모듈 01-1')
    moduleStore.clearSelection()
  }
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
  if (groupId) {
    moduleStore.setGroupName(groupId, '모듈 05')
    moduleStore.clearSelection()
  }
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
  if (groupId) {
    moduleStore.setGroupName(groupId, name)
    // 그룹은 선택 없이 추가 — 첫 멤버가 선택된 채면 다음 개별 모듈이 그룹 안으로 들어간다.
    moduleStore.clearSelection()
  }
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

onMounted(async () => {
  modules.value = await moduleStore.loadAvailableModules()
  // 카테고리 아코디언에 들어가는 모든 모듈 썸네일을 미리 렌더 → 카드 높이 확정 → 탭 이동 시 깜빡임 방지
  const ids = new Set<string>()
  for (const catId of Object.keys(CATEGORY_MODULE_IDS)) {
    for (const id of CATEGORY_MODULE_IDS[catId]) ids.add(id)
  }
  prerenderThumbs([...ids])
})
</script>

<style scoped>
/* 패널 머리 — 제목 ↔ 검색 20px (Figma 1125-2972) */
.mp-head {
  padding-top: 25px;
}
/* 다른 레일 메뉴 패널(GlobalStylePanel·CategoryModulePanel)과 동일한 제목 스타일 */
/* 제목 모양은 panels.css의 공용 .panel-title — 여기선 패널 여백만 얹는다 */
.panel-title {
  margin: 0 25px 20px;
}
/* 검색창 모양은 panels.css의 공용 .mp-search* — 여기선 패널 좌우 여백만 얹는다 */
.mp-search {
  margin: 0 25px;
}

/* 카테고리 탭 — 한 줄, 활성 탭 밑줄 (Figma 334-2630) */
/* 카테고리 탭 (Figma 908-11156) — PrimeVue Tabs(scrollable) 위에 디자인 스킨을 입힌다.
   구조도 Figma와 같게 맞췄다: 회색 기준선은 컨테이너(Line 56), 파란 표시는 활성 바(Line 57). */
.mp-tabs {
  /* 탭·기준선은 콘텐츠 폭(패널에서 25px 안쪽)에 맞추고,
     화살표만 그 바깥(패널 가장자리에서 9px)까지 나간다 */
  --tab-inset: 25px;
  position: relative; /* 화살표 절대배치 기준 */
  margin-top: 26px;
  padding: 0 var(--tab-inset);
}
/* Line 56 — 탭 아래 기준선. 스크롤되는 탭이 아니라 보이는 영역(콘텐츠 폭)에 그린다 */
.mp-tabs :deep(.p-tablist) {
  border-bottom: 1.5px solid var(--gray-200);
  /* 기본값 hidden이면 콘텐츠 폭 바깥에 놓인 화살표가 잘린다.
     탭 넘침은 아래 .p-tablist-content가 자르므로 여기선 잘라낼 필요가 없다. */
  overflow: visible;
}
/* 탭 넘침을 실제로 감추는(그리고 스크롤하는) 층 */
.mp-tabs :deep(.p-tablist-content) {
  overflow: hidden;
}
.mp-tabs :deep(.p-tablist-tab-list) {
  border: 0;
  background: none;
  /* 탭 사이 간격은 각 탭의 좌우 padding이 만든다 (gap을 더하면 두 배로 벌어진다) */
  gap: 0;
}
.mp-tabs :deep(.p-tab) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  /* padding에 세로값이 없으므로 높이를 직접 준다(안 주면 글자 높이까지 줄어든다) */
  height: 27px;
  padding: 0 12px;
  border: 0;
  background: none;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: -0.14px;
  color: var(--gray-600);
  white-space: nowrap;
  transition: color 0.12s;
}
.mp-tabs :deep(.p-tab:hover) {
  color: var(--gray-700);
  background: none;
}
.mp-tabs :deep(.p-tab-active) {
  color: var(--blue-400);
}
/* Line 57 — 활성 탭 아래 파란 바. 기준선을 덮도록 1.5px 내려 붙인다 */
.mp-tabs :deep(.p-tablist-active-bar) {
  height: 2px;
  bottom: -1.5px;
  background: var(--blue-400);
}
/* 넘칠 때 나오는 화살표 (Figma 908-23354) — 28px 흰 원형 + 그림자.
   탭 줄 '위에 떠서' 가리는 형태라, 자리를 차지하지 않도록 절대배치한다
   (PrimeVue 기본값은 인라인이라 그대로 두면 탭이 그만큼 밀린다). */
.mp-tabs :deep(.p-tablist-nav-button) {
  position: absolute;
  top: -3px;
  z-index: 1;
  width: 28px;
  height: 28px;
  margin: 0;
  border: 0;
  border-radius: 50%;
  background: var(--white);
  color: var(--gray-700);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.25);
}
/* 절대배치의 기준은 padding 안쪽이라, 패널 가장자리 기준 9px가 되도록 inset만큼 되돌린다 */
.mp-tabs :deep(.p-tablist-prev-button) {
  left: calc(9px - var(--tab-inset));
}
.mp-tabs :deep(.p-tablist-next-button) {
  right: calc(9px - var(--tab-inset));
}

/* 카테고리 아코디언 (Figma 483-2618 / 637-2113) */
.mp-acc-list {
  display: flex;
  flex-direction: column;
}
.mp-acc {
  border-bottom: 1px solid var(--gray-100);
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
  color: var(--gray-750);
  letter-spacing: -0.15px;
}
.mp-acc-count {
  color: var(--gray-500);
  font-weight: 400;
}
.mp-acc-chevron {
  font-size: 13px;
  color: var(--gray-500);
}
/* 아코디언 본문 — 카드 목록 하단 여백 (아코디언 전용 차이) */
.mp-acc .module-card-grid {
  padding-bottom: 20px;
}
</style>

