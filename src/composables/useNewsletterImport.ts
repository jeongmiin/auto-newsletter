import { useModuleStore } from '@/stores/moduleStore'
import { countConvertibleModules, FIT_NATURAL_WIDTH_KEY } from '@/utils/legacyToComposed'
import {
  extractProjectMetadata,
  restoreProject,
  type ProjectMetadata,
} from '@/utils/projectFile'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

/**
 * 재편집용 HTML 파일(메타데이터 포함)을 열어 현재 작업 영역에 모듈을 복원한다.
 * AppHeader의 "파일 열기"와 캔버스 빈 화면 버튼에서 공용으로 사용.
 *
 * 예전 편집 방식 모듈이 들어 있으면 "새 편집 방식으로 열기 / 예전 방식으로 열기"를 묻고,
 * 앞을 고르면 원소 모듈 그룹으로 바꿔 복원한다(변환·복원 본체는 `utils/projectFile`).
 * ⚠ 사용자에게 보이는 문구에는 'v2·조립형·레거시' 같은 내부 용어를 쓰지 않는다 — 사용자에게는
 *   "예전/새 편집 방식"일 뿐이다.
 */
export function useNewsletterImport() {
  const moduleStore = useModuleStore()
  const toast = useToast()
  const confirm = useConfirm()

  const showSuccess = (summary: string, detail?: string) => {
    toast.add({ severity: 'success', summary, detail, life: 3000 })
  }
  const showError = (summary: string, detail?: string) => {
    toast.add({ severity: 'error', summary, detail, life: 5000 })
  }
  const showWarn = (summary: string, detail?: string) => {
    toast.add({ severity: 'warn', summary, detail, life: 9000 })
  }

  /**
   * 나눌 수 있는 모듈 개수. 이미 그룹에 묶여 있어도 대상이다 — 그룹은 "이미 새 방식"이 아니라
   * 사용자가 직접 묶어둔 묶음일 수 있고, 그 경우 원소들을 그 그룹 안에 풀어 넣는다.
   */
  const convertibleCount = (projectData: ProjectMetadata): number =>
    countConvertibleModules(projectData.modules)

  /**
   * 예전 헤더 로고처럼 '원본 크기'로 그려지던 이미지의 실제 크기를 재
   * 원소 모듈(ModuleImg)의 최대 너비를 px로 채운다.
   *
   * ModuleImg는 항상 `width:100%`라 최대 너비를 지정하지 않으면 로고가 본문 폭까지 늘어난다.
   * 변환기는 표식만 남기고, 실제 크기는 브라우저에서만 알 수 있으므로 여기서 채운다.
   * @returns 크기를 재지 못해 늘어난 채로 남은 이미지 URL 목록
   */
  const applyNaturalImageWidths = async (): Promise<string[]> => {
    const targets = moduleStore.modules.filter((m) => m.properties?.[FIT_NATURAL_WIDTH_KEY])
    if (targets.length === 0) return []

    const failed: string[] = []
    await Promise.all(
      targets.map(
        (m) =>
          new Promise<void>((resolve) => {
            const url = String(m.properties.imageUrl ?? '')
            // 표식은 성공/실패와 무관하게 지운다 (저장 파일에 남지 않도록)
            delete m.properties[FIT_NATURAL_WIDTH_KEY]
            if (!url) {
              resolve()
              return
            }
            const probe = new Image()
            probe.onload = () => {
              if (probe.naturalWidth > 0) {
                m.properties.imageMaxWidth = `${probe.naturalWidth}px`
              } else {
                failed.push(url)
              }
              resolve()
            }
            probe.onerror = () => {
              failed.push(url)
              resolve()
            }
            probe.src = url
          }),
      ),
    )
    return failed
  }

  const finishRestore = async (
    projectData: ProjectMetadata,
    toComposed: boolean,
  ): Promise<void> => {
    const { restoredCount, convertedCount, warnings } = restoreProject(projectData, toComposed)
    if (toComposed) {
      const failed = await applyNaturalImageWidths()
      if (failed.length > 0) {
        warnings.push(
          `로고 이미지 ${failed.length}개는 원래 크기를 확인하지 못해 본문 너비에 맞춰 커집니다. 이미지 설정의 "최대 너비"에 원하는 크기(예: 140px)를 넣어 주세요.`,
        )
      }
    }
    showSuccess(
      '가져오기 완료',
      toComposed
        ? `${restoredCount}개의 모듈을 불러왔습니다 (${convertedCount}개는 새 편집 방식으로 열었습니다)`
        : `${restoredCount}개의 모듈이 복원되었습니다`,
    )
    if (warnings.length > 0) {
      console.warn('[새 편집 방식 변환] 원본과 달라진 부분:', warnings)
      showWarn('이 부분만 확인해 주세요', warnings.join('\n'))
    }
  }

  /**
   * 예전 편집 방식 모듈이 있으면 변환 여부를 묻고, 없으면 그대로 복원한다.
   */
  const restoreWithPrompt = (projectData: ProjectMetadata): void => {
    const count = convertibleCount(projectData)
    if (count === 0) {
      void finishRestore(projectData, false)
      return
    }
    confirm.require({
      header: '새 편집 방식으로 열까요?',
      message:
        `모듈 ${count}개를 이미지·제목·본문·버튼으로 나눠 하나씩 따로 고칠 수 있습니다. ` +
        '디자인은 그대로 유지됩니다.',
      acceptLabel: '새 방식으로 열기',
      rejectLabel: '예전 방식으로 열기',
      rejectClass: 'p-button-outlined p-button-secondary',
      accept: () => void finishRestore(projectData, true),
      reject: () => void finishRestore(projectData, false),
    })
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

          const projectData = extractProjectMetadata(htmlContent)

          if (!projectData || projectData.modules.length === 0) {
            showError('가져오기 실패', '이 에디터에서 내보낸 파일만 가져올 수 있습니다')
            return
          }

          if (moduleStore.availableModules.length === 0) {
            await moduleStore.loadAvailableModules()
          }

          restoreWithPrompt(projectData)
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
