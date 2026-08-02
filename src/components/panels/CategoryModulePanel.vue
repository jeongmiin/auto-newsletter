<template>
  <div class="category-module-panel">
    <h2 class="panel-title">{{ panelTitle }}</h2>

    <!-- 테이블: 크기 선택(사각형 그리드) + 직접 입력(행/열 스테퍼) — 두 값이 서로 연동된다 -->
    <div v-if="category === 'table'" class="table-add">
      <!-- 크기 선택 헤더: 좌 라벨 + 우 현재 크기 -->
      <div class="ts-head">
        <span class="ts-head-label">테이블 크기 선택</span>
        <span class="ts-head-size">{{ gridHiRows }} × {{ gridHiCols }} 테이블</span>
      </div>

      <!-- 사각형 그리드(6열 × 5행): 호버 미리보기 + 클릭 확정 -->
      <div class="ts-grid" @mouseleave="onGridLeave">
        <div v-for="r in TABLE_MAX_ROWS" :key="r" class="ts-grid-row">
          <button
            v-for="c in TABLE_MAX_COLS"
            :key="c"
            type="button"
            class="ts-cell"
            :class="{ 'ts-cell--on': r <= gridHiRows && c <= gridHiCols }"
            @mouseenter="onCellHover(r, c)"
            @click="onCellClick(r, c)"
            :aria-label="`${r}행 ${c}열`"
          />
        </div>
      </div>

      <div class="ts-divider"></div>

      <span class="ts-section-label">직접 입력</span>

      <!-- 직접 입력: 행/열 스테퍼 — 그리드와 양방향 연동 -->
      <div class="ts-inputs">
        <div class="ts-input-field">
          <span class="ts-input-label">행</span>
          <div class="ts-stepper">
            <button type="button" class="ts-step-btn" @click="stepRows(-1)" aria-label="행 감소">
              <span class="material-symbols-outlined">remove</span>
            </button>
            <span class="ts-step-div"></span>
            <input
              type="number"
              class="ts-step-val"
              :value="tableRows"
              min="1"
              max="50"
              @input="onRowsInput"
            />
            <span class="ts-step-div"></span>
            <button type="button" class="ts-step-btn" @click="stepRows(1)" aria-label="행 증가">
              <span class="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>
        <div class="ts-input-field">
          <span class="ts-input-label">열</span>
          <div class="ts-stepper">
            <button type="button" class="ts-step-btn" @click="stepCols(-1)" aria-label="열 감소">
              <span class="material-symbols-outlined">remove</span>
            </button>
            <span class="ts-step-div"></span>
            <input
              type="number"
              class="ts-step-val"
              :value="tableCols"
              min="1"
              max="20"
              @input="onColsInput"
            />
            <span class="ts-step-div"></span>
            <button type="button" class="ts-step-btn" @click="stepCols(1)" aria-label="열 증가">
              <span class="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>
      </div>

      <button type="button" class="ts-add-btn" @click="onAddTable">테이블 추가</button>
    </div>

    <!-- 빠른추가 -->
    <div v-else class="quick-add-list">
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
import { computed, onMounted, ref } from 'vue'
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
// 패널 타이틀 — 테이블은 Figma 디자인대로 '테이블 추가'로 표시(그 외 카테고리는 카테고리명)
const panelTitle = computed(() =>
  props.category === 'table' ? '테이블 추가' : categoryLabel.value,
)

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
    { label: '인라인 텍스트 추가', moduleId: 'ModuleInlineText', overrides: { paddingLeft: '20px', paddingRight: '20px' } },
  ],
  image: [
    // 단일 이미지 = 모듈 자체의 좌우 바깥 여백 20px 기본
    { label: '단일 이미지 추가', moduleId: 'ModuleImg', preview: 'single-image', overrides: { paddingLeft: '20px', paddingRight: '20px' } },
    { label: '2단 이미지 추가', moduleId: 'ModuleMultiImage', preview: 'double-image' },
  ],
  button: [
    // 단일/작은 버튼 = 배경이 채워지도록 '안쪽' 좌우 20px + 바깥 좌우 20px
    { label: '단일 버튼 추가', moduleId: 'ModuleOneButton', preview: 'single-button', overrides: { buttonPaddingLeft: '20px', buttonPaddingRight: '20px', paddingLeft: '20px', paddingRight: '20px' } },
    { label: '2단 버튼 추가', moduleId: 'ModuleTwoButton', preview: 'double-button' },
    { label: '작은 버튼 추가 (최대 4단)', moduleId: 'ModuleSmallButton', preview: 'small-button', overrides: { btnPaddingLeft: '20px', btnPaddingRight: '20px', paddingLeft: '20px', paddingRight: '20px' } },
  ],
  // 테이블은 v2 조립 템플릿이 아직 없어 레거시 '커스텀 테이블'(ModuleTable)을 그대로 쓴다.
  table: [{ label: '테이블 추가', moduleId: 'ModuleTable' }],
}
const quickAddItems = computed(() => QUICK_ADD_ITEMS[props.category])

// 조립형 그룹 모듈의 기본 좌·우 '안쪽' 여백(그룹 스타일 padding). 배경색이 이 여백까지 채워지도록.
// 키 = 갤러리 모듈 id 또는 빠른추가 빌더 키.
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
      const sp = GROUP_SIDE_PADDING[item.composedBuilderId ?? item.moduleId]
      if (sp) moduleStore.setGroupSidePadding(groupId, sp)
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

