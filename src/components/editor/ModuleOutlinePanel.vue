<template>
  <!-- 항상 자리를 차지하는 얇은 레일 (w-10) — 펼친 패널은 이 위로 떠오른다 -->
  <div class="relative flex-shrink-0 w-10 bg-white border-r">
    <!-- 접힌 레일: 펼치기 버튼 + 세로 라벨 -->
    <div
      class="h-full flex flex-col items-center gap-3 cursor-pointer"
      title="목차 펼치기"
      @click="toggleCollapsed"
    >
    <div class="group py-3.5 w-full bg-gray-100 text-center transition-colors">
      <i class="pi pi-angle-double-right text-gray-400 group-hover:text-blue-500 transition-colors" @click.stop="toggleCollapsed"></i>
    </div>
      <span class="text-xs font-bold text-blue-500">{{ modules.length }}</span>
      <span class="text-[10px] text-gray-400 [writing-mode:vertical-rl]">모듈 목차</span>
    </div>

    <!-- 펼쳐졌을 때: 캔버스 위로 떠오르는 플로팅 패널 -->
    <div
      v-if="!collapsed"
      class="absolute top-0 left-0 h-full w-60 z-30 flex flex-col bg-white border-r shadow-2xl"
    >
      <!-- 헤더 -->
      <div class="flex items-center justify-between px-2 py-2 bg-gray-100 flex-shrink-0">
        <span class="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <i class="pi pi-list text-gray-500"></i>
          모듈 목차
          <span class="text-xs font-normal text-gray-400">{{ modules.length }}</span>
        </span>
        <button
          class="p-1 leading-7 text-gray-400 hover:text-blue-500 transition-colors"
          title="목차 접기"
          @click="toggleCollapsed"
        >
          <i class="pi pi-angle-double-left"></i>
        </button>
      </div>

      <div v-if="modules.length === 0" class="text-center text-gray-500 py-10 px-2 text-xs flex-1">
        추가된 모듈이 없습니다.
      </div>

      <template v-else>
        <!-- 그룹 묶기 툴바 -->
        <div class="px-2 py-1.5 border-t bg-gray-50 flex items-center gap-2 flex-shrink-0">
          <Button
            :label="`그룹 묶기 (${checkedCount})`"
            icon="pi pi-objects-column"
            size="small"
            severity="contrast"
            class="flex-1 !text-xs"
            :disabled="checkedCount < 1"
            @click="groupChecked"
          />
          <Button
            v-if="checkedCount > 0"
            icon="pi pi-times"
            size="small"
            severity="secondary"
            text
            v-tooltip.bottom="'선택 해제'"
            @click="clearChecked"
          />
        </div>

        <!-- 표시 리스트 (그룹은 한 덩어리로 이동) -->
        <draggable
          v-model="displayList"
          item-key="id"
          handle=".outline-handle"
          ghost-class="outline-ghost"
          animation="180"
          class="flex-1 overflow-y-auto p-1 flex flex-col gap-1 border-t"
        >
          <template #item="{ element: item }">
           <div>
            <!-- 그룹 -->
            <div
              v-if="item.type === 'group'"
              class="rounded border"
              :class="
                selectedGroupId === item.id
                  ? 'border-purple-400 bg-purple-50/60'
                  : 'border-purple-200 bg-purple-50/30'
              "
            >
              <!-- 그룹 헤더 -->
              <div
                class="flex items-center gap-1.5 px-1.5 py-1 cursor-pointer"
                @click="selectGroupRow(item.id)"
              >
                <i
                  class="pi pi-bars outline-handle cursor-grab text-purple-300 hover:text-purple-600 text-xs"
                  title="그룹 전체 순서 변경"
                  @click.stop
                ></i>
                <i class="pi pi-objects-column text-purple-500 !text-xs"></i>
                <span class="flex-1 text-[11px] font-semibold text-purple-700 truncate">
                  그룹 · {{ item.modules.length }}개
                </span>
                <button
                  class="p-0.5 text-purple-400 hover:text-red-500 transition-colors"
                  title="그룹 해제"
                  @click.stop="moduleStore.ungroup(item.id)"
                >
                  <i class="pi pi-link text-xs"></i>
                </button>
              </div>

              <!-- 그룹 멤버 -->
              <div class="pl-2 pb-1 flex flex-col gap-1">
                <div
                  v-for="member in item.modules"
                  :key="member.id"
                  class="outline-row group flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer border transition-colors"
                  :class="
                    selectedModuleId === member.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                  "
                  @click="select(member.id)"
                  @mouseenter="setHover(member.id)"
                  @mouseleave="setHover(null)"
                >
                  <Checkbox
                    :modelValue="isChecked(member.id)"
                    :binary="true"
                    @update:modelValue="toggleChecked(member.id)"
                    @click.stop
                  />
                  <span class="w-4 text-center text-xs font-semibold text-blue-500 flex-shrink-0">{{
                    member.order + 1
                  }}</span>
                  <span class="flex-1 text-xs text-gray-700 truncate">{{ moduleName(member) }}</span>
                </div>
              </div>
            </div>

            <!-- 단독 모듈 -->
            <div
              v-else
              class="outline-row group flex items-center gap-1.5 px-1.5 py-1.5 rounded cursor-pointer border transition-colors"
              :class="
                selectedModuleId === item.module.id
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
              "
              @click="select(item.module.id)"
              @mouseenter="setHover(item.module.id)"
              @mouseleave="setHover(null)"
            >
              <Checkbox
                :modelValue="isChecked(item.module.id)"
                :binary="true"
                @update:modelValue="toggleChecked(item.module.id)"
                @click.stop
              />
              <i
                class="pi pi-bars outline-handle cursor-grab text-gray-300 hover:text-blue-500 text-xs"
                title="끌어서 순서 변경"
                @click.stop
              ></i>
              <span class="w-4 text-center text-xs font-semibold text-blue-500 flex-shrink-0">{{
                item.module.order + 1
              }}</span>
              <span class="flex-1 text-xs text-gray-700 truncate">{{ moduleName(item.module) }}</span>
            </div>
           </div>
          </template>
        </draggable>
      </template>

      <!-- 안내 문구 -->
      <p class="px-2 py-1.5 border-t text-[12px] leading-relaxed text-gray-500 flex-shrink-0 break-keep">
        체크박스로 선택 후 <b>그룹 묶기</b>를 누르면 한 묶음이 됩니다(1개도 가능). 그룹은 통째로 드래그·이동되고, 묶음 배경·테두리·여백을 줄 수 있습니다.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import draggable from 'vuedraggable'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { useToast } from 'primevue/usetoast'
