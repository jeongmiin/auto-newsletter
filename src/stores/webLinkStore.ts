/**
 * HTML 웹 링크 상태 — AI 도구의 '웹 링크 생성' 화면과 캔버스 오른쪽 아래 리마인드 팝업이 함께 쓴다.
 *
 * 컴포넌트에 두지 않는 이유: 레일 메뉴를 옮기면 좌측 패널이 통째로 내려간다. 그러면
 * '링크를 만든 뒤 내용이 바뀌었다'는 사실도 같이 사라지는데, **정작 그걸 알려야 할 때는
 * AI 도구 밖에서 편집하는 동안**이다. 링크를 만든 사람은 보통 다른 메뉴로 옮겨 가 내용을
 * 고치고, 링크에 반영해야 한다는 걸 잊는다 — 그러면 받는 사람은 옛 내용을 본다.
 * (번역 결과도 같은 이유로 translationStore에 있다)
 *
 * 폴더를 읽는 것(loadExisting)은 AI 도구를 펼칠 때만 한다. 새로고침하면 작업물 자체가
 * 사라지므로(메모리에만 있다) '반영할 내용'도 함께 없어져, 들어오자마자 폴더를 뒤질 이유가 없다.
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ToastMessageOptions } from 'primevue/toast'
import { useEditorStore } from '@/stores/editorStore'
import { useModuleStore } from '@/stores/moduleStore'
import { useNewsletterDocument } from '@/composables/useNewsletterDocument'
import { buildDownloadFileName } from '@/utils/projectFile'
import {
  MISSING_VOLUME_MESSAGE,
  UploadError,
  buildUploadDirectory,
  isUploadEnabled,
  savePathLabel,
  uploadHtml,
} from '@/utils/s3Upload'
import { listFolders, objectUrl, toPrefix } from '@/utils/s3Browse'

/** 폴더에 놓인 발송용 파일 = 웹 링크 */
export type WebLinkFile = { url: string; name: string; at: Date | null }

/** `createLink()`가 알려 주는 결과 — 말풍선 문구는 `webLinkToast()`가 만든다 */
export type WebLinkResult =
  | { status: 'created' }
  | { status: 'updated' }
  | { status: 'no-modules' }
  | { status: 'no-volume' }
  | { status: 'failed'; message: string }
  | { status: 'skipped' }

/**
 * 결과를 말풍선 문구로 옮긴다.
 *
 * 스토어가 직접 `useToast()`를 부르지 않는 이유: 이 프로젝트의 스토어에는 그런 선례가 없고,
 * 주입(inject)에 기대면 스토어를 어디서 처음 만드느냐에 따라 조용히 실패할 수 있다.
 * 부르는 쪽(패널·팝업)이 결과만 받아 같은 문구를 쓰게 한다.
 */
export const webLinkToast = (result: WebLinkResult): ToastMessageOptions | null => {
  switch (result.status) {
    case 'created':
      return {
        severity: 'success',
        summary: '웹 링크가 만들어졌어요',
        detail: '링크 복사로 주소를 가져가세요.',
        life: 3000,
      }
    case 'updated':
      return {
        severity: 'success',
        summary: '최신 내용을 반영했어요',
        detail: '주소는 그대로예요.',
        life: 3000,
      }
    case 'no-volume':
      return {
        severity: 'warn',
        summary: '저장할 폴더가 필요해요',
        detail: MISSING_VOLUME_MESSAGE,
        life: 6000,
      }
    default:
      // 모듈 없음·업로드 실패는 화면 안 `errorText`로 알린다(말풍선까지 겹치면 시끄럽다)
      return null
  }
}

/**
 * 내용이 낡았는지 **주기적으로** 살핀다 — 캔버스를 감시(watch)하지 않는다.
 *
 * ⚠ `watch(..., { deep: true })`로 캔버스를 보게 하면 안 된다. 실측(모듈 68개 기준):
 *   - 글자 한 자 칠 때마다 +1.16ms
 *   - **템플릿 불러오기 5.3ms → 50.8ms (10배)**
 * 되돌리기(useHistory)도 같은 감시를 쓰지만, 불러오는 동안에는 `runBulk()`로 멈춰 둔다.
 * 여기에 감시를 하나 더 달면 그 대비가 무의미해진다.
 *
 * 리마인드는 1~2초 늦어도 아무 문제가 없다. 링크가 없으면 비교 자체를 건너뛰므로(아래
 * `refreshContentChanged`) 대부분의 시간에는 값이 0이다.
 */
const CHECK_INTERVAL_MS = 1500

