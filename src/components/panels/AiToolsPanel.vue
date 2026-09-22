<script setup lang="ts">
/**
 * AI 도구 패널 (좌측 레일 'AI 도구').
 *
 * 도구는 둘이다.
 *
 * **다국어 번역** — 캔버스 전체의 한국어 문장을 영어·일본어·중국어(간체)로 번역해 미리 보여주고,
 * 확인·수정한 뒤 캔버스에 적용한다. 문장은 태그를 뺀 텍스트 노드 단위라 굵게·색상·링크 같은
 * 서식은 그대로 남고 글자만 바뀐다. Azure 키는 서버 프록시에만 있다(src/utils/azureTranslator.ts).
 *
 * **HTML 웹 링크 생성** — 아래 설명.
 *
 * 버튼 한 번으로 지금 작업물을 발송용 HTML(`{전시회}_{폴더}_send.html`)로 만들어
 * 저장 폴더에 올리고, 웹에서 바로 열 수 있는 주소를 돌려준다.
 * '웹으로 보기' 링크에 넣을 주소를 만드는 용도다.
 *
 * 파일을 직접 골라 올리지 않는 이유: 손으로 고르면 이름이 제각각이라 같은 뉴스레터의
 * HTML이 폴더에 여러 개 쌓이고, 어느 것이 최신인지 알 수 없게 된다.
 * 여기서는 **늘 같은 이름으로 덮어써** 폴더에 발송용 파일이 하나만 남는다(주소도 그대로 유지된다).
 *
 * 링크가 있는지는 **폴더를 읽어서** 안다. 화면에 따로 기억하지 않으므로 새로고침하거나
 * 다른 PC에서 열어도, 폴더에 발송용 파일이 있으면 처음부터 링크 카드가 보인다.
 * 주소 전체는 길고 읽히지 않아 감추고, 파일 이름·만든 시각만 보여준다(툴팁·새 창 열기로 확인).
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useModuleStore } from '@/stores/moduleStore'
import { TRANSLATION_LANGUAGES, useTranslationStore } from '@/stores/translationStore'
import { useWebLinkStore, webLinkToast } from '@/stores/webLinkStore'
import type { TranslationLanguage } from '@/utils/newsletterTranslation'
import toolTranslateIcon from '@/assets/img/ai/tool_translate.png'
import toolWeblinkIcon from '@/assets/img/ai/tool_weblink.png'
import stateEyesIcon from '@/assets/img/ai/state_eyes.png'
import stateWeblinkIcon from '@/assets/img/ai/state_weblink.png'
import stateTranslateIcon from '@/assets/img/ai/state_translate.png'

const moduleStore = useModuleStore()
const toast = useToast()

// ── HTML 웹 링크 ──────────────────────────────────────────────────────
// 상태와 동작은 webLinkStore에 있다 — 캔버스 오른쪽 아래 리마인드 팝업(WebLinkReminder)이
// 같은 것을 보고, 메뉴를 옮겨 편집하는 동안에도 '반영 안 됨'을 계속 알린다.
// 여기는 화면(카드·버튼)과 주소 복사만 맡는다.
const webLink = useWebLinkStore()

// ── Azure 뉴스레터 번역 ────────────────────────────────────────────────
// 상태와 동작은 translationStore에 있다 — 결과는 캔버스 옆 TranslationPreviewPanel에 뜨고,
// 메뉴를 옮겨도 남아 있다. 여기는 언어 고르기·대상 요약·번역 요청만 맡는다.
const translation = useTranslationStore()
const translationLanguages = TRANSLATION_LANGUAGES

// 문장 수·글자 수는 모듈 메타데이터(어떤 속성이 번역 대상인지)가 있어야 셀 수 있다 — 펼칠 때 미리 읽어 둔다
watch(
  () => translation.panelOpen,
  (open) => {
    if (open && !moduleStore.availableModules.length) void moduleStore.loadAvailableModules()
  },
  { immediate: true },
)

/**
 * 도구 메뉴 (Figma 1664-1425) — 카드는 이 배열만 보고 그린다.
 *
 * 최종안(Figma 1651-2875)은 위에 분류 탭(전체·만들기·다듬기·번역…)이 붙고 카드가
 * 분류별 묶음으로 나뉜다. 도구가 늘면 여기에 분류를 한 칸 더하고 묶음마다 그리드를
 * 한 번씩 돌리면 되도록, 카드 모양·간격은 배열 길이와 무관하게 맞춰 뒀다.
 */
