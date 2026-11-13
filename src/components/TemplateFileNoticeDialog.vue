<script setup lang="ts">
/**
 * 공지 팝업 — 템플릿 선택 화면에 들어오면 한 번 띄운다. 지금 내용은 **2단 모듈 '모바일 배치' 안내**.
 *
 * 모양은 9월 28일 개편 사전 안내 모달(UpdateNoticeModal, 770423f)을 그대로 잇는다 —
 * 머리의 확성기 아이콘, 파란 리드, 그림 상자, 회색 순서 상자, 아래 체크박스 + 확인.
 * 공지는 늘 같은 틀로 나와야 "또 그 안내구나"로 읽힌다. (파일 이름은 처음 공지 때 것을 그대로 쓴다 — 자리는 같다)
 *
 * 노출 규칙:
 * - 그냥 닫으면(확인·X·ESC·바깥 클릭) 아무것도 기억하지 않는다 → 템플릿 선택 화면에 다시 들어오면 또 뜬다.
 * - '다시 보지 않기'를 켜고 닫으면 → 이 브라우저에서 **이 안내는** 다시 띄우지 않는다(localStorage).
 *   기억 키에 안내 버전을 붙이므로(NOTICE_KEY), 다음 안내는 키만 바꾸면 끈 사람에게도 새로 간다.
 *   어느 길로 닫아도 체크 상태를 반영한다 — visible 이 꺼지는 것을 본다.
 * - 저장소 접근은 try/catch — 시크릿 창·차단 설정에서는 그냥 매번 띄운다(안내가 안 뜨는 쪽보다 낫다).
 */
import { onMounted, ref, watch } from 'vue'
import rowShot from '@/assets/img/notice/mobile-layout-row.png'
import panelShot from '@/assets/img/notice/mobile-layout-panel.png'
import beforeShot from '@/assets/img/notice/mobile-layout-before.png'
import afterShot from '@/assets/img/notice/mobile-layout-after.png'

/**
 * 안내 버전 — 내용이 바뀌어 다시 보여줘야 하면 끝 숫자를 올린다.
 * v1: 템플릿 파일 받기 · v2: AI 도구 업데이트(10/23) · v3: 2단 모듈 모바일 배치
 */
const NOTICE_KEY = 'notice.template-file.v3'
/** 공지를 띄울지 — 공지를 내릴 때 false 로 끈다(컴포넌트·그림은 다음 공지 때 다시 쓴다) */
const NOTICE_ENABLED = false

const visible = ref(false)
const hideChecked = ref(false)

/** '다시 보지 않기'를 눌러 둔 안내인가 */
const hiddenForGood = (): boolean => {
  try {
    return localStorage.getItem(NOTICE_KEY) === 'hidden'
  } catch {
    return false
  }
}
/** 체크하고 닫았을 때만 기억한다 */
const hideForGood = (): void => {
  try {
    localStorage.setItem(NOTICE_KEY, 'hidden')
  } catch {
    /* 저장 못 하면 다음에 또 띄울 뿐이다 */
  }
}

onMounted(() => {
  if (!NOTICE_ENABLED || hiddenForGood()) return
  visible.value = true
})

