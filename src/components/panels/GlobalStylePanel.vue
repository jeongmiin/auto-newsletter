<template>
  <div class="side-panel global-style-panel">
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
      <p class="hint-text">*선택한 언어에 맞는 폰트를 모든 모듈에 일괄 적용해요.</p>
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
          <label v-for="opt in borderStyleOptions" :key="opt.value" class="ui-radio-row">
            <span class="ui-radio-dot" :class="{ 'is-checked': wrapSettings.borderStyle === opt.value }" @click="update('borderStyle', opt.value)"></span>
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
            class="gg-margin-slider"
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

    <!-- 뉴스레터 회차 — 이미지 업로드 폴더의 마지막 단계라 비어 있으면 업로드가 막힌다.
         'vol'은 모든 회차에 공통이라 고정해 두고 숫자만 오르내리게 한다. -->
    <div class="flex flex-col gap-[10px]">
      <div class="row-label">뉴스레터 회차 <span class="text-red-500">*</span></div>
      <div class="vol-field" :class="{ 'is-empty': volumeNumber === null }">
        <span class="vol-prefix">{{ VOLUME_PREFIX }}</span>
        <input
          type="number"
          class="vol-number"
          :min="MIN_VOLUME"
          :max="MAX_VOLUME"
          step="1"
          inputmode="numeric"
          :value="volumeNumber ?? ''"
          placeholder="숫자"
          aria-label="뉴스레터 회차 숫자"
          @input="onVolumeInput"
        />
        <button
          type="button"
          class="vol-step"
          :disabled="(volumeNumber ?? MIN_VOLUME) <= MIN_VOLUME"
          v-tooltip.top="'이전 회차'"
          aria-label="회차 1 줄이기"
          @click="stepVolume(-1)"
        >
          <span class="material-symbols-outlined">remove</span>
        </button>
        <button
          type="button"
          class="vol-step"
          :disabled="(volumeNumber ?? 0) >= MAX_VOLUME"
          v-tooltip.top="'다음 회차'"
          aria-label="회차 1 늘리기"
          @click="stepVolume(1)"
        >
          <span class="material-symbols-outlined">add</span>
        </button>
      </div>
    </div>
    <p class="hint-text !-mt-3">
      *이미지가 <code>{{ volumePreview }}</code> 폴더에 정리돼요. 회차를 정해야 이미지를 올릴 수 있어요.
    </p>

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
    <!-- 공용 .hint-text 의 margin-top(6px)을 이겨야 해서 !important 유틸리티로 준다 -->
    <p class="hint-text !-mt-3">*검색 엔진과 스크린 리더를 위한 한 줄 설명이에요.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { normalizePxLength } from '@/utils/cssUnit'
import { FONT_LANGUAGE_OPTIONS } from '@/utils/fontFamily'
import {
  buildUploadDirectory,
  formatVolume,
  parseVolumeNumber,
  MAX_VOLUME,
  MIN_VOLUME,
  VOLUME_PREFIX,
} from '@/utils/s3Upload'
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

/**
 * 회차는 저장 값('vol01')과 화면 값(1)의 형태가 다르다.
 * 저장 형태는 예전 그대로 두고(기존 저장 파일 호환) 화면에서는 숫자만 다룬다.
 */
const volumeNumber = computed(() => parseVolumeNumber(wrapSettings.value.volume))

/** null이면 '아직 안 정함' — 업로드가 막힌 상태로 되돌린다 */
const setVolume = (n: number | null) => {
  update('volume', n === null ? '' : formatVolume(n))
}

const onVolumeInput = (event: Event) => {
  const raw = (event.target as HTMLInputElement).value.trim()
  setVolume(raw ? parseVolumeNumber(raw) : null)
}

/** 아직 안 정했으면 0에서 시작 — +를 누르면 vol01, -는 formatVolume이 최솟값으로 잡아준다 */
const stepVolume = (delta: number) => {
  setVolume((volumeNumber.value ?? 0) + delta)
}

/**
 * 지금 회차가 어떤 폴더가 되는지 보여준다 — 아직 안 정했으면 자리를 vol01로 흉내 낸다.
 *
 * 앞의 `/e-dm/{연도}/`는 모든 뉴스레터가 똑같아서 알려줄 게 없으니 그 두 조각만 걷어낸다.
 * 뒤쪽은 통째로 남긴다 — 빈 문서는 `blank/{팀}/vol01`처럼 세 조각이라 개수를 못 박으면 잘린다.
 *   '/e-dm/2026/handarty/vol01/'   → 'handarty/vol01'
 *   '/e-dm/2026/blank/mice/vol01/' → 'blank/mice/vol01'
 */
const volumePreview = computed(() => {
  const directory =
    buildUploadDirectory(editorStore.uploadFolder, wrapSettings.value.volume) ??
    buildUploadDirectory(editorStore.uploadFolder, formatVolume(MIN_VOLUME))
  return (directory ?? '').split('/').filter(Boolean).slice(2).join('/')
})
</script>

<style scoped>
/* 껍데기는 panels.css의 .side-panel — 안쪽 여백만 다르다 */
.global-style-panel {
  padding: 24px 30px 29px;
}
.sub-label {
  font-size: 15px;
  color: var(--gray-700);
}
.divider {
  height: 1px;
  background: var(--gray-200);
  flex-shrink: 0;
}
/* .hint-text 는 panels.css 공용 클래스로 옮겼다 (패널 공통 힌트 문구) */

.radio-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-750);
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
  background: var(--gray-100);
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
  color: var(--gray-800);
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
  color: var(--gray-600);
}

.summary-field {
  height: 40px;
  padding: 0 12px;
  background: var(--gray-100);
  border-radius: 8px;
  border: none;
  outline: none;
  font-size: 15px;
  color: var(--gray-800);
  width: 100%;
}
.summary-field::placeholder {
  color: var(--gray-500);
}

/* ===== 뉴스레터 회차 =====
   'vol'은 고정 접두사라 글자로만 두고, 숫자 칸과 -/+ 버튼만 조작할 수 있게 한다.
   껍데기는 .summary-field와 같은 회색 라운드 박스. */
.vol-field {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 40px;
  padding: 0 6px 0 12px;
  background: var(--gray-100);
  border-radius: 8px;
}

.vol-prefix {
  font-size: 15px;
  color: var(--gray-600);
  font-weight: 600;
  user-select: none;
}
.vol-number {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  font-size: 15px;
  color: var(--gray-800);
  /* 네이티브 스핀 버튼은 숨긴다 — 옆의 -/+ 버튼이 그 역할을 한다 (.width-field와 동일) */
  -moz-appearance: textfield;
  appearance: textfield;
}
.vol-number::-webkit-outer-spin-button,
.vol-number::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.vol-number::placeholder {
  color: var(--gray-500);
}
.vol-step {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: var(--white);
  color: var(--gray-700);
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;
}
.vol-step:hover:not(:disabled) {
  background: var(--gray-200);
}
.vol-step:disabled {
  background: transparent;
  color: var(--gray-300);
  cursor: not-allowed;
}
.vol-step .material-symbols-outlined {
  font-size: 18px;
}

</style>
