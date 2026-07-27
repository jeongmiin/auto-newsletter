<template>
  <div v-if="group" class="space-y-4">
    <!-- 그룹 정보 — Figma 352-1138 패턴: 아이콘/설명 없이 타이틀만(그룹 해제는 캔버스 좌측 액션 툴바에도 있지만
         패널에서도 바로 접근 가능하도록 타이틀 옆에 작게 유지) -->
    <div class="p-4 pb-3 flex items-center justify-between gap-2">
      <p class="gg-panel-title truncate">그룹 스타일</p>
      <Button
        label="그룹 해제"
        icon="pi pi-link"
        severity="danger"
        outlined
        size="small"
        class="shrink-0"
        @click="ungroup"
      />
    </div>

    <div class="p-2">
      <!-- 안쪽 여백 (padding) — 아코디언 헤더(토글 없음, Figma "여백" 행) -->
      <div class="gg-acc-section">
        <div class="gg-acc-header gg-acc-header--static">
          <span class="gg-acc-label">안쪽 여백</span>
        </div>
        <div class="gg-acc-body">
          <div class="gg-margin-quad">
            <div class="gg-margin-quad-head">
              <span class="gg-field-label !mb-0">안쪽 여백 (padding)</span>
              <button
                type="button"
                class="gg-lock-btn"
                :class="{ 'is-locked': isQuadLocked('padding') }"
                @click="toggleQuadLock('padding')"
                v-tooltip.top="isQuadLocked('padding') ? '잠금 해제하면 방향별로 따로 조정할 수 있어요' : '잠그면 4방향이 함께 움직여요'"
              >
                <i :class="isQuadLocked('padding') ? 'pi pi-lock' : 'pi pi-lock-open'"></i>
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
            <div v-else class="gg-margin-grid">
              <div v-for="side in boxSides" :key="`pad-${side.key}`" class="gg-margin-cell">
                <span class="gg-margin-cell-label">{{ side.label }}</span>
                <input
                  type="number"
                  min="0"
                  :value="quadSideNumber('padding', side.key)"
                  @input="onQuadDirInput('padding', side.key, $event)"
                  class="gg-margin-cell-input"
                />
              </div>
            </div>
          </div>
          <p class="gg-field-hint">그룹 테두리와 내부 모듈 사이 간격입니다 (상·우·하·좌)</p>
        </div>
      </div>

      <!-- 바깥 여백 (margin) — 아코디언 헤더(토글 없음) -->
      <div class="gg-acc-section">
        <div class="gg-acc-header gg-acc-header--static">
          <span class="gg-acc-label">바깥 여백</span>
        </div>
        <div class="gg-acc-body">
          <div class="gg-margin-quad">
            <div class="gg-margin-quad-head">
              <span class="gg-field-label !mb-0">바깥 여백 (margin)</span>
              <button
                type="button"
                class="gg-lock-btn"
                :class="{ 'is-locked': isQuadLocked('margin') }"
                @click="toggleQuadLock('margin')"
                v-tooltip.top="isQuadLocked('margin') ? '잠금 해제하면 방향별로 따로 조정할 수 있어요' : '잠그면 4방향이 함께 움직여요'"
              >
                <i :class="isQuadLocked('margin') ? 'pi pi-lock' : 'pi pi-lock-open'"></i>
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
            <div v-else class="gg-margin-grid">
              <div v-for="side in boxSides" :key="`mgn-${side.key}`" class="gg-margin-cell">
                <span class="gg-margin-cell-label">{{ side.label }}</span>
                <input
                  type="number"
                  min="0"
                  :value="quadSideNumber('margin', side.key)"
                  @input="onQuadDirInput('margin', side.key, $event)"
                  class="gg-margin-cell-input"
                />
              </div>
            </div>
          </div>
          <p class="gg-field-hint">그룹과 위/아래 다른 모듈 사이 간격입니다 (상·우·하·좌)</p>
        </div>
      </div>

      <!-- 배경색 — 아코디언 헤더 + 우측 노출 토글 (Figma "배경색" 행) -->
      <div class="gg-acc-section">
        <div class="gg-acc-header gg-acc-header--static">
          <span class="gg-acc-label">배경색</span>
          <span class="gg-acc-spacer"></span>
          <ToggleSwitch :modelValue="hasBackground" @update:modelValue="toggleBackground" />
        </div>
        <div class="gg-acc-body">
          <template v-if="hasBackground">
            <div class="flex items-center justify-between gap-3">
              <span class="gg-sub-label">색상</span>
              <ColorPopoverPicker
                title="배경색"
                :modelValue="isUsingPoint('backgroundColor') ? pointColorForKey('backgroundColor') : bgValue"
                :pointColors="wrapPointColors"
                pointFollow
                :activeIndex="isUsingPoint('backgroundColor') ? pointIndexFor('backgroundColor') : null"
                @update:modelValue="setStyle('backgroundColor', $event)"
                @select-point="onSelectPoint('backgroundColor', $event)"
                @add-point-color="editorStore.addPointColor($event)"
                @remove-point-color="editorStore.removePointColor($event)"
              />
            </div>
          </template>
          <p v-else class="gg-field-hint">배경 없음(투명) — 켜면 묶음 전체에 배경색이 적용됩니다</p>
        </div>
      </div>

      <!-- 테두리 — 아코디언 헤더 + 우측 노출 토글, 상세 필드는 전체 스타일(GlobalStylePanel)의 테두리 UI 참고 -->
      <div class="gg-acc-section">
        <div class="gg-acc-header gg-acc-header--static">
          <span class="gg-acc-label">테두리</span>
          <span class="gg-acc-spacer"></span>
          <ToggleSwitch :modelValue="hasBorder" @update:modelValue="toggleBorder" />
        </div>
        <div class="gg-acc-body">
          <template v-if="hasBorder">
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
                @update:modelValue="setStyle('borderColor', $event)"
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

            <!-- 적용 변 (그룹 전용 기능 — 전체 스타일에는 없음) -->
            <div class="flex flex-col gap-[10px]">
              <span class="gg-sub-label">적용할 변</span>
              <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label class="flex items-center gap-1.5 cursor-pointer select-none">
                  <Checkbox :modelValue="allSidesSelected" :binary="true" @update:modelValue="toggleAllSides" />
                  <span class="text-sm text-gray-700 font-medium">전체</span>
                </label>
                <span class="w-px h-4 bg-gray-200"></span>
                <label
                  v-for="opt in sideOptions"
                  :key="opt.key"
                  class="flex items-center gap-1.5 cursor-pointer select-none"
                >
                  <Checkbox
                    :modelValue="isSideOn(opt.key)"
                    :binary="true"
                    @update:modelValue="toggleSide(opt.key)"
                  />
                  <span class="text-sm text-gray-700">{{ opt.label }}</span>
                </label>
              </div>
              <p class="gg-field-hint">'전체'는 위·아래·좌·우 모두 적용합니다.</p>
            </div>
          </template>
          <p v-else class="gg-field-hint">테두리 없음 — 켜면 묶음 전체에 테두리가 적용됩니다</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import type { ModuleGroupStyles, BorderSide } from '@/types'
