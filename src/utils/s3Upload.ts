/**
 * 이미지 업로드 API 클라이언트.
 *
 * 서버 계약(첨부받은 S3Upload.html 기준):
 *   POST {VITE_S3_UPLOAD_URL}
 *   Content-Type: multipart/form-data
 *     file      — 업로드할 파일
 *     directory — 저장할 폴더 경로 (예: '/e-dm/2026/vms/')
 *     override  — 'Y'면 같은 이름의 파일을 덮어쓰고, 'N'이면 서버가 이름을 바꿔 새로 저장한다
 *   200 → { savedFileName: '<저장된 파일의 URL>' }
 *   그 외 → { message | Message: '<사유>' }
 *
 * ⚠ 실제 서버와 통신하는 코드는 **이 파일에만** 둔다. 계약이 위와 다른 것으로 밝혀지면
 *   여기만 고치면 되고 UI(ImageUploadField.vue)는 건드리지 않는다.
 *
 * ⚠ 진행률 때문에 fetch가 아니라 XMLHttpRequest를 쓴다 — fetch는 업로드 진행률을 못 읽는다.
 */

/** 업로드 API 주소. 빈 문자열이면 업로드 기능을 감춘다(URL 직접 입력만 남는다). */
const endpoint = (import.meta.env.VITE_S3_UPLOAD_URL ?? '').trim()

/** 응답이 전체 URL이 아닐 때 앞에 붙일 주소 */
const publicBase = (import.meta.env.VITE_S3_PUBLIC_BASE ?? '').trim()

/**
 * 업로드 기능을 쓸 수 있는 상태인지.
 *
 * 서버 CORS 허용이 끝나기 전에 배포하더라도 `VITE_S3_UPLOAD_URL`을 비워두면
 * 업로드 UI가 나타나지 않는다 — 눌러도 실패하는 버튼을 사용자에게 보이지 않기 위함.
 */
export const isUploadEnabled = (): boolean => endpoint !== ''

/**
 * 업로드를 허용할 이미지 형식.
 *
 * ⚠ **SVG는 일부러 뺐다.** SVG는 그림이 아니라 스크립트를 품을 수 있는 문서라,
 *   업로드한 주소를 브라우저에서 직접 열면 그 도메인에서 스크립트가 실행된다(저장형 XSS).
 *   게다가 이메일 클라이언트 상당수가 SVG를 렌더링하지 못해 뉴스레터에서 쓸 일도 없다.
 *   다시 넣어야 한다면 서버가 SVG를 `Content-Disposition: attachment`로 내려주는지 먼저 확인할 것.
 */
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const

/** 확장자만 보고 거르는 폴백 — 브라우저가 MIME을 비워 보내는 경우가 있다 */
export const ALLOWED_IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp']

/** 업로드 허용 최대 크기 (10MB) — 서버 제한이 확인되면 그 값에 맞춘다 */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

/**
 * 업로드를 허용할 HTML 형식 — 'HTML 웹 링크 생성'(AI 도구)에서 쓴다.
 *
 * ⚠ HTML은 올린 주소를 브라우저에서 열면 그 도메인에서 스크립트가 실행된다.
 *   SVG를 막은 것과 같은 성격이지만, 이쪽은 **웹에서 열리는 것 자체가 목적**이라 허용한다.
 *   대신 올리는 사람이 스스로 만든 뉴스레터 문서라는 전제가 있고, 실제 방어선은 서버다.
 */
export const ALLOWED_HTML_MIME = ['text/html'] as const
export const ALLOWED_HTML_EXT = ['html', 'htm']

/** HTML 업로드 허용 최대 크기 (5MB) — 이미지가 다 들어간 뉴스레터도 보통 1MB 안쪽이다 */
export const MAX_HTML_BYTES = 5 * 1024 * 1024

