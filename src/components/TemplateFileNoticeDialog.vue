<script setup lang="ts">
/**
 * 공지 팝업 — 템플릿 선택 화면에 들어오면 한 번 띄운다. 지금 내용은 **AI 도구 업데이트 안내**(2026-10-23 18:00 배포).
 *
 * 모양은 9월 28일 개편 사전 안내 모달(UpdateNoticeModal, 770423f)을 그대로 잇는다 —
 * 머리의 확성기 아이콘, 파란 리드, 항목, 회색 상자, 아래 체크박스 + 확인.
 * 공지는 늘 같은 틀로 나와야 "또 그 안내구나"로 읽힌다. (파일 이름은 앞 공지 때 것을 그대로 쓴다 — 자리는 같다)
 *
 * 노출 규칙:
 * - 그냥 닫으면(확인·X·ESC·바깥 클릭) 아무것도 기억하지 않는다 → 템플릿 선택 화면에 다시 들어오면 또 뜬다.
 * - '7일간 보지 않기'를 켜고 닫으면 → 이 브라우저에서 7일 동안 띄우지 않는다(localStorage 에 만료 시각 저장).
 *   영구가 아니라 기한을 두는 이유: 한 번 끈 안내를 영영 못 보는 것보다, 일주일 뒤 한 번 더 보이는 쪽이 안전하다.
 *   어느 길로 닫아도 체크 상태를 반영한다 — visible 이 꺼지는 것을 본다.
 * - 기억 키에 안내 **버전**을 붙인다(NOTICE_KEY). 다음 안내를 띄울 때 키만 바꾸면 기한이 남은 사람에게도 새 안내가 간다.
 * - 저장소 접근은 try/catch — 시크릿 창·차단 설정에서는 그냥 매번 띄운다(안내가 안 뜨는 쪽보다 낫다).
 */
import { onMounted, ref, watch } from 'vue'
import railShot from '@/assets/img/notice/ai-tools-rail.png'
import menuShot from '@/assets/img/notice/ai-tools-menu.png'

/**
 * 안내 버전 — 내용이 바뀌어 다시 보여줘야 하면 끝 숫자를 올린다.
 * v1: 템플릿 파일 받기 안내 · v2: AI 도구 업데이트 안내(7일 숨김이 남은 사람에게도 새로 보이게)
 */
const NOTICE_KEY = 'notice.template-file.v2'
/** '보지 않기'가 유지되는 기간 */
const HIDE_DAYS = 7
const HIDE_MS = HIDE_DAYS * 24 * 60 * 60 * 1000

/** 배포 시각 — 이 전에는 "됩니다", 지나면 "되었습니다"로 리드가 바뀐다(공지를 거둘 때까지 글이 낡지 않게) */
const RELEASE_AT = new Date('2026-10-23T18:00:00+09:00')
const released = Date.now() >= RELEASE_AT.getTime()

/** 이번 배포로 바뀌는 점 — 도구별로 줄 단위(lines 한 항목 = 한 줄). tag 는 신규/개선 구분 */
const changes = [
  {
    tool: '다국어 번역',
    tag: '개선',
    lines: ['태국어가 추가되고 번역이 더 빨라집니다. 번역 중 진행률이 보이고, 결과 화면에서 ‘다시 번역하기’로 추가 번역을 할 수 있습니다.'],
  },
  {
    tool: '맞춤법 검사',
    tag: '신규',
    lines: [
      '작성된 뉴스레터 내용의 오탈자, 띄어쓰기, 맞춤법을 카드로 보여주고, 선택한 카드만 적용하거나 전체 적용을 할 수 있습니다.',
      '한국어·영어·일본어·중국어·태국어를 각 언어 기준으로 봅니다.',
    ],
  },
]

/** 어디서 쓰는지 — 순서가 핵심이라 번호 태그로 보여준다 */
const steps = [
  { lead: '에디터', rest: ' 왼쪽 메뉴 맨 아래 ', strong: 'AI 도구' },
  { lead: '쓰고 싶은 도구', rest: ' 카드를 누르면 바로 시작됩니다', strong: '' },
]

