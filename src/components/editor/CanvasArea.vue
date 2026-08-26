<template>
  <div
    ref="canvasScrollEl"
    class="flex-1 bg-gray-100 px-8 pt-24 pb-36 overflow-auto"
    @click="onCanvasBlankClick"
  >
    <!-- pt-24: 상단 여백 — 그룹 상단 툴바(top:-44px)가 잘리지 않도록 확보 -->
    <div class="flex justify-center">
      <!-- 캔버스 컨테이너 -->
      <div
        :class="[
          'canvas-container shadow-lg transition-all duration-300 w-full',
          canvasWidth === 'mobile' ? 'max-w-[390px]' : 'max-w-[680px]',
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
                <span>모듈 클릭 후 왼쪽 설정패널에서 내용 편집</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs font-bold">3</span>
                <span>제작 완료 후 상단의 저장용 내려받기 후 발송용 내려받기</span>
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
          :group="{ name: 'canvas-top', pull: false, put: false }"
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
                   스타일 편집 · 위로 이동 · 아래로 이동 · 그룹 해제 · 복제 · 삭제.
                   툴바 빈 자리는 아무 동작도 하지 않는다 — 그룹 선택은 '그룹 스타일 편집' 버튼으로. -->
              <div class="group-top-toolbar no-drag">
                <!-- 그룹 이름 — 조립형 모듈이면 모듈명('이미지형 헤더'), 직접 묶은 그룹이면 '그룹 01' -->
                <span class="gtt-name">{{ item.group.name || '그룹' }}</span>
                <button
                  type="button"
                  class="gtt-btn"
                  :disabled="isFirstDisplayItem(item.id)"
                  v-tooltip.top="'위로 이동'"
                  @click.stop="moduleStore.moveGroup(item.id, 'up')"
                >
                  <span class="material-symbols-outlined">arrow_upward</span>
                </button>
                <button
                  type="button"
                  class="gtt-btn"
                  :disabled="isLastDisplayItem(item.id)"
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
                :class="{
                  'group-box--selected': selectedGroupId === item.id,
                  'group-box--member': memberActiveGroupId === item.id,
                }"
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
                  :group="{ name: `group-rows-${item.id}`, pull: false, put: false }"
                  filter=".no-drag"
                  :prevent-on-filter="false"
                  ghost-class="dragging-ghost"
                  chosen-class="dragging-chosen"
                  animation="200"
                  direction="vertical"
                  @end="onGroupRowDrop(item.id, $event)"
                >
                  <template #item="{ element: row, index: rowIdx }">
                   <div
                     class="group-row-item"
                     :class="{
                       'row--multi': row.columns > 1,
                       'row--hover': isRowHovered(item.id, rowIdx),
                       'row--selected': isRowSelected(item.id, rowIdx),
                       'row--member': isRowMemberSelected(item.id, rowIdx),
                     }"
                     @mouseenter="hoveredRow = { groupId: item.id, rowIndex: rowIdx }"
                     @mouseleave="hoveredRow = null"
                   >
                  <!-- 좌우 자리 바꾸기 (Figma 1125-9661) — 행 한가운데 뜨는 원형 버튼.
                       다단 행 안 모듈은 위아래로 못 움직이므로, 이동 수단은 좌우 교체뿐이다. -->
                  <button
                    v-if="row.columns > 1 && isRowVisible(item.id, rowIdx)"
                    type="button"
                    class="row-swap-btn no-drag"
                    v-tooltip.top="'좌우 자리 바꾸기'"
                    @click.stop="moduleStore.swapRowColumns(item.id, rowIdx)"
                  >
                    <span class="material-symbols-outlined">sync_alt</span>
                  </button>

                  <!-- 행 전체가 선택됐을 때의 툴바 — 2단은 '행'이 위아래 이동 단위다 -->
                  <div v-if="isRowSelected(item.id, rowIdx)" class="row-toolbar no-drag">
                    <button
                      type="button"
                      class="module-toolbar-btn"
                      :disabled="rowIdx === 0"
                      v-tooltip.left="'위로 이동'"
                      @click.stop="moveRow(item.id, rowIdx, -1)"
                    >
                      <span class="material-symbols-outlined">arrow_upward</span>
                    </button>
                    <button
                      type="button"
                      class="module-toolbar-btn"
                      :disabled="rowIdx >= groupRows(item).length - 1"
                      v-tooltip.left="'아래로 이동'"
                      @click.stop="moveRow(item.id, rowIdx, 1)"
                    >
                      <span class="material-symbols-outlined">arrow_downward</span>
                    </button>
                    <button
                      type="button"
                      class="module-toolbar-btn"
                      v-tooltip.left="'행 복제 (컬럼 구성 그대로)'"
                      @click.stop="duplicateRow(item.id, rowIdx)"
                    >
                      <span class="material-symbols-outlined">content_copy</span>
                    </button>
                    <button
                      type="button"
                      class="module-toolbar-btn is-danger"
                      v-tooltip.left="'행 전체 삭제'"
                      @click.stop="confirmDeleteRow(item.id, rowIdx, row)"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>

                  <!-- 다단 행의 드래그 핸들은 '행' 왼쪽에 하나만 둔다.
                       열마다 두면 오른쪽 열 핸들이 행 한가운데 ⇄ 버튼과 겹친다(사용자 지적).
                       클래스는 .dh-member 그대로 — 그룹 내부 draggable의 handle 선택자다. -->
                  <div
                    v-if="row.columns > 1"
                    class="module-drag-handle dh-row"
                    :class="{
                      'dh-member': canDragGroupRow(item),
                      'is-disabled': !canDragGroupRow(item),
                      'is-visible': isRowSelected(item.id, rowIdx),
                    }"
                    :title="
                      canDragGroupRow(item)
                        ? '마우스로 끌어서 그룹 안에서 순서를 변경하세요'
                        : '이 그룹에는 행이 하나뿐이라 옮길 자리가 없어요'
                    "
                  >
                    <span class="material-symbols-outlined">drag_indicator</span>
                  </div>

                  <!-- 다단 행 (.col-row: font-size:0 으로 셀 사이 공백 제거 → 폭 균등 분할) -->
                  <div v-if="row.columns > 1" class="col-row">
                    <div
                      v-for="col in row.columns"
                      :key="`col-${rowIdx}-${col}`"
                      class="col-cell"
                      :style="colCellStyle(row.columns, row.widths?.[col - 1], row.keepInline)"
                    >
                      <div
                        v-for="member in row.cells[col - 1]"
                        :key="member.id"
                        :id="`canvas-module-${member.id}`"
                        class="relative group transition-all"
                        :class="{ 'ring-2 ring-amber-400 ring-inset rounded-sm': hoveredModuleId === member.id }"
                      >
                        <!-- 열 안 모듈에는 드래그 핸들을 두지 않는다 — 이동 단위가 '행'이라
                             핸들은 행 왼쪽에 하나만 있고(위 .dh-row), 좌우는 가운데 ⇄로 바꾼다.
                             단, 한 칸에 모듈이 2개 이상 쌓였으면 그 칸 안에서는 위/아래로 옮길 수 있다. -->
                        <ModuleRenderer
                          :module="member"
                          :index="member.order"
                          :is-selected="selectedModuleId === member.id"
                          :column-info="{ columns: row.columns, columnIndex: member.columnIndex ?? 0 }"
                          :can-move-up="canMoveInCell(row.cells[col - 1], member.id, 'up')"
                          :can-move-down="canMoveInCell(row.cells[col - 1], member.id, 'down')"
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
                        <!-- '직접 구성' 대기 상태 (Figma 977-12994) — 좌측 패널의 모듈 목록에서 고르면 이 컬럼에 들어간다 -->
                        <template v-if="isColTarget(item.id, rowIdx, col - 1)">
                          <div class="empty-col__prompt">좌측 패널에서<br />추가하고 싶은 모듈을 선택해주세요</div>
                          <button
                            type="button"
                            class="empty-col__cancel"
                            @click.stop="targetColumn(item.id, rowIdx, col - 1)"
                          >직접 구성 취소</button>
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
                          <!-- 나눈 걸 되돌리는 길 (Figma 1069-14040) — 빈 컬럼을 지워 이 행을 1단으로 -->
                          <button
                            type="button"
                            class="empty-col__to-single"
                            @click.stop="collapseRowToSingle(item.id, rowIdx, col - 1)"
                          >1단으로 변경</button>
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
                        class="module-drag-handle"
                        :class="{
                          'dh-member': canDragGroupRow(item),
                          'is-disabled': !canDragGroupRow(item),
                          'is-visible': selectedModuleId === member.id,
                        }"
                        :title="
                          canDragGroupRow(item)
                            ? '마우스로 끌어서 그룹 안에서 순서를 변경하세요'
                            : '이 그룹에는 행이 하나뿐이라 옮길 자리가 없어요'
                        "
                      >
                        <span class="material-symbols-outlined">drag_indicator</span>
                      </div>
                      <ModuleRenderer
                        :module="member"
                        :index="member.order"
                        :is-selected="selectedModuleId === member.id"
                        :column-info="{ columns: 1, columnIndex: 0 }"
                        :can-move-up="rowIdx > 0"
                        :can-move-down="rowIdx < groupRows(item).length - 1"
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
              <!-- 단독 모듈의 위/아래 이동 기준은 전역 order가 아니라 '표시 목록' 위치다.
                   (위가 그룹이면 그룹 통째를 건너뛰므로, 그룹이 위에 있어도 이동 가능) -->
              <ModuleRenderer
                :module="item.module"
                :index="item.module.order"
                :is-selected="selectedModuleId === item.module.id"
                :can-move-up="!isFirstDisplayItem(item.id)"
                :can-move-down="!isLastDisplayItem(item.id)"
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

    <!-- 맨 위·맨 아래로 이동 (캔버스 오른쪽 아래에 붙어 따라다닌다).
         스크롤 영역 안에 두되 sticky로 고정하고, 높이 0이라 스크롤 길이를 늘리지 않는다. -->
    <div v-if="modules.length > 0" class="canvas-jump">
      <div class="canvas-jump-inner">
        <button
          type="button"
          class="cj-btn"
          aria-label="맨 위로"
          @click.stop="scrollCanvas('top')"
        >
          <span class="material-symbols-outlined">arrow_upward</span>
        </button>
        <button
          type="button"
          class="cj-btn"
          aria-label="맨 아래로"
          @click.stop="scrollCanvas('bottom')"
        >
          <span class="material-symbols-outlined">arrow_downward</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
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
const router = useRouter()
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

