<template>
  <div class="flex-1 bg-gray-100 px-8 pt-24 pb-36 overflow-auto" @click="onCanvasBlankClick">
    <!-- pt-24: 상단 여백 — 그룹 상단 툴바(top:-44px)가 잘리지 않도록 확보 -->
    <div class="flex justify-center">
      <!-- 캔버스 컨테이너 -->
      <div
        :class="[
          'canvas-container shadow-lg transition-all duration-300',
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
              :class="{
                'group-wrap--selected': activeGroupId === item.id,
                'group-wrap--group-selected': selectedGroupId === item.id,
              }"
            >
              <!-- 상단 그룹 툴바 (Figma 557-610) — 마우스 오버 또는 그룹/멤버 선택 시에만 노출.
                   스타일 편집 · 위로 이동 · 아래로 이동 · 그룹 해제 · 복제 · 삭제. -->
              <div class="group-top-toolbar no-drag">
                <!-- 그룹 이름 — 조립형 모듈이면 모듈명('이미지형 헤더'), 직접 묶은 그룹이면 '그룹 01' -->
                <span class="gtt-name">{{ item.group.name || '그룹' }}</span>
                <button
                  type="button"
                  class="gtt-btn"
                  v-tooltip.top="'위로 이동'"
                  @click.stop="moduleStore.moveGroup(item.id, 'up')"
                >
                  <span class="material-symbols-outlined">arrow_upward</span>
                </button>
                <button
                  type="button"
                  class="gtt-btn"
                  v-tooltip.top="'아래로 이동'"
                  @click.stop="moduleStore.moveGroup(item.id, 'down')"
                >
                  <span class="material-symbols-outlined">arrow_downward</span>
                </button>
                <button
                  type="button"
                  class="gtt-btn"
                  v-tooltip.top="'그룹 해제 (모듈은 유지)'"
                  @click.stop="moduleStore.ungroup(item.id)"
                >
                  <span class="material-symbols-outlined">link_off</span>
                </button>
                <button
                  type="button"
                  class="gtt-btn"
                  v-tooltip.top="'그룹 복제'"
                  @click.stop="moduleStore.duplicateGroup(item.id)"
                >
                  <span class="material-symbols-outlined">content_copy</span>
                </button>
                <button
                  type="button"
                  class="gtt-btn gtt-btn--danger"
                  v-tooltip.top="'그룹 전체 삭제'"
                  @click.stop="confirmDeleteGroup(item)"
                >
                  <span class="material-symbols-outlined">delete</span>
                </button>
                <!-- Figma 908-11276: 스타일 편집은 툴바 오른쪽 끝 -->
                <button
                  type="button"
                  class="gtt-style-btn"
                  :disabled="selectedGroupId === item.id"
                  v-tooltip.top="selectedGroupId === item.id ? '이미 이 그룹의 스타일을 편집 중이에요' : undefined"
                  @click.stop="selectGroupBox(item.id)"
                >그룹 스타일 편집</button>
              </div>
              <!-- 실제 스타일 박스 (배경/테두리/여백은 내보내기와 동일) -->
              <div
                class="group-box"
                :class="{ 'group-box--selected': activeGroupId === item.id }"
                :style="groupWrapperStyle(item.group)"
                @click.self="selectGroupBox(item.id)"
              >
                <!-- 행별 독립 컬럼 렌더: 각 행이 자기 컬럼 수를 가진다. -->
                <!-- 1컬럼 행 = 전체폭 세로 스택, 2+컬럼 행 = fluid-hybrid col-row(모바일 세로 스택) -->
                <!-- 그룹 내부 드래그: 멤버 핸들(.dh-member)로 '행'을 그룹 안에서 재배치 -->
                <draggable
                  :list="groupRows(item)"
                  :item-key="rowItemKey"
                  handle=".dh-member"
                  filter=".no-drag"
                  :prevent-on-filter="false"
                  ghost-class="dragging-ghost"
                  chosen-class="dragging-chosen"
                  animation="200"
                  @end="onGroupRowDrop(item.id, $event)"
                >
                  <template #item="{ element: row, index: rowIdx }">
                   <div class="group-row-item">
                  <!-- 다단 행 (.col-row: font-size:0 으로 셀 사이 공백 제거 → 폭 균등 분할) -->
                  <div v-if="row.columns > 1" class="col-row">
                    <div
                      v-for="col in row.columns"
                      :key="`col-${rowIdx}-${col}`"
                      class="col-cell"
                      :style="colCellStyle(row.columns, row.widths?.[col - 1])"
                    >
                      <div
                        v-for="member in row.cells[col - 1]"
                        :key="member.id"
                        :id="`canvas-module-${member.id}`"
                        class="relative group transition-all"
                        :class="{ 'ring-2 ring-amber-400 ring-inset rounded-sm': hoveredModuleId === member.id }"
                      >
                        <!-- 그룹 안 모듈에도 드래그 핸들 노출 (선택/호버 시). 이 핸들로 그룹 내부에서 재배치. -->
                        <div
                          class="dh-member module-drag-handle"
                          :class="{ 'is-visible': selectedModuleId === member.id }"
                          title="마우스로 끌어서 그룹 안에서 순서를 변경하세요"
                        >
                          <span class="material-symbols-outlined">drag_indicator</span>
                        </div>
                        <ModuleRenderer
                          :module="member"
                          :index="member.order"
                          :is-selected="selectedModuleId === member.id"
                          :column-info="{ columns: row.columns, columnIndex: member.columnIndex ?? 0 }"
                          @select="selectModule"
                          @move-up="moveModuleUp"
                          @move-down="moveModuleDown"
                          @duplicate="duplicateModule"
                          @delete="deleteModule"
                        />
                      </div>
                      <!-- 빈 컬럼 placeholder (컬럼 분할 시) — Figma 745-8054:
                           방식 선택(컬럼 복제 / 직접 구성). '직접 구성'을 고르면 이 컬럼이 활성화(추가 대상)되고
                           왼쪽 패널에서 추가하는 모듈이 이 컬럼에 들어간다. (컬럼 수는 속성 패널 1/2/3단으로 조정) -->
                      <div
                        v-if="row.cells[col - 1].length === 0"
                        class="empty-col no-drag"
                        :class="{ 'empty-col--target': isColTarget(item.id, rowIdx, col - 1) }"
                      >
                        <template v-if="isColTarget(item.id, rowIdx, col - 1)">
                          <span class="material-symbols-outlined empty-col__icon">arrow_downward</span>
                          <div class="empty-col__prompt">왼쪽 '구성 요소'에서 넣을 요소를<br />체크하면 이 컬럼에 추가됩니다</div>
                          <button
                            type="button"
                            class="empty-col__cancel"
                            @click.stop="targetColumn(item.id, rowIdx, col - 1)"
                          >취소</button>
                        </template>
                        <template v-else>
                          <div class="empty-col__prompt">원하시는 방식을 선택해주세요</div>
                          <div class="empty-col__cards">
                            <button
                              type="button"
                              class="empty-col__card"
                              @click.stop="dupIntoColumn(item.id, rowIdx, col - 1)"
                            >
                              <span class="material-symbols-outlined">content_copy</span>
                              <span class="empty-col__card-label">컬럼 복제</span>
                            </button>
                            <button
                              type="button"
                              class="empty-col__card"
                              @click.stop="targetColumn(item.id, rowIdx, col - 1)"
                            >
                              <span class="material-symbols-outlined">add_photo_alternate</span>
                              <span class="empty-col__card-label">직접 구성</span>
                            </button>
                          </div>
                        </template>
                      </div>
                    </div>
                  </div>

                  <!-- 전체폭 행 (1컬럼): 그 칸의 멤버들을 세로 스택 -->
                  <template v-else>
                    <div
                      v-for="member in row.cells[0]"
                      :key="member.id"
                      :id="`canvas-module-${member.id}`"
                      class="relative group transition-all"
                      :class="{ 'ring-2 ring-amber-400 ring-inset rounded-sm': hoveredModuleId === member.id }"
                    >
                      <!-- 그룹 안 모듈에도 드래그 핸들 노출 (선택/호버 시). 이 핸들로 그룹 내부에서 재배치. -->
                      <div
                        class="dh-member module-drag-handle"
                        :class="{ 'is-visible': selectedModuleId === member.id }"
                        title="마우스로 끌어서 그룹 안에서 순서를 변경하세요"
                      >
                        <span class="material-symbols-outlined">drag_indicator</span>
                      </div>
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
                   </div>
                  </template>
                </draggable>
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
                class="dh-top module-drag-handle"
                :class="{ 'is-visible': selectedModuleId === item.module.id }"
                title="마우스로 끌어서 순서를 변경하세요"
              >
                <span class="material-symbols-outlined">drag_indicator</span>
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
import { resolveWrapBorderCss } from '@/utils/wrapBorder'
import { computeGroupLayout, type GroupRowLayout } from '@/utils/groupLayout'

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
// 칩의 'is-selected'(채움)는 그룹 '자체' 선택 전용 — 모듈 추가가 그룹 아래로 가는 상태임을 알린다.
const selectedGroupId = computed(() => moduleStore.selectedGroupId)
// 박스 하이라이트는 멤버 드릴다운까지 포함한 '활성 그룹' 기준 — 좌측에 그룹 패널이 떠 있는데
// 캔버스에는 아무 표시가 없던 불일치를 없앤다.
const activeGroupId = computed(() => moduleStore.activeGroup?.id ?? null)
const canvasWidth = computed(() => editorStore.canvasWidth)