import type { ModuleInstance, DisplayItem } from '@/types'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()
const toast = useToast()

// 기본값은 접힘 — 사용자가 '0'(펼침)으로 저장한 경우에만 펼친 상태로 시작
const COLLAPSE_KEY = 'moduleOutlineCollapsed'
const collapsed = ref(localStorage.getItem(COLLAPSE_KEY) !== '0')

const toggleCollapsed = (): void => {
  collapsed.value = !collapsed.value
  localStorage.setItem(COLLAPSE_KEY, collapsed.value ? '1' : '0')
}

const modules = computed(() => moduleStore.modules)
const selectedModuleId = computed(() => moduleStore.selectedModuleId)
const selectedGroupId = computed(() => moduleStore.selectedGroupId)

// 드래그 정렬 대상 — 그룹은 한 덩어리(displayItem)로 이동
const displayList = computed<DisplayItem[]>({
  get: () => moduleStore.displayItems,
  set: (value) => moduleStore.setDisplayOrder(value),
})

// ===== 체크박스 다중선택 (그룹 묶기용) =====
const checkedIds = ref<Set<string>>(new Set())
const checkedCount = computed(() => {
  // 현재 존재하는 모듈만 카운트 (삭제된 모듈 잔여 방지)
  return modules.value.filter((m) => checkedIds.value.has(m.id)).length
})

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
  const checkedModules = modules.value.filter((m) => checkedIds.value.has(m.id))
  if (checkedModules.length < 1) return

  // 이미 그룹에 속한 모듈이 포함되면 안내 후 중단 (기존 그룹 해제 필요)
  if (checkedModules.some((m) => m.groupId)) {
    toast.add({
      severity: 'warn',
      summary: '그룹 생성 불가',
      detail: '이미 그룹인 모듈이 있습니다. 그룹을 해제 후 새 그룹으로 적용해주세요.',
      life: 4000,
    })
    return
  }

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

// 모듈 인스턴스의 표시 이름 (메타데이터에서 조회)
const moduleName = (instance: ModuleInstance): string => {
  const meta = moduleStore.availableModules.find((m) => m.id === instance.moduleId)
  return meta?.name || instance.moduleId
}

const select = (moduleId: string): void => {
  moduleStore.selectModule(moduleId)
}

const setHover = (moduleId: string | null): void => {
  editorStore.setHoveredModuleId(moduleId)
}
</script>

<style scoped>
/* 드래그 중 자리 표시(ghost) 스타일 */
:deep(.outline-ghost) {
  opacity: 0.5;
  background: #eff6ff;
  border-color: #3b82f6 !important;
}
</style>
