<script setup lang="ts">
/**
 * 업데이트 안내 모달 (한시적) — 이미지 업로드·임시 저장·다국어 번역·HTML 웹 링크 생성.
 *
 * 읽는 사람은 전시팀 실무자다. 기능 이름이 아니라 **되는 일**로 쓰고, 폴더·볼륨 같은
 * 만든 쪽 용어는 쓰지 않는다.
 *
 * 다 설명하려 들지 않는다 — 이번 업데이트는 한 화면에 담기지 않아서 가이드 PDF가 따로 있다.
 * 모달이 할 일은 **무엇이 달라지는지 · 무엇을 조심해야 하는지**를 요약하고 가이드를 열게 하는 것이다.
 * 자세한 절차(폴더명은 영문 · 폴더 3단계 제한 · 홈으로 나가면 새 작업 등)는 전부 PDF 몫이다.
 *
 * 띄우는 자리는 **'템플릿 선택'부터**다 — 랜딩은 빌더를 소개하는 자리라 덮지 않는다.
 *
 * **배포 전까지만 쓰는 사전 안내다.**
 * ⚠ 스스로 사라지지 않는다 — 9월 28일 develop을 머지할 때 **이 컴포넌트와
 *   App.vue의 한 줄을 지워야** 한다. 남겨 두면 바뀐 화면 위에서 '곧 바뀝니다'가
 *   계속 떠서 그대로 거짓말이 된다.
 *   (시각을 못 박아 자동으로 숨기는 방법도 있지만, 배포가 예정 시각보다 늦어지면
 *    정작 안내가 필요한 동안 아무것도 뜨지 않게 되어 쓰지 않기로 했다)
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { GUIDE_PDF_SAVE_NAME, GUIDE_PDF_URL } from '@/constants/guide'

const STORAGE_KEY = 'update-notice-dismissed'
/** 다음 공지 때 이 번호를 올리면, 지난번에 꺼 둔 사람에게도 새로 뜬다 */
const NOTICE_ID = 'v2.1-upload-tempsave-translate-weblink'

const route = useRoute()
const router = useRouter()
const visible = ref(false)
const hideChecked = ref(false)

/**
 * 주소에 `?notice=preview`를 붙이면 날짜·꺼 둔 기록과 상관없이 띄운다.
 *
 * 문구를 확인해야 하는 기획·디자인이 코드를 고치지 않고 볼 수 있게 열어 둔 통로다.
 * '오늘 하루 보지 않기'로 꺼 둔 날에도 이 주소로는 열린다.
 * 이 상태에서는 체크해도 기억하지 않는다 — 미리 보다가 실수로 꺼 버리지 않게.
 */
const isPreview = computed(() => route.query.notice === 'preview')

/** 새로 생기는 기능 — 문구는 공지 담당(UXD팀)이 정한 것을 그대로 쓴다 */
const features = [
  {
    icon: 'add_photo_alternate',
    name: '이미지 업로드 기능 추가',
    text: '제작한 이미지를 직접 이미지 서버에 업로드할 수 있습니다. (웍스로 이미지 주소를 별도 요청하지 않아도 됩니다)',
  },
  {
    icon: 'cloud_done',
    name: '임시 저장',
    text: '작업 중인 뉴스레터를 저장하고 나중에 이어서 작업할 수 있습니다.',
  },
  {
    icon: 'language',
    name: '다국어 번역',
    text: '작성한 내용을 원하는 언어로 한 번에 번역할 수 있습니다.',
  },
  {
    icon: 'link',
    name: 'HTML 웹 링크 생성',
    text: '웹 링크를 직접 생성하여 삽입할 수 있습니다.',
  },
]