// 그룹은 한 덩어리(displayItem)로 드래그 — 펼치면 store가 평평한 배열로 재구성
const displayList = computed<DisplayItem[]>({
  get: () => moduleStore.displayItems,
  set: (value) => moduleStore.setDisplayOrder(value),
})

// 그룹 래퍼 미리보기 스타일 (편집 화면용 — 내보내기 table과 동일한 시각 효과)
// '포인트 색상 사용' 켜진 색상은 전역 포인트 색상으로 해소해 미리 보여준다
const groupWrapperStyle = (group: ModuleGroup): Record<string, string> =>
  groupDivStyle(resolveGroupStyles(group.styles, editorStore.wrapSettings.pointColors))

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

// 캔버스 컨테이너 스타일 (전체 스타일 반영)
const canvasContainerStyle = computed(() => ({
  minHeight: '600px',
  backgroundColor: wrapSettings.value.backgroundColor,
  border: resolveWrapBorderCss(wrapSettings.value),
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

// 캔버스에서 미리보기 컨테이너(.canvas-container) 바깥의 빈 영역을 클릭하면
// 모듈/그룹 선택을 해제한다. 선택이 비면 좌측 패널은 직전에 열려 있던 레일 메뉴로 자동 복귀한다.
const onCanvasBlankClick = (e: MouseEvent): void => {
  const target = e.target as HTMLElement | null
  if (target?.closest('.canvas-container')) return // 컨테이너 내부(모듈/툴바) 클릭은 무시
  if (moduleStore.selectedModuleId || moduleStore.selectedGroupId) {
    moduleStore.clearSelection()
  }
}

// 그룹 멤버는 rowIndex로 배치되므로 modules 배열 swap(moduleStore.moveModuleUp)만으로는 위치가 안 바뀐다.
// → 멤버가 그룹에 속하면 그 멤버의 '행'을 위/아래로 이동(드래그 재배치와 동일: reorderGroupRows).
const moveMemberRow = (moduleId: string, direction: 'up' | 'down'): boolean => {
  const mod = modules.value.find((m) => m.id === moduleId)
  if (!mod?.groupId) return false
  const item = displayList.value.find((d) => d.type === 'group' && d.id === mod.groupId)
  if (!item || item.type !== 'group') return false
  const rows = groupRows(item)
  const rowIdx = rows.findIndex((r) => r.cells.flat().some((m) => m.id === moduleId))
  if (rowIdx < 0) return false
  const target = direction === 'up' ? rowIdx - 1 : rowIdx + 1
  if (target < 0 || target >= rows.length) return false
  const [row] = rows.splice(rowIdx, 1)
  rows.splice(target, 0, row)
  moduleStore.reorderGroupRows(mod.groupId, rows)
  return true
}

const moveModuleUp = (moduleId: string) => {
  if (moveMemberRow(moduleId, 'up')) return
  moduleStore.moveModuleUp(moduleId)
}

const moveModuleDown = (moduleId: string) => {
  if (moveMemberRow(moduleId, 'down')) return
  moduleStore.moveModuleDown(moduleId)
}

const duplicateModule = (moduleId: string) => {
  moduleStore.duplicateModule(moduleId)
}

const deleteModule = (moduleId: string) => {
  moduleStore.removeModule(moduleId)
}

// ===== 행별 독립 컬럼 =====
// 분할/되돌리기/좌우 이동은 속성 패널(PropertiesPanel)에서 제어한다.

// 그룹을 '행'들로 배치한다. 각 행은 자기 컬럼 수를 가지며 cells[colIdx]=그 칸의 멤버들.
const groupRows = (item: DisplayItem): GroupRowLayout<ModuleInstance>[] => {
  if (item.type !== 'group') return []
  return computeGroupLayout(item.group, item.modules)
}

// 그룹 내부 draggable: 행의 고유 키 = 그 행 첫 멤버 id
const rowItemKey = (row: GroupRowLayout<ModuleInstance>): string =>
  row.cells.flat().find(Boolean)?.id ?? 'empty-row'

// 그룹 안에서 '행'을 드래그로 재배치(SortableJS end 이벤트의 old/new 인덱스로 순서 갱신).
const onGroupRowDrop = (
  groupId: string,
  evt: { oldIndex?: number; newIndex?: number },
): void => {
  const { oldIndex, newIndex } = evt
  if (oldIndex == null || newIndex == null || oldIndex === newIndex) return
  const item = displayList.value.find((d) => d.type === 'group' && d.id === groupId)
  if (!item || item.type !== 'group') return
  const rows = groupRows(item)
  if (oldIndex < 0 || oldIndex >= rows.length || newIndex < 0 || newIndex >= rows.length) return
  const [row] = rows.splice(oldIndex, 1)
  rows.splice(newIndex, 0, row)
  moduleStore.reorderGroupRows(groupId, rows)
}

// 컬럼 셀 인라인 스타일 (캔버스·이메일 공용 fluid-hybrid)
const colCellStyle = (columns: number, widthPct?: number): string =>
  columnCellStyle(columns, widthPct)

// 이웃 컬럼 복제로 빈 컬럼 채우기 (같은 행)
const dupIntoColumn = (groupId: string, rowIdx: number, colIdx: number) =>
  moduleStore.duplicateIntoColumn(groupId, rowIdx, colIdx)
// '직접 구성': 빈 컬럼을 '추가 대상'으로 지정(토글). 지정 후 왼쪽 패널에서 모듈을 추가하면 이 (행,컬럼)에 들어간다.
const targetColumn = (groupId: string, rowIdx: number, colIdx: number) => {
  if (isColTarget(groupId, rowIdx, colIdx)) moduleStore.clearColumnTarget()
  else moduleStore.setColumnTarget(groupId, rowIdx, colIdx)
}
const isColTarget = (groupId: string, rowIdx: number, colIdx: number): boolean =>
  moduleStore.columnTarget?.groupId === groupId &&
  moduleStore.columnTarget?.rowIndex === rowIdx &&
  moduleStore.columnTarget?.columnIndex === colIdx
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

/* 좌측 드래그 핸들 (Figma 352-1138) — 단독 모듈 왼쪽 바깥에 붙는 흰 카드.
   **선택했을 때만** 보인다(모듈 우측 툴바와 동일한 노출 조건).
   호버만으로 뜨면 마우스가 지나가는 모듈마다 좌우로 카드가 깜빡여 미리보기를 훑기 어렵다. */
.module-drag-handle {
  position: absolute;
  left: -32px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 31px;
  height: min(100%, 208px);
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #e5e8eb;
  border-radius: 12px 0 0 12px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.11);
  cursor: grab;
  color: #8b95a1;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s;
}
.module-drag-handle.is-visible {
  opacity: 1;
  pointer-events: auto;
}

/* 그룹 전용 좌측 통합 카드: 드래그 핸들 + 액션(복제·해제·그룹 스타일·삭제)을 한 장으로 병합.
   기존엔 핸들(호버 시만 노출)과 액션 툴바(항상 노출)가 별도 카드였는데, 핸들도 계속 꺼지지
   않도록 하나로 합쳐 항상 노출한다(그룹은 늘 조작 대상이 뚜렷해야 함). 그룹 왼쪽에 위치. */
/* 상단 그룹 툴바 (Figma 557-610) — 그룹 상단에 가로 다크 바.
   기본은 숨김, 그룹에 마우스 오버 또는 '스타일 편집'으로 그룹 자체 선택(group-wrap--group-selected) 시에만 노출. */
.group-top-toolbar {
  position: absolute;
  top: -50px;
  left: -1px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 16px;
  width: calc(100% + 2px);
  padding: 10px 25px;
  background: #191f28;
  border-radius: 10px 10px 0 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s ease;
}
.group-wrap:hover > .group-top-toolbar,
.group-wrap--group-selected > .group-top-toolbar {
  opacity: 1;
  pointer-events: auto;
}
/* 그룹 이름 — 툴바 맨 왼쪽 (Figma 908-11276) */
.gtt-name {
  flex-shrink: 0;
  max-width: 40%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}
.gtt-style-btn {
  /* 오른쪽 끝으로 밀어낸다 (이름과 아이콘 사이 여백을 이 버튼이 흡수) */
  margin-left: auto;
  height: 30px;
  padding: 0 16px;
  border: none;
  border-radius: 7px;
  background: #333d4b;
  color: #d1d6db;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.12s ease, color 0.12s ease;
}
.gtt-style-btn:not(:disabled):hover {
  background: #4e5968;
  color: #fff;
}
/* 이미 이 그룹 스타일 편집 중이면 비활성 — 다른 모듈/그룹을 선택하면 다시 활성화된다 */
.gtt-style-btn:disabled {
  background: #2b323c;
  color: #6b7684;
  cursor: not-allowed;
}
.gtt-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: #d1d6db;
  cursor: pointer;
  border-radius: 7px;
  transition: background-color 0.12s ease, color 0.12s ease;
}
.gtt-btn .material-symbols-outlined {
  font-size: 19px;
}
.gtt-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}
.gtt-btn--danger {
  color: #ff6b74;
}
.gtt-btn--danger:hover {
  background: rgba(240, 68, 82, 0.2);
  color: #ff6b74;
}

