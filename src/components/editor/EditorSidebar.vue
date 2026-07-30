<template>
  <nav class="editor-rail">
    <template v-for="(item, i) in items" :key="item.key">
      <!-- 구분선 -->
      <div v-if="item.divider" class="rail-divider"></div>
      <button
        v-else
        type="button"
        class="rail-item"
        :class="{ 'is-active': activeMenu === item.key && !hasSelection }"
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

type MenuKey = 'style' | 'point' | 'modules' | 'text' | 'image' | 'button' | 'table' | 'ai' | 'order'

const editorStore = useEditorStore()
const moduleStore = useModuleStore()
const { activeMenu } = storeToRefs(editorStore)

// 캔버스에서 모듈/그룹을 편집 중(속성 패널 노출)이면 어떤 레일 메뉴도 활성 표시하지 않는다.
// AppLayout의 패널 전환 조건과 동일 — 캔버스 빈 영역 클릭으로 선택이 풀리면 직전 메뉴가 다시 is-active 된다.
const hasSelection = computed(
  () => (!!moduleStore.selectedModuleId || !!moduleStore.selectedGroupId) && !editorStore.forceRailPanel,
)

// 레일 메뉴 (Figma node 316-2071 순서/아이콘 기준, Material Symbols)
const items = computed<Array<{ key: MenuKey; label: string; icon: string; divider?: boolean }>>(() => [
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
const select = (key: MenuKey) => {
  editorStore.setActiveMenu(key)
}
</script>

<style scoped>
.editor-rail {
  width: 80px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e5e8eb;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 16px 6px;
  overflow-y: auto;
}
.rail-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
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
.rail-icon {
  font-size: 24px;
  line-height: 1;
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