// 어느 길로 닫아도(확인·ESC·X·바깥 클릭) 체크했으면 다시 띄우지 않는다. 체크 없이 닫으면 아무것도 남기지 않는다.
watch(visible, (now, before) => {
  if (!(before && !now)) return
  if (hideChecked.value) hideForGood()
})
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :draggable="false"
    class="tfn-dialog"
    :style="{ width: 'min(600px, 92vw)' }"
  >
    <template #header>
      <div class="tfn-head">
        <span class="material-symbols-outlined tfn-head-icon" aria-hidden="true">campaign</span>
        <span class="tfn-head-title">2단 모듈에 ‘모바일 배치’ 기능 추가</span>
      </div>
    </template>

    <p class="tfn-lead is-first">
      PC에서 좌우로 배치한 이미지와 텍스트가 모바일에서 위아래로 쌓이면서 원하는 순서와 다르게 보였나요?
    </p>
    <p class="tfn-lead">
      이제 <strong>PC 화면의 배치는 그대로 유지</strong>하면서, 모바일 화면에서 콘텐츠가 표시되는 순서를
      <strong>자유롭게 설정</strong>할 수 있어요.
    </p>
    <!-- 미리 알리는 안내 — 기능은 아래 날짜에 반영된다. 반영 뒤에는 이 줄을 지운다 -->
    <p class="tfn-date"><span class="tfn-date-tag">반영 일정</span>2026년 11월 13일(금)</p>

    <section class="tfn-section">
      <h3 class="tfn-h3">이렇게 활용해 보세요</h3>
      <!-- 같은 뉴스레터(모듈 07 → 07 반대 방향)를 모바일 보기로 찍은 그림 — 두 번째 행만 '이미지 위'로 바꿨다 -->
      <div class="tfn-compare">
        <figure class="tfn-compare-item">
          <img :src="beforeShot" width="780" height="1626" alt="기존: 모바일에서 이미지, 글, 글, 이미지 순서로 쌓임" />
          <figcaption>기존 배치 <span>이미지 → 글 → 글 → 이미지</span></figcaption>
        </figure>
        <span class="material-symbols-outlined tfn-where-arrow" aria-hidden="true">arrow_forward</span>
        <figure class="tfn-compare-item is-after">
          <img :src="afterShot" width="780" height="1626" alt="모바일 배치 적용: 이미지, 글, 이미지, 글 순서로 쌓임" />
          <figcaption>모바일 배치 적용 <span>이미지 → 글 → 이미지 → 글</span></figcaption>
        </figure>
      </div>
    </section>

    <section class="tfn-section">
      <h3 class="tfn-h3">어디에서 설정하나요?</h3>
      <!-- 캔버스에서 2단 행을 고른 모습(A·B 표시) → 왼쪽 패널의 모바일 배치 카드. 둘 다 에디터를 그대로 찍은 그림(2배 해상도) -->
      <div class="tfn-where">
        <img :src="rowShot" width="1456" height="538" alt="2단 행을 클릭하면 칸마다 A, B 표시가 붙은 캔버스" class="tfn-where-row" />
        <span class="material-symbols-outlined tfn-where-arrow" aria-hidden="true">arrow_forward</span>
        <img :src="panelShot" width="674" height="406" alt="왼쪽 패널의 모바일 배치 카드 두 장" class="tfn-where-panel" />
      </div>
      <div class="tfn-flow">
        <div class="tfn-flow-row">
          <span class="tfn-flow-tag">1</span>
          <span class="tfn-flow-steps">
            <strong>2단 모듈</strong>을 선택하면 각 칸에 <strong>A·B 표시</strong>가 나타납니다.
          </span>
        </div>
        <div class="tfn-flow-row">
          <span class="tfn-flow-tag">2</span>
          <span class="tfn-flow-steps">
            왼쪽 설정 패널 하단의 <strong>‘모바일 배치’</strong>에서 위쪽에 표시할 칸을 선택하세요.
          </span>
        </div>
        <div class="tfn-flow-row is-top">
          <span class="tfn-flow-tag">3</span>
          <span class="tfn-flow-steps">
            <strong>모바일 미리보기</strong>에서는 행 중앙의
            <span class="material-symbols-outlined tfn-flow-icon" aria-label="위아래 바꾸기">swap_vert</span>을 클릭하여 표시 순서를 바로 변경할 수 있습니다.
            <span class="tfn-flow-note">(모바일에서만 적용)</span>
          </span>
        </div>
      </div>
    </section>

    <p class="tfn-contact">문의: UXD팀 박정민 매니저, 김채은 매니저</p>

    <template #footer>
      <div class="tfn-footer">
        <label class="tfn-hide">
          <Checkbox v-model="hideChecked" binary input-id="template-file-notice-hide" />
          <span>다시 보지 않기</span>
        </label>
        <button type="button" class="tfn-btn" @click="visible = false">확인</button>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
