<script setup lang="ts">
/**
 * AI 도구 패널 (좌측 레일 'AI 도구').
 *
 * 지금 들어 있는 도구는 하나 — **HTML 웹 링크 생성**.
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
import { getHistoryInstance } from '@/composables/useHistory'
import {
  applyTranslationChanges,
  collectTranslationUnits,
  type TranslationChange,
  type TranslationLanguage,
  type TranslationScope,
} from '@/utils/newsletterTranslation'
import {
  isTranslationEnabled,
  translateUnits,
  TranslationError,
} from '@/utils/azureTranslator'
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
const history = getHistoryInstance()

// ── Azure 뉴스레터 번역 ────────────────────────────────────────────────
const translationOpen = ref(false)
const translationEnabled = isTranslationEnabled()
const targetLanguage = ref<TranslationLanguage>('en')
const translationScope = ref<TranslationScope>('all')
const translating = ref(false)
const translationError = ref('')
const translationPreview = ref<TranslationChange[]>([])
let translationController: AbortController | null = null

const translationLanguages: Array<{ value: TranslationLanguage; label: string }> = [
  { value: 'en', label: '영어' },
  { value: 'ja', label: '일본어' },
  { value: 'zh-Hans', label: '중국어(간체)' },
]

const activeGroupId = computed(
  () => moduleStore.selectedGroupId ?? moduleStore.selectedModule?.groupId ?? null,
)
const canTranslateModule = computed(() => !!moduleStore.selectedModuleId)
const canTranslateGroup = computed(() => !!activeGroupId.value)
const selectedScopeLabel = computed(() => {
  if (translationScope.value === 'module') {
    return moduleStore.selectedModuleMetadata?.name ?? '선택 모듈'
  }
  if (translationScope.value === 'group') return moduleStore.activeGroup?.name ?? '선택 그룹'
  return `전체 모듈 ${moduleStore.modules.length}개`
})

const unitsToTranslate = computed(() =>
  collectTranslationUnits(moduleStore.modules, moduleStore.availableModules, {
    scope: translationScope.value,
    selectedModuleId: moduleStore.selectedModuleId,
    selectedGroupId: activeGroupId.value,
  }),
)
const translationCharacters = computed(() =>
  unitsToTranslate.value.reduce((sum, unit) => sum + unit.source.length, 0),
)
const previewPlainText = (value: string): string =>
  value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim()

watch([targetLanguage, translationScope], () => {
  translationPreview.value = []
  translationError.value = ''
})

const requestTranslation = async (): Promise<void> => {
  if (translating.value) return
  translationError.value = ''
  translationPreview.value = []
  if (!moduleStore.availableModules.length) await moduleStore.loadAvailableModules()
  const units = unitsToTranslate.value
  if (!units.length) {
    translationError.value = '선택한 범위에서 번역할 한국어 문장을 찾지 못했어요.'
    return
  }

  translating.value = true
  translationController = new AbortController()
  try {
    translationPreview.value = await translateUnits(
      units,
      targetLanguage.value,
      translationController.signal,
    )
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    translationError.value =
      error instanceof TranslationError || error instanceof Error
        ? error.message
        : '번역 중 문제가 생겼어요. 다시 시도해 주세요.'
  } finally {
    translating.value = false
    translationController = null
  }
}

const cancelTranslation = (): void => translationController?.abort()

const applyTranslation = async (): Promise<void> => {
  if (!translationPreview.value.length) return
  // 적용 전과 적용 후를 각각 남겨 Ctrl+Z 한 번으로 번역 전 상태가 복원되게 한다.
  history.saveState()
  const next = applyTranslationChanges(moduleStore.modules, translationPreview.value)
  await history.runBulk(() => {
    moduleStore.replaceModulesForBulkEdit(next)
    editorStore.updateWrapSettings({
      fontLanguage:
        targetLanguage.value === 'ja'
          ? 'ja'
          : targetLanguage.value === 'zh-Hans'
            ? 'zh'
            : 'default',
    })
  })
  history.saveState()
  const count = translationPreview.value.length
  translationPreview.value = []
  toast.add({
    severity: 'success',
    summary: '번역을 적용했어요',
    detail: `${count}개 문장을 적용했습니다. Ctrl+Z로 되돌릴 수 있어요.`,
    life: 4000,
  })
}

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
  translationController?.abort()
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
        :class="{ 'is-open': translationOpen }"
        :aria-expanded="translationOpen"
        @click="translationOpen = !translationOpen"
      >
        <span class="ai-tool-card-label">다국어 번역</span>
        <span class="material-symbols-outlined ai-tool-card-icon">
          {{ translationOpen ? 'remove' : 'add' }}
        </span>
      </button>

      <div v-if="translationOpen" class="ai-tool-body tr-body">
        <p v-if="!translationEnabled" class="ht-note">
          번역 서버 주소가 설정되지 않아 지금은 번역할 수 없어요.
        </p>

        <template v-else>
          <label class="tr-field">
            <span class="tr-label">번역 언어</span>
            <select v-model="targetLanguage" class="tr-select" :disabled="translating">
              <option v-for="language in translationLanguages" :key="language.value" :value="language.value">
                {{ language.label }}
              </option>
            </select>
          </label>

          <fieldset class="tr-fieldset" :disabled="translating">
            <legend class="tr-label">번역 범위</legend>
            <label class="tr-radio">
              <input v-model="translationScope" type="radio" value="all" /> 전체 뉴스레터
            </label>
            <label class="tr-radio" :class="{ 'is-disabled': !canTranslateGroup }">
              <input v-model="translationScope" type="radio" value="group" :disabled="!canTranslateGroup" />
              선택한 그룹
            </label>
            <label class="tr-radio" :class="{ 'is-disabled': !canTranslateModule }">
              <input v-model="translationScope" type="radio" value="module" :disabled="!canTranslateModule" />
              선택한 모듈
            </label>
          </fieldset>

          <div class="tr-summary">
            <strong>{{ selectedScopeLabel }}</strong>
            <span>한국어 {{ unitsToTranslate.length }}개 · {{ translationCharacters.toLocaleString() }}자</span>
          </div>

          <div v-if="translating" class="ht-box ht-box--busy">
            <div class="tr-spinner-row">
              <span class="material-symbols-outlined tr-spin">progress_activity</span>
              <span class="ht-busy-text">Azure에서 번역하는 중…</span>
              <button type="button" class="ht-link-btn" @click="cancelTranslation">취소</button>
            </div>
          </div>

          <template v-else-if="translationPreview.length">
            <div class="tr-preview-head">
              <strong>번역 결과 확인</strong>
              <span>{{ translationPreview.length }}개</span>
            </div>
            <div class="tr-preview-list">
              <article v-for="change in translationPreview" :key="change.id" class="tr-preview-item">
                <p class="tr-item-label">{{ change.moduleName }} · {{ change.propertyLabel }}</p>
                <div class="tr-source">{{ previewPlainText(change.source) }}</div>
                <textarea v-model="change.translated" class="tr-result" rows="3" aria-label="번역문 수정"></textarea>
              </article>
            </div>
            <div class="tr-actions">
              <button type="button" class="ht-btn" @click="translationPreview = []">취소</button>
              <button type="button" class="ht-btn ht-btn--primary" @click="applyTranslation">캔버스에 적용</button>
            </div>
          </template>

          <button v-else type="button" class="ht-make-btn" @click="requestTranslation">
            <span class="material-symbols-outlined">translate</span>
            번역하고 미리보기
          </button>

          <p v-if="translationError" class="ht-error">{{ translationError }}</p>
          <p class="ht-note">URL·색상·크기 등은 제외하고 한국어가 있는 텍스트만 번역해요.</p>
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
.tr-body {
  padding: 2px 0 8px;
}
.tr-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.tr-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-700);
}
.tr-select {
  width: 100%;
  height: 40px;
  padding: 0 10px;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  background: var(--white);
  color: var(--gray-800);
  font-size: 14px;
}
.tr-fieldset {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  border: 0;
}
.tr-fieldset .tr-label {
  margin-bottom: 2px;
}
.tr-radio {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  color: var(--gray-700);
}
.tr-radio.is-disabled {
  color: var(--gray-400);
}
.tr-summary {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--gray-50);
  font-size: 13px;
  color: var(--gray-600);
}
.tr-summary strong {
  color: var(--gray-800);
}
.tr-spinner-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tr-spinner-row .ht-link-btn {
  margin-left: auto;
}
.tr-spin {
  font-size: 20px;
  color: var(--blue-500);
  animation: tr-rotate 1s linear infinite;
}
@keyframes tr-rotate {
  to { transform: rotate(360deg); }
}
.tr-preview-head {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--gray-600);
}
.tr-preview-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 3px;
}
.tr-preview-item {
  padding: 10px;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
}
.tr-item-label {
  margin: 0 0 7px;
  font-size: 12px;
  font-weight: 500;
  color: var(--gray-600);
}
.tr-source {
  max-height: 70px;
  overflow: hidden;
  margin-bottom: 8px;
  padding: 8px;
  border-radius: 6px;
  background: var(--gray-50);
  font-size: 12px;
  color: var(--gray-600);
}
.tr-source :deep(*) {
  margin: 0;
  font-size: inherit !important;
}
.tr-result {
  width: 100%;
  min-height: 68px;
  padding: 8px;
  resize: vertical;
  border: 1px solid var(--blue-200);
  border-radius: 6px;
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  color: var(--gray-800);
  box-sizing: border-box;
}
.tr-actions {
  display: flex;
  gap: 8px;
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
