import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ColorAlphaPicker from '../ColorAlphaPicker.vue'

// PrimeVue ColorPicker / InputNumber를 가벼운 스텁으로 대체해 컴포넌트 로직만 검증
const ColorPickerStub = {
  name: 'ColorPicker',
  props: ['modelValue', 'disabled', 'format'],
  emits: ['update:modelValue'],
  template: '<div class="cp-stub" />',
}
const InputNumberStub = {
  name: 'InputNumber',
  props: ['modelValue', 'min', 'max', 'disabled', 'suffix', 'size'],
  emits: ['update:modelValue'],
  template: '<div class="in-stub" />',
}

const factory = (modelValue: string, props: Record<string, unknown> = {}) =>
  mount(ColorAlphaPicker, {
    props: { modelValue, ...props },
    global: { stubs: { ColorPicker: ColorPickerStub, InputNumber: InputNumberStub } },
  })

const picker = (w: ReturnType<typeof factory>) => w.findComponent(ColorPickerStub)
const alpha = (w: ReturnType<typeof factory>) => w.findComponent(InputNumberStub)
const lastEmit = (w: ReturnType<typeof factory>) => {
  const ev = w.emitted('update:modelValue')
  return ev ? (ev[ev.length - 1][0] as string) : undefined
}

describe('ColorAlphaPicker', () => {
  it('8자리 HEX를 받으면 base(6자리)와 알파%로 분해해 표시', () => {
    const w = factory('#ff000080')
    expect(picker(w).props('modelValue')).toBe('ff0000') // '#' 없는 6자리
    expect(alpha(w).props('modelValue')).toBe(50) // 0x80/255*100 ≈ 50
  })

  it('6자리 HEX면 알파 100%', () => {
    const w = factory('#3366cc')
    expect(picker(w).props('modelValue')).toBe('3366cc')
    expect(alpha(w).props('modelValue')).toBe(100)
  })

  it('색상을 바꾸면 현재 알파를 유지한 채 #RRGGBBAA emit', async () => {
    const w = factory('#ff000080') // 알파 50%
    await picker(w).vm.$emit('update:modelValue', '00ff00') // ColorPicker는 '#' 없이 반환
    expect(lastEmit(w)).toBe('#00ff0080')
  })

  it('알파 100%면 6자리(#RRGGBB)로 emit', async () => {
    const w = factory('#ff000080')
    await alpha(w).vm.$emit('update:modelValue', 100)
    expect(lastEmit(w)).toBe('#ff0000')
  })

  it('알파 0%면 #RRGGBB00 emit', async () => {
    const w = factory('#ff0000')
    await alpha(w).vm.$emit('update:modelValue', 0)
    expect(lastEmit(w)).toBe('#ff000000')
  })

  it('알파를 50%로 바꾸면 ≈80 알파 헥스 emit', async () => {
    const w = factory('#ff0000')
    await alpha(w).vm.$emit('update:modelValue', 50)
    // 50% → round(0.5*255)=128=0x80
    expect(lastEmit(w)).toBe('#ff000080')
  })

  it('알파 입력이 null/NaN이면 100%로 처리', async () => {
    const w = factory('#ff0000')
    await alpha(w).vm.$emit('update:modelValue', null)
    expect(lastEmit(w)).toBe('#ff0000')
  })

  it('알파가 범위를 벗어나면 0~100으로 클램프', async () => {
    const w = factory('#ff0000')
    await alpha(w).vm.$emit('update:modelValue', 150)
    expect(lastEmit(w)).toBe('#ff0000') // 100으로 클램프 → 불투명
  })

  it('showAlpha=false면 알파 입력 미노출', () => {
    const w = factory('#ff0000', { showAlpha: false })
    expect(alpha(w).exists()).toBe(false)
  })

  it('파싱 불가 값이면 기본 회색(#cccccc)로 표시', () => {
    const w = factory('not-a-color')
    expect(picker(w).props('modelValue')).toBe('cccccc')
    expect(alpha(w).props('modelValue')).toBe(100)
  })

  it('transparent는 알파 0%, base 검정', () => {
    const w = factory('transparent')
    expect(picker(w).props('modelValue')).toBe('000000')
    expect(alpha(w).props('modelValue')).toBe(0)
  })
})
