<template>
  <header class="flex items-center justify-between px-4 py-2 bg-white border-b">
    <!-- 왼쪽: 로고 + 타이틀 -->
    <div class="flex items-center gap-2">
      <img src="/src/assets/img/logo/logo.png" alt="Logo" class="w-7 h-7" />
      <h2 class="font-bold text-gray-800 text-lg">Newsletter Builder</h2>
    </div>

    <!-- 오른쪽: 파일 관리 버튼들 -->
    <div class="flex items-center gap-2">
      <span v-if="lastDownload" class="text-sm text-gray-500 whitespace-nowrap">
        {{ lastDownloadDateLabel }}<span class="font-bold">{{ lastDownload.type }}</span> 내려받음
      </span>
      <Button
        @click="downloadForSave"
        label="저장용 내려받기"
        icon="pi pi-save"
        outlined
        size="small"
        v-tooltip.bottom="'재편집용 — 다시 불러와 편집 가능'"
      />
      <Button
        @click="importHtmlFile"
        label="파일 열기"
        icon="pi pi-folder-open"
        outlined
        size="small"
        v-tooltip.bottom="'이전에 저장한 파일을 불러옵니다'"
      />
      <Button
        @click="previewEmail"
        label="미리보기"
        icon="pi pi-eye"
        severity="secondary"
        outlined
        size="small"
        v-tooltip.bottom="'새 창에서 완성된 모습을 확인합니다'"
      />
      <Button
        @click="exportHtml"
        label="코드 복사"
        icon="pi pi-copy"
        severity="secondary"
        outlined
        size="small"
        v-tooltip.bottom="'코드를 클립보드에 복사합니다'"
      />

      <Button
        @click="downloadForSend"
        label="발송용 내려받기"
        icon="pi pi-send"
        size="small"
        v-tooltip.bottom="'메일 발송용 — 다시 불러와 편집 불가능'"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { processQuillHtml } from '@/utils/quillHtmlProcessor'
import { useNewsletterImport } from '@/composables/useNewsletterImport'
import { useToast } from 'primevue/usetoast'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()
const toast = useToast()
const { importHtmlFile } = useNewsletterImport()

// 최근 내려받음 표시 (메모리 상태 — 새로고침 시 초기화)
const lastDownload = ref<{ time: Date; type: '저장용' | '발송용' } | null>(null)

// 날짜 부분 ("… 초 ") — 타입은 템플릿에서 굵게 별도 렌더
const lastDownloadDateLabel = computed(() => {
  if (!lastDownload.value) return ''
  const d = lastDownload.value.time
  return (
    `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ` +
    `${d.getHours()}시 ${d.getMinutes()}분 ${d.getSeconds()}초 `
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
      max-width: 720px;
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
      <div class="device-label" id="device-label">${initialMode === 'mobile' ? '모바일 · 너비 375px' : 'PC · 너비 720px'}</div>
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
        label.textContent = 'PC · 너비 720px';
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
    let html = await moduleStore.generateHtml()
    html = processQuillHtml(html)
    await navigator.clipboard.writeText(html)
    showSuccess('복사 완료', 'HTML이 클립보드에 복사되었습니다')
  } catch (error) {
    showError('복사 실패', 'HTML을 복사하지 못했습니다')
  }
}

/**
 * 최종 HTML 문서 생성
 * @param finalHtml 렌더링된 본문 HTML
 * @param includeMetadata true이면 재편집용 메타데이터(주석) 포함, false이면 제거(발송용)
 */
const buildHtmlDocument = (finalHtml: string, includeMetadata: boolean): string => {
  let metadataBlock = ''
  if (includeMetadata) {
    const projectState = {
      modules: moduleStore.modules.map((m) => ({
        moduleId: m.moduleId,
        order: m.order,
        properties: m.properties,
        styles: m.styles,
      })),
      wrapSettings: editorStore.wrapSettings,
    }
    const moduleMetadataJson = JSON.stringify(projectState)
    metadataBlock = `
<!-- AUTO_NEWSLETTER_METADATA_START -->
<!-- ${moduleMetadataJson} -->
<!-- AUTO_NEWSLETTER_METADATA_END -->`
  }

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Newsletter</title>
</head>
<body>
${finalHtml}${metadataBlock}
</body>
</html>`
}

/**
 * 브라우저 다운로드 트리거
 */
const triggerDownload = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/html; charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
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

    let finalHtml = await moduleStore.generateHtml()
    finalHtml = processQuillHtml(finalHtml)

    const fullHtmlDocument = buildHtmlDocument(finalHtml, includeMetadata)

    const now = new Date()
    const pad = (n: number): string => String(n).padStart(2, '0')
    const timestamp =
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
      `_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
    const prefix = includeMetadata ? '재편집용' : '발송용'
    const filename = `${prefix}_newsletter_${timestamp}.html`

    triggerDownload(fullHtmlDocument, filename)

    // 최근 내려받음 기록 (메모리)
    lastDownload.value = { time: now, type: includeMetadata ? '저장용' : '발송용' }

    // 저장용만 '저장됨'으로 표시 (발송용은 재편집 불가 → dirty 상태 유지)
    if (includeMetadata) {
      moduleStore.markAsSaved()
    }
    showSuccess(
      '다운로드 완료',
      includeMetadata
        ? `${filename} (저장용 · 다시 불러와 편집 가능)`
        : `${filename} (발송용 · 메타데이터 제거됨)`,
    )
  } catch (error) {
    showError('다운로드 실패', error instanceof Error ? error.message : '알 수 없는 오류')
  }
}

// 저장용: 재편집 메타데이터 포함
const downloadForSave = (): Promise<void> => downloadHtml(true)
// 발송용: 메타데이터 제거 (메일 발송용)
const downloadForSend = (): Promise<void> => downloadHtml(false)
</script>
