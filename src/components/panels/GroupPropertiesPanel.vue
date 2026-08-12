<template>
  <div v-if="group">
    <!-- 그룹 정보 (Figma 908-11276) — 제목은 '그룹 스타일'이 아니라 **그룹 이름**이다.
         조립형 모듈로 만든 그룹은 모듈명('이미지형 헤더'), 직접 묶은 그룹은 '그룹 01' 식. -->
    <div class="p-4 pb-3 flex items-center justify-between gap-2">
      <p class="gg-panel-title truncate">{{ groupLabel }}</p>
      <button type="button" class="gp-ungroup shrink-0" @click="ungroup">
        <span class="material-symbols-outlined">link_off</span>
        <span>그룹 해제</span>
      </button>
    </div>

    <div class="px-[25px] pb-[25px] mt-0!">
      <!-- 여백 — Figma 557-610: "여백" 섹션 아래 안쪽/바깥 여백을 함께 배치.
           각 여백은 [라벨 + 공통적용 락] + (잠금:공통 슬라이더 / 해제:방향별 슬라이더). -->
      <div class="gg-acc-section">
        <div class="gg-acc-header gg-acc-header--static">
          <span class="gg-acc-label">여백</span>
        </div>
        <div class="gg-acc-body gg-margin-body">
          <!-- 안쪽 여백 (padding) -->
          <div class="gg-margin-quad">
            <div class="gg-margin-quad-head">
              <span class="gg-field-label !mb-0">안쪽 여백</span>
              <button
                type="button"
                class="gg-lock-btn"
                :class="{ 'is-locked': isQuadLocked('padding') }"
                @click="toggleQuadLock('padding')"
                v-tooltip.top="isQuadLocked('padding') ? '4방향이 같은 값으로 함께 조정돼요' : '방향별로 따로 조정할 수 있어요'"
              >
                <span class="material-symbols-outlined gg-lock-icon">{{ isQuadLocked('padding') ? 'lock' : 'lock_open_right' }}</span>
              </button>
            </div>
            <div v-if="isQuadLocked('padding')" class="gg-margin-slider-row">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                :value="quadPxNumber('padding')"
                @input="onQuadValueInput('padding', $event)"
                class="gg-margin-slider"
              />
              <div class="gg-margin-value-field">
                <input
                  type="number"
                  min="0"
                  :value="quadPxNumber('padding')"
                  @input="onQuadValueInput('padding', $event)"
                  class="gg-margin-value-input"
                />
                <span class="gg-margin-value-unit">px</span>
              </div>
            </div>
            <div v-else class="gg-margin-dir-list">
              <div v-for="side in boxSides" :key="`pad-${side.key}`" class="gg-margin-dir-row">
                <span class="gg-margin-dir-label">{{ side.label }}</span>
                <div class="gg-margin-slider-row">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    :value="quadSideNumber('padding', side.key)"
                    @input="onQuadDirInput('padding', side.key, $event)"
                    class="gg-margin-slider"
                  />
                  <div class="gg-margin-value-field">
                    <input
                      type="number"
                      min="0"
                      :value="quadSideNumber('padding', side.key)"
                      @input="onQuadDirInput('padding', side.key, $event)"
                      class="gg-margin-value-input"
                    />
                    <span class="gg-margin-value-unit">px</span>
                  </div>
                </div>
              </div>
            </div>
            <p class="gg-field-hint">*내용과 테두리 사이의 간격이에요.</p>
          </div>

          <!-- 바깥 여백 (margin) -->
          <div class="gg-margin-quad">
            <div class="gg-margin-quad-head">
              <span class="gg-field-label !mb-0">바깥 여백</span>
              <button
                type="button"
                class="gg-lock-btn"
                :class="{ 'is-locked': isQuadLocked('margin') }"
                @click="toggleQuadLock('margin')"
                v-tooltip.top="isQuadLocked('margin') ? '4방향이 같은 값으로 함께 조정돼요' : '방향별로 따로 조정할 수 있어요'"
              >
                <span class="material-symbols-outlined gg-lock-icon">{{ isQuadLocked('margin') ? 'lock' : 'lock_open_right' }}</span>
              </button>
            </div>
            <div v-if="isQuadLocked('margin')" class="gg-margin-slider-row">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                :value="quadPxNumber('margin')"
                @input="onQuadValueInput('margin', $event)"
                class="gg-margin-slider"
              />
              <div class="gg-margin-value-field">
                <input
                  type="number"
                  min="0"
                  :value="quadPxNumber('margin')"
                  @input="onQuadValueInput('margin', $event)"
                  class="gg-margin-value-input"
                />
                <span class="gg-margin-value-unit">px</span>
              </div>
            </div>
            <div v-else class="gg-margin-dir-list">
              <div v-for="side in boxSides" :key="`mgn-${side.key}`" class="gg-margin-dir-row">
                <span class="gg-margin-dir-label">{{ side.label }}</span>
                <div class="gg-margin-slider-row">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    :value="quadSideNumber('margin', side.key)"
                    @input="onQuadDirInput('margin', side.key, $event)"
                    class="gg-margin-slider"
                  />
                  <div class="gg-margin-value-field">
                    <input
                      type="number"
                      min="0"
                      :value="quadSideNumber('margin', side.key)"
                      @input="onQuadDirInput('margin', side.key, $event)"
                      class="gg-margin-value-input"
                    />
                    <span class="gg-margin-value-unit">px</span>
                  </div>
                </div>
              </div>
            </div>
            <p class="gg-field-hint">*그룹과 그룹 사이의 간격이에요.</p>
          </div>
        </div>
      </div>

      <!-- 배경색 — 모듈 속성과 같은 접이식 카드 (chevron + 헤더 토글 + gg-acc-body--card) -->
      <div class="gg-acc-section">
        <div class="gg-acc-header">
          <span class="gg-acc-title" @click="expanded.background = !expanded.background">
            <i class="pi gg-acc-chevron" :class="expanded.background ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
            <span class="gg-acc-label">배경색</span>
          </span>
          <span class="gg-acc-spacer"></span>
          <ToggleSwitch :modelValue="hasBackground" @update:modelValue="onSwitch('background', $event)" @click.stop />
        </div>
        <div class="gg-acc-body gg-acc-body--card" v-if="expanded.background">
          <div class="gg-acc-fields" :class="{ 'is-disabled': !hasBackground }">
            <div class="flex items-center justify-between gap-3">
              <span class="gg-sub-label">색상</span>
              <ColorPopoverPicker
                title="배경색"
                :modelValue="isUsingPoint('backgroundColor') ? pointColorForKey('backgroundColor') : bgValue"
                :pointColors="wrapPointColors"
                pointFollow
                :activeIndex="isUsingPoint('backgroundColor') ? pointIndexFor('backgroundColor') : null"
                @update:modelValue="onColorInput('backgroundColor', $event)"
                @select-point="onSelectPoint('backgroundColor', $event)"
                @add-point-color="editorStore.addPointColor($event)"
                @remove-point-color="editorStore.removePointColor($event)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 테두리 — 모듈 속성과 같은 접이식 카드. 상세 필드는 전체 스타일(GlobalStylePanel)의 테두리 UI 참고 -->
      <div class="gg-acc-section">
        <div class="gg-acc-header">
          <span class="gg-acc-title" @click="expanded.border = !expanded.border">
            <i class="pi gg-acc-chevron" :class="expanded.border ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
            <span class="gg-acc-label">테두리</span>
          </span>
          <span class="gg-acc-spacer"></span>
          <ToggleSwitch :modelValue="hasBorder" @update:modelValue="onSwitch('border', $event)" @click.stop />
        </div>
        <div class="gg-acc-body gg-acc-body--card" v-if="expanded.border">
          <div class="gg-acc-fields" :class="{ 'is-disabled': !hasBorder }">
            <!-- 스타일 라디오 (GlobalStylePanel과 동일한 radio-dot 리스트) -->
            <div class="flex flex-col gap-[10px]">
              <span class="gg-sub-label">스타일</span>
              <div class="flex flex-col gap-[14px]">
                <label v-for="opt in borderStyleOptions" :key="opt.value" class="gg-radio-row">
                  <span
                    class="gg-radio-dot"
                    :class="{ 'is-checked': (group.styles.borderStyle ?? 'solid') === opt.value }"
                    @click="setStyle('borderStyle', opt.value)"
                  ></span>
                  <span class="gg-radio-label" @click="setStyle('borderStyle', opt.value)">{{ opt.label }}</span>
                  <span class="gg-radio-preview" :style="{ borderTop: `4px ${opt.value} #333d4b` }"></span>
                </label>
              </div>
            </div>

            <!-- 색상 -->
            <div class="flex items-center justify-between gap-3">
              <span class="gg-sub-label">색상</span>
              <ColorPopoverPicker
                title="테두리 색상"
                :modelValue="isUsingPoint('borderColor') ? pointColorForKey('borderColor') : (group.styles.borderColor || '#dddddd')"
                :pointColors="wrapPointColors"
                pointFollow
                :activeIndex="isUsingPoint('borderColor') ? pointIndexFor('borderColor') : null"
                @update:modelValue="onColorInput('borderColor', $event)"
                @select-point="onSelectPoint('borderColor', $event)"
                @add-point-color="editorStore.addPointColor($event)"
                @remove-point-color="editorStore.removePointColor($event)"
              />
            </div>

            <!-- 두께 (GlobalStylePanel과 동일한 range-slider + 값 필드) -->
            <div class="flex flex-col gap-[10px]">
              <span class="gg-sub-label">두께</span>
              <div class="flex items-center justify-between gap-3">
                <input
                  type="range"
                  min="0"
                  max="20"
                  :value="borderWidthNum"
                  @input="onBorderWidthSlide"
                  class="gg-range-slider flex-1"
                />
                <div class="gg-margin-value-field">
                  <input
                    type="number"
                    min="0"
                    max="99"
                    :value="borderWidthNum"
                    @input="onBorderWidthSlide"
                    class="gg-margin-value-input"
                  />
                  <span class="gg-margin-value-unit">px</span>
                </div>
              </div>
            </div>

            <!-- 테두리 위치 (그룹 전용 기능 — 전체 스타일에는 없음). 모듈 속성과 같은 공용 아이콘 선택기. -->
            <div class="flex flex-col gap-[10px]">
              <span class="gg-sub-label">테두리 위치</span>
              <BorderSideSelector :modelValue="currentSides" @update:modelValue="setSides" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import type { ModuleGroupStyles, BorderSide } from '@/types'