const AI_TOOLS = [
  { key: 'weblink', label: 'HTML 웹 링크 생성', icon: toolWeblinkIcon },
  { key: 'translate', label: '다국어 번역', icon: toolTranslateIcon },
] as const
type ToolKey = (typeof AI_TOOLS)[number]['key']

/**
 * 지금 고른 도구 — 내용은 카드 아래에 펼쳐지고, 같은 카드를 다시 누르면 닫힌다.
 * 번역은 상태가 스토어에 있어 메뉴를 옮겼다 와도 남아 있으므로, 처음 값을 거기서 받아 온다.
 */
const activeTool = ref<ToolKey | null>(translation.panelOpen ? 'translate' : null)
const selectTool = (key: ToolKey): void => {
  activeTool.value = activeTool.value === key ? null : key
}
// 스토어의 열림 상태를 고른 도구와 어긋나지 않게 맞춰 둔다(번역 대상 문장 수 집계가 이 값을 본다)
watch(activeTool, (key) => {
  translation.panelOpen = key === 'translate'
})

/** 웹 링크 도구를 펼쳤는지 — 아래 폴더 조회 watch가 이 값을 본다 */
const isOpen = computed(() => activeTool.value === 'weblink')
const isTranslate = computed(() => activeTool.value === 'translate')

/** 카드에 붙는 모듈 아이콘 — 모듈 순서 패널과 같은 규칙 */
const CATEGORY_ICON: Record<string, string> = {
  image: 'broken_image',
  text: 'match_case',
  button: 'ads_click',
  table: 'border_all',
  divider: 'vertical_distribute',
  social: 'share',
}
const unitIcon = (category: string): string => CATEGORY_ICON[category] ?? 'widgets'

/**
 * 카드를 눌러 그 값이 어디에 쓰이는지 캔버스에서 보여준다.
 *
 * `moduleStore.selectModule`을 쓰지 않는 이유: 모듈을 선택하면 좌측 패널이 속성 편집으로
 * 바뀌어 번역 화면이 통째로 사라진다. 여기서는 캔버스만 그 모듈로 옮긴다.
 */