/**
 * 꼭 확인해 주세요 — 지금 이 사람이 **잃을 수 있는 것**만 적는다.
 *
 * 바뀐 화면을 쓰는 법(임시 저장 버튼 · 저장 위치 · 반영하기)은 여기 넣지 않는다.
 * 아직 그 화면이 없어서 읽어도 할 수 있는 게 없고, 28일에는 잊는다.
 *
 * `lead`는 굵게 나온다 — 비워 두면 그 줄은 통째로 보통 글자다.
 * 첫 줄에만 굵게 둔 것은 셋 중 지금 당장 하지 않으면 잃는 게 그것뿐이기 때문이다.
 *
 * `lines`는 **줄을 나눌 자리**다 — 창 폭에 따라 접히게 두지 않고 여기서 끊는다.
 * 첫 줄은 `lead` 뒤에 이어 붙고, 그 다음부터 한 줄씩 내려간다.
 *
 * 글 안의 `[임시 저장]`처럼 **대괄호로 묶은 것은 버튼 이름**이다. 대괄호는 늘 보이고,
 * `highlightKeys: true`를 준 줄에서만 붉게 칠한다 — 붉은색은 **지금 당장 누르지 않으면
 * 잃는다**는 뜻으로 아껴 쓴다. 아래 두 항목처럼 알아 두기만 하면 되는 안내까지 붉으면
 * 어느 것이 급한지 구분이 사라진다.
 */
const cautions = [
  {
    lead: '작업 내용은 자동으로 저장되지 않습니다.',
    /** 지금 눌러야 작업을 지킬 수 있는 버튼들이라 이름을 붉게 드러낸다 */
    highlightKeys: true,
    lines: [
      '브라우저 창을 닫을 경우 작업 내용이 삭제됩니다.',
      '중요한 작업은 [임시 저장] 버튼으로 서버에 임시 저장하거나, [저장용 내보내기]로 저장해 주세요.',
      '브라우저 창을 닫을 경우 작업 내용이 삭제됩니다.',
    ],
  },
  {
    lead: '',
    highlightKeys: false,
    lines: ['저장한 파일은 [파일 열기]에서 다시 불러와 작업할 수 있습니다.'],
  },
  {
    lead: '',
    highlightKeys: false,
    lines: ['업데이트 후 화면이 이상하게 보이면 Ctrl + F5로 새로고침해 주세요.'],
  },
]

/**
 * 주의 한 줄을 **화면에 그릴 조각들**로 편다.
 *
 * 굵은 앞머리 · 붉은 버튼 이름 · 보통 글자 · 줄바꿈이 한 문단 안에 섞인다. 이걸 템플릿에서
 * 중첩 `v-for`로 짜면 태그 사이 줄바꿈이 그대로 빈칸이 되거나 반대로 붙어 버려서, 띄어쓰기가
 * 마크업 생김새에 휘둘린다. 조각 목록을 여기서 만들어 두면 **띄어쓰기가 데이터에만** 있다.
 *
 * `[임시 저장]`처럼 대괄호로 묶은 것은 버튼 이름 — 대괄호는 **늘 그대로 보인다**(색을 못 보는
 * 환경에서도 버튼 이름인 줄 알아보게). 붉게 칠하는 건 `highlightKeys`를 준 줄에서만이다.
 */
type Caution = { lead: string; highlightKeys?: boolean; lines: string[] }
type CautionPart = { kind: 'lead' | 'key' | 'text' | 'br'; text?: string }

const cautionParts = (item: Caution): CautionPart[] => {
  const parts: CautionPart[] = []
  if (item.lead) {
    parts.push({ kind: 'lead', text: item.lead })
    parts.push({ kind: 'text', text: ' ' })
  }
  item.lines.forEach((line, i) => {
    if (i > 0) parts.push({ kind: 'br' })
    if (!item.highlightKeys) {
      // 대괄호는 글자 그대로 둔다 — 쪼갤 이유가 없다
      parts.push({ kind: 'text', text: line })
      return
    }
    for (const seg of line.split(/(\[[^\]]+\])/g)) {
      if (!seg) continue
      parts.push({ kind: seg.startsWith('[') ? 'key' : 'text', text: seg })
    }
  })
  return parts
}

