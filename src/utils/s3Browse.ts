/**
 * S3 폴더 훑어보기 — 업로드 폴더에 이미 있는 회차 폴더를 읽어 온다.
 *
 * 업로드 API(s3Upload.ts)는 **올리기 전용**이라 목록을 주지 않는다. 대신 버킷이
 * ListObjectsV2를 공개하고 있고 `Access-Control-Allow-Origin: *`까지 열려 있어,
 * 브라우저에서 그대로 부를 수 있다(서버 작업 없이 동작한다).
 *
 *   GET {버킷}/?list-type=2&prefix=e-dm/2026/newsletterbuilder/conv1/police/
 *
 * ⚠ 목록만 읽는다. 폴더를 **만드는** 기능은 없다 — S3에는 빈 폴더라는 게 없고,
 *   첫 파일이 올라가는 순간 경로가 곧 폴더가 된다(FolderSelectView의 '새 폴더' 참고).
 */

/** 버킷 주소 — 이미지 주소에 이미 공개돼 있는 값이라 감출 것이 없다 */
const BUCKET_URL = (
  import.meta.env.VITE_S3_BUCKET_URL ?? 'https://esang-newsletter.s3.ap-northeast-2.amazonaws.com'
)
  .trim()
  .replace(/\/+$/, '')

/** 한 번에 받아올 최대 키 수 (S3 상한) */
const PAGE_SIZE = 1000
/** 이어받기 한도 — 회차 폴더 단위면 한두 장이면 충분하다 */
const MAX_PAGES = 5

/** 폴더 한 칸 — 화면(FolderSelectView)이 그대로 그린다 */
export interface S3Folder {
  /** 폴더 이름 (뒤 슬래시 없음) — 'vol01' */
  name: string
  /** 바로 아래 항목 수 — 파일과 하위 폴더를 합한 값 (폴더 자리를 잡는 0바이트 키는 빼고) */
  itemCount: number
  /**
   * 안에 폴더가 또 있는지 — 있으면 화면에서 고르는 대신 **들어간다**.
   * 저장은 언제나 맨 안쪽 폴더에 하므로, 폴더를 품은 폴더는 고를 대상이 아니다.
   */
  hasChildren: boolean
  /** 가장 최근에 바뀐 파일 시각. 파일이 없으면 null */
  lastModified: Date | null
  /**
   * 그 폴더에 놓인 임시 저장 파일(`…_edit.html`) — 있으면 '이어서 편집'을 띄운다.
   * 여러 개면 가장 최근 것 하나. (헤더의 '임시 저장'이 같은 이름으로 덮어써서 보통 한 개다)
   */
  editFile?: S3FileRef
  /**
   * 그 폴더에 놓인 발송용 파일(`…_send.html`) — 있으면 '이 회차는 이미 나갔다'는 뜻이다.
   * 이어서 편집할 수는 없다(재편집 메타데이터가 빠진 파일이라). 무엇이 나갔는지 열어 볼 수만 있다.
   */
  sendFile?: S3FileRef
}

/** 폴더 안에서 알아본 파일 한 개 */
export interface S3FileRef {
  /** 버킷 기준 전체 키 — 그대로 이어 붙이면 내려받을 주소가 된다 */
  key: string
  /** 파일 이름만 — 'hobanexpo_vol12_edit.html' */
  name: string
  lastModified: Date | null
}

/** 임시 저장 파일인지 — 헤더의 '임시 저장'과 '저장용 내려받기'가 쓰는 이름 규칙(`…_edit.html`) */
const isEditFileName = (name: string): boolean => /_edit\.html?$/i.test(name)
/** 발송용 파일인지 — '발송용 내려받기'와 AI 도구의 웹 링크가 쓰는 이름 규칙(`…_send.html`) */
const isSendFileName = (name: string): boolean => /_send\.html?$/i.test(name)

/** 목록을 읽지 못했을 때 — 화면이 '못 읽었다'와 '비었다'를 구분해 안내한다 */
export class BrowseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BrowseError'
  }
}

/**
 * ListObjectsV2 XML에서 `prefix` 바로 아래 폴더들을 뽑는다.
 *
 * `delimiter`를 쓰지 않고 하위 키를 전부 받아 직접 묶는다 — 폴더마다 개수·수정시각을
 * 보여줘야 하는데, delimiter로 받으면 폴더 이름만 오고 안이 비어 있는지조차 알 수 없다.
 */
