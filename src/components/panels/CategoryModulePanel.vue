<template>
  <div class="category-module-panel">
    <h2 class="panel-title">{{ categoryLabel }}</h2>

    <!-- 빠른추가 -->
    <div class="quick-add-list">
      <button
        v-for="item in quickAddItems"
        :key="item.label"
        type="button"
        class="quick-add-card"
        :class="{ 'quick-add-card--preview': item.preview }"
        @click="onQuickAdd(item)"
      >
        <!-- 이미지 카테고리: 미리보기 플레이스홀더 (단일 1칸 / 2단 2칸) -->
        <template v-if="isImagePreview(item.preview)">
          <div class="qa-preview" :class="{ 'qa-preview--double': item.preview === 'double-image' }">
            <img
              v-for="n in item.preview === 'double-image' ? 2 : 1"
              :key="n"
              :src="item.preview === 'double-image' ? img02 : img01"
              alt=""
              class="qa-preview-img"
            />
          </div>
          <div class="qa-foot">
            <span class="quick-add-label">{{ item.label }}</span>
            <span class="material-symbols-outlined quick-add-icon">add</span>
          </div>
        </template>
        <!-- 버튼 카테고리: 스타일 버튼 미리보기 (단일 큰 버튼 / 2단 / 작은 알약) -->
        <template v-else-if="isButtonPreview(item.preview)">
          <div class="qa-btn-preview" :class="{ 'qa-btn-preview--small': item.preview === 'small-button' }">
            <span
              v-for="(t, i) in buttonPreviewLabels(item.preview)"
              :key="i"
              class="qa-btn"
              :class="{ 'qa-btn--small': item.preview === 'small-button' }"
            >{{ t }}</span>
          </div>
          <div class="qa-foot">
            <span class="quick-add-label">{{ item.label }}</span>
            <span class="material-symbols-outlined quick-add-icon">add</span>
          </div>
        </template>
        <!-- 그 외 카테고리: 라벨 + 추가 아이콘 한 줄 -->
        <template v-else>
          <span class="quick-add-label">{{ item.label }}</span>
          <span class="material-symbols-outlined quick-add-icon">add</span>
        </template>
      </button>
    </div>

    <!-- 카테고리 갤러리 (완성 조립 블록 · v2 우선, 없으면 레거시 폴백) -->
    <!-- 카드는 ModulePanel(모듈 탭)과 동일한 ModuleCard.vue를 공유해 UI가 완전히 일치한다. -->
    <div v-if="galleryModules.length" class="gallery-section">
      <span class="gallery-title">{{ categoryLabel }}형 모듈</span>
      <div class="module-card-grid">
        <ModuleCard
          v-for="module in galleryModules"
          :key="module.id"
          :ref="(inst: any) => observeCard(inst?.rootEl ?? null, module.id)"
          :module="module"
          :srcdoc="thumbs[module.id]"
          :iframe-height="thumbIframeHeight(module.id)"
          :box-height="thumbBoxHeight(module.id)"
          @add="onGalleryAdd(module)"
          @thumb-load="(e: Event) => measureThumbHeight(module.id, e)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import ModuleCard from './ModuleCard.vue'
import { useModuleStore } from '@/stores/moduleStore'
import { useModuleThumbnails } from '@/composables/useModuleThumbnails'
import type { ModuleMetadata } from '@/types'
import img01 from '@/assets/img/img01.png'
import img02 from '@/assets/img/img02.png'

type Category = 'text' | 'image' | 'button' | 'table'

interface Props {
  category: Category
}
const props = defineProps<Props>()

const moduleStore = useModuleStore()
const toast = useToast()
// 썸네일 캐시·기하 모두 composable에서 공유 — ModulePanel과 동일 로직/동일 카드(ModuleCard.vue)
const { thumbs, observeCard, measureThumbHeight, thumbIframeHeight, thumbBoxHeight } =
  useModuleThumbnails()

const CATEGORY_LABELS: Record<Category, string> = {
  text: '텍스트',
  image: '이미지',
  button: '버튼',
  table: '테이블',
}
const categoryLabel = computed(() => CATEGORY_LABELS[props.category])

