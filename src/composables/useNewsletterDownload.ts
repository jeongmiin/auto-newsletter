/**
 * 지금 작업물을 HTML 파일로 내 PC에 내려받는다 — 헤더의 '저장용/발송용 다운로드'와
 * 레일 '새 작업'의 "저장용 파일 받고 새로 시작"이 같은 길을 쓴다.
 *
 * 결과를 돌려주는 이유: '새 작업'은 파일이 실제로 남았을 때만 작업을 비워야 한다.
 * 저장 대화상자를 취소했거나 실패했으면 비우지 않는다(백업이 없는 채로 날리지 않게).
 */
import { ref } from 'vue'
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
  | 'busy' // 앞서 누른 내려받기가 아직 끝나지 않았다 — 아무것도 하지 않았다

/** showSaveFilePicker 최소 타입 (lib.dom 버전 차이 대응) */
interface SaveFileHandle {
  name: string
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>
    close: () => Promise<void>
  }>
}
interface SaveFilePickerWindow {
  showSaveFilePicker?: (opts?: {
    suggestedName?: string
    types?: Array<{ description?: string; accept: Record<string, string[]> }>
  }) => Promise<SaveFileHandle>
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
 * 실패는 세 가지로 온다 — 오류가 나는 경우(catch), **아무 반응 없이 멈추는 경우**(아래 시간 재기),
 * 그리고 **'취소'인 척 오는 경우**: 회사 정책·보안 프로그램이 저장 창이나 쓰기를 막으면 브라우저는
 * 사용자가 취소했을 때와 같은 AbortError 를 준다. 이걸 취소로 읽으면 파일도 안내도 없이 끝난다.
 */
/** 저장 창을 닫고 화면으로 돌아온 뒤, 고른 파일을 돌려받기까지 기다리는 시간 */
const PICKER_STALL_MS = 4000
/** 파일을 고른 뒤 쓰기(열기·쓰기·마무리)가 끝나기까지 기다리는 시간 — HTML 한 장이라 정상이면 1초도 안 걸린다 */
const WRITE_STALL_MS = 8000
/** 저장 창을 불렀는데 창이 뜬 흔적(화면 blur)도 결과도 없이 이만큼 지나면 창이 뜨지 않은 것으로 본다 */
const PICKER_NOT_SHOWN_MS = 5000
/** 창이 뜬 흔적 없이 이 시간 안에 온 '취소'는 사람이 누른 것이 아니다 — 창이 막힌 것 */
const BLOCKED_ABORT_MS = 1000

type SaveFailStage =
  | 'PickerStalled' // 저장 창을 닫았는데 결과가 오지 않음
  | 'PickerNotShown' // 저장 창이 뜨지 않고 결과도 오지 않음
  | 'PickerBlocked' // 저장 창이 뜨지 않은 채 곧바로 '취소'가 옴
  | 'WriteStalled' // 쓰기가 끝나지 않음
  | 'WriteAborted' // 쓰기 단계에서 '취소'가 옴(사용자는 이미 '저장'을 눌렀다 — 막힌 것)

/** 오류 없이 멈췄거나 취소인 척 막힌 경우 — name 이 안내·집계의 사유가 된다 */
class SaveStalledError extends Error {
  constructor(stage: SaveFailStage) {
    super(stage)
    this.name = stage
  }
}

const isAbortError = (err: unknown): boolean => err instanceof DOMException && err.name === 'AbortError'

/**
 * 저장 창을 띄운다.
 * - 창이 닫혀 화면으로 돌아왔는데도(창 focus) 결과가 오지 않으면 멈춘 것으로 본다.
 *   사용자가 창에서 오래 고르는 동안에는 재지 않는다 — 창이 떠 있는 동안 화면은 focus 를 받지 않는다.
 * - 창이 뜬 흔적(화면 blur)이 없는데 곧바로 '취소'가 오면 막힌 것으로 본다(PickerBlocked).
 *   둘 다 만족할 때만이다 — 흔적을 못 잡았더라도 1초 넘게 지난 취소는 사용자의 취소로 둔다.
 *   (취소를 막힘으로 잘못 읽으면 취소했는데 파일이 받아지고, '새 작업'은 작업을 비운다)
 * - 창이 뜬 흔적도 결과도 없이 시간이 지나면 창이 뜨지 않은 것으로 본다(PickerNotShown).
 */
function pickWithStallGuard<T>(open: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const startedAt = Date.now()
    let dialogSeen = false
    let stallTimer: ReturnType<typeof setTimeout> | undefined
    const notShownTimer = setTimeout(() => {
      if (!dialogSeen && document.hasFocus()) reject(new SaveStalledError('PickerNotShown'))
    }, PICKER_NOT_SHOWN_MS)
    const onFocus = () => {
      clearTimeout(stallTimer)
      stallTimer = setTimeout(() => reject(new SaveStalledError('PickerStalled')), PICKER_STALL_MS)
    }
    const onBlur = () => {
      dialogSeen = true
      clearTimeout(stallTimer)
    }
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    // open() 이 곧바로 던지는 경우(동기 예외)도 같은 길로 받는다
    Promise.resolve()
      .then(open)
      .then(resolve, (err) => {
        const blocked = isAbortError(err) && !dialogSeen && Date.now() - startedAt < BLOCKED_ABORT_MS
        reject(blocked ? new SaveStalledError('PickerBlocked') : err)
      })
      .finally(() => {
        clearTimeout(stallTimer)
        clearTimeout(notShownTimer)
        window.removeEventListener('focus', onFocus)
        window.removeEventListener('blur', onBlur)
      })
  })
}

