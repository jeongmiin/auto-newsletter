<template>
  <div class="inline-block">
    <!-- 스와치 버튼 -->
    <button
      v-if="triggerVariant === 'add'"
      ref="triggerEl"
      type="button"
      class="color-add-trigger"
      title="색상 추가"
      @click="toggleOpen"
    >
      <i class="pi pi-plus"></i>
    </button>
    <button
      v-else
      ref="triggerEl"
      type="button"
      class="color-swatch-trigger"
      :style="{ backgroundColor: displayColor }"
      @click="toggleOpen"
    ></button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="popoverEl"
        class="color-popover"
        :style="{ top: `${pos.top}px`, left: `${pos.left}px` }"
      >
        <!-- 헤더 -->
        <div class="flex items-center justify-between mb-3">
          <span class="text-[13px] font-medium text-gray-900 tracking-tight">{{ title }}</span>
          <button type="button" class="text-gray-400 hover:text-gray-600" @click="open = false">
            <i class="pi pi-times text-xs"></i>
          </button>
        </div>

        <!-- 포인트 색상 퀵 스와치 -->
        <div class="flex flex-col gap-2 mb-3">
          <span class="text-[13px] text-gray-400">포인트 색상</span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="quick-swatch-add"
              title="현재 색상을 포인트 색상에 추가"
              @click="addCurrentAsPointColor"
            >
              <i class="pi pi-plus text-xs"></i>
            </button>
            <div
              v-for="(c, i) in pointColors"
              :key="c"
              class="quick-swatch-wrap"
            >
              <button
                type="button"
                class="quick-swatch"
                :class="{ 'is-active': pointFollow ? activeIndex === i : sameColor(c, modelValue) }"
                :style="{ backgroundColor: c }"
                :title="c"
                @click="onPointSwatchClick(c, i)"
              ></button>
              <button
                v-if="pointColors.length > 1"
                type="button"
                class="quick-swatch-remove"
                title="포인트 색상 삭제"
                @click.stop="emit('remove-point-color', c)"
              >
                <i class="pi pi-times"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="popover-divider"></div>

        <!-- 수동 색상 지정 영역 (포인트 색상 추종 중이면 흐리게·비활성) -->
        <div :class="{ 'manual-locked': manualDisabled }">
        <!-- 기본 팔레트 -->
        <div class="flex flex-col items-center gap-2 my-3">
          <span class="text-[13px] text-gray-400 w-full">기본 팔레트</span>
          <div class="palette-grid">
            <button
              v-for="c in DEFAULT_PALETTE"
              :key="c"
              type="button"
              class="palette-swatch"
              :style="{ backgroundColor: c }"
              :title="c"
              @click="pick(c)"
            ></button>
          </div>
        </div>

        <div class="popover-divider"></div>

        <!-- 커스텀 색상: 스와치(클릭 시 팔레트/휴 그라디언트 피커 토글) + HEX -->
        <div class="relative">
          <div class="flex items-center gap-2 mt-3">
            <button
              type="button"
              ref="gradientTriggerEl"
              class="custom-swatch-preview"
              :style="{ backgroundColor: displayColor }"
              title="상세 색상 선택"
              @click="toggleGradient"
            ></button>
            <HexColorInput
              :modelValue="modelValue"
              @update:modelValue="onHexInput"
              placeholder="#000000"
              class="flex-1 font-mono text-sm hex-field"
              spellcheck="false"
            />
          </div>

          <!-- 팔레트/휴 그라디언트 피커 — 이 팝오버 안에서 position:absolute로 떠서
               별도 오버레이(body 텔레포트)를 쓰지 않는다. inline 모드라 z-index·바깥클릭
               충돌 없이 모달(팝오버) 앞에 자연스럽게 겹쳐서 뜬다. -->
          <div v-if="gradientOpen" ref="gradientPanelEl" class="gradient-popover">
            <ColorPicker
              :modelValue="baseHexNoHash"
              @update:modelValue="onGradientPickerUpdate"
              format="hex"
              inline
              class="gradient-picker-inline"
            />
          </div>
        </div>

        <!-- 투명도 -->
        <div v-if="showAlpha" class="flex flex-col gap-1 mt-3">
          <span class="text-[13px] text-gray-400">투명도</span>
          <div class="flex items-center justify-between gap-3">
            <input
              type="range"
              min="0"
              max="100"
              :value="alphaPct"
              @input="onAlphaInputEvent"
              class="range-slider flex-1"
            />
            <div class="alpha-field">{{ alphaPct }} %</div>
          </div>
        </div>
        </div>
        <!-- /수동 색상 지정 영역 -->

        <!-- 포인트 색상 추가 확정 버튼 — 그라디언트/팔레트로 색을 고르는 동안은 미리보기만 하고,
             이 버튼을 눌러야 실제로 팔레트에 추가된다 (색을 조정할 때마다 즉시 추가하면
             pointColors가 금방 3개를 채워 v-if로 팝오버 자체가 사라지는 문제가 있었다) -->
        <button
          v-if="triggerVariant === 'add'"
          type="button"
          class="confirm-add-btn"
          @click="confirmAdd"
        >
          이 색상을 포인트 색상으로 추가
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, onBeforeUnmount } from 'vue'
import ColorPicker from 'primevue/colorpicker'
import HexColorInput from '@/components/HexColorInput.vue'
import { parseColorToRgba, rgbToHex } from '@/utils/colorFlatten'
import { normalizeColorInput } from '@/utils/colorHelper'