/*
  그룹 박스: 실제 스타일(배경/보더/여백)은 인라인으로 적용된다.
  편집 화면에서 그룹 경계를 항상 인지할 수 있도록 옅은 점선 outline을 덧댄다.
  outline은 레이아웃에 영향을 주지 않으므로 내보내기 결과와 간격이 어긋나지 않는다.
*/
.group-box {
  position: relative;
  /* 컬럼 경계(파란 점선)보다 확실히 무겁게 — 그룹 경계와 컬럼 경계가 혼동되지 않도록 */
  outline: 1.5px dashed rgba(147, 51, 234, 0.5);
  outline-offset: -1px;
  transition: outline-color 0.12s ease, background-color 0.12s ease;
}

/* 호버 — "여기를 클릭하면 그룹을 잡을 수 있다"는 신호 (이전엔 호버 표시가 전혀 없었다) */
.group-box:hover {
  outline-color: rgba(147, 51, 234, 0.85);
}

.group-box--selected,
.group-box--selected:hover {
  outline: 2px solid #9333ea;
}

.group-wrap {
  position: relative;
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
  /* 편집 화면에서 컬럼 경계 인지용 옅은 점선 (내보내기에는 없음).
     그룹 경계(보라 dashed 1.5px)와 헷갈리지 않도록 더 가볍게 dotted 처리. */
  outline: 1px dotted rgba(37, 99, 235, 0.18);
  outline-offset: -1px;
  min-height: 40px;
}

