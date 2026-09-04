/**
 * 지금 작업물을 HTML 파일로 내 PC에 내려받는다 — 헤더의 '저장용/발송용 다운로드'와
 * 레일 '새 작업'의 "저장용 파일 받고 새로 시작"이 같은 길을 쓴다.
 *
 * 결과를 돌려주는 이유: '새 작업'은 파일이 실제로 남았을 때만 작업을 비워야 한다.
 * 저장 대화상자를 취소했거나 실패했으면 비우지 않는다(백업이 없는 채로 날리지 않게).
 */
import { useToast } from 'primevue/usetoast'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { buildDownloadFileName } from '@/utils/projectFile'
import { useNewsletterDocument } from '@/composables/useNewsletterDocument'

export type DownloadResult =
  | 'saved' // File System Access API로 디스크 저장 확인됨
  | 'triggered' // 폴백(anchor) — 브라우저에 다운로드 위임, 실제 쓰기 결과는 앱이 확정 불가
  | 'cancelled' // 사용자가 저장 대화상자를 취소
  | 'empty' // 내려받을 모듈이 없다
  | 'failed' // 디스크·권한 등으로 저장하지 못했다

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
async function triggerDownload(
  content: string,
  filename: string,
): Promise<'saved' | 'triggered' | 'cancelled'> {
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

export function useNewsletterDownload() {
  const toast = useToast()
  const moduleStore = useModuleStore()
  const editorStore = useEditorStore()
  const { buildDocument } = useNewsletterDocument()

  /**
   * HTML 파일 다운로드. 안내(토스트)까지 여기서 띄운다.
   * @param includeMetadata true: 저장용(재편집 메타데이터 포함) / false: 발송용(메타데이터 제거)
   */
  const downloadHtml = async (includeMetadata: boolean): Promise<DownloadResult> => {
    if (!moduleStore.modules?.length) {
      toast.add({ severity: 'warn', summary: '내보내기 불가', detail: '먼저 모듈을 추가해주세요', life: 4000 })
      return 'empty'
    }

    try {
      const fullHtmlDocument = await buildDocument(includeMetadata)
      // 파일 이름은 전시회·폴더로 짓는다 — 어느 뉴스레터의 몇 회차인지가 이름만으로 드러난다
      const filename = buildDownloadFileName(
        editorStore.currentTemplateId ?? editorStore.blankFolder,
        editorStore.wrapSettings.volume,
        includeMetadata ? 'edit' : 'send',
      )

      const result = await triggerDownload(fullHtmlDocument, filename)
      // 사용자가 저장 대화상자를 취소 → 저장표시·토스트 없이 종료(작업 상태 유지)
      if (result === 'cancelled') return 'cancelled'

      // 저장용만 '저장됨'으로 표시 (발송용은 재편집 불가 → dirty 상태 유지)
      if (includeMetadata) moduleStore.markAsSaved()

      const kindLabel = includeMetadata
        ? `${filename} (저장용 · 다시 불러와 편집 가능)`
        : `${filename} (발송용 · 메타데이터 제거됨)`
      if (result === 'saved') {
        toast.add({ severity: 'success', summary: '저장 완료', detail: kindLabel, life: 3000 })
      } else {
        // 폴백 경로 — 앱이 저장 완료를 확정할 수 없으므로 정직하게 안내
        toast.add({
          severity: 'success',
          summary: '다운로드 시작됨',
          detail: `${kindLabel} · 브라우저 다운로드 표시줄을 확인하세요`,
          life: 3000,
        })
      }
      return result
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: '저장 실패',
        detail:
          error instanceof Error ? error.message : '디스크 공간 부족·권한 등으로 저장하지 못했습니다',
        life: 5000,
      })
      return 'failed'
    }
  }

  return { downloadHtml }
}
