<template>
  <InputText
    :modelValue="displayValue"
    @update:modelValue="onInput"
    @focus="onFocus"
    @blur="onBlur"
  />
</template>

<script setup lang="ts">
/**
 * 컬러 HEX 텍스트 입력 (알파 숨김)
 *
 * 투명도를 적용하면 값이 8자리 HEX(#RRGGBBAA, 예: #111111cc)가 되는데,
 * 이 필드에서는 알파(cc)를 화면에 보이지 않게 #RRGGBB만 노출한다.
 * 단, 실제 값에는 알파를 그대로 유지해 적용한다. (투명도는 옆 슬라이더로 조절)
 */
import { ref, computed } from 'vue'
import InputText from 'primevue/inputtext'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const HEX8 = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})$/
const HEX4 = /^#([0-9a-fA-F]{3})([0-9a-fA-F])$/
const HEX6 = /^#[0-9a-fA-F]{6}$/

/** 8/4자리 HEX에서 알파를 떼고 #RRGGBB(또는 #RGB)만 남긴다. 그 외 형식은 그대로. */
function stripAlpha(v: string): string {
  if (!v) return v
  const m8 = v.match(HEX8)
  if (m8) return '#' + m8[1]
  const m4 = v.match(HEX4)
  if (m4) return '#' + m4[1]
  return v
}

/** 값에서 2자리 알파 HEX를 추출 (불투명 ff 또는 알파 없음이면 '') */
function extractAlphaHex(v: string): string {
  const m8 = v.match(HEX8)
  if (m8) return m8[2].toLowerCase() === 'ff' ? '' : m8[2]
  const m4 = v.match(HEX4)
  if (m4) return m4[1] && m4[2].toLowerCase() === 'f' ? '' : m4[2] + m4[2]
  return ''
}

// 편집 중에는 사용자가 입력한 원본을 그대로 보여주고(껌벅임 방지),
// 편집을 시작한 시점의 알파를 캡처해 두었다가 다시 합친다.
const localValue = ref<string | null>(null)
const editAlphaHex = ref('')

const displayValue = computed(() =>
  localValue.value !== null ? localValue.value : stripAlpha(props.modelValue),
)

function onFocus() {
  editAlphaHex.value = extractAlphaHex(props.modelValue)
  localValue.value = stripAlpha(props.modelValue)
}

function onInput(value: string | undefined) {
  const base = value ?? ''
  localValue.value = base
  // base가 완전한 6자리 HEX이고 캡처된 알파가 있으면 다시 붙여서 적용
  const merged = editAlphaHex.value && HEX6.test(base) ? base + editAlphaHex.value : base
  emit('update:modelValue', merged)
}

function onBlur() {
  localValue.value = null
}
</script>
