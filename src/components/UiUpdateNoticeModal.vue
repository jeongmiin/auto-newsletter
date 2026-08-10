<template>
  <Dialog
    v-model:visible="visible"
    modal
    :draggable="false"
    :style="{ width: '540px' }"
    :breakpoints="{ '640px': '92vw' }"
    @hide="handleHide"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <i class="pi pi-megaphone text-blue-600 text-xl" />
        <span class="font-bold text-gray-800 text-lg">[공지] 뉴스레터 자동화빌더가 새롭게 변경됩니다. (v2.0)</span>
      </div>
    </template>

    <div class="text-gray-700 text-sm leading-relaxed">
      <p class="mb-5">
        <strong class="font-bold">8월 중</strong>에 뉴스레터를 만드는 화면이 새롭게 바뀝니다.
      </p>

      <section class="mb-5">
        <h3 class="flex items-center gap-1.5 mb-2 font-bold text-gray-800">
          <i class="pi pi-sparkles text-blue-600 text-sm" />
          이렇게 달라집니다
        </h3>


        <ul class="space-y-1.5 pl-1">
          <li class="flex gap-2">
            <span class="text-gray-400 shrink-0">·</span>
            <p class="flex flex-wrap items-center gap-1.5 font-semibold">
            UIUX가 전면 개편됩니다.
            </p>
          </li>
          <li v-for="item in improvements" :key="item" class="flex gap-2">
            <span class="text-gray-400 shrink-0">·</span>
            <span>{{ item }}</span>
          </li>
        </ul>
      </section>

      <section class="mb-5 rounded-md bg-amber-50 border border-amber-200 p-3.5">
        <h3 class="flex items-center gap-1.5 mb-2 font-bold text-amber-900">
          <i class="pi pi-exclamation-circle text-amber-600 text-sm" />
          바뀌기 전에 꼭 확인해 주세요
        </h3>
        <ul class="space-y-2 pl-1 text-amber-900">
          <li class="flex gap-2">
            <span class="shrink-0 text-amber-500">·</span>
            <span>
              만들던 내용은 자동으로 저장되지 않습니다. 화면이 새로 바뀌면 사라지니,
              <span class="whitespace-nowrap rounded font-bold text-center">
                저장용 내려받기
              </span>
              를 눌러 파일로 받아 두세요.
            </span>
          </li>
          <li class="flex gap-2">
            <span class="shrink-0 text-amber-500">·</span>
            <span>
              이미 받아 두신 파일은 새 화면에서도
              <span class="whitespace-nowrap rounded font-bold text-center">
                파일 열기
              </span>
              로 불러와 그대로 이어서 만들 수 있습니다.
            </span>
          </li>
          <li class="flex gap-2">
            <span class="shrink-0 text-amber-500">·</span>
            <span>
              화면이 바뀐 뒤 이상하게 보이면, 키보드의 Ctrl 키와 F5 키를 함께 눌러 주세요.
            </span>
          </li>
        </ul>
      </section>

      <p class="text-gray-500 text-xs">문의: UXD팀 박정민 매니저, 김채은 매니저</p>
    </div>

    <template #footer>
      <div class="flex w-full items-center justify-between">
        <label class="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
          <Checkbox v-model="hideForToday" binary input-id="ui-notice-hide-today" />
          <span>오늘 하루 보지 않기</span>
        </label>
        <Button label="확인" size="small" @click="visible = false" />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

/**
 * UI 개편 사전 안내 모달 (한시적).
 *
 * develop의 새 편집 화면이 master로 머지되기 전까지만 띄우는 공지다.
 * 실제로 영향을 받는 사람은 편집을 시작한 사용자이므로 HomeView(에디터)에서만 마운트한다.
 * `NOTICE_UNTIL`이 지나면 코드를 지우지 않아도 자동으로 뜨지 않으므로,
 * 개편 배포 후 이 컴포넌트를 제거하지 못해도 사용자에겐 노출되지 않는다.
 * ⚠ 개편일이 확정되면 NOTICE_UNTIL을 그 전날로 맞춰야 새 화면에서 옛 공지가 뜨지 않는다.
 */
const NOTICE_UNTIL = '2026-08-31' // 이 날짜까지(당일 포함) 노출
const STORAGE_KEY = 'ui-update-notice-dismissed'

const visible = ref(false)
const hideForToday = ref(false)

// 실무자(비개발·비디자이너)가 읽는 공지다. 화면 요소 이름(속성 패널·팔레트) 대신
// 눈에 보이는 것과 실제로 좋아지는 점으로 쓴다.
// ※ 가장 큰 변경인 'UI 전면 개편'은 템플릿의 강조 블록에 따로 있다.
const improvements = [
  '고른 모듈의 설정만 화면에 보입니다. 지금 어디를 고치는 중인지 헷갈리지 않습니다.',
  '전시 템플릿 17종 중에서 하나를 고르면 바로 만들기를 시작할 수 있습니다.',
  '모듈을 이름으로 검색하거나 종류별로 모아 볼 수 있어, 원하는 모듈을 빨리 찾습니다.',
  '표, SNS 아이콘 같은 새 모듈이 늘어나고, 색을 고르는 방법도 훨씬 편해집니다.',
  '내용이 많은 뉴스레터도 오래 기다리지 않고 바로 열립니다.',
]

/** 로컬 시각 기준 'YYYY-MM-DD'. toISOString은 UTC라 밤 시간대에 날짜가 하루 밀린다. */
const today = (): string => {
  const d = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 시크릿 모드·저장소 차단 환경에서 localStorage 접근이 던질 수 있어 전부 감싼다. */
const readDismissed = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const writeDismissed = (value: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // 저장 실패 시 다음 방문에 다시 뜨는 것 외에 문제 없음
  }
}

onMounted(() => {
  const now = today()
  if (now > NOTICE_UNTIL) return
  if (readDismissed() === now) return
  visible.value = true
})

/**
 * 확인·ESC·X 어느 경로로 닫아도 체크 상태를 반영한다.
 * (확인 버튼에만 걸면 X로 닫은 사람은 체크하고도 다시 보게 된다)
 */
const handleHide = (): void => {
  if (hideForToday.value) writeDismissed(today())
}
</script>
