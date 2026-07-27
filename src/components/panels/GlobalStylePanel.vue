<template>
  <div class="global-style-panel">
    <h2 class="panel-title">전체 스타일</h2>

    <!-- 배경 색상 -->
    <div class="row-between">
      <span class="row-label">배경 색상</span>
      <ColorPopoverPicker
        title="배경 색상"
        :modelValue="wrapSettings.backgroundColor"
        :pointColors="wrapSettings.pointColors"
        @update:modelValue="update('backgroundColor', $event)"
        @add-point-color="editorStore.addPointColor($event)"
        @remove-point-color="editorStore.removePointColor($event)"
      />
    </div>

    <div class="divider"></div>

    <!-- 폰트(언어) -->
    <div class="flex flex-col gap-2">
      <span class="row-label">폰트</span>
      <Select
        :modelValue="wrapSettings.fontLanguage ?? 'default'"
        @update:modelValue="update('fontLanguage', $event ?? 'default')"
        :options="fontLanguageOptions"
        optionLabel="label"
        optionValue="value"
        class="w-full text-sm"
      />
      <p class="hint-text">선택한 언어에 맞는 폰트로 모든 모듈을 일괄 적용합니다</p>
    </div>

    <div class="divider"></div>

    <!-- 테두리 -->
    <div class="row-between">
      <span class="row-label">테두리</span>
      <ToggleSwitch :modelValue="!!wrapSettings.borderEnabled" @update:modelValue="update('borderEnabled', $event)" />
    </div>

    <div v-if="wrapSettings.borderEnabled" class="flex flex-col gap-[30px]">
      <!-- 스타일 라디오 -->
      <div class="flex flex-col gap-[10px]">
        <span class="sub-label">스타일</span>
        <div class="flex flex-col gap-[18px]">
          <label v-for="opt in borderStyleOptions" :key="opt.value" class="radio-row">
            <span class="radio-dot" :class="{ 'is-checked': wrapSettings.borderStyle === opt.value }" @click="update('borderStyle', opt.value)"></span>
            <span class="radio-label" @click="update('borderStyle', opt.value)">{{ opt.label }}</span>
            <span class="radio-preview" :style="{ borderTop: `4px ${opt.value} #333d4b` }"></span>
          </label>
        </div>
      </div>

      <!-- 색상 -->
      <div class="row-between">
        <span class="sub-label">색상</span>
        <ColorPopoverPicker
          title="테두리 색상"
          :modelValue="wrapSettings.borderColor"
          :pointColors="wrapSettings.pointColors"
          @update:modelValue="update('borderColor', $event)"
          @add-point-color="editorStore.addPointColor($event)"
          @remove-point-color="editorStore.removePointColor($event)"
        />
      </div>

      <!-- 두께 -->
      <div class="flex flex-col gap-[10px]">
        <span class="sub-label">두께</span>
        <div class="flex items-center justify-between gap-3">
          <input
            type="range"
            min="0"
            max="20"
            :value="borderWidthNum"
            @input="onWidthSlideEvent"
            class="range-slider flex-1"
          />
          <div class="width-field">
            <input
              type="number"
              min="0"
              max="99"
              :value="borderWidthNum"
              @input="onWidthSlide(($event.target as HTMLInputElement).valueAsNumber)"
            />
            <span class="unit">px</span>
          </div>
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <!-- 뉴스레터 요약 -->
    <div class="flex flex-col gap-[10px]">
      <span class="row-label">뉴스레터 요약</span>
      <input
        type="text"
        class="summary-field"
        :value="wrapSettings.summary ?? ''"
        @input="onSummaryInput"
        placeholder="전시 뉴스레터입니다."
      />
    </div>
    <p class="hint-text -mt-3">*검색 엔진과 스크린 리더를 위한 한 줄 설명입니다.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { normalizePxLength } from '@/utils/cssUnit'
import { FONT_LANGUAGE_OPTIONS } from '@/utils/fontFamily'
import ColorPopoverPicker from './ColorPopoverPicker.vue'

const editorStore = useEditorStore()
const wrapSettings = computed(() => editorStore.wrapSettings)
const fontLanguageOptions = FONT_LANGUAGE_OPTIONS

// Figma node 328-2674 "스타일" 라디오 — '없음'은 상단 테두리 토글로 대체
const borderStyleOptions = [
  { label: '실선', value: 'solid' },
  { label: '점선', value: 'dotted' },
  { label: '파선', value: 'dashed' },
  { label: '이중선', value: 'double' },
]

const borderWidthNum = computed(() => parseInt(wrapSettings.value.borderWidth, 10) || 0)

const update = <K extends keyof typeof wrapSettings.value>(key: K, value: (typeof wrapSettings.value)[K]) => {
  editorStore.updateWrapSettings({ [key]: value } as Partial<typeof wrapSettings.value>)
}

const onWidthSlide = (value: number) => {
  const n = Number.isNaN(value) ? 0 : Math.max(0, Math.min(99, value))
  update('borderWidth', normalizePxLength(`${n}px`))
}

const onWidthSlideEvent = (event: Event) => {
  onWidthSlide((event.target as HTMLInputElement).valueAsNumber)
}

const onSummaryInput = (event: Event) => {
  update('summary', (event.target as HTMLInputElement).value)
}
</script>

<style scoped>
.global-style-panel {
  width: var(--left-panel-width, 360px);
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e5e8eb;
  height: 100%;
  overflow-y: auto;
  padding: 24px 30px 29px;
  display: flex;
  flex-direction: column;
  gap: 26px;
}
.panel-title {
  font-size: 20px;
  font-weight: 500;
  color: #191f28;
  letter-spacing: -0.2px;
}
.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.row-label {
  font-size: 16px;
  font-weight: 500;
  color: #333d4b;
  letter-spacing: -0.16px;
}
.sub-label {
  font-size: 15px;
  color: #4e5968;
}
.divider {
  height: 1px;
  background: #e5e8eb;
  flex-shrink: 0;
}
.hint-text {
  font-size: 14px;
  color: #8b95a1;
}

.radio-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.radio-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid #d1d6db;
  background: #fff;
  flex-shrink: 0;
  position: relative;
  cursor: pointer;
}
.radio-dot.is-checked {
  border-color: #4083f3;
}
.radio-dot.is-checked::after {
  content: '';
  position: absolute;
  inset: 3.5px;
  border-radius: 50%;
  background: #4083f3;
}
.radio-label {
  font-size: 13px;
  font-weight: 500;
  color: #333d4b;
  letter-spacing: -0.13px;
  width: 40px;
  cursor: pointer;
}
.radio-preview {
  width: 50px;
  height: 0;
}

.width-field {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 32px;
  padding: 0 12px;
  background: #f2f4f6;
  border-radius: 8px;
  flex-shrink: 0;
}
.width-field input {
  width: 24px;
  background: transparent;
  border: none;
  outline: none;
  text-align: right;
  font-size: 15px;
  color: #191f28;
  -moz-appearance: textfield;
  appearance: textfield;
}
.width-field input::-webkit-outer-spin-button,
.width-field input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.width-field .unit {
  font-size: 14px;
  color: #6b7684;
}

.summary-field {
  height: 40px;
  padding: 0 12px;
  background: #f2f4f6;
  border-radius: 8px;
  border: none;
  outline: none;
  font-size: 15px;
  color: #191f28;
  width: 100%;
}
.summary-field::placeholder {
  color: #8b95a1;
}

.range-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: #e5e8eb;
  outline: none;
}
.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #4083f3;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
}
.range-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #4083f3;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
}
</style>
