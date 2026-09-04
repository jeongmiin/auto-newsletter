<template>
  <div class="tpl-page">
    <!-- 상단 바: 에디터와 공통 헤더. 단, 파일 관리 버튼들은 숨김 -->
    <FlowStepsHeader :current="1" />

    <div class="tpl-body">
      <!-- 좌측: 부서/팀 트리 (폴더 선택 화면과 같은 메뉴를 쓴다) -->
      <TeamTreeSidebar
        v-model="selectedTeam"
        top-label="전체"
        :top-active="selectedTeam === ''"
        @top="selectedTeam = ''"
      />

      <!-- 우측: 제목 + 검색 + 카드 그리드, 그 아래 이전/다음 (Figma 1468-8905) -->
      <div class="tpl-column">
        <main class="tpl-main">
          <h1 class="tpl-title">전시회를 선택해주세요.</h1>

          <SearchField
            v-model="search"
            class="tpl-search"
            size="lg"
            placeholder="전시명을 입력하세요"
            aria-label="템플릿 검색"
          />

          <div class="tpl-grid">
            <!-- 빈 템플릿 카드 — '전체'에 하나만 둔다.
                 어느 팀의 빈 문서인지는 다음 걸음(폴더 선택)에서 고른다. 팀마다 카드를 두면
                 같은 빈 문서가 팀 수만큼 늘어서고, 팀을 잘못 골랐을 때 되돌릴 자리도 없다.
                 미리 볼 내용이 없으니 호버 버튼 없이 **누르면 바로 골라진다**. -->
            <button
              v-if="selectedTeam === ''"
              type="button"
              class="tpl-card tpl-card--blank"
              :class="{ 'is-selected': isBlankSelected }"
              :aria-pressed="isBlankSelected"
              @click="selectBlank"
              @dblclick="selectBlank(), goNext()"
            >
              <div class="tpl-thumb tpl-thumb--blank">
                <!-- 내용 없는 문서를 뜻하는 회색 뼈대 (이미지 한 장 + 글줄 + 버튼) -->
                <div class="blank-image"></div>
                <div class="blank-line blank-line--short"></div>
                <div class="blank-line"></div>
                <div class="blank-line"></div>
                <div class="blank-line"></div>
                <div class="blank-button"></div>
              </div>
              <div class="tpl-card-name">빈 화면</div>
            </button>

            <!-- 템플릿 카드 — 올리면 '미리보기'·'템플릿 선택하기'가 썸네일 위에 뜬다 (Figma 1468-9267).
                 고른 카드는 파란 테두리(1472-9524). 안에 버튼이 둘이라 카드 자체는 버튼이 아니다.
                 더블클릭하면 고르고 바로 다음(폴더 선택)으로 간다 — '미리보기' 위에서는 예외. -->
            <div
              v-for="t in filteredTemplates"
              :key="t.id"
              class="tpl-card"
              :class="{ 'is-selected': isTemplateSelected(t) }"
              @dblclick="selectTemplate(t), goNext()"
            >
              <div class="tpl-thumb">
                <!-- 미리 만들어 둔 썸네일 이미지가 있으면 그걸 쓴다(빠름).
                     없는 템플릿만 실제 렌더해서 iframe으로 보여준다(폴백). -->
                <img
                  v-if="thumbSrc(t)"
                  :src="thumbSrc(t)"
                  :alt="`${t.name} 미리보기`"
                  class="tpl-thumb-img"
                  loading="lazy"
                  decoding="async"
                />
                <iframe
                  v-else-if="srcdocs[t.id]"
                  :srcdoc="srcdocs[t.id]"
                  class="tpl-thumb-iframe"
                  sandbox="allow-same-origin"
                  scrolling="no"
                  loading="lazy"
                ></iframe>
                <div v-else class="tpl-thumb-loading">
                  <i class="pi pi-spin pi-spinner text-gray-300"></i>
                </div>

                <!-- 호버/포커스 시 덮이는 두 버튼 -->
                <div class="tpl-hover">
                  <button type="button" class="tpl-hover-btn" @click="openPreview(t)" @dblclick.stop>
                    <span class="material-symbols-outlined">search</span>
                    미리보기
                  </button>
                  <button type="button" class="tpl-hover-btn tpl-hover-btn--dark" @click="selectTemplate(t)">
                    <span class="material-symbols-outlined">check</span>
                    템플릿 선택하기
                  </button>
                </div>
              </div>
              <div class="tpl-card-name">{{ t.name }}</div>
            </div>

            <!-- 결과 없음 -->
            <div v-if="filteredTemplates.length === 0" class="tpl-empty">
              해당 조건의 템플릿이 없습니다.
            </div>
          </div>
        </main>

        <!-- 하단 — 첫 걸음이라 '이전으로'는 늘 잠겨 있고, 카드를 고르면 '다음'이 켜진다.
             왼쪽에 고른 이름을 적어 두어, 다른 카드로 바꿨을 때 무엇이 골라졌는지 바로 보이게 한다. -->
        <FlowFooter>
          <template #info>
            <p class="flow-info">
              <span class="flow-info-label">
                <span class="material-symbols-outlined">check_circle</span>
                선택한 템플릿
              </span>
              <span v-if="selectedName" class="flow-info-value">{{ selectedName }}</span>
              <span v-else class="flow-info-value flow-info-value--empty">아직 고르지 않았어요</span>
            </p>
          </template>
          <button type="button" class="flow-btn flow-btn--ghost" disabled>이전으로</button>
          <button
            type="button"
            class="flow-btn flow-btn--primary"
            :disabled="!selected || applying"
            @click="goNext"
          >
            다음
          </button>
        </FlowFooter>
      </div>
    </div>

    <!-- 미리보기 모달 — '이 템플릿 선택하기'면 고른 뒤 닫는다 -->
    <TemplatePreviewDialog
      :template="previewTemplate"
      @close="previewTemplate = null"
      @select="selectFromPreview"
    />

    <!-- 템플릿 적용 중 오버레이 -->
    <div v-if="applying" class="tpl-overlay">
      <i class="pi pi-spin pi-spinner text-2xl text-blue-500"></i>
      <span>템플릿을 불러오는 중…</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import FlowStepsHeader from '@/components/layout/FlowStepsHeader.vue'
