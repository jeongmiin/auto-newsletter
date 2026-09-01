<template>
  <!-- Figma 1125-2964 top nav: 높이 60, 좌우 패딩 21 -->
  <header class="hnav">
    <!-- 왼쪽 묶음 (1125-3054): 홈 ↔ 나머지 25px -->
    <div class="hleft">
      <!-- 홈 (클릭 시 랜딩 페이지로) — 40×40, 아이콘 31px -->
      <button
        type="button"
        class="hicon hhome"
        @click="goHome"
        v-tooltip.bottom="'처음 화면으로'"
      >
        <span class="material-symbols-outlined">home</span>
      </button>

      <!-- 팀·브레드크럼·실행취소·전체삭제 (1125-3059): 항목 간 20px -->
      <div v-if="showActions" class="hleft-group">
        <!-- 소속 팀 — 표시명은 teamId로 트리에서 찾는다(트리 미로딩 시엔 숨김) -->
        <span v-if="currentTeamName" class="hteam">{{ currentTeamName }}</span>

        <!-- 브레드크럼: 템플릿명(클릭 시 템플릿 선택 페이지로 이동) > 에디터 -->
        <span class="hcrumb">
          <button type="button" class="hcrumb-link" @click="goTemplates">
            {{ currentTemplateName }}
          </button>
          &gt; 에디터
        </span>

        <span class="hbar"></span>

        <!-- 실행취소/다시실행 (1125-3064): 40×40, 사이 8px -->
        <div class="hundo">
          <button
            type="button"
            class="hicon"
            :disabled="!canUndo"
            @click="doUndo"
            v-tooltip.bottom="'이전으로'"
          >
            <span class="material-symbols-outlined">undo</span>
          </button>
          <button
            type="button"
            class="hicon"
            :disabled="!canRedo"
            @click="doRedo"
            v-tooltip.bottom="'다음으로'"
          >
            <span class="material-symbols-outlined">redo</span>
          </button>
        </div>

        <span class="hbar"></span>

        <!-- 전체 삭제 = 빈 템플릿으로 시작 (레일의 '빈 템플릿'과 같은 확인 모달) -->
        <button
          type="button"
          class="hclear"
          @click="confirmBlankTemplate"
          v-tooltip.bottom="'작업 내용을 모두 지우고 빈 템플릿으로 시작합니다'"
        >
          <span class="material-symbols-outlined">delete</span>
          <span>전체 삭제</span>
        </button>
      </div>
    </div>

    <template v-if="showActions">
      <!-- 중앙: PC / 모바일 토글 -->
      <div class="flex-1 flex justify-center">
        <div class="seg">
          <button
            type="button"
            class="seg-btn"
            :class="{ 'is-active': canvasWidth === 'desktop' }"
            @click="editorStore.setCanvasWidth('desktop')"
            v-tooltip.bottom="'PC 화면'"
          >
            <span class="material-symbols-outlined">desktop_windows</span>
          </button>
          <button
            type="button"
            class="seg-btn"
            :class="{ 'is-active': canvasWidth === 'mobile' }"
            @click="editorStore.setCanvasWidth('mobile')"
            v-tooltip.bottom="'모바일 화면'"
          >
            <span class="material-symbols-outlined">smartphone</span>
          </button>
        </div>
      </div>

      <!-- 우측 (1125-3080): 저장상태 ↔ 버튼 그룹 10px, 버튼끼리도 10px -->
      <div class="hright">
        <span v-if="lastDownload" class="hsaved">
          {{ lastDownloadDateLabel }}<span class="font-bold">{{ lastDownload.type }}</span> 완료
        </span>
        <!-- 임시 저장 — 지금 작업을 회차 폴더에 올려 둔다(같은 이름으로 덮어써 최신 하나만 남는다).
             업로드 주소가 없으면 눌러도 실패할 버튼을 아예 감춘다(이미지 업로드와 같은 규칙). -->
        <button
          v-if="canSaveToFolder"
          type="button"
          class="hbtn hbtn--tint"
          :disabled="savingToFolder"
          @click="saveToFolder"
          v-tooltip.bottom="'회차 폴더에 올려 둡니다 — 다른 자리에서 이어서 편집할 수 있어요'"
        >
          <span class="material-symbols-outlined">cloud_upload</span>
          <span>{{ savingToFolder ? '올리는 중…' : '임시 저장' }}</span>
        </button>
        <button
          type="button"
          class="hbtn hbtn--muted"
          @click="previewEmail"
          v-tooltip.bottom="'새 창에서 완성된 모습을 확인합니다'"
        >
          <span class="material-symbols-outlined">visibility</span>
          <span>미리보기</span>
        </button>
        <button
          type="button"
          class="hbtn hbtn--primary"
          @click="downloadForSend"
          v-tooltip.bottom="'메일 발송용 — 다시 불러와 편집 불가능'"
        >
          <span class="material-symbols-outlined">send</span>
          <span>발송용 내려받기</span>
        </button>

        <!-- 자주 쓰지 않는 동작은 한 단계 안으로 (Figma 1125-3110) -->
        <button
          type="button"
          class="hbtn hbtn--icon"
          aria-haspopup="true"
          aria-controls="header-more-menu"
          @click="toggleMoreMenu"
          v-tooltip.bottom="'더 보기'"
        >
          <span class="material-symbols-outlined">more_horiz</span>
        </button>
        <Menu id="header-more-menu" ref="moreMenu" :model="moreMenuItems" popup class="hmore-menu" />
      </div>
    </template>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import Menu from 'primevue/menu'
