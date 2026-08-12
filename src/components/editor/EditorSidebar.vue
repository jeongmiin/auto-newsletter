<template>
  <nav class="editor-rail">
    <!-- 구분선 항목이 뒤따르는 메뉴와 같은 key를 쓰므로(예: 'point' 2개) 인덱스를 key로 쓴다 -->
    <template v-for="(item, i) in items" :key="i">
      <!-- 구분선 -->
      <div v-if="item.divider" class="rail-divider"></div>
      <button
        v-else
        type="button"
        class="rail-item"
        :class="{ 'is-active': isActive(item.key), 'is-accent': item.accent }"
        @click="select(item.key)"
      >
        <span class="material-symbols-outlined rail-icon">{{ item.icon }}</span>
        <span class="rail-label">{{ item.label }}</span>
      </button>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editorStore'
import { useModuleStore } from '@/stores/moduleStore'
import { useBlankTemplate } from '@/composables/useBlankTemplate'

type MenuKey = 'style' | 'point' | 'modules' | 'text' | 'image' | 'button' | 'table' | 'ai'
// 좌측 패널을 전환하지 않는 별도 동작들 —
// 'order'는 캔버스 오른쪽 패널을 여닫고, 'blank'는 확인 후 작업 영역을 비운다.
type RailKey = MenuKey | 'order' | 'blank'

const editorStore = useEditorStore()
const moduleStore = useModuleStore()
const { activeMenu, isOrderPanelOpen } = storeToRefs(editorStore)
const { confirmBlankTemplate } = useBlankTemplate()

// 캔버스에서 모듈/그룹을 편집 중(속성 패널 노출)이면 어떤 레일 메뉴도 활성 표시하지 않는다.
// AppLayout의 패널 전환 조건과 동일 — 캔버스 빈 영역 클릭으로 선택이 풀리면 직전 메뉴가 다시 is-active 된다.
const hasSelection = computed(
  () => (!!moduleStore.selectedModuleId || !!moduleStore.selectedGroupId) && !editorStore.forceRailPanel,
)

// 레일 메뉴 (Figma node 316-2071 순서/아이콘 기준, Material Symbols)
// '빈 템플릿'(1125-2964)은 메뉴가 아니라 액션이라 선택 표시를 하지 않고 상시 강조색으로 둔다.
const items = computed<
  Array<{ key: RailKey; label: string; icon: string; divider?: boolean; accent?: boolean }>
>(() => [
  { key: 'blank', label: '빈 템플릿', icon: 'note_add', accent: true },
  { key: 'blank', label: '', icon: '', divider: true },
  { key: 'style', label: '전체 스타일', icon: 'design_services' },
  { key: 'point', label: '포인트 색상', icon: 'palette' },
  { key: 'point', label: '', icon: '', divider: true },
  { key: 'modules', label: '모듈', icon: 'dashboard' },
  { key: 'modules', label: '', icon: '', divider: true },
  { key: 'text', label: '텍스트', icon: 'text_fields' },
  { key: 'image', label: '이미지', icon: 'add_photo_alternate' },
  { key: 'button', label: '버튼', icon: 'ads_click' },
  { key: 'table', label: '테이블', icon: 'border_all' },
  { key: 'table', label: '', icon: '', divider: true },
  { key: 'ai', label: 'AI 도구', icon: 'auto_awesome' },
  { key: 'ai', label: '', icon: '', divider: true },
  { key: 'order', label: '모듈 순서', icon: '123' },
])

// setActiveMenu가 forceRailPanel을 켜서, 캔버스에 선택된 모듈/그룹이 남아있어도
// 좌측 패널은 이 레일 메뉴를 그대로 보여준다(선택 자체는 유지 — 그룹 멤버 선택 중 카테고리 메뉴에서
// 원소 모듈을 추가하면 그 그룹에 삽입되는 흐름이 끊기지 않도록). 새로 선택이 바뀌면
// moduleStore의 감시 로직이 forceRailPanel을 자동으로 꺼서 속성 패널로 되돌아간다.
const select = (key: RailKey) => {
  // '모듈 순서'는 좌측 패널을 그대로 둔 채 캔버스 오른쪽 패널만 여닫는다.
  if (key === 'order') {
    editorStore.toggleOrderPanel()
    return
  }
  // '빈 템플릿'은 패널 전환이 아니라 확인 후 작업 영역을 비우는 액션이다.
  if (key === 'blank') {
    confirmBlankTemplate()
    return
  }
  editorStore.setActiveMenu(key)
}

const isActive = (key: RailKey): boolean => {
  if (key === 'order') return isOrderPanelOpen.value
  if (key === 'blank') return false // 선택 상태가 없는 액션
  return activeMenu.value === key && !hasSelection.value
}
</script>

<style scoped>
/* Figma 1125-2995: 폭 80 · 좌우 6 · 첫 항목까지 37 · 항목/구분선 간격 일정하게 25 */
.editor-rail {
  width: 80px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e5e8eb;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 25px;
  padding: 37px 6px;
  overflow-y: auto;
}
/* 항목 68×60 (아이콘 24 + 5 + 라벨 12), 위아래 8 여백 */
.rail-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 8px 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.rail-item:hover {
  background: #f6f8fa;
}
.rail-item.is-active {
  background: rgba(235, 243, 255, 0.8);
  color: #2563d4;
}
.rail-item.is-accent .rail-icon {
  font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
.rail-icon {
  font-size: 24px;
  line-height: 1;
}
/* '빈 템플릿' — 선택되는 메뉴가 아니라 액션이라 항상 강조색.
   Figma 1125-2964: 아이콘 34px, 라벨 12px, blue/500 (#2563d4) */
.rail-item.is-accent {
  color: #2563d4;
  gap: 5px;
}

.rail-item.is-accent:hover {
  background: rgba(235, 243, 255, 0.8);
}
.rail-label {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  text-align: center;
  word-break: keep-all;
}
.rail-divider {
  width: 12px;
  height: 1px;
  background: #e5e8eb;
  flex-shrink: 0;
}
</style>
