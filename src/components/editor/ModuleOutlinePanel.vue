<template>
  <!-- 캔버스 오른쪽에 접혀 있는 '모듈 순서' 패널 (Figma 969-7308 / 969-7309).
       좌측 레일의 '모듈 순서' 메뉴 또는 왼쪽 가장자리 탭으로 여닫는다 — 좌측 패널은 건드리지 않는다. -->
  <aside class="order-dock" :class="{ 'is-collapsed': !isOpen }">
    <!-- 패널 왼쪽 가장자리 탭 (닫혀 있으면 화면 오른쪽 끝에 붙어 있다) -->
    <button
      type="button"
      class="order-tab"
      :aria-label="isOpen ? '모듈 순서 닫기' : '모듈 순서 열기'"
      @click="editorStore.toggleOrderPanel()"
    >
      <span class="material-symbols-outlined order-tab-icon" :class="{ 'is-open': isOpen }">
        arrow_back_ios
      </span>
    </button>

    <div class="order-panel">
      <div class="order-inner">
        <!-- 타이틀 + 전체 모듈 수 -->
        <div class="order-head">
          <h2 class="order-title">모듈 순서</h2>
          <span class="order-count">{{ modules.length }}</span>
        </div>

        <!-- 그룹 묶기 -->
        <button
          type="button"
          class="order-group-btn"
          :disabled="checkedCount < 1"
          @click="groupChecked"
        >
          그룹 묶기 ({{ checkedCount }})
        </button>
        <button v-if="checkedCount > 0" type="button" class="order-clear-btn" @click="clearChecked">
          선택 해제
        </button>

        <p v-if="modules.length === 0" class="order-empty">추가된 모듈이 없습니다.</p>

        <!-- 표시 리스트 (그룹은 한 덩어리로 이동) -->
        <draggable
          v-else
          v-model="displayList"
          item-key="id"
          handle=".order-drag--root"
          ghost-class="order-ghost"
          animation="180"
          class="order-list"
        >
          <template #item="{ element: item }">
            <div class="order-item">
              <!-- ===== 그룹 모듈 ===== -->
              <template v-if="item.type === 'group'">
               <div class="order-group" :class="{ 'is-expanded': isExpanded(item.id) }">
                <div
                  class="order-row"
                  :class="{ 'is-selected': selectedGroupId === item.id }"
                  @click="selectGroupRow(item.id)"
                >
                  <span
                    class="material-symbols-outlined order-drag order-drag--root"
                    title="끌어서 순서 변경"
                    @click.stop
                    >drag_indicator</span
                  >
                  <button
                    type="button"
                    class="order-slot order-chevron"
                    :class="{ 'is-open': isExpanded(item.id) }"
                    :aria-expanded="isExpanded(item.id)"
                    :aria-label="isExpanded(item.id) ? '하위 모듈 접기' : '하위 모듈 펼치기'"
                    @click.stop="toggleExpand(item.id)"
                  >
                    <span class="material-symbols-outlined">arrow_back_ios</span>
                  </button>
                  <span class="material-symbols-outlined order-kind is-group">dashboard</span>
                  <span class="order-label is-group">{{ groupLabel(item) }}</span>
                  <button
                    type="button"
                    class="order-slot order-ungroup"
                    v-tooltip.left="'그룹 해제 (모듈은 유지)'"
                    @click.stop="moduleStore.ungroup(item.id)"
                  >
                    <span class="material-symbols-outlined">link_off</span>
                  </button>
                </div>

                <!-- 하위 모듈 — 그룹별로 독립된 아코디언(다른 그룹의 열림/닫힘에 영향받지 않음).
                     그룹 안에서만 드래그 재정렬되며(handle이 바깥 리스트와 다르다), 체크박스는 없다
                     (체크박스는 '그룹 묶기'용이라 그룹에 속하지 않은 모듈에만 필요). -->
                <draggable
                  v-if="isExpanded(item.id)"
                  :model-value="item.modules"
                  item-key="id"
                  handle=".order-drag--member"
                  ghost-class="order-ghost"
                  animation="180"
                  class="order-children"
                  @update:model-value="reorderMembers(item.id, $event)"
                >
                  <template #item="{ element: member }">
                    <div
                      class="order-row"
                      :class="{ 'is-selected': selectedModuleId === member.id }"
                      @click="select(member.id)"
                      @mouseenter="setHover(member.id)"
                      @mouseleave="setHover(null)"
                    >
                      <span
                        class="material-symbols-outlined order-drag order-drag--member"
                        title="그룹 안에서 순서 변경"
                        @click.stop
                        >drag_indicator</span
                      >
                      <span class="material-symbols-outlined order-kind">{{
                        moduleIcon(member)
                      }}</span>
                      <span class="order-label">{{ moduleLabel(member) }}</span>
                    </div>
                  </template>
                </draggable>
               </div>
              </template>

              <!-- ===== 단독 모듈 ===== -->
              <div
                v-else
                class="order-row"
                :class="{ 'is-selected': selectedModuleId === item.module.id }"
                @click="select(item.module.id)"
                @mouseenter="setHover(item.module.id)"
                @mouseleave="setHover(null)"
              >
                <span
                  class="material-symbols-outlined order-drag"
                  title="끌어서 순서 변경"
                  @click.stop
                  >drag_indicator</span
                >
                <span class="order-slot" @click.stop>
                  <Checkbox
                    :modelValue="isChecked(item.module.id)"
                    :binary="true"
                    @update:modelValue="toggleChecked(item.module.id)"
                  />
                </span>
                <span class="material-symbols-outlined order-kind">{{
                  moduleIcon(item.module)
                }}</span>
                <span class="order-label">{{ moduleLabel(item.module) }}</span>
              </div>
            </div>
          </template>
        </draggable>

        <p class="order-help">
          체크박스로 선택 후 <b>그룹 묶기</b>를 누르면 한 묶음이 됩니다(1개도 가능). 그룹은 통째로
          드래그·이동되고, 묶음 배경·테두리·여백을 줄 수 있습니다.
        </p>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import draggable from 'vuedraggable'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { useToast } from 'primevue/usetoast'