export function parseFolderList(xml: string, prefix: string): S3Folder[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) throw new BrowseError('목록을 읽지 못했어요')

  /** 폴더별로 모으는 중간 형태 — 하위 폴더는 이름을 모아 두었다가 마지막에 개수로 바꾼다 */
  interface Bucket {
    files: number
    childDirs: Set<string>
    lastModified: Date | null
    editFile?: S3FileRef
    sendFile?: S3FileRef
  }
  /** 같은 종류의 파일이 여러 개면 가장 최근 것만 남긴다 */
  const keepNewer = (prev: S3FileRef | undefined, next: S3FileRef): S3FileRef =>
    !prev?.lastModified || (next.lastModified && next.lastModified > prev.lastModified) ? next : prev
  const folders = new Map<string, Bucket>()

  for (const node of Array.from(doc.getElementsByTagName('Contents'))) {
    const key = node.getElementsByTagName('Key')[0]?.textContent ?? ''
    if (!key.startsWith(prefix)) continue
    const rest = key.slice(prefix.length)
    const slash = rest.indexOf('/')
    if (slash <= 0) continue // 폴더 자리를 잡는 키('…/')와 바로 아래 파일은 건너뛴다

    const name = rest.slice(0, slash)
    const entry = folders.get(name) ?? { files: 0, childDirs: new Set<string>(), lastModified: null }
    folders.set(name, entry)

    // 폴더 자체를 나타내는 0바이트 키('vol01/')는 항목으로 세지 않는다
    const tail = rest.slice(slash + 1)
    if (!tail) continue

    const raw = node.getElementsByTagName('LastModified')[0]?.textContent
    const at = raw ? new Date(raw) : null
    if (at && !Number.isNaN(at.getTime()) && (!entry.lastModified || at > entry.lastModified)) {
      entry.lastModified = at
    }

    const nextSlash = tail.indexOf('/')
    if (nextSlash >= 0) {
      // 'eng/vol01/…' — 바로 아래 폴더 이름만 모은다(그 안의 파일까지 세지는 않는다)
      entry.childDirs.add(tail.slice(0, nextSlash))
      continue
    }

    entry.files += 1
    // 폴더 **바로 아래**의 파일만 본다(더 깊은 곳은 이 폴더의 상태가 아니다)
    const found: S3FileRef = { key, name: tail, lastModified: at }
    if (isEditFileName(tail)) entry.editFile = keepNewer(entry.editFile, found)
    else if (isSendFileName(tail)) entry.sendFile = keepNewer(entry.sendFile, found)
  }

  return [...folders.entries()]
    .map(([name, v]) => ({
      name,
      itemCount: v.files + v.childDirs.size,
      hasChildren: v.childDirs.size > 0,
      lastModified: v.lastModified,
      ...(v.editFile ? { editFile: v.editFile } : {}),
      ...(v.sendFile ? { sendFile: v.sendFile } : {}),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
}

/** 둘 중 더 최근 것 — 페이지가 나뉘어 같은 폴더가 두 번 나올 때 쓴다 */
const newerOf = (a: S3FileRef | undefined, b: S3FileRef): S3FileRef =>
  !a?.lastModified || (b.lastModified && b.lastModified > a.lastModified) ? b : a

/** 이어받기 토큰 — 키가 1000개를 넘으면 나눠서 온다 */
function continuationTokenOf(xml: string): string | null {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('IsTruncated')[0]?.textContent !== 'true') return null
  return doc.getElementsByTagName('NextContinuationToken')[0]?.textContent ?? null
}

/**
 * `prefix` 바로 아래 폴더 목록을 읽어 온다.
 * @param prefix 슬래시로 끝나는 경로 — 'e-dm/2026/newsletterbuilder/conv1/police/'
 */
export async function listFolders(prefix: string, signal?: AbortSignal): Promise<S3Folder[]> {
  const merged = new Map<string, S3Folder>()
  let token: string | null = null

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = new URLSearchParams({
      'list-type': '2',
      prefix,
      'max-keys': String(PAGE_SIZE),
    })
    if (token) params.set('continuation-token', token)

    let xml: string
    try {
      // no-store: S3가 Cache-Control을 주지 않아 브라우저가 임의로 캐싱한다 —
      // 방금 올린 파일이 목록에 안 보이는 일을 막는다
      const res = await fetch(`${BUCKET_URL}/?${params}`, { signal, cache: 'no-store' })
      if (!res.ok) throw new BrowseError(`목록을 읽지 못했어요 (HTTP ${res.status})`)
      xml = await res.text()
    } catch (err) {
      if (err instanceof BrowseError) throw err
      if (err instanceof DOMException && err.name === 'AbortError') throw err
      throw new BrowseError('저장소에 연결하지 못했어요. 네트워크 상태를 확인해 주세요.')
    }

    for (const folder of parseFolderList(xml, prefix)) {
      const prev = merged.get(folder.name)
      if (!prev) {
        merged.set(folder.name, folder)
        continue
      }
      // 페이지가 나뉘면 같은 폴더가 두 번 나온다 — 개수는 더하고 시각·임시 저장 파일은 최근 것을 남긴다
      prev.itemCount += folder.itemCount
      prev.hasChildren = prev.hasChildren || folder.hasChildren
      if (folder.lastModified && (!prev.lastModified || folder.lastModified > prev.lastModified)) {
        prev.lastModified = folder.lastModified
      }
      if (folder.editFile) prev.editFile = newerOf(prev.editFile, folder.editFile)
      if (folder.sendFile) prev.sendFile = newerOf(prev.sendFile, folder.sendFile)
    }

    token = continuationTokenOf(xml)
    if (!token) break
  }

  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
}

