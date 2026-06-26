<script setup lang="ts">
import { watch } from 'vue'
import { RouterView } from 'vue-router'
import { useEditorStore } from '@/stores/editorStore'

// 전역 포인트 색상을 :root CSS 변수(--point-color)로 노출한다.
// 본문(리치 텍스트)에서 '포인트 색상으로 사용'한 인라인 색상이
// 에디터·미리보기에서 이 변수를 따라 실시간으로 바뀐다. (이메일 내보내기 시엔 실제 값으로 치환)
const editorStore = useEditorStore()
watch(
  () => editorStore.wrapSettings.pointColor,
  (color) => {
    document.documentElement.style.setProperty('--point-color', color || '#2563eb')
  },
  { immediate: true },
)
</script>

<template>
  <Toast position="bottom-right" />
  <ConfirmDialog />
  <RouterView />
</template>
