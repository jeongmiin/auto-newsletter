<script setup lang="ts">
import { watch } from 'vue'
import { RouterView } from 'vue-router'
import { useEditorStore } from '@/stores/editorStore'
import { pointColorAt } from '@/utils/pointColor'
import UpdateNoticeModal from '@/components/UpdateNoticeModal.vue'

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
  <!--
    9월 28일 개편 사전 안내(한시적) — 어느 화면으로 들어와도 한 번은 보게 여기에 둔다.
    뜨는 건 '템플릿 선택'부터다(랜딩은 덮지 않는다). 랜딩으로 들어온 사람에게도 넘어가는
    순간 뜨도록, 모달이 화면 이동을 지켜본다. 에디터에서도 뜬다: 만들던 작업을 파일로
    받아 두라는 안내라, 거기 있는 사람이 곧 대상이다.
    ⚠ 9/28 develop을 머지할 때 **이 줄과 컴포넌트를 반드시 지울 것** — 저절로 사라지지 않는다.
  -->
  <UpdateNoticeModal />
  <RouterView />
</template>