const visible = ref(false)
const hideChecked = ref(false)

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
/** 체크하고 닫았을 때만 기억한다 — 7일 뒤 만료 */
const hideForAWhile = (): void => {
  try {
    localStorage.setItem(NOTICE_KEY, String(Date.now() + HIDE_MS))
  } catch {
    /* 저장 못 하면 다음에 또 띄울 뿐이다 */
  }
}

onMounted(() => {
  if (hiddenUntilLater()) return
  visible.value = true
})

// 어느 길로 닫아도(확인·ESC·X·바깥 클릭) 체크했으면 7일간 숨긴다. 체크 없이 닫으면 아무것도 남기지 않는다.
watch(visible, (now, before) => {
  if (!(before && !now)) return
  if (hideChecked.value) hideForAWhile()
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
        <span class="tfn-head-title">AI 도구가 업데이트됩니다 — 다국어 번역 개선, 맞춤법 검사 추가</span>
      </div>
    </template>

    <!-- 줄은 문장 단위로 고정한다 — 창 폭(600px)에서 한 줄에 들어가는 길이로 끊어 두었다 -->
    <p v-if="!released" class="tfn-lead">
      오늘 <strong>10월 23일(금) 오후 6시</strong>에 AI 도구의 다국어 번역과 맞춤법 검사가 업데이트됩니다.<br />
      배포 중에는 두 기능을 잠시 사용할 수 없습니다.  작업 중인 파일은 <strong>임시 저장</strong>을 해주세요.
    </p>
    <p v-else class="tfn-lead">
      <strong>10월 23일(금) 오후 6시</strong>에 AI 도구의 다국어 번역과 맞춤법 검사가 업데이트되었습니다.<br />
      에디터 왼쪽 메뉴의 AI 도구에서 바로 써 볼 수 있습니다.
    </p>

    <section class="tfn-section">
      <h3 class="tfn-h3">이렇게 달라집니다.</h3>
      <div v-for="item in changes" :key="item.tool" class="tfn-feature">
        <span class="tfn-tag" :class="{ 'tfn-tag--new': item.tag === '신규' }">{{ item.tag }}</span>
        <p class="tfn-feature-text">
          <strong class="block">{{ item.tool }}</strong>
          <template v-for="(line, i) in item.lines" :key="line"><br v-if="i" />{{ line }}</template>
        </p>
      </div>
    </section>

    <section class="tfn-section">
      <h3 class="tfn-h3">메뉴 위치</h3>
      <!-- 왼쪽 메뉴의 'AI 도구' 버튼 → 도구 카드 화면. 둘 다 에디터를 그대로 찍은 그림(2배 해상도) -->
      <div class="tfn-where">
        <img :src="railShot" width="160" height="146" alt="에디터 왼쪽 메뉴의 AI 도구 버튼" class="tfn-where-rail" />
        <span class="material-symbols-outlined tfn-where-arrow" aria-hidden="true">arrow_forward</span>
        <img :src="menuShot" width="720" height="718" alt="AI 도구 카드 화면: HTML 웹 링크 생성, 다국어 번역, 맞춤법 검사" class="tfn-where-menu" />
      </div>
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

/* 바뀌는 점 — 신규/개선 태그 + 도구 이름 + 한 줄 */
.tfn-feature {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
}
.tfn-tag {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  height: 22px;
  /* 글줄 첫 줄 가운데에 맞춘다 */
  margin-top: 1px;
  padding: 0 8px;
  border-radius: 6px;
  background: var(--blue-100);
  font-size: 12px;
  font-weight: 700;
  color: var(--blue-600);
}
.tfn-tag--new {
  background: var(--yellow-400);
  color: var(--white);
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
.tfn-where-rail {
  flex-shrink: 0;
  width: 80px;
  height: auto;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
}
.tfn-where-arrow {
  flex-shrink: 0;
  font-size: 22px;
  color: var(--gray-500);
}
.tfn-where-menu {
  min-width: 0;
  flex: 1;
  max-width: 300px;
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