/* 9월 개편 안내 모달(un-*)과 같은 치수 — 접두사만 tfn- 으로 바꿔 다른 창과 겹치지 않게 한다 */
.tfn-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tfn-head-icon {
  flex-shrink: 0;
  font-size: 24px;
  color: var(--blue-400);
}
.tfn-head-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--gray-800);
  word-break: keep-all;
}

.tfn-lead {
  margin: 0 0 20px;
  font-size: 15px;
  line-height: 1.6;
  color: var(--gray-700);
  word-break: keep-all;
}
.tfn-lead.is-first {
  margin-bottom: 8px;
}
.tfn-date {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: -8px 0 24px;
  font-size: 14px;
  font-weight: 700;
  color: var(--gray-800);
}
.tfn-date-tag {
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--blue-100);
  font-size: 12px;
  font-weight: 700;
  color: var(--blue-600);
}
.tfn-lead strong {
  font-weight: 700;
  color: var(--blue-500);
}

.tfn-section {
  margin-bottom: 30px;
}
.tfn-h3 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 700;
  color: var(--gray-800);
}

/* 어디에 있는지 — 왼쪽 메뉴 버튼 → 도구 카드 화면. 그림 둘을 한 줄에 */
.tfn-where {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 14px;
  border: 1px solid var(--gray-200);
  border-radius: 10px;
  background: var(--white);
}
/* 왼쪽: 캔버스에서 행을 고른 모습(넓은 그림) · 오른쪽: 패널 카드 */
.tfn-where-row {
  min-width: 0;
  flex: 1.4;
  height: auto;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
}
.tfn-where-arrow {
  flex-shrink: 0;
  font-size: 22px;
  color: var(--gray-500);
}
.tfn-where-panel {
  min-width: 0;
  flex: 1;
  height: auto;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
}

/* 이럴 때 써요 — 모바일 보기 전/후 그림을 나란히. 세로로 긴 그림이라 높이를 묶는다 */
.tfn-compare {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 14px;
  border: 1px solid var(--gray-200);
  border-radius: 10px;
  background: var(--gray-50);
}
.tfn-compare-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 0;
}
.tfn-compare-item img {
  display: block;
  width: auto;
  height: 220px;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  background: var(--white);
}
.tfn-compare-item figcaption {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 13px;
  font-weight: 700;
  color: var(--gray-700);
}
.tfn-compare-item figcaption span {
  font-size: 12px;
  font-weight: 500;
  color: var(--gray-500);
}
.tfn-compare-item.is-after img {
  border-color: var(--blue-400);
  box-shadow: 0 0 0 2px var(--blue-100);
}
.tfn-compare-item.is-after figcaption {
  color: var(--blue-500);
}

/* 순서 상자 — 개편 안내의 기존/변경 상자와 같은 모양에 번호 태그를 단다 */
.tfn-flow {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--gray-50);
}
.tfn-flow-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tfn-flow-tag {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--blue-100);
  font-size: 12px;
  font-weight: 700;
  color: var(--blue-600);
}
.tfn-flow-steps {
  font-size: 14px;
  color: var(--gray-800);
}
.tfn-flow-steps strong {
  font-weight: 700;
  color: var(--blue-500);
}
/* 줄이 둘로 넘어가는 순서는 번호를 첫 줄에 맞춘다 */
.tfn-flow-row.is-top {
  align-items: flex-start;
}
/* 캔버스의 ⇅ 버튼과 같은 모양 — 흰 동그라미 안 아이콘 */
.tfn-flow-icon {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  margin: 0 2px;
  vertical-align: middle;
  border: 1px solid var(--gray-300);
  border-radius: 50%;
  background: var(--white);
  font-size: 16px;
  color: var(--gray-700);
}
.tfn-flow-note {
  display: block;
  font-size: 13px;
  color: var(--gray-500);
}

.tfn-contact {
  margin: 0;
  font-size: 12px;
  color: var(--gray-500);
}

.tfn-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.tfn-hide {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--gray-600);
  cursor: pointer;
}
/* 버튼 생김새는 다른 모달과 맞춘다 */
.tfn-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0 16px;
  white-space: nowrap;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  background: var(--white);
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-600);
  cursor: pointer;
}
.tfn-btn:hover {
  background: var(--gray-50);
}
</style>