import FlowFooter from '@/components/layout/FlowFooter.vue'
import TeamTreeSidebar from '@/components/layout/TeamTreeSidebar.vue'
import SearchField from '@/components/SearchField.vue'
import TemplatePreviewDialog from '@/components/TemplatePreviewDialog.vue'
import { getHistoryInstance } from '@/composables/useHistory'
import type { NewsletterTemplate } from '@/types'

const router = useRouter()
const moduleStore = useModuleStore()
const editorStore = useEditorStore()

// 좌측 부서/팀 트리는 TeamTreeSidebar가 그린다(폴더 선택 화면과 공용).
// 여기서는 고른 팀 id만 들고 카드 목록을 거른다 — 표시명이 아니라 id로 매칭한다.
const selectedTeam = ref<string>('') // '' = 전체, 그 외엔 팀 id
const search = ref('')

const templates = ref<NewsletterTemplate[]>([])
const srcdocs = reactive<Record<string, string>>({})
const applying = ref(false)

/**
 * 고른 카드 — 카드를 누르는 순간 적용하지 않고 여기 담아 두었다가 '다음'에서 간다.
 * 빈 템플릿은 누르면 곧바로 골라지고, 템플릿은 호버 버튼(또는 미리보기 모달)에서 고른다.
 */
type Selection = { kind: 'blank' } | { kind: 'template'; template: NewsletterTemplate }
const selected = ref<Selection | null>(null)
const isBlankSelected = computed(() => selected.value?.kind === 'blank')
const isTemplateSelected = (t: NewsletterTemplate) =>
  selected.value?.kind === 'template' && selected.value.template.id === t.id
/** 하단 안내에 적을 이름 — 카드 이름과 같은 표기 */
const selectedName = computed(() => {
  const pick = selected.value
  if (!pick) return ''
  return pick.kind === 'blank' ? '빈 화면' : pick.template.name
})

const selectBlank = () => {
  selected.value = { kind: 'blank' }
}
const selectTemplate = (t: NewsletterTemplate) => {
  selected.value = { kind: 'template', template: t }
}