/** 버킷 키를 웹에서 바로 열 수 있는 주소로 — '발송본 열기'처럼 새 창으로 띄울 때 쓴다 */
export const objectUrl = (key: string): string => `${BUCKET_URL}/${key.replace(/^\/+/, '')}`

/** 경로 앞의 '/'를 떼어 S3 prefix 형태로 — buildUploadDirectory는 '/'로 시작한다 */
export const toPrefix = (directory: string): string => directory.replace(/^\/+/, '')

/**
 * 저장된 HTML 한 개를 글자로 읽어 온다 ('이어서 편집').
 * 오브젝트 GET에도 CORS가 열려 있어 브라우저에서 바로 받을 수 있다.
 */
export async function fetchText(key: string, signal?: AbortSignal): Promise<string> {
  try {
    // no-store: 캐시된 옛 파일이 돌아오면 '이어서 편집'이 지난 내용을 되살린다
    const res = await fetch(`${BUCKET_URL}/${key.replace(/^\/+/, '')}`, {
      signal,
      cache: 'no-store',
    })
    if (!res.ok) throw new BrowseError(`파일을 읽지 못했어요 (HTTP ${res.status})`)
    return await res.text()
  } catch (err) {
    if (err instanceof BrowseError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new BrowseError('저장소에 연결하지 못했어요. 네트워크 상태를 확인해 주세요.')
  }
}

/** 화면에 보여줄 시각 — '2026. 6. 18. 오후 4:55' */
export function formatModified(at: Date | null): string {
  if (!at) return '-'
  return at.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * 폴더 이름이 업로드 경로에 그대로 실릴 수 있는지.
 *
 * 경로를 만들 때 `normalizeVolume`이 영문·숫자만 남기므로(`vol-56` → `vol56`),
 * 하이픈·밑줄이 든 이름을 고르면 **화면에 보이는 폴더와 실제로 올라가는 폴더가 어긋난다.**
 * 그래서 고르기·만들기 모두 소문자 영숫자만 받는다.
 */
export const isUsableFolderName = (name: string): boolean => /^[a-z0-9]+$/.test(name)

/**
 * 새 폴더 이름으로 쓸 수 있는지.
 * @returns 문제가 있으면 사용자에게 보여줄 문구, 없으면 null
 */
export function validateFolderName(name: string, existing: string[] = []): string | null {
  const value = name.trim()
  if (!value) return '폴더명을 입력해 주세요'
  if (!isUsableFolderName(value.toLowerCase())) {
    return '영문 소문자와 숫자만 쓸 수 있어요 (한글·공백·기호는 주소에서 깨져요)'
  }
  if (value.length > 40) return '폴더명이 너무 길어요 (40자까지)'
  if (existing.some((e) => e.toLowerCase() === value.toLowerCase())) {
    return '같은 이름의 폴더가 이미 있어요'
  }
  return null
}