// Figma node 334-2080 "기본 팔레트" 6x4 그리드 색상값
const DEFAULT_PALETTE = [
  '#191F28', '#4E5968', '#8B95A1', '#D1D6DB', '#F2F4F6', '#FFFFFF',
  '#FFEEEF', '#FFF4E5', '#E8FAF2', '#EBF3FF', '#F3F0FF', '#FFF0F8',
  '#F04452', '#FE9800', '#03B26C', '#4083F3', '#8B5CF6', '#EC4899',
  '#C0202E', '#C47200', '#017A49', '#2563D4', '#6D28D9', '#BE185D',
]

interface Props {
  modelValue: string
  title: string
  pointColors?: string[]
  showAlpha?: boolean
  /** 'add': 색상 대신 '+' 아이콘 트리거 (포인트 색상 신규 추가용) */
  triggerVariant?: 'swatch' | 'add'
  /** 포인트 색상 "추종" 모드: 스와치 클릭 시 리터럴 픽 대신 select-point(index) emit,
   *  추종 중이면 수동 색상 입력을 잠근다. (모듈 색상 필드용 — 전체 스타일은 미지정=리터럴) */
  pointFollow?: boolean
  /** 현재 추종 중인 포인트 색상 인덱스 (null = 미추종) */
  activeIndex?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  pointColors: () => [],
  showAlpha: true,
  triggerVariant: 'swatch',
  pointFollow: false,
  activeIndex: null,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'add-point-color': [value: string]
  'remove-point-color': [value: string]
  'select-point': [index: number]
}>()

// 추종 모드이면서 실제로 포인트 색상을 따르는 중이면 수동 입력(팔레트/HEX/투명도)을 잠근다.
const manualDisabled = computed(() => props.pointFollow && props.activeIndex != null)

// 포인트 색상 스와치 클릭: 추종 모드이면 부모에 인덱스만 알린다(추종 on/off·저장은 부모 담당).
const onPointSwatchClick = (color: string, index: number) => {
  if (props.pointFollow) {
    emit('select-point', index)
    return
  }
  pick(color)
}

const open = ref(false)
const triggerEl = ref<HTMLElement | null>(null)
const popoverEl = ref<HTMLElement | null>(null)
const pos = ref({ top: 0, left: 0 })

// 팔레트/휴 그라디언트 피커 — 스와치 클릭 시에만 열리는 서브 패널
const gradientOpen = ref(false)
const gradientTriggerEl = ref<HTMLElement | null>(null)
const gradientPanelEl = ref<HTMLElement | null>(null)

const parsed = computed(() => parseColorToRgba(props.modelValue) ?? { r: 204, g: 204, b: 204, a: 1 })
const displayColor = computed(() => props.modelValue || '#cccccc')
const alphaPct = computed(() => Math.round(parsed.value.a * 100))
// PrimeVue ColorPicker는 '#' 없는 6자리 HEX를 사용
const baseHexNoHash = computed(() => rgbToHex(parsed.value.r, parsed.value.g, parsed.value.b).slice(1))

const sameColor = (a: string, b: string) => a.replace('#', '').toLowerCase().slice(0, 6) === b.replace('#', '').toLowerCase().slice(0, 6)

const emitFrom = (r: number, g: number, b: number, aPct: number) => {
  const hex6 = rgbToHex(r, g, b)
  if (aPct >= 100) {
    emit('update:modelValue', hex6)
    return
  }
  const aHex = Math.round((Math.max(0, Math.min(100, aPct)) / 100) * 255)
    .toString(16)
    .padStart(2, '0')
  emit('update:modelValue', `${hex6}${aHex}`)
}

const pick = (hex: string) => {
  const rgba = parseColorToRgba(hex)
  if (!rgba) return
  emitFrom(rgba.r, rgba.g, rgba.b, alphaPct.value)
}

const onHexInput = (value: string | undefined) => {
  emit('update:modelValue', normalizeColorInput(value ?? ''))
}

const onGradientPickerUpdate = (hex: string) => {
  const norm = hex.startsWith('#') ? hex : `#${hex}`
  const rgba = parseColorToRgba(norm)
  if (!rgba) return
  emitFrom(rgba.r, rgba.g, rgba.b, alphaPct.value)
}

const onAlphaInput = (value: number) => {
  const pct = Number.isNaN(value) ? 100 : Math.max(0, Math.min(100, value))
  emitFrom(parsed.value.r, parsed.value.g, parsed.value.b, pct)
}

const onAlphaInputEvent = (event: Event) => {
  onAlphaInput((event.target as HTMLInputElement).valueAsNumber)
}

const addCurrentAsPointColor = () => {
  emit('add-point-color', displayColor.value)
}

