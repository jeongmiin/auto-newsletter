<template>
  <div
    @click="$emit('select', module.id)"
    :class="[
      'relative group cursor-pointer border-2 transition-all',
      isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-transparent hover:border-gray-300',
    ]"
  >
    <!-- 모듈 컨텐츠 - isolation 레이어로 CSS 리셋 방지 -->
    <div class="module-content-wrapper">
      <div v-html="renderedHtml" class="module-content"></div>
    </div>

    <!-- 선택시 표시되는 컨트롤 버튼들 -->
    <div
      v-if="isSelected"
      class="absolute top-2 right-2 flex space-x-1 bg-white rounded shadow-md border"
    >
      <button
        @click.stop="$emit('move-up', module.id)"
        :disabled="index === 0"
        class="p-1 text-xs hover:bg-gray-100 disabled:text-gray-300"
        title="위로 이동"
      >
        ↑
      </button>
      <button
        @click.stop="$emit('move-down', module.id)"
        class="p-1 text-xs hover:bg-gray-100"
        title="아래로 이동"
      >
        ↓
      </button>
      <button
        @click.stop="$emit('duplicate', module.id)"
        class="p-1 text-xs hover:bg-gray-100"
        title="복사"
      >
        복사 📋
      </button>
      <button
        @click.stop="$emit('delete', module.id)"
        class="p-1 text-xs hover:bg-gray-100 text-red-600"
        title="삭제"
      >
        삭제 🗑️
      </button>
    </div>

    <!-- 호버시 표시되는 레이블 -->
    <div
      v-if="!isSelected"
      class="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity"
    >
      {{ moduleMetadata?.name }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ModuleInstance } from '@/types'
import { useModuleRenderer } from '@/composables/useModuleRenderer'

interface Props {
  module: ModuleInstance
  index: number
  isSelected: boolean
}

const props = defineProps<Props>()

defineEmits<{
  select: [moduleId: string]
  'move-up': [moduleId: string]
  'move-down': [moduleId: string]
  duplicate: [moduleId: string]
  delete: [moduleId: string]
}>()

const { renderedHtml, moduleMetadata } = useModuleRenderer(props.module.id)
</script>

<style scoped>
/*
  ⚠️ 핵심 문제 해결:

  문제:
  - 테이블의 inline style="padding:30px 20px"가 미리보기에서 무시됨
  - Tailwind preflight가 전역적으로 padding: 0을 적용하기 때문

  해결:
  - 테이블 요소에 padding 값을 명시적으로 허용
  - inline 스타일이 항상 우선순위를 갖도록 설정
*/

/* CSS 격리 레이어 */
.module-content-wrapper {
  isolation: isolate;
}

.module-content :deep(*) {
  max-width: 100%;
}

.module-content :deep(img) {
  max-width: 100%;
  height: auto;
}

/*
  ✅ 테이블 inline 스타일 보존 전략:

  문제:
  - Tailwind preflight의 * { margin: 0 }이 inline style을 덮어쓸 수 있음
  - 테이블의 style="padding:30px 20px"이 적용 안 됨

  해결:
  - 테이블 요소들만 all: unset으로 리셋 해제
  - 그 다음 필요한 기본 스타일만 재적용
*/

/*
  ✅ 최종 해결책: inline 스타일 강제 적용

  문제:
  - Tailwind의 * { margin: 0 }이 inline 스타일을 덮어씀
  - all: unset도 작동하지 않음

  해결:
  - 테이블 요소에 대해서만 전역 리셋을 무효화
  - initial 또는 unset 사용하여 브라우저 기본값으로 복원
*/

.module-content :deep(table) {
  border-spacing: 0;
  border-collapse: collapse;
  /* Tailwind/base.css의 margin: 0을 무효화 */
  margin: initial;
  padding: initial;
}

/*
  Quill 에디터 콘텐츠 스타일 - 미리보기에서 서식 표시
  블록 요소: margin, padding 제거 (인라인 스타일과 일치)
  단, td/th 내부의 텍스트 요소만 적용하여 테이블 자체의 padding은 보존
*/
.module-content :deep(td p),
.module-content :deep(td h1),
.module-content :deep(td h2),
.module-content :deep(td h3),
.module-content :deep(th p),
.module-content :deep(th h1),
.module-content :deep(th h2),
.module-content :deep(th h3) {
  margin: 0 !important;
  padding: 0 !important;
}

.module-content :deep(strong) {
  font-weight: 700;
}

.module-content :deep(em) {
  font-style: italic;
}

.module-content :deep(u) {
  text-decoration: underline;
}

.module-content :deep(s) {
  text-decoration: line-through;
}

.module-content :deep(ul) {
  padding: 0;
  margin: 0;
}
.module-content :deep(ol) {
  padding: 0;
  margin: 0;
  counter-reset: item;
  list-style: none;
}

.module-content :deep(li) {
  margin: 0.25em 0;
}
.module-content :deep(ol li) {
  counter-increment: item;
}
.module-content :deep(ol li::before) {
  content: counter(item) '. ';
  font-weight: bold;
}

/* data-list="bullet"일 때 · 표시 */
.module-content :deep(ol:has(li[data-list='bullet'])) {
  counter-reset: none;
}

.module-content :deep(ol li[data-list='bullet']) {
  counter-increment: none;
}

.module-content :deep(ol li[data-list='bullet']::before) {
  content: '· ';
  font-weight: 700;
}
.module-content :deep(a) {
  color: #0066cc;
  font-weight: 600;
  text-decoration: underline;
}

/* 헤더 크기 설정 (margin은 위의 통합 규칙에서 0으로 설정됨) */
.module-content :deep(h1) {
  font-size: 22px;
  font-weight: 700;
}

.module-content :deep(h2) {
  font-size: 20px;
  font-weight: 700;
}

.module-content :deep(h3) {
  font-size: 18px;
  font-weight: 700;
}
</style>