const selectUnit = (unitId: string, moduleInstanceId: string): void => {
  translation.selectedUnitId = unitId
  document
    .getElementById(`canvas-module-${moduleInstanceId}`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

/**
 * 번역문 칸을 내용만큼 늘린다 — 에디터에 쓴 글이 한 덩어리로 들어오므로 스크롤 대신 다 보이게.
 * (최소 높이는 CSS의 min-height가 지킨다 — 짧은 번역문도 칸이 쪼그라들지 않는다)
 */
const growTextarea = (el: HTMLTextAreaElement): void => {
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

/**
 * ⚠ 붙자마자 한 번, **다음 프레임에 한 번 더** 잰다.
 * mounted 시점에는 v-model 이 값을 넣기 전이라 빈 칸을 재고 최소 높이에 머무른다
 * (긴 번역문이 잘린 채로 굳는다). 글꼴이 늦게 와서 줄 수가 달라지는 것도 이때 함께 잡힌다.
 */
const vAutoGrow = {
  mounted: (el: HTMLTextAreaElement) => {
    growTextarea(el)
    requestAnimationFrame(() => growTextarea(el))
  },
  updated: growTextarea,
}
const autoGrow = (event: Event): void => growTextarea(event.target as HTMLTextAreaElement)

/** 결과를 버리고 언어 고르기 화면으로 되돌아간다 */
const cancelTranslation = (): void => translation.clear()

const applyTranslation = async (): Promise<void> => {
  const count = await translation.apply()
  if (!count) return
  toast.add({
    severity: 'success',
    summary: '번역을 적용했어요',
    detail: `${count}개 값을 적용했습니다. Ctrl+Z로 되돌릴 수 있어요.`,
    life: 4000,
  })
}

/** 도구 화면 머리에 적는 이름 */
const activeToolLabel = computed(
  () => AI_TOOLS.find((tool) => tool.key === activeTool.value)?.label ?? '',
)

/** 방금 복사했음을 잠깐 알리는 표시 */
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const uploadEnabled = webLink.enabled

// 도구를 펼칠 때, 그리고 펼친 채로 폴더가 바뀔 때 다시 읽는다 (접힌 동안은 읽지 않는다).
// 펼쳐 둔 동안에는 리마인드 팝업을 띄우지 않는다 — 이 화면에 같은 안내가 이미 붙어 있다.
watch(
  isOpen,
  (open) => {
    webLink.toolOpen = open
    if (!open) return
    webLink.refreshContentChanged()
    if (uploadEnabled) void webLink.loadExisting()
  },
  { immediate: true },
)
watch(
  () => webLink.targetDirectory,
  () => {
    if (isOpen.value && uploadEnabled) void webLink.loadExisting()
  },
)

/** 링크를 만들거나(처음) 최신 내용을 반영한다(두 번째부터) — 실제 동작은 스토어에 있다 */
const createLink = async () => {
  const result = await webLink.createLink()
  const message = webLinkToast(result)
  if (message) toast.add(message)
}

/**
 * 주소 복사.
 * 클립보드 API는 https(또는 localhost)에서만 동작해서, 막히면 예전 방식으로 한 번 더 시도한다.
 */
const copyLink = async () => {
  // 올리는 중에는 이 버튼이 '최신 내용 반영 중'을 알리는 자리라 눌러도 아무 일도 일어나지 않는다
  if (webLink.uploading) return
  const url = webLink.existing?.url
  if (!url) return
  let ok = false
  try {
    await navigator.clipboard.writeText(url)
    ok = true
  } catch {
    const area = document.createElement('textarea')
    area.value = url
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    document.body.removeChild(area)
  }
  if (!ok) {
    toast.add({
      severity: 'warn',
      summary: '복사하지 못했어요',
      detail: '링크를 새 창에서 연 뒤 주소를 직접 복사해 주세요.',
      life: 4000,
    })
    return
  }
  copied.value = true
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => (copied.value = false), 2000)
}

onBeforeUnmount(() => {
  // 올리기·폴더 읽기는 스토어가 들고 있어 패널이 내려가도 이어진다(리마인드 팝업이 같은 것을 본다)
  if (copiedTimer) clearTimeout(copiedTimer)
})
</script>

<template>
  <div class="side-panel ai-tools-panel" :class="{ 'is-detail': activeTool !== null }">
    <!-- ══ 도구 메뉴 (Figma 1664-1425) ══ -->
    <template v-if="activeTool === null">
      <!-- 제목 뒤에 깔리는 흐릿한 원 두 개 (Figma 1664-3253 / 1664-3252). 장식이라 읽히지 않게 숨긴다 -->
      <span class="ai-blob ai-blob--blue" aria-hidden="true"></span>
      <span class="ai-blob ai-blob--violet" aria-hidden="true"></span>

      <h2 class="ai-heading">어떤 기능을 원하시나요?</h2>

      <!-- 2열 카드. 고르면 그 도구의 화면으로 넘어간다 -->
      <div class="ai-tool-grid">
        <button
          v-for="tool in AI_TOOLS"
          :key="tool.key"
          type="button"
          class="ai-tool-card"
          @click="selectTool(tool.key)"
        >
          <img class="ai-tool-icon" :src="tool.icon" width="36" height="36" alt="" />
          <span class="ai-tool-label">{{ tool.label }}</span>
          <!-- 들어가 보기 전에도 확인할 번역 결과가 있다는 걸 알 수 있게 -->
          <span
            v-if="tool.key === 'translate' && translation.preview.length"
            class="ai-tool-badge"
            >{{ translation.preview.length }}</span
          >
        </button>
      </div>
    </template>

    <!-- ══ 고른 도구의 화면 (Figma 1719-6030 / 1720-11814 / 1728-12187) ══
         머리(뒤로가기) · 본문(가운데) · 발(주 버튼) 세 켜로 나뉘고, 본문만 스크롤한다 -->
    <section v-else class="tool-screen">
      <header class="tool-head">
        <div class="tool-head-row">
          <button type="button" class="tool-back" @click="activeTool = null">
            <span class="material-symbols-outlined tool-back-icon" aria-hidden="true">
              arrow_back_ios
            </span>
            <span class="tool-title">{{ activeToolLabel }}</span>
          </button>
        </div>

        <!-- 한국어 → 고른 언어. 결과를 보는 중에는 바꿀 수 없다(그 언어로 받은 결과라서) -->
        <div v-if="isTranslate" class="tr-lang">
          <span class="tr-lang-from">한국어</span>
          <span class="material-symbols-outlined tr-lang-arrow" aria-hidden="true">arrow_forward</span>
          <div class="tr-lang-to">
            <span>{{ translation.targetLanguageLabel }}</span>
            <select
              v-if="!translation.hasResult"
              class="tr-lang-select"
              :value="translation.targetLanguage"
              :disabled="translation.translating"
              aria-label="번역할 언어"
              @change="translation.setTargetLanguage(($event.target as HTMLSelectElement).value as TranslationLanguage)"
            >
              <option v-for="lang in translationLanguages" :key="lang.value" :value="lang.value">
                {{ lang.label }}
              </option>
            </select>
            <span
              v-if="!translation.hasResult"
              class="material-symbols-outlined tr-lang-caret"
              aria-hidden="true"
              >expand_more</span
            >
          </div>
        </div>
      </header>

      <!-- ── HTML 웹 링크 생성 ── -->
      <div v-if="isOpen" class="tool-body">
        <!-- 업로드 주소가 없으면(서버 미설정) 눌러도 실패할 UI를 아예 감춘다 — 이미지 업로드와 같은 규칙 -->
        <p v-if="!uploadEnabled" class="ht-note tool-note">
          업로드 주소가 설정되지 않아 지금은 링크를 만들 수 없어요.
        </p>

        <!-- 폴더를 읽는 중 -->
        <p v-else-if="webLink.checking && !webLink.existing" class="ht-note tool-note">
          이 폴더에 링크가 있는지 확인하는 중…
        </p>

        <!-- 만들어진 링크 -->
        <div v-else-if="webLink.existing" class="wl-done">
          <div class="wl-done-head">
            <span class="wl-hero">
              <img :src="stateWeblinkIcon" width="103" height="103" alt="" />
            </span>
            <p class="wl-done-title">HTML 링크가 생성되었어요</p>
          </div>

          <dl class="wl-info">
            <div class="wl-info-row">
              <dt>생성 일시</dt>
              <dd>{{ webLink.createdAtLabel }}</dd>
            </div>
            <div class="wl-info-row">
              <dt>저장위치</dt>
              <dd>{{ webLink.savePath }}</dd>
            </div>
            <div class="wl-info-row">
              <dt>HTML 파일명</dt>
              <dd>{{ webLink.existing.name }}</dd>
            </div>
            <!-- 주소 전체는 길고 읽히지 않아 감춘다 — 툴팁과 새 창 열기로만 -->
            <div class="wl-info-row">
              <dt>웹으로 보기</dt>
              <dd>
                <a
                  class="wl-open"
                  :href="webLink.existing.url"
                  :title="webLink.existing.url"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span class="material-symbols-outlined" aria-hidden="true">open_in_new_down</span>
                </a>
              </dd>
            </div>
          </dl>

          <!-- 링크를 만든 뒤 뉴스레터가 바뀌었다 — 같은 주소에 덮어쓴다(주소는 그대로) -->
          <div v-if="webLink.contentChanged" class="wl-notice">
            <div class="wl-notice-head">
              <span class="material-symbols-outlined wl-notice-icon" aria-hidden="true">
                star_shine
              </span>
              <p class="wl-notice-text">
                뉴스레터 내용이 변경되었어요.<br />생성된 링크에 최신 내용 반영할까요?
              </p>
            </div>
            <button type="button" class="wl-notice-btn" @click="createLink">반영하기</button>
          </div>
        </div>

        <!-- 아직 만들기 전 -->
        <div v-else class="wl-empty">
          <span class="wl-hero">
            <img :src="stateEyesIcon" width="103" height="103" alt="" />
          </span>
          <div class="wl-empty-text">
            <p class="wl-empty-title">“웹으로 보기”를 위한<br />HTML 링크를 생성해보세요</p>
            <p v-if="webLink.savePath" class="wl-save">
              <span class="wl-save-name">
                <span class="material-symbols-outlined wl-save-icon" aria-hidden="true">
                  drive_file_move
                </span>
                저장위치
              </span>
              <span class="wl-save-value">{{ webLink.savePath }}</span>
            </p>
          </div>
        </div>
      </div>

      <!-- 웹 링크의 주 버튼 — 만들기 전에는 '생성하기', 만든 뒤에는 '링크 복사'.
           올리는 중이라는 것도 '복사됨'과 똑같이 버튼 글자만 바꿔 알린다(진행률 막대는 두지 않는다). -->
      <footer v-if="isOpen && uploadEnabled" class="tool-foot">
        <!-- 폴더가 없을 때처럼 눌러 봐야 아는 문제는 여기서 알린다 -->
        <p v-if="webLink.errorText" class="ht-error">{{ webLink.errorText }}</p>
        <button
          v-if="webLink.existing"
          type="button"
          class="tool-cta"
          :aria-busy="webLink.uploading"
          @click="copyLink"
        >
          <span class="material-symbols-outlined" aria-hidden="true">content_copy</span>
          {{ webLink.uploading ? '최신 내용 반영 중' : copied ? '복사됨' : '링크 복사' }}
        </button>
        <button
          v-else
          type="button"
          class="tool-cta"
          :disabled="webLink.checking"
          :aria-busy="webLink.uploading"
          @click="createLink"
        >
          {{ webLink.uploading ? '링크 만드는 중' : '웹 링크 생성하기' }}
        </button>
      </footer>

      <!-- ── Azure 다국어 번역 ── -->
      <div v-if="isTranslate" class="tool-body tr-body">
        <p v-if="!translation.enabled" class="ht-note tool-note">
          번역 서버 주소가 설정되지 않아 지금은 번역할 수 없어요.
        </p>

        <!-- 결과 — 값 하나가 카드 한 장. 카드를 누르면 캔버스가 그 모듈로 옮겨간다 -->
        <template v-else-if="translation.hasResult">
          <div class="tr-cards">
            <button
              v-for="item in translation.preview"
              :key="item.id"
              type="button"
              class="tr-card"
              :class="{ 'is-selected': translation.selectedUnitId === item.id }"
              @click="selectUnit(item.id, item.moduleInstanceId)"
            >
              <span class="tr-card-head">
                <span class="tr-card-name">
                  <span class="material-symbols-outlined tr-card-icon" aria-hidden="true">
                    {{ unitIcon(item.category) }}
                  </span>
                  {{ item.moduleName }}
                </span>
                <!-- 모듈 이름만으로 어느 값인지 알 수 없을 때만 (이미지 설명 · 1행 1열 …) -->
                <span v-if="item.badge" class="tr-card-badge">{{ item.badge }}</span>
              </span>

              <span class="tr-card-body">
                <span class="tr-field">
                  <span class="tr-field-label">원문</span>
                  <span class="tr-source">{{ item.source }}</span>
                </span>
                <span class="tr-field">
                  <span class="tr-field-label">번역</span>
                  <!-- 고칠 수 있다. 클릭이 카드 선택으로 새지 않게 막는다 -->
                  <textarea
                    v-auto-grow
                    v-model="item.translated"
                    class="tr-textarea"
                    rows="1"
                    aria-label="번역문"
                    @click.stop
                    @input="autoGrow"
                  ></textarea>
                </span>
              </span>
            </button>
          </div>
        </template>

        <!-- 번역 중 -->
        <p v-else-if="translation.translating" class="ht-note tool-note">
          {{ translation.targetLanguageLabel }}로 번역하는 중…
        </p>

        <!-- 아직 돌리기 전 -->
        <template v-else>
          <p class="tr-scope-badge">전체 모듈 {{ moduleStore.modules.length }}개</p>

          <div class="wl-empty tr-empty">
            <span class="wl-hero">
              <img :src="stateTranslateIcon" width="103" height="103" alt="" />
            </span>
            <div class="wl-empty-text">
              <p class="wl-empty-title">
                변환하고 싶은 언어를 선택 후,<br />“번역 결과 확인하기”를 눌러주세요
              </p>
              <p class="tr-empty-hint">글자 굵기·색상 같은 서식과 링크는 유지돼요.</p>
            </div>
          </div>

          <p class="tr-counts">
            {{ translation.units.length }}개 문장 ·
            {{ translation.characterCount.toLocaleString() }}자
          </p>
        </template>
      </div>

      <!-- 번역의 주 버튼 — 돌리기 전에는 '확인하기', 결과를 볼 때는 '취소 / 적용하기' -->
      <footer v-if="isTranslate && translation.enabled" class="tool-foot">
        <p v-if="translation.error" class="ht-error">{{ translation.error }}</p>

        <template v-if="translation.hasResult">
          <p class="tr-foot-note">*모든 번역이 한 번에 적용돼요.</p>
          <div class="tr-foot-actions">
            <button type="button" class="tool-cta tool-cta--ghost" @click="cancelTranslation">
              취소
            </button>
            <button type="button" class="tool-cta" @click="applyTranslation">적용하기</button>
          </div>
        </template>

        <button
          v-else
          type="button"
          class="tool-cta"
          :disabled="!translation.units.length || translation.translating"
          :aria-busy="translation.translating"
          @click="translation.request()"
        >
          {{ translation.translating ? '번역하는 중' : '번역 결과 확인하기' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
/* 패널 껍데기(폭·여백)는 공용 .side-panel. 여기서는 제목·메뉴·본문 사이 간격을
   Figma 좌표대로 직접 주므로 공용 gap 을 끈다. */
.ai-tools-panel {
  position: relative;
  gap: 0;
}
/* 도구 화면은 머리·발이 패널 가장자리까지 닿아야 해서 공용 여백을 걷고 안에서 직접 준다 */
.ai-tools-panel.is-detail {
  padding: 0;
  overflow: hidden;
}

/* ══ 도구 화면 껍데기 ══ 머리·본문·발 세 켜. 본문만 늘어나고 스크롤한다 */
.tool-screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.tool-head {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  /* 제목 ↔ 언어 행 사이 (번역 화면에만 두 번째 줄이 있다) */
  gap: 25px;
  /* Figma 74px − 상단 바 60px */
  padding: 14px 25px 10px;
}
.tool-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 35px;
}
.tool-back {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 35px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--gray-800);
  cursor: pointer;
}
.tool-back-icon {
  font-size: 20px;
}
.tool-title {
  font-size: 20px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: -0.2px;
}

/* 본문 — 내용이 짧으면 가운데, 길면 위에서부터 (margin:auto 라 넘쳐도 잘리지 않는다) */
.tool-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 10px 25px 20px;
}
/* 화면 내용은 세로 가운데. (justify-content 와 달리 margin:auto 는 넘쳐도 잘리지 않는다) */
.wl-empty,
.wl-done,
.tool-note {
  margin-block: auto;
}
.tool-note {
  text-align: center;
}

.tool-foot {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 25px;
  border-top: 1px solid var(--gray-200);
  background: var(--white);
}
.tool-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 45px;
  border: 0;
  border-radius: 8px;
  background: var(--blue-400);
  color: var(--white);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}
