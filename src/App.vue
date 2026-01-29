<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useBeforeUnload } from '@/composables/useBeforeUnload'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'

// 페이지 이탈 경고 활성화
useBeforeUnload()

// 키보드 단축키 활성화
useKeyboardShortcuts()
</script>

<template>
  <Toast position="top-right" />
  <ConfirmDialog />
  <RouterView />
</template>
