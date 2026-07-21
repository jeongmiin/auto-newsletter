<template>
  <!-- 좌측 레일의 '모듈 순서' 메뉴에서 열리는 컨텍스트 패널 (다른 레일 패널과 동일한 셸) -->
  <div class="outline-panel">
    <div class="flex flex-col h-full">
      <!-- 헤더 -->
      <div class="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <h2 class="panel-title">
          모듈 순서
          <span class="text-sm font-normal text-gray-400">{{ modules.length }}</span>
        </h2>
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

  const ids = checkedModules.map((m) => m.id)
  // 이미 그룹인 모듈이 섞여 있으면 '병합'(각 그룹의 행 구조를 보존), 아니면 새 그룹 생성
  const hasGrouped = checkedModules.some((m) => m.groupId)
  const groupId = hasGrouped
    ? moduleStore.mergeModulesIntoGroup(ids)
    : moduleStore.createGroup(ids)
  if (groupId) {
    clearChecked()
    toast.add({
      severity: 'success',
      summary: hasGrouped ? '그룹 병합' : '그룹 생성',
      detail: hasGrouped
        ? `${ids.length}개 모듈을 한 그룹으로 병합했습니다 (각 행 구조 유지)`
        : `${ids.length}개 모듈을 한 그룹으로 묶었습니다`,
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
/* 다른 레일 컨텍스트 패널(GlobalStylePanel/CategoryModulePanel)과 동일한 셸 */
.outline-panel {
  width: var(--left-panel-width, 360px);
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e5e8eb;
  height: 100%;
  overflow: hidden;
}
.panel-title {
  font-size: 20px;
  font-weight: 500;
  color: #191f28;
  letter-spacing: -0.2px;
}

/* 드래그 중 자리 표시(ghost) 스타일 */
:deep(.outline-ghost) {
  opacity: 0.5;
  background: #eff6ff;
  border-color: #3b82f6 !important;
}
</style>