.tool-cta:hover:not(:disabled) {
  background: var(--blue-500);
}
.tool-cta:disabled {
  background: var(--gray-200);
  color: var(--gray-400);
  cursor: not-allowed;
}
.tool-cta .material-symbols-outlined {
  font-size: 20px;
}

/* ── 웹 링크: 아직 만들기 전 (Figma 1719-6030) ── */
.wl-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
/* 그림 둘레 여백까지 포함한 자리 — 상태가 바뀌어도 그림 크기가 흔들리지 않는다 */
.wl-hero {
  display: grid;
  place-items: center;
  width: 122px;
  height: 122px;
}
.wl-hero img {
  display: block;
  width: 103px;
  height: 103px;
}
.wl-empty-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.wl-empty-title {
  margin: 0;
  font-size: 17px;
  font-weight: 500;
  line-height: 1.6;
  letter-spacing: -0.17px;
  color: var(--gray-750);
  text-align: center;
  word-break: keep-all;
}
.wl-save {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: var(--gray-600);
}
.wl-save-name {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 16px;
}
.wl-save-icon {
  font-size: 24px;
}
.wl-save-value {
  font-size: 17px;
}

/* ── 웹 링크: 만들어진 뒤 (Figma 1720-11814 / 1728-12187) ── */
.wl-done {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}
.wl-done-head {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.wl-done-title {
  margin: 0;
  font-size: 19px;
  font-weight: 500;
  line-height: 1.6;
  letter-spacing: -0.19px;
  color: var(--gray-750);
  text-align: center;
}

/* 값 목록 — 구분선 없이 여백으로만 나눈다 */
.wl-info {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
  margin: 0;
}
.wl-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  font-size: 15px;
  color: var(--gray-700);
}
.wl-info-row dt {
  flex-shrink: 0;
}
.wl-info-row dd {
  min-width: 0;
  margin: 0;
  font-weight: 500;
  text-align: right;
  overflow-wrap: anywhere;
}
.wl-open {
  display: inline-flex;
  color: var(--gray-700);
}
.wl-open .material-symbols-outlined {
  font-size: 24px;
}
.wl-open:hover {
  color: var(--blue-500);
}