import { groupBorderSides, groupBoxSide } from '@/utils/groupStyle'
import { normalizePxLength } from '@/utils/cssUnit'
import ColorPopoverPicker from './ColorPopoverPicker.vue'
import BorderSideSelector from './BorderSideSelector.vue'
import { pointColorAt } from '@/utils/pointColor'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()

// activeGroup: 그룹 직접 선택 + 멤버 드릴다운 모두 포함.
// (selectedGroup만 보면 멤버 선택 시 좌측 "그룹 구성" 안에서 그룹 스타일이 통째로 사라진다)
const group = computed(() => moduleStore.activeGroup)

// 패널 제목 = 그룹 이름. 이름은 만들 때 정해지므로(모듈명 또는 '그룹 01') 보통 비어 있지 않다.
const groupLabel = computed(() => group.value?.name || '그룹')

// ===== 포인트 색상 사용 (최대 3개 중 선택) =====
const wrapPointColors = computed(() => editorStore.wrapSettings.pointColors ?? [])
type PointColorKey = 'backgroundColor' | 'borderColor'
const isUsingPoint = (key: PointColorKey): boolean =>
  !!group.value?.styles[`${key}UsePoint` as keyof ModuleGroupStyles]
const togglePoint = (key: PointColorKey, on: boolean): void => {
  if (!group.value) return
  moduleStore.updateGroupStyle(group.value.id, `${key}UsePoint` as keyof ModuleGroupStyles, on)
}
// 해당 필드가 참조 중인 포인트 색상 인덱스(0~2)
const pointIndexFor = (key: PointColorKey): number => {
  const raw = group.value?.styles[`${key}PointIndex` as keyof ModuleGroupStyles]
  return typeof raw === 'number' && raw >= 0 ? raw : 0
}
const pointColorForKey = (key: PointColorKey): string =>
  pointColorAt(wrapPointColors.value, pointIndexFor(key))
