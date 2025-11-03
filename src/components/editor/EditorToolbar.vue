<template>
  <div class="flex items-center justify-between px-4 bg-white border-b p-2">
    <!-- 왼쪽: 기본 액션들 -->
    <div class="flex items-center space-x-2">
      <button @click="clearAll" class="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded">
        전체 삭제
      </button>
    </div>

    <!-- 중앙: 캔버스 설정 -->
    <div class="flex items-center space-x-4">
      <div class="flex items-center space-x-2">
        <span class="text-sm text-gray-600">미리보기:</span>
        <button
          @click="setCanvasWidth('mobile')"
          :class="[
            'px-3 py-1 text-sm rounded',
            canvasWidth === 'mobile'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100',
          ]"
        >
          📱 모바일
        </button>
        <button
          @click="setCanvasWidth('desktop')"
          :class="[
            'px-3 py-1 text-sm rounded',
            canvasWidth === 'desktop'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100',
          ]"
        >
          🖥️ 데스크톱
        </button>
      </div>
    </div>

    <!-- 오른쪽: 내보내기 -->
    <div class="flex items-center space-x-2">
      <button
        @click="previewEmail"
        class="px-4 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded"
      >
        미리보기
      </button>
      <button
        @click="exportHtml"
        class="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded"
      >
        HTML 복사
      </button>
      <button
        @click="downloadHtmlFile"
        class="px-4 py-2 text-sm bg-green-600 text-white hover:bg-green-700 rounded"
      >
        HTML 내보내기
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { processQuillHtml } from '@/utils/quillHtmlProcessor'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()

const canvasWidth = computed(() => editorStore.canvasWidth)

const clearAll = (): void => {
  moduleStore.clearAll()
}

const setCanvasWidth = (width: 'mobile' | 'desktop'): void => {
  editorStore.setCanvasWidth(width)
}

/**
 * 미리보기: 최종 HTML을 새 창에서 표시
 */
