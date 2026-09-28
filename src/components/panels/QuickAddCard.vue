<template>
  <!--
    원소 모듈 빠른추가 카드 (단일 소스) — CategoryModulePanel(카테고리 레일 메뉴)과
    ColumnComposePanel(빈 컬럼 직접 구성)이 이 컴포넌트를 함께 써서 완전히 같은 모양으로 렌더한다.
  -->
  <button
    type="button"
    class="ui-card quick-add-card"
    :class="{ 'quick-add-card--preview': item.preview }"
    @click="$emit('add', item)"
  >
    <!-- 이미지: 미리보기 플레이스홀더 (단일 1칸 / 2단 2칸) -->
    <template v-if="isImagePreview">
      <div class="qa-preview" :class="{ 'qa-preview--double': item.preview === 'double-image' }">
        <img
          v-for="n in item.preview === 'double-image' ? 2 : 1"
          :key="n"
          :src="item.preview === 'double-image' ? img02 : img01"
          alt=""
          class="qa-preview-img"
        />
      </div>
      <div class="qa-foot">
        <span class="quick-add-label" :style="labelStyle">{{ item.label }}</span>
        <span class="material-symbols-outlined quick-add-icon">add</span>
      </div>
    </template>
    <!-- 버튼: 스타일 버튼 미리보기 (단일 큰 버튼 / 2단 / 작은 알약) -->
    <template v-else-if="isButtonPreview">
      <div
        class="qa-btn-preview"
        :class="{ 'qa-btn-preview--small': item.preview === 'small-button' }"
      >
        <span
          v-for="(t, i) in buttonPreviewLabels"
          :key="i"
          class="qa-btn"
          :class="{ 'qa-btn--small': item.preview === 'small-button' }"
        >{{ t }}</span>
      </div>
      <div class="qa-foot">
        <span class="quick-add-label" :style="labelStyle">{{ item.label }}</span>
        <span class="material-symbols-outlined quick-add-icon">add</span>
      </div>
    </template>
    <!-- 그 외: 라벨 + 추가 아이콘 한 줄 (텍스트 모듈은 실제 폰트 위계대로 라벨 크기가 달라진다) -->
    <template v-else>
      <span class="quick-add-label" :style="labelStyle">{{ item.label }}</span>
      <span class="material-symbols-outlined quick-add-icon">add</span>
    </template>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { QuickAddItem } from '@/utils/quickAddItems'
import img01 from '@/assets/img/img01.png'
import img02 from '@/assets/img/img02.png'

const props = defineProps<{ item: QuickAddItem }>()

defineEmits<{ (e: 'add', item: QuickAddItem): void }>()

const isImagePreview = computed(
  () => props.item.preview === 'single-image' || props.item.preview === 'double-image',
)
const isButtonPreview = computed(
  () =>
    props.item.preview === 'single-button' ||
    props.item.preview === 'double-button' ||
    props.item.preview === 'small-button',
)
// 라벨 크기/굵기 — 텍스트 모듈처럼 폰트 위계가 있는 항목만 지정된다(없으면 공용 16px/500)
const labelStyle = computed(() => ({
  ...(props.item.labelFontSize ? { fontSize: props.item.labelFontSize } : {}),
  ...(props.item.labelFontWeight ? { fontWeight: String(props.item.labelFontWeight) } : {}),
}))
// 버튼 미리보기에 그릴 버튼 라벨들 (각 모듈 기본 텍스트에 맞춤)
const buttonPreviewLabels = computed<string[]>(() => {
  if (props.item.preview === 'double-button') return ['버튼 1 →', '버튼 2 →']
  if (props.item.preview === 'small-button') return ['버튼 1 →']
  return ['큰 버튼 →']
})
</script>

<style scoped>
/* 테두리·배경·호버는 panels.css의 공용 .ui-card — 여기선 배치와 호버 배경만 */
.quick-add-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 20px;
  text-align: left;
}
.quick-add-card:hover {
  background: var(--blue-50);
}
.quick-add-label {
  font-size: 16px;
  font-weight: 500;
  color: var(--gray-800);
}
.quick-add-icon {
  font-size: 24px;
  color: var(--gray-500);
  flex-shrink: 0;
}

/* 미리보기 카드(이미지·버튼) — 상단 미리보기 + 하단 라벨/추가 아이콘 (세로 배치) */
.quick-add-card--preview {
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  padding: 12px;
}
.qa-preview {
  display: flex;
  gap: 10px;
}
.qa-preview-img {
  flex: 1;
  min-width: 0;
  width: 100%;
  height: auto;
  display: block;
  border-radius: 4px;
}

/* 버튼 미리보기 — 실제 버튼 형태로 표시 */
.qa-btn-preview {
  display: flex;
  gap: 8px;
}
.qa-btn-preview--small {
  justify-content: flex-start;
}
.qa-btn {
  flex: 1;
  min-width: 0;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gray-800);
  color: var(--white);
  font-size: 13px;
  font-weight: 700;
  border-radius: 4px;
  white-space: nowrap;
}
/* 작은 버튼: 알약형 회색, 폭 고정(왼쪽 정렬) */
.qa-btn--small {
  flex: 0 0 auto;
  height: 30px;
  padding: 0 18px;
  background: #e5e5e5;
  color: #333333;
  font-weight: 500;
  border-radius: 30px;
}
</style>