import type { ModuleInstance, ModuleGroup, DisplayItem } from '@/types'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()
const toast = useToast()

const modules = computed(() => moduleStore.modules)
const selectedModuleId = computed(() => moduleStore.selectedModuleId)
const selectedGroupId = computed(() => moduleStore.selectedGroupId)
const isOpen = computed(() => editorStore.isOrderPanelOpen)

// 드래그 정렬 대상 — 그룹은 한 덩어리(displayItem)로 이동
const displayList = computed<DisplayItem[]>({
  get: () => moduleStore.displayItems,
  set: (value) => moduleStore.setDisplayOrder(value),
})

// ===== 그룹 아코디언 (기본 닫힘, 그룹마다 독립적으로 열림/닫힘 유지) =====
const expandedGroupIds = ref<Set<string>>(new Set())

const isExpanded = (groupId: string): boolean => expandedGroupIds.value.has(groupId)

const toggleExpand = (groupId: string): void => {
  const next = new Set(expandedGroupIds.value)
  if (next.has(groupId)) next.delete(groupId)
  else next.add(groupId)
  expandedGroupIds.value = next
}

// ===== 체크박스 다중선택 (그룹 묶기용) =====
// 체크박스는 '그룹 묶기'를 위한 것이라 **그룹에 속하지 않은 모듈에만** 노출된다.
// 여기서도 같은 기준으로 세어, 체크 후 다른 경로로 그룹에 편입된 모듈이 개수에 남지 않게 한다.
const checkedIds = ref<Set<string>>(new Set())
const checkableModules = computed(() =>
  modules.value.filter((m) => !m.groupId && checkedIds.value.has(m.id)),
)
const checkedCount = computed(() => checkableModules.value.length)

const isChecked = (id: string): boolean => checkedIds.value.has(id)

