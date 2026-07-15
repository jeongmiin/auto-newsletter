<template>
  <div class="flex-1 bg-gray-100 p-8 pb-32 overflow-auto">
    <div class="flex justify-center">
      <!-- 캔버스 컨테이너 -->
      <div
        :class="[
          'shadow-lg transition-all duration-300',
          canvasWidth === 'mobile' ? 'w-80' : 'w-full max-w-[680px]',
        ]"
        :style="canvasContainerStyle"
      >
        <!-- 모듈이 없을 때 -->
        <div
          v-if="modules.length === 0"
          class="flex items-center justify-center h-full"
        >
          <div class="text-center">
            <div class="flex justify-center mb-2"><img src="/src/assets/img/logo/logo.png" alt="Logo" class="w-8" /></div>
            <div class="text-xl font-semibold text-gray-700 mb-2">뉴스레터 만들기</div>
            <div class="text-sm text-gray-500 mb-6">
              왼쪽 패널에서 원하는 모듈을 클릭하면<br />
              여기에 추가됩니다
            </div>

            <!-- 빠른 시작 액션 -->
            <div class="flex items-center justify-center gap-2 mb-6">
              <Button
                @click="startFromTemplate"
                label="템플릿으로 시작"
                icon="pi pi-file-edit"
                size="small"
              />
              <Button
                @click="openFile"
                label="파일 열기"
                icon="pi pi-folder-open"
                outlined
                size="small"
              />
            </div>

            <div class="flex flex-col gap-2 text-left bg-white/70 border border-gray-100 rounded-lg p-4 text-sm text-gray-600">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs font-bold">1</span>
                <span>왼쪽에서 모듈 선택하여 추가</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs font-bold">2</span>
                <span>모듈 클릭 후 오른쪽에서 내용 편집</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs font-bold">3</span>
                <span>완성 후 상단에서 파일 저장</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 모듈 리스트 (드래그 앤 드롭 지원) — 그룹은 한 덩어리로 이동 -->
        <draggable
          v-else
          v-model="displayList"
          item-key="id"
          handle=".dh-top"
          filter=".no-drag"
          :prevent-on-filter="false"
          ghost-class="dragging-ghost"
          chosen-class="dragging-chosen"
          animation="200"
          class="min-h-full"
          @start="onDragStart"
          @end="onDragEnd"
        >
          <template #item="{ element: item }">
           <div>
            <!-- 그룹 래퍼: 헤더 바(편집 전용) + 스타일 박스 -->
            <div
              v-if="item.type === 'group'"
              class="group-wrap"
              :class="{ 'group-wrap--selected': selectedGroupId === item.id }"
            >
              <!-- 그룹 헤더 바 (편집 전용, 드래그 핸들 · 내보내기 미포함) -->
              <div
                class="dh-top group-header"
                :class="{ 'group-header--selected': selectedGroupId === item.id }"
                title="그룹 전체를 끌어서 이동 · 클릭하면 그룹 선택"
                @click="selectGroupBox(item.id)"
              >
                <span class="group-header__label">
                  <i class="pi pi-bars"></i>
                  <span>그룹 · {{ item.modules.length }}개 모듈</span>
                </span>
                <span class="group-header__actions">
                  <button
                    type="button"
                    class="no-drag group-header__btn"
                    v-tooltip.bottom="'그룹 복제'"
                    @click.stop="moduleStore.duplicateGroup(item.id)"
                  >
                    <i class="pi pi-copy"></i>
                  </button>
                  <button
                    type="button"
                    class="no-drag group-header__btn"
                    v-tooltip.bottom="'그룹 해제 (모듈은 유지)'"
                    @click.stop="moduleStore.ungroup(item.id)"
                  >
                    <i class="pi pi-link"></i>
                  </button>
                  <button
                    type="button"
                    class="no-drag group-header__btn"
                    v-tooltip.bottom="'그룹 스타일 편집'"
                    @click.stop="selectGroupBox(item.id)"
                  >
                    <i class="pi pi-sliders-h"></i>
                  </button>
                  <button
                    type="button"
                    class="no-drag group-header__btn group-header__btn--danger"
                    v-tooltip.bottom="'그룹 전체 삭제'"
                    @click.stop="confirmDeleteGroup(item)"
                  >
                    <i class="pi pi-trash"></i>
                  </button>
                </span>
              </div>
              <!-- 실제 스타일 박스 (배경/테두리/여백은 내보내기와 동일) -->
              <div
                class="group-box"
                :class="{ 'group-box--selected': selectedGroupId === item.id }"
                :style="groupWrapperStyle(item.group)"
                @click.self="selectGroupBox(item.id)"
              >
                <!-- 컬럼 분할 레이아웃 (fluid-hybrid: 데스크톱 가로, 모바일 세로 스택) -->
                <!-- 밴드(행)별 렌더: 전체폭(fullWidth) 밴드는 통째로, 컬럼 밴드는 col-row로 -->
                <template v-if="groupColumns(item) > 1">
                  <template
                    v-for="(band, bandIdx) in groupBands(item)"
                    :key="`band-${item.id}-${bandIdx}`"
                  >
                    <!-- 컬럼 밴드 (.col-row: font-size:0 으로 셀 사이 공백 제거 → 폭 균등 분할) -->
                    <div v-if="band.type === 'cols'" class="col-row">
                      <div
                        v-for="col in band.columns"
                        :key="`col-${bandIdx}-${col}`"
                        class="col-cell"
                        :style="colCellStyle(band.columns)"
                      >
                        <div
                          v-for="member in bandColumnMembers(band, col - 1)"
                          :key="member.id"
                          :id="`canvas-module-${member.id}`"
                          class="relative transition-all"
                          :class="{ 'ring-2 ring-amber-400 ring-inset rounded-sm': hoveredModuleId === member.id }"
                        >
                          <ModuleRenderer
                            :module="member"
                            :index="member.order"
                            :is-selected="selectedModuleId === member.id"
                            :column-info="{ columns: band.columns, columnIndex: member.columnIndex ?? 0 }"
                            @select="selectModule"
                            @move-up="moveModuleUp"
                            @move-down="moveModuleDown"
                            @duplicate="duplicateModule"
                            @delete="deleteModule"
                          />
                        </div>
                        <!-- 빈 컬럼 placeholder -->
                        <div
                          v-if="bandColumnMembers(band, col - 1).length === 0"
                          class="empty-col no-drag"
                          :class="{ 'empty-col--target': isColTarget(item.id, col - 1) }"
                          @click.stop="targetColumn(item.id, col - 1)"
                        >
                          <i class="pi pi-plus-circle empty-col__icon"></i>
                          <div class="empty-col__title">빈 컬럼</div>
                          <div class="empty-col__actions">
                            <button
                              type="button"
                              class="empty-col__btn"
                              @click.stop="dupIntoColumn(item.id, col - 1)"
                            >
                              옆 컬럼 복제
                            </button>
                            <button
                              type="button"
                              class="empty-col__btn empty-col__btn--danger"
                              @click.stop="removeColumn(item.id, col - 1)"
                            >
                              빈 컬럼 삭제
                            </button>
                          </div>
                          <div class="empty-col__hint">
                            {{ isColTarget(item.id, col - 1) ? '왼쪽 패널에서 모듈을 추가하세요' : '클릭 후 모듈 추가' }}
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 전체폭 밴드 (모든 컬럼을 가로지르는 멤버들) -->
                    <template v-else>
                      <div
                        v-for="member in band.members"
                        :key="member.id"
                        :id="`canvas-module-${member.id}`"
                        class="relative transition-all"
                        :class="{ 'ring-2 ring-amber-400 ring-inset rounded-sm': hoveredModuleId === member.id }"
                      >
                        <ModuleRenderer
                          :module="member"
                          :index="member.order"
                          :is-selected="selectedModuleId === member.id"
                          :column-info="{ columns: 1, columnIndex: 0 }"
                          @select="selectModule"
                          @move-up="moveModuleUp"
                          @move-down="moveModuleDown"
                          @duplicate="duplicateModule"
                          @delete="deleteModule"
                        />
                      </div>
                    </template>
                  </template>
                </template>

                <!-- 기본: 그룹 멤버 세로 스택 -->
                <template v-else>
                  <div
                    v-for="member in item.modules"
                    :key="member.id"
                    :id="`canvas-module-${member.id}`"
                    class="relative transition-all"
                    :class="{ 'ring-2 ring-amber-400 ring-inset rounded-sm': hoveredModuleId === member.id }"
                  >
                    <ModuleRenderer
                      :module="member"
                      :index="member.order"
                      :is-selected="selectedModuleId === member.id"
                      @select="selectModule"
                      @move-up="moveModuleUp"
                      @move-down="moveModuleDown"
                      @duplicate="duplicateModule"
                      @delete="deleteModule"
                    />
                  </div>
                </template>
              </div>
            </div>

            <!-- 단독 모듈 -->
            <div
              v-else
              :id="`canvas-module-${item.module.id}`"
              class="relative group transition-all"
              :class="{ 'ring-2 ring-amber-400 ring-inset rounded-sm': hoveredModuleId === item.module.id }"
            >
              <div
                class="dh-top absolute left-0 top-0 bottom-0 w-8 flex flex-col items-center justify-center cursor-grab opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-blue-100/90 hover:bg-blue-200/90"
                title="마우스로 끌어서 순서를 변경하세요"
              >
                <i class="pi pi-bars text-blue-600 text-lg"></i>
                <span class="text-blue-600 text-[8px] mt-0.5">이동</span>
              </div>
              <ModuleRenderer
                :module="item.module"
                :index="item.module.order"
                :is-selected="selectedModuleId === item.module.id"
                @select="selectModule"
                @move-up="moveModuleUp"
                @move-down="moveModuleDown"
                @duplicate="duplicateModule"
                @delete="deleteModule"
              />
            </div>
           </div>
          </template>
        </draggable>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { useNewsletterImport } from '@/composables/useNewsletterImport'