// ===== 테이블 크기 선택(그리드 ↔ 직접 입력 양방향 연동) =====
// 그리드는 6열 × 5행(Figma 640-3379). 세로 = 행, 가로 = 열.
const TABLE_MAX_ROWS = 5
const TABLE_MAX_COLS = 6
// 확정 값(직접 입력·그리드 클릭으로 갱신)
const tableRows = ref(2)
const tableCols = ref(2)
// 그리드 호버 미리보기(0 = 호버 없음)
const hoverRows = ref(0)
const hoverCols = ref(0)

// 그리드 하이라이트 = 호버 중이면 호버 값, 아니면 확정 값(그리드 범위로 캡).
const gridHiRows = computed(() => Math.min(TABLE_MAX_ROWS, hoverRows.value || tableRows.value))
const gridHiCols = computed(() => Math.min(TABLE_MAX_COLS, hoverCols.value || tableCols.value))

const onCellHover = (r: number, c: number) => {
  hoverRows.value = r
  hoverCols.value = c
}
const onGridLeave = () => {
  hoverRows.value = 0
  hoverCols.value = 0
}
const onCellClick = (r: number, c: number) => {
  // 그리드 클릭 → 행/열 숫자가 자동 갱신(직접 입력 인풋과 연동)
  tableRows.value = r
  tableCols.value = c
  hoverRows.value = 0
  hoverCols.value = 0
}
// 직접 입력 → 확정 값 갱신(그리드 하이라이트가 자동으로 따라온다)
const clampInt = (raw: string, min: number, max: number): number | null => {
  const n = parseInt(raw, 10)
  if (Number.isNaN(n)) return null
  return Math.min(max, Math.max(min, n))
}
const onRowsInput = (e: Event) => {
  const v = clampInt((e.target as HTMLInputElement).value, 1, 50)
  if (v !== null) tableRows.value = v
}
const onColsInput = (e: Event) => {
  const v = clampInt((e.target as HTMLInputElement).value, 1, 20)
  if (v !== null) tableCols.value = v
}
// 스테퍼(− / +) — 그리드 하이라이트가 자동으로 따라온다
const stepRows = (delta: number) => {
  tableRows.value = Math.min(50, Math.max(1, tableRows.value + delta))
}
const stepCols = (delta: number) => {
  tableCols.value = Math.min(20, Math.max(1, tableCols.value + delta))
}

const onAddTable = () => {
  const meta = moduleStore.availableModules.find((m) => m.id === 'ModuleTable')
  if (!meta) return
  moduleStore.addModule(meta)
  const id = moduleStore.selectedModuleId
  if (id) moduleStore.setCustomTableSize(id, tableRows.value, tableCols.value)
  notifyAdded(`${tableRows.value}×${tableCols.value} 테이블`)
}

const onGalleryAdd = (module: ModuleMetadata) => {
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

/* ===== 테이블 크기 선택 (Figma 640-3379) ===== */
.table-add {
  display: flex;
  flex-direction: column;
  gap: 26px;
}
/* 크기 선택 헤더: 좌 라벨 + 우 현재 크기 */
.ts-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ts-head-label {
  font-size: 16px;
  font-weight: 500;
  color: #333d4b;
  letter-spacing: -0.16px;
}
.ts-head-size {
  font-size: 15px;
  color: #4083f3;
  letter-spacing: -0.15px;
  white-space: nowrap;
}
/* 사각형 그리드 */
.ts-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ts-grid-row {
  display: flex;
  gap: 8px;
}
.ts-cell {
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid #e5e8eb;
  border-radius: 6px;
  background: #f2f4f6;
  cursor: pointer;
  transition:
    background 0.08s,
    border-color 0.08s;
}
.ts-cell:hover {
  border-color: #4083f3;
}
.ts-cell--on {
  background: #ebf3ff;
  border-color: #4083f3;
}
.ts-divider {
  height: 1px;
  background: #e5e8eb;
}
.ts-section-label {
  font-size: 16px;
  font-weight: 500;
  color: #333d4b;
  letter-spacing: -0.16px;
}
/* 직접 입력: 행/열 스테퍼 */
.ts-inputs {
  display: flex;
  gap: 16px;
}
.ts-input-field {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ts-input-label {
  font-size: 15px;
  color: #4e5968;
}
.ts-stepper {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 11px;
  border: 1px solid #e5e8eb;
  border-radius: 8px;
  background: #fff;
}
.ts-step-btn {
  flex-shrink: 0;
  width: 34px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: none;
  color: #4e5968;
  cursor: pointer;
}
.ts-step-btn:hover {
  color: #191f28;
}
.ts-step-btn .material-symbols-outlined {
  font-size: 22px;
}
.ts-step-div {
  flex-shrink: 0;
  width: 1px;
  height: 30px;
  background: #e5e8eb;
}
.ts-step-val {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: none;
  background: none;
  text-align: center;
  font-size: 15px;
  font-weight: 500;
  color: #191f28;
  -moz-appearance: textfield;
  appearance: textfield;
}
.ts-step-val::-webkit-outer-spin-button,
.ts-step-val::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.ts-step-val:focus {
  outline: none;
}
.ts-add-btn {
  width: 100%;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: #4083f3;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.ts-add-btn:hover {
  background: #3b78e0;
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