const toggleChecked = (id: string): void => {
  const next = new Set(checkedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  checkedIds.value = next
}

const clearChecked = (): void => {
  checkedIds.value = new Set()
}

const groupChecked = (): void => {
  const checkedModules = checkableModules.value
  if (checkedModules.length < 1) return

  const ids = checkedModules.map((m) => m.id)
  const groupId = moduleStore.createGroup(ids)
  if (groupId) {
    clearChecked()
    toast.add({
      severity: 'success',
      summary: '그룹 생성',
      detail: `${ids.length}개 모듈을 한 그룹으로 묶었습니다`,
      life: 2500,
    })
  } else {
    toast.add({
      severity: 'warn',
      summary: '그룹 생성 불가',
      detail: '1개 이상의 모듈을 선택하세요',
      life: 3000,
    })
  }
}

const selectGroupRow = (groupId: string): void => {
  moduleStore.selectGroup(groupId)
}

/** 그룹 안 멤버 드래그 재정렬 — 그룹의 행/컬럼 골격은 유지된다(moduleStore 참고) */
const reorderMembers = (groupId: string, list: ModuleInstance[]): void => {
  moduleStore.reorderGroupMembers(
    groupId,
    list.map((m) => m.id),
  )
}

// ===== 라벨 / 아이콘 =====
const metadataOf = (instance: ModuleInstance) =>
  moduleStore.availableModules.find((m) => m.id === instance.moduleId) || null

/**
 * 그룹 라벨 — 캔버스 툴바·그룹 스타일 패널과 같은 이름을 쓴다.
 * 조립형 모듈로 만든 그룹은 모듈명(예: '이미지형 헤더'), 직접 묶은 그룹은 '그룹 01' 식.
 * (이름은 만들 때 정해지므로 폴백은 이름 없던 시절 데이터용)
 */
const groupLabel = (item: { group: ModuleGroup; modules: ModuleInstance[] }): string =>
  item.group.name || '그룹'

/**
 * 모듈 종류 아이콘 (Figma: 이미지=broken_image, 타이틀·텍스트=match_case).
 * ⚠ 여기 값을 늘리면 index.html의 `icon_names` subset에도 추가해야 한다
 *   (materialSymbols.test.ts가 *_ICON Record 맵을 훑어 검사한다).
 */
const CATEGORY_ICON: Record<string, string> = {
  image: 'broken_image',
  text: 'match_case',
  button: 'ads_click',
  table: 'border_all',
  divider: 'vertical_distribute',
  social: 'share',
  header: 'widgets',
  common: 'widgets',
}

const moduleIcon = (instance: ModuleInstance): string =>
  CATEGORY_ICON[metadataOf(instance)?.category ?? ''] ?? 'widgets'

/**
 * 모듈 라벨 — 텍스트형은 실제 입력한 문구를 보여주고(Figma의 'NEWSLETTER #60' 등),
 * 비어 있거나 텍스트형이 아니면 모듈 이름으로 폴백한다.
 */
const moduleLabel = (instance: ModuleInstance): string => {
  const meta = metadataOf(instance)
  const name = meta?.name || instance.moduleId
  if (meta?.category !== 'text') return name

  const textProp = meta.editableProps.find((p) => p.type === 'textarea')
  if (!textProp) return name
  const raw = instance.properties[textProp.key]
  if (typeof raw !== 'string') return name

  const plain = raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
  return plain || name
}

const select = (moduleId: string): void => {
  moduleStore.selectModule(moduleId)
}

const setHover = (moduleId: string | null): void => {
  editorStore.setHoveredModuleId(moduleId)
}
</script>

<style scoped>
/* ===== 도크(패널 + 여닫이 탭) ===== */
.order-dock {
  position: relative;
  flex-shrink: 0;
  height: 100%;
}

.order-panel {
  width: 320px;
  height: 100%;
  background: #fff;
  border-left: 1px solid #e5e8eb;
  overflow: hidden;
  transition: width 0.18s ease;
}
.order-dock.is-collapsed .order-panel {
  width: 0;
  border-left-width: 0;
}

/* 폭이 0으로 줄어드는 동안 내부가 리플로우되지 않도록 고정폭 */
.order-inner {
  width: 320px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 19px;
  padding: 24px 25px 20px;
}

/* 왼쪽 가장자리 탭 — 닫혀 있으면 패널 폭이 0이라 화면 오른쪽 끝에 붙는다 */
.order-tab {
  position: absolute;
  top: 50%;
  left: -54px;
  width: 54px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  border-right: 0;
  border-radius: 15px 0 0 15px;
  background: #fff;
  color: #4e5968;
  cursor: pointer;
  z-index: 5;
}
.order-tab:hover {
  box-shadow: -2px 0 6px rgba(0, 0, 0, 0.06);
}
.order-tab-icon {
  font-size: 18px;
  width: 12px;
  line-height: 1;
  transition: transform 0.18s ease;
  color: #4E5968;
}
.order-tab-icon.is-open {
  transform: rotate(180deg);
}

/* ===== 헤더 ===== */
.order-head {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;
}
.order-title {
  font-size: 20px;
  font-weight: 500;
  line-height: 1.5;
  color: #191f28;
  letter-spacing: -0.2px;
}
.order-count {
  font-size: 16px;
  line-height: 1.5;
  color: #8b95a1;
  letter-spacing: -0.16px;
}

.order-group-btn {
  flex-shrink: 0;
  width: 100%;
  height: 40px;
  border: 0;
  border-radius: 8px;
  background: #4e5968;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s;
}
.order-group-btn:hover:not(:disabled) {
  background: #3d4756;
}
.order-group-btn:disabled {
  background: #d1d6db;
  color: #fff;
  cursor: default;
}
.order-clear-btn {
  flex-shrink: 0;
  margin-top: -13px;
  align-self: flex-end;
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 13px;
  color: #6b7684;
  cursor: pointer;
  text-decoration: underline;
}

.order-empty {
  flex: 1;
  padding-top: 40px;
  text-align: center;
  font-size: 14px;
  color: #8b95a1;
}

/* ===== 리스트 ===== */
.order-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.order-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 그룹 블록 — 펼치면 그룹 행 + 하위 모듈이 primary-50 55% 밴드로 한 덩어리가 된다 */
.order-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 4px;
}
.order-group.is-expanded {
  background: rgba(235, 243, 255, 0.55); /* blue/50 @ 55% */
}