import ModuleRenderer from '../modules/ModuleRenderer.vue'
import draggable from 'vuedraggable'
import type { DisplayItem, ModuleGroup, ModuleInstance } from '@/types'
import { groupDivStyle, resolveGroupStyles, columnCellStyle } from '@/utils/groupStyle'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()
const confirm = useConfirm()
const { importHtmlFile } = useNewsletterImport()

// 그룹 전체 삭제 — 멤버 모듈까지 함께 지우므로 확인 후 진행
const confirmDeleteGroup = (item: DisplayItem): void => {
  if (item.type !== 'group') return
  const count = item.modules.length
  confirm.require({
    message: `이 그룹과 포함된 ${count}개 모듈이 모두 삭제됩니다. 계속하시겠습니까?`,
    header: '그룹 삭제 확인',
    rejectLabel: '취소',
    acceptLabel: '삭제',
    rejectClass: 'p-button-secondary',
    acceptClass: 'p-button-danger',
    accept: () => moduleStore.deleteGroup(item.id),
  })
}

// 빈 화면 빠른 시작: 좌측 패널을 템플릿 탭으로 전환
const startFromTemplate = (): void => editorStore.setModulePanelMode('templates')
// 빈 화면 빠른 시작: 재편집용 HTML 파일 열기
const openFile = (): void => {
  void importHtmlFile()
}

