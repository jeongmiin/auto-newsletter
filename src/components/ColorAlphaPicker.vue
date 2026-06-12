<template>
  <div class="color-alpha-picker">
    <ColorPicker
      :modelValue="baseHexNoHash"
      @update:modelValue="onPickerUpdate"
      :disabled="disabled"
      format="hex"
    />
    <InputNumber
      v-if="showAlpha"
      :modelValue="alphaPct"
      @update:modelValue="onAlphaInput"
      :min="0"
      :max="100"
      :disabled="disabled"
      suffix=" %"
      class="text-xs"
      :inputStyle="{ width: '4.5rem' }"
      title="불투명도(%)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ColorPicker from 'primevue/colorpicker'
import InputNumber from 'primevue/inputnumber'
import { parseColorToRgba, rgbToHex } from '@/utils/colorFlatten'

interface Props {
  /** 색상 값 (#RRGGBB 또는 #RRGGBBAA, rgba 등) */
  modelValue: string
  disabled?: boolean
  /** 투명도 슬라이더 노출 여부 */
  showAlpha?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  showAlpha: true,
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

// 파싱 실패 시 기본 회색(불투명)
const parsed = computed(
  () => parseColorToRgba(props.modelValue) ?? { r: 204, g: 204, b: 204, a: 1 },
)

// PrimeVue ColorPicker는 '#' 없는 6자리 HEX를 사용
const baseHexNoHash = computed(() =>
  rgbToHex(parsed.value.r, parsed.value.g, parsed.value.b).slice(1),
)

const alphaPct = computed(() => Math.round(parsed.value.a * 100))

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

const onPickerUpdate = (hex: string) => {
  const norm = hex.startsWith('#') ? hex : `#${hex}`
  const rgba = parseColorToRgba(norm)
  if (!rgba) return
  emitFrom(rgba.r, rgba.g, rgba.b, alphaPct.value)
}

const onAlphaInput = (value: number) => {
  const pct = value == null || Number.isNaN(value) ? 100 : Math.max(0, Math.min(100, value))
  emitFrom(parsed.value.r, parsed.value.g, parsed.value.b, pct)
}
</script>

<style scoped>
.color-alpha-picker {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* 색상 스와치: 옆 입력 필드 높이에 맞추고, #ffffff도 보이도록 테두리 추가 */
.color-alpha-picker :deep(.p-colorpicker-preview) {
  border-radius: 6px;
  border: 1px solid var(--p-surface-200);
}
</style>
