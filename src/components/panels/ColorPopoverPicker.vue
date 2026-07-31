<template>
  <div class="inline-block">
    <!-- 스와치 버튼 -->
    <button
      v-if="triggerVariant === 'add'"
      ref="triggerEl"
      type="button"
      class="color-add-trigger"
      title="포인트 색상 추가"
      @click="toggleOpen"
    >
      <img :src="addPointColorBtn" alt="포인트 색상 추가" />
    </button>
    <button
      v-else
      ref="triggerEl"
      type="button"
      class="color-swatch-trigger"
      :style="swatchTriggerStyle"
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

        <!-- ============ 포인트 색상 풀 피커 모달 (추가·수정 공용) ============
             그라디언트+휴 피커를 상시 노출하고, 색을 바꾸면 부모가 즉시 팔레트에 반영한다.
             (확정 버튼 없음 — 변경 즉시 추가/갱신) -->
        <template v-if="fullPicker">
          <!-- 채도·명도(사각형) 위 · 색상(휴) 슬라이더 아래, 세로 스택 · 콘텐츠 폭 100% (커스텀 피커) -->
          <div class="cp-picker">
            <div ref="svEl" class="cp-sv" :style="svBgStyle" @pointerdown="onSvDown">
              <span class="cp-sv-handle" :style="{ left: `${hsvView.s}%`, top: `${100 - hsvView.v}%` }"></span>
            </div>
            <div ref="hueEl" class="cp-hue" @pointerdown="onHueDown">
              <span class="cp-hue-handle" :style="{ left: `${(hsvView.h / 360) * 100}%` }"></span>
            </div>
          </div>

          <!-- HEX (미리보기 스와치 + 입력) -->
          <div class="flex items-center gap-2 mt-3">
            <span class="custom-swatch-preview" :style="{ backgroundColor: displayColor }"></span>
            <HexColorInput
              :modelValue="modelValue"
              @update:modelValue="onHexInput"
              placeholder="#000000"
              class="flex-1 w-full font-mono text-sm hex-field"
              spellcheck="false"
            />
          </div>

          <!-- 불투명도 -->
          <div v-if="showAlpha" class="flex flex-col mt-3">
            <span class="text-[13px] text-gray-400">불투명도</span>
            <div class="flex items-center justify-between gap-3">
              <input
                type="range"
                min="0"
                max="100"
                :value="alphaPct"
                @input="onAlphaInputEvent"
                class="alpha-slider flex-1"
                :style="alphaTrackStyle"
              />
              <div class="alpha-field">{{ alphaPct }} %</div>
            </div>
          </div>

          <div class="popover-divider mt-3"></div>

          <!-- 기본 팔레트 -->
          <div class="flex flex-col items-center gap-2 mt-3">
            <span class="text-[13px] text-gray-400 w-full">기본 팔레트</span>
            <div class="palette-grid">
              <button
                v-for="c in DEFAULT_PALETTE"
                :key="c"
                type="button"
                class="palette-swatch"
                :class="{ 'is-selected': sameColor(c, modelValue) }"
                :style="{ backgroundColor: c }"
                :title="c"
                @click="pick(c)"
              ></button>
            </div>
          </div>
        </template>

        <!-- ============ 일반 색상 조정 팝오버(텍스트/배경/테두리 등) ============ -->
        <template v-else>
        <!-- 포인트 색상 퀵 스와치 — '포인트 색상' 패널에서 추가한 색만 '선택'해 쓸 수 있다.
             (추가·삭제는 포인트 색상 패널에서만 — 여기선 삭제 버튼 없음) -->
        <div class="flex flex-col gap-2 mb-3">
          <span class="text-[13px] text-gray-400">포인트 색상</span>
          <div class="flex items-center gap-2">
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
              :class="{ 'is-selected': sameColor(c, modelValue) }"
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
              class="flex-1 w-full font-mono text-sm hex-field"
              spellcheck="false"
            />
          </div>

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

        <!-- 불투명도 — 트랙은 (좌)투명 체크패턴 → (우)선택 색상 그라디언트. 100%로 갈수록 색이 진하게 보임 -->
        <div v-if="showAlpha" class="flex flex-col gap-1 mt-3">
          <span class="text-[13px] text-gray-400">불투명도</span>
          <div class="flex items-center justify-between gap-3">
            <input
              type="range"
              min="0"
              max="100"
              :value="alphaPct"
              @input="onAlphaInputEvent"
              class="alpha-slider flex-1"
              :style="alphaTrackStyle"
            />
            <div class="alpha-field">{{ alphaPct }} %</div>
          </div>
        </div>
        </div>
        <!-- /수동 색상 지정 영역 -->
        </template>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import ColorPicker from 'primevue/colorpicker'
