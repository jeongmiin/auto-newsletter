<template>
  <header class="flex items-center justify-between px-4 py-2 bg-white border-b">
    <!-- 왼쪽: 로고 + 타이틀 -->
    <div class="flex items-center gap-2">
      <img src="/src/assets/img/logo/logo.png" alt="Logo" class="w-7 h-7" />
      <span class="font-semibold text-gray-800 tracking-tight">Auto Newsletter Builder</span>
    </div>

    <!-- 오른쪽: 파일 관리 버튼들 -->
    <div class="flex items-center gap-2">
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
  </header>
</template>

<script setup lang="ts">
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { processQuillHtml } from '@/utils/quillHtmlProcessor'
import { useToast } from 'primevue/usetoast'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()
const toast = useToast()

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

    // 완전한 HTML 문서 생성
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
    .preview-header h2 { margin: 0; font-size: 18px; font-weight: 600; }
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
    .preview-container {
      max-width: 680px;
      margin: 20px auto;
      background-color: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .email-content { padding: 0; }
    @media (max-width: 768px) {
      .preview-container { margin: 10px; max-width: 100%; }
      .preview-header h2 { font-size: 16px; }
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
  <div class="preview-header">
    <h2>📧 이메일 미리보기</h2>
    <button class="close-btn" onclick="window.close()">닫기</button>
  </div>
  <div class="preview-container">
    <div class="email-content">${finalHtml}</div>
  </div>
</body>
</html>`

    const blob = new Blob([fullHtmlDocument], { type: 'text/html; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const previewWindow = window.open(url, '_blank', 'width=800,height=600,scrollbars=yes')

    if (!previewWindow) {
      showError('팝업 차단됨', '브라우저 설정에서 팝업 차단을 해제해주세요')
      URL.revokeObjectURL(url)
      return
    }

    previewWindow.addEventListener('unload', () => URL.revokeObjectURL(url))
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
 * HTML 파일 다운로드
 */
const downloadHtmlFile = async (): Promise<void> => {
  try {
    const modules = moduleStore.modules

    if (!modules || modules.length === 0) {
      showWarn('내보내기 불가', '먼저 모듈을 추가해주세요')
      return
    }

    let finalHtml = await moduleStore.generateHtml()
    finalHtml = processQuillHtml(finalHtml)

    const projectState = {
      modules: modules.map((m) => ({
        moduleId: m.moduleId,
        order: m.order,
        properties: m.properties,
        styles: m.styles,
      })),
      wrapSettings: editorStore.wrapSettings,
    }
    const moduleMetadataJson = JSON.stringify(projectState)

    const fullHtmlDocument = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Newsletter</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    p, h1, h2, h3 { margin: 0; padding: 0; }
    h1 { font-size: 2em; font-weight: bold; }
    h2 { font-size: 1.5em; font-weight: bold; }
    h3 { font-size: 1.17em; font-weight: bold; }
    strong { font-weight: 700; }
    em { font-style: italic; }
    a { color: #0066cc; text-decoration: underline; }
  </style>
</head>
<body>
${finalHtml}
<!-- AUTO_NEWSLETTER_METADATA_START -->
<!-- ${moduleMetadataJson} -->
<!-- AUTO_NEWSLETTER_METADATA_END -->
</body>
</html>`

    const now = new Date()
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_')
    const filename = `newsletter_${timestamp}.html`

    const blob = new Blob([fullHtmlDocument], { type: 'text/html; charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()

    link.remove()
    URL.revokeObjectURL(url)

    moduleStore.markAsSaved()
    showSuccess('다운로드 완료', `${filename} 파일이 저장되었습니다`)
  } catch (error) {
    showError('다운로드 실패', error instanceof Error ? error.message : '알 수 없는 오류')
  }
}

/**
 * 프로젝트 메타데이터 타입
 */
interface ProjectMetadata {
  modules: Array<{
    moduleId: string
    order: number
    properties: Record<string, unknown>
    styles: Record<string, unknown>
  }>
  wrapSettings?: {
    backgroundColor: string
    borderWidth: string
    borderColor: string
    borderStyle: string
  }
}

/**
 * HTML 파일에서 모듈 메타데이터 추출
 */
const extractModuleMetadata = (htmlContent: string): ProjectMetadata | null => {
  const startMarker = '<!-- AUTO_NEWSLETTER_METADATA_START -->'
  const endMarker = '<!-- AUTO_NEWSLETTER_METADATA_END -->'

  const startIndex = htmlContent.indexOf(startMarker)
  const endIndex = htmlContent.indexOf(endMarker)

  if (startIndex === -1 || endIndex === -1) return null

  const metadataSection = htmlContent.substring(startIndex + startMarker.length, endIndex).trim()
  const jsonMatch = metadataSection.match(/<!--\s*([\s\S]*?)\s*-->/)
  if (!jsonMatch) return null

  try {
    const jsonString = jsonMatch[1].trim()
    const metadata = JSON.parse(jsonString)
    if (Array.isArray(metadata)) return { modules: metadata }
    return metadata as ProjectMetadata
  } catch {
    return null
  }
}

/**
 * HTML 파일 가져오기
 */
const importHtmlFile = async (): Promise<void> => {
  try {
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = '.html'

    fileInput.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]

      if (!file) return

      const reader = new FileReader()
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        const htmlContent = e.target?.result as string

        if (!htmlContent) {
          showError('파일 읽기 실패', '파일 내용을 읽을 수 없습니다')
          return
        }

        const projectData = extractModuleMetadata(htmlContent)

        if (!projectData || projectData.modules.length === 0) {
          showError('가져오기 실패', '이 에디터에서 내보낸 파일만 가져올 수 있습니다')
          return
        }

        if (moduleStore.availableModules.length === 0) {
          await moduleStore.loadAvailableModules()
        }

        moduleStore.clearAll()

        if (projectData.wrapSettings) {
          editorStore.updateWrapSettings(projectData.wrapSettings)
        }

        let restoredCount = 0
        for (const moduleData of projectData.modules.sort((a, b) => a.order - b.order)) {
          const moduleMetadata = moduleStore.availableModules.find(
            (m) => m.id === moduleData.moduleId,
          )

          if (moduleMetadata) {
            moduleStore.addModule(moduleMetadata)
            const addedModule = moduleStore.modules[moduleStore.modules.length - 1]

            Object.entries(moduleData.properties).forEach(([key, value]) => {
              addedModule.properties[key] = value
            })

            if (moduleData.styles) {
              Object.entries(moduleData.styles).forEach(([key, value]) => {
                ;(addedModule.styles as Record<string, unknown>)[key] = value
              })
            }

            restoredCount++
          }
        }

        if (moduleStore.modules.length > 0) {
          moduleStore.selectModule(moduleStore.modules[0].id)
        }

        showSuccess('가져오기 완료', `${restoredCount}개의 모듈이 복원되었습니다`)
      }

      reader.onerror = () => {
        showError('파일 읽기 실패', '파일을 읽는 중 오류가 발생했습니다')
      }

      reader.readAsText(file, 'UTF-8')
    }

    fileInput.click()
  } catch (error) {
    showError('가져오기 실패', error instanceof Error ? error.message : '알 수 없는 오류')
  }
}
</script>