/* 만든 뒤 내용이 바뀌었을 때만 뜨는 안내 */
.wl-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
  padding: 15px;
  border-radius: 8px;
  background: var(--gray-100);
}
.wl-notice-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.wl-notice-icon {
  font-size: 22px;
  color: var(--yellow-400);
}
.wl-notice-text {
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
  color: var(--gray-800);
  text-align: center;
  word-break: keep-all;
}
.wl-notice-btn {
  height: 40px;
  padding: 0 16px;
  border: 0;
  border-radius: 8px;
  background: var(--gray-700);
  color: var(--white);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.wl-notice-btn:hover {
  background: var(--gray-750);
}

/* ── 제목 뒤 배경 ──
   흐릿한 원 두 개(Figma Ellipse 1·2). 크기·좌표·번짐(blur 50)은 Figma 값 그대로이고,
   세로만 상단 바 높이(60px)만큼 당겼다 — Figma에서는 패널이 상단 바 뒤까지 이어지지만
   실제 패널은 상단 바 아래에서 시작하기 때문이다. 넘치는 부분은 .side-panel 이 자른다. */
.ai-blob {
  position: absolute;
  z-index: 0;
  border-radius: 50%;
  filter: blur(50px);
  pointer-events: none;
  /* 흐린 면을 매 프레임 다시 그리지 않도록 합성 레이어로 올려 둔다 */
  will-change: transform;
}
.ai-blob--blue {
  top: -90px; /* Figma -37 − 60 */
  left: -14px;
  width: 215px;
  height: 217px;
  background: var(--blue-50);
  animation: ai-blob-blue 28s ease-in-out infinite;
}
.ai-blob--violet {
  top: -100px; /* Figma -69 − 60 */
  left: 164px;
  width: 195px;
  height: 197px;
  background: color-mix(in srgb, var(--group) 10%, transparent);
  animation: ai-blob-violet 34s ease-in-out infinite;
}

/* 아주 느리게 떠다닌다.
   자리(top/left)는 Figma 값 그대로 두고 transform 만 움직여서 — 합성만 다시 하므로 가볍고,
   움직이는 폭도 제목 언저리로 묶인다(아래로 최대 20여 px, 카드 줄(165px)까지 내려오지 않는다).
   둘의 주기를 다르게 둬서 같이 움직이는 것처럼 보이지 않게 한다. */
@keyframes ai-blob-blue {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(18px, 16px) scale(1.05);
  }
  50% {
    transform: translate(30px, 4px) scale(0.6);
  }
  75% {
    transform: translate(10px, 20px) scale(1.03);
  }
}
@keyframes ai-blob-violet {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(-20px, 20px) scale(0.6);
  }
  50% {
    transform: translate(-6px, 6px) scale(1.66);
  }
  75% {
    transform: translate(-26px, 16px) scale(1.06);
  }
}
/* 움직임을 줄여 달라고 설정한 사용자에게는 멈춰 둔다 */
@media (prefers-reduced-motion: reduce) {
  .ai-blob {
    animation: none;
  }
}

