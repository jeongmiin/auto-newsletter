<template>
  <div class="quill-editor-wrapper">
    <div ref="editorRef" class="quill-editor"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import Quill from 'quill'
import { processQuillHtml } from '@/utils/quillHtmlProcessor'
import { registerHighlightMarker, HIGHLIGHT_COLORS } from '@/utils/quillHighlightMarker'

interface Props {
  modelValue: string
  placeholder?: string
  readonly?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '내용을 입력하세요...',
  readonly: false,
})

const emit = defineEmits<Emits>()

const editorRef = ref<HTMLElement | null>(null)
let quill: Quill | null = null

// 커스텀 HEX 색상 팔레트
const customColors = [
  '#000000',
  '#e60000',
  '#ff9900',
  '#ffff00',
  '#008a00',
  '#0066cc',
  '#9933ff',
  '#ffffff',
  '#facccc',
  '#ffebcc',
  '#ffffcc',
  '#cce8cc',
  '#cce0f5',
  '#ebd6ff',
  '#bbbbbb',
  '#f06666',
  '#ffc266',
  '#ffff66',
  '#66b966',
  '#66a3e0',
  '#c285ff',
  '#888888',
  '#a10000',
  '#b26b00',
  '#b2b200',
  '#006100',
  '#0047b2',
  '#6b24b2',
  '#444444',
  '#5c0000',
  '#663d00',
  '#666600',
  '#003700',
  '#002966',
  '#3d1466',
]

// 형광펜(반투명 마커) 색상 팔레트
const highlightColors = HIGHLIGHT_COLORS

onMounted(() => {
  if (!editorRef.value) return

  // 형광펜 커스텀 Blot 등록 (new Quill 호출 전에 실행)
  registerHighlightMarker()

  // Quill 초기화 (커스텀 HEX 색상 팔레트 사용)
  quill = new Quill(editorRef.value, {
    theme: 'snow',
    placeholder: props.placeholder,
    readOnly: props.readonly,
    modules: {
      toolbar: {
        container: [
          ['bold', 'italic', 'underline', 'strike'], // 텍스트 스타일
          [{ header: [1, 2, 3, false] }], // 헤더
          [{ list: 'ordered' }, { list: 'bullet' }], // 리스트
          [{ align: [] }], // 정렬 버튼 (left, center, right, justify)
          [{ color: customColors }, { background: customColors }], // HEX 색상 팔레트
          [{ highlightMarker: highlightColors }], // 형광펜(반투명 마커)
          ['link'], // 링크
          ['clean'], // 서식 제거
        ],
        handlers: {
          highlightMarker(this: { quill: Quill }, value: string) {
            this.quill.format('highlightMarker', value || false)
          },
        },
      },
    },
  })

  // 형광펜 픽커 UI에 색상 스와치 적용
  const toolbarEl = editorRef.value.previousElementSibling
  if (toolbarEl) {
    toolbarEl
      .querySelectorAll<HTMLElement>('.ql-highlightMarker .ql-picker-item')
      .forEach((item) => {
        const color = item.dataset.value
        if (color) {
          item.style.background = `linear-gradient(transparent 50%, ${color} 50%)`
          item.title = color
        }
      })
  }

  // 한글 입력 최적화
  quill.root.setAttribute('spellcheck', 'false')

  // 초기값 설정
  if (props.modelValue) {
    quill.root.innerHTML = props.modelValue
  }

  // 내용 변경 감지
  quill.on('text-change', () => {
    if (!quill) return

    // HTML 가져오기
    let html = quill.root.innerHTML

    // Quill HTML 처리 (RGB → HEX 변환 + margin/padding: 0 추가)
    html = processQuillHtml(html)

    // 빈 내용 처리
    const isEmpty =
      html === '<p style="margin: 0; padding: 0; line-height: 1.5;"><br></p>' || html.trim() === ''
    emit('update:modelValue', isEmpty ? '' : html)
  })
})

