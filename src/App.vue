<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <Toast position="bottom-right" />
  <ConfirmDialog />
  <RouterView />
</template>