import { useConfirm } from 'primevue/useconfirm'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { processQuillHtml } from '@/utils/quillHtmlProcessor'
import { useNewsletterImport } from '@/composables/useNewsletterImport'
import { buildDownloadFileName } from '@/utils/projectFile'
import {
  MISSING_VOLUME_MESSAGE,
  UploadError,
  buildUploadDirectory,
  displayUploadDirectory,
  isUploadEnabled,
  uploadHtml,
} from '@/utils/s3Upload'
import { getHistoryInstance } from '@/composables/useHistory'
import { useBlankTemplate } from '@/composables/useBlankTemplate'
import { useNewsletterDocument } from '@/composables/useNewsletterDocument'
import { useToast } from 'primevue/usetoast'

// showActions=false면 오른쪽 파일 관리 버튼들을 숨긴다(예: 템플릿 선택 화면)
withDefaults(defineProps<{ showActions?: boolean }>(), { showActions: true })

const moduleStore = useModuleStore()
const editorStore = useEditorStore()
const toast = useToast()
const router = useRouter()
const confirm = useConfirm()
const { importHtmlFile } = useNewsletterImport()
const { confirmBlankTemplate } = useBlankTemplate()
// 내려받기·복사·임시 저장·웹 링크가 모두 같은 문서를 쓰도록 한 곳에서 만든다
const { buildDocument } = useNewsletterDocument()

// 실행취소/다시실행 (전역 히스토리 싱글턴)
const history = getHistoryInstance()
const canUndo = history.canUndo
const canRedo = history.canRedo
const doUndo = () => history.undo()
const doRedo = () => history.redo()

// PC/모바일 토글 상태
const canvasWidth = computed(() => editorStore.canvasWidth)

// 브레드크럼: 현재 템플릿명(빈 문서면 '빈 템플릿') → 클릭 시 템플릿 선택 페이지로 이동
const currentTemplateName = computed(() => editorStore.currentTemplateName)
const goTemplates = () => router.push('/templates')

// 소속 팀 표시명 — 저장된 건 불변 id뿐이라 트리에서 찾아 쓴다.
// (팀명이 바뀌어도 id는 그대로이므로 항상 최신 이름이 나온다)
const currentTeamName = computed(() => {
  const id = editorStore.currentTeamId
  if (!id) return ''
  for (const dept of moduleStore.availableDepartments) {
    const team = dept.teams.find((t) => t.id === id)
    if (team) return team.name
  }
  return ''
})