// 캔버스 스크롤 영역 — 맨 위/맨 아래로 보내는 버튼이 이 요소를 움직인다
const canvasScrollEl = ref<HTMLElement | null>(null)
const scrollCanvas = (to: 'top' | 'bottom'): void => {
  const el = canvasScrollEl.value
  if (!el) return
  el.scrollTo({ top: to === 'top' ? 0 : el.scrollHeight, behavior: 'smooth' })
}

// 빈 화면 빠른 시작: 템플릿 선택 화면으로 이동 (에디터 안에서 고르던 옛 목록 대신)
const startFromTemplate = (): void => {
  void router.push('/templates')
}
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

// 그룹 통째 이동 가능 여부 — 표시 목록의 맨 위/맨 아래면 그 방향 버튼을 잠근다
const isFirstDisplayItem = (itemId: string): boolean => displayList.value[0]?.id === itemId
const isLastDisplayItem = (itemId: string): boolean =>
  displayList.value[displayList.value.length - 1]?.id === itemId

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

/**
 * 모듈 선택. 2단 행 안에서는 행 선택 ↔ 열 선택을 오간다.
 * (onRowClick이 먼저 행을 선택하고, 이 핸들러가 이어서 열을 선택한다)
 */
const selectModule = (moduleId: string) => {
  const owner = rowOfModule(moduleId)
  // 1단 행·단독 모듈은 곧바로 모듈 선택
  if (!owner) {
    selectedRow.value = null
    moduleStore.selectModule(moduleId)
    return
  }
  if (selectedModuleId.value === moduleId) {
    // 이미 선택된 열을 또 누름 → 행 전체로 되돌린다
    selectedRow.value = owner
    moduleStore.clearSelection()
  } else if (isRowActive(owner)) {
    // 이 행을 보고 있는 중(행 전체 선택 또는 반대편 열 선택) → 누른 열로 내려간다
    selectedRow.value = null
    moduleStore.selectModule(moduleId)
  } else {
    // 바깥에서 처음 누름 → 우선 행 전체
    selectedRow.value = owner
    moduleStore.clearSelection()
  }
}