const modules = computed(() => moduleStore.modules)
const selectedModuleId = computed(() => moduleStore.selectedModuleId)
const selectedGroupId = computed(() => moduleStore.selectedGroupId)
const canvasWidth = computed(() => editorStore.canvasWidth)

// 그룹은 한 덩어리(displayItem)로 드래그 — 펼치면 store가 평평한 배열로 재구성
const displayList = computed<DisplayItem[]>({
  get: () => moduleStore.displayItems,
  set: (value) => moduleStore.setDisplayOrder(value),
})

// 그룹 래퍼 미리보기 스타일 (편집 화면용 — 내보내기 table과 동일한 시각 효과)
// '포인트 색상 사용' 켜진 색상은 전역 포인트 색상으로 해소해 미리 보여준다
const groupWrapperStyle = (group: ModuleGroup): Record<string, string> =>
  groupDivStyle(resolveGroupStyles(group.styles, editorStore.wrapSettings.pointColor))

const selectGroupBox = (groupId: string): void => {
  moduleStore.selectGroup(groupId)
}

// 목차 패널에서 마우스 올린 모듈 — 캔버스에서 강조만 (스크롤은 하지 않음)
const hoveredModuleId = computed(() => editorStore.hoveredModuleId)

// 모듈 선택(목차 행 클릭 포함) 시에만 캔버스를 해당 모듈로 스크롤
watch(selectedModuleId, async (id) => {
  if (!id) return
  await nextTick()
  const el = document.getElementById(`canvas-module-${id}`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
})
const wrapSettings = computed(() => editorStore.wrapSettings)

// 캔버스 컨테이너 스타일 (공통 속성 반영)
const canvasContainerStyle = computed(() => ({
  minHeight: '600px',
  backgroundColor: wrapSettings.value.backgroundColor,
  border: `${wrapSettings.value.borderWidth} ${wrapSettings.value.borderStyle} ${wrapSettings.value.borderColor}`,
}))

const isDragging = ref(false)

const onDragStart = () => {
  isDragging.value = true
}

const onDragEnd = () => {
  isDragging.value = false
}

const selectModule = (moduleId: string) => {
  moduleStore.selectModule(moduleId)
}

const moveModuleUp = (moduleId: string) => {
  moduleStore.moveModuleUp(moduleId)
}

const moveModuleDown = (moduleId: string) => {
  moduleStore.moveModuleDown(moduleId)
}

const duplicateModule = (moduleId: string) => {
  moduleStore.duplicateModule(moduleId)
}

const deleteModule = (moduleId: string) => {
  moduleStore.removeModule(moduleId)
}

// ===== 컬럼 분할 =====
// 분할/되돌리기/좌우 이동은 속성 패널(PropertiesPanel)에서 제어한다.

// 그룹의 컬럼 수 (1이면 세로 스택, 2~4면 가로 컬럼)
const groupColumns = (item: DisplayItem): number => {
  if (item.type !== 'group') return 1
  const c = item.group.columns
  return c && c > 1 ? Math.min(c, 4) : 1
}

// 그룹 멤버를 순서대로 '밴드(행)'로 나눈다:
//  - 전체폭(fullWidth) 멤버 구간 → 전체폭 밴드(세로 스택)
//  - 일반 멤버 구간 → 컬럼 밴드(컬럼별 배치)
// → 한 그룹에서 "전체폭 상단 + 2단 하단"처럼 1단/다단 혼합을 렌더한다.
type GroupBand =
  | { type: 'full'; members: ModuleInstance[] }
  | { type: 'cols'; columns: number; members: ModuleInstance[] }

const groupBands = (item: DisplayItem): GroupBand[] => {
  if (item.type !== 'group') return []
  const cols = groupColumns(item)
  if (cols <= 1) return [{ type: 'full', members: item.modules }]
  const bands: GroupBand[] = []
  for (const m of item.modules) {
    const wantType: GroupBand['type'] = m.fullWidth ? 'full' : 'cols'
    const last = bands[bands.length - 1]
    if (last && last.type === wantType) {
      last.members.push(m)
    } else if (wantType === 'full') {
      bands.push({ type: 'full', members: [m] })
    } else {
      bands.push({ type: 'cols', columns: cols, members: [m] })
    }
  }
  return bands
}

// 특정 컬럼 밴드의 특정 컬럼(0-based)에 속한 멤버들
const bandColumnMembers = (band: GroupBand, colIdx: number): ModuleInstance[] => {
  if (band.type !== 'cols') return []
  return band.members.filter((m) => (m.columnIndex ?? 0) === colIdx)
}

// 컬럼 셀 인라인 스타일 (캔버스·이메일 공용 fluid-hybrid)
const colCellStyle = (columns: number): string => columnCellStyle(columns)

// 빈 컬럼을 '추가 대상'으로 지정 / 지정 여부
const targetColumn = (groupId: string, colIdx: number) =>
  moduleStore.setColumnTarget(groupId, colIdx)
const isColTarget = (groupId: string, colIdx: number): boolean =>
  moduleStore.columnTarget?.groupId === groupId &&
  moduleStore.columnTarget?.columnIndex === colIdx
// 이웃 컬럼 복제로 빈 컬럼 채우기
const dupIntoColumn = (groupId: string, colIdx: number) =>
  moduleStore.duplicateIntoColumn(groupId, colIdx)
// 빈 컬럼 삭제 (오른쪽 컬럼들을 왼쪽으로 당김)
const removeColumn = (groupId: string, colIdx: number) =>
  moduleStore.removeColumn(groupId, colIdx)
</script>

<style scoped>
/* 드래그 중인 요소의 고스트 스타일 */
.dragging-ghost {
  opacity: 0.5;
  background: #e5e7eb;
}

/* 드래그로 선택된 요소 스타일 */
.dragging-chosen {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 드래그 핸들 호버 효과 */
.dh-top:active {
  cursor: grabbing;
}

/*
  그룹 박스: 실제 스타일(배경/보더/여백)은 인라인으로 적용된다.
  편집 화면에서 그룹 경계를 항상 인지할 수 있도록 옅은 점선 outline을 덧댄다.
  outline은 레이아웃에 영향을 주지 않으므로 내보내기 결과와 간격이 어긋나지 않는다.
*/
.group-box {
  position: relative;
  outline: 1px dashed rgba(147, 51, 234, 0.45);
  outline-offset: -1px;
}

.group-box--selected {
  outline: 2px solid #9333ea;
  /* outline-offset: 2px; */
}

.group-wrap {
  position: relative;
}

/*
  그룹 헤더 바 — 박스 상단에 붙는 편집 전용 헤더(드래그 핸들 겸 컨트롤).
  왼쪽: 그룹 식별 라벨(모듈 수), 오른쪽: 복제·해제·스타일·삭제.
  내보내기 HTML(generateHtml)에는 포함되지 않으므로 메일에는 나타나지 않는다.
*/
.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 3px 6px 3px 8px;
  background: #f5f3ff; /* purple-50 */
  border: 1px solid #e9d5ff; /* purple-200 */
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  user-select: none;
  cursor: grab;
}
.group-header:active {
  cursor: grabbing;
}
.group-header--selected {
  background: #ede9fe; /* purple-100 */
  border-color: #c4b5fd; /* purple-300 */
}

.group-header__label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: #7c3aed; /* purple-600 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.group-header__label .pi {
  font-size: 12px;
}