/**
 * 저장 창이 **이 PC에서** 통하지 않는다는 기억 — 다음부터는 기다리지 않고 바로 일반 다운로드로 받는다.
 * 안 그러면 그런 PC는 내려받을 때마다 몇 초씩 멈춘 뒤에야 받아진다.
 * 환경 탓인 사유만 기억하고(폴더 권한 같은 한 번짜리 오류는 제외), 브라우저·정책이 바뀌면 다시 저장 창을
 * 쓸 수 있게 일주일 뒤에는 잊는다.
 */
const SKIP_PICKER_KEY = 'auto-newsletter:download-skip-picker'
const SKIP_PICKER_MS = 7 * 24 * 60 * 60 * 1000
const ENVIRONMENT_REASONS: ReadonlySet<string> = new Set<SaveFailStage>([
  'PickerStalled',
  'PickerNotShown',
  'PickerBlocked',
  'WriteStalled',
  'WriteAborted',
])

function shouldSkipPicker(): boolean {
  try {
    const until = Number(localStorage.getItem(SKIP_PICKER_KEY))
    return Number.isFinite(until) && until > Date.now()
  } catch {
    return false
  }
}

function rememberPickerFailure(reason: string): void {
  if (!ENVIRONMENT_REASONS.has(reason)) return
  try {
    localStorage.setItem(SKIP_PICKER_KEY, String(Date.now() + SKIP_PICKER_MS))
  } catch {
    // 저장소를 못 쓰는 창(시크릿 등) — 기억만 못 할 뿐 내려받기는 그대로 된다
  }
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
  if (typeof showSaveFilePicker === 'function' && !shouldSkipPicker()) {
    try {
      // 1) 저장 창 — 여기서 오는 AbortError 만 '사용자의 취소'다(막혀서 온 것은 guard 가 걸러 준다)
      let handle: SaveFileHandle
      try {
        handle = await pickWithStallGuard(() =>
          showSaveFilePicker({
            suggestedName: filename,
            types: [{ description: 'HTML 파일', accept: { 'text/html': ['.html'] } }],
          }),
        )
      } catch (err) {
        if (isAbortError(err)) return { result: 'cancelled', savedName: filename }
        throw err
      }
      // 2) 쓰기 — 사용자는 이미 '저장'을 눌렀다. 여기서 오는 AbortError 는 취소가 아니라
      // 브라우저·보안 정책이 쓰기를 막은 것이다(취소로 읽으면 파일도 안내도 없이 끝난다).
      // 현장 확인(2026-11-13): 문제 PC에서는 저장 창에서 '저장'을 누른 뒤 **오류도 안내도 없이 멈췄다**.
      // 오류가 나지 않으니 catch 만으로는 넘어가지 못한다 — 시간을 재서 멈춘 것을 알아챈다.
      try {
        await withWriteStallGuard(
          (async () => {
            const writable = await handle.createWritable()
            await writable.write(blob)
            await writable.close()
          })(),
        )
      } catch (err) {
        throw isAbortError(err) ? new SaveStalledError('WriteAborted') : err
      }
      // 저장 창에서 이름을 바꿨으면 바꾼 이름으로 안내한다 — 확장자를 지워도 Chrome이 .html 을 붙여 준다
      return { result: 'saved', savedName: handle.name || filename }
    } catch (err) {
      // 실패는 일반 다운로드로 넘어간다 — 원인은 안내와 집계에 남긴다
      fallbackReason = err instanceof Error ? err.name || 'Error' : 'Unknown'
      rememberPickerFailure(fallbackReason)
      console.warn('[download] 저장 창으로 저장하지 못해 일반 다운로드로 받습니다', err)
    }
  }

  // 일반 다운로드 (쓰기 결과 감지 불가).
  // 주소는 넉넉히 살려 둔다 — '받을 위치를 매번 묻기' 설정이나 보안 검사가 있는 PC는 누른 뒤
  // 한참 있다가 파일을 읽는다. 일찍 지우면 받는 도중에 끊긴다(HTML 한 장이라 메모리 부담은 없다).
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
  return { result: 'triggered', savedName: filename, fallbackReason }
}