import HexColorInput from '@/components/HexColorInput.vue'
import { parseColorToRgba, rgbToHex } from '@/utils/colorFlatten'
import { normalizeColorInput } from '@/utils/colorHelper'
import addPointColorBtn from '@/assets/img/add_point_color_btn.png'

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
  /** true면 그라디언트+휴 상시 노출의 '풀 피커' 모달로 표시(포인트 색상 추가·수정용).
   *  false면 팔레트+포인트 스와치 중심의 컴팩트 모달(모듈 색상 필드용). */
  fullPicker?: boolean
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
  fullPicker: false,
  pointFollow: false,
  activeIndex: null,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'add-point-color': [value: string]
  'remove-point-color': [value: string]
  'select-point': [index: number]
  open: []
  close: []
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
// 열림/닫힘을 부모에 알린다(포인트 색상 추가 모달의 실시간 추가 세션 시작/종료 신호로 사용)
watch(open, (v) => {
  if (v) {
    emit('open')
    // 열릴 때 현재 색의 휴를 보존값으로 초기화(회색/검정에서 휴가 튀지 않도록)
    const rgb = parseColorToRgba(props.modelValue)
    if (rgb) {
      const c = rgbToHsv(rgb.r, rgb.g, rgb.b)
      if (c.s >= 1 && c.v >= 1) persistedHue.value = c.h
    }
  } else {
    emit('close')
  }
})
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

// ===== 커스텀 채도·명도(SV) + 휴 피커 (포인트 색상 추가 모달) =====
// PrimeVue ColorPicker는 150px 고정·세로 휴라 세로 스택/가로 휴/100% 폭이 불가능해 직접 구현한다.
function rgbToHsv(r: number, g: number, b: number) {
  const rr = r / 255, gg = g / 255, bb = b / 255
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rr) h = 60 * (((gg - bb) / d) % 6)
    else if (max === gg) h = 60 * ((bb - rr) / d + 2)
    else h = 60 * ((rr - gg) / d + 4)
  }
  if (h < 0) h += 360
  const s = max === 0 ? 0 : (d / max) * 100
  return { h, s, v: max * 100 }
}
function hsvToRgb(h: number, s: number, v: number) {
  const ss = s / 100, vv = v / 100
  const c = vv * ss
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = vv - c
  let r = 0, g = 0, b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) }
}

// 회색/검정에선 휴가 rgb로 복원되지 않으므로(0으로 튐) 마지막 유효 휴를 보존한다.
const persistedHue = ref(210)
const hsvView = computed(() => {
  const c = rgbToHsv(parsed.value.r, parsed.value.g, parsed.value.b)
  return { h: c.s < 1 ? persistedHue.value : c.h, s: c.s, v: c.v }
})
const svBgStyle = computed(() => ({
  backgroundColor: `hsl(${hsvView.value.h}, 100%, 50%)`,
  backgroundImage:
    'linear-gradient(to bottom, rgba(0,0,0,0), #000), linear-gradient(to right, #fff, rgba(255,255,255,0))',
}))
const svEl = ref<HTMLElement | null>(null)
const hueEl = ref<HTMLElement | null>(null)