interface QuickAddItem {
  label: string
  moduleId: string
  /** 조립형 빌더 키(선택) — moduleId와 다른 조립 템플릿을 쓸 때 지정. 예: '타이틀 추가'는
   *  SectionTitle 대신 구분선+텍스트 2개 조립 그룹(ComposedTitleSection)을 만든다.
   *  (같은 SectionTitle을 쓰는 '서브타이틀 추가'가 이 빌더에 휩쓸리지 않도록 분리) */
  composedBuilderId?: string
  /** 추가 직후 덮어쓸 속성 묶음(선택) — 예: "서브타이틀"·"텍스트"는 ModuleDescText에 폰트/여백 기본값을 얹어 재사용 */
  overrides?: Record<string, unknown>
  /** 미리보기 카드 표시(선택) — 이미지: 플레이스홀더, 버튼: 스타일 버튼 미리보기 */
  preview?: 'single-image' | 'double-image' | 'single-button' | 'double-button' | 'small-button'
}

const isImagePreview = (p?: string): boolean => p === 'single-image' || p === 'double-image'
const isButtonPreview = (p?: string): boolean =>
  p === 'single-button' || p === 'double-button' || p === 'small-button'
// 버튼 미리보기에 그릴 버튼 라벨들 (각 모듈 기본 텍스트에 맞춤)
const buttonPreviewLabels = (p?: string): string[] => {
  if (p === 'double-button') return ['버튼 1 →', '버튼 2 →']
  if (p === 'small-button') return ['버튼 1 →']
  return ['큰 버튼 →']
}

// 원소 모듈 "빠른추가" — 항상 moduleStore.addModule()로 삽입한다.
// (선택된 모듈이 v2 그룹 멤버면 addModule이 이미 그 그룹에 이어붙이므로 별도 배선 불필요)
// 폰트 크기·굵기를 지정한 한 줄 DescText 내용 HTML (moduleStore.weightedTextHtml과 동일 포맷)
const weightedTextHtml = (text: string, fontSize: string, weight: number, align = 'left'): string =>
  `<p style="margin:0; padding:0; line-height:1.7; text-align:${align};"><span style="font-size:${fontSize}; font-weight:${weight};">${text}</span></p>`

const QUICK_ADD_ITEMS: Record<Category, QuickAddItem[]> = {
  text: [
    { label: '타이틀 추가', moduleId: 'SectionTitle', composedBuilderId: 'ComposedTitleSection' },
    {
      // 서브타이틀 = '타이틀 추가' 그룹의 타이틀 텍스트와 같은 속성(18px/700, 여백 15/20/15/20)을 가진 단일 텍스트 모듈
      label: '서브타이틀 추가',
      moduleId: 'ModuleDescText',
      overrides: {
        descriptionText: weightedTextHtml('서브 타이틀을 입력하세요', '18px', 700),
        fontSize: '18px',
        paddingTop: '15px',
        paddingRight: '20px',
        paddingBottom: '15px',
        paddingLeft: '20px',
      },
    },
    // 텍스트 = 좌우 20px 여백을 기본으로 얹은 설명 텍스트 모듈
    { label: '텍스트 추가', moduleId: 'ModuleDescText', overrides: { paddingLeft: '20px', paddingRight: '20px' } },
  ],
  image: [
    { label: '단일 이미지 추가', moduleId: 'ModuleImg', preview: 'single-image' },
    { label: '2단 이미지 추가', moduleId: 'ModuleMultiImage', preview: 'double-image' },
  ],
  button: [
    { label: '단일 버튼 추가', moduleId: 'ModuleOneButton', preview: 'single-button' },
    { label: '2단 버튼 추가', moduleId: 'ModuleTwoButton', preview: 'double-button' },
    { label: '작은 버튼 추가 (최대 4단)', moduleId: 'ModuleSmallButton', preview: 'small-button' },
  ],
  // 테이블은 v2 조립 템플릿이 아직 없어 레거시 '커스텀 테이블'(ModuleTable)을 그대로 쓴다.
  table: [{ label: '테이블 추가', moduleId: 'ModuleTable' }],
}
const quickAddItems = computed(() => QUICK_ADD_ITEMS[props.category])

// 갤러리: 이 카테고리에 속하는 완성형 모듈. 클릭 시 v2 조립 템플릿이 있으면 그걸(onGalleryAdd),
// 없으면 레거시 addModule로 폴백한다(moduleStore.composedBuilderMap 참고).
// 빠른추가로 이미 제공되는 원소 모듈(예: 단일 이미지·복수 이미지)은 갤러리에서 중복 제외한다.
const galleryModules = computed<ModuleMetadata[]>(() => {
  const quickIds = new Set(quickAddItems.value.map((q) => q.moduleId))
  return moduleStore.availableModules.filter(
    (m) => !m.hidden && m.category === props.category && !quickIds.has(m.id),
  )
})