.group-header__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.group-header__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #7c3aed; /* purple-600 */
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.group-header__btn .pi {
  font-size: 13px;
}
.group-header__btn:hover {
  background: #ddd6fe; /* purple-200 */
}
.group-header__btn--danger {
  color: #ef4444;
}
.group-header__btn--danger:hover {
  background: #fee2e2;
}

/* 헤더와 박스가 하나의 카드처럼 이어지도록 박스 상단 모서리 각지게 */
.group-header + .group-box {
  border-radius: 0 0 6px 6px;
}

/* ===== 컬럼 분할 (POC) ===== */
/* 컬럼 행: font-size:0 으로 inline-block 셀 사이 공백 제거 → 컬럼 폭 정확 균등 분할 */
.col-row {
  font-size: 0;
}
/* 컬럼 셀: 인라인 스타일(columnCellStyle)로 폭/inline-block 지정, 여기선 보조 스타일만 */
.col-cell {
  /* 부모(col-row)의 font-size:0 을 셀 내부에서 복원 (콘텐츠는 자체 인라인 크기 사용) */
  font-size: 14px;
  /* 편집 화면에서 컬럼 경계 인지용 옅은 점선 (내보내기에는 없음) */
  outline: 1px dashed rgba(37, 99, 235, 0.25);
  outline-offset: -1px;
  min-height: 40px;
}

/* 빈 컬럼 placeholder */
.empty-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 90px;
  padding: 12px 8px;
  font-size: 12px;
  color: #64748b;
  background: repeating-linear-gradient(
    45deg,
    #f8fafc,
    #f8fafc 8px,
    #f1f5f9 8px,
    #f1f5f9 16px
  );
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
  cursor: pointer;
}
.empty-col:hover {
  border-color: #60a5fa;
  color: #2563eb;
}
.empty-col--target {
  border-color: #2563eb;
  border-style: solid;
  background: #eff6ff;
  color: #2563eb;
}
.empty-col__icon {
  font-size: 18px;
}
.empty-col__title {
  font-weight: 600;
}
.empty-col__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
}
.empty-col__btn {
  padding: 3px 10px;
  font-size: 11px;
  color: #2563eb;
  background: #ffffff;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  cursor: pointer;
}
.empty-col__btn:hover {
  background: #dbeafe;
}
.empty-col__btn--danger {
  color: #dc2626;
  border-color: #fecaca;
}
.empty-col__btn--danger:hover {
  background: #fee2e2;
}
.empty-col__hint {
  font-size: 10px;
  color: #94a3b8;
  text-align: center;
}
</style>
