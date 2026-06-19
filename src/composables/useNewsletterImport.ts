import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { migrateModuleProperties } from '@/utils/moduleMigrations'
import { useToast } from 'primevue/usetoast'
import type { ModuleGroup } from '@/types'

/**
 * 재편집용 HTML 파일(메타데이터 포함)을 열어 현재 작업 영역에 모듈을 복원한다.
 * AppHeader의 "파일 열기"와 캔버스 빈 화면 버튼에서 공용으로 사용.
 */
interface ProjectMetadata {
  modules: Array<{
    moduleId: string
    order: number
    properties: Record<string, unknown>
    styles: Record<string, unknown>
    groupId?: string
  }>
  groups?: ModuleGroup[]
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

export function useNewsletterImport() {
  const moduleStore = useModuleStore()
  const editorStore = useEditorStore()
  const toast = useToast()

  const showSuccess = (summary: string, detail?: string) => {
    toast.add({ severity: 'success', summary, detail, life: 3000 })
  }
  const showError = (summary: string, detail?: string) => {
    toast.add({ severity: 'error', summary, detail, life: 5000 })
  }

  /**
   * 파일 선택 다이얼로그를 열고, 선택된 재편집용 HTML을 복원한다.
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

              // 구버전 저장 파일 속성을 현재 스키마로 변환 후 적용
              const migratedProps = migrateModuleProperties(
                moduleData.moduleId,
                moduleData.properties,
              )
              Object.entries(migratedProps).forEach(([key, value]) => {
                addedModule.properties[key] = value
              })

              if (moduleData.styles) {
                Object.entries(moduleData.styles).forEach(([key, value]) => {
                  ;(addedModule.styles as Record<string, unknown>)[key] = value
                })
              }
              // 그룹 소속 복원 (그룹 정의는 아래에서 일괄 복원)
              if (moduleData.groupId) {
                addedModule.groupId = moduleData.groupId
              }

              restoredCount++
            }
          }

          // 그룹 정의 복원 후 연속성 정리
          if (projectData.groups && projectData.groups.length > 0) {
            moduleStore.groups = JSON.parse(JSON.stringify(projectData.groups))
            moduleStore.normalizeGroupContiguity()
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

  return { importHtmlFile }
}
