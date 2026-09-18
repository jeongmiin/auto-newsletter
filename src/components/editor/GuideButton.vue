<script setup lang="ts">
/**
 * 뉴스레터 가이드 버튼 (Figma 1733-6731 / 1733-7317).
 *
 * 캔버스 왼쪽 아래에 떠 있는 동그란 '?' 버튼. 마우스를 올리면 오른쪽으로 늘어나며
 * '뉴스레터 가이드 보기'가 따라 나온다. 아이콘 자리는 그대로 두고 **오른쪽으로만** 늘어나므로
 * 버튼이 제자리에서 펼쳐지는 것처럼 보인다. 누르면 가이드 PDF를 내려받는다.
 *
 * 자리는 AppLayout이 정한다 — 캔버스 열 안에 놓여 있어 좌측 패널을 넓히면 같이 밀려난다.
 */
import { onMounted, ref, useTemplateRef } from 'vue'

/**
 * 내려받을 가이드 PDF.
 *
 * 파일은 `public/guide/` 에 둔다 — public 은 빌드가 손대지 않고 그대로 복사하므로
 * 파일만 바꿔 넣으면 코드를 고치지 않아도 된다.
 *
 * ⚠ 주소 앞에 `BASE_URL` 을 붙여야 한다. 배포는 `/auto-newsletter/` 같은 하위 경로에 올라가서,
 *   `/guide/...` 로 적으면 도메인 최상위를 찾아 404가 난다.
 */
const GUIDE_FILE = 'guide/newsletter-guide.pdf'
/** 내려받을 때 저장될 이름 */
const GUIDE_SAVE_NAME = '뉴스레터 가이드.pdf'
const guideUrl = `${import.meta.env.BASE_URL}${GUIDE_FILE}`

/**
 * 펼쳤을 때의 너비를 **글자를 직접 재서** 정한다.
 *
 * `width: max-content`로 두면 CSS가 47px → max-content 사이를 보간하지 못해 툭 끊긴다.
 * 실제 px 값이 있어야 스르륵 늘어난다. 글꼴이 늦게 와서 글자 폭이 달라지므로 폰트 로딩 뒤 한 번 더 잰다.
 */
const COLLAPSED_WIDTH = 47
const LABEL_GAP = 12
const labelEl = useTemplateRef<HTMLSpanElement>('labelEl')
const openWidth = ref(193)

const measureOpenWidth = (): void => {
  const width = labelEl.value?.getBoundingClientRect().width
  if (width) openWidth.value = Math.ceil(COLLAPSED_WIDTH + LABEL_GAP + width)
}

onMounted(() => {
  measureOpenWidth()
  void document.fonts?.ready.then(measureOpenWidth)
})

</script>

<template>
  <!-- 링크로 두면 새 탭 열기·주소 복사 같은 브라우저 기본 동작이 그대로 살아난다 -->
  <a
    class="guide-fab"
    :href="guideUrl"
    :download="GUIDE_SAVE_NAME"
    :style="{ '--guide-open-width': `${openWidth}px` }"
    aria-label="뉴스레터 가이드 내려받기"
  >
    <span class="material-symbols-outlined guide-icon" aria-hidden="true">question_mark</span>
    <span ref="labelEl" class="guide-label">뉴스레터 가이드 보기</span>
  </a>
</template>

<style scoped>
.guide-fab {
  position: absolute;
  left: 11px;
  bottom: 18px;
  z-index: 5;

  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  box-sizing: border-box;
  height: 47px;
  width: 47px;
  padding: 0 15px;
  border: 1px solid var(--blue-400);
  border-radius: 20rem;
  background: var(--white);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  text-decoration: none;
  overflow: hidden;
  white-space: nowrap;
  transition: width 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}
.guide-fab:hover,
.guide-fab:focus-visible {
  width: var(--guide-open-width, 193px);
}

.guide-icon {
  flex-shrink: 0;
  display: inline-flex;
  justify-content: center;
  width: 17px;
  font-size: 22px;
  color: var(--blue-400);
}

.guide-label {
  /* 줄어들지 않아야 글자 폭을 제대로 잴 수 있다(좁을 땐 overflow가 가린다) */
  flex-shrink: 0;
  margin-left: 12px;
  font-size: 16px;
  font-weight: 500;
  color: var(--gray-800);
  /* 상자가 열리는 동안에는 비어 있다가 뒤늦게 떠오른다 — 글자가 왼쪽 벽에서 밀려나오지 않게 */
  opacity: 0;
  transition: opacity 0.14s ease;
}
.guide-fab:hover .guide-label,
.guide-fab:focus-visible .guide-label {
  opacity: 1;
  /* 상자가 어느 정도 열린 뒤에 나타난다 */
  transition: opacity 0.22s ease 0.12s;
}

/* 움직임을 줄여 달라고 설정한 사용자에게는 펼침만 하고 애니메이션은 뺀다 */
@media (prefers-reduced-motion: reduce) {
  .guide-fab,
  .guide-label,
  .guide-fab:hover .guide-label,
  .guide-fab:focus-visible .guide-label {
    transition: none;
  }
}
</style>
