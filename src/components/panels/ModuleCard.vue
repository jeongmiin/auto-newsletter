<template>
  <!--
    모듈 팔레트 카드 (단일 소스) — ModulePanel.vue(모듈 탭)와 CategoryModulePanel.vue(레일 갤러리)가
    이 컴포넌트를 함께 사용해 완전히 동일한 UI로 렌더한다.
    썸네일 축소 비율(THUMB_SCALE)은 CSS 변수로 주입해 JS 상수와 항상 일치시킨다.
  -->
  <div
    ref="rootEl"
    class="module-card"
    :data-module-id="module.id"
    :style="{ '--thumb-scale': THUMB_SCALE }"
    @click="$emit('add', module)"
  >
    <!-- 상시 썸네일 (호버 없이 카드에 바로 표시) — 높이는 각 iframe 실제 콘텐츠 높이×스케일 -->
    <div class="module-thumb" :style="{ height: `${boxHeight}px` }">
      <iframe
        v-if="srcdoc"
        :srcdoc="srcdoc"
        class="module-thumb-iframe"
        :style="{ height: `${iframeHeight}px` }"
        title="모듈 미리보기"
        sandbox="allow-same-origin"
        @load="$emit('thumb-load', $event)"
      ></iframe>
      <div v-else class="module-thumb-loading">
        <i :class="module.icon" class="text-2xl text-gray-300"></i>
      </div>
    </div>
    <div class="module-card-label">{{ module.name }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ModuleMetadata } from '@/types'
import { THUMB_SCALE } from '@/composables/useModuleThumbnails'

// 부모(ModulePanel·CategoryModulePanel)가 IntersectionObserver로 관찰할 수 있도록 루트 DOM을 노출한다.
// (컴포넌트 ref의 $el은 <script setup>에서 안정적이지 않아 Element가 아닌 값이 넘어와 크래시가 났었음)
const rootEl = ref<HTMLElement | null>(null)
defineExpose({ rootEl })

defineProps<{
  module: ModuleMetadata
  /** 렌더된 iframe srcdoc (없으면 로딩 플레이스홀더) */
  srcdoc?: string
  /** iframe 실제 콘텐츠 높이(미스케일 px) */
  iframeHeight: number
  /** 카드 썸네일 박스 높이(스케일 반영 px) */
  boxHeight: number
}>()

defineEmits<{
  (e: 'add', module: ModuleMetadata): void
  (e: 'thumb-load', event: Event): void
}>()
</script>

<style scoped>
/* 모듈 카드 — 폭 308px 고정, 인라인 썸네일 + 라벨 (패널 360px − 테두리 1px − 좌우 25px 여백에 맞춤) */
.module-card {
  width: 308px;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background: var(--white);
  transition: border-color 0.12s;
}
.module-card:hover {
  border-color: var(--blue-400);
}

/* 인라인 썸네일 — 680px 렌더를 카드 폭에 맞춰 축소, 상단 크롭 */
.module-thumb {
  width: 100%;
  padding: 10px;
  overflow: hidden;
  background: var(--white);
  border-bottom: 1px solid var(--gray-200);
  position: relative;
  box-sizing: border-box;
}
.module-thumb-iframe {
  width: 680px;
  /* height는 실제 콘텐츠 높이로 인라인 지정 */
  border: 0;
  display: block;
  background: var(--white);
  /* 축소 비율은 THUMB_SCALE(JS 상수)을 CSS 변수로 주입 — 단일 소스 */
  transform: scale(var(--thumb-scale));
  transform-origin: top left;
  border-radius: 0.5rem;
  pointer-events: none;
}
.module-thumb-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.module-card-label {
  padding: 12px;
  background: var(--gray-50);
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-800);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