/* 제목 — 파랑에서 보라로 넘어가는 그라디언트 글자 */
.ai-heading {
  position: relative;
  z-index: 1;
  margin-top: 65px; /* 패널 안쪽 여백 25 + 65 = Figma 90 */
  width: 296px;
  max-width: 100%;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: -0.22px;
  word-break: keep-all;
  background: linear-gradient(90deg, var(--blue-500) 30.288%, var(--group) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* 도구 메뉴 — 2열. 도구가 늘어도 줄만 늘어나면 되도록 그리드로 둔다 */
.ai-tool-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 42px; /* Figma 225 − (150 + 33) */
}
/* ── 다국어 번역 (Figma 1655-3725 / 1671-4504) ───────────────── */

/* 한국어 → 고른 언어 (머리 아래 한 줄) */
.tr-lang {
  display: flex;
  align-items: center;
  gap: 22px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--gray-200);
}
.tr-lang-from,
.tr-lang-to {
  font-size: 16px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: -0.16px;
  color: var(--gray-700);
}
.tr-lang-from {
  width: 117px;
}
.tr-lang-arrow {
  flex-shrink: 0;
  font-size: 24px;
  color: var(--gray-700);
}
/* 오른쪽 언어 — 보이는 건 글자와 화살표이고, 실제로 고르는 건 위에 겹쳐 둔 투명한 select다 */
.tr-lang-to {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.tr-lang-select {
  position: absolute;
  inset: 0;
  width: 100%;
  opacity: 0;
  cursor: pointer;
}
.tr-lang-select:disabled {
  cursor: default;
}
.tr-lang-caret {
  flex-shrink: 0;
  font-size: 20px;
  color: var(--gray-700);
}

/* 돌리기 전 — 대상 배지 · 빈 상태 · 셈 */
.tr-body {
  gap: 0;
}
.tr-scope-badge {
  align-self: flex-start;
  margin: 20px 0 0;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--blue-50);
  color: var(--blue-600);
  font-size: 14px;
  font-weight: 500;
}
.tr-empty-hint {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  letter-spacing: -0.15px;
  color: var(--gray-700);
  text-align: center;
  word-break: keep-all;
}
/* 몇 개를 몇 자 보내는지 — 발 바로 위, 오른쪽에 */
.tr-counts {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  line-height: 24px;
  color: var(--gray-700);
  text-align: right;
}

