<template>
  <div class="side-panel global-style-panel">
    <h2 class="panel-title">전체 스타일</h2>

    <!-- 저장 폴더 — 에디터에 들어오기 전 '폴더 선택' 걸음에서 이미 정해진 값이라 여기선 보여주기만 한다.
         지금 만드는 것이 어느 회차인지가 스타일보다 먼저 알아야 할 사실이라 맨 위에 둔다.
         (예전에는 여기서 회차 숫자를 올렸는데, 이미 있는 폴더를 모른 채 새로 만들어
          같은 회차가 두 군데로 갈라지는 일이 있었다) -->
    <div class="flex flex-col gap-[10px]">
      <div class="row-label">뉴스레터 회차</div>
      <div class="vol-field is-readonly">
        <span class="material-symbols-outlined vol-folder-icon">folder</span>
        <code class="vol-path">{{ volumePreview || '아직 정하지 않음' }}</code>
      </div>
    </div>
    <p class="hint-text !-mt-3">
      *바꾸려면 처음(전시회 선택)부터 다시 골라 주세요.
    </p>

    <div class="divider"></div>

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
import { buildUploadDirectory, displayUploadDirectory } from '@/utils/s3Upload'
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
 * 지금 파일이 쌓이는 폴더 — '폴더 선택' 걸음에서 정한 값이라 여기선 읽기만 한다.
 *
 * **전시회와 폴더명만** 보여준다. 앞의 고정 경로(`/e-dm/{연도}/newsletterbuilder/`)는
 * 모든 업로드가 같고, 그 다음 팀 조각도 상단 헤더의 팀 배지에 이미 나와 있어 중복이다.
 *   '/e-dm/2026/newsletterbuilder/arch-plan/hobanexpo/vol01/' → 'hobanexpo/vol01'
 *   '/e-dm/2026/newsletterbuilder/mice/blank/vol01/'          → 'blank/vol01'
 */
const volumePreview = computed(() => {
  const directory = buildUploadDirectory(editorStore.uploadFolder, wrapSettings.value.volume)
  // displayUploadDirectory가 '{팀}/{전시회}/{폴더}/'까지 줄여 주면, 앞의 팀 한 조각만 더 뗀다
  return displayUploadDirectory(directory).replace(/\/$/, '').split('/').slice(1).join('/')
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

/* ===== 저장 폴더 =====
   '폴더 선택' 걸음에서 정해진 값을 보여주기만 한다. 껍데기는 .summary-field와 같은 회색 라운드 박스. */
.vol-field {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
  background: var(--gray-100);
  border-radius: 8px;
}
.vol-field.is-readonly {
  padding: 9px 12px;
}
.vol-folder-icon {
  font-size: 20px;
  color: var(--gray-500);
  flex-shrink: 0;
}
.vol-path {
  min-width: 0;
  font-size: 14px;
  color: var(--gray-800);
  overflow-wrap: anywhere;
}

</style>
