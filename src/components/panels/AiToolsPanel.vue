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
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useEditorStore } from '@/stores/editorStore'
import { useModuleStore } from '@/stores/moduleStore'
import { useNewsletterDocument } from '@/composables/useNewsletterDocument'
import { buildDownloadFileName } from '@/utils/projectFile'
import {
  MISSING_VOLUME_MESSAGE,
  UploadError,
  buildUploadDirectory,
  isUploadEnabled,
  uploadHtml,
} from '@/utils/s3Upload'

const editorStore = useEditorStore()
const moduleStore = useModuleStore()
const toast = useToast()
// 발송용 내려받기와 **같은 문서**를 만든다 — 링크로 열리는 것과 메일에 싣는 것이 달라지면 안 된다
const { buildDocument } = useNewsletterDocument()

/** 도구 카드를 눌러 내용을 펼쳤는지 (기본 접힘 — 목록에서 도구를 고르는 흐름) */
const isOpen = ref(false)

const progress = ref(0)
const uploading = ref(false)
const errorText = ref('')
/** 업로드가 끝나 받은 주소 — 이 값이 있으면 링크 상자를 보여준다 */
const resultUrl = ref('')
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
  buildDownloadFileName(editorStore.currentTemplateId, editorStore.wrapSettings.volume, 'send'),
)

/**
 * 지금 작업물을 발송용 HTML로 만들어 폴더에 올리고 주소를 받는다.
 * 같은 이름으로 덮어쓰므로 몇 번을 눌러도 폴더의 파일과 주소는 하나로 유지된다.
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
    resultUrl.value = url
    toast.add({
      severity: 'success',
      summary: '웹 링크가 만들어졌어요',
      detail: '아래 주소를 복사해 쓰세요.',
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

/** 결과를 지우고 처음 상태로 — 주소만 비운다(폴더의 파일은 그대로 있다) */
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
          지금 작업물을 발송용 HTML로 만들어 저장 폴더에 올리고, 웹에서 열 수 있는 주소를 만들어 드려요.
        </p>

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
              <span class="ht-busy-text">링크 만드는 중… {{ progress }}%</span>
              <button type="button" class="ht-link-btn" @click="cancelUpload">취소</button>
            </div>
          </div>

          <!-- 만들어진 주소 — 주소 한 줄 + 복사 버튼 -->
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
              <button type="button" class="ht-link-btn" @click="createLink">다시 만들기</button>
              <span class="ht-dot">·</span>
              <button type="button" class="ht-link-btn" @click="resetResult">지우기</button>
            </div>
          </div>

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
