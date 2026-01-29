<template>
  <div class="flex items-center justify-between px-4 bg-white border-b p-2">
    <!-- 왼쪽: 기본 액션들 -->
    <div class="flex items-center gap-2">
      <Button
        @click="confirmClearAll"
        label="전체 삭제"
        icon="pi pi-trash"
        severity="danger"
        text
        size="small"
        v-tooltip.bottom="'모든 모듈을 삭제합니다'"
      />
    </div>

    <!-- 중앙: 화면 크기 선택 -->
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600">화면 크기:</span>
        <Button
          @click="setCanvasWidth('mobile')"
          label="모바일"
          icon="pi pi-mobile"
          severity="secondary"
          :outlined="canvasWidth !== 'mobile'"
          :text="canvasWidth !== 'mobile'"
          size="small"
          v-tooltip.bottom="'모바일 화면에서 어떻게 보이는지 확인'"
        />
        <Button
          @click="setCanvasWidth('desktop')"
          label="PC"
          icon="pi pi-desktop"
          severity="secondary"
          :outlined="canvasWidth !== 'desktop'"
          :text="canvasWidth !== 'desktop'"
          size="small"
          v-tooltip.bottom="'PC 화면에서 어떻게 보이는지 확인'"
        />
      </div>
    </div>

    <!-- 오른쪽: 파일 관리 버튼들 -->
    <div class="flex items-center gap-2">
      <Button
        @click="importHtmlFile"
        label="파일 열기"
        icon="pi pi-folder-open"
        severity="secondary"
        outlined
        size="small"
        v-tooltip.bottom="'이전에 저장한 파일을 불러옵니다'"
      />
      <Button
        @click="previewEmail"
        label="미리보기"
        icon="pi pi-eye"
        severity="info"
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
        @click="downloadHtmlFile"
        label="내려받기"
        icon="pi pi-download"
        severity="success"
        size="small"
        v-tooltip.bottom="'컴퓨터에 파일로 저장합니다'"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { processQuillHtml } from '@/utils/quillHtmlProcessor'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()
const toast = useToast()
const confirm = useConfirm()

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

const canvasWidth = computed(() => editorStore.canvasWidth)

const clearAll = (): void => {
  moduleStore.clearAll()
}

/**
 * 전체 삭제 확인 다이얼로그
 */
const confirmClearAll = (): void => {
  if (moduleStore.modules.length === 0) {
    showWarn('삭제할 모듈 없음', '현재 추가된 모듈이 없습니다')
    return
  }

  confirm.require({
    message: `현재 ${moduleStore.modules.length}개의 모듈이 있습니다. 모두 삭제하시겠습니까?`,
    header: '전체 삭제 확인',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: '취소',
    acceptLabel: '삭제',
    rejectClass: 'p-button-secondary',
    acceptClass: 'p-button-danger',
    accept: () => {
      clearAll()
      showSuccess('삭제 완료', '모든 모듈이 삭제되었습니다')
    },
  })
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
      showWarn('미리보기 불가', '먼저 모듈을 추가해주세요')
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
      showError('팝업 차단됨', '브라우저 설정에서 팝업 차단을 해제해주세요')
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
    showError('미리보기 실패', error instanceof Error ? error.message : '알 수 없는 오류')
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
    showSuccess('복사 완료', 'HTML이 클립보드에 복사되었습니다')
  } catch (error) {
    console.error('HTML 복사 실패:', error)
    showError('복사 실패', 'HTML을 복사하지 못했습니다')
  }
}

/**
 * HTML 파일 다운로드: 최종 HTML을 파일로 내보내기
 * 모듈 메타데이터를 HTML 주석으로 포함하여 나중에 가져오기 가능
 */
const downloadHtmlFile = async (): Promise<void> => {
  try {
    console.group('📥 HTML 파일 다운로드')

    const modules = moduleStore.modules
    console.log('모듈 개수:', modules.length)

    if (!modules || modules.length === 0) {
      console.warn('내보낼 모듈이 없음')
      showWarn('내보내기 불가', '먼저 모듈을 추가해주세요')
      console.groupEnd()
      return
    }

    // 최종 HTML 생성
    let finalHtml = await moduleStore.generateHtml()

    console.log('생성된 HTML 길이:', finalHtml.length, 'bytes')

    // Quill HTML 처리 (RGB→HEX, margin/padding 제거)
    finalHtml = processQuillHtml(finalHtml)

    console.log('처리 후 HTML 길이:', finalHtml.length, 'bytes')

    // 모듈 상태를 JSON으로 직렬화 (가져오기용 메타데이터)
    const moduleState = modules.map((m) => ({
      moduleId: m.moduleId,
      order: m.order,
      properties: m.properties,
      styles: m.styles,
    }))
    const moduleMetadataJson = JSON.stringify(moduleState)

    // 완전한 HTML 문서 생성 (이메일용 최적화 + 메타데이터 포함)
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
<!-- AUTO_NEWSLETTER_METADATA_START -->
<!-- ${moduleMetadataJson} -->
<!-- AUTO_NEWSLETTER_METADATA_END -->
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

    // 저장 완료로 표시 (이탈 경고 방지)
    moduleStore.markAsSaved()

    showSuccess('다운로드 완료', `${filename} 파일이 저장되었습니다`)
  } catch (error) {
    console.error('❌ HTML 파일 다운로드 실패:', error)
    console.groupEnd()
    showError('다운로드 실패', error instanceof Error ? error.message : '알 수 없는 오류')
  }
}