/**
 * 우측 '더 보기' 메뉴 — 자주 쓰지 않는 동작만 모은다.
 *
 * '저장용 내려받기'도 여기로 들어왔다. 폴더에 올려 두는 '임시 저장'이 생기면서
 * 이어서 편집할 파일을 내 PC로 받아 둘 일이 드물어졌기 때문이다.
 * 겉에 남는 것은 늘 쓰는 셋 — 임시 저장 · 미리보기 · 발송용 내려받기.
 */
const moreMenu = ref<InstanceType<typeof Menu> | null>(null)
const moreMenuItems = computed(() => [
  { label: '저장용 내려받기', icon: 'pi pi-download', command: () => void downloadForSave() },
  { label: '코드 복사', icon: 'pi pi-copy', command: () => void exportHtml() },
  { label: '파일 열기', icon: 'pi pi-folder-open', command: () => void importHtmlFile() },
])
const toggleMoreMenu = (event: Event) => moreMenu.value?.toggle(event)

// 로고 클릭 → 홈으로. 작업 중(변경사항 있음)이면 확인 후 이동.
const goHome = () => {
  if (moduleStore.modules.length > 0 && moduleStore.isDirty) {
    confirm.require({
      message: '저장하지 않은 변경사항이 있습니다. 홈으로 나가시겠어요?',
      header: '홈으로 이동',
      acceptLabel: '나가기',
      rejectLabel: '취소',
      accept: () => router.push('/'),
    })
    return
  }
  router.push('/')
}

// 최근 저장/내려받음 표시 (메모리 상태 — 새로고침 시 초기화).
// label은 화면에 그대로 나가는 말이라 '…완료' 앞에 붙여 읽히는 형태로 둔다.
const lastDownload = ref<{ time: Date; type: '저장용 다운' | '발송용 다운' | '임시 저장' } | null>(
  null,
)

/** 임시 저장이 가능한 상태인지 — 업로드 주소가 설정돼 있어야 한다 */
const canSaveToFolder = isUploadEnabled()
const savingToFolder = ref(false)

