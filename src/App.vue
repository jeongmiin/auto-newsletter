<script setup lang="ts">
import { watch } from 'vue'
import { RouterView } from 'vue-router'
import { useEditorStore } from '@/stores/editorStore'
import { pointColorAt } from '@/utils/pointColor'

// 전역 포인트 색상(최대 3개)을 :root CSS 변수(--point-color-0/1/2)로 노출한다.
// 본문(리치 텍스트)에서 '포인트 색상으로 사용'한 인라인 색상이 선택한 인덱스별로
// 에디터·미리보기에서 이 변수를 따라 실시간으로 바뀐다. (이메일 내보내기 시엔 실제 값으로 치환)
// --point-color(인덱스 없음)는 이전에 저장된 콘텐츠와의 하위호환용 별칭 — 항상 0번과 동일하게 유지.
const editorStore = useEditorStore()
watch(
  () => editorStore.wrapSettings.pointColors,
  (colors) => {
    const root = document.documentElement.style
    for (let i = 0; i < 3; i++) {
      root.setProperty(`--point-color-${i}`, pointColorAt(colors, i))
    }
    root.setProperty('--point-color', pointColorAt(colors, 0))
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <Toast position="bottom-right" />
  <ConfirmDialog />
  <RouterView />
</template>