/**
 * HTML 파일에서 모듈 메타데이터 추출
 */
const extractModuleMetadata = (htmlContent: string): Array<{
  moduleId: string
  order: number
  properties: Record<string, unknown>
  styles: Record<string, unknown>
}> | null => {
  const startMarker = '<!-- AUTO_NEWSLETTER_METADATA_START -->'
  const endMarker = '<!-- AUTO_NEWSLETTER_METADATA_END -->'

  const startIndex = htmlContent.indexOf(startMarker)
  const endIndex = htmlContent.indexOf(endMarker)

  if (startIndex === -1 || endIndex === -1) {
    console.warn('메타데이터 마커를 찾을 수 없음')
    return null
  }

  const metadataSection = htmlContent.substring(startIndex + startMarker.length, endIndex).trim()

  // <!-- JSON --> 형태에서 JSON 추출
  const jsonMatch = metadataSection.match(/<!--\s*([\s\S]*?)\s*-->/)
  if (!jsonMatch) {
    console.warn('메타데이터 JSON을 찾을 수 없음')
    return null
  }

  try {
    const jsonString = jsonMatch[1].trim()
    const metadata = JSON.parse(jsonString)
    return metadata
  } catch (error) {
    console.error('메타데이터 JSON 파싱 실패:', error)
    return null
  }
}

/**
 * HTML 파일 가져오기: 파일에서 모듈 상태 복원
 */
const importHtmlFile = async (): Promise<void> => {
  try {
    console.group('📤 HTML 파일 가져오기')

    // 파일 선택 input 생성
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = '.html'

    // 파일 선택 후 처리
    fileInput.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]

      if (!file) {
        console.warn('파일이 선택되지 않음')
        console.groupEnd()
        return
      }

      console.log('선택된 파일:', file.name, file.size, 'bytes')

      // 파일 내용 읽기
      const reader = new FileReader()
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        const htmlContent = e.target?.result as string

        if (!htmlContent) {
          showError('파일 읽기 실패', '파일 내용을 읽을 수 없습니다')
          console.groupEnd()
          return
        }

        // 메타데이터 추출
        const metadata = extractModuleMetadata(htmlContent)

        if (!metadata || metadata.length === 0) {
          showError('가져오기 실패', '이 에디터에서 내보낸 파일만 가져올 수 있습니다')
          console.groupEnd()
          return
        }

        console.log('추출된 메타데이터:', metadata.length, '개 모듈')

        // 모듈 메타데이터가 로드되어 있는지 확인
        if (moduleStore.availableModules.length === 0) {
          await moduleStore.loadAvailableModules()
        }

        // 기존 모듈 초기화
        moduleStore.clearAll()

        // 모듈 복원
        let restoredCount = 0
        for (const moduleData of metadata.sort((a, b) => a.order - b.order)) {
          const moduleMetadata = moduleStore.availableModules.find(
            (m) => m.id === moduleData.moduleId,
          )

          if (moduleMetadata) {
            // 모듈 추가
            moduleStore.addModule(moduleMetadata)

            // 추가된 모듈의 속성 복원
            const addedModule = moduleStore.modules[moduleStore.modules.length - 1]

            // properties 복원
            Object.entries(moduleData.properties).forEach(([key, value]) => {
              addedModule.properties[key] = value
            })

            // styles 복원
            if (moduleData.styles) {
              Object.entries(moduleData.styles).forEach(([key, value]) => {
                ;(addedModule.styles as Record<string, unknown>)[key] = value
              })
            }

            restoredCount++
            console.log(`✅ 모듈 복원됨: ${moduleData.moduleId}`)
          } else {
            console.warn(`⚠️ 모듈을 찾을 수 없음: ${moduleData.moduleId}`)
          }
        }

        // 첫 번째 모듈 선택
        if (moduleStore.modules.length > 0) {
          moduleStore.selectModule(moduleStore.modules[0].id)
        }

        console.log(`✅ 가져오기 완료: ${restoredCount}/${metadata.length}개 모듈 복원됨`)
        console.groupEnd()

        showSuccess('가져오기 완료', `${restoredCount}개의 모듈이 복원되었습니다`)
      }

      reader.onerror = () => {
        console.error('파일 읽기 실패')
        console.groupEnd()
        showError('파일 읽기 실패', '파일을 읽는 중 오류가 발생했습니다')
      }

      reader.readAsText(file, 'UTF-8')
    }

    // 파일 선택 다이얼로그 열기
    fileInput.click()
  } catch (error) {
    console.error('❌ HTML 파일 가져오기 실패:', error)
    console.groupEnd()
    showError('가져오기 실패', error instanceof Error ? error.message : '알 수 없는 오류')
  }
}
</script>
