<script setup lang="ts">
/**
 * 웹 링크 최신화 리마인드 팝업 (Figma 1757-5327 '확인 팝업').
 *
 * 링크를 만든 뒤 내용을 고쳤는데 아직 반영하지 않았을 때, 캔버스 오른쪽 아래에 떠서 알린다.
 *
 * **AI 도구 안이 아니라 캔버스 위에 두는 이유**: 링크를 만든 사람은 곧장 다른 메뉴로 옮겨 가
 * 텍스트·이미지를 고친다. 그때 좌측 패널은 이미 AI 도구가 아니라서, 거기 붙은 안내로는
 * 아무도 못 본다. 반영하지 않은 채 끝내면 받는 사람이 옛 내용을 보게 된다.
 *
 * 상태와 실제 반영은 `webLinkStore`에 있다 — 패널과 이 팝업이 같은 것을 본다.
 */
import { useToast } from 'primevue/usetoast'
import { useWebLinkStore, webLinkToast } from '@/stores/webLinkStore'

const webLink = useWebLinkStore()
const toast = useToast()

const apply = async (): Promise<void> => {
  const result = await webLink.createLink()
  const message = webLinkToast(result)
  if (message) toast.add(message)
}
</script>

<template>
  <!-- 뜨고 사라질 때만 부드럽게 — 자리를 차지하지 않는 떠 있는 카드다 -->
  <Transition name="wlr">
    <div v-if="webLink.showReminder" class="wlr" role="status">
      <button
        type="button"
        class="wlr-close"
        aria-label="닫기"
        @click="webLink.dismissReminder()"
      >
        <span class="material-symbols-outlined" aria-hidden="true">close_small</span>
      </button>

      <p class="wlr-text">
        뉴스레터 내용이 변경되었어요.<br />
        HTML 링크에 최신 내용 반영할까요?
      </p>

      <button type="button" class="wlr-btn" :disabled="webLink.uploading" @click="apply">
        {{ webLink.uploading ? '반영하는 중…' : '반영하기' }}
      </button>
    </div>
  </Transition>
</template>

<style scoped>
/* 카드 — Figma 310×auto, 안쪽 여백은 오른쪽만 넓다(닫기 버튼 자리) */
.wlr {
  position: relative;
  width: 310px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 28px 20px 20px;
  border-radius: 16px;
  background: var(--white);
  /* 확인 대화상자(main.css)와 같은 그림자 — 캔버스 위에 뜨는 것끼리 높이를 맞춘다 */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
}

.wlr-text {
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
  color: var(--gray-800);
}

.wlr-btn {
  width: 100%;
  height: 40px;
  padding: 0 16px;
  border: 0;
  border-radius: 8px;
  background: var(--gray-700);
  font-size: 16px;
  font-weight: 500;
  color: var(--white);
  cursor: pointer;
}
.wlr-btn:hover:not(:disabled) {
  background: var(--gray-750);
}
.wlr-btn:disabled {
  cursor: default;
  opacity: 0.6;
}

/* 닫기 — 글자 흐름 밖에 얹어 둔다(Figma 28×28, 위 8·오른쪽 9) */
.wlr-close {
  position: absolute;
  top: 8px;
  right: 9px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--gray-600);
  cursor: pointer;
}
.wlr-close:hover {
  background: var(--gray-100);
  color: var(--gray-800);
}
.wlr-close .material-symbols-outlined {
  font-size: 24px;
}

.wlr-enter-active,
.wlr-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.wlr-enter-from,
.wlr-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (prefers-reduced-motion: reduce) {
  .wlr-enter-active,
  .wlr-leave-active {
    transition: none;
  }
}
</style>