/** 로컬 시각 기준 'YYYY-MM-DD'. toISOString은 UTC라 밤 시간대에 날짜가 하루 밀린다. */
const today = (): string => {
  const d = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * **오늘 하루만** 숨긴다 — '다시 보지 않기'가 아니다.
 *
 * 오늘 읽고 영영 꺼 버린 사람은 28일이 다가와도 다시 듣지 못한다. 그러다 잊으면
 * 만들던 작업을 잃는다. 남은 날이 일주일뿐이라 매일 한 번은 다시 알리는 게 맞다.
 * (지난 v2.0 개편 공지도 같은 이유로 하루짜리였다)
 */
const dismissValue = computed(() => `${NOTICE_ID}:${today()}`)

/** 시크릿 모드·저장소 차단 환경에서 localStorage 접근이 던질 수 있어 전부 감싼다 */
const readDismissed = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const writeDismissed = (): void => {
  try {
    localStorage.setItem(STORAGE_KEY, dismissValue.value)
  } catch {
    // 저장 실패 시 다음 방문에 다시 뜨는 것 외에 문제 없음
  }
}

/**
 * 첫 화면(랜딩)에서는 **아직 띄우지 않고 미뤄 둔다** — '템플릿 선택'부터 띄운다.
 * 랜딩은 빌더를 소개하는 자리라 들어오자마자 안내창으로 덮으면 시작을 막는다.
 * 만들러 들어온 사람만 골라 알리는 셈이다.
 *
 * 미루는 것이지 거르는 게 아니다 — 그래서 **화면이 바뀔 때마다 다시 본다**.
 * 한 번만 보고 끝내면 랜딩으로 들어온 사람은 템플릿 선택으로 넘어가도 끝내 못 본다.
 * 에디터에서도 띄운다: 잃을 작업을 들고 있는 사람이 바로 거기에 있다.
 */
const DEFER_ROUTES = new Set(['landing'])

/** 한 번 띄웠거나(닫았거나) 띄우지 않기로 정해지면, 화면을 옮겨 다녀도 다시 묻지 않는다 */
let settled = false

const showIfAllowed = (): void => {
  if (settled) return

  if (isPreview.value) {
    settled = true
    visible.value = true
    return
  }
  if (readDismissed() === dismissValue.value) {
    settled = true
    return
  }
  // 아직 랜딩이다 — 판단을 끝내지 않고 다음 화면에서 다시 본다
  if (DEFER_ROUTES.has(String(route.name))) return

  settled = true
  visible.value = true
}

/**
 * 화면이 바뀔 때마다 다시 본다.
 * ⚠ `watch`는 setup 안에서 **동기로** 만들어야 컴포넌트와 함께 정리된다
 *   (`isReady()` 뒤에 만들면 이 컴포넌트가 사라져도 남는다).
 */
watch(() => route.name, showIfAllowed)

/**
 * ⚠ `router.isReady()`를 기다린 뒤에 한 번 더 본다.
 *
 * 이 컴포넌트는 App.vue에 붙어 있어 첫 화면이 정해지기 **전에** 마운트된다.
 * 그때는 `route.name`도, 주소에 붙인 `?notice=preview`도 아직 읽히지 않는다.
 * (위 watch가 먼저 처리했다면 `settled` 때문에 그냥 지나간다)
 */
onMounted(() => {
  void router.isReady().then(showIfAllowed)
})

/**
 * 확인·ESC·X·바깥 클릭 — **어느 경로로 닫아도** 체크 상태를 반영한다.
 * (확인 버튼에만 걸면 X로 닫은 사람은 체크하고도 다시 보게 된다)
 *
 * ⚠ Dialog의 `@hide`가 아니라 **`visible`이 꺼지는 것**을 본다.
 *   `hide`는 닫힘 애니메이션이 시작될 때 나오는 신호라 전환이 생략되는 환경에서는 오지 않는다.
 *   `visible`은 어떤 경로로 닫든 반드시 지나가는 자리다.
 */
watch(visible, (now, before) => {
  if (!(before && !now)) return
  if (isPreview.value) return
  if (hideChecked.value) writeDismissed()
})

/**
 * 내려받기는 눌러도 화면이 그대로다 — 브라우저가 조용히 받아 가서 눌렸는지 알 수 없고,
 * 그래서 두세 번 더 누르게 된다. 라벨을 잠깐 바꿔 눌린 것을 알린다.
 * (내려받기 자체는 `<a download>`의 기본 동작이라 여기서 막지 않는다)
 */
const DOWNLOADED_MS = 2500
const downloaded = ref(false)
let downloadedTimer: ReturnType<typeof setTimeout> | undefined
const markDownloaded = (): void => {
  downloaded.value = true
  clearTimeout(downloadedTimer)
  downloadedTimer = setTimeout(() => (downloaded.value = false), DOWNLOADED_MS)
}
const downloadLabel = computed(() =>
  downloaded.value ? '내려받았어요' : '이용 가이드 내려받기 (PDF)',
)
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :draggable="false"
    class="un-dialog"
    :style="{ width: 'min(700px, 92vw)' }"
  >
    <template #header>
      <div class="un-head">
        <span class="material-symbols-outlined un-head-icon" aria-hidden="true">campaign</span>
        <span class="un-head-title">뉴스레터 빌더가 9월 28일 새롭게 바뀝니다.</span>
      </div>
    </template>

    <p class="un-lead">
      <strong>2026년 9월 28일(월) 오후 6시</strong> 업데이트 됩니다.<br />
      이미지 업로드 · 임시 저장 · 다국어 번역 · HTML 웹 링크 생성 기능을 이용할 수 있습니다.
    </p>

    <section class="un-section">
      <h3 class="un-h3">이렇게 달라집니다.</h3>
      <ul class="un-features">
        <li v-for="item in features" :key="item.name" class="un-feature">
          <span class="material-symbols-outlined un-feature-icon" aria-hidden="true">
            {{ item.icon }}
          </span>
          <p class="un-feature-text">
            <strong class="block">{{ item.name }}</strong>
            {{ item.text }}
          </p>
        </li>
      </ul>
    </section>

    <!--
      단계가 하나 늘어난 것은 이번 업데이트에서 가장 먼저 부딪히는 변화다.
      그냥 알리면 '번거로워졌다'로 읽히므로, 늘어난 **이유**를 먼저 적고 기존/변경을 나란히 보여준다.
    -->
    <section class="un-section">
      <h3 class="un-h3">제작 순서도 변경됩니다.</h3>
      <p class="un-text">
        이미지와 HTML 파일을 <strong>어느 폴더에 업로드할지</strong> 먼저 정하고 시작합니다.
      </p>
      <div class="un-flow">
        <div class="un-flow-row">
          <span class="un-flow-tag">기존</span>
          <span class="un-flow-steps">템플릿 선택 → 에디터</span>
        </div>
        <div class="un-flow-row un-flow-row--now">
          <span class="un-flow-tag un-flow-tag--now">변경</span>
          <span class="un-flow-steps">
            템플릿 선택 → <strong>저장 폴더 선택</strong> → 에디터
          </span>
        </div>
      </div>
    </section>

    <section class="un-caution">
      <h3 class="un-h3 un-h3--caution">
        <span class="material-symbols-outlined un-caution-icon" aria-hidden="true">error</span>
        꼭 확인해 주세요.
      </h3>
      <ul class="un-caution-list">
        <li v-for="item in cautions" :key="item.lines[0]" class="un-caution-item">
          <span class="un-bullet" aria-hidden="true">•</span>
          <!-- 띄어쓰기는 cautionParts가 정한다 — 여기 줄바꿈은 화면에 영향을 주지 않는다 -->
          <p class="un-caution-text">
            <template v-for="(part, i) in cautionParts(item)" :key="i">
              <br v-if="part.kind === 'br'" />
              <strong v-else-if="part.kind === 'lead'">{{ part.text }}</strong>
              <span v-else-if="part.kind === 'key'" class="un-key">{{ part.text }}</span>
              <template v-else>{{ part.text }}</template>
            </template>
          </p>
        </li>
      </ul>
    </section>

    <!--
      이 모달의 목적은 결국 가이드를 열게 하는 것이라, 확인 버튼이 아니라 여기에 강조를 준다.
      28일 전에 미리 받아 두면 바뀐 날 헤매지 않는다.
    -->
    <section class="un-guide">
      <p class="un-guide-text">
        자세한 사용 방법은 <strong>[이용 가이드 다운로드]</strong> 에서 확인해 주세요.
      </p>
      <div class="un-guide-actions">
        <a
          class="un-btn un-btn--primary"
          :class="{ 'is-done': downloaded }"
          :href="GUIDE_PDF_URL"
          :download="GUIDE_PDF_SAVE_NAME"
          @click="markDownloaded"
        >
          <span class="material-symbols-outlined un-btn-icon" aria-hidden="true">
            {{ downloaded ? 'check' : 'download' }}
          </span>
          {{ downloadLabel }}
        </a>
        <a class="un-guide-link" :href="GUIDE_PDF_URL" target="_blank" rel="noopener">
          새 탭에서 바로 보기
        </a>
      </div>
    </section>

    <p class="un-contact">문의: UXD팀 박정민 매니저, 김채은 매니저</p>

    <template #footer>
      <div class="un-footer">
        <label class="un-hide">
          <Checkbox v-model="hideChecked" binary input-id="update-notice-hide" />
          <span>오늘 하루 보지 않기</span>
        </label>
        <button type="button" class="un-btn" @click="visible = false">확인</button>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.un-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.un-head-icon {
  font-size: 24px;
  color: var(--blue-400);
}
.un-head-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--gray-800);
}

