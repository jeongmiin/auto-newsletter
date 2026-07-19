<template>
  <div class="selected-item-panel">
    <template v-if="activeGroup">
      <div class="p-3 border-b">
        <h2 class="text-lg font-semibold text-gray-800">{{ activeGroup?.name || '그룹 구성' }}</h2>
        <!-- 삽입 위치는 "그룹 자체 선택"이냐 "멤버 드릴다운"이냐로 갈리는데 화면에 표시가 없어 혼란스러웠다 -->
        <p v-if="isGroupItselfSelected" class="text-xs text-purple-600 mt-0.5">
          그룹 전체 선택됨 — 모듈을 추가하면 이 그룹 <b>아래</b>에 추가됩니다
        </p>
        <p v-else class="text-xs text-gray-400 mt-0.5">
          모듈을 추가하면 이 그룹 <b>안</b>에 추가됩니다 (그룹 아래에 넣으려면 캔버스 왼쪽 그룹 툴바의 ⣿ 핸들을 누르세요)
        </p>
      </div>

      <div class="flex-1 overflow-y-auto overflow-x-hidden">
        <!-- 그룹 멤버 목록 (v2: 토글 대신 삭제로 비노출 제어) -->
        <div class="member-list">
          <div v-for="member in members" :key="member.id" class="member-row-wrap">
            <div class="member-row" :class="{ 'is-expanded': member.id === expandedMemberId }">
              <button type="button" class="member-row-main" @click="toggleMember(member.id)">
                <i
                  class="pi member-chevron"
                  :class="member.id === expandedMemberId ? 'pi-chevron-down' : 'pi-chevron-right'"
                ></i>
                <span class="member-label">{{ memberLabel(member) }}</span>
              </button>
              <button
                type="button"
                class="member-remove"
                title="삭제(비노출)"
                @click.stop="removeMember(member.id)"
              >
                <i class="pi pi-trash"></i>
              </button>
            </div>
            <!-- 인라인 아코디언: 펼쳐진 멤버만 그 자리에서 ModuleForm 렌더 -->
            <div v-if="member.id === expandedMemberId" class="member-form">
              <ModuleForm />
            </div>
          </div>
        </div>

        <!-- 그룹 자체 스타일(배경/테두리/여백) + 그룹 해제 — 기존 컴포넌트 재사용 -->
        <div class="pt-3 border-t border-gray-100">
          <GroupPropertiesPanel />
        </div>
      </div>
    </template>

    <!-- 그룹에 속하지 않은 단독 모듈: 기존 폼 그대로 -->
    <template v-else-if="selectedModule">
      <div class="p-3 border-b">
        <h2 class="font-medium text-sm truncate">{{ selectedModuleMetadata?.name }}</h2>
      </div>
      <div class="flex-1 overflow-y-auto overflow-x-hidden">
        <ModuleForm />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import GroupPropertiesPanel from './GroupPropertiesPanel.vue'
import ModuleForm from './ModuleForm.vue'

const moduleStore = useModuleStore()

const selectedModule = computed(() => moduleStore.selectedModule)
const selectedModuleMetadata = computed(() => moduleStore.selectedModuleMetadata)

// 그룹이 직접 선택됐거나, 그 그룹의 멤버 하나가 선택된 상태(드릴다운) 둘 다 "그룹 뷰"로 취급한다.
// (같은 로직을 GroupPropertiesPanel/CanvasArea도 쓰므로 store getter로 승격해 공유)
const activeGroup = computed(() => moduleStore.activeGroup)

// 그룹 '자체'가 선택된 상태인지 — 멤버 드릴다운과 구분해 삽입 위치 안내 문구를 바꾼다.
const isGroupItselfSelected = computed(() => !!moduleStore.selectedGroup)

const members = computed(() => {
  const group = activeGroup.value
  if (!group) return []
  return moduleStore.modules.filter((m) => m.groupId === group.id).sort((a, b) => a.order - b.order)
})

// 현재 인라인으로 펼쳐진 멤버 — 실제 전역 선택(selectedModuleId)을 그대로 "펼침 상태"로 재사용한다.
const expandedMemberId = computed(() =>
  selectedModule.value?.groupId === activeGroup.value?.id ? (selectedModule.value?.id ?? null) : null,
)

const memberLabel = (member: { moduleId: string }): string =>
  moduleStore.availableModules.find((m) => m.id === member.moduleId)?.name ?? member.moduleId

const toggleMember = (memberId: string): void => {
  if (expandedMemberId.value === memberId) {
    // 다시 접기 — 그룹 레벨 뷰로 복귀
    if (activeGroup.value) moduleStore.selectGroup(activeGroup.value.id)
    return
  }
  moduleStore.selectModule(memberId)
}

const removeMember = (memberId: string): void => {
  moduleStore.removeModule(memberId)
}
</script>

<style scoped>
.selected-item-panel {
  width: 360px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e5e8eb;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.member-list {
  padding: 8px 12px 0;
}
.member-row-wrap {
  border-bottom: 1px solid #f2f4f6;
}
.member-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}
.member-row-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 4px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}
.member-chevron {
  font-size: 12px;
  color: #8b95a1;
  flex-shrink: 0;
}
.member-label {
  font-size: 15px;
  font-weight: 500;
  color: #333d4b;
}
.member-remove {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: #b0b8c1;
  cursor: pointer;
  border-radius: 6px;
}
.member-remove:hover {
  color: #f04452;
  background: #fff1f1;
}
.member-form {
  padding: 0 0 12px;
}
</style>