/**
 * 내려받기가 진행 중인지 — 헤더와 레일 '새 작업'이 **같은 값**을 본다(그래서 함수 밖에 둔다).
 * 버튼이 이 값으로 '받는 중…'을 보여 주고, 진행 중에 또 누른 것은 무시한다. 저장 창이 떠 있는데
 * 다시 부르면 브라우저가 거부해, 창이 떠 있는 채로 파일이 따로 받아진다.
 */
const isDownloading = ref(false)

/** 파일 만들기(모듈 템플릿 받기 + 조립)가 이 시간 안에 끝나지 않으면 실패로 알린다 — 끝없이 기다리지 않는다 */
const BUILD_TIMEOUT_MS = 20000

function withBuildTimeout<T>(work: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error('파일을 만드는 데 너무 오래 걸려 멈췄어요. 네트워크를 확인하고 다시 시도해 주세요.')
      err.name = 'BuildTimeout'
      reject(err)
    }, BUILD_TIMEOUT_MS)
    work.then(resolve, reject).finally(() => clearTimeout(timer))
  })
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

    // 앞서 누른 내려받기가 아직 진행 중 — 겹쳐 돌리지 않는다
    if (isDownloading.value) return 'busy'
    isDownloading.value = true

    // 어디서 실패했는지 — 집계에 남겨 "어느 PC가 어디서 막히는지" 원격으로 본다
    let stage: 'build' | 'save' = 'build'
    try {
      const fullHtmlDocument = await withBuildTimeout(buildDocument(includeMetadata))
      stage = 'save'
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
      console.error('[download] 내려받지 못했습니다', error)
      track('download_failed', {
        kind: includeMetadata ? 'edit' : 'send',
        stage,
        reason: error instanceof Error ? error.name || 'Error' : 'Unknown',
      })
      toast.add({
        severity: 'error',
        summary: '저장 실패',
        detail:
          error instanceof Error ? error.message : '디스크 공간 부족·권한 등으로 저장하지 못했습니다',
        life: 8000,
      })
      return 'failed'
    } finally {
      isDownloading.value = false
    }
  }

  return { downloadHtml, saveHtmlFile, isDownloading }
}