onMounted(() => {
  if (moduleStore.availableModules.length === 0) {
    moduleStore.loadAvailableModules()
  }
})

const notifyAdded = (name: string) => {
  toast.add({
    severity: 'success',
    summary: '모듈 추가됨',
    detail: `${name} 모듈이 추가되었습니다`,
    life: 2000,
  })
}

const onQuickAdd = (item: QuickAddItem) => {
  const meta = moduleStore.availableModules.find((m) => m.id === item.moduleId)
  if (!meta) return
  // 조립형 빌더가 있으면(예: 2단 이미지=단일 이미지 2개, 2단 버튼=단일 버튼 2개) 2컬럼 그룹으로 추가.
  // composedBuilderId가 지정되면 moduleId 대신 그 키로 빌더를 찾는다('타이틀 추가' 등).
  const builder = moduleStore.composedBuilderMap[item.composedBuilderId ?? item.moduleId]
  if (builder) {
    const groupId = builder()
    if (groupId) {
      moduleStore.setGroupName(groupId, meta.name)
      // 그룹은 선택 없이 추가한다 — 첫 멤버가 선택된 채면 이어서 개별 모듈을 추가할 때
      // 그 그룹 안으로 들어가 버리기 때문(그룹 밖 맨 끝에 붙도록 선택을 비운다).
      moduleStore.clearSelection()
    }
  } else {
    moduleStore.addModule(meta)
    if (item.overrides) {
      for (const [key, value] of Object.entries(item.overrides)) {
        moduleStore.updateModuleProperty(key, value)
      }
    }
  }
  notifyAdded(item.label.replace(/\s*추가$/, ''))
}

const onGalleryAdd = (module: ModuleMetadata) => {
  const builder = moduleStore.composedBuilderMap[module.id]
  if (builder) {
    const groupId = builder()
    if (groupId) {
      moduleStore.setGroupName(groupId, module.name)
      // 그룹은 선택 없이 추가 — 첫 멤버가 선택된 채면 다음 개별 모듈이 그룹 안으로 들어간다.
      moduleStore.clearSelection()
    }
  } else {
    moduleStore.addModule(module)
  }
  notifyAdded(module.name)
}
</script>

<style scoped>
.category-module-panel {
  width: var(--left-panel-width, 360px);
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e5e8eb;
  height: 100%;
  overflow-y: auto;
  /* 좌우 20px → 내부 폭 320px = ModuleCard 폭과 정확히 일치 (넘침 방지) */
  padding: 25px;
  display: flex;
  flex-direction: column;
  gap: 26px;
}
.panel-title {
  font-size: 20px;
  font-weight: 500;
  color: #191f28;
  letter-spacing: -0.2px;
}

.quick-add-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.quick-add-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 20px;
  border: 1px solid #e5e8eb;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  text-align: left;
}
.quick-add-card:hover {
  border-color: #4083f3;
  background: #f6f9ff;
}
.quick-add-label {
  font-size: 16px;
  font-weight: 500;
  color: #191f28;
}
.quick-add-icon {
  font-size: 24px;
  color: #8b95a1;
  flex-shrink: 0;
}

/* 미리보기 빠른추가 카드(이미지·버튼) — 상단 미리보기 + 하단 라벨/추가 아이콘 (세로 배치) */
.quick-add-card--preview {
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  padding: 12px;
}
.qa-preview {
  display: flex;
  gap: 10px;
}
.qa-preview-img {
  flex: 1;
  min-width: 0;
  width: 100%;
  height: auto;
  display: block;
  border-radius: 4px;
}
.qa-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 버튼 미리보기 — 실제 버튼 형태로 표시 */
.qa-btn-preview {
  display: flex;
  gap: 8px;
}
.qa-btn-preview--small {
  justify-content: flex-start;
}
.qa-btn {
  flex: 1;
  min-width: 0;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #191f28;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  border-radius: 4px;
  white-space: nowrap;
}
/* 작은 버튼: 알약형 회색, 폭 고정(왼쪽 정렬) */
.qa-btn--small {
  flex: 0 0 auto;
  height: 30px;
  padding: 0 18px;
  background: #e5e5e5;
  color: #333333;
  font-weight: 500;
  border-radius: 30px;
}

.gallery-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.gallery-title {
  font-size: 16px;
  font-weight: 500;
  color: #333d4b;
}
</style>
