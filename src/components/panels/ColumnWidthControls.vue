<template>
  <!-- 너비 조정 (Figma 926-8769 · 977-7717) — 기준은 항상 '첫 번째 열'이고 두 번째 열은
       100-첫번째로 자동 계산된다. 추천 비율(프리셋)과 직접 조정(슬라이더)은 같은 값을 쓰므로
       어느 쪽으로 바꿔도 나머지 한쪽과 아래 프리뷰 막대가 함께 따라온다.
       데스크톱 기준이고, 모바일에서는 '가로 유지'가 꺼져 있으면 세로로 쌓인다.
       스타일은 module-form.css(.module-form 범위)에 있다 — 쓰는 쪽이 .module-form 안에 둔다. -->
  <div>
    <p class="gg-field-label !mb-4">너비 조정</p>
    <div class="wadj-tabs">
      <button
        type="button"
        class="wadj-tab"
        :class="{ 'is-active': widthTab === 'preset' }"
        @click="widthTab = 'preset'"
      >
        <span class="material-symbols-outlined">fit_width</span>추천 비율
      </button>
      <button
        type="button"
        class="wadj-tab"
        :class="{ 'is-active': widthTab === 'custom' }"
        @click="widthTab = 'custom'"
      >
        <span class="material-symbols-outlined">edit</span>직접 조정
      </button>
    </div>

    <!-- 추천 비율 -->
    <div v-if="widthTab === 'preset'" class="wadj-presets">
      <button
        v-for="p in WIDTH_PRESETS"
        :key="`wpreset-${p}`"
        type="button"
        class="wadj-preset"
        :class="{ 'is-active': firstColumnWidth === p }"
        @click="setFirstColumnWidth(p)"
      >{{ p }} : {{ 100 - p }}</button>
    </div>

    <!-- 직접 조정 -->
    <div v-else class="wadj-custom">
      <p class="gg-field-label !mb-2.5">첫 번째 열 너비</p>
      <div class="gg-margin-slider-row">
        <input
          type="range"
          min="10"
          max="90"
          step="1"
          :value="firstColumnWidth"
          @input="onFirstColumnWidthInput($event)"
          class="gg-margin-slider"
        />
        <div class="gg-margin-value-field">
          <input
            type="number"
            min="10"
            max="90"
            :value="firstColumnWidth"
            @change="onFirstColumnWidthInput($event)"
            @keydown.enter="blurTarget"
            class="gg-margin-value-input"
          />
          <span class="gg-margin-value-unit">%</span>
        </div>
      </div>
      <p class="hint-text">*두 번째 열 너비는 자동으로 계산돼요</p>
    </div>

    <!-- 비율 프리뷰 — 막대 폭이 실제 비율이라 값과 모양을 함께 확인할 수 있다 -->
    <div class="wadj-preview">
      <div class="wadj-preview-bar is-first" :style="{ flexGrow: firstColumnWidth }">
        {{ firstColumnWidth }}%
      </div>
      <div class="wadj-preview-bar" :style="{ flexGrow: 100 - firstColumnWidth }">
        {{ 100 - firstColumnWidth }}%
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 다단 행의 열 너비 조정 — 모듈 속성 폼(ModuleForm, 열을 고른 상태)과 행 패널(RowLayoutPanel,
 * 행 전체를 고른 상태)이 같은 UI 를 쓴다. 값은 스토어의 행별 colWidths 하나라 어디서 바꿔도 같다.
 */
import { computed, ref } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'

const props = defineProps<{
  groupId: string
  rowIndex: number
  columns: number
}>()

const moduleStore = useModuleStore()

const WIDTH_PRESETS = [50, 60, 40, 80, 20] as const
const widthTab = ref<'preset' | 'custom'>('preset')

const firstColumnWidth = computed<number>(() =>
  moduleStore.columnWidthOf(props.groupId, props.rowIndex, 0),
)
const setFirstColumnWidth = (pct: number): void => {
  // setColumnWidth가 나머지 폭을 다른 컬럼에 분배한다(2단이면 정확히 100-pct)
  moduleStore.setColumnWidth(props.groupId, props.rowIndex, 0, pct)
}
const onFirstColumnWidthInput = (event: Event): void => {
  const n = Number.parseInt((event.target as HTMLInputElement).value, 10)
  if (Number.isFinite(n)) setFirstColumnWidth(n)
}
const blurTarget = (event: Event): void => (event.target as HTMLElement | null)?.blur()
</script>