// props 변경 감지 (외부에서 값이 변경될 때)
watch(
  () => props.modelValue,
  (newValue) => {
    if (!quill) return

    const currentHtml = quill.root.innerHTML
    const isEmpty =
      currentHtml === '<p style="margin: 0; padding: 0; line-height: 1.5;"><br></p>' ||
      currentHtml.trim() === ''
    const currentValue = isEmpty ? '' : currentHtml

    // 현재 값과 다를 때만 업데이트 (무한 루프 방지)
    if (newValue !== currentValue) {
      quill.root.innerHTML = newValue || ''
    }
  },
)

// readonly 속성 변경 감지
watch(
  () => props.readonly,
  (newValue) => {
    if (!quill) return
    quill.enable(!newValue)
  },
)

onBeforeUnmount(() => {
  if (quill) {
    quill.off('text-change')
  }
  quill = null
})
</script>

<style scoped>
.quill-editor-wrapper {
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
}

.quill-editor {
  min-height: 150px;
  background: white;
}

/* Quill 에디터 내부 스타일 */
:deep(.ql-editor) {
  min-height: 150px;
  font-size: 14px;
  line-height: 1.6;
  font-family: AppleSDGothic, 'malgun gothic', 'nanum gothic', 'Noto Sans KR', sans-serif;
}

/* 모든 블록 요소 margin, padding 제거 */
:deep(.ql-editor p),
:deep(.ql-editor h1),
:deep(.ql-editor h2),
:deep(.ql-editor h3) {
  margin: 0;
  padding: 0;
}

/* 헤더 크기 설정 */
:deep(.ql-editor h1) {
  font-size: 2em;
  font-weight: bold;
}

:deep(.ql-editor h2) {
  font-size: 1.5em;
  font-weight: bold;
}

:deep(.ql-editor h3) {
  font-size: 1.17em;
  font-weight: bold;
}

:deep(.ql-editor.ql-blank::before) {
  color: #aaa;
  font-style: italic;
}

/* ✅ Quill 정렬 클래스 스타일 (에디터 내 미리보기용) */
:deep(.ql-editor .ql-align-center) {
  text-align: center;
}

:deep(.ql-editor .ql-align-right) {
  text-align: right;
}

:deep(.ql-editor .ql-align-justify) {
  text-align: justify;
}

/* 툴바 스타일 */
:deep(.ql-toolbar) {
  background: #f5f5f5;
  border-bottom: 1px solid #ccc;
}

:deep(.ql-toolbar.ql-snow) {
  border: none;
  border-bottom: 1px solid #ccc;
}

:deep(.ql-container.ql-snow) {
  border: none;
}

/* 형광펜 드롭다운 픽커 */
:deep(.ql-snow .ql-toolbar .ql-highlightMarker),
:deep(.ql-snow.ql-toolbar .ql-highlightMarker) {
  width: 36px;
}

:deep(.ql-snow .ql-highlightMarker .ql-picker-label) {
  padding: 2px 4px;
  position: relative;
}

:deep(.ql-snow .ql-highlightMarker .ql-picker-label::before) {
  content: 'ABC';
  font-size: 11px;
  font-weight: bold;
  background: linear-gradient(transparent 50%, #fff555 50%);
  padding: 0 2px;
  display: inline-block;
  line-height: 1.4;
}

:deep(.ql-snow .ql-highlightMarker .ql-picker-label svg) {
  right: 0;
  position: relative;
}

:deep(.ql-snow .ql-highlightMarker .ql-picker-options) {
  padding: 5px;
  width: 152px;
}

:deep(.ql-snow .ql-highlightMarker .ql-picker-item) {
  width: 16px;
  height: 16px;
  border: 1px solid transparent;
  float: left;
  margin: 2px;
  padding: 0;
}

:deep(.ql-snow .ql-highlightMarker .ql-picker-item::before) {
  content: '';
}

:deep(.ql-snow .ql-highlightMarker .ql-picker-item:hover),
:deep(.ql-snow .ql-highlightMarker .ql-picker-item.ql-selected) {
  border-color: #06c;
}
</style>
