<script setup lang="ts">
/**
 * 공용 검색창 (Figma 253-1150 `SearchInput`).
 *
 * 전시명·폴더명·모듈 검색이 모두 같은 알약 모양을 쓴다 — 화면마다 크기만 다르다.
 * 크기는 디자인의 세 단계 그대로:
 *   sm 36px(아이콘 16 · 글자 14) · md 40px(18 · 15) · lg 48px(22 · 17)
 *
 * 테두리가 없는 채움형이라 포커스는 **안쪽 링**으로 알린다 — 바깥 테두리를 그리면
 * 그 두께만큼 안의 글자가 밀려 초점이 옮겨질 때마다 화면이 흔들린다.
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    /** 디자인의 세 단계 — 좁은 좌측 패널은 sm, 넓은 화면은 lg */
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    /** 적은 글자를 한 번에 지우는 x 버튼 (디자인에는 없지만 목록을 훑는 화면에서 요긴하다) */
    clearable?: boolean
    /** 화면에 라벨이 없을 때 읽어 줄 이름 — 없으면 placeholder를 쓴다 */
    ariaLabel?: string
  }>(),
  { placeholder: '검색어를 입력하세요', size: 'md', disabled: false, clearable: false, ariaLabel: '' },
)

const emit = defineEmits<{ 'update:modelValue': [string] }>()

/** 글자가 들어 있으면 아이콘까지 진해진다 (디자인의 Filled 상태) */
const isFilled = computed(() => props.modelValue !== '')

const onInput = (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value)
</script>

<template>
  <!-- label로 감싸 아이콘·여백 어디를 눌러도 입력으로 초점이 간다 -->
  <label class="sf" :class="[`sf--${size}`, { 'is-filled': isFilled, 'is-disabled': disabled }]">
    <span class="material-symbols-outlined sf-icon">search</span>
    <input
      class="sf-input"
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-label="ariaLabel || placeholder"
      spellcheck="false"
      @input="onInput"
    />
    <button
      v-if="clearable && isFilled && !disabled"
      type="button"
      class="sf-clear"
      title="검색어 지우기"
      @click="emit('update:modelValue', '')"
    >
      <span class="material-symbols-outlined">close</span>
    </button>
  </label>
</template>

<style scoped>
.sf {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  /* 세로 flex 안에서 목록이 길어져도 높이가 눌리지 않게 */
  flex-shrink: 0;
  border-radius: 50px;
  background: var(--gray-100);
  box-sizing: border-box;
  cursor: text;
}
.sf:focus-within {
  box-shadow: inset 0 0 0 1.5px var(--blue-400);
}
.sf.is-disabled {
  opacity: 0.5;
  cursor: default;
}

.sf--sm {
  height: 36px;
  padding: 0 12px;
}
.sf--md {
  height: 40px;
  padding: 0 16px;
}
.sf--lg {
  height: 48px;
  padding: 0 20px;
}

.sf-icon {
  flex-shrink: 0;
  color: var(--gray-600);
}
.sf.is-filled .sf-icon {
  color: var(--gray-800);
}
.sf--sm .sf-icon {
  font-size: 16px;
}
.sf--md .sf-icon {
  font-size: 18px;
}
.sf--lg .sf-icon {
  font-size: 22px;
}

.sf-input {
  flex: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  outline: none;
  background: none;
  font-weight: 500;
  color: var(--gray-800);
}
.sf-input::placeholder {
  color: var(--gray-600);
  font-weight: 500;
}
.sf-input:disabled {
  color: var(--gray-500);
}
.sf--sm .sf-input {
  font-size: 14px;
}
.sf--md .sf-input {
  font-size: 15px;
}
.sf--lg .sf-input {
  font-size: 17px;
}

.sf-clear {
  display: flex;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--gray-400);
  cursor: pointer;
}
.sf-clear:hover {
  color: var(--gray-600);
}
.sf--sm .sf-clear .material-symbols-outlined {
  font-size: 16px;
}
.sf--md .sf-clear .material-symbols-outlined {
  font-size: 18px;
}
.sf--lg .sf-clear .material-symbols-outlined {
  font-size: 20px;
}
</style>
