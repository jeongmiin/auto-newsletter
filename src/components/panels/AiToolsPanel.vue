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
import { useEditorStore } from '@/stores/editorStore'
import { useModuleStore } from '@/stores/moduleStore'
import { useNewsletterDocument } from '@/composables/useNewsletterDocument'
import { buildDownloadFileName } from '@/utils/projectFile'
import { TRANSLATION_LANGUAGES, useTranslationStore } from '@/stores/translationStore'
import {
  MISSING_VOLUME_MESSAGE,
  UploadError,
  buildUploadDirectory,
  isUploadEnabled,
  uploadHtml,
} from '@/utils/s3Upload'
import { formatModified, listFolders, objectUrl, toPrefix } from '@/utils/s3Browse'

const editorStore = useEditorStore()
const moduleStore = useModuleStore()
const toast = useToast()
// 발송용 내려받기와 **같은 문서**를 만든다 — 링크로 열리는 것과 메일에 싣는 것이 달라지면 안 된다
const { buildDocument } = useNewsletterDocument()

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

/** 도구 카드를 눌러 내용을 펼쳤는지 (기본 접힘 — 목록에서 도구를 고르는 흐름) */
const isOpen = ref(false)

const progress = ref(0)
const uploading = ref(false)
const errorText = ref('')
/** 방금 복사했음을 잠깐 알리는 표시 */
const copied = ref(false)
let controller: AbortController | null = null
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const uploadEnabled = isUploadEnabled()

/** 올라갈 폴더 — 이미지와 같은 저장 폴더다. 폴더가 정해지지 않았으면 null. */
const targetDirectory = computed(() =>
  buildUploadDirectory(editorStore.uploadFolder, editorStore.wrapSettings.volume),
)

/** 올라갈 파일 이름 — 발송용 내려받기와 같은 규칙 */
const targetFileName = computed(() =>
  buildDownloadFileName(
    editorStore.currentTemplateId ?? editorStore.blankFolder,
    editorStore.wrapSettings.volume,
    'send',
  ),
)

/**
 * 폴더에 놓인 웹 링크(발송용 파일). 없으면 null.
 * 폴더를 읽어 채우고, 링크를 새로 만들면 그 결과로 바꾼다.
 */
const existing = ref<{ url: string; name: string; at: Date | null } | null>(null)
/** 폴더를 읽는 중 */
const checking = ref(false)
/** 방금 최신 내용을 반영했음을 잠깐 알리는 표시 */
const justUpdated = ref(false)
let checkController: AbortController | null = null
let updatedTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 폴더에 발송용 파일이 있는지 읽는다.
 * 폴더 목록 조회(listFolders)가 폴더마다 발송용 파일을 알아내므로, 한 겹 위를 읽어 이 폴더를 찾는다
 * (폴더 선택 화면의 '발송 완료' 배지와 같은 근거를 쓴다).
 */
const loadExisting = async () => {
  checkController?.abort()
  const directory = targetDirectory.value
  if (!directory) {
    existing.value = null
    return
  }
  const prefix = toPrefix(directory) // 'e-dm/2026/newsletterbuilder/arch-plan/hobanexpo/eng/vol01/'
  const parts = prefix.replace(/\/$/, '').split('/')
  const folderName = parts.pop() ?? ''
  const parentPrefix = `${parts.join('/')}/`

  checkController = new AbortController()
  checking.value = true
  try {
    const folders = await listFolders(parentPrefix, checkController.signal)
    const file = folders.find((f) => f.name === folderName)?.sendFile
    existing.value = file
      ? { url: objectUrl(file.key), name: file.name, at: file.lastModified }
      : null
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    // 읽지 못하면(네트워크·CORS) 없는 것으로 둔다 — 만들기 버튼은 그대로 쓸 수 있다
    existing.value = null
  } finally {
    checking.value = false
  }
}

// 도구를 펼칠 때, 그리고 펼친 채로 폴더가 바뀔 때 다시 읽는다 (접힌 동안은 읽지 않는다)
watch(isOpen, (open) => {
  if (open && uploadEnabled) void loadExisting()
})
watch(targetDirectory, () => {
  if (isOpen.value && uploadEnabled) void loadExisting()
})

/**
 * 지금 작업물을 발송용 HTML로 만들어 폴더에 올리고 주소를 받는다.
 * 같은 이름으로 덮어쓰므로 몇 번을 눌러도 폴더의 파일과 주소는 하나로 유지된다 —
 * 그래서 두 번째부터는 '최신 내용 반영'이다.
 */
