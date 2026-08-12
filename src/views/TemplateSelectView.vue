<template>
  <div class="tpl-page">
    <!-- 상단 바: 에디터와 공통 헤더. 단, 파일 관리 버튼들은 숨김 -->
    <AppHeader :show-actions="false" />

    <div class="tpl-body">
      <!-- 좌측: 부서/팀 트리 -->
      <aside class="tpl-sidebar">
        <button
          class="tpl-team tpl-team--top"
          :class="{ 'is-active': selectedTeam === '' }"
          @click="selectedTeam = ''"
        >
          전체
        </button>

        <div v-for="dept in departments" :key="dept.id" class="tpl-dept">
          <button class="tpl-dept-head" @click="toggle(dept.id)">
            <span>{{ dept.name }}</span>
            <i class="pi text-xs text-gray-400" :class="isOpen(dept.id) ? 'pi-angle-down' : 'pi-angle-right'"></i>
          </button>
          <div v-show="isOpen(dept.id)" class="tpl-team-list">
            <button
              v-for="team in dept.teams"
              :key="team.id"
              class="tpl-team"
              :class="{ 'is-active': selectedTeam === team.id }"
              @click="selectedTeam = team.id"
            >
              {{ team.name }}
            </button>
          </div>
        </div>
      </aside>

      <!-- 우측: 제목 + 검색 + 카드 그리드 -->
      <main class="tpl-main">
        <h1 class="tpl-title">템플릿을 선택해주세요.</h1>

        <div class="tpl-search">
          <i class="pi pi-search"></i>
          <InputText
            v-model="search"
            placeholder="전시명 / 템플릿명을 입력하세요"
            class="tpl-search-input"
            aria-label="템플릿 검색"
          />
        </div>

        <div class="tpl-grid">
          <!-- 빈 템플릿 카드는 두지 않는다 — 항상 팀·템플릿을 고른 뒤 에디터로 들어온다.
               빈 상태로 시작하려면 에디터의 '빈 템플릿'(레일)·'전체 삭제'(헤더)를 쓴다. -->
          <!-- 템플릿 카드 -->
          <button
            v-for="t in filteredTemplates"
            :key="t.id"
            class="tpl-card"
            @click="pickTemplate(t)"
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
            </div>
            <div class="tpl-card-name">{{ t.name }}</div>
          </button>

          <!-- 결과 없음 -->
          <div v-if="filteredTemplates.length === 0" class="tpl-empty">
            해당 조건의 템플릿이 없습니다.
          </div>
        </div>
      </main>
    </div>

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
import AppHeader from '@/components/layout/AppHeader.vue'
import type { NewsletterTemplate } from '@/types'

const router = useRouter()
const moduleStore = useModuleStore()
const editorStore = useEditorStore()

// 좌측 부서/팀 트리 — templates-config.json의 departments에서 온다.
// (화면·검사 테스트·등록 스크립트가 모두 그 한 곳을 보므로 여기에 따로 적지 않는다)
// 배열 순서가 곧 표시 순서. 필터는 template.teamId와 id로 매칭한다(표시명이 아니다).
//
// 폐지된 조직(active: false)은 트리에서 감춘다. 정의는 지우지 않으므로 그 팀의
// 옛 템플릿은 '전체'에서 계속 보이고, 저장된 teamId도 여전히 이름을 찾을 수 있다.
const departments = computed(() =>
  moduleStore.availableDepartments
    .filter((d) => d.active !== false)
    .map((d) => ({ ...d, teams: d.teams.filter((t) => t.active !== false) }))
    .filter((d) => d.teams.length > 0),
)

const selectedTeam = ref<string>('') // '' = 전체, 그 외엔 팀 id
const search = ref('')