// 스와치 클릭: 같은 스와치를 다시 누르면 해제, 아니면 그 인덱스로 바인딩
const onSelectPoint = (key: PointColorKey, index: number): void => {
  if (!group.value) return
  if (isUsingPoint(key) && pointIndexFor(key) === index) {
    togglePoint(key, false)
    return
  }
  moduleStore.updateGroupStyle(group.value.id, `${key}PointIndex` as keyof ModuleGroupStyles, index)
  togglePoint(key, true)
}

// GlobalStylePanel.vue와 동일한 스타일 옵션 — '없음'은 아래 "테두리 사용" 토글로 대체
const borderStyleOptions = [
  { label: '실선', value: 'solid' },
  { label: '점선', value: 'dotted' },
  { label: '파선', value: 'dashed' },
  { label: '이중선', value: 'double' },
]

const hasBackground = computed(
  () => !!(group.value?.styles.backgroundColor && group.value.styles.backgroundColor.trim()),
)
const bgValue = computed(() => group.value?.styles.backgroundColor || '#ffffff')

const setStyle = (key: keyof ModuleGroupStyles, value: string): void => {
  if (!group.value) return
  moduleStore.updateGroupStyle(group.value.id, key, value)
}

/**
 * 색상 필드 직접 입력(팔레트·HEX·투명도).
 *
 * 포인트 색상을 따르는 중이면 추종을 먼저 푼다 — 풀지 않으면 값만 바뀌고 렌더는 계속
 * 포인트 색상으로 해소되어(resolveGroupStyles) 고른 색이 반영되지 않는다.
 */
