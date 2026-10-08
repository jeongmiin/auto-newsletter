<template>
  <div class="side-panel category-module-panel">
    <h2 class="panel-title">{{ panelTitle }}</h2>

    <!-- 테이블: 크기 선택 + 직접 입력 (공용 TableSizePicker — 2단 컬럼의 '직접 구성'과 같은 화면) -->
    <TableSizePicker v-if="category === 'table'" @add="onAddTable" />

    <!-- 빠른추가 (카드는 ColumnComposePanel과 공유하는 QuickAddCard.vue) -->
    <div v-else class="quick-add-list">
      <QuickAddCard
        v-for="item in quickAddItems"
        :key="item.label"
        :item="item"
        @add="onQuickAdd(item)"
      />
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
import QuickAddCard from './QuickAddCard.vue'
import TableSizePicker from './TableSizePicker.vue'
import { useModuleStore } from '@/stores/moduleStore'
import { useModuleThumbnails } from '@/composables/useModuleThumbnails'
import type { ModuleMetadata } from '@/types'
import { QUICK_ADD_ITEMS, type QuickAddItem } from '@/utils/quickAddItems'

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

// 원소 모듈 "빠른추가" 정의는 ColumnComposePanel과 공유한다(@/utils/quickAddItems).
// 조립형 빌더가 없는 항목은 moduleStore.addModule()로 삽입된다 —
// 선택된 모듈이 v2 그룹 멤버면 addModule이 이미 그 그룹에 이어붙이므로 별도 배선이 필요 없다.
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

// 크기 고르기는 TableSizePicker가 맡는다 — 여기서는 고른 크기로 넣기만 한다
const onAddTable = (rows: number, cols: number) => {
  const meta = moduleStore.availableModules.find((m) => m.id === 'ModuleTable')
  if (!meta) return
  moduleStore.addModule(meta)
  const id = moduleStore.selectedModuleId
  if (id) moduleStore.setCustomTableSize(id, rows, cols)
  notifyAdded(`${rows}×${cols} 테이블`)
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
/* 껍데기는 panels.css의 .side-panel — 이 패널은 기본값(padding 25 / gap 26) 그대로 쓴다.
   좌우 25px → 내부 폭 308px = ModuleCard 폭과 일치(넘침 방지). */

.quick-add-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
/* 카드 자체의 모양은 QuickAddCard.vue(공용 컴포넌트)가 갖는다 */

/* 테이블 크기 선택 UI의 스타일은 TableSizePicker.vue 에 있다 */

.gallery-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.gallery-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--gray-750);
}
</style>
