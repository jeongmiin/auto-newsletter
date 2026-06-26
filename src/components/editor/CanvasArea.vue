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
            <!-- 그룹 래퍼: 박스(좌) + 세로 컨트롤 레일(우) -->
            <div
              v-if="item.type === 'group'"
              class="group-wrap"
              :class="{ 'group-wrap--selected': selectedGroupId === item.id }"
            >
              <!-- 실제 스타일 박스 (배경/테두리/여백은 내보내기와 동일) -->
              <div
                class="group-box"
                :class="{ 'group-box--selected': selectedGroupId === item.id }"
                :style="groupWrapperStyle(item.group)"
                @click.self="selectGroupBox(item.id)"
              >
                <!-- 그룹 멤버 모듈들 (그룹 내 순서는 각 모듈의 ↑↓ 버튼으로 조정) -->
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
              </div>

              <!-- 편집 전용 세로 레일 (내보내기에는 포함되지 않음) -->
              <!-- 레일 전체가 드래그 핸들(.dh-top), 버튼만 .no-drag로 드래그 제외 -->
              <div class="dh-top group-rail" title="그룹 전체를 끌어서 이동">
                <span class="group-rail__handle">
                  <i class="pi pi-bars"></i>
                  <span class="group-rail__label">그룹</span>
                </span>
                <button
                  type="button"
                  class="no-drag group-rail__btn"
                  v-tooltip.left="'그룹 복제'"
                  @click.stop="moduleStore.duplicateGroup(item.id)"
                >
                  <i class="pi pi-copy"></i>
                </button>
                <button
                  type="button"
                  class="no-drag group-rail__btn group-rail__btn--danger"
                  v-tooltip.left="'그룹 해제'"
                  @click.stop="moduleStore.ungroup(item.id)"
                >
                  <i class="pi pi-link"></i>
                </button>
                <button
                  type="button"
                  class="no-drag group-rail__btn"
                  v-tooltip.left="'그룹 스타일 편집'"
                  @click.stop="selectGroupBox(item.id)"
                >
                  <i class="pi pi-sliders-h"></i>
                </button>
                <button
                  type="button"
                  class="no-drag group-rail__btn group-rail__btn--danger"
                  v-tooltip.left="'그룹 전체 삭제'"
                  @click.stop="confirmDeleteGroup(item)"
                >
                  <i class="pi pi-trash"></i>
                </button>
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
import type { DisplayItem, ModuleGroup } from '@/types'
import { groupDivStyle, resolveGroupStyles } from '@/utils/groupStyle'

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

/*
  그룹 편집 레일 — 박스 오른쪽 바깥에 붙는 세로 컨트롤 거터(편집 화면 전용).
  박스와 겹치지 않아 각 모듈의 우상단 컨트롤과 충돌하지 않는다.
  내보내기 HTML(generateHtml)에는 포함되지 않으므로 메일에는 나타나지 않는다.
*/
.group-wrap {
  position: relative;
}

/* 우측 상단에 떠 있는 세로 컨트롤 레일 (absolute) — 박스 폭을 줄이지 않는다 */
.group-rail {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  right: -30px;
  z-index: 30;
  height: 99%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 10px 2px;
  background: #f5f3ffe6; /* purple-50, 약간 투명 */
  border: 1px solid #e9d5ff; /* purple-200 */
  border-radius: 0 8px 8px 0;
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.18);
  user-select: none;
  cursor: grab; /* 레일 전체가 드래그 영역 */
}
.group-rail:active {
  cursor: grabbing;
}

.group-wrap--selected .group-rail {
  right: -31px;
  background: #ede9fe; /* purple-100 */
  border-color: #c4b5fd; /* purple-300 */
}

.group-rail__handle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  width: 100%;
  padding: 4px 0.4rem 1rem;
  cursor: grab;
  color: #7c3aed; /* purple-600 */
}
.group-rail__handle:active {
  cursor: grabbing;
}
.group-rail__label {
  font-size: 8px;
  line-height: 1;
}

.group-rail__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #9333ea; /* purple-600 */
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.group-rail__btn:hover {
  background: #ddd6fe; /* purple-200 */
}
.group-rail__btn--danger {
  color: #ef4444;
}
.group-rail__btn--danger:hover {
  background: #fee2e2;
}
</style>
