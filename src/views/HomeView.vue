<script setup lang="ts">
import AppLayout from '@/components/layout/AppLayout.vue'
import { useBeforeUnload } from '@/composables/useBeforeUnload'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'

// 에디터 전용: 페이지 이탈 경고 활성화
useBeforeUnload()

// 에디터 전용: 키보드 단축키 활성화
useKeyboardShortcuts()
</script>

<template>
  <AppLayout />
</template>