const emitHsv = (h: number, s: number, v: number) => {
  const { r, g, b } = hsvToRgb(h, s, v)
  emitFrom(r, g, b, pickAlpha())
}
const onSvMove = (e: PointerEvent) => {
  const el = svEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
  emitHsv(hsvView.value.h, Math.round(x * 100), Math.round((1 - y) * 100))
}
const onSvUp = () => {
  window.removeEventListener('pointermove', onSvMove)
  window.removeEventListener('pointerup', onSvUp)
}
const onSvDown = (e: PointerEvent) => {
  onSvMove(e)
  window.addEventListener('pointermove', onSvMove)
  window.addEventListener('pointerup', onSvUp)
}
const onHueMove = (e: PointerEvent) => {
  const el = hueEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  const h = Math.round(x * 360)
  persistedHue.value = h
  emitHsv(h, hsvView.value.s, hsvView.value.v)
}
const onHueUp = () => {
  window.removeEventListener('pointermove', onHueMove)
  window.removeEventListener('pointerup', onHueUp)
}
const onHueDown = (e: PointerEvent) => {
  onHueMove(e)
  window.addEventListener('pointermove', onHueMove)
  window.addEventListener('pointerup', onHueUp)
}

// 불투명도 슬라이더 트랙 배경 — 체크패턴(투명) 위에 (좌)투명→(우)선택색 그라디언트를 얹는다.
// 맨 앞 레이어가 위에 그려지므로, 왼쪽(투명)에선 체크패턴이 비치고 오른쪽(불투명)에선 색이 덮인다.
const alphaTrackStyle = computed(() => {
  const base = `#${baseHexNoHash.value}` // 선택색(불투명 6자리)
  const checker = '#dcdfe3'
  return {
    '--thumb-color': base,
    backgroundColor: '#ffffff',
    backgroundImage: [
      `linear-gradient(to right, ${base}00, ${base}ff)`,
      `linear-gradient(45deg, ${checker} 25%, transparent 25%)`,
      `linear-gradient(-45deg, ${checker} 25%, transparent 25%)`,
      `linear-gradient(45deg, transparent 75%, ${checker} 75%)`,
      `linear-gradient(-45deg, transparent 75%, ${checker} 75%)`,
    ].join(', '),
    backgroundSize: '100% 100%, 8px 8px, 8px 8px, 8px 8px, 8px 8px',
    backgroundPosition: '0 0, 0 0, 0 4px, 4px -4px, -4px 0',
    backgroundRepeat: 'no-repeat, repeat, repeat, repeat, repeat',
  }
})

// 스와치 버튼 배경 — 투명/반투명 색(예: 배경색 기본값 'transparent')이면 불투명도 슬라이더와 같은
// 체크무늬가 비쳐 "투명"임이 드러나도록, 체크무늬 위에 현재 색을 얹는다.
// (완전 불투명한 색이면 색이 체크무늬를 완전히 덮으므로 겉모습은 종전과 같다)
const CHECKER_COLOR = '#dcdfe3'
const swatchTriggerStyle = computed(() => {
  const color = displayColor.value
  return {
    backgroundColor: '#ffffff',
    backgroundImage: [
      `linear-gradient(${color}, ${color})`,
      `linear-gradient(45deg, ${CHECKER_COLOR} 25%, transparent 25%)`,
      `linear-gradient(-45deg, ${CHECKER_COLOR} 25%, transparent 25%)`,
      `linear-gradient(45deg, transparent 75%, ${CHECKER_COLOR} 75%)`,
      `linear-gradient(-45deg, transparent 75%, ${CHECKER_COLOR} 75%)`,
    ].join(', '),
    backgroundSize: '100% 100%, 8px 8px, 8px 8px, 8px 8px, 8px 8px',
    backgroundPosition: '0 0, 0 0, 0 4px, 4px -4px, -4px 0',
    backgroundRepeat: 'no-repeat, repeat, repeat, repeat, repeat',
  }
})

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

// 팔레트/그라디언트로 '새 색'을 고를 때 사용할 알파(%).
// 현재 색이 완전 투명(a=0, 예: 배경색 기본값 'transparent')이면 색을 골라도 alpha 00이 붙어
// 배경이 안 보이던 문제가 있었다 → 이 경우 불투명(100%)에서 시작한다.
// (이미 반투명한 색을 조정 중이면 기존 알파를 유지)
const pickAlpha = (): number => (parsed.value.a === 0 ? 100 : alphaPct.value)

