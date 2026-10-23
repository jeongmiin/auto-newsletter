<script setup lang="ts">
/**
 * 캔버스 오른쪽 아래의 웹 링크 팝업 — 두 가지 안내를 한 카드로 띄운다.
 *
 * 1. **최신화 리마인드** (Figma 1757-5327): 링크를 만든 뒤 내용을 고쳤는데 아직 반영하지 않았을 때.
 * 2. **생성 안내** (Figma 1964-11113 · 1971-11436): 캔버스에서 뉴스 헤드라인 헤더의 '웹으로 보기'를
 *    골랐을 때. 링크가 없으면 "생성할까요?" → 만들면 "생성되었어요 · 링크 복사", 이미 있으면 바로 복사.
 *    AI 도구 메뉴까지 가지 않아도 기능을 알아차리고 그 자리에서 끝내게 하려는 것이다.
 *
 * **AI 도구 안이 아니라 캔버스 위에 두는 이유**: 링크를 만든 사람은 곧장 다른 메뉴로 옮겨 가
 * 텍스트·이미지를 고친다. 그때 좌측 패널은 이미 AI 도구가 아니라서, 거기 붙은 안내로는
 * 아무도 못 본다. 반영하지 않은 채 끝내면 받는 사람이 옛 내용을 보게 된다.
 *
 * 상태와 실제 반영은 `webLinkStore`에 있다 — 패널과 이 팝업이 같은 것을 본다.
 */
import { ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useModuleStore } from '@/stores/moduleStore'
import { trackWebLink, useWebLinkStore, webLinkToast } from '@/stores/webLinkStore'
import { track } from '@/analytics/umami'

const webLink = useWebLinkStore()
const moduleStore = useModuleStore()
const toast = useToast()

const apply = async (): Promise<void> => {
  const result = await webLink.createLink()
  // source 로 패널과 갈라 센다 — 이 팝업이 실제로 반영을 이끌어 내는지 보기 위해
  trackWebLink(result, 'reminder')
  const message = webLinkToast(result)
  if (message) toast.add(message)
}

/** 이 안내에서 방금 만들었는지 — "생성되었어요" 문구는 그때만. 다른 모듈을 고르면 잊는다 */
const justCreated = ref(false)
const copied = ref(false)
watch(
  () => moduleStore.selectedModuleId,
  () => {
    justCreated.value = false
    copied.value = false
  },
)

const createFromPrompt = async (): Promise<void> => {
  const result = await webLink.createLink()
  trackWebLink(result, 'prompt')
  if (result.status === 'created' || result.status === 'updated') {
    justCreated.value = true
    return // 카드가 '링크 복사'로 바뀌므로 말풍선은 띄우지 않는다
  }
  const message = webLinkToast(result)
  if (message) toast.add(message)
  else if (result.status === 'failed') toast.add({ severity: 'error', summary: result.message, life: 5000 })
}

let copiedTimer: ReturnType<typeof setTimeout> | null = null
const copyFromPrompt = async (): Promise<void> => {
  const ok = await webLink.copyLink()
  if (!ok) {
    toast.add({ severity: 'warn', summary: '복사하지 못했어요', detail: 'AI 도구 > HTML 웹 링크 생성에서 주소를 복사해 주세요.', life: 5000 })
    return
  }
  track('web_link_copy', { source: 'prompt' })
  copied.value = true
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <!-- 뜨고 사라질 때만 부드럽게 — 자리를 차지하지 않는 떠 있는 카드다 -->
  <Transition name="wlr">
    <!-- 1) 최신화 리마인드 -->
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

    <!-- 2) '웹으로 보기'를 골랐을 때 — 링크 생성 · 복사 -->
    <div v-else-if="webLink.showPrompt" class="wlr wlr--prompt" role="status">
      <button type="button" class="wlr-close" aria-label="닫기" @click="webLink.dismissPrompt()">
        <span class="material-symbols-outlined" aria-hidden="true">close_small</span>
      </button>

      <template v-if="webLink.promptMode === 'create'">
        <p class="wlr-text">HTML 웹 링크를 생성할까요?</p>
        <button
          type="button"
          class="wlr-btn"
          :disabled="webLink.uploading"
          @click="createFromPrompt"
        >
          {{ webLink.uploading ? '생성하는 중…' : '링크 생성하기' }}
        </button>
      </template>

      <template v-else>
        <p class="wlr-text wlr-text--icon">
          <span class="material-symbols-outlined wlr-icon" aria-hidden="true">check_circle</span>
          {{ justCreated ? '링크가 생성되었어요' : 'HTML 웹 링크가 있어요' }}
        </p>
        <button type="button" class="wlr-btn wlr-btn--primary" @click="copyFromPrompt">
          {{ copied ? '복사했어요' : '링크 복사' }}
        </button>
      </template>
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
/* 아이콘이 앞에 붙는 한 줄 (Figma 1971-11436: check_circle 24 + 10) */
.wlr-text--icon {
  display: flex;
  align-items: center;
  gap: 10px;
}
.wlr-icon {
  font-size: 24px;
  color: var(--blue-400);
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
/* 복사 버튼은 파랑 — 만든 뒤 이어지는 한 걸음이라 눈에 띄게 (Figma 1971-11436) */
.wlr-btn--primary {
  background: var(--blue-400);
}
.wlr-btn--primary:hover:not(:disabled) {
  background: var(--blue-500);
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