.un-lead {
  margin: 0 0 20px;
  font-size: 15px;
  line-height: 1.6;
  color: var(--gray-700);
}
.un-lead strong {
  font-weight: 700;
  color: var(--blue-500);
}

.un-section {
  margin-bottom: 20px;
}
.un-h3 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
  color: var(--gray-800);
}
.un-text {
  margin: 0 0 10px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--gray-700);
}

.un-features {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.un-feature {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.un-feature-icon {
  flex-shrink: 0;
  /* 글줄 첫 줄 가운데에 맞춘다 — 아이콘 상자가 글자보다 커서 그냥 두면 살짝 떠 보인다 */
  margin-top: 1px;
  font-size: 20px;
  color: var(--blue-400);
}
.un-feature-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--gray-700);
}
.un-feature-text strong {
  margin-right: 6px;
  font-weight: 600;
  color: var(--gray-800);
}

/* 전 → 후를 위아래로 놓아 늘어난 단계가 한눈에 들어오게 한다 */
.un-flow {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--gray-50);
}
.un-flow-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
/* '기존'·'변경' 두 글자가 들어가도록 폭은 글자에 맡긴다 — 두 태그의 폭이 같아 줄은 그대로 맞는다 */
.un-flow-tag {
  flex-shrink: 0;
  padding: 0 8px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--gray-200);
  font-size: 12px;
  font-weight: 700;
  color: var(--gray-600);
}
.un-flow-tag--now {
  background: var(--blue-100);
  color: var(--blue-600);
}
.un-flow-steps {
  font-size: 14px;
  color: var(--gray-600);
}
.un-flow-row--now .un-flow-steps {
  color: var(--gray-800);
}
.un-flow-steps strong {
  font-weight: 700;
  color: var(--blue-500);
}