/** 미리보기 모달에 띄운 템플릿 — null 이면 닫힘 */
const previewTemplate = ref<NewsletterTemplate | null>(null)
const openPreview = (t: NewsletterTemplate) => {
  previewTemplate.value = t
}
const selectFromPreview = (t: NewsletterTemplate) => {
  selectTemplate(t)
  previewTemplate.value = null
}

// 카드 정렬: 좌측 트리와 같은 순서(본부 → 팀)로 묶고, 그 안에서는 이름 가나다ABC 순.
// (localeCompare('ko')가 한글 → 영문 순서를 만든다. JSON 순서에 기대지 않고 화면에서 정렬한다)
// 순서는 폐지된 조직까지 포함한 원본 트리로 매긴다 — 감춰진 팀의 옛 템플릿이
// '전체'에서 맨 뒤로 밀려나지 않고 제자리를 지키게 하기 위해서다.
const rankOf = (t: NewsletterTemplate): [number, number] => {
  const list = moduleStore.availableDepartments
  const dIdx = list.findIndex((d) => d.id === t.divisionId)
  if (dIdx === -1) return [list.length, 0] // 트리에 없는 본부는 맨 뒤
  const tIdx = list[dIdx].teams.findIndex((team) => team.id === t.teamId)
  return [dIdx, tIdx === -1 ? list[dIdx].teams.length : tIdx]
}

const filteredTemplates = computed(() => {
  const q = search.value.trim().toLowerCase()
  return templates.value
    .filter((t) => {
      const teamOk = selectedTeam.value === '' || t.teamId === selectedTeam.value
      const searchOk = !q || t.name.toLowerCase().includes(q)
      return teamOk && searchOk
    })
    .sort((a, b) => {
      const [ad, at] = rankOf(a)
      const [bd, bt] = rankOf(b)
      return ad - bd || at - bt || a.name.localeCompare(b.name, 'ko')
    })
})

// 미리 만들어 둔 썸네일 이미지 — src/assets/img/thumbnail/*.png 를 파일명으로 찾는다.
// (Vite가 해시 붙인 URL로 바꿔 주므로 경로를 직접 쓰지 않고 이 표를 거친다)
const THUMBNAILS = import.meta.glob<string>('@/assets/img/thumbnail/*.png', {
  eager: true,
  import: 'default',
})
const thumbUrlByFile: Record<string, string> = Object.fromEntries(
  Object.entries(THUMBNAILS).map(([p, url]) => [p.split('/').pop()!, url]),
)
/** 템플릿의 thumbnail(파일명)에 해당하는 이미지 URL. 없으면 undefined → iframe 폴백 */
const thumbSrc = (t: NewsletterTemplate): string | undefined =>
  t.thumbnail ? thumbUrlByFile[t.thumbnail] : undefined

// 썸네일 iframe 문서 만들기 (680px로 렌더 → CSS scale로 축소해 고정 박스에 맞춤)
const buildThumbDoc = (content: string): string =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank">` +
  // ⚠ iframe 안 문서라 앱의 CSS 변수(tokens.css)가 닿지 않는다 — 색은 리터럴로 둔다
  `<style>html,body{margin:0;padding:0;background:#fff;overflow:hidden;}*{box-sizing:border-box;}</style>` +
  `</head><body><div style="width:680px;max-width:680px;margin:0;">${content}</div></body></html>`

onMounted(async () => {
  templates.value = await moduleStore.loadAvailableTemplates()
  // 썸네일 이미지가 없는 템플릿만 실제 렌더한다 (렌더 한 건당 모듈 수만큼 fetch가 돌아 비싸다).
  // 순차 처리 — 과도한 동시 fetch 방지.
  for (const t of templates.value) {
    if (thumbSrc(t)) continue
    try {
      const html = await moduleStore.renderTemplateHtml(t)
      srcdocs[t.id] = buildThumbDoc(html)
    } catch (e) {
      console.warn('[TemplateSelect] 썸네일 렌더 실패:', t.id, e)
    }
  }
})