// 날짜 부분 ("2026.08.12 11:19:39 ") — 타입은 템플릿에서 굵게 별도 렌더.
// 자리를 0으로 채워 폭이 흔들리지 않게 한다(시각이 바뀔 때마다 옆 버튼이 밀리지 않도록).
const lastDownloadDateLabel = computed(() => {
  if (!lastDownload.value) return ''
  const d = lastDownload.value.time
  const pad = (n: number): string => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} `
  )
})

// 미리보기 창 재사용용 — 이름 있는 타깃으로 열어 같은 창을 새로고침한다
const PREVIEW_WINDOW_NAME = 'newsletter-preview'
let previewObjectUrl: string | null = null

// Toast 헬퍼 함수
const showSuccess = (summary: string, detail?: string) => {
  toast.add({ severity: 'success', summary, detail, life: 3000 })
}

const showError = (summary: string, detail?: string) => {
  toast.add({ severity: 'error', summary, detail, life: 5000 })
}

const showWarn = (summary: string, detail?: string) => {
  toast.add({ severity: 'warn', summary, detail, life: 4000 })
}

/**
 * 미리보기: 최종 HTML을 새 창에서 표시
 */
const previewEmail = async (): Promise<void> => {
  try {
    const modules = moduleStore.modules

    if (!modules || modules.length === 0) {
      showWarn('미리보기 불가', '먼저 모듈을 추가해주세요')
      return
    }

    // 최종 HTML 생성
    let finalHtml = await moduleStore.generateHtml()
    finalHtml = processQuillHtml(finalHtml)

    // 편집 화면의 PC/모바일 선택을 미리보기 초기 모드로 연결
    const initialMode = editorStore.canvasWidth === 'mobile' ? 'mobile' : 'pc'

    // 이메일 본문 문서 (iframe 안에 들어갈 실제 메일) — 반응형 미디어쿼리가
    // iframe 폭(선택한 기기 해상도) 기준으로 동작하도록 별도 문서로 분리한다
    const emailDocument = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .preview-container {
      max-width: 680px;
      margin: 0 auto;
      background-color: white;
    }
    .email-content { padding: 0; }
    @media (max-width: 768px) {
      .preview-container { max-width: 100%; }
    }
    .email-content p, .email-content h1, .email-content h2, .email-content h3 { margin: 0; padding: 0; }
    .email-content h1 { font-size: 2em; font-weight: bold; }
    .email-content h2 { font-size: 1.5em; font-weight: bold; }
    .email-content h3 { font-size: 1.17em; font-weight: bold; }
    .email-content strong { font-weight: 700; }
    .email-content em { font-style: italic; }
    .email-content a { color: #0066cc; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="preview-container">
    <div class="email-content">${finalHtml}</div>
  </div>
</body>
</html>`

    // 미리보기 창(바깥 크롬) — 상단 PC/모바일 토글 + 가운데 기기 프레임(iframe)
    const fullHtmlDocument = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>이메일 미리보기</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #e5e7eb;
    }
    .preview-header {
      background: #333;
      color: white;
      padding: 12px 20px;
      position: sticky;
      top: 0;
      z-index: 1000;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .preview-header h2 { margin: 0; font-size: 18px; font-weight: 600; }
    .header-right { display: flex; align-items: center; gap: 16px; }
    .mode-toggle { display: flex; background: rgba(255,255,255,0.12); border-radius: 6px; padding: 3px; }
    .mode-btn {
      background: transparent;
      border: none;
      color: rgba(255,255,255,0.7);
      font-size: 14px;
      cursor: pointer;
      padding: 6px 16px;
      border-radius: 4px;
      transition: all 0.15s;
    }
    .mode-btn:hover { color: white; }
    .mode-btn.active { background: white; color: #333; font-weight: 600; }
    .close-btn {
      background: rgba(255,255,255,0.1);
      border: none;
      color: white;
      font-size: 14px;
      cursor: pointer;
      padding: 8px 16px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .close-btn:hover { background: rgba(255,255,255,0.2); }
    .stage {
      display: flex;
      justify-content: center;
      padding: 24px 16px;
    }
    .device-frame {
      width: 100%;
      max-width: 680px;
      transition: max-width 0.25s ease;
    }
    .device-label {
      text-align: center;
      color: #6b7280;
      font-size: 13px;
      margin-bottom: 10px;
    }
    .preview-frame {
      width: 100%;
      border: none;
      background: white;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      border-radius: 4px;
      display: block;
    }
    body.mode-mobile .device-frame { max-width: 375px; }
  </style>
</head>
<body class="mode-${initialMode}">
  <div class="preview-header">
    <h2>📧 이메일 미리보기</h2>
    <div class="header-right">
      <div class="mode-toggle">
        <button class="mode-btn${initialMode === 'pc' ? ' active' : ''}" id="btn-pc">🖥️ PC</button>
        <button class="mode-btn${initialMode === 'mobile' ? ' active' : ''}" id="btn-mobile">📱 모바일</button>
      </div>
      <button class="close-btn" onclick="window.close()">닫기</button>
    </div>
  </div>
  <div class="stage">
    <div class="device-frame">
      <div class="device-label" id="device-label">${initialMode === 'mobile' ? '모바일 · 너비 375px' : 'PC · 너비 680px'}</div>
      <iframe class="preview-frame" id="preview-frame"></iframe>
    </div>
  </div>
  <script>
    var emailDoc = ${JSON.stringify(emailDocument)};
    var frame = document.getElementById('preview-frame');
    var label = document.getElementById('device-label');
    var btnPc = document.getElementById('btn-pc');
    var btnMobile = document.getElementById('btn-mobile');
    frame.srcdoc = emailDoc;

    // 내부 콘텐츠 높이에 맞춰 iframe 높이 자동 조정 (스크롤 중첩 방지)
    function syncHeight() {
      try {
        var doc = frame.contentDocument || frame.contentWindow.document;
        if (doc && doc.body) {
          frame.style.height = doc.body.scrollHeight + 'px';
        }
      } catch (e) {}
    }
    frame.addEventListener('load', function () {
      syncHeight();
      setTimeout(syncHeight, 150);
    });

    function setMode(mode) {
      if (mode === 'mobile') {
        document.body.className = 'mode-mobile';
        btnMobile.classList.add('active');
        btnPc.classList.remove('active');
        label.textContent = '모바일 · 너비 375px';
      } else {
        document.body.className = 'mode-pc';
        btnPc.classList.add('active');
        btnMobile.classList.remove('active');
        label.textContent = 'PC · 너비 680px';
      }
      // 폭 전환 애니메이션(0.25s) 이후 높이 재측정
      setTimeout(syncHeight, 300);
    }
    btnPc.addEventListener('click', function () { setMode('pc'); });
    btnMobile.addEventListener('click', function () { setMode('mobile'); });
  <\/script>
</body>
</html>`

    const blob = new Blob([fullHtmlDocument], { type: 'text/html; charset=utf-8' })
    const url = URL.createObjectURL(blob)

    // 이전 미리보기 blob URL 정리 (이미 열린 창은 곧 새 URL로 이동하므로 안전)
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl)
    }
    previewObjectUrl = url

    // 이름 있는 타깃으로 열기 — 같은 이름의 창이 이미 있으면 새 창을 띄우지 않고
    // 해당 창을 새 내용으로 이동(새로고침)시킨다
    const previewWindow = window.open(url, PREVIEW_WINDOW_NAME, 'width=800,height=600,scrollbars=yes')

    if (!previewWindow) {
      showError('팝업 차단됨', '브라우저 설정에서 팝업 차단을 해제해주세요')
      URL.revokeObjectURL(url)
      previewObjectUrl = null
      return
    }

    // 재사용된 창을 앞으로 가져온다
    previewWindow.focus()
  } catch (error) {
    showError('미리보기 실패', error instanceof Error ? error.message : '알 수 없는 오류')
  }
}

/**
 * HTML 복사
 */
const exportHtml = async (): Promise<void> => {
  try {
    // 다운로드(발송용)와 동일하게 완전한 HTML 문서로 감싸 복사 (메타데이터 제외)
    const html = await buildDocument(false)
    await navigator.clipboard.writeText(html)
    showSuccess('복사 완료', 'HTML이 클립보드에 복사되었습니다')
  } catch (error) {
    showError('복사 실패', 'HTML을 복사하지 못했습니다')
  }
}

type DownloadResult =
  | 'saved' // File System Access API로 디스크 저장 확인됨
  | 'triggered' // 폴백(anchor) — 브라우저에 다운로드 위임, 실제 쓰기 결과는 앱이 확정 불가
  | 'cancelled' // 사용자가 저장 대화상자를 취소

/** showSaveFilePicker 최소 타입 (lib.dom 버전 차이 대응) */
interface SaveFilePickerWindow {
  showSaveFilePicker?: (opts?: {
    suggestedName?: string
    types?: Array<{ description?: string; accept: Record<string, string[]> }>
  }) => Promise<{
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>
      close: () => Promise<void>
    }>
  }>
}

/**
 * 파일 저장 트리거
 * - File System Access API 지원 시: 실제 디스크 쓰기 성공/실패(디스크 풀·권한·취소)를 감지
 * - 미지원 시: 기존 anchor 다운로드로 폴백 (URL 해제는 지연시켜 조기 취소로 인한 저장 실패 방지)
 */
const triggerDownload = async (content: string, filename: string): Promise<DownloadResult> => {
  const blob = new Blob([content], { type: 'text/html; charset=utf-8' })

  const showSaveFilePicker = (window as unknown as SaveFilePickerWindow).showSaveFilePicker
  if (typeof showSaveFilePicker === 'function') {
    let handle
    try {
      handle = await showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'HTML 파일', accept: { 'text/html': ['.html'] } }],
      })
    } catch (err) {
      // 사용자가 대화상자를 취소한 경우는 실패가 아님
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      throw err
    }
    // 쓰기 단계의 실패(디스크 공간 부족 등)는 상위 catch로 전파되어 정확히 안내됨
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return 'saved'
  }

  // 폴백: anchor 다운로드 (쓰기 결과 감지 불가) — revoke를 지연시켜 큰 파일 조기 취소 방지
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'triggered'
}

/**
 * HTML 파일 다운로드
 * @param includeMetadata true: 저장용(재편집 메타데이터 포함) / false: 발송용(메타데이터 제거)
 */
const downloadHtml = async (includeMetadata: boolean): Promise<void> => {
  try {
    const modules = moduleStore.modules

    if (!modules || modules.length === 0) {
      showWarn('내보내기 불가', '먼저 모듈을 추가해주세요')
      return
    }

    const fullHtmlDocument = await buildDocument(includeMetadata)

    const now = new Date()
    // 파일 이름은 전시회·폴더로 짓는다 — 어느 뉴스레터의 몇 회차인지가 이름만으로 드러난다
    const filename = buildDownloadFileName(
      editorStore.currentTemplateId,
      editorStore.wrapSettings.volume,
      includeMetadata ? 'edit' : 'send',
    )

    const result = await triggerDownload(fullHtmlDocument, filename)

    // 사용자가 저장 대화상자를 취소 → 기록·저장표시·토스트 없이 종료(작업 상태 유지)
    if (result === 'cancelled') return

    // 최근 내려받음 기록 (메모리)
    lastDownload.value = { time: now, type: includeMetadata ? '저장용 다운' : '발송용 다운' }

    // 저장용만 '저장됨'으로 표시 (발송용은 재편집 불가 → dirty 상태 유지)
    if (includeMetadata) {
      moduleStore.markAsSaved()
    }

    const kindLabel = includeMetadata
      ? `${filename} (저장용 · 다시 불러와 편집 가능)`
      : `${filename} (발송용 · 메타데이터 제거됨)`
    if (result === 'saved') {
      // 실제 디스크 저장 확인됨
      showSuccess('저장 완료', kindLabel)
    } else {
      // 폴백 경로 — 앱이 저장 완료를 확정할 수 없으므로 정직하게 안내
      showSuccess('다운로드 시작됨', `${kindLabel} · 브라우저 다운로드 표시줄을 확인하세요`)
    }
  } catch (error) {
    showError(
      '저장 실패',
      error instanceof Error ? error.message : '디스크 공간 부족·권한 등으로 저장하지 못했습니다',
    )
  }
}

/**
 * 임시 저장 — 지금 작업을 **회차 폴더에** 저장용(재편집 가능) HTML로 올린다.
 *
 * '저장용 내려받기'는 내 PC로만 받기 때문에 담당자나 PC가 바뀌면 이어서 편집할 방법이 없다.
 * 같은 이름(`{전시회}_{폴더}_edit.html`)으로 덮어써 **폴더에는 최신 한 개만** 남는다.
 * (이미지와 같은 폴더에 두는 이유: 파일이 하나뿐이라 하위 폴더를 팔 이유가 없고,
 *  폴더 선택 화면이 이미 그 폴더의 목록을 받아오므로 '이어서 편집'을 바로 알아볼 수 있다)
 */
const saveToFolder = async (): Promise<void> => {
  if (savingToFolder.value) return

  if (!moduleStore.modules?.length) {
    showWarn('임시 저장 불가', '먼저 모듈을 추가해주세요')
    return
  }
  const directory = buildUploadDirectory(editorStore.uploadFolder, editorStore.wrapSettings.volume)
  if (!directory) {
    showWarn('저장할 폴더가 필요해요', MISSING_VOLUME_MESSAGE)
    return
  }

  savingToFolder.value = true
  try {
    // 재편집 메타데이터를 담아 올린다 — 나중에 그대로 불러와 이어서 편집하기 위함
    const document = await buildDocument(true)
    const filename = buildDownloadFileName(
      editorStore.currentTemplateId,
      editorStore.wrapSettings.volume,
      'edit',
    )

    await uploadHtml(new File([document], filename, { type: 'text/html' }), directory, {
      overwrite: true,
    })

    const now = new Date()
    lastDownload.value = { time: now, type: '임시 저장' }
    // 폴더에 남았으니 '저장됨'으로 본다 — 내려받기와 같은 기준
    moduleStore.markAsSaved()
    showSuccess('임시 저장 완료', `${displayUploadDirectory(directory)}${filename}`)
  } catch (error) {
    showError(
      '임시 저장 실패',
      error instanceof UploadError
        ? error.message
        : '저장 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
    )
  } finally {
    savingToFolder.value = false
  }
}

// 저장용: 재편집 메타데이터 포함
const downloadForSave = (): Promise<void> => downloadHtml(true)
// 발송용: 메타데이터 제거 (메일 발송용)
const downloadForSend = (): Promise<void> => downloadHtml(false)
</script>

<style scoped>
/* 세로 구분선 */
/* ── 상단 바 골격 (Figma 1125-3053: 1920×60, 좌우 21px) ────────────────── */
.hnav {
  display: flex;
  align-items: center;
  height: 60px;
  padding: 0 21px;
  background: var(--white);
  border-bottom: 1px solid var(--gray-200);
}
/* 홈 ↔ 나머지 25px (1125-3054) */
.hleft {
  display: flex;
  align-items: center;
  gap: 25px;
  min-width: 0;
}
/* 팀·브레드크럼·구분선·실행취소·전체삭제 사이 20px (1125-3059) */
.hleft-group {
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 0;
}
/* 실행취소 ↔ 다시실행 8px (1125-3064) */
.hundo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
/* 우측 묶음 — 저장상태·버튼 모두 10px 간격 (1125-3080 / 1125-3082) */
.hright {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.hsaved {
  font-size: 13px;
  color: var(--gray-600);
  white-space: nowrap;
}

.hbar {
  width: 1px;
  height: 32px;
  background: var(--gray-200);
  flex-shrink: 0;
}
/* 아이콘 버튼 (홈·실행취소/다시실행) — Figma 40×40 */
.hicon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--gray-700);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s;
}
.hicon:hover:not(:disabled) {
  background: var(--gray-100);
}
.hicon:disabled {
  color: var(--gray-300);
  cursor: default;
}
.hicon .material-symbols-outlined {
  font-size: 24px;
}

/* ── 우측 액션 버튼 (Figma 1125-3082: h40 · px16 · gap6 · rounded8 · 15px) ── */
.hbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border: 0;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  transition: filter 0.12s, background 0.12s;
}
.hbtn:hover {
  filter: brightness(0.96);
}
.hbtn .material-symbols-outlined {
  font-size: 22px;
}
/* 임시저장 */
.hbtn--tint {
  background: var(--blue-50);
  color: var(--blue-600);
}
/* 미리보기 — gray/100 배경 + gray/700 글자 */
.hbtn--muted {
  background: var(--gray-100);
  color: var(--gray-700);
}
/* 발송용 — blue/400 채움 */
.hbtn--primary {
  background: var(--blue-400);
  color: var(--white);
}
/* 더 보기 — 40×40 정사각, 흰 배경 + gray/200 테두리 */
.hbtn--icon {
  width: 40px;
  padding: 0;
  background: var(--white);
  border: 1px solid var(--gray-200);
  color: var(--gray-700);
}
/* 소속 팀 (Figma 1125-3060: success/50 배경 + success/700 글자) */
.hteam {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  min-width: 100px;
  border-radius: 8px;
  background: var(--green-50);
  color: var(--green-700);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}
/* 브레드크럼 (Figma 1125-3062: 14px, gray/700, 템플릿명만 밑줄) */
.hcrumb {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: var(--gray-700);
  min-width: 0;
}
.hcrumb-link {
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hcrumb-link:hover {
  color: var(--blue-500);
}
/* 전체 삭제 (Figma 1125-2964: gap 6px, px 10px, rounded 8px, 14px medium, error/400) */
.hclear {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--red-400);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s;
}
.hclear:hover {
  background: var(--red-50);
}
.hclear .material-symbols-outlined {
  font-size: 22px;
}
/* PC/모바일 세그먼트 토글 */
.seg {
  display: inline-flex;
  background-color:var(--gray-100);
  border-radius: 5rem;
}
.seg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 32px;
  border: 0;
  border-radius: 1000px;
  background: var(--gray-100);
  color: var(--gray-600);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.seg-btn.is-active {
  background: var(--gray-800);
  color: var(--white);
}
.seg-btn .material-symbols-outlined {
  font-size: 20px;
}
</style>