/* 빈 컬럼 placeholder (컬럼 분할 시 방식 선택) — Figma 745-8054 */
.empty-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 100%;
  padding: 20px 16px;
  border: 1px dashed #c6ccd4;
  border-radius: 8px;
}
.empty-col--target {
  border-color: #4083f3;
  background: #f5f9ff;
}
.empty-col__prompt {
  font-size: 15px;
  color: #4e5968;
  letter-spacing: -0.15px;
  text-align: center;
  line-height: 1.5;
}
/* '직접 구성' 선택 후: 이 컬럼이 추가 대상임을 알리는 활성 상태 */
.empty-col__icon {
  font-size: 24px;
  color: #4083f3;
}
.empty-col__cancel {
  padding: 4px 12px;
  font-size: 12px;
  color: #6b7684;
  background: #fff;
  border: 1px solid #e5e8eb;
  border-radius: 6px;
  cursor: pointer;
}
.empty-col__cancel:hover {
  background: #f2f4f6;
}
/* 방식 선택 카드 (컬럼 복제 / 직접 구성) */
.empty-col__cards {
  display: flex;
  gap: 12px;
}
.empty-col__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 84px;
  height: 74px;
  background: #fff;
  border: 1px solid #e5e8eb;
  border-radius: 10px;
  color: #4e5968;
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s, background-color 0.12s;
}
.empty-col__card:hover {
  border-color: #4083f3;
  color: #4083f3;
  background: #f5f9ff;
}
.empty-col__card .material-symbols-outlined {
  font-size: 24px;
}
.empty-col__card-label {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.13px;
}
</style>
