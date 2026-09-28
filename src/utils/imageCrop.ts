/**
 * 이미지 자르기 — 올리기 전에 원하는 비율·높이로 잘라 **새 파일**을 만든다.
 *
 * 메일 클라이언트(Outlook 등)는 object-fit 같은 CSS 자르기를 지원하지 않는다. 그래서 자르기는
 * 픽셀을 실제로 잘라낸 파일을 S3에 올리는 방식이어야 하고, 모듈 속성 값은 지금처럼
 * URL 문자열 하나로 남는다 — 저장/불러오기/내보내기는 아무것도 바뀌지 않는다.
 *
 * 이 파일은 **순수 계산**과 캔버스 → File 변환만 담당한다. 드래그 UI는 ImageCropDialog.vue,
 * 업로드 흐름은 ImageUploadField.vue 가 맡는다.
 */

/** 자르기 비율 프리셋. ratio가 null 이면 자유 비율 */
export interface AspectPreset {
  label: string
  ratio: number | null
}

export const ASPECT_PRESETS: readonly AspectPreset[] = [
  { label: '자유', ratio: null },
  { label: '16:9', ratio: 16 / 9 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '3:2', ratio: 3 / 2 },
  { label: '1:1', ratio: 1 },
]

/**
 * 모듈에서 이미지가 실제로 차지하는 가로 폭(px)의 기본값 — 메일 본문 폭 680px.
 * 모듈마다 다르면 modules-config.json 의 `cropWidth` 로 넘긴다(2단은 320 등).
 */
export const DEFAULT_CROP_WIDTH = 680

/**
 * 저장 해상도 배율. 고해상도 화면에서 흐리지 않도록 화면 폭의 2배로 저장한다.
 * 원본이 그보다 작으면 늘리지 않는다(늘려 봐야 화질만 나빠진다).
 */
export const RETINA_SCALE = 2

export interface Size {
  width: number
  height: number
}

/** 높이를 정하면 너비는 비율로 따라온다. 자유 비율이면 너비를 그대로 둔다. */
export function widthForHeight(height: number, ratio: number | null, currentWidth: number): number {
  if (ratio === null) return Math.max(1, Math.round(currentWidth))
  return Math.max(1, Math.round(height * ratio))
}

/** 너비를 정하면 높이는 비율로 따라온다. 자유 비율이면 높이를 그대로 둔다. */
export function heightForWidth(width: number, ratio: number | null, currentHeight: number): number {
  if (ratio === null) return Math.max(1, Math.round(currentHeight))
  return Math.max(1, Math.round(width / ratio))
}

/**
 * 잘라낸 영역을 어떤 크기로 저장할지.
 * 화면 폭 × 배율보다 크면 그 폭으로 줄이고(비율 유지), 작으면 원본 픽셀 그대로 둔다.
 */
export function outputSize(crop: Size, cropWidth: number = DEFAULT_CROP_WIDTH): Size {
  const maxWidth = Math.max(1, Math.round(cropWidth * RETINA_SCALE))
  if (crop.width <= maxWidth) {
    return { width: Math.max(1, Math.round(crop.width)), height: Math.max(1, Math.round(crop.height)) }
  }
  const scale = maxWidth / crop.width
  return { width: maxWidth, height: Math.max(1, Math.round(crop.height * scale)) }
}

/**
 * 저장할 형식. 캔버스로 다시 그리면 GIF 는 움직임을 잃고 형식도 유지되지 않으므로 PNG 로 바꾼다.
 * 그 외(JPEG/PNG/WebP)는 원본 형식을 따른다. MIME 이 비어 오면 확장자로 정한다.
 */
export function outputMimeOf(file: Pick<File, 'name' | 'type'>): 'image/jpeg' | 'image/png' | 'image/webp' {
  const type = file.type || mimeFromExtension(file.name)
  if (type === 'image/jpeg' || type === 'image/webp') return type
  return 'image/png'
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function mimeFromExtension(name: string): string {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'png') return 'image/png'
  return ''
}

/** 잘라 저장한 파일 이름 — 원본 이름을 지키고, 형식이 바뀌었으면 확장자만 맞춘다 */
export function croppedFileName(originalName: string, mime: string): string {
  const ext = EXT_BY_MIME[mime] ?? 'png'
  const dot = originalName.lastIndexOf('.')
  const base = dot > 0 ? originalName.slice(0, dot) : originalName
  return `${base}.${ext}`
}

/** 움직이는 GIF 는 자르면 정지 이미지가 된다 — 다이얼로그에서 미리 알려 준다 */
export function isGif(file: Pick<File, 'name' | 'type'>): boolean {
  return file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')
}

/** JPEG/WebP 저장 품질. PNG 는 무손실이라 무시된다 */
export const OUTPUT_QUALITY = 0.92

/**
 * 잘라낸 캔버스를 File 로 만든다.
 * 캔버스는 이미 저장 크기로 그려져 있어야 한다(vue-advanced-cropper 의 canvas.maxWidth 가 맞춰 준다).
 */
export function canvasToFile(
  canvas: HTMLCanvasElement,
  original: Pick<File, 'name' | 'type'>,
): Promise<File> {
  const mime = outputMimeOf(original)
  const name = croppedFileName(original.name, mime)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('이미지를 저장하지 못했어요. 다시 시도해 주세요.'))
          return
        }
        resolve(new File([blob], name, { type: mime, lastModified: Date.now() }))
      },
      mime,
      OUTPUT_QUALITY,
    )
  })
}
