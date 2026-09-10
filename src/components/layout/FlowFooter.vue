<script setup lang="ts">
/**
 * 템플릿 선택·폴더 선택 화면의 하단 바 (Figma 1468-8970 / 1468-9089).
 *
 * 두 화면이 같은 자리·같은 치수를 쓰도록 한 곳에 둔다 —
 *   높이 96 · 위 선 gray-200 · 오른쪽 71px에 버튼(사이 12px).
 * 사이드바 오른쪽 열 안에 놓는다(사이드바는 화면 끝까지 내려오고 선은 그 오른쪽에서만 그어진다).
 *
 * 왼쪽 안내(`info` 슬롯)는 없앴다 — 템플릿 선택은 카드 이름 옆 체크가, 폴더 선택은
 * 목록 위 경로 줄이 같은 것을 알린다. 둘 다 고르는 자리 바로 옆이라 눈을 뗄 필요가 없다.
 *
 * 슬롯: default — 오른쪽 버튼들. `.flow-btn` + `--ghost`/`--primary` 를 쓴다.
 * 버튼 스타일은 슬롯 내용(부모 스코프)에 닿아야 하므로 아래 <style> 은 전역이다.
 */
</script>

<template>
  <footer class="flow-footer">
    <div class="flow-footer-actions">
      <slot />
    </div>
  </footer>
</template>

<style>
.flow-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 24px;
  height: 96px;
  padding: 0 71px 0 85px;
  border-top: 1px solid var(--gray-200);
  background: var(--white);
  flex-shrink: 0;
}
.flow-footer-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

/* 버튼 — 17px medium · 14/36 패딩 · rounded-8 */
.flow-btn {
  padding: 14px 36px;
  border: 0;
  border-radius: 8px;
  font-size: 17px;
  font-weight: 500;
  line-height: normal;
  white-space: nowrap;
  cursor: pointer;
}
.flow-btn--ghost {
  background: var(--gray-100);
  color: var(--gray-750);
}
.flow-btn--ghost:hover:not(:disabled) {
  background: var(--gray-200);
}
.flow-btn--primary {
  background: var(--blue-400);
  color: var(--white);
}
.flow-btn--primary:hover:not(:disabled) {
  background: var(--blue-500);
}
.flow-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
