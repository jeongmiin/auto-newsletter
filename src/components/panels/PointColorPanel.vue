<template>
  <div class="point-color-panel">
    <h2 class="panel-title">포인트색상</h2>

    <!-- 추가 버튼 (상단) — 새 포인트 색상 선택 팝오버. 색을 바꾸는 즉시 팔레트에 추가/갱신된다.
         편집 중(editingIndex≠null)이면 3개가 채워져도 팝오버가 사라지지 않도록 유지한다. -->
    <ColorPopoverPicker
      v-if="pointColors.length < 3 || editingIndex !== null"
      title="포인트 색상"
      :modelValue="draftColor"
      :pointColors="pointColors"
      :showAlpha="true"
      trigger-variant="add"
      full-picker
      @update:modelValue="onLiveChange"
      @open="onPickerOpen"
      @close="onPickerClose"
      @remove-point-color="editorStore.removePointColor($event)"
    />

    <!-- 색상 스와치 (하단 행) — 스와치 클릭 시 그 색이 담긴 편집 모달, × 클릭 시에만 삭제.
         key는 인덱스로 두어 색을 바꿔도 모달이 닫히지 않게 한다(색을 key로 쓰면 재마운트됨). -->
    <div v-if="pointColors.length" class="swatch-row">
      <div v-for="(c, i) in pointColors" :key="i" class="swatch-wrap">
        <ColorPopoverPicker
          :modelValue="c"
          :showAlpha="true"
          title="포인트 색상"
          trigger-variant="swatch"
          full-picker
          @update:modelValue="(color) => editorStore.updatePointColorAt(i, color)"
        />
        <button
          type="button"
          class="remove-btn"
          title="삭제"
          @click.stop="editorStore.removePointColor(c)"
        >
          <i class="pi pi-times"></i>
        </button>
      </div>
    </div>

    <p class="hint-text">*최대 3개까지 저장할 수 있어요.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import ColorPopoverPicker from './ColorPopoverPicker.vue'

const editorStore = useEditorStore()
const wrapSettings = computed(() => editorStore.wrapSettings)
const pointColors = computed(() => wrapSettings.value.pointColors ?? [])

// 추가 모달에서 편집 중인 색(미리보기용) — 팔레트/그라디언트/HEX에서 고르는 즉시 반영된다
const draftColor = ref('#2563eb')
// 추가 모달로 지금 편집 중인 포인트 색상 슬롯 인덱스(null = 아직 추가 전)
const editingIndex = ref<number | null>(null)

// 색을 바꾸면 즉시 팔레트에 반영 — 첫 변경은 새 슬롯으로 추가, 이후 변경은 그 슬롯을 갱신(무한 증가 방지)
const onLiveChange = (color: string) => {
  draftColor.value = color
  if (editingIndex.value === null) {
    editingIndex.value = editorStore.appendPointColor(color)
  } else {
    editorStore.updatePointColorAt(editingIndex.value, color)
  }
}

// 모달 열릴 때: 새 편집 세션 시작 (아직 추가 전)
const onPickerOpen = () => {
  editingIndex.value = null
}
// 모달 닫힐 때: 편집 세션 종료(추가된 색은 그대로 유지)
const onPickerClose = () => {
  editingIndex.value = null
  draftColor.value = '#2563eb'
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
/* 스와치 = ColorPopoverPicker(swatch 트리거)를 감싸는 래퍼. × 버튼 위치 기준(position: relative). */
.swatch-wrap {
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
}
.remove-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  color: #fff;
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.remove-btn i{font-size: 10px;}
.swatch-wrap:hover .remove-btn {
  display: flex;
}
/* .hint-text 는 panels.css 공용 클래스로 옮겼다 (패널 공통 힌트 문구) */
</style>