/* 결과 — 값 하나가 카드 한 장 */
.tr-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 36px 0 0;
}
.tr-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  padding: 16px 12px;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  background: var(--white);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.12s;
}
.tr-card:hover {
  border-color: var(--blue-300);
}
.tr-card.is-selected {
  border-color: var(--blue-300);
}
.tr-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tr-card-name {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 16px;
  font-weight: 500;
  color: var(--gray-750);
}
.tr-card-icon {
  font-size: 20px;
}
.tr-card-badge {
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--blue-50);
  color: var(--blue-600);
  font-size: 13px;
  font-weight: 500;
  line-height: 14px;
}
.tr-card-body {
  display: flex;
  flex-direction: column;
  gap: 26px;
}
.tr-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tr-field-label {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: -0.15px;
  color: var(--gray-600);
}
/* 원문 — 에디터에 쓴 줄바꿈을 그대로 보여준다 */
.tr-source {
  font-size: 16px;
  line-height: 1.6;
  letter-spacing: -0.16px;
  color: var(--gray-750);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.tr-textarea {
  width: 100%;
  min-height: 130px;
  padding: 10px 12px;
  border: 0;
  border-radius: 16px;
  background: var(--gray-100);
  color: var(--gray-750);
  font: inherit;
  font-size: 16px;
  line-height: 1.6;
  overflow: hidden;
}
.tr-textarea:focus {
  outline: 2px solid var(--blue-400);
  outline-offset: -2px;
}

/* 발 — 안내 한 줄 + 취소·적용하기 */
.tr-foot-note {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: -0.14px;
  color: var(--gray-700);
}
.tr-foot-actions {
  display: flex;
  gap: 12px;
}
.tool-cta--ghost {
  border: 1px solid var(--gray-200);
  background: var(--white);
  color: var(--gray-600);
  font-size: 14px;
}
.tool-cta--ghost:hover:not(:disabled) {
  background: var(--gray-50);
}

/* 도구 카드 — 아이콘 위, 이름 아래. 고른 카드는 파랗게 채워진다(Figma엔 없는 상태) */
.ai-tool-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 110px;
  padding: 20px 10px;
  border: 1px solid var(--blue-50);
  border-radius: 16px;
  background: var(--white);
  cursor: pointer;
  transition:
    border-color 0.12s,
    background-color 0.12s;
}
.ai-tool-card:hover {
  border-color: var(--blue-400);
}
.ai-tool-icon {
  display: block;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
}
.ai-tool-label {
  font-size: 16px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: -0.16px;
  /* Figma의 gray/800(#333d4b) — 이 프로젝트에서는 --gray-750 이다 */
  color: var(--gray-750);
  white-space: nowrap;
}