/** 이 모듈이 속한 '다단' 행 좌표 (1단이면 null — 단계 선택이 없다) */
const rowOfModule = (moduleId: string): RowRef | null => {
  const m = moduleStore.modules.find((x) => x.id === moduleId)
  if (!m?.groupId) return null
  const group = moduleStore.groups.find((g) => g.id === m.groupId)
  const rowIndex = m.rowIndex ?? 0
  if (!group?.rows || (group.rows[rowIndex] ?? 1) <= 1) return null
  return { groupId: group.id, rowIndex }
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

/** 다단 행의 한 칸(컬럼)에 쌓인 모듈들 — 그 칸 안에서만 위/아래로 옮길 수 있다 */
const canMoveInCell = (
  cell: ModuleInstance[],
  moduleId: string,
  direction: 'up' | 'down',
): boolean => {
  const i = cell.findIndex((m) => m.id === moduleId)
  if (i < 0) return false
  return direction === 'up' ? i > 0 : i < cell.length - 1
}

/** 이 모듈이 들어 있는 '다단 행의 칸'을 찾는다 (1단 행은 행 단위 이동이라 대상이 아니다) */
const findMultiColCell = (moduleId: string) => {
  const mod = modules.value.find((m) => m.id === moduleId)
  if (!mod?.groupId) return null
  const item = displayList.value.find((d) => d.type === 'group' && d.id === mod.groupId)
  if (!item || item.type !== 'group') return null
  for (const [rowIndex, row] of groupRows(item).entries()) {
    if (row.columns <= 1) continue
    for (const [columnIndex, cell] of row.cells.entries()) {
      if (cell.some((m) => m.id === moduleId)) {
        return { groupId: mod.groupId, rowIndex, columnIndex, cell }
      }
    }
  }
  return null
}

/**
 * 다단 행의 같은 칸 안에서 위/아래 이동. 행 자체는 그대로 두고 그 칸의 순서만 바꾼다.
 * @returns 이 경로로 처리했으면 true (칸의 끝이라 못 움직여도 true — 행 이동으로 넘기지 않는다)
 */
const moveWithinCell = (moduleId: string, direction: 'up' | 'down'): boolean => {
  const found = findMultiColCell(moduleId)
  if (!found) return false
  const { groupId, rowIndex, columnIndex, cell } = found
  const i = cell.findIndex((m) => m.id === moduleId)
  const to = direction === 'up' ? i - 1 : i + 1
  if (to < 0 || to >= cell.length) return true
  const ids = cell.map((m) => m.id)
  ;[ids[i], ids[to]] = [ids[to], ids[i]]
  moduleStore.reorderColumnElements(groupId, rowIndex, columnIndex, ids)
  return true
}

const moveModuleUp = (moduleId: string) => {
  if (moveWithinCell(moduleId, 'up')) return
  if (moveMemberRow(moduleId, 'up')) return
  moduleStore.moveModuleUp(moduleId)
}

const moveModuleDown = (moduleId: string) => {
  if (moveWithinCell(moduleId, 'down')) return
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

/**
 * 그룹 안에서 '행'을 끌어 옮길 수 있는가 — 행이 둘 이상일 때만.
 * 행이 하나뿐이면 위/아래 버튼이 둘 다 잠기는데 핸들만 살아 있으면 헷갈리므로
 * 드래그 핸들도 같은 조건으로 잠근다(멤버는 그룹 밖으로 나갈 수 없다).
 */
const canDragGroupRow = (item: DisplayItem): boolean => groupRows(item).length > 1

/**
 * 행 단위 호버/선택 (Figma 1125-3629).
 *
 * 2단 행은 "행 전체"와 "그 안의 열" 두 단계로 선택된다:
 *   1) 처음 누르면 행 전체가 선택되고
 *   2) 한 번 더 누르면 누른 열의 모듈이 선택된다
 *   3) 이미 선택된 열을 또 누르면 다시 행 전체로 돌아온다
 * 1단 행은 행 = 모듈이라 곧바로 모듈이 선택된다(기존 동작).
 */
type RowRef = { groupId: string; rowIndex: number }
const hoveredRow = ref<RowRef | null>(null)
const selectedRow = ref<RowRef | null>(null)

const sameRow = (a: RowRef | null, groupId: string, rowIndex: number): boolean =>
  !!a && a.groupId === groupId && a.rowIndex === rowIndex

const isRowHovered = (groupId: string, rowIndex: number): boolean =>
  sameRow(hoveredRow.value, groupId, rowIndex)
const isRowSelected = (groupId: string, rowIndex: number): boolean =>
  sameRow(selectedRow.value, groupId, rowIndex)

/**
 * 행 자체가 아니라 그 행 '안의 모듈'이 선택된 상태 — 행 경계를 회색 점선으로만 알린다.
 * (행 선택은 파란 실선이라, 지금 다루는 대상이 행인지 모듈인지 한눈에 갈린다)
 */
const isRowMemberSelected = (groupId: string, rowIndex: number): boolean => {
  if (isRowSelected(groupId, rowIndex)) return false
  const sel = moduleStore.modules.find((m) => m.id === selectedModuleId.value)
  return !!sel && sel.groupId === groupId && (sel.rowIndex ?? 0) === rowIndex
}

/**
 * 그룹 '안의 요소'를 보고 있는 그룹 id — 멤버 모듈 선택 또는 2단 행 선택.
 * 그룹 스타일 편집(보라 실선) 중에는 비운다 — 한 그룹에 두 표시가 겹치지 않도록.
 */
const memberActiveGroupId = computed(() => {
  if (selectedGroupId.value) return null
  return moduleStore.activeGroup?.id ?? selectedRow.value?.groupId ?? null
})

/** 이 행의 조작 UI(⇄)를 띄울 상태인가 — 호버 중이거나 행/열이 선택된 상태 */
const isRowVisible = (groupId: string, rowIndex: number): boolean =>
  isRowHovered(groupId, rowIndex) ||
  isRowActive({ groupId, rowIndex })

/** 행 복제 — 새로 생긴 아래 행을 이어서 선택해 둔다 */
const duplicateRow = (groupId: string, rowIndex: number): void => {
  if (moduleStore.duplicateRow(groupId, rowIndex)) {
    selectedRow.value = { groupId, rowIndex: rowIndex + 1 }
  }
}

/** 행 삭제 — 여러 모듈이 한 번에 사라지므로 확인을 받는다 */
const confirmDeleteRow = (
  groupId: string,
  rowIndex: number,
  row: GroupRowLayout<ModuleInstance>,
): void => {
  const count = row.cells.flat().filter(Boolean).length
  confirm.require({
    message: `이 행의 ${count}개 모듈이 모두 삭제됩니다. 계속하시겠습니까?`,
    header: '행 삭제 확인',
    rejectLabel: '취소',
    acceptLabel: '삭제',
    rejectClass: 'p-button-secondary',
    acceptClass: 'p-button-danger',
    accept: () => {
      moduleStore.deleteRow(groupId, rowIndex)
      selectedRow.value = null
    },
  })
}

/** 행을 그룹 안에서 한 칸 위/아래로 (다단 행은 이 단위로만 움직인다) */
const moveRow = (groupId: string, rowIndex: number, delta: number): void => {
  const item = displayList.value.find((d) => d.type === 'group' && d.id === groupId)
  if (!item || item.type !== 'group') return
  const rows = groupRows(item)
  const to = rowIndex + delta
  if (to < 0 || to >= rows.length) return
  const [moved] = rows.splice(rowIndex, 1)
  rows.splice(to, 0, moved)
  moduleStore.reorderGroupRows(groupId, rows)
  selectedRow.value = { groupId, rowIndex: to }
}

/** 지금 이 행 '안'을 보고 있는가 — 행 전체가 선택됐거나, 그 행의 열 하나가 선택된 상태 */
const isRowActive = (owner: RowRef): boolean => {
  if (isRowSelected(owner.groupId, owner.rowIndex)) return true
  const sel = moduleStore.modules.find((m) => m.id === selectedModuleId.value)
  return !!sel && sel.groupId === owner.groupId && (sel.rowIndex ?? 0) === owner.rowIndex
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
const colCellStyle = (columns: number, widthPct?: number, keepInline?: boolean): string =>
  columnCellStyle(columns, widthPct, keepInline)

// 이웃 컬럼 복제로 빈 컬럼 채우기 (같은 행)
const dupIntoColumn = (groupId: string, rowIdx: number, colIdx: number) =>
  moduleStore.duplicateIntoColumn(groupId, rowIdx, colIdx)
// 빈 컬럼을 지워 이 행을 1단으로 되돌린다 (빈 컬럼 카드의 '1단으로 변경')
const collapseRowToSingle = (groupId: string, rowIdx: number, colIdx: number) => {
  moduleStore.removeColumn(groupId, rowIdx, colIdx)
}
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
/* ===== 맨 위·맨 아래로 이동 =====
   스크롤 영역 안에 sticky로 두고, 껍데기 높이를 0으로 만들어 스크롤 길이를 늘리지 않는다.
   (absolute로 두면 스크롤과 함께 흘러가고, fixed로 두면 '모듈 순서' 패널 개폐를 따라오지 못한다) */
.canvas-jump {
  position: sticky;
  bottom: 0;
  height: 0;
  z-index: 5;
}
.canvas-jump-inner {
  position: absolute;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
/* 헤더의 아이콘 버튼(.hbtn--icon)과 같은 모양 — 40×40 흰 배경 + gray/200 테두리 */
.cj-btn {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  background: var(--white);
  color: var(--gray-400);
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;
}
.cj-btn:hover {
  background: var(--blue-50);
  color: var(--blue-400);
}
.cj-btn .material-symbols-outlined {
  font-size: 18px;
  line-height: 1;
}

/* 드래그 중인 요소의 고스트 스타일 */
.dragging-ghost {
  opacity: 0.5;
  background: var(--gray-200);
}

/* 드래그로 선택된 요소 스타일 */
.dragging-chosen {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 드래그 핸들 호버 효과 */
.dh-top:active {
  cursor: grabbing;
}

/* 그룹 내부 드래그 대상(행). 핸들이 모듈 왼쪽 바깥(-32px)에 있어서, 사용자는 자연히 그 열을
   따라 위아래로 끈다. 행 박스가 모듈 폭까지만이면 그 열에는 아무 행도 없어 SortableJS가
   드롭 대상을 찾지 못한다(아래로 끌 때 특히).
   ⚠ padding/margin으로 넓히면 **행 박스 자체가 커져서 호버·선택 파란 선이 왼쪽으로 삐져나온다.**
   그래서 가상 요소로만 히트 영역을 넓힌다 — 박스 크기는 그대로라 테두리도 제자리에 그려진다.
   (elementFromPoint는 ::before 위에서도 부모 요소를 돌려주므로 드롭 판정에는 그대로 잡힌다) */
.group-row-item {
  position: relative;
}
.group-row-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -40px;
  width: 40px;
  height: 100%;
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
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: 12px 0 0 12px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.11);
  cursor: grab;
  color: var(--gray-500);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s;
}
.module-drag-handle.is-visible {
  opacity: 1;
  pointer-events: auto;
}
/* 옮길 자리가 없는 핸들 (그룹에 행이 하나뿐) — 툴바의 잠긴 위/아래 버튼과 같은 회색으로 맞춘다.
   .dh-member 클래스를 빼서 SortableJS의 handle 선택자에도 걸리지 않는다(끌어도 안 잡힘). */
.module-drag-handle.is-disabled {
  cursor: not-allowed;
  color: var(--gray-300);
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
  background: var(--gray-800);
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
  color: var(--white);
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
  background: var(--gray-750);
  color: var(--gray-300);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.12s ease, color 0.12s ease;
}
.gtt-style-btn:not(:disabled):hover {
  background: var(--gray-700);
  color: var(--white);
}
/* 이미 이 그룹 스타일 편집 중이면 비활성 — 다른 모듈/그룹을 선택하면 다시 활성화된다 */
.gtt-style-btn:disabled {
  background: var(--gray-800);
  color: var(--gray-600);
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
  color: var(--gray-300);
  cursor: pointer;
  border-radius: 7px;
  transition: background-color 0.12s ease, color 0.12s ease;
}
.gtt-btn .material-symbols-outlined {
  font-size: 19px;
}
.gtt-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  color: var(--white);
}
/* 맨 위/맨 아래 그룹은 그 방향으로 더 못 간다 — 눌러도 소용없는 버튼을 잠근다 */
.gtt-btn:disabled {
  color: var(--gray-700);
  cursor: not-allowed;
}
.gtt-btn--danger {
  color: var(--red-400);
}
.gtt-btn--danger:hover {
  background: rgba(240, 68, 82, 0.2);
  color: var(--red-400);
}

/*
  그룹 박스: 실제 스타일(배경/보더/여백)은 인라인으로 적용된다.
  편집 화면에서 그룹 경계를 항상 인지할 수 있도록 옅은 점선 outline을 덧댄다.
  outline은 레이아웃에 영향을 주지 않으므로 내보내기 결과와 간격이 어긋나지 않는다.
*/
.group-box {
  position: relative;
  transition: outline-color 0.12s ease, background-color 0.12s ease;
}

/* 그룹 경계는 세 단계로 보여준다 (Figma 1125-3629 + 사용자 확정).
   평소엔 아예 두지 않는다 — 행 호버/선택의 파란 선과 겹쳐 읽기 어려워진다.
     · 그룹 스타일 편집 중  → 보라 실선 (지금 이 그룹 전체를 다루는 중)
     · 그룹 안 요소 선택 중 → 보라 점선 50% (선택한 요소가 이 그룹 소속이라는 표시) */
.group-box--selected,
.group-box--selected:hover {
  outline: 2px solid var(--group);
  outline-offset: -1px;
}
.group-box--member,
.group-box--member:hover {
  outline: 2px dashed rgba(192, 10, 238, 0.5);
  outline-offset: -1px;
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
  min-height: 40px;
}

/* ===== 행 호버/선택 (Figma 1125-3629) =====
   1단·2단 모두 행 전체에 파란 실선, 2단은 각 열에 파란 점선을 더한다.
   컬럼 점선을 상시 노출하지 않는 이유: 평소엔 미리보기가 실제 메일처럼 보여야 한다. */
.group-row-item {
  outline-offset: -2px;
  transition: outline-color 0.12s ease;
}
.group-row-item.row--hover,
.group-row-item.row--selected {
  outline: 2px solid var(--blue-400);
}
.row--hover.row--multi .col-cell,
.row--selected.row--multi .col-cell {
  outline: 1px dashed rgba(64, 131, 243, 0.5);
  outline-offset: -1px;
}
/* 2단 '행 전체'가 선택된 상태 — 열 안 모듈은 아직 선택 전이라 배경을 깔지 않는다 */
.group-row-item.row--selected {
  background: rgba(235, 243, 255, 0.5);
}
/* 행 안의 '모듈'이 선택된 상태 — 행 바깥 경계에만 회색 점선을 두른다.
   컬럼 칸에는 점선을 넣지 않는다: 2단이 세로로 쌓이면 칸 선이 행 선과 겹쳐 두 줄로 보인다.
   (파란 실선은 '행 자체 선택'의 표시로 남겨 둔다) */
.group-row-item.row--member:not(.row--hover) {
  outline: 1px dashed var(--gray-400);
  outline-offset: 2px;
}

/* 다단 행의 드래그 핸들 — 행 왼쪽 바깥(단독 모듈 핸들과 같은 자리).
   .module-drag-handle의 위치 규칙을 그대로 쓰되, 행 높이 기준으로 세로 가운데에 맞춘다. */
.dh-row {
  left: -32px;
}

/* 좌우 자리 바꾸기 버튼 — 행 한가운데 (Figma 1125-9661: 40px 원형, gray/800) */
.row-swap-btn {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 15;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 1000px;
  background: var(--gray-750);
  color: var(--white);
  cursor: pointer;
  transition: background 0.12s;
}
.row-swap-btn:hover {
  background: var(--gray-700);
}
.row-swap-btn .material-symbols-outlined {
  font-size: 24px;
}

/* 행 전체 선택 시 위/아래 이동 툴바 — 모듈 툴바와 같은 자리(오른쪽 바깥)·같은 모양 */
.row-toolbar {
  position: absolute;
  right: -50px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 41px;
  padding: 16px 0;
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: 12px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.07);
}
/* 모듈 툴바 버튼 모양 재사용 (ModuleRenderer의 .module-toolbar-btn과 동일 규격) */
.row-toolbar .module-toolbar-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--gray-700);
  cursor: pointer;
}
.row-toolbar .module-toolbar-btn:hover:not(:disabled) {
  background: var(--gray-100);
}
.row-toolbar .module-toolbar-btn:disabled {
  color: var(--gray-300);
  cursor: default;
}
/* 삭제는 되돌리기 어려운 동작이라 모듈 툴바와 같은 빨간색으로 구분 */
.row-toolbar .module-toolbar-btn.is-danger {
  color: var(--red-400);
}
.row-toolbar .module-toolbar-btn.is-danger:hover {
  background: var(--red-50);
}
.row-toolbar .material-symbols-outlined {
  font-size: 20px;
}

