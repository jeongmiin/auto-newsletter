<script setup lang="ts">
/**
 * '템플릿 파일 받기' 안내 팝업 — 템플릿 선택 화면에 들어오면 한 번 띄운다.
 *
 * 모양은 9월 28일 개편 사전 안내 모달(UpdateNoticeModal, 770423f)을 그대로 잇는다 —
 * 머리의 확성기 아이콘, 파란 리드, '이렇게 가능합니다' 항목, 회색 순서 상자, 아래 체크박스 + 확인.
 * 공지는 늘 같은 틀로 나와야 "또 그 안내구나"로 읽힌다.
 *
 * 노출 규칙:
 * - '확인' → 이번 브라우저 세션에서는 다시 띄우지 않는다(sessionStorage).
 * - '7일간 보지 않기'를 켜고 닫으면 → 이 브라우저에서 7일 동안 띄우지 않는다(localStorage 에 만료 시각 저장).
 *   영구가 아니라 기한을 두는 이유: 한 번 끈 안내를 영영 못 보는 것보다, 일주일 뒤 한 번 더 보이는 쪽이 안전하다.
 *   어느 길(확인·ESC·X·바깥 클릭)로 닫아도 체크 상태를 반영한다 — visible 이 꺼지는 것을 본다.
 * - 기억 키에 안내 **버전**을 붙인다(NOTICE_KEY). 다음 안내를 띄울 때 키만 바꾸면 기한이 남은 사람에게도 새 안내가 간다.
 * - 저장소 접근은 try/catch — 시크릿 창·차단 설정에서는 그냥 매번 띄운다(안내가 안 뜨는 쪽보다 낫다).
 */
import { onMounted, ref, watch } from 'vue'
import buttonShot from '@/assets/img/notice/template-file-button.png'

/** 안내 버전 — 내용이 바뀌어 다시 보여줘야 하면 끝 숫자를 올린다 */
const NOTICE_KEY = 'notice.template-file.v1'
/** '보지 않기'가 유지되는 기간 */
const HIDE_DAYS = 7
const HIDE_MS = HIDE_DAYS * 24 * 60 * 60 * 1000

const visible = ref(false)
const hideChecked = ref(false)

/** 받은 뒤 할 일 — 순서가 핵심이라 번호 태그로 보여준다 */
const steps = [
  { lead: '미리보기', rest: '에서 쓰고 싶은 템플릿의 ', strong: '템플릿 파일 받기' },
  { lead: '빈 템플릿', rest: ' → 내 팀 → ', strong: '폴더 만들기' },
  { lead: '파일 열기', rest: '로 받은 파일 불러오기', strong: '' },
]

/** 이번 세션에서 이미 닫았는가 */
const seenThisSession = (): boolean => {
  try {
    return sessionStorage.getItem(NOTICE_KEY) === '1'
  } catch {
    return false
  }
}
/** '7일간 보지 않기' 기한이 아직 남았는가 — 값은 만료 시각(ms). 지났거나 깨진 값이면 지우고 false */
const hiddenUntilLater = (): boolean => {
  try {
    const until = Number(localStorage.getItem(NOTICE_KEY))
    if (Number.isFinite(until) && until > Date.now()) return true
    localStorage.removeItem(NOTICE_KEY)
    return false
  } catch {
    return false
  }
}
const remember = (): void => {
  try {
    if (hideChecked.value) localStorage.setItem(NOTICE_KEY, String(Date.now() + HIDE_MS))
    else sessionStorage.setItem(NOTICE_KEY, '1')
  } catch {
    /* 저장 못 하면 다음에 또 띄울 뿐이다 */
  }
}

onMounted(() => {
  if (seenThisSession() || hiddenUntilLater()) return
  visible.value = true
})

// 어느 길로 닫아도(확인·ESC·X·바깥 클릭) 한 번 본 것은 기억한다 — 체크했으면 7일간
watch(visible, (now, before) => {
  if (!(before && !now)) return
  remember()
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
        <span class="tfn-head-title">다양한 템플릿을 내 전시회 템플릿으로 활용해 보세요.</span>
      </div>
    </template>

    <!-- 줄은 문장 단위로 고정한다 — 창 폭(600px)에서 한 줄에 들어가는 길이로 끊어 두었다 -->
    <p class="tfn-lead">
      템플릿 미리보기에 <strong>“템플릿 파일 받기”</strong> 버튼이 새롭게 추가되었습니다.<br />
      다른 전시회 템플릿을 활용해 새로운 뉴스레터를 제작하고 싶을 때, 그 팀 폴더에 들어가지 않고도 내 폴더에서 바로 시작할 수 있습니다.
    </p>

    <section class="tfn-section">
      <h3 class="tfn-h3">이렇게 가능합니다.</h3>
      <div class="tfn-feature">
        <span class="material-symbols-outlined tfn-feature-icon" aria-hidden="true">download</span>
        <p class="tfn-feature-text">
          <strong class="block">템플릿 파일 받기</strong>
          미리보기에서 재편집용 파일을 다운받고,<br />
          빈 템플릿으로 만든 내 팀 폴더에서 <strong>[파일 열기]</strong>로 불러오면 됩니다.
        </p>
      </div>
      <!-- 버튼이 어디 있는지 — 미리보기 창 머리를 그대로 찍은 그림 (2배 해상도, 698×80) -->
      <img
        :src="buttonShot"
        width="698"
        height="80"
        alt="미리보기 창 머리의 템플릿 파일 받기 버튼"
        class="tfn-shot"
      />
    </section>

    <section class="tfn-section">
      <h3 class="tfn-h3">이렇게 사용합니다.</h3>
      <div class="tfn-flow">
        <div v-for="(step, i) in steps" :key="step.lead" class="tfn-flow-row">
          <span class="tfn-flow-tag">{{ i + 1 }}</span>
          <span class="tfn-flow-steps">
            <strong>{{ step.lead }}</strong>{{ step.rest }}<strong v-if="step.strong">{{ step.strong }}</strong>
          </span>
        </div>
      </div>
    </section>

    <p class="tfn-contact">문의: UXD팀 박정민 매니저, 김채은 매니저</p>

    <template #footer>
      <div class="tfn-footer">
        <label class="tfn-hide">
          <Checkbox v-model="hideChecked" binary input-id="template-file-notice-hide" />
          <span>{{ HIDE_DAYS }}일간 보지 않기</span>
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
  font-size: 24px;
  color: var(--blue-400);
}
.tfn-head-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--gray-800);
}

.tfn-lead {
  margin: 0 0 20px;
  font-size: 15px;
  line-height: 1.6;
  color: var(--gray-700);
  word-break: keep-all;
}
.tfn-lead strong {
  font-weight: 700;
  color: var(--blue-500);
}

.tfn-section {
  margin-bottom: 30px;
}
.tfn-h3 {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 700;
  color: var(--gray-800);
}

.tfn-feature {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
}
.tfn-feature-icon {
  flex-shrink: 0;
  /* 글줄 첫 줄 가운데에 맞춘다 — 아이콘 상자가 글자보다 커서 그냥 두면 살짝 떠 보인다 */
  margin-top: 1px;
  font-size: 20px;
  color: var(--blue-400);
}
.tfn-feature-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--gray-700);
  word-break: keep-all;
}
.tfn-feature-text strong {
  font-weight: 600;
  color: var(--gray-800);
}
.tfn-shot {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
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
