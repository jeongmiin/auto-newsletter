<template>
  <!--
    커스텀 테이블 셀 내용 편집기 (WYSIWYG)
    - 저장 형식은 그대로 **마커**(+\n) 유지 — 렌더러/템플릿 호환
    - 화면에는 마커를 숨기고 실제 굵게로 표시 (미리보기와 동일)
    - 한글 IME(조합 입력)·붙여넣기 깨짐 방지 처리 포함
  -->
  <div
    :id="elId"
    ref="editorEl"
    class="tcell-editor w-full text-sm rounded-md border border-gray-300 bg-white px-2.5 py-1.5 leading-relaxed outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
    :class="isHeader ? 'font-medium' : ''"
    contenteditable="true"
    :data-placeholder="placeholder"
    spellcheck="false"
    @input="onInput"
    @compositionstart="composing = true"
    @compositionend="onCompositionEnd"
    @paste="onPaste"
    @blur="onBlur"
  ></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    elId?: string
    placeholder?: string
    isHeader?: boolean
  }>(),
  { elId: undefined, placeholder: '', isHeader: false },
)
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const editorEl = ref<HTMLDivElement | null>(null)
const composing = ref(false)
// 마지막으로 부모에 emit한 값 — 외부 변경과 자기 입력을 구분해 불필요한 재렌더(커서 튐) 방지
let lastEmitted = ''

// 저장 문자열(**마커**, \n) → 표시 HTML (굵게 렌더, 마커는 숨김)
const toDisplayHtml = (text: string): string => {
  const escaped = (text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped
    .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\r?\n/g, '<br>')
}

// 굵게 요소 판별 (execCommand 결과가 <b>/<strong>/inline font-weight 어느 쪽이든 대응)
const isBoldElement = (el: HTMLElement): boolean => {
  const tag = el.tagName
  if (tag === 'STRONG' || tag === 'B') return true
  const fw = el.style.fontWeight
  return fw === 'bold' || parseInt(fw, 10) >= 600
}

// 표시 DOM → 저장 문자열 (굵게 → **마커**, 줄바꿈 → \n, 그 외 태그는 벗겨냄)
const fromDisplayDom = (root: HTMLElement): string => {
  let out = ''
  const walk = (node: Node, insideBold: boolean): void => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.textContent ?? ''
        return
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return
      const el = child as HTMLElement
      if (el.tagName === 'BR') {
        out += '\n'
      } else if (!insideBold && isBoldElement(el)) {
        const before = out.length
        out += '**'
        walk(el, true)
        // 빈 굵게(****)는 렌더되지 않으므로 마커 자체를 취소
        if (out.length === before + 2) out = out.slice(0, before)
        else out += '**'
      } else if (el.tagName === 'DIV' || el.tagName === 'P') {
        // 블록 요소는 줄바꿈으로 (단, 맨 앞/연속 줄바꿈 중복 방지)
        if (out.length > 0 && !out.endsWith('\n')) out += '\n'
        walk(el, insideBold)
      } else {
        walk(el, insideBold)
      }
    })
  }
  walk(root, false)
  return out
}

const render = (text: string): void => {
  if (editorEl.value) editorEl.value.innerHTML = toDisplayHtml(text)
}

const sync = (): void => {
  const el = editorEl.value
  if (!el) return
  const value = fromDisplayDom(el)
  // 내용이 비면 잔여 <br> 등을 정리해 placeholder가 보이도록
  if (value === '' && el.innerHTML !== '') el.innerHTML = ''
  if (value === lastEmitted) return
  lastEmitted = value
  emit('update:modelValue', value)
}

const onInput = (): void => {
  if (composing.value) return // 한글 조합 중에는 동기화 보류
  sync()
}
const onCompositionEnd = (): void => {
  composing.value = false
  sync()
}
const onBlur = (): void => {
  if (composing.value) return
  sync()
}

// 붙여넣기는 서식 제거하고 일반 텍스트만 삽입
const onPaste = (e: ClipboardEvent): void => {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') ?? ''
  document.execCommand('insertText', false, text)
}

onMounted(() => {
  lastEmitted = props.modelValue ?? ''
  render(props.modelValue ?? '')
})

// 외부에서 modelValue가 바뀐 경우에만 재렌더 (입력 중/포커스 중에는 덮어쓰지 않음)
watch(
  () => props.modelValue,
  (val) => {
    const next = val ?? ''
    if (next === lastEmitted) return
    if (composing.value) return
    if (editorEl.value && document.activeElement === editorEl.value) return
    render(next)
    lastEmitted = next
  },
)

// 부모(굵게 버튼)에서 호출: 현재 선택 구간 굵게 토글
const toggleBold = (): void => {
  const el = editorEl.value
  if (!el) return
  el.focus()
  document.execCommand('bold')
  sync()
}
defineExpose({ toggleBold })
</script>

<style scoped>
.tcell-editor {
  min-height: 3.2em;
  white-space: pre-wrap;
  word-break: break-word;
}
.tcell-editor:empty::before {
  content: attr(data-placeholder);
  color: #9ca3af;
  pointer-events: none;
}
</style>