/* 카드 모서리의 알림 — 들어가 보지 않아도 확인할 번역 결과가 있다는 걸 알린다 */
.ai-tool-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 1px 7px;
  border-radius: 20px;
  background: var(--blue-400);
  color: var(--white);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.5;
}

/* 번역 도구의 내용 — 위에서부터 차례로 (.tool-body 와 같은 요소에 얹힌다) */
.ai-tool-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 업로드 영역 공통 상자 (이미지 업로드와 같은 톤) */
.ht-box {
  width: 100%;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  background: var(--white);
  box-sizing: border-box;
}

/* 아직 만들기 전 — 버튼 하나 */
.ht-make-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 8px;
  background: var(--blue-400);
  color: var(--white);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}
.ht-make-btn:hover {
  background: var(--blue-500);
}
.ht-make-btn .material-symbols-outlined {
  font-size: 20px;
}

/* 결과 — 상태 줄 + 버튼 두 개 */
.ht-box--result {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}
.ht-link-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.ht-link-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-800);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ht-link-sub {
  font-size: 12px;
  color: var(--gray-500);
}
.ht-result-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ht-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 1;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  background: var(--white);
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-700);
  white-space: nowrap;
  cursor: pointer;
}
.ht-btn:hover {
  border-color: var(--gray-300);
  background: var(--gray-50);
}
.ht-btn .material-symbols-outlined {
  font-size: 18px;
}
/* 업로드 중 */
.ht-box--busy {
  padding: 12px;
}
.ht-progress {
  height: 6px;
  border-radius: 3px;
  background: var(--gray-100);
  overflow: hidden;
}
.ht-progress-bar {
  height: 100%;
  border-radius: 3px;
  background: var(--blue-400);
  transition: width 0.15s linear;
}
.ht-busy-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}
.ht-busy-text {
  font-size: 13px;
  color: var(--gray-600);
}

.ht-link-btn {
  padding: 0;
  border: 0;
  background: none;
  font-size: 13px;
  color: var(--blue-500);
  cursor: pointer;
}
.ht-link-btn:hover {
  text-decoration: underline;
}

.ht-error {
  margin: 0;
  font-size: 13px;
  color: var(--red-700);
}
.ht-note {
  margin: 0;
  font-size: 13px;
  color: var(--gray-500);
}
</style>
