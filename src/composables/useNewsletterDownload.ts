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
import { track } from '@/analytics/umami'

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
    name: string
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>
      close: () => Promise<void>
    }>
  }>
}

interface TriggerResult {
  result: 'saved' | 'triggered' | 'cancelled'
  /** 실제로 저장한 이름 — 저장 창에서 바꿨으면 바꾼 이름 */
  savedName: string
  /** 저장 창으로 저장하다 실패해 일반 다운로드로 넘어갔으면 그 이유(오류 이름) */
  fallbackReason?: string
}

/**
 * 파일 저장 트리거
 * - File System Access API 지원 시: 저장 창을 띄우고 실제 디스크 쓰기 성공/취소를 감지
 * - 미지원 시, 또는 **저장 창 경로가 실패하면**: 일반(anchor) 다운로드로 넘어간다
 *
 * 저장 창 경로가 실패해도 넘어가는 이유(2026-11): Chrome 157로 올라간 일부 랩탑에서만 저장 창으로
 * 고른 파일이 디스크에 남지 않았다(같은 파일·같은 계정이 다른 랩탑에서는 정상, 시크릿 창·캐시 삭제로도 그대로).
 * 저장 창 경로는 임시 파일(.crswap)에 쓴 뒤 이름을 바꾸는데, 이 단계는 브라우저 버전·회사 정책·보안 프로그램·
 * OneDrive 동기화에 막힐 수 있다. 일반 다운로드는 이런 것에 덜 걸리므로, 원인이 무엇이든 파일은 남게 한다.
 * 실패는 두 가지로 온다 — 오류가 나는 경우(catch)와 **아무 반응 없이 멈추는 경우**(아래 시간 재기).
 */
/** 저장 창을 닫고 화면으로 돌아온 뒤, 고른 파일을 돌려받기까지 기다리는 시간 */
const PICKER_STALL_MS = 4000
/** 파일을 고른 뒤 쓰기(열기·쓰기·마무리)가 끝나기까지 기다리는 시간 — HTML 한 장이라 정상이면 1초도 안 걸린다 */
const WRITE_STALL_MS = 8000

/** 오류 없이 멈춰 버린 경우 — name 이 안내·집계의 사유가 된다 */
class SaveStalledError extends Error {
  constructor(stage: 'PickerStalled' | 'WriteStalled') {
    super(stage)
    this.name = stage
  }
}

/**
 * 저장 창을 띄운다. 창이 닫혀 화면으로 돌아왔는데도(창 focus) 결과가 오지 않으면 멈춘 것으로 본다.
 * 사용자가 창에서 오래 고르는 동안에는 재지 않는다 — 창이 떠 있는 동안 화면은 focus 를 받지 않는다.
 */
function pickWithStallGuard<T>(open: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const onFocus = () => {
      clearTimeout(timer)
      timer = setTimeout(() => reject(new SaveStalledError('PickerStalled')), PICKER_STALL_MS)
    }
    const onBlur = () => clearTimeout(timer)
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    open()
      .then(resolve, reject)
      .finally(() => {
        clearTimeout(timer)
        window.removeEventListener('focus', onFocus)
        window.removeEventListener('blur', onBlur)
      })
  })
}

/** 쓰기 단계가 정해진 시간 안에 끝나지 않으면 멈춘 것으로 본다 */
function withWriteStallGuard<T>(work: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new SaveStalledError('WriteStalled')), WRITE_STALL_MS)
    work.then(resolve, reject).finally(() => clearTimeout(timer))
  })
}

async function triggerDownload(content: string, filename: string): Promise<TriggerResult> {
  const blob = new Blob([content], { type: 'text/html; charset=utf-8' })

  const showSaveFilePicker = (window as unknown as SaveFilePickerWindow).showSaveFilePicker
  let fallbackReason: string | undefined
  if (typeof showSaveFilePicker === 'function') {
    try {
      const handle = await pickWithStallGuard(() =>
        showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'HTML 파일', accept: { 'text/html': ['.html'] } }],
        }),
      )
      // 현장 확인(2026-11-13): 문제 PC에서는 저장 창에서 '저장'을 누른 뒤 **오류도 안내도 없이 멈췄다**.
      // 오류가 나지 않으니 catch 만으로는 넘어가지 못한다 — 시간을 재서 멈춘 것을 알아챈다.
      await withWriteStallGuard(
        (async () => {
          const writable = await handle.createWritable()
          await writable.write(blob)
          await writable.close()
        })(),
      )
      // 저장 창에서 이름을 바꿨으면 바꾼 이름으로 안내한다 — 확장자를 지워도 Chrome이 .html 을 붙여 준다
      return { result: 'saved', savedName: handle.name || filename }
    } catch (err) {
      // 사용자가 대화상자를 취소한 경우는 실패가 아님
      if (err instanceof DOMException && err.name === 'AbortError') return { result: 'cancelled', savedName: filename }
      // 그 밖의 실패는 일반 다운로드로 넘어간다 — 원인은 안내와 집계에 남긴다
      fallbackReason = err instanceof Error ? err.name || 'Error' : 'Unknown'
      console.warn('[download] 저장 창으로 저장하지 못해 일반 다운로드로 받습니다', err)
    }
  }

  // 일반 다운로드 (쓰기 결과 감지 불가) — revoke를 지연시켜 큰 파일 조기 취소 방지
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return { result: 'triggered', savedName: filename, fallbackReason }
}

export function useNewsletterDownload() {
  const toast = useToast()
  const moduleStore = useModuleStore()
  const editorStore = useEditorStore()
  const { buildDocument } = useNewsletterDocument()

  /**
   * 이미 만든 HTML 문서를 주어진 이름으로 내려받는다 — 템플릿 저장용 내려받기처럼
   * 지금 작업물이 아닌 것을 저장할 때. 안내(토스트)는 호출한 쪽이 띄운다.
   */
  const saveHtmlFile = async (content: string, filename: string) =>
    (await triggerDownload(content, filename)).result

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

      const { result, savedName, fallbackReason } = await triggerDownload(fullHtmlDocument, filename)
      // 사용자가 저장 대화상자를 취소 → 저장표시·토스트 없이 종료(작업 상태 유지)
      if (result === 'cancelled') return 'cancelled'

      // 저장용만 '저장됨'으로 표시 (발송용은 재편집 불가 → dirty 상태 유지)
      if (includeMetadata) moduleStore.markAsSaved()

      const kindLabel = includeMetadata
        ? `${savedName} (저장용 · 다시 불러와 편집 가능)`
        : `${savedName} (발송용 · 메타데이터 제거됨)`
      if (result === 'saved') {
        toast.add({ severity: 'success', summary: '저장 완료', detail: kindLabel, life: 3000 })
      } else if (fallbackReason) {
        // 저장 창 경로가 실패해 일반 다운로드로 받았다 — 어디에 남았는지와 이유를 알려 준다(문의 때 캡처 한 장으로 원인이 보이게)
        track('download_fallback', { kind: includeMetadata ? 'edit' : 'send', reason: fallbackReason })
        toast.add({
          severity: 'warn',
          summary: '다운로드 폴더에 받았어요',
          detail: `저장 창으로 저장하지 못해 ${kindLabel} 을(를) 다운로드 폴더에 받았어요. 브라우저 다운로드 목록을 확인하세요. (사유: ${fallbackReason})`,
          life: 8000,
        })
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

  return { downloadHtml, saveHtmlFile }
}