const onColorInput = (key: PointColorKey, value: string): void => {
  if (isUsingPoint(key)) togglePoint(key, false)
  setStyle(key, value)
}

// ===== 테두리 사용 토글 + 두께(GlobalStylePanel.vue와 동일한 range-slider) =====
const borderWidthNum = computed(() => parseInt(group.value?.styles.borderWidth ?? '', 10) || 0)
const hasBorder = computed(() => borderWidthNum.value > 0)

const toggleBorder = (on: boolean): void => {
  if (!group.value) return
  if (on) {
    const style = group.value.styles.borderStyle
    if (!style || style === 'none') setStyle('borderStyle', 'solid')
    if (borderWidthNum.value <= 0) setStyle('borderWidth', '1px')
  } else {
    setStyle('borderWidth', '0px')
  }
}

const onBorderWidthSlide = (event: Event): void => {
  const raw = (event.target as HTMLInputElement).valueAsNumber
  const n = Number.isNaN(raw) ? 0 : Math.max(0, Math.min(99, raw))
  setStyle('borderWidth', normalizePxLength(`${n}px`))
}

// ===== 안/밖 여백 4방향 — Figma 612-4305 순서(상단·하단·좌측·우측) =====
const boxSides: { key: BorderSide; label: string }[] = [
  { key: 'top', label: '상단' },
  { key: 'bottom', label: '하단' },
  { key: 'left', label: '좌측' },
  { key: 'right', label: '우측' },
]
const cap = (side: BorderSide): string => side.charAt(0).toUpperCase() + side.slice(1)
// 현재 값(명시 4방향 우선, 없으면 기존 shorthand 파싱값)
const boxSide = (kind: 'padding' | 'margin', side: BorderSide): string =>
  group.value ? groupBoxSide(group.value.styles, kind, side) : ''
// 편집 시 해당 4방향 필드에 기록 → 렌더가 4방향 조합을 사용
const setBoxSide = (kind: 'padding' | 'margin', side: BorderSide, value: string): void => {
  setStyle(`${kind}${cap(side)}` as keyof ModuleGroupStyles, value)
}

// ===== 여백 4방향 잠금 슬라이더 UI (ModuleForm.vue의 모듈 여백 컨트롤과 동일 패턴) =====
// 잠금 기본값: 바깥 여백(margin)=잠금(공통 적용 단일 슬라이더), 안쪽 여백(padding)=잠금 해제(방향별 개별 조정).
// 안쪽 여백은 보통 좌우만 다르게 주므로(배경이 채워지도록) 개별 조정을 먼저 보여준다.
// 사용자가 락을 누르면 그 값으로 고정, 다른 그룹으로 바뀌면 기본값으로 복귀.
const LOCK_DEFAULT: Record<'padding' | 'margin', boolean> = { padding: false, margin: true }
const quadLockState = reactive<Record<'padding' | 'margin', boolean | undefined>>({
  padding: undefined,
  margin: undefined,
})
const isQuadLocked = (kind: 'padding' | 'margin'): boolean =>
  quadLockState[kind] !== undefined ? (quadLockState[kind] as boolean) : LOCK_DEFAULT[kind]
const toggleQuadLock = (kind: 'padding' | 'margin'): void => {
  quadLockState[kind] = !isQuadLocked(kind)
}
// 다른 그룹으로 바뀌면 잠금 상태를 기본값으로 되돌린다
watch(
  () => group.value?.id,
  () => {
    quadLockState.padding = undefined
    quadLockState.margin = undefined
  },
)

const MARGIN_QUAD_MAX = 100

const quadSideNumber = (kind: 'padding' | 'margin', side: BorderSide): number => {
  const n = parseInt(boxSide(kind, side) || '0', 10)
  return Number.isFinite(n) ? n : 0
}
// 잠금 상태에서 대표값으로 보여줄 값 — 4방향 중 상단(top) 기준
const quadPxNumber = (kind: 'padding' | 'margin'): number => quadSideNumber(kind, 'top')

