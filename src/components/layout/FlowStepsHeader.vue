<script setup lang="ts">
/**
 * 뉴스레터를 시작하는 세 걸음을 보여주는 상단 바 (Figma 1334-7951).
 *
 *   ✓ 템플릿 선택 — ② 폴더 선택 — ③ 에디터
 *
 * 템플릿 선택·폴더 선택 화면이 함께 쓴다. 에디터에 들어가면 작업용 헤더(AppHeader)로 바뀐다.
 */
import { useRouter } from 'vue-router'

const props = defineProps<{
  /** 지금 걸음 (1=템플릿 선택, 2=폴더 선택) */
  current: 1 | 2
}>()

const router = useRouter()

const STEPS = [
  { no: 1, label: '템플릿 선택' },
  { no: 2, label: '폴더 선택' },
  { no: 3, label: '에디터' },
] as const

const stateOf = (no: number): 'done' | 'current' | 'todo' =>
  no < props.current ? 'done' : no === props.current ? 'current' : 'todo'
</script>

<template>
  <header class="fs-header">
    <button type="button" class="fs-home" title="처음으로" @click="router.push('/')">
      <span class="material-symbols-outlined">home</span>
    </button>

    <nav class="fs-steps">
      <template v-for="(step, i) in STEPS" :key="step.no">
        <span v-if="i > 0" class="fs-line"></span>
        <span class="fs-step" :class="`is-${stateOf(step.no)}`">
          <span class="fs-badge">
            <span v-if="stateOf(step.no) === 'done'" class="material-symbols-outlined">check</span>
            <template v-else>{{ step.no }}</template>
          </span>
          <span class="fs-label">{{ step.label }}</span>
        </span>
      </template>
    </nav>
  </header>
</template>

<style scoped>
.fs-header {
  position: relative;
  display: flex;
  align-items: center;
  height: 60px;
  padding: 0 20px;
  background: var(--white);
  border-bottom: 1px solid var(--gray-200);
  flex-shrink: 0;
}
.fs-home {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: none;
  color: var(--gray-800);
  cursor: pointer;
  border-radius: 8px;
}
.fs-home:hover {
  background: var(--gray-100);
}
.fs-home .material-symbols-outlined {
  font-size: 31px;
}

/* 걸음 표시는 화면 한가운데 — 좌측 홈 버튼 폭에 밀리지 않도록 절대 배치 */
.fs-steps {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 60px;
  width: 70%;
}
.fs-line {
  width: 35px;
  height: 1px;
  background: var(--gray-300);
}
.fs-step {
  display: flex;
  align-items: center;
  gap: 10px;
}
.fs-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 1000px;
  font-size: 14px;
  font-weight: 500;
}
.fs-label {
  font-size: 16px;
  color: var(--gray-700);
}

/* 지나온 걸음 — 옅은 파란 원 안에 체크 */
.fs-step.is-done .fs-badge {
  background: var(--blue-50);
  color: var(--blue-500);
}
.fs-step.is-done .fs-badge .material-symbols-outlined {
  font-size: 18px;
}
/* 지금 걸음 — 채운 파란 원 + 진한 라벨 */
.fs-step.is-current .fs-badge {
  background: var(--blue-400);
  color: var(--white);
}
.fs-step.is-current .fs-label {
  color: var(--gray-800);
  font-weight: 600;
}
/* 아직 안 온 걸음 — 테두리만 */
.fs-step.is-todo .fs-badge {
  border: 1px solid var(--gray-400);
  color: var(--gray-400);
}
</style>
