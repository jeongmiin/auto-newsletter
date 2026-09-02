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

/**
 * 확인창 안내의 `**강조**` 표기를 굵은 조각으로 나눈다.
 *
 * ConfirmDialog의 message는 **문자열만** 받아 태그를 실을 수 없다. v-html로 넣으면
 * 안내 문구 전체가 마크업 통로가 되므로, 표기해 둔 자리만 굵게 만들고 나머지는 글자 그대로 둔다.
 */
const boldParts = (text?: string): Array<{ text: string; bold: boolean }> =>
  (text ?? '')
    .split(/\*\*(.+?)\*\*/g)
    .map((part, i) => ({ text: part, bold: i % 2 === 1 }))
    .filter((part) => part.text !== '')
</script>

<template>
  <Toast position="bottom-right" />
  <ConfirmDialog />
  <!--
    안내가 여러 줄인 확인창(빈 템플릿·전체 삭제)은 폭을 460px로 고정.
    기본 대화상자는 글자 길이에 따라 폭이 달라져, 나란히 쓰는 두 안내의 크기가 서로 어긋난다.
    (`confirm.require({ group: 'wide' })`로 이 대화상자를 쓴다)
  -->
  <ConfirmDialog group="wide" :style="{ width: '460px', maxWidth: 'calc(100vw - 32px)' }">
    <!-- 기본 슬롯 대신 직접 그린다 — `**…**`로 표기한 자리를 굵게 (클래스는 기본과 같게 유지) -->
    <template #message="{ message }">
      <span class="p-confirmdialog-message">
        <template v-for="(part, i) in boldParts(message.message)" :key="i">
          <strong v-if="part.bold">{{ part.text }}</strong>
          <template v-else>{{ part.text }}</template>
        </template>
      </span>
    </template>
  </ConfirmDialog>
  <RouterView />
</template>
