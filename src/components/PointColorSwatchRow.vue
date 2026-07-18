<template>
  <div class="flex items-center gap-2">
    <span class="text-xs text-gray-500 shrink-0">포인트 색상</span>
    <div class="flex items-center gap-1.5">
      <button
        v-for="(c, i) in pointColors"
        :key="i"
        type="button"
        class="point-swatch"
        :class="{ 'is-active': activeIndex === i }"
        :style="{ backgroundColor: c }"
        :title="c"
        @click="$emit('select', i)"
      ></button>
    </div>
    <span v-if="activeIndex !== null" class="text-xs text-gray-400">클릭하면 해제</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  /** 사용 가능한 포인트 색상 팔레트 (최대 3개) */
  pointColors: string[]
  /** 현재 이 색상 필드가 따르고 있는 포인트 색상 인덱스. null이면 미사용(직접 지정) */
  activeIndex: number | null
}

defineProps<Props>()
defineEmits<{
  /** 스와치 클릭 — 이미 활성인 스와치를 다시 누르면 해제(off)로 처리하는 것은 호출부 책임 */
  select: [index: number]
}>()
</script>

<style scoped>
.point-swatch {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 2px solid transparent;
  box-shadow: 0 0 0 1px #d1d6db;
  cursor: pointer;
  flex-shrink: 0;
}
.point-swatch.is-active {
  border-color: #fff;
  box-shadow: 0 0 0 2px #4083f3;
}
</style>
