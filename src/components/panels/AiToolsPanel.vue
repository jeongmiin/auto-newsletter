<script setup lang="ts">
/**
 * AI 도구 패널 (좌측 레일 'AI 도구').
 *
 * 지금 들어 있는 도구는 하나 — **HTML 웹 링크 생성**.
 * 완성한 뉴스레터 HTML 파일을 회차 폴더(이미지가 올라가는 그 폴더)에 올리고,
 * 웹에서 바로 열 수 있는 주소를 돌려준다. '웹으로 보기' 링크에 넣을 주소를 만드는 용도다.
 *
 * 이미지 업로드(ImageUploadField)와 같은 점: 드롭존·진행률·'같은 이름이면 덮어쓰기'·저장 위치 안내.
 * 다른 점: 미리보기 썸네일이 없고, 결과가 **주소 한 줄 + 복사 버튼**이다.
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import Checkbox from 'primevue/checkbox'
import { useToast } from 'primevue/usetoast'
import { useEditorStore } from '@/stores/editorStore'
import {
  ALLOWED_HTML_EXT,
  MAX_HTML_BYTES,
  MISSING_VOLUME_MESSAGE,
  UploadError,
  buildUploadDirectory,
  buildUploadFileName,
  displayUploadDirectory,
  formatBytes,
  isUploadEnabled,
  uploadHtml,
  validateHtmlFile,
} from '@/utils/s3Upload'

const editorStore = useEditorStore()
const toast = useToast()

/** 도구 카드를 눌러 업로드 입력을 펼쳤는지 (기본 접힘 — 목록에서 도구를 고르는 흐름) */
const isOpen = ref(false)

const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const progress = ref(0)
const uploading = ref(false)
const errorText = ref('')
/** 업로드가 끝나 받은 주소 — 이 값이 있으면 드롭존 대신 링크 상자를 보여준다 */
const resultUrl = ref('')
/** 방금 복사했음을 잠깐 알리는 표시 */
const copied = ref(false)
let controller: AbortController | null = null
let copiedTimer: ReturnType<typeof setTimeout> | null = null

/** 같은 이름이면 덮어쓸지 — 이미지 업로드와 같은 뜻이고 기본값도 같다(켜짐) */
const overwrite = ref(true)

const uploadEnabled = isUploadEnabled()

/** 드롭존 안내에 쓸 허용 형식 — 'HTML · HTM' */
const allowedFormatsLabel = ALLOWED_HTML_EXT.map((e) => e.toUpperCase()).join(' · ')

/** 올라갈 폴더 — 이미지와 같은 회차 폴더다. 회차를 안 적었으면 null. */
const targetDirectory = computed(() =>
  buildUploadDirectory(editorStore.uploadFolder, editorStore.wrapSettings.volume),
)

const openPicker = () => {
  if (uploading.value) return
  fileInput.value?.click()
}

const startUpload = async (file: File) => {
  errorText.value = ''

  // 회차를 안 적었으면 올릴 폴더가 정해지지 않는다 — 이미지 업로드와 같은 안내로 멈춘다.
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

  const invalid = validateHtmlFile(file)
  if (invalid) {
    errorText.value = invalid
    return
  }

  // 한글·공백이 든 이름은 올릴 때 다듬어진다('뉴스레터 최종.html' → 'newsletter.html').
  // 덮어쓰기가 켜져 있으면 다른 파일과 이름이 겹칠 수 있으므로 바뀐 이름을 미리 알린다.
  const saveAs = buildUploadFileName(file.name, new Date(), false, 'newsletter')
  if (overwrite.value && saveAs !== file.name) {
    toast.add({
      severity: 'warn',
      summary: '파일 이름이 바뀌어 올라가요',
      detail:
        `'${file.name}' → '${saveAs}'. 같은 폴더에 같은 이름이 있으면 덮어씁니다. ` +
        '다른 파일을 지우고 싶지 않다면 파일 이름을 영문으로 바꾸거나 ' +
        '"같은 이름이면 덮어쓰기"를 꺼 주세요.',
      life: 8000,
    })
  }

  uploading.value = true
  progress.value = 0
  copied.value = false
  controller = new AbortController()
  try {
    const { url } = await uploadHtml(file, directory, {
      onProgress: (p) => (progress.value = p),
      signal: controller.signal,
      overwrite: overwrite.value,
    })
    resultUrl.value = url
    toast.add({
      severity: 'success',
      summary: '웹 링크가 만들어졌어요',
      detail: '아래 주소를 복사해 쓰세요.',
      life: 3000,
    })
  } catch (err) {
    errorText.value =
      err instanceof UploadError ? err.message : '업로드 중 문제가 생겼어요. 다시 시도해 주세요.'
  } finally {
    uploading.value = false
    controller = null
  }
}

