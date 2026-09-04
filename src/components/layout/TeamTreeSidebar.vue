<script setup lang="ts">
/**
 * 좌측 본부·팀 트리 — 템플릿 선택과 폴더 선택이 같은 메뉴를 나눠 쓴다.
 *
 * 맨 윗칸은 부모가 문구를 주었을 때만 그린다(템플릿 선택: '전체' 필터 / 폴더 선택: 없음).
 * 문구·눌린 상태는 부모가 정하고, 여기서는 눌렸다는 것만 알린다.
 *
 * 폐지된 조직(active: false)은 트리에서 감춘다. 정의는 지우지 않으므로 그 팀의 옛 템플릿은
 * '전체'에서 계속 보이고, 저장된 teamId도 여전히 이름을 찾을 수 있다.
 */
import { computed, reactive } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'

withDefaults(
  defineProps<{
    /** 고른 팀 id — ''면 아직 아무 팀도 고르지 않은 상태 */
    modelValue: string
    /** 맨 윗칸 문구 — 없으면 맨 윗칸 자체를 그리지 않는다 */
    topLabel?: string
    /** 맨 윗칸을 눌린 상태로 보일지 */
    topActive?: boolean
    /** 팀을 눌러 고를 수 있는지 — 끄면 지금 팀이 어디인지 보여주기만 한다 */
    selectable?: boolean
  }>(),
  { topLabel: '', topActive: false, selectable: true },
)

const emit = defineEmits<{
  'update:modelValue': [string]
  top: []
}>()

const moduleStore = useModuleStore()

const departments = computed(() =>
  moduleStore.availableDepartments
    .filter((d) => d.active !== false)
    .map((d) => ({ ...d, teams: d.teams.filter((t) => t.active !== false) }))
    .filter((d) => d.teams.length > 0),
)

// 부서 접기/펼치기 — 기본 펼침(기록에 없으면 열린 것으로 본다).
// 트리를 비동기로 받아오므로 목록을 미리 채우지 않는다.
const openDepts = reactive<Record<string, boolean>>({})
const isOpen = (deptId: string) => openDepts[deptId] !== false
const toggle = (deptId: string) => {
  openDepts[deptId] = !isOpen(deptId)
}
</script>

<template>
  <aside class="team-nav">
    <button
      v-if="topLabel"
      type="button"
      class="team-nav-item team-nav-item--top"
      :class="{ 'is-active': topActive }"
      @click="emit('top')"
    >
      {{ topLabel }}
    </button>

    <div v-for="dept in departments" :key="dept.id" class="team-nav-dept">
      <button type="button" class="team-nav-dept-head" @click="toggle(dept.id)">
        <span>{{ dept.name }}</span>
        <i
          class="pi text-xs text-gray-400"
          :class="isOpen(dept.id) ? 'pi-angle-down' : 'pi-angle-right'"
        ></i>
      </button>
      <div v-show="isOpen(dept.id)" class="team-nav-list">
        <button
          v-for="team in dept.teams"
          :key="team.id"
          type="button"
          class="team-nav-item"
          :class="{ 'is-active': modelValue === team.id, 'is-locked': !selectable }"
          :disabled="!selectable"
          @click="emit('update:modelValue', team.id)"
        >
          {{ team.name }}
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.team-nav {
  width: 225px;
  flex-shrink: 0;
  border-right: 1px solid #f5f5f5;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 25px;
  overflow-y: auto;
}
.team-nav-dept {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.team-nav-dept-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 7px 20px;
  font-size: 16px;
  font-weight: 500;
  color: var(--gray-800);
  letter-spacing: -0.16px;
  background: none;
  border: 0;
  cursor: pointer;
}
.team-nav-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.team-nav-item {
  display: flex;
  align-items: center;
  gap: 4px;
  text-align: left;
  width: 100%;
  padding: 7px 20px;
  font-size: 16px;
  font-weight: 400;
  color: var(--gray-600);
  letter-spacing: -0.16px;
  background: none;
  border: 0;
  border-radius: 25px;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.team-nav-item:hover {
  background: var(--gray-50);
}
.team-nav-item--top {
  font-weight: 500;
  color: var(--gray-800);
}
.team-nav-item.is-active {
  position: relative;
  background: var(--blue-50);
  color: var(--gray-800);
  font-weight: 500;
}
.team-nav-item.is-active::before {
  content: '';
  display: block;
  width: 5px;
  height: 100%;
  background-color: var(--p-primary-500);
  position: absolute;
  top: 0;
  left: -16px;
  border-radius: 0 5px 5px 0;
}
/* 고를 수 없는 상태 — 지금 팀이 어디인지 보여주기만 한다(흐리게 하지 않는다) */
.team-nav-item.is-locked {
  cursor: default;
}
.team-nav-item.is-locked:hover {
  background: none;
}
.team-nav-item.is-locked.is-active:hover {
  background: var(--blue-50);
}
</style>