const confirmAdd = () => {
  addCurrentAsPointColor()
  open.value = false
}

const POPOVER_WIDTH = 262
const computePosition = () => {
  const el = triggerEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const margin = 8
  let left = rect.right + margin
  if (left + POPOVER_WIDTH > window.innerWidth - margin) {
    left = rect.left - POPOVER_WIDTH - margin
  }
  left = Math.max(margin, left)
  const top = Math.max(margin, Math.min(rect.top, window.innerHeight - 520))
  pos.value = { left: left + window.scrollX, top: top + window.scrollY }
}

const onOutsideClick = (e: MouseEvent) => {
  const target = e.target as Node
  if (popoverEl.value?.contains(target) || triggerEl.value?.contains(target)) return
  open.value = false
}

const closeGradient = () => {
  gradientOpen.value = false
  window.removeEventListener('mousedown', onGradientOutsideClick, true)
}

const toggleOpen = async () => {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    computePosition()
    window.addEventListener('mousedown', onOutsideClick, true)
    window.addEventListener('scroll', computePosition, true)
    window.addEventListener('resize', computePosition)
  } else {
    closeGradient()
    window.removeEventListener('mousedown', onOutsideClick, true)
    window.removeEventListener('scroll', computePosition, true)
    window.removeEventListener('resize', computePosition)
  }
}

const onGradientOutsideClick = (e: MouseEvent) => {
  const target = e.target as Node
  if (gradientPanelEl.value?.contains(target) || gradientTriggerEl.value?.contains(target)) return
  closeGradient()
}

const toggleGradient = () => {
  gradientOpen.value = !gradientOpen.value
  if (gradientOpen.value) {
    window.addEventListener('mousedown', onGradientOutsideClick, true)
  } else {
    window.removeEventListener('mousedown', onGradientOutsideClick, true)
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('mousedown', onOutsideClick, true)
  window.removeEventListener('mousedown', onGradientOutsideClick, true)
  window.removeEventListener('scroll', computePosition, true)
  window.removeEventListener('resize', computePosition)
})
</script>

<style scoped>
.color-swatch-trigger {
  width: 35px;
  height: 35px;
  border-radius: 8px;
  border: 1px solid #d1d6db;
  cursor: pointer;
  /* background-image:
    linear-gradient(45deg, #eee 25%, transparent 25%),
    linear-gradient(-45deg, #eee 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #eee 75%),
    linear-gradient(-45deg, transparent 75%, #eee 75%); */
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0;
  background-color: #fff;
  background-blend-mode: normal;
}

.color-add-trigger {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1.5px dashed #d1d6db;
  color: #8b95a1;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.color-add-trigger:hover {
  border-color: #4083f3;
  color: #4083f3;
}

.color-popover {
  position: absolute;
  z-index: 1100;
  width: 262px;
  padding: 15px 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.25);
}

.popover-divider {
  height: 1px;
  background: #f2f4f6;
  width: 100%;
}

/* 포인트 색상 추종 중 — 수동 색상 지정 영역을 흐리게·클릭 불가로 */
.manual-locked {
  opacity: 0.4;
  pointer-events: none;
  user-select: none;
}

.quick-swatch-add {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1.5px dashed #d1d6db;
  color: #8b95a1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}
.quick-swatch-add:hover {
  border-color: #4083f3;
  color: #4083f3;
}

.quick-swatch-wrap {
  position: relative;
  flex-shrink: 0;
}
.quick-swatch {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  display: block;
}
.quick-swatch.is-active {
  border-color: #4083f3;
}
.quick-swatch-remove {
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
.quick-swatch-wrap:hover .quick-swatch-remove {
  display: flex;
}

.palette-grid {
  display: grid;
  grid-template-columns: repeat(6, 32px);
  gap: 8px 8px;
}
.palette-swatch {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #e5e8eb;
  cursor: pointer;
}

.custom-swatch-preview {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #e5e8eb;
  flex-shrink: 0;
  padding: 0;
  cursor: pointer;
}

/* 스와치 클릭 시 뜨는 서브 패널 — 팝오버(.color-popover) 안에서 position:absolute로
   떠서 나머지 내용(팔레트 그리드·투명도 등) 위로 겹쳐 보인다. */
.gradient-popover {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 20;
  margin-top: 8px;
  background: #fff;
  border-radius: 10px;
  padding: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}

/* 팔레트/휴 그라디언트 피커 (inline) — 팝오버 폭(262px - 좌우 padding)에 맞춰 축소 */
.gradient-picker-inline :deep(.p-colorpicker-panel) {
  position: static;
  box-shadow: none;
  border: none;
  padding: 0;
}

.hex-field :deep(input) {
  background: #f2f4f6;
  border-radius: 8px;
  height: 32px;
}

.alpha-field {
  min-width: 56px;
  height: 32px;
  padding: 0 12px;
  background: #f2f4f6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #191f28;
  flex-shrink: 0;
}

.confirm-add-btn {
  margin-top: 12px;
  width: 100%;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: #4083f3;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.confirm-add-btn:hover {
  background: #2563d4;
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