.un-caution {
  margin-bottom: 20px;
  padding: 14px;
  border: 1px solid var(--yellow-400);
  border-radius: 10px;
  background: var(--yellow-50);
}
.un-h3--caution {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--yellow-700);
}
.un-caution-icon {
  font-size: 18px;
}
.un-caution-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.un-caution-item {
  display: flex;
  gap: 6px;
}
.un-bullet {
  flex-shrink: 0;
  color: var(--yellow-400);
}
.un-caution-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--gray-750);
  word-break: keep-all;
}
.un-caution-text strong {
  font-weight: 700;
  color: var(--gray-800);
}
/* 눌러야 할 버튼 이름 — 노란 상자 위에서도 읽히도록 red-400이 아니라 red-700을 쓴다
   (red-400은 이 배경에서 대비 3.4:1로 본문 기준 4.5:1에 못 미친다. red-700은 5.6:1) */
.un-key {
  font-weight: 700;
  color: var(--p-red-500);
}

.un-guide {
  padding: 16px;
  border-radius: 10px;
  background: var(--blue-50);
}
.un-guide-text {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.6;
  font-weight: 500;
  color: var(--gray-700);
}
.un-guide-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.un-guide-link {
  font-size: 13px;
  font-weight: 500;
  color: var(--blue-500);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.un-contact {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--gray-500);
}

.un-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-top: 1rem;
}
.un-hide {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--gray-600);
  cursor: pointer;
}

/* 버튼 생김새는 다른 모달과 맞춘다 — 같은 계열에서 두 가지 버튼이 보이지 않게 */
.un-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  white-space: nowrap;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  background: var(--white);
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-600);
  text-decoration: none;
  cursor: pointer;
}
.un-btn:hover {
  background: var(--gray-50);
}
.un-btn--primary {
  border-color: var(--blue-400);
  background: var(--blue-400);
  color: var(--white);
}
.un-btn--primary:hover {
  background: var(--blue-500);
}
/* 내려받은 직후 — 색은 그대로 두고 글자만 바꿔, 버튼이 사라진 것처럼 보이지 않게 한다 */
.un-btn--primary.is-done {
  background: var(--blue-500);
}
.un-btn-icon {
  font-size: 18px;
}
</style>