const previewEmail = async (): Promise<void> => {
  try {
    console.group('👁️ 이메일 미리보기')

    const modules = moduleStore.modules
    console.log('모듈 개수:', modules.length)

    if (!modules || modules.length === 0) {
      console.warn('미리보기할 모듈이 없음')
      alert('미리보기할 모듈이 없습니다')
      console.groupEnd()
      return
    }

    // 최종 HTML 생성 (HTML 복사와 동일한 로직)
    let finalHtml = await moduleStore.generateHtml()

    console.log('생성된 HTML 길이:', finalHtml.length, 'bytes')

    // Quill HTML 처리 (RGB→HEX, margin/padding 제거)
    finalHtml = processQuillHtml(finalHtml)

    console.log('처리 후 HTML 길이:', finalHtml.length, 'bytes')
    console.log('HTML 미리보기:', finalHtml.substring(0, 200) + '...')

    // 블록 태그 통계
    const pCount = (finalHtml.match(/<p[^>]*>/g) || []).length
    const h1Count = (finalHtml.match(/<h1[^>]*>/g) || []).length
    const h2Count = (finalHtml.match(/<h2[^>]*>/g) || []).length
    const h3Count = (finalHtml.match(/<h3[^>]*>/g) || []).length

    console.log('블록 태그 통계:', { p: pCount, h1: h1Count, h2: h2Count, h3: h3Count })

    // 완전한 HTML 문서 생성 (미리보기용 스타일 포함)
    const fullHtmlDocument = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>이메일 미리보기</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .preview-header {
      background: #333;
      color: white;
      padding: 15px 20px;
      position: sticky;
      top: 0;
      z-index: 1000;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .preview-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
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
    .close-btn:hover {
      background: rgba(255,255,255,0.2);
    }
    .preview-container {
      max-width: 680px;
      margin: 20px auto;
      background-color: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .email-content {
      padding: 0;
    }

    /* 모바일 반응형 */
    @media (max-width: 768px) {
      .preview-container {
        margin: 10px;
        max-width: 100%;
      }
      .preview-header h2 {
        font-size: 16px;
      }
    }

    /* 이메일 콘텐츠 스타일 */
    .email-content p,
    .email-content h1,
    .email-content h2,
    .email-content h3 {
      margin: 0;
      padding: 0;
    }
    .email-content h1 {
      font-size: 2em;
      font-weight: bold;
    }
    .email-content h2 {
      font-size: 1.5em;
      font-weight: bold;
    }
    .email-content h3 {
      font-size: 1.17em;
      font-weight: bold;
    }
    .email-content strong {
      font-weight: 700;
    }
    .email-content em {
      font-style: italic;
    }
    .email-content a {
      color: #0066cc;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="preview-header">
    <h2>📧 이메일 미리보기</h2>
    <button class="close-btn" onclick="window.close()">닫기</button>
  </div>
  <div class="preview-container">
    <div class="email-content">
      ${finalHtml}
    </div>
  </div>
</body>
</html>`

    // Blob 생성 및 새 창 열기 (더 안전한 방식)
    const blob = new Blob([fullHtmlDocument], { type: 'text/html; charset=utf-8' })
    const url = URL.createObjectURL(blob)

    // 새 창 열기
    const previewWindow = window.open(url, '_blank', 'width=800,height=600,scrollbars=yes')

    if (!previewWindow) {
      console.error('팝업 차단됨')
      alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.')
      URL.revokeObjectURL(url)
      console.groupEnd()
      return
    }

    // 창이 닫히면 URL 정리
    previewWindow.addEventListener('unload', () => {
      URL.revokeObjectURL(url)
      console.log('🗑️ Blob URL 정리됨')
    })

    console.log('✅ 미리보기 창 열림')
    console.groupEnd()
  } catch (error) {
    console.error('❌ 미리보기 실패:', error)
    console.groupEnd()
    alert(
      '미리보기에 실패했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'),
    )
  }
}

/**
 * HTML 복사: 최종 HTML을 클립보드에 복사
 */
const exportHtml = async (): Promise<void> => {
  try {
    // 최종 HTML 생성
    let html = await moduleStore.generateHtml()

    // Quill HTML 처리 (RGB→HEX, margin/padding 제거) - 미리보기와 동일
    html = processQuillHtml(html)

    // 클립보드에 복사
    await navigator.clipboard.writeText(html)
    alert('HTML이 복사되었습니다!')
  } catch (error) {
    console.error('HTML 복사 실패:', error)
    alert('HTML 복사에 실패했습니다.')
  }
}

/**
 * HTML 파일 다운로드: 최종 HTML을 파일로 내보내기
 */
const downloadHtmlFile = async (): Promise<void> => {
  try {
    console.group('📥 HTML 파일 다운로드')

    const modules = moduleStore.modules
    console.log('모듈 개수:', modules.length)

    if (!modules || modules.length === 0) {
      console.warn('내보낼 모듈이 없음')
      alert('내보낼 모듈이 없습니다')
      console.groupEnd()
      return
    }

    // 최종 HTML 생성
    let finalHtml = await moduleStore.generateHtml()

    console.log('생성된 HTML 길이:', finalHtml.length, 'bytes')

    // Quill HTML 처리 (RGB→HEX, margin/padding 제거)
    finalHtml = processQuillHtml(finalHtml)

    console.log('처리 후 HTML 길이:', finalHtml.length, 'bytes')

    // 완전한 HTML 문서 생성 (이메일용 최적화)
    const fullHtmlDocument = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Newsletter</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    /* 이메일 콘텐츠 스타일 */
    p, h1, h2, h3 {
      margin: 0;
      padding: 0;
    }
    h1 {
      font-size: 2em;
      font-weight: bold;
    }
    h2 {
      font-size: 1.5em;
      font-weight: bold;
    }
    h3 {
      font-size: 1.17em;
      font-weight: bold;
    }
    strong {
      font-weight: 700;
    }
    em {
      font-style: italic;
    }
    a {
      color: #0066cc;
      text-decoration: underline;
    }
  </style>
</head>
<body>
${finalHtml}
</body>
</html>`

    // 현재 날짜와 시간으로 파일명 생성
    const now = new Date()
    const timestamp = now
      .toISOString()
      .slice(0, 19)
      .replace(/:/g, '-')
      .replace('T', '_')
    const filename = `newsletter_${timestamp}.html`

    // Blob 생성 및 다운로드
    const blob = new Blob([fullHtmlDocument], { type: 'text/html; charset=utf-8' })
    const url = URL.createObjectURL(blob)

    // 다운로드 링크 생성 및 클릭
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()

    // 정리
    link.remove()
    URL.revokeObjectURL(url)

    console.log('✅ HTML 파일 다운로드 완료:', filename)
    console.groupEnd()

    alert(`HTML 파일이 다운로드되었습니다!\n파일명: ${filename}`)
  } catch (error) {
    console.error('❌ HTML 파일 다운로드 실패:', error)
    console.groupEnd()
    alert(
      'HTML 파일 다운로드에 실패했습니다: ' +
        (error instanceof Error ? error.message : '알 수 없는 오류'),
    )
  }
}
</script>