const onQuadValueInput = (kind: 'padding' | 'margin', event: Event): void => {
  const raw = (event.target as HTMLInputElement).value
  const n = Math.max(0, Math.min(MARGIN_QUAD_MAX, parseInt(raw, 10) || 0))
  const px = `${n}px`
  boxSides.forEach((side) => setBoxSide(kind, side.key, px))
}

const onQuadDirInput = (kind: 'padding' | 'margin', side: BorderSide, event: Event): void => {
  const raw = (event.target as HTMLInputElement).value
  const n = Math.max(0, parseInt(raw, 10) || 0)
  setBoxSide(kind, side, `${n}px`)
}

// ===== 테두리 적용 변 (다중 선택) — UI는 공용 BorderSideSelector =====
const currentSides = computed<BorderSide[]>(() =>
  group.value ? groupBorderSides(group.value.styles) : [],
)

const setSides = (sides: BorderSide[]): void => {
  if (!group.value) return
  moduleStore.updateGroupStyle(group.value.id, 'borderSides', sides)
}

// 섹션 펼침 상태 — 스위치와 무관한 UI 상태(기본 닫힘). chevron/라벨 클릭으로만 바뀐다.
const expanded = reactive<{ background: boolean; border: boolean }>({
  background: false,
  border: false,
})

/**
 * 헤더 스위치 변경.
 * - 켤 때: 값을 켜면서 섹션도 펼친다
 * - 끌 때: 펼침 상태는 그대로, 내용만 흐리게(.gg-acc-fields.is-disabled)
 */
const onSwitch = (section: 'background' | 'border', on: boolean): void => {
  if (section === 'background') toggleBackground(on)
  else toggleBorder(on)
  if (on) expanded[section] = true
}

const toggleBackground = (on: boolean): void => {
  if (!group.value) return
  setStyle('backgroundColor', on ? '#ffffff' : '')
}

const ungroup = (): void => {
  if (group.value) moduleStore.ungroup(group.value.id)
}
</script>

<style scoped>
/* 좌측 패널 상단 타이틀 — ModuleForm.vue와 동일 스타일(Figma 352-1138) */
.gg-panel-title {
  font-size: 20px;
  font-weight: 500;
  line-height: 1.5;
  color: #191f28;
  letter-spacing: -0.2px;
}
/* 그룹 해제 (Figma 908-11276) — 테두리 없는 빨간 텍스트 버튼 + link_off 아이콘.
   아이콘은 캔버스 툴바·모듈 순서 패널과 같은 것으로 통일했다. */
.gp-ungroup {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #f04452;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.12s;
}
.gp-ungroup:hover {
  background: #fdeced;
}
.gp-ungroup .material-symbols-outlined {
  font-size: 20px;
}

/* 여백 섹션: 안쪽/바깥 여백 두 컨트롤 사이 간격 (Figma 557-610) */
.gg-margin-body {
  gap: 26px;
}

/* 테두리 상세 — 라디오/슬라이더 스타일 */
.gg-radio-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.gg-radio-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid #d1d6db;
  background: #fff;
  flex-shrink: 0;
  position: relative;
  cursor: pointer;
}
.gg-radio-dot.is-checked {
  border-color: #4083f3;
}
.gg-radio-dot.is-checked::after {
  content: '';
  position: absolute;
  inset: 3.5px;
  border-radius: 50%;
  background: #4083f3;
}
.gg-radio-label {
  font-size: 13px;
  font-weight: 500;
  color: #333d4b;
  letter-spacing: -0.13px;
  width: 40px;
  cursor: pointer;
}
.gg-radio-preview {
  width: 50px;
  height: 0;
}
/* 테두리 두께 슬라이더 — 여백 슬라이더(gg-margin-slider, 전역)와 동일 트랙/썸 */
.gg-range-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: #e5e8eb;
  outline: none;
}
.gg-range-slider::-webkit-slider-thumb {
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
.gg-range-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #4083f3;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
}

.gg-text-input-sm :deep(.p-inputtext),
:deep(.gg-hex-input) {
  background: #f2f4f6;
  border: 1px solid transparent;
  border-radius: 8px;
  box-shadow: none;
}
.gg-text-input-sm :deep(.p-inputtext:enabled:focus),
:deep(.gg-hex-input:focus) {
  border-color: #4083f3;
  background: #fff;
  box-shadow: none;
}
.gg-select-sm :deep(.p-select) {
  border: 1px solid #e5e8eb;
  border-radius: 8px;
  box-shadow: none;
}
.gg-select-sm :deep(.p-select-label) {
  font-size: 13px;
  color: #333d4b;
}

</style>