/* 하위 모듈 리스트 — 그룹 안에서만 드래그 재정렬(handle이 바깥과 다름) */
.order-children {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-left: 37px;
}

.order-row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 45px;
  padding: 0 5px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.12s;
}
.order-row:hover {
  background: #f2f4f6; /* gray/100 */
}
.order-row.is-selected {
  background: #ebf3ff; /* blue/50 */
}
/* 선택된 행은 라벨·핸들이 진해진다 (그룹 라벨은 보라 유지) */
.order-row.is-selected .order-label:not(.is-group) {
  color: #333d4b; /* gray/800 */
}
.order-row.is-selected .order-drag {
  color: #6b7684;
}

.order-drag {
  flex-shrink: 0;
  font-size: 24px;
  line-height: 1;
  color: #b0b8c1;
  cursor: grab;
}
.order-drag:active {
  cursor: grabbing;
}

/* 체크박스 / 화살표 / 그룹 해제가 공유하는 32px 정사각 슬롯 */
.order-slot {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
}

.order-chevron {
  color: #333d4b;
  cursor: pointer;
}
.order-chevron .material-symbols-outlined {
  font-size: 16px;
  line-height: 1;
  transform: rotate(180deg); /* arrow_back_ios(◀) → ▶ = 접힘 */
  transition: transform 0.18s ease;
}
.order-chevron.is-open .material-symbols-outlined {
  transform: rotate(-90deg); /* ▼ = 펼침 */
}

.order-kind {
  flex-shrink: 0;
  font-size: 22px;
  line-height: 1;
  color: #8b95a1;
}
.order-kind.is-group {
  color: #333d4b;
}

.order-label {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: #6b7684; /* gray/600 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* 그룹은 일반 모듈과 한눈에 구분되도록 보라색 */
.order-label.is-group {
  color: #b037ce;
}

/* 그룹 해제 — 그룹 행에 마우스를 올리거나 그 그룹이 선택됐을 때만 노출 */
.order-ungroup {
  color: #4e5968;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s;
}
.order-ungroup .material-symbols-outlined {
  font-size: 20px;
  line-height: 1;
}
.order-row:hover .order-ungroup,
.order-row.is-selected .order-ungroup {
  opacity: 1;
  pointer-events: auto;
}
.order-ungroup:hover {
  color: #e03131;
}

.order-help {
  flex-shrink: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #8b95a1;
  word-break: keep-all;
}

/* PrimeVue 체크박스를 Figma 스펙(20px, radius 4, #d1d6db)에 맞춤 */
.order-slot :deep(.p-checkbox) {
  width: 20px;
  height: 20px;
}
.order-slot :deep(.p-checkbox-box) {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border-color: #d1d6db;
}

/* 드래그 중 자리 표시(ghost) */
:deep(.order-ghost) {
  opacity: 0.5;
}
:deep(.order-ghost) .order-row {
  background: #ebf3ff;
}
</style>