export const useWebLinkStore = defineStore('webLink', () => {
  const editorStore = useEditorStore()
  const moduleStore = useModuleStore()
  // 발송용 내려받기와 **같은 문서**를 만든다 — 링크로 열리는 것과 메일에 싣는 것이 달라지면 안 된다
  const { buildDocument } = useNewsletterDocument()

  /** 업로드 주소가 설정돼 있어 링크를 만들 수 있는지 (빌드 시점에 정해진다) */
  const enabled = isUploadEnabled()

  const existing = ref<WebLinkFile | null>(null)
  /** 폴더를 읽는 중 */
  const checking = ref(false)
  /** 올리는 중 */
  const uploading = ref(false)
  /** 눌러 봐야 아는 문제(폴더 없음·업로드 실패)를 화면에 적는다 */
  const errorText = ref('')
  /** 링크를 만든 뒤 뉴스레터가 바뀌었는지 */
  const contentChanged = ref(false)
  /** AI 도구의 '웹 링크 생성' 화면을 펼쳐 두었는지 — 거기엔 같은 안내가 이미 있다 */
  const toolOpen = ref(false)
  /** 리마인드 팝업을 이번에는 닫아 두었는지 */
  const reminderDismissed = ref(false)

  let uploadController: AbortController | null = null
  let checkController: AbortController | null = null
  let checkTimer: ReturnType<typeof setInterval> | null = null

  /** 올라갈 폴더 — 이미지와 같은 저장 폴더다. 폴더가 정해지지 않았으면 null. */
  const targetDirectory = computed(() =>
    buildUploadDirectory(editorStore.uploadFolder, editorStore.wrapSettings.volume),
  )

  /** 올라갈 파일 이름 — 발송용 내려받기와 같은 규칙 */
  const targetFileName = computed(() =>
    buildDownloadFileName(
      editorStore.currentTemplateId ?? editorStore.blankFolder,
      editorStore.wrapSettings.volume,
      'send',
    ),
  )

  /** 사람이 읽는 저장 위치 — 'gocaf / eng / vol01 /' (헤더·전체 설정과 같은 표기) */
  const savePath = computed(() =>
    savePathLabel(editorStore.uploadFolder, editorStore.wrapSettings.volume),
  )

  /** 생성 일시 — '2026.09.14 오후 1:44' */
  const createdAtLabel = computed(() => {
    const at = existing.value?.at
    if (!at) return '알 수 없음'
    const p = (n: number) => String(n).padStart(2, '0')
    const hour = at.getHours()
    const half = hour < 12 ? '오전' : '오후'
    return (
      `${at.getFullYear()}.${p(at.getMonth() + 1)}.${p(at.getDate())} ` +
      `${half} ${hour % 12 || 12}:${p(at.getMinutes())}`
    )
  })

  /**
   * 캔버스 위에 리마인드 팝업을 띄울지.
   * AI 도구 화면을 펼쳐 두었으면 띄우지 않는다 — 거기엔 같은 안내가 이미 붙어 있다.
   */
  const showReminder = computed(
    () => !!existing.value && contentChanged.value && !toolOpen.value && !reminderDismissed.value,
  )

  const contentSignature = (): string =>
    JSON.stringify({
      m: moduleStore.modules,
      g: moduleStore.groups,
      w: editorStore.wrapSettings,
    })

  /**
   * 링크를 만들거나 폴더에서 찾은 **그때의 뉴스레터 내용**.
   *
   * 이걸 지금 내용과 견줘 '변경되었어요'를 띄운다. 깃발 하나를 세우는 대신 내용을 통째로
   * 견주므로, 고쳤다가 되돌리면 안내도 함께 사라진다.
   *
   * 스토어에 있으니 좌측 패널이 내려갔다 올라와도 기준이 남는다 — 예전에는 이 값을 패널의
   * `<script setup>` 밖(모듈 스코프)에 따로 빼 두어야 했다.
   *
   * ⚠ 앱을 새로 연 뒤 **한 번도 고치지 않은 채** 예전 링크를 찾으면 기준이 없다. 그때는 지금
   * 내용이 링크와 같은지 알 길이 없으므로 안내를 띄우지 않고 그 시점을 기준으로 삼는다
   * (작업 내용은 메모리에만 있어 새로고침하면 어차피 사라진다 — 거짓 안내보다 낫다).
   */
  let linkBaseline: string | null = null
  const markBaseline = (): void => {
    linkBaseline = contentSignature()
    contentChanged.value = false
    reminderDismissed.value = false
    // 링크가 생긴 뒤부터 살피기 시작한다 — 그 전에는 견줄 기준이 없어 돌 이유가 없다.
    // 에디터가 살아 있는 동안 계속 도는 타이머 하나다(1.5초에 한 번, 비교 한 번).
    if (!checkTimer) checkTimer = setInterval(refreshContentChanged, CHECK_INTERVAL_MS)
  }

  const refreshContentChanged = (): void => {
    // 링크가 없으면 견줄 기준도 없다 — 서명을 만들지 않고 빠져나간다(늘 도는 감시라 값이 싸야 한다)
    contentChanged.value = linkBaseline !== null && linkBaseline !== contentSignature()
    // 링크와 내용이 같아졌으면(반영했거나 되돌렸다) 접어 둔 팝업을 다시 쓸 수 있게 편다.
    // 닫자마자 같은 안내가 또 뜨지 않게 하려는 것 — 다시 낡았을 때 한 번 더 알린다.
    // ⚠ 감시(watch)가 아니라 여기서 바로 푼다 — 감시는 다음 틱에 돌아 순서가 흐려진다.
    if (!contentChanged.value) reminderDismissed.value = false
  }

  /**
   * 폴더에 발송용 파일이 있는지 읽는다.
   * 폴더 목록 조회(listFolders)가 폴더마다 발송용 파일을 알아내므로, 한 겹 위를 읽어 이 폴더를 찾는다
   * (폴더 선택 화면의 '발송 완료' 배지와 같은 근거를 쓴다).
   */
  const loadExisting = async (): Promise<void> => {
    checkController?.abort()
    const directory = targetDirectory.value
    if (!directory) {
      existing.value = null
      return
    }
    const prefix = toPrefix(directory) // 'e-dm/2026/newsletterbuilder/arch-plan/hobanexpo/eng/vol01/'
    const parts = prefix.replace(/\/$/, '').split('/')
    const folderName = parts.pop() ?? ''
    const parentPrefix = `${parts.join('/')}/`

    checkController = new AbortController()
    checking.value = true
    try {
      const folders = await listFolders(parentPrefix, checkController.signal)
      const file = folders.find((f) => f.name === folderName)?.sendFile
      existing.value = file
        ? { url: objectUrl(file.key), name: file.name, at: file.lastModified }
        : null
      // 링크를 처음 발견했으면 지금 내용을 기준으로 삼는다(위 linkBaseline 주석 참고)
      if (file && linkBaseline === null) markBaseline()
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      // 읽지 못하면(네트워크·CORS) 없는 것으로 둔다 — 만들기 버튼은 그대로 쓸 수 있다
      existing.value = null
    } finally {
      checking.value = false
    }
  }

  /**
   * 지금 작업물을 발송용 HTML로 만들어 폴더에 올리고 주소를 받는다.
   * 같은 이름으로 덮어쓰므로 몇 번을 눌러도 폴더의 파일과 주소는 하나로 유지된다 —
   * 그래서 두 번째부터는 '최신 내용 반영'이다.
   */
  const createLink = async (): Promise<WebLinkResult> => {
    if (uploading.value) return { status: 'skipped' }
    errorText.value = ''

    if (!moduleStore.modules?.length) {
      errorText.value = '먼저 모듈을 추가해 주세요.'
      return { status: 'no-modules' }
    }

    // 폴더가 정해지지 않았으면 올릴 자리가 없다 — 이미지 업로드와 같은 안내로 멈춘다.
    const directory = targetDirectory.value
    if (!directory) {
      errorText.value = MISSING_VOLUME_MESSAGE
      return { status: 'no-volume' }
    }

    const isUpdate = existing.value !== null
    uploading.value = true
    uploadController = new AbortController()
    try {
      // 메타데이터를 뺀 발송용 — 메일에 실리는 것과 같은 파일이다
      const document = await buildDocument(false)
      const filename = targetFileName.value
      const { url } = await uploadHtml(
        new File([document], filename, { type: 'text/html' }),
        directory,
        { signal: uploadController.signal, overwrite: true },
      )
      existing.value = { url, name: filename, at: new Date() }
      // 방금 올린 내용이 새 기준이다 — '변경되었어요' 안내가 사라진다
      markBaseline()
      return { status: isUpdate ? 'updated' : 'created' }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return { status: 'skipped' }
      const message =
        err instanceof UploadError
          ? err.message
          : '링크를 만드는 중 문제가 생겼어요. 다시 시도해 주세요.'
      errorText.value = message
      return { status: 'failed', message }
    } finally {
      uploading.value = false
      uploadController = null
    }
  }

  /** 팝업의 X — 다시 낡아질 때까지만 접어 둔다(아래 watch가 되돌린다) */
  const dismissReminder = (): void => {
    reminderDismissed.value = true
  }

  return {
    enabled,
    existing,
    checking,
    uploading,
    errorText,
    contentChanged,
    toolOpen,
    showReminder,
    targetDirectory,
    savePath,
    createdAtLabel,
    loadExisting,
    refreshContentChanged,
    createLink,
    dismissReminder,
  }
})