/**
 * 빈 문서로 시작 — 아직 아무것도 정하지 않은 채 폴더 선택으로 간다.
 *
 * 전시회를 고르게 하지 않는다. S3에는 전시회 폴더가 47개인데 빌더 템플릿은 19종뿐이라,
 * 템플릿 목록에서 고르라고 하면 정작 만들려는 전시회가 목록에 없는 경우가 더 많다.
 * 그래서 templateId를 비우고, 이미지는 `{팀}/blank/vol{NN}/`에 모은다(s3Upload.uploadFolderOf).
 *
 * **팀도 여기서 정하지 않는다** — 폴더 선택 화면의 팀 메뉴에서 고른다. 그래야 빈 템플릿
 * 카드가 '전체'에 하나만 있어도 되고, 팀을 잘못 골랐을 때 그 자리에서 바꿀 수 있다.
 */
const startBlank = () => {
  moduleStore.clearAll()
  // 앞서 둘러본 템플릿의 배경색·요약이 묻어나지 않도록 전체 스타일도 처음 값으로
  editorStore.resetWrapSettings()
  getHistoryInstance().clearHistory()
  editorStore.setCurrentTemplate({
    templateId: null,
    templateName: '빈 템플릿',
    teamId: null,
  })
  router.push({ name: 'folder' })
}

// 템플릿 적용 후 폴더 선택으로
const applyTemplate = async (t: NewsletterTemplate) => {
  if (applying.value) return
  applying.value = true
  try {
    // 불러오는 동안 실행취소 감시를 멈춘다 — 모듈 수십 개가 연달아 들어오는 구간이라
    // 감시를 켜 둔 채로 하면 배열 전체를 매번 다시 훑어 눈에 띄게 느려진다
    await getHistoryInstance().runBulk(() => moduleStore.loadTemplate(t.id))
    // 실행취소 기록은 템플릿마다 새로 시작한다 — 안 지우면 Ctrl+Z가 **직전에 열었던 템플릿**의
    // 내용을 되살린다(실행취소 인스턴스는 화면 이동과 무관하게 살아 있다).
    getHistoryInstance().clearHistory()
    // 팀은 표시명이 아니라 id로 넘긴다 — 헤더의 팀 이름은 이 id로 트리에서 찾는다
    editorStore.setCurrentTemplate({
      templateId: t.id,
      templateName: t.name,
      teamId: t.teamId ?? null,
    })
    // 폴더는 다음 걸음에서 고른다 — 앞서 만들던 뉴스레터의 회차가 남아 있으면
    // 그 폴더로 조용히 올라가므로 여기서 비운다(가드도 이 값이 비면 폴더 선택으로 돌린다).
    editorStore.updateWrapSettings({ volume: '' })
    router.push({ name: 'folder' })
  } finally {
    applying.value = false
  }
}

/** '다음' — 고른 것을 그제야 적용한다 */
const goNext = () => {
  const pick = selected.value
  if (!pick) return
  if (pick.kind === 'blank') startBlank()
  else void applyTemplate(pick.template)
}
</script>

<style scoped>
/* 화면 높이에 고정 — 카드 목록만 스크롤되고 하단 이전/다음은 늘 보인다 (폴더 선택 화면과 같은 구조) */
.tpl-page {
  height: 100vh;
  background: var(--white);
  display: flex;
  flex-direction: column;
}
.tpl-body {
  flex: 1;
  display: flex;
  min-height: 0;
}
/* 우측 열 — 스크롤되는 본문 + 고정 하단. 하단선은 사이드바 오른쪽에서만 긋는다 (Figma 1468-8905) */
.tpl-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 우측 메인 */
.tpl-main {
  flex: 1;
  min-width: 0;
  padding: 40px 40px 60px;
  overflow-y: auto;
}
.tpl-title {
  font-size: 34px;
  font-weight: 500;
  color: var(--black);
  letter-spacing: -0.34px;
  margin: 0 0 28px;
}
/* 모양은 공용 SearchField(lg)가 갖고, 여기서는 자리만 잡는다 */
.tpl-search {
  max-width: 630px;
  margin-bottom: 40px;
}