import { ALL_BORDER_SIDES, groupBorderSides, groupBoxSide } from '@/utils/groupStyle'
import { normalizePxLength } from '@/utils/cssUnit'
import ColorPopoverPicker from './ColorPopoverPicker.vue'
import { pointColorAt } from '@/utils/pointColor'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()

// activeGroup: 그룹 직접 선택 + 멤버 드릴다운 모두 포함.
// (selectedGroup만 보면 멤버 선택 시 좌측 "그룹 구성" 안에서 그룹 스타일이 통째로 사라진다)
const group = computed(() => moduleStore.activeGroup)

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

// ===== 안/밖 여백 4방향(상·우·하·좌) =====
const boxSides: { key: BorderSide; label: string }[] = [
  { key: 'top', label: '상' },
  { key: 'right', label: '우' },
  { key: 'bottom', label: '하' },
  { key: 'left', label: '좌' },
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
const quadLockState = reactive<Record<'padding' | 'margin', boolean>>({ padding: true, margin: true })
const isQuadLocked = (kind: 'padding' | 'margin'): boolean => quadLockState[kind]
const toggleQuadLock = (kind: 'padding' | 'margin'): void => {
  quadLockState[kind] = !quadLockState[kind]
}

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

// ===== 테두리 적용 변 (다중 선택) =====
const sideOptions: { key: BorderSide; label: string }[] = [
  { key: 'top', label: '위' },
  { key: 'bottom', label: '아래' },
  { key: 'left', label: '좌' },
  { key: 'right', label: '우' },
]

const currentSides = computed<BorderSide[]>(() =>
  group.value ? groupBorderSides(group.value.styles) : [],
)
const allSidesSelected = computed(() => currentSides.value.length === 4)
const isSideOn = (side: BorderSide): boolean => currentSides.value.includes(side)

const setSides = (sides: BorderSide[]): void => {
  if (!group.value) return
  moduleStore.updateGroupStyle(group.value.id, 'borderSides', sides)
}

const toggleSide = (side: BorderSide): void => {
  const set = new Set(currentSides.value)
  if (set.has(side)) set.delete(side)
  else set.add(side)
  setSides(ALL_BORDER_SIDES.filter((s) => set.has(s)))
}

const toggleAllSides = (): void => {
  setSides(allSidesSelected.value ? [] : [...ALL_BORDER_SIDES])
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

/* ModuleForm.vue와 동일한 필드 토큰 (스코프 스타일이라 컴포넌트별로 중복 정의) */
.gg-field-label {
  display: block;
  font-size: 15px;
  line-height: 1.5;
  color: #4e5968;
  margin-bottom: 8px;
}
.gg-field-hint {
  font-size: 12px;
  line-height: 1.5;
  letter-spacing: -0.14px;
  color: #6b7684;
  margin-top: 6px;
  word-break: keep-all;
}

/* 아코디언 섹션(여백/배경색/테두리) — 좌측 chevron + 우측 노출 토글, Figma 378-1704/408-1758 */
.gg-acc-section {
  border-top: 1px solid #f2f4f6;
}
.gg-acc-section:first-child {
  border-top: none;
}
.gg-acc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 8px;
  background: none;
  border: none;
  text-align: left;
}
/* 아코디언 제거 — 항상 펼쳐진 정적 헤더(라벨 + 배경색/테두리 노출 토글) */
.gg-acc-header--static {
  cursor: default;
}
.gg-acc-label {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: -0.16px;
  color: #333d4b;
}
.gg-acc-spacer {
  flex: 1;
}
.gg-acc-body {
  padding: 4px 8px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 테두리 상세 — GlobalStylePanel.vue와 동일한 라디오/슬라이더 스타일(스코프상 중복 정의) */
.gg-sub-label {
  font-size: 15px;
  color: #4e5968;
}
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
/* 슬라이더 스타일 통일 — 여백(안/밖) 슬라이더도 두께 슬라이더(gg-range-slider)와 동일 트랙/썸 */
.gg-range-slider,
.gg-margin-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: #e5e8eb;
  outline: none;
}
.gg-range-slider::-webkit-slider-thumb,
.gg-margin-slider::-webkit-slider-thumb {
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
.gg-range-slider::-moz-range-thumb,
.gg-margin-slider::-moz-range-thumb {
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

/* 여백/패딩 4방향 잠금 슬라이더 (ModuleForm.vue "여백" 컨트롤과 동일) */
.gg-margin-quad {
  width: 100%;
}
.gg-margin-quad-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.gg-lock-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: #8b95a1;
  cursor: pointer;
  border-radius: 6px;
  flex-shrink: 0;
}
.gg-lock-btn:hover {
  background: #f2f4f6;
}
.gg-lock-btn.is-locked {
  color: #4083f3;
}
.gg-margin-slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 32px;
}
.gg-margin-slider {
  flex: 1;
  min-width: 0;
}
.gg-margin-value-field {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 32px;
  padding: 0 12px;
  background: #f2f4f6;
  border-radius: 8px;
  flex-shrink: 0;
}
.gg-margin-value-input {
  width: 28px;
  border: none;
  background: none;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.15px;
  color: #191f28;
  text-align: right;
  appearance: textfield;
  -moz-appearance: textfield;
}
.gg-margin-value-input::-webkit-outer-spin-button,
.gg-margin-value-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.gg-margin-value-input:focus {
  outline: none;
}
.gg-margin-value-unit {
  font-size: 14px;
  color: #6b7684;
}
.gg-margin-grid {
  display: grid;
  /* 1fr만 쓰면 트랙 최소폭이 auto(=콘텐츠 min-content)로 잡혀 좁은 패널에서 넘친다 → 0으로 고정 */
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.gg-margin-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 10px;
  background: #f2f4f6;
  border-radius: 8px;
  min-width: 0;
}
.gg-margin-cell-label {
  font-size: 13px;
  color: #6b7684;
  flex-shrink: 0;
}
.gg-margin-cell-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  font-size: 14px;
  color: #191f28;
  appearance: textfield;
  -moz-appearance: textfield;
}
.gg-margin-cell-input::-webkit-outer-spin-button,
.gg-margin-cell-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.gg-margin-cell-input:focus {
  outline: none;
}
</style>