/** 사람이 읽는 용량 표기 */
export const formatBytes = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.max(1, Math.round(bytes / 1024))}KB`

const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase()
}

/**
 * 업로드 전에 파일을 검사한다.
 * @returns 문제가 있으면 사용자에게 보여줄 문구, 없으면 null
 */
export function validateImageFile(file: File): string | null {
  const ext = extensionOf(file.name)
  // 확장자를 바꿔 놓아도 MIME이 SVG면 막는다 — 아래 '둘 중 하나만 맞으면 통과'를 우회하지 못하게.
  // ⚠ 이것만으로 SVG를 다 걸러낼 수는 없다(확장자·MIME 모두 png로 위장하면 통과한다).
  //   클라이언트 검사는 실수를 줄이는 장치일 뿐이고, 실제 방어선은 서버의 내용 검사다.
  if (file.type === 'image/svg+xml' || ext === 'svg') {
    return 'SVG는 올릴 수 없어요. PNG나 JPG로 변환해 주세요.'
  }
  const mimeOk = (ALLOWED_IMAGE_MIME as readonly string[]).includes(file.type)
  const extOk = ALLOWED_IMAGE_EXT.includes(ext)
  // MIME이 비어 오는 경우가 있어 둘 중 하나만 맞아도 통과시킨다
  if (!mimeOk && !extOk) {
    return `이미지 파일만 올릴 수 있어요 (${ALLOWED_IMAGE_EXT.join(', ')})`
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `파일이 너무 커요 — ${formatBytes(file.size)} (최대 ${formatBytes(MAX_IMAGE_BYTES)})`
  }
  if (file.size === 0) {
    return '빈 파일이에요'
  }
  return null
}

/**
 * HTML 파일을 업로드 전에 검사한다.
 * @returns 문제가 있으면 사용자에게 보여줄 문구, 없으면 null
 */
export function validateHtmlFile(file: File): string | null {
  const ext = extensionOf(file.name)
  const mimeOk = (ALLOWED_HTML_MIME as readonly string[]).includes(file.type)
  const extOk = ALLOWED_HTML_EXT.includes(ext)
  // 이미지와 같은 이유로 둘 중 하나만 맞아도 통과시킨다(브라우저가 MIME을 비워 보내기도 한다)
  if (!mimeOk && !extOk) {
    return `HTML 파일만 올릴 수 있어요 (${ALLOWED_HTML_EXT.join(', ')})`
  }
  if (file.size > MAX_HTML_BYTES) {
    return `파일이 너무 커요 — ${formatBytes(file.size)} (최대 ${formatBytes(MAX_HTML_BYTES)})`
  }
  if (file.size === 0) {
    return '빈 파일이에요'
  }
  return null
}

/** 이름에 쓸 글자가 하나도 안 남았을 때 대신 쓰는 이름 */
const FALLBACK_BASE = 'image'

/**
 * 파일 이름에서 서버·URL에 안전한 부분만 남긴다.
 * 경로 구분자·공백·한글 등은 '-'로 바꾸고, 남는 게 없으면 fallback('image').
 */
function sanitizeBaseName(originalName: string, fallback = FALLBACK_BASE): string {
  const ext = extensionOf(originalName)
  const base = (ext ? originalName.slice(0, -(ext.length + 1)) : originalName)
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return base || fallback
}

/**
 * 업로드용 파일 이름을 만든다.
 *
 * @param unique true면 `원본이름_20260820_143052.png`처럼 날짜·시각을 붙여 **항상 새 파일**이 되게 하고,
 *               false면 `원본이름.png` 그대로 둬 같은 이름이면 **서버가 덮어쓰게** 한다
 *               (덮어쓰기 여부는 form의 `override` 값이 정하고, 이름은 그 선택과 짝이 맞아야 한다 —
 *                이름에 매번 시각을 붙이면 겹칠 일이 없어 덮어쓰기가 무의미해진다).
 */
export function buildUploadFileName(
  originalName: string,
  now: Date = new Date(),
  unique = true,
  fallbackBase = FALLBACK_BASE,
): string {
  const ext = extensionOf(originalName)
  const base = sanitizeBaseName(originalName, fallbackBase)
  const suffix = ext ? `.${ext}` : ''
  if (!unique) return `${base}${suffix}`
  const p = (n: number) => String(n).padStart(2, '0')
  const stamp =
    `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}` +
    `_${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`
  return `${base}_${stamp}${suffix}`
}

/** 회차를 입력하지 않았을 때 사용자에게 보여줄 문구 — 알림과 필드 오류에서 함께 쓴다 */
export const MISSING_VOLUME_MESSAGE =
  '뉴스레터 회차를 먼저 입력해 주세요. 왼쪽 "전체 스타일" 메뉴에서 회차 숫자를 고르면 회차별 폴더에 정리됩니다.'

/**
 * 회차 표기의 고정 접두사. 화면에서는 이 글자를 고칠 수 없고 숫자만 오르내린다.
 * (저장 값은 예전과 같은 'vol01' 형태 그대로라 기존 저장 파일도 그대로 열린다)
 */
export const VOLUME_PREFIX = 'vol'
export const MIN_VOLUME = 1
/** 세 자리까지 — 'vol100'도 폴더명으로 문제없다 */
export const MAX_VOLUME = 999

/**
 * 회차 표기에서 숫자만 뽑는다 — 'vol01' → 1, 'Vol 12' → 12, '3' → 3.
 * 숫자가 없거나 0이면 **null**(아직 회차를 안 정한 상태).
 */
export function parseVolumeNumber(volume?: string | null): number | null {
  const digits = (volume ?? '').replace(/\D/g, '')
  if (!digits) return null
  const n = Number(digits)
  if (!Number.isFinite(n) || n < MIN_VOLUME) return null
  return Math.min(n, MAX_VOLUME)
}

/** 숫자를 저장·폴더용 표기로 — 1 → 'vol01', 12 → 'vol12', 100 → 'vol100' */
export function formatVolume(n: number): string {
  const clamped = Math.min(Math.max(Math.floor(n) || MIN_VOLUME, MIN_VOLUME), MAX_VOLUME)
  return `${VOLUME_PREFIX}${String(clamped).padStart(2, '0')}`
}

/**
 * 회차 표기를 폴더명으로 다듬는다 — 'Vol 01' · 'vol-01' → 'vol01'.
 * 폴더명으로 쓸 수 없는 문자를 걸러내되, 사용자가 적은 표기를 최대한 살린다.
 */
export function normalizeVolume(volume?: string | null): string {
  return (volume ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 30)
}

/**
 * 빈 문서로 만든 뉴스레터의 이미지를 모으는 자리.
 *
 * 전시회 폴더 옆에 나란히 두되 이름으로 성격이 드러나게 한다 — S3에서 `bfs/`·`kadex/` 사이에
 * `blank/`이 보이면 '전시회가 아직 안 정해진 것들'임을 바로 알 수 있다.
 */
export const BLANK_FOLDER = 'blank'

/** 폴더 한 조각을 S3 키에 안전하게 — 소문자·숫자·하이픈·밑줄만 남긴다 */
const folderSegment = (value?: string | null): string =>
  (value ?? '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '')

/**
 * 업로드 폴더의 전시회 단계를 정한다.
 *
 * - 템플릿으로 시작했으면 그 **템플릿 id**가 곧 전시회 폴더다(S3 폴더명과 이미 통일돼 있다).
 * - 빈 문서로 시작했으면 전시회를 알 수 없으므로 `blank/{팀}`에 모은다.
 *   팀까지 나누는 이유는, 한 자리에 다 쌓으면 서로 다른 뉴스레터의 `main_visual.png`가
 *   같은 회차 폴더에서 만나 말없이 덮어써지기 때문이다(`override=Y`).
 *
 * @returns 팀도 템플릿도 없으면 빈 문자열 — 호출한 쪽이 업로드를 막는다.
 */
export function uploadFolderOf(templateId?: string | null, teamId?: string | null): string {
  const template = folderSegment(templateId)
  if (template) return template
  const team = folderSegment(teamId)
  return team ? `${BLANK_FOLDER}/${team}` : ''
}

/**
 * 업로드 폴더 경로를 만든다 — `/e-dm/{연도}/{전시회 폴더}/{회차}/`.
 *
 * @param folder `uploadFolderOf`가 정한 폴더. 빈 문서면 `blank/{팀}`처럼 두 단계일 수 있다.
 * @returns 폴더나 회차 중 하나라도 비어 있으면 **null** — 어디에 넣을지 정할 수 없으므로
 *          경로를 지어내지 않고 호출한 쪽이 업로드를 막게 한다.
 */
export function buildUploadDirectory(
  folder?: string | null,
  volume?: string | null,
  now: Date = new Date(),
): string | null {
  const vol = normalizeVolume(volume)
  const dir = (folder ?? '')
    .split('/')
    .map(folderSegment)
    .filter(Boolean)
    .join('/')
  if (!vol || !dir) return null
  return `/e-dm/${now.getFullYear()}/${dir}/${vol}/`
}

/**
 * 화면에 보여줄 저장 위치 — 앞의 `/e-dm/{연도}/`를 뗀 나머지(`hobanexpo/vol99/`).
 *
 * 이 앞부분은 모든 업로드가 똑같이 쓰는 고정 경로라 매번 읽어봐야 알 수 있는 게 없다.
 * **표시만 줄이는 것이고, 실제로 올리는 경로는 buildUploadDirectory가 만든 값 그대로다.**
 */
export function displayUploadDirectory(directory?: string | null): string {
  return (directory ?? '').replace(/^\/e-dm\/\d{4}\//, '')
}

/** 서버가 돌려준 값을 화면에 바로 쓸 수 있는 URL로 정리한다 */
function toPublicUrl(savedFileName: string): string {
  const value = savedFileName.trim()
  if (/^https?:\/\//i.test(value) || value.startsWith('//') || value.startsWith('data:')) {
    return value
  }
  if (!publicBase) return value
  return `${publicBase.replace(/\/+$/, '')}/${value.replace(/^\/+/, '')}`
}

/**
 * 서버가 실패를 알리는 방식이 여러 가지라 순서대로 찾아본다.
 *
 * ⚠ **본문이 빈 5xx**는 업로드 서버가 아니라 그 앞단이 막힌 경우가 대부분이다.
 *   개발 중이라면 Vite 프록시가 대상 서버에 닿지 못한 것이고(목 서버 미실행이 가장 흔하다),
 *   그냥 'HTTP 500'이라고만 하면 원인을 짐작할 수 없어 별도 문구를 준다.
 */
export function extractErrorMessage(responseText: string, status: number, isDev = false): string {
  try {
    const parsed = JSON.parse(responseText) as Record<string, unknown>
    const message = parsed.message ?? parsed.Message ?? parsed.error
    if (typeof message === 'string' && message.trim()) return message.trim()
  } catch {
    // JSON이 아니면 아래에서 원문을 그대로 쓴다
  }
  const raw = responseText.trim()
  if (raw) return raw.length > 200 ? `${raw.slice(0, 200)}…` : raw

  if (status >= 500) {
    return isDev
      ? '업로드 서버에 닿지 못했어요. 목 서버가 켜져 있는지 확인해 주세요 — 터미널에서 `npm run mock:upload`.'
      : `업로드 서버에 문제가 있어요 (HTTP ${status}). 잠시 후 다시 시도해 주세요.`
  }
  return `업로드에 실패했어요 (HTTP ${status})`
}

export interface UploadOptions {
  /** 0~100 진행률 */
  onProgress?: (percent: number) => void
  /** 취소용 — abort()를 호출하면 요청이 끊긴다 */
  signal?: AbortSignal
  /**
   * 같은 이름의 파일이 이미 있을 때 덮어쓸지 여부. 기본값 true(덮어쓴다).
   *
   * true면 파일 이름을 원본 그대로 보내고 `override=Y`를,
   * false면 이름에 날짜·시각을 붙여 겹치지 않게 만든 뒤 `override=N`을 보낸다.
   */
  overwrite?: boolean
  /** 이름에 쓸 글자가 하나도 안 남았을 때(예: '뉴스레터.html') 대신 쓸 이름 */
  fallbackBaseName?: string
}

export interface UploadResult {
  /** 화면·모듈 속성에 넣을 이미지 URL */
  url: string
  /** 서버 원본 응답 — 계약이 예상과 다를 때 확인용 */
  raw: unknown
}

/** 업로드 실패를 사용자 문구와 함께 전달한다 */
export class UploadError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'UploadError'
  }
}

/**
 * 이미지 한 장을 업로드하고 접근 가능한 URL을 돌려준다.
 * @param directory 저장할 폴더 (예: `/e-dm/2026/vms/`)
 */
export function uploadImage(
  file: File,
  directory: string,
  options: UploadOptions = {},
): Promise<UploadResult> {
  const invalid = validateImageFile(file)
  if (invalid) return Promise.reject(new UploadError(invalid))
  return postUpload(file, directory, options)
}

/**
 * HTML 문서 하나를 업로드하고 웹에서 열 수 있는 URL을 돌려준다 (AI 도구 → HTML 웹 링크 생성).
 * 서버 계약·전송 방식은 이미지와 완전히 같고, 검사 규칙만 다르다.
 */
export function uploadHtml(
  file: File,
  directory: string,
  options: UploadOptions = {},
): Promise<UploadResult> {
  const invalid = validateHtmlFile(file)
  if (invalid) return Promise.reject(new UploadError(invalid))
  return postUpload(file, directory, { fallbackBaseName: 'newsletter', ...options })
}

/** 실제 전송 — 검사를 통과한 파일을 서버 계약대로 올린다 (이미지·HTML 공용) */
function postUpload(
  file: File,
  directory: string,
  options: UploadOptions = {},
): Promise<UploadResult> {
  if (!endpoint) {
    return Promise.reject(new UploadError('업로드 주소가 설정되지 않았어요'))
  }

  const overwrite = options.overwrite ?? true

  return new Promise<UploadResult>((resolve, reject) => {
    const form = new FormData()
    // 원본 File을 그대로 넣으면 파일명을 바꿀 수 없어 세 번째 인자로 이름을 지정한다.
    // 덮어쓸 때는 이름을 원본 그대로 둬야 같은 이름끼리 만난다(위 buildUploadFileName 주석 참고).
    form.append(
      'file',
      file,
      buildUploadFileName(file.name, new Date(), !overwrite, options.fallbackBaseName),
    )
    form.append('directory', directory)
    form.append('override', overwrite ? 'Y' : 'N')

    const xhr = new XMLHttpRequest()
    xhr.open('POST', endpoint, true)

    const onAbort = () => xhr.abort()
    options.signal?.addEventListener('abort', onAbort, { once: true })
    const cleanup = () => options.signal?.removeEventListener('abort', onAbort)

    if (options.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          options.onProgress?.(Math.round((e.loaded / e.total) * 100))
        }
      }
    }

    xhr.onload = () => {
      cleanup()
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(
          new UploadError(
            extractErrorMessage(xhr.responseText, xhr.status, import.meta.env.DEV),
            xhr.status,
          ),
        )
        return
      }
      let parsed: unknown
      try {
        parsed = JSON.parse(xhr.responseText)
      } catch {
        reject(new UploadError('서버 응답을 이해하지 못했어요', xhr.status))
        return
      }
      const saved = (parsed as { savedFileName?: unknown } | null)?.savedFileName
      if (typeof saved !== 'string' || !saved.trim()) {
        reject(new UploadError('서버가 이미지 주소를 돌려주지 않았어요', xhr.status))
        return
      }
      resolve({ url: toPublicUrl(saved), raw: parsed })
    }

    xhr.onerror = () => {
      cleanup()
      // status 0 = 네트워크 오류이거나 **CORS로 응답이 차단된** 경우.
      // 후자라면 서버에는 파일이 올라갔는데 브라우저가 응답을 안 넘겨준 상태다.
      reject(
        new UploadError(
          '서버에 연결하지 못했어요. 네트워크 상태와 업로드 주소를 확인해 주세요.',
        ),
      )
    }

    xhr.onabort = () => {
      cleanup()
      reject(new UploadError('업로드를 취소했어요'))
    }

    xhr.send(form)
  })
}