const onFilePicked = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // 같은 파일을 다시 골라도 change가 일어나도록 값을 비운다
  input.value = ''
  if (file) void startUpload(file)
}

const onDrop = (event: DragEvent) => {
  isDragOver.value = false
  if (uploading.value) return
  const file = event.dataTransfer?.files?.[0]
  if (file) void startUpload(file)
}

const cancelUpload = () => controller?.abort()

/** 결과를 지우고 다시 올릴 수 있는 상태로 — 주소만 비운다(서버 파일은 그대로 있다) */
const resetResult = () => {
  resultUrl.value = ''
  errorText.value = ''
  copied.value = false
}

/**
 * 주소 복사.
 * 클립보드 API는 https(또는 localhost)에서만 동작해서, 막히면 예전 방식으로 한 번 더 시도한다.
 */
const copyLink = async () => {
  const url = resultUrl.value
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
      detail: '주소를 직접 선택해 복사해 주세요.',
      life: 4000,
    })
    return
  }
  copied.value = true
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => (copied.value = false), 2000)
}

onBeforeUnmount(() => {
  controller?.abort()
  if (copiedTimer) clearTimeout(copiedTimer)
})
</script>

<template>
  <div class="side-panel ai-tools-panel">
    <h2 class="panel-title">AI 도구</h2>

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
        <span class="ai-tool-card-label">HTML 웹 링크 생성</span>
        <span class="material-symbols-outlined ai-tool-card-icon">{{ isOpen ? 'remove' : 'add' }}</span>
      </button>

      <div v-if="isOpen" class="ai-tool-body">
        <p class="ai-tool-desc">
          뉴스레터 HTML 파일을 회차 폴더에 올리고 웹에서 열 수 있는 주소를 만들어 드려요.
        </p>

        <!-- 업로드 주소가 없으면(서버 미설정) 눌러도 실패할 UI를 아예 감춘다 — 이미지 업로드와 같은 규칙 -->
        <p v-if="!uploadEnabled" class="ht-note">
          업로드 주소가 설정되지 않아 지금은 링크를 만들 수 없어요.
        </p>

        <template v-else>
          <!-- 업로드 중 -->
          <div v-if="uploading" class="ht-box ht-box--busy">
            <div class="ht-progress">
              <div class="ht-progress-bar" :style="{ width: `${progress}%` }"></div>
            </div>
            <div class="ht-busy-row">
              <span class="ht-busy-text">업로드 중… {{ progress }}%</span>
              <button type="button" class="ht-link-btn" @click="cancelUpload">취소</button>
            </div>
          </div>

          <!-- 만들어진 주소 — 썸네일 없이 주소 한 줄 + 복사 버튼 -->
          <div v-else-if="resultUrl" class="ht-box ht-box--result">
            <a
              class="ht-result-url"
              :href="resultUrl"
              :title="resultUrl"
              target="_blank"
              rel="noopener noreferrer"
            >{{ resultUrl }}</a>
            <div class="ht-result-actions">
              <button type="button" class="ht-copy-btn" @click="copyLink">
                <span class="material-symbols-outlined">content_copy</span>
                {{ copied ? '복사됨' : '링크 복사' }}
              </button>
              <button type="button" class="ht-link-btn" @click="openPicker">다시 올리기</button>
              <span class="ht-dot">·</span>
              <button type="button" class="ht-link-btn" @click="resetResult">지우기</button>
            </div>
          </div>

          <!-- 비어 있을 때 — 드롭존 -->
          <button
            v-else
            type="button"
            class="ht-box ht-box--drop"
            :class="{ 'is-over': isDragOver }"
            @click="openPicker"
            @dragover.prevent="isDragOver = true"
            @dragenter.prevent="isDragOver = true"
            @dragleave.prevent="isDragOver = false"
            @drop.prevent="onDrop"
          >
            <span class="material-symbols-outlined ht-drop-icon">upload_file</span>
            <span class="ht-drop-title">HTML 파일을 끌어다 놓거나 클릭해서 올리세요</span>
            <span class="ht-drop-sub">{{ allowedFormatsLabel }}, 최대 {{ formatBytes(MAX_HTML_BYTES) }}</span>
          </button>

          <input
            ref="fileInput"
            type="file"
            accept=".html,.htm,text/html"
            class="hidden"
            @change="onFilePicked"
          />

          <!-- 같은 이름 처리 방식 — 올리는 중에 바꿔도 이번 건에는 반영되지 않으므로 그동안 감춘다 -->
          <label v-if="!uploading" class="ht-overwrite">
            <Checkbox v-model="overwrite" :binary="true" />
            <span class="ht-overwrite-body">
              <span class="ht-overwrite-title">같은 이름이면 덮어쓰기</span>
              <span class="ht-overwrite-hint">{{
                overwrite
                  ? '파일 이름 그대로 올려 먼저 올린 같은 이름의 파일을 대체해요 (주소가 그대로 유지돼요)'
                  : '이름 뒤에 날짜·시각을 붙여 새 파일로 올려요 (주소가 새로 생겨요)'
              }}</span>
            </span>
          </label>

          <p v-if="errorText" class="ht-error">{{ errorText }}</p>
          <!-- 앞의 /e-dm/{연도}/는 모든 업로드가 같아서 표시에서 뺀다(올라가는 경로는 그대로) -->
          <p v-if="targetDirectory" class="ht-target">
            저장 위치 <code>{{ displayUploadDirectory(targetDirectory) }}</code>
          </p>
          <!-- 회차 미입력 안내는 오류 문구와 내용이 같다 — 오류가 떠 있으면 반복하지 않는다 -->
          <p v-else-if="!errorText" class="ht-target ht-target--missing">
            저장 위치를 정하려면 <strong>전체 스타일 → 뉴스레터 회차</strong>를 먼저 입력해 주세요.
          </p>
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
  font-size: 16px;
  font-weight: 500;
  color: var(--gray-800);
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
.ai-tool-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--gray-600);
}

