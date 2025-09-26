<template>
  <div class="h-screen flex bg-gray-50">
    <!-- 왼쪽 모듈 패널 -->
    <ModulePanel class="w-80 border-r bg-white" />

    <!-- 중앙 캔버스 -->
    <div class="flex-1 flex flex-col">
      <!-- 상단 툴바 -->
      <EditorToolbar class="border-b bg-white" />

      <!-- 캔버스 영역 -->
      <CanvasArea class="flex-1" />
    </div>

    <!-- 오른쪽 속성 패널 -->
    <PropertiesPanel class="w-80 border-l bg-white" />
  </div>
</template>

<script setup lang="ts">
import ModulePanel from '@/components/panels/ModulePanel.vue'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import CanvasArea from '@/components/editor/CanvasArea.vue'
import PropertiesPanel from '@/components/panels/PropertiesPanel.vue'
</script>
