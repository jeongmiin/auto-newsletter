<template>
  <!-- 직접 구성 패널 (Figma 977-12994) — 캔버스의 빈 컬럼에서 '직접 구성'을 누르면 열린다.
       모듈 팔레트와 같은 카드 목록에서 하나를 고르면 그 컬럼에 바로 들어가고,
       추가된 모듈이 선택되면서 좌측 패널이 그 모듈의 속성 폼으로 전환된다.
       (취소는 캔버스의 '직접 구성 취소' 버튼이 담당한다 — 대상 컬럼 바로 위라 찾기 쉽다) -->
  <div v-if="target" class="side-panel column-compose-panel">
    <h2 class="panel-title">직접 구성</h2>

    <!-- 모듈 검색 — 모듈 패널과 같은 공용 검색창(sm) -->
    <SearchField
      v-model="searchQuery"
      size="sm"
      placeholder="모듈을 검색하세요"
      aria-label="모듈 검색"
      clearable
    />

    <!-- 자주 쓰는 원소 모듈 (카테고리 메뉴와 같은 QuickAddCard) — 전부 그룹을 만들지 않는 단일 모듈 -->
    <div class="quick-add-list">
      <QuickAddCard
        v-for="item in quickAddItems"
        :key="item.label"
        :item="item"
        @add="onQuickAdd(item)"
      />
    </div>

    <div class="module-card-grid">
      <ModuleCard
        v-for="module in filteredModules"
        :key="module.id"
        :ref="(inst: any) => observeCard(inst?.rootEl ?? null, module.id)"
        :module="module"
        :srcdoc="thumbs[module.id]"
        :iframe-height="thumbIframeHeight(module.id)"
        :box-height="thumbBoxHeight(module.id)"
        @add="onAdd(module)"
        @thumb-load="(e: Event) => measureThumbHeight(module.id, e)"
      />
      <p v-if="!filteredModules.length" class="empty-text">검색 결과가 없어요</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import { useModuleThumbnails } from '@/composables/useModuleThumbnails'
import ModuleCard from './ModuleCard.vue'
import QuickAddCard from './QuickAddCard.vue'
import SearchField from '@/components/SearchField.vue'
import { pickQuickAddItems, type QuickAddItem } from '@/utils/quickAddItems'
import type { ModuleMetadata } from '@/types'

const moduleStore = useModuleStore()
// 썸네일 로직은 모듈 패널과 공유 — 카드 UI가 항상 같게 보인다
const { thumbs, observeCard, measureThumbHeight, thumbIframeHeight, thumbBoxHeight } =
  useModuleThumbnails()

const target = computed(() => moduleStore.columnTarget)
const searchQuery = ref('')

// 상단 빠른추가 — 그룹을 만들지 않는(=컬럼 안에 그대로 들어가는) 원소 모듈만 고른다
const quickAddItems = pickQuickAddItems([
  '텍스트 추가',
  '단일 이미지 추가',
  '단일 버튼 추가',
  '작은 버튼 추가 (최대 4단)',
])
const quickAddModuleIds = new Set(quickAddItems.map((i) => i.moduleId))

/**
 * 옛 세대(v1) 모듈 — 번호로 부르던 완성형('모듈 01-2번'·'모듈 11번')과 그 시절 섹션 타이틀.
 * v2에서는 원소 모듈을 조합해 같은 모양을 만들므로 컬럼 채우기 목록에서는 뺀다.
 */
const isLegacyModule = (id: string): boolean => id === 'SectionTitle' || /^Module\d/.test(id)

// 목록에서 빼는 것: ①그룹이 되는 조립형(composedBuilderMap) — 그룹은 컬럼 '안'에 못 들어간다
//                  ②옛 세대(v1) 모듈  ③위 빠른추가로 이미 제공하는 모듈(중복)
const filteredModules = computed<ModuleMetadata[]>(() => {
  const list = moduleStore.availableModules.filter(
    (m) =>
      !m.hidden &&
      !moduleStore.composedBuilderMap[m.id] &&
      !isLegacyModule(m.id) &&
      !quickAddModuleIds.has(m.id),
  )
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(
    (m) => m.name.toLowerCase().includes(q) || (m.description ?? '').toLowerCase().includes(q),
  )
})

onMounted(() => {
  if (moduleStore.availableModules.length === 0) moduleStore.loadAvailableModules()
})

/**
 * 고른 모듈을 대상 컬럼에 넣는다.
 * 조립형(v2) 빌더를 쓰지 않는 이유: 빌더는 '새 그룹'을 만드는데 그러면 이 컬럼이 아니라
 * 그룹 바깥에 붙는다. addModule은 columnTarget을 보고 그 (행, 컬럼)에 정확히 넣는다.
 */
const onAdd = (module: ModuleMetadata) => {
  moduleStore.addModule(module)
}

/** 빠른추가 — 모듈을 넣은 뒤 기본 여백 등 오버라이드를 얹는다(추가된 모듈이 선택 상태다) */
const onQuickAdd = (item: QuickAddItem) => {
  const meta = moduleStore.availableModules.find((m) => m.id === item.moduleId)
  if (!meta) return
  moduleStore.addModule(meta)
  if (item.overrides) {
    for (const [key, value] of Object.entries(item.overrides)) {
      moduleStore.updateModuleProperty(key, value)
    }
  }
}
</script>

<style scoped>
/* 껍데기는 panels.css의 .side-panel — 항목 간격만 좁힌다 */
.column-compose-panel {
  gap: 20px;
}

/* 검색창은 공용 SearchField(sm) — 모듈 패널과 완전히 같은 모양이다 */

.quick-add-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}
.module-card-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.empty-text {
  font-size: 14px;
  color: var(--gray-500);
  text-align: center;
  padding: 24px 0;
}
</style>
