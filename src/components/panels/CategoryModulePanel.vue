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
        @click="onQuickAdd(item)"
      >
        <span class="quick-add-label">{{ item.label }}</span>
        <span class="material-symbols-outlined quick-add-icon">add</span>
      </button>
    </div>

    <!-- 카테고리 갤러리 (완성 조립 블록 · v2 우선, 없으면 레거시 폴백) -->
    <div v-if="galleryModules.length" class="gallery-section">
      <span class="gallery-title">{{ categoryLabel }}형 모듈</span>
      <div class="gallery-list">
        <div
          v-for="module in galleryModules"
          :key="module.id"
          :ref="(el) => observeCard(el as Element | null, module.id)"
          :data-module-id="module.id"
          class="gallery-card"
          @click="onGalleryAdd(module)"
        >
          <div class="gallery-thumb">
            <iframe
              v-if="thumbs[module.id]"
              :srcdoc="thumbs[module.id]"
              class="gallery-thumb-iframe"
              title="모듈 미리보기"
              sandbox="allow-same-origin"
            ></iframe>
            <div v-else class="gallery-thumb-loading">
              <i :class="module.icon" class="text-2xl text-gray-300"></i>
            </div>
          </div>
          <div class="gallery-card-label">{{ module.name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useModuleStore } from '@/stores/moduleStore'
import { useModuleThumbnails } from '@/composables/useModuleThumbnails'
import type { ModuleMetadata } from '@/types'

type Category = 'text' | 'image' | 'button' | 'table'

interface Props {
  category: Category
}
const props = defineProps<Props>()

const moduleStore = useModuleStore()
const toast = useToast()
const { thumbs, observeCard } = useModuleThumbnails()

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
  /** 추가 직후 덮어쓸 속성(선택) — 예: "서브타이틀"은 전용 모듈이 없어 SectionTitle을 작은 폰트로 재사용 */
  overrideProperty?: { key: string; value: unknown }
}

// 원소 모듈 "빠른추가" — 항상 moduleStore.addModule()로 삽입한다.
// (선택된 모듈이 v2 그룹 멤버면 addModule이 이미 그 그룹에 이어붙이므로 별도 배선 불필요)
const QUICK_ADD_ITEMS: Record<Category, QuickAddItem[]> = {
  text: [
    { label: '타이틀 추가', moduleId: 'SectionTitle' },
    {
      label: '서브타이틀 추가',
      moduleId: 'SectionTitle',
      overrideProperty: { key: 'mainTitleFontSize', value: '18px' },
    },
    { label: '텍스트 추가', moduleId: 'ModuleDescText' },
  ],
  image: [
    { label: '단일 이미지 추가', moduleId: 'ModuleImg' },
    { label: '2단 이미지 추가', moduleId: 'ModuleMultiImage' },
  ],
  button: [
    { label: '단일 버튼 추가', moduleId: 'ModuleOneButton' },
    { label: '2단 버튼 추가', moduleId: 'ModuleTwoButton' },
  ],
  // 테이블은 v2 조립 템플릿이 아직 없어 레거시 '커스텀 테이블'(ModuleTable)을 그대로 쓴다.
  table: [{ label: '테이블 추가', moduleId: 'ModuleTable' }],
}
const quickAddItems = computed(() => QUICK_ADD_ITEMS[props.category])

// 갤러리: 이 카테고리에 속하는 완성형 모듈. 클릭 시 v2 조립 템플릿이 있으면 그걸(onGalleryAdd),
// 없으면 레거시 addModule로 폴백한다(moduleStore.composedBuilderMap 참고).
const galleryModules = computed<ModuleMetadata[]>(() =>
  moduleStore.availableModules.filter((m) => !m.hidden && m.category === props.category),
)

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
  moduleStore.addModule(meta)
  if (item.overrideProperty) {
    moduleStore.updateModuleProperty(item.overrideProperty.key, item.overrideProperty.value)
  }
  notifyAdded(item.label.replace(/\s*추가$/, ''))
}

const onGalleryAdd = (module: ModuleMetadata) => {
  const builder = moduleStore.composedBuilderMap[module.id]
  if (builder) {
    const groupId = builder()
    if (groupId) moduleStore.setGroupName(groupId, module.name)
  } else {
    moduleStore.addModule(module)
  }
  notifyAdded(module.name)
}
</script>

<style scoped>
.category-module-panel {
  width: 360px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e5e8eb;
  height: 100%;
  overflow-y: auto;
  padding: 24px 23px 29px;
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
.gallery-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.gallery-card {
  border: 1px solid #e5e8eb;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background: #fff;
}
.gallery-card:hover {
  border-color: #4083f3;
}
.gallery-thumb {
  width: 100%;
  height: 145px;
  overflow: hidden;
  background: #fff;
  border-bottom: 1px solid #eef0f2;
  position: relative;
}
.gallery-thumb-iframe {
  width: 680px;
  height: 900px;
  border: 0;
  display: block;
  background: #fff;
  /* 314/680 ≈ 0.462 — 이 패널 카드 폭(314px = 360 - 23*2) 기준 */
  transform: scale(0.462);
  transform-origin: top left;
  pointer-events: none;
}
.gallery-thumb-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.gallery-card-label {
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  color: #191f28;
}
</style>