/* 카드 그리드 */
.tpl-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
}
.tpl-card {
  width: 190px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: none;
  border: 0;
  padding: 0;
  text-align: left;
}
.tpl-card--blank {
  cursor: pointer;
}
.tpl-thumb {
  width: 190px;
  height: 223px;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  overflow: hidden;
  background: var(--white);
  position: relative;
  transition: box-shadow 0.15s, border-color 0.15s;
}
/* 키보드로 안의 버튼에 갔을 때도 호버와 같게. :focus-within 이 아니라 :focus-visible 인 이유 —
   마우스로 '템플릿 선택하기'를 누르면 포커스가 버튼에 남아 덮개가 안 걷히고, 고른 카드의
   파란 테두리(1472-9524)를 볼 수 없다. */
.tpl-card:hover .tpl-thumb,
.tpl-card:has(:focus-visible) .tpl-thumb {
  border-color: var(--blue-400);
  box-shadow: 0 4px 14px rgba(64, 131, 243, 0.18);
}
/* 고른 카드 — 파란 테두리 (Figma 1472-9524) */
.tpl-card.is-selected .tpl-thumb {
  border-color: var(--blue-400);
}
.tpl-card--blank.is-selected .tpl-thumb {
  box-shadow: 0 4px 14px rgba(64, 131, 243, 0.18);
}

/* 호버 시 썸네일을 덮는 두 버튼 (Figma 1468-9267) — 흰 바탕, 26px 안쪽, 위 31px */
.tpl-hover {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 21px;
  padding: 31px 26px;
  background: var(--white);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
}
.tpl-card:hover .tpl-hover,
.tpl-card:has(:focus-visible) .tpl-hover {
  opacity: 1;
  pointer-events: auto;
}
.tpl-hover-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 12px 24px;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  background: var(--white);
  color: var(--gray-600);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}
.tpl-hover-btn .material-symbols-outlined {
  font-size: 18px;
}
.tpl-hover-btn:hover {
  border-color: var(--gray-300);
  background: var(--gray-50);
}
.tpl-hover-btn--dark {
  border-color: var(--gray-700);
  background: var(--gray-700);
  color: var(--white);
}
.tpl-hover-btn--dark .material-symbols-outlined {
  font-size: 20px;
}
.tpl-hover-btn--dark:hover {
  border-color: var(--gray-800);
  background: var(--gray-800);
}

/* ===== 빈 템플릿 카드 =====
   실제 미리보기가 없으니 '내용 없는 문서'를 회색 뼈대로 그린다.
   (다른 카드와 같은 190×223 박스 안에 들어가도록 크기를 고정값으로 맞춘다) */
.tpl-thumb--blank {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 18px 16px;
}
.blank-image {
  width: 100%;
  height: 84px;
  border-radius: 4px;
  background: var(--gray-100);
  /* 사진 자리임을 알리는 아이콘 — 배경으로 그려 넣어 마크업을 늘리지 않는다 */
  background-image: radial-gradient(circle at 34% 38%, var(--gray-200) 7px, transparent 7px);
  margin-bottom: 6px;
}
.blank-line {
  width: 100%;
  height: 5px;
  border-radius: 3px;
  background: var(--gray-100);
}
.blank-line--short {
  width: 58%;
  margin-right: auto;
}
.blank-button {
  width: 62%;
  height: 18px;
  border-radius: 9px;
  background: var(--gray-100);
  margin-top: 10px;
}

/* 미리 만들어 둔 썸네일 이미지 — 680×800으로 캡처한 것을 박스 안쪽(188×221)에 맞춰 크롭.
   비율이 조금 어긋나도 윗부분이 남도록 object-position:top. */
.tpl-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
  display: block;
}
/* 680px로 렌더한 뒤 scale(190/680=0.2794)로 축소 — 상단을 고정 박스에 맞춰 크롭 */
.tpl-thumb-iframe {
  width: 680px;
  height: 820px;
  border: 0;
  display: block;
  background: var(--white);
  transform: scale(0.2794);
  transform-origin: top left;
  pointer-events: none;
}
.tpl-thumb-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.tpl-card-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-800);
  word-break: break-word;
}
.tpl-empty {
  color: var(--gray-400);
  font-size: 14px;
  padding: 40px 0;
}

/* 하단 이전/다음은 FlowFooter(폴더 선택과 공용)가 그린다 */

/* 적용 중 오버레이 */
.tpl-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--gray-700);
  z-index: 2000;
}
</style>
