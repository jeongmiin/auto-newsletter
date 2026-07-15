<template>
  <nav class="editor-rail">
    <template v-for="(item, i) in items" :key="item.key">
      <!-- 구분선 -->
      <div v-if="item.divider" class="rail-divider"></div>
      <button
        v-else
        type="button"
        class="rail-item"
        :class="{ 'is-active': activeMenu === item.key }"
        @click="select(item.key)"
        v-tooltip.right="item.label"
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

type MenuKey = 'style' | 'point' | 'modules' | 'text' | 'image' | 'button' | 'table' | 'ai' | 'order'

const editorStore = useEditorStore()
const { activeMenu } = storeToRefs(editorStore)

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
  { key: 'order', label: '모듈 순서', icon: 'format_list_numbered' },
])

const select = (key: MenuKey) => editorStore.setActiveMenu(key)
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