/* 업로드 영역 공통 상자 (이미지 업로드와 같은 톤) */
.ht-box {
  width: 100%;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  background: var(--white);
  box-sizing: border-box;
}

/* 비어 있을 때 — 점선 드롭존 */
.ht-box--drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 20px 12px;
  border-style: dashed;
  border-color: var(--gray-300);
  background: var(--gray-50);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
}
.ht-box--drop:hover,
.ht-box--drop.is-over {
  border-color: var(--blue-400);
  background: var(--blue-50);
}
.ht-drop-icon {
  font-size: 28px;
  color: var(--gray-500);
}
.ht-box--drop:hover .ht-drop-icon,
.ht-box--drop.is-over .ht-drop-icon {
  color: var(--blue-400);
}
.ht-drop-title {
  font-size: 14px;
  color: var(--gray-700);
}
.ht-drop-sub {
  font-size: 12px;
  color: var(--gray-500);
}

/* 결과 — 주소 + 복사 */
.ht-box--result {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}
.ht-result-url {
  /* 주소가 길어도 상자를 넘기지 않는다 */
  min-width: 0;
  font-size: 13px;
  color: var(--blue-600);
  overflow-wrap: anywhere;
  text-decoration: none;
}
.ht-result-url:hover {
  text-decoration: underline;
}
.ht-result-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ht-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  background: var(--white);
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-700);
  cursor: pointer;
}
.ht-copy-btn:hover {
  border-color: var(--blue-400);
  color: var(--blue-600);
}
.ht-copy-btn .material-symbols-outlined {
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
.ht-dot {
  color: var(--gray-300);
  font-size: 12px;
}

/* 같은 이름이면 덮어쓰기 */
.ht-overwrite {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
}
.ht-overwrite-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ht-overwrite-title {
  font-size: 13px;
  color: var(--gray-700);
}
.ht-overwrite-hint {
  font-size: 12px;
  color: var(--gray-500);
  line-height: 1.5;
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
.ht-target {
  margin: 0;
  font-size: 12px;
  color: var(--gray-500);
}
.ht-target code {
  font-size: 12px;
  color: var(--gray-600);
}
/* 회차 미입력 — 업로드가 막혀 있다는 걸 눈에 띄게 */
.ht-target--missing {
  color: var(--yellow-700);
}
.ht-target--missing strong {
  font-weight: 600;
}
</style>