/* 빈 컬럼 placeholder (컬럼 분할 시 방식 선택) — Figma 745-8054 */
/* 빈 컬럼 자리 (Figma 934-9015): 회색 바탕 + 45° 빗금 위에 흰색 60%를 덮어 아주 옅게 깔린다 */
.empty-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 100%;
  padding: 20px 16px;
  border: 1px dashed var(--gray-300);
  border-radius: 8px;
  background-color: var(--gray-50);
  background-image: repeating-linear-gradient(
    45deg,
    rgba(107, 118, 132, 0.16) 0,
    rgba(107, 118, 132, 0.16) 1px,
    transparent 1px,
    transparent 24px
  );
}
.empty-col--target {
  border-color: var(--blue-400);
  background: var(--blue-50);
}
.empty-col__prompt {
  font-size: 18px;
  font-weight: 500;
  color: var(--gray-800);
  letter-spacing: -0.18px;
  text-align: center;
  line-height: 1.5;
}
/* '직접 구성' 대기 상태의 안내는 문장이 길어 본래 크기를 유지한다 */
.empty-col--target .empty-col__prompt {
  font-size: 15px;
  font-weight: 400;
  color: var(--gray-700);
  letter-spacing: -0.15px;
}
.empty-col__cancel {
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.14px;
  color: var(--gray-600);
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  cursor: pointer;
}
.empty-col__cancel:hover {
  background: var(--gray-100);
}
/* 방식 선택 카드 (컬럼 복제 / 직접 구성) — Figma 934-9044 */
.empty-col__cards {
  display: flex;
  gap: 10px;
}
.empty-col__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 90px;
  padding: 16px 0;
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  color: var(--gray-600);
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s, background-color 0.12s;
}
.empty-col__card:hover {
  border-color: var(--blue-400);
  color: var(--blue-400);
  background: var(--blue-50);
}
.empty-col__card .material-symbols-outlined {
  font-size: 24px;
}
.empty-col__card-label {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.14px;
}
/* 나눈 걸 되돌리는 길 — 카드 아래 밑줄 링크 (Figma 1069-14040) */
.empty-col__to-single {
  padding: 4px 10px;
  border: none;
  background: none;
  font-size: 15px;
  font-weight: 500;
  color: var(--gray-600);
  text-decoration: underline;
  cursor: pointer;
}
.empty-col__to-single:hover {
  color: var(--blue-400);
}
</style>
