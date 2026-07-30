<template>
  <!-- 아직 구현되지 않은 레일 메뉴(예: AI 도구)용 '준비 중' 안내 패널 -->
  <div class="coming-soon-panel">
    <div class="cs-inner">
      <span class="material-symbols-outlined cs-icon">info</span>
      <p class="cs-text">준비 중입니다.</p>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.coming-soon-panel {
  width: var(--left-panel-width, 360px);
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e5e8eb;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cs-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.cs-icon {
  font-size: 44px;
  color: #8b95a1;
  font-variation-settings: 'wght' 300;
}
.cs-text {
  font-size: 15px;
  color: #8b95a1;
  letter-spacing: -0.15px;
}
</style>
