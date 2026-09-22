<script setup lang="ts">
/**
 * 뉴스레터 가이드 버튼 (Figma 1733-6731 / 1733-7317).
 *
 * 동그란 '?' 버튼. 마우스를 올리면 오른쪽으로 늘어나며 '뉴스레터 가이드 보기'가 따라 나온다.
 * 아이콘 자리는 그대로 두고 **오른쪽으로만** 늘어나므로 버튼이 제자리에서 펼쳐지는 것처럼 보인다.
 * 누르면 가이드 PDF를 내려받는다. 화면에 들어온 직후에는 5초간 펼쳐진 채로 알린다.
 *
 * **자리는 쓰는 쪽이 정한다** — 이 컴포넌트는 생김새와 펼침만 맡는다.
 * - 에디터(AppLayout): 캔버스 왼쪽 아래에 띄운다. 좌측 패널을 넓히면 같이 밀려난다.
 * - 템플릿·폴더 선택(FlowFooter): 하단 바 왼쪽 끝에 놓는다.
 */
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
// 랜딩의 '이용 가이드 내려받기'와 같은 파일이라 주소를 constants/guide.ts 한 곳에 둔다
import { GUIDE_PDF_SAVE_NAME, GUIDE_PDF_URL } from '@/constants/guide'

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

/**
 * 화면에 들어오면 **펼친 채로 5초** 머물다 접힌다 — 버튼이 있다는 걸 한 번은 알리려는 것.
 * 그 뒤로는 평소대로 마우스를 올렸을 때만 펼쳐진다.
 *
 * 5초를 기다리는 동안 마우스를 올리면 안내는 그 자리에서 끝낸다.
 * 안 그러면 마우스를 뗐는데도 남은 시간만큼 펼쳐진 채로 있어 고장 난 것처럼 보인다.
 * (펼침 자체는 :hover 가 이어받으므로 화면은 그대로다.)
 *
 * ⚠ 펼치는 건 **글꼴이 온 뒤**다. 먼저 펼치면 대체 글꼴로 잰 폭으로 열렸다가
 *   진짜 글꼴이 와서 폭이 줄어드는 게 그대로 보인다(206px → 192px로 움찔).
 */
const INTRO_MS = 5000
const introOpen = ref(false)
let introTimer: ReturnType<typeof setTimeout> | undefined
/** 글꼴을 기다리는 사이에 마우스가 먼저 닿았으면 안내는 건너뛴다 */
let introDone = false

const endIntro = (): void => {
  clearTimeout(introTimer)
  introDone = true
  introOpen.value = false
}

const startIntro = (): void => {
  measureOpenWidth()
  if (introDone) return
  introOpen.value = true
  introTimer = setTimeout(endIntro, INTRO_MS)
}

onMounted(() => {
  measureOpenWidth()
  if (document.fonts?.ready) void document.fonts.ready.then(startIntro)
  else startIntro()
})

// 사라진 뒤에 타이머가 깨어나지 않도록 — 화면을 옮겨 다니면 매번 새로 붙는다
onBeforeUnmount(() => clearTimeout(introTimer))

</script>

<template>
  <!-- 링크로 두면 새 탭 열기·주소 복사 같은 브라우저 기본 동작이 그대로 살아난다 -->
  <a
    class="guide-fab"
    :class="{ 'is-open': introOpen }"
    :href="GUIDE_PDF_URL"
    :download="GUIDE_PDF_SAVE_NAME"
    :style="{ '--guide-open-width': `${openWidth}px` }"
    aria-label="뉴스레터 가이드 내려받기"
    @mouseenter="endIntro"
    @focus="endIntro"
  >
    <span class="material-symbols-outlined guide-icon" aria-hidden="true">question_mark</span>
    <span ref="labelEl" class="guide-label">뉴스레터 가이드 보기</span>
  </a>
</template>

<style scoped>
/* 자리는 쓰는 쪽이 정한다 — 에디터는 캔버스 위에 띄우고, 템플릿·폴더 선택은 하단 바에 놓는다 */
.guide-fab {
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
.guide-fab:focus-visible,
.guide-fab.is-open {
  width: var(--guide-open-width, 193px);
}

.guide-icon {
  flex-shrink: 0;
  display: inline-flex;
  justify-content: center;
  width: 16px;
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
.guide-fab:focus-visible .guide-label,
.guide-fab.is-open .guide-label {
  opacity: 1;
  /* 상자가 어느 정도 열린 뒤에 나타난다 */
  transition: opacity 0.22s ease 0.12s;
}

/* 움직임을 줄여 달라고 설정한 사용자에게는 펼침만 하고 애니메이션은 뺀다 */
@media (prefers-reduced-motion: reduce) {
  .guide-fab,
  .guide-label,
  .guide-fab:hover .guide-label,
  .guide-fab:focus-visible .guide-label,
  .guide-fab.is-open .guide-label {
    transition: none;
  }
}
</style>
