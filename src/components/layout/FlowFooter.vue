<script setup lang="ts">
/**
 * 템플릿 선택·폴더 선택 화면의 하단 바 (Figma 1468-8970 / 1468-9089).
 *
 * 두 화면이 같은 자리·같은 치수를 쓰도록 한 곳에 둔다 —
 *   높이 96 · 위 선 gray-200 · 왼쪽 85px에 "아이콘 + 라벨 + 값" 안내 · 오른쪽 71px에 버튼(사이 12px).
 * 사이드바 오른쪽 열 안에 놓는다(사이드바는 화면 끝까지 내려오고 선은 그 오른쪽에서만 그어진다).
 *
 * 슬롯:
 *   - `info`   왼쪽 안내(없으면 비워 둔다). 안에서 `.flow-info-*` 클래스를 쓴다.
 *   - default  오른쪽 버튼들. `.flow-btn` + `--ghost`/`--primary` 를 쓴다.
 * 버튼·안내 스타일은 슬롯 내용(부모 스코프)에 닿아야 하므로 아래 <style> 은 전역이다.
 */
</script>

<template>
  <footer class="flow-footer">
    <div class="flow-footer-info">
      <slot name="info" />
    </div>
    <div class="flow-footer-actions">
      <slot />
    </div>
  </footer>
</template>

<style>
.flow-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  height: 96px;
  padding: 0 71px 0 85px;
  border-top: 1px solid var(--gray-200);
  background: var(--white);
  flex-shrink: 0;
}
.flow-footer-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.flow-footer-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

/* 왼쪽 안내 한 줄 — [아이콘 24][4px]라벨 15px gray-600 [12px] 값 16px gray-700 */
.flow-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  line-height: 24px;
}
.flow-info-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-size: 15px;
  color: var(--gray-600);
}
.flow-info-label .material-symbols-outlined {
  font-size: 24px;
}
.flow-info-value {
  font-size: 16px;
  color: var(--gray-700);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 아직 고른 것이 없을 때의 값 */
.flow-info-value--empty {
  color: var(--gray-400);
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