// 부서 접기/펼치기 — 기본 펼침(기록에 없으면 열린 것으로 본다).
// 트리를 비동기로 받아오므로 목록을 미리 채우지 않는다.
const openDepts = reactive<Record<string, boolean>>({})
const isOpen = (deptId: string) => openDepts[deptId] !== false
const toggle = (deptId: string) => {
  openDepts[deptId] = !isOpen(deptId)
}

const templates = ref<NewsletterTemplate[]>([])
const srcdocs = reactive<Record<string, string>>({})
const applying = ref(false)

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

// 템플릿 선택 → 적용 후 에디터로
const pickTemplate = async (t: NewsletterTemplate) => {
  if (applying.value) return
  applying.value = true
  try {
    await moduleStore.loadTemplate(t.id)
    // 팀은 표시명이 아니라 id로 넘긴다 — 헤더의 팀 이름은 이 id로 트리에서 찾는다
    editorStore.setCurrentTemplate({
      templateId: t.id,
      templateName: t.name,
      teamId: t.teamId ?? null,
    })
    router.push('/editor')
  } finally {
    applying.value = false
  }
}
</script>

<style scoped>
.tpl-page {
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
}
.tpl-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

/* 좌측 사이드바 */
.tpl-sidebar {
  width: 225px;
  flex-shrink: 0;
  border-right: 1px solid #f5f5f5;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 25px;
}
.tpl-dept {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.tpl-dept-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 7px 20px;
  font-size: 16px;
  font-weight: 500;
  color: #191f28;
  letter-spacing: -0.16px;
  background: none;
  border: 0;
  cursor: pointer;
}
.tpl-team-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.tpl-team {
  text-align: left;
  width: 100%;
  padding: 7px 20px;
  font-size: 16px;
  font-weight: 400;
  color: #6b7684;
  letter-spacing: -0.16px;
  background: none;
  border: 0;
  border-radius: 25px;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.tpl-team:hover {
  background: #f6f8fa;
}
.tpl-team--top {
  font-weight: 500;
  color: #191f28;
}
.tpl-team.is-active {
  position: relative;
  background: #ebf3ff;
  color: #191f28;
  font-weight: 500;
}
.tpl-team.is-active::before{content: ""; display: block; width: 5px; height: 100%; background-color: var(--p-primary-500); position: absolute; top: 0; left: -16px; border-radius: 0 5px 5px 0;}

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
  color: #000;
  letter-spacing: -0.34px;
  margin: 0 0 28px;
}
.tpl-search {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  max-width: 630px;
  padding: 0 20px;
  background: #f2f4f6;
  border-radius: 50px;
  margin-bottom: 40px;
}
.tpl-search > .pi-search {
  font-size: 20px;
  color: #6b7684;
  flex-shrink: 0;
}
/* PrimeVue InputText를 알약 배경 안에서 테두리/배경 없이 평평하게 */
.tpl-search-input {
  flex: 1;
  min-width: 0;
}
.tpl-search :deep(.p-inputtext) {
  width: 100%;
  border: 0;
  background: transparent;
  outline: none;
  box-shadow: none;
  padding: 0;
  font-size: 17px;
  color: #191f28;
}
.tpl-search :deep(.p-inputtext:enabled:focus),
.tpl-search :deep(.p-inputtext:enabled:hover) {
  border: 0;
  box-shadow: none;
}
.tpl-search :deep(.p-inputtext::placeholder) {
  color: #6b7684;
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
  cursor: pointer;
  text-align: left;
}
.tpl-thumb {
  width: 190px;
  height: 223px;
  border: 1px solid #e5e8eb;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  position: relative;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.tpl-card:hover .tpl-thumb {
  border-color: #4083f3;
  box-shadow: 0 4px 14px rgba(64, 131, 243, 0.18);
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
  background: #fff;
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
  color: #191f28;
  word-break: break-word;
}
.tpl-empty {
  color: #9ca3af;
  font-size: 14px;
  padding: 40px 0;
}

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
  color: #374151;
  z-index: 2000;
}
</style>