const pick = (hex: string) => {
  const rgba = parseColorToRgba(hex)
  if (!rgba) return
  emitFrom(rgba.r, rgba.g, rgba.b, pickAlpha())
}

const onHexInput = (value: string | undefined) => {
  emit('update:modelValue', normalizeColorInput(value ?? ''))
}

const onGradientPickerUpdate = (hex: string) => {
  const norm = hex.startsWith('#') ? hex : `#${hex}`
  const rgba = parseColorToRgba(norm)
  if (!rgba) return
  emitFrom(rgba.r, rgba.g, rgba.b, pickAlpha())
}

const onAlphaInput = (value: number) => {
  const pct = Number.isNaN(value) ? 100 : Math.max(0, Math.min(100, value))
  emitFrom(parsed.value.r, parsed.value.g, parsed.value.b, pct)
}

const onAlphaInputEvent = (event: Event) => {
  onAlphaInput((event.target as HTMLInputElement).valueAsNumber)
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
  // 포인트 색상 풀 피커 모달은 상단 고정 위치(top 180px), 그 외 색상 팝오버는 트리거 근처에 배치
  const top = props.fullPicker
    ? 180
    : Math.max(margin, Math.min(rect.top, window.innerHeight - 520))
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
  // 드래그 중 언마운트 대비
  onSvUp()
  onHueUp()
})
</script>

<style scoped>
.color-swatch-trigger {
  width: 35px;
  height: 35px;
  border-radius: 8px;
  /* 바깥 아웃라인 1px(#E5E8EB) → 그 안 흰색 2px 링 → 안쪽에 선택 색상(inline background-color) */
  border: 1px solid #e5e8eb;
  box-shadow: inset 0 0 0 2px #fff;
  cursor: pointer;
  background-color: #fff;
}

/* 포인트 색상 추가 버튼 — add_point_color_btn.png 이미지 트리거 */
.color-add-trigger {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  display: block;
}
.color-add-trigger img {
  width: 100%;
  height: 100%;
  display: block;
}
.color-add-trigger:hover {
  opacity: 0.85;
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

/* 팝오버 내 '포인트 색상 추가' 버튼 — add_point_color_btn.png 이미지 */
.quick-swatch-add {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  flex-shrink: 0;
  display: block;
}
.quick-swatch-add img {
  width: 100%;
  height: 100%;
  display: block;
}
.quick-swatch-add:hover {
  opacity: 0.85;
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
  border: 1px solid #4083f3;
  box-shadow: inset 0 0 0 2px #fff;
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
/* 선택된 색 — 파란 외곽선 + 안쪽 흰 링(선택 색상이 가운데에 보임) */
.palette-swatch.is-selected {
  border: 1px solid #4083f3;
  box-shadow: inset 0 0 0 2px #fff;
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

/* 커스텀 SV+휴 피커 — 세로 스택(사각형 위 · 휴 아래), 콘텐츠 폭 100% */
.cp-picker {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
.cp-sv {
  position: relative;
  width: 100%;
  height: 140px;
  border-radius: 8px;
  cursor: crosshair;
  touch-action: none;
  box-sizing: border-box;
}
.cp-sv-handle {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.cp-hue {
  position: relative;
  width: 100%;
  height: 14px;
  border-radius: 7px;
  cursor: pointer;
  touch-action: none;
  background: linear-gradient(
    to right,
    #ff0000 0%,
    #ffff00 17%,
    #00ff00 33%,
    #00ffff 50%,
    #0000ff 67%,
    #ff00ff 83%,
    #ff0000 100%
  );
}
.cp-hue-handle {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #fff;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.45);
  transform: translate(-50%, -50%);
  pointer-events: none;
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

/* 불투명도 슬라이더 — 트랙(체크패턴+색 그라디언트)은 인라인 style(alphaTrackStyle)로 주입,
   썸은 선택 색상(--thumb-color)으로 채운다. */
.alpha-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 12px;
  border-radius: 6px;
  outline: none;
  border: 1px solid #e5e8eb;
  box-sizing: border-box;
}
.alpha-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: var(--thumb-color, #4083f3);
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.35);
}
.alpha-slider::-moz-range-thumb {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: var(--thumb-color, #4083f3);
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.35);
}
</style>
