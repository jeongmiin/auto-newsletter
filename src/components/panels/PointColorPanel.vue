<template>
  <div class="point-color-panel">
    <h2 class="panel-title">포인트색상</h2>

    <div class="swatch-row">
      <!-- 추가 버튼: 새 포인트 색상 선택 팝오버 -->
      <ColorPopoverPicker
        v-if="pointColors.length < 3"
        title="포인트 색상 추가"
        :modelValue="draftColor"
        :pointColors="pointColors"
        :showAlpha="false"
        trigger-variant="add"
        @update:modelValue="draftColor = $event"
        @add-point-color="onAdd"
        @remove-point-color="editorStore.removePointColor($event)"
      />

      <!-- 기존 스와치 (최대 3개) — 클릭 시 활성화, 호버 시 삭제 -->
      <div
        v-for="c in pointColors"
        :key="c"
        class="swatch-wrap"
        :class="{ 'is-active': c === wrapSettings.pointColor }"
        :style="{ backgroundColor: c }"
        :title="c"
        @click="editorStore.setActivePointColor(c)"
      >
        <button
          v-if="pointColors.length > 1"
          type="button"
          class="remove-btn"
          title="삭제"
          @click.stop="editorStore.removePointColor(c)"
        >
          <i class="pi pi-times"></i>
        </button>
      </div>
    </div>

    <p class="hint-text">최대 3개까지 저장할 수 있어요. 클릭하면 활성 포인트 색상으로 지정됩니다.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import ColorPopoverPicker from './ColorPopoverPicker.vue'

const editorStore = useEditorStore()
const wrapSettings = computed(() => editorStore.wrapSettings)
const pointColors = computed(() => wrapSettings.value.pointColors ?? [])

// "+" 팝오버는 빈 상태에서 시작 — 사용자가 팔레트/헥사에서 고르는 즉시 추가+활성화한다
const draftColor = ref('#2563eb')

const onAdd = (color: string) => {
  editorStore.addPointColor(color)
  editorStore.setActivePointColor(color)
}
</script>

<style scoped>
.point-color-panel {
  width: var(--left-panel-width, 360px);
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e5e8eb;
  height: 100%;
  overflow-y: auto;
  padding: 24px 23px 29px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.panel-title {
  font-size: 20px;
  font-weight: 500;
  color: #191f28;
  letter-spacing: -0.2px;
}
.swatch-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.swatch-wrap {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
}
.swatch-wrap.is-active {
  border-color: #4083f3;
}
.remove-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #191f28;
  color: #fff;
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  cursor: pointer;
}
.swatch-wrap:hover .remove-btn {
  display: flex;
}
.hint-text {
  font-size: 13px;
  color: #8b95a1;
}
</style>