const createLink = async () => {
  if (uploading.value) return
  errorText.value = ''

  if (!moduleStore.modules?.length) {
    errorText.value = '먼저 모듈을 추가해 주세요.'
    return
  }

  // 폴더가 정해지지 않았으면 올릴 자리가 없다 — 이미지 업로드와 같은 안내로 멈춘다.
  const directory = targetDirectory.value
  if (!directory) {
    errorText.value = MISSING_VOLUME_MESSAGE
    toast.add({
      severity: 'warn',
      summary: '저장할 폴더가 필요해요',
      detail: MISSING_VOLUME_MESSAGE,
      life: 6000,
    })
    return
  }

  const isUpdate = existing.value !== null
  uploading.value = true
  progress.value = 0
  copied.value = false
  controller = new AbortController()
  try {
    // 메타데이터를 뺀 발송용 — 메일에 실리는 것과 같은 파일이다
    const document = await buildDocument(false)
    const filename = targetFileName.value
    const { url } = await uploadHtml(
      new File([document], filename, { type: 'text/html' }),
      directory,
      {
        onProgress: (p) => (progress.value = p),
        signal: controller.signal,
        overwrite: true,
      },
    )
    existing.value = { url, name: filename, at: new Date() }
    if (isUpdate) {
      justUpdated.value = true
      if (updatedTimer) clearTimeout(updatedTimer)
      updatedTimer = setTimeout(() => (justUpdated.value = false), 2500)
    }
    toast.add({
      severity: 'success',
      summary: isUpdate ? '최신 내용을 반영했어요' : '웹 링크가 만들어졌어요',
      detail: isUpdate ? '주소는 그대로예요.' : '링크 복사로 주소를 가져가세요.',
      life: 3000,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    errorText.value =
      err instanceof UploadError ? err.message : '링크를 만드는 중 문제가 생겼어요. 다시 시도해 주세요.'
  } finally {
    uploading.value = false
    controller = null
  }
}

const cancelUpload = () => controller?.abort()

/**
 * 주소 복사.
 * 클립보드 API는 https(또는 localhost)에서만 동작해서, 막히면 예전 방식으로 한 번 더 시도한다.
 */
const copyLink = async () => {
  const url = existing.value?.url
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

/** 링크 카드 아래 줄 — 만든 시각. 방금 반영했으면 그 사실을 먼저 알린다 */
const existingSub = computed(() => {
  if (justUpdated.value) return '방금 최신 내용을 반영했어요'
  const at = existing.value?.at
  return at ? `${formatModified(at)} 만듦` : '만든 시각을 알 수 없어요'
})

onBeforeUnmount(() => {
  controller?.abort()
  checkController?.abort()
  if (copiedTimer) clearTimeout(copiedTimer)
  if (updatedTimer) clearTimeout(updatedTimer)
})
</script>

<template>
  <div class="side-panel ai-tools-panel">
    <h2 class="panel-title">AI 도구</h2>

    <!-- ── Azure 다국어 번역 ── -->
    <section class="ai-tool">
      <button
        type="button"
        class="ui-card ai-tool-card"
        :class="{ 'is-open': translation.panelOpen }"
        :aria-expanded="translation.panelOpen"
        @click="translation.panelOpen = !translation.panelOpen"
      >
        <span class="ai-tool-card-label">
          다국어 번역
          <!-- 접혀 있어도 확인 중인 결과가 있다는 걸 알 수 있게 -->
          <span v-if="translation.preview.length" class="ai-tool-badge ai-tool-badge--blue">
            결과 {{ translation.preview.length }}
          </span>
        </span>
        <span class="material-symbols-outlined ai-tool-card-icon">
          {{ translation.panelOpen ? 'remove' : 'add' }}
        </span>
      </button>

      <div v-if="translation.panelOpen" class="ai-tool-body tr-body">
        <p v-if="!translation.enabled" class="ht-note">
          번역 서버 주소가 설정되지 않아 지금은 번역할 수 없어요.
        </p>

        <template v-else>
          <!-- 번역 언어 — 전체 설정의 '폰트' 셀렉트와 같은 모양 -->
          <div class="tr-field">
            <span class="tr-label">번역 언어</span>
            <Select
              :modelValue="translation.targetLanguage"
              @update:modelValue="translation.setTargetLanguage($event)"
              :options="translationLanguages"
              optionLabel="label"
              optionValue="value"
              :disabled="translation.translating"
              class="w-full text-sm"
            />
          </div>

          <!-- 대상 요약 — 캔버스 전체가 대상이라 고를 건 없고, 무엇을 몇 자 보내는지만 알려준다 -->
          <p class="tr-scope-line">
            <span class="tr-scope-name">전체 모듈 {{ moduleStore.modules.length }}개</span>
            <span class="tr-scope-count">
              문장 {{ translation.units.length }}개 · {{ translation.characterCount.toLocaleString() }}자
            </span>
          </p>

          <!-- 번역 중 — 웹 링크 만들기와 같은 상자에 흐르는 막대 -->
          <div v-if="translation.translating" class="ht-box ht-box--busy">
            <div class="ht-progress">
              <div class="ht-progress-bar tr-progress-bar--flow"></div>
            </div>
            <div class="ht-busy-row">
              <span class="ht-busy-text">{{ translation.targetLanguageLabel }}로 번역하는 중…</span>
              <button type="button" class="ht-link-btn" @click="translation.cancel()">취소</button>
            </div>
          </div>

          <!-- 결과가 있음 — 내용은 캔버스 옆 패널에서 본다. 여기서는 그 사실과 다시 돌리기만 -->
          <div v-else-if="translation.preview.length" class="ht-box ht-box--result">
            <div class="tr-status">
              <span class="material-symbols-outlined tr-status-icon">check_circle</span>
              <span class="ht-link-text">
                <span class="ht-link-name">번역 결과 {{ translation.preview.length }}개</span>
                <span class="ht-link-sub">캔버스 왼쪽에서 확인하고 고친 뒤 적용하세요.</span>
              </span>
            </div>
            <div class="ht-result-actions">
              <button type="button" class="ht-btn" @click="translation.request()">
                <span class="material-symbols-outlined">restart_alt</span>
                다시 번역
              </button>
              <button type="button" class="ht-btn" @click="translation.clear()">결과 지우기</button>
            </div>
          </div>

          <button
            v-else
            type="button"
            class="ht-make-btn"
            :disabled="!translation.units.length"
            @click="translation.request()"
          >
            <span class="material-symbols-outlined">translate</span>
            번역하고 미리보기
          </button>

          <p v-if="translation.error" class="ht-error">{{ translation.error }}</p>
          <p v-if="!translation.preview.length" class="hint-text tr-note">
            *글자만 번역하고 굵게·색상 같은 서식과 링크는 그대로 둬요. URL·색상·크기 값은 빼요.
          </p>
        </template>
      </div>
    </section>

    <!-- ── HTML 웹 링크 생성 ──
         도구 목록은 빠른추가 카드(QuickAddCard)와 같은 모양의 버튼이고,
         누르면 그 아래로 업로드 입력이 펼쳐진다. 도구가 늘면 이 section을 이어 붙인다. -->
    <section class="ai-tool">
      <button
        type="button"
        class="ui-card ai-tool-card"
        :class="{ 'is-open': isOpen }"
        :aria-expanded="isOpen"
        @click="isOpen = !isOpen"
      >
        <span class="ai-tool-card-label">
          HTML 웹 링크 생성
          <!-- 펼치기 전에도 이 폴더에 링크가 있다는 걸 알 수 있게 -->
          <span v-if="existing" class="ai-tool-badge">생성됨</span>
        </span>
        <span class="material-symbols-outlined ai-tool-card-icon">{{ isOpen ? 'remove' : 'add' }}</span>
      </button>

      <div v-if="isOpen" class="ai-tool-body">

        <!-- 업로드 주소가 없으면(서버 미설정) 눌러도 실패할 UI를 아예 감춘다 — 이미지 업로드와 같은 규칙 -->
        <p v-if="!uploadEnabled" class="ht-note">
          업로드 주소가 설정되지 않아 지금은 링크를 만들 수 없어요.
        </p>

        <template v-else>
          <!-- 올리는 중 -->
          <div v-if="uploading" class="ht-box ht-box--busy">
            <div class="ht-progress">
              <div class="ht-progress-bar" :style="{ width: `${progress}%` }"></div>
            </div>
            <div class="ht-busy-row">
              <span class="ht-busy-text">
                {{ existing ? '최신 내용 반영 중' : '링크 만드는 중' }}… {{ progress }}%
              </span>
              <button type="button" class="ht-link-btn" @click="cancelUpload">취소</button>
            </div>
          </div>

          <!-- 링크 카드 — 파일 이름·만든 시각. 전체 주소는 툴팁과 새 창 열기로만 -->
          <div v-else-if="existing" class="ht-box ht-box--result">
            <a
              class="ht-link-card"
              :href="existing.url"
              :title="existing.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span class="material-symbols-outlined ht-link-icon">link</span>
              <span class="ht-link-text">
                <span class="ht-link-name">{{ existing.name }}</span>
                <span class="ht-link-sub" :class="{ 'is-fresh': justUpdated }">{{ existingSub }}</span>
              </span>
              <span class="material-symbols-outlined ht-link-open" aria-hidden="true">open_in_new</span>
            </a>
            <div class="ht-result-actions">
              <button type="button" class="ht-btn ht-btn--primary" @click="copyLink">
                <span class="material-symbols-outlined">content_copy</span>
                {{ copied ? '복사됨' : '링크 복사' }}
              </button>
              <!-- 같은 주소에 지금 작업물을 덮어쓴다 — 주소는 바뀌지 않는다 -->
              <button
                type="button"
                class="ht-btn"
                title="수정한 내용을 같은 주소에 다시 올려요"
                @click="createLink"
              >
                최신 내용 반영
              </button>
            </div>
          </div>

          <!-- 폴더를 읽는 중 -->
          <p v-else-if="checking" class="ht-note">이 폴더에 링크가 있는지 확인하는 중…</p>

          <!-- 아직 만들기 전 — 버튼 하나 -->
          <button v-else type="button" class="ht-make-btn" @click="createLink">
            <span class="material-symbols-outlined">link</span>
            HTML 링크 생성
          </button>

          <!--
            저장 위치는 적지 않는다 — 폴더는 앞 걸음에서 이미 골랐고, 여기서 할 일은
            링크를 만드는 것 하나다. 폴더가 없으면 눌렀을 때 아래 오류로 알려준다.
          -->
          <p v-if="errorText" class="ht-error">{{ errorText }}</p>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* 도구 한 칸 — 나중에 도구가 늘면 이 블록을 그대로 아래에 이어 붙인다 */
.ai-tool {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ai-tools-panel {
  gap: 18px;
}
/* ── 다국어 번역 ─────────────────────────────────────────────
   입력부(언어·범위)는 전체 설정 패널, 결과부는 표 편집 패널의 카드·칩 톤을 따른다. */
.tr-body {
  gap: 18px;
  padding-bottom: 4px;
}
.tr-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tr-label {
  font-size: 15px;
  color: var(--gray-700);
}

/* 대상 요약 한 줄 — 무엇을 몇 자 번역하는지 */
.tr-scope-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin: 0;
  min-width: 0;
}
.tr-scope-name {
  min-width: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-750);
  letter-spacing: -0.14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tr-scope-count {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--gray-500);
}

/* 번역 중 — 진행률을 모르므로 막대가 흐른다 */
.tr-progress-bar--flow {
  width: 40%;
  animation: tr-flow 1.2s ease-in-out infinite;
}
@keyframes tr-flow {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
}

/* 결과 있음 — 내용은 캔버스 옆 TranslationPreviewPanel에. 여기선 링크 카드와 같은 톤의 상태 줄 */
.tr-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--gray-50);
}
.tr-status-icon {
  flex-shrink: 0;
  font-size: 22px;
  color: var(--green-400);
  font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
/* 카드 제목 옆 '결과 N' 배지 — '생성됨' 배지와 같은 모양, 색만 파랑 */
.ai-tool-badge--blue {
  background: var(--blue-50);
  color: var(--blue-500);
}
.tr-note {
  margin-top: 0;
}
.ht-make-btn:disabled {
  background: var(--gray-200);
  color: var(--gray-400);
  cursor: not-allowed;
}

/* 도구 버튼 — 빠른추가 카드(QuickAddCard)와 같은 모양(테두리·호버는 공용 .ui-card) */
.ai-tool-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 20px;
  text-align: left;
}
.ai-tool-card:hover,
.ai-tool-card.is-open {
  background: var(--blue-50);
}
.ai-tool-card-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: var(--gray-800);
}
/* 이 폴더에 링크가 이미 있다 */
.ai-tool-badge {
  padding: 2px 8px;
  border-radius: 20px;
  background: var(--green-50);
  color: var(--green-700);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
}
.ai-tool-card-icon {
  font-size: 24px;
  color: var(--gray-500);
  flex-shrink: 0;
}

/* 펼친 내용 — 카드 아래로 이어지는 업로드 입력 */
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

/* 결과 — 링크 카드 + 버튼 두 개 */
.ht-box--result {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}
.ht-link-card {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--gray-50);
  color: inherit;
  text-decoration: none;
  transition: background-color 0.12s;
}
.ht-link-card:hover {
  background: var(--blue-50);
}
.ht-link-card:hover .ht-link-name {
  color: var(--blue-600);
}
.ht-link-icon {
  flex-shrink: 0;
  font-size: 22px;
  color: var(--blue-500);
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
.ht-link-sub.is-fresh {
  color: var(--green-700);
}
.ht-link-open {
  flex-shrink: 0;
  font-size: 18px;
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
.ht-btn--primary {
  border-color: var(--blue-400);
  background: var(--blue-400);
  color: var(--white);
}
.ht-btn--primary:hover {
  border-color: var(--blue-500);
  background: var(--blue-500);
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
