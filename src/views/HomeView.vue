<script setup lang="ts">
import AppLayout from '@/components/layout/AppLayout.vue'
import UiUpdateNoticeModal from '@/components/UiUpdateNoticeModal.vue'
import { useBeforeUnload } from '@/composables/useBeforeUnload'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'

// 에디터 전용: 페이지 이탈 경고 활성화
useBeforeUnload()

// 에디터 전용: 키보드 단축키 활성화
useKeyboardShortcuts()
</script>

<template>
  <!-- 에디터 전용: UI 개편 사전 안내 공지 (랜딩에서는 띄우지 않는다) -->
  <UiUpdateNoticeModal />
  <AppLayout />
</template>

