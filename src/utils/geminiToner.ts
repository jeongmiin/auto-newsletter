import { htmlToPlainText, type TranslationChange, type TranslationUnit } from '@/utils/newsletterTranslation'

const endpoint = (import.meta.env.VITE_TONE_URL ?? '').trim()

export const isToneEnabled = (): boolean => endpoint !== ''

/** 어투 선택지 — 키는 서버(scripts/tone-core.mjs TONES)와 같아야 한다 */
export type ToneKey = 'formal' | 'friendly' | 'concise'
export const TONES: ReadonlyArray<{ value: ToneKey; label: string; hint: string }> = [
  { value: 'formal', label: '격식 있게', hint: '공식 안내문처럼 정중하게' },
  { value: 'friendly', label: '친근하게', hint: '가까운 사람에게 말하듯 부드럽게' },
  { value: 'concise', label: '간결하게', hint: '군더더기를 덜어 짧고 또렷하게' },
]

/** 어투를 바꾼 값 하나 — 번역 결과와 같은 꼴에 '적용할지'만 더한다 */
export interface ToneChange extends TranslationChange {
  accepted: boolean
}

interface ToneResponse {
  rewrites?: Array<{ id?: string; text?: string }>
  error?: string
}

export class ToneError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ToneError'
  }
}

/**
 * 값 목록을 어투 변환 프록시(Gemini)에 보내고 바꾼 글을 받는다. 보내는 꼴은 번역과 같다(뼈대 HTML).
 *
 * **바뀐 항목만** 돌려준다 — 서버는 바꿀 게 없는 항목을 원문 그대로 돌려주는데, 그런 카드는 사람이 볼 이유가 없다.
 * 한 편이 묶음 2~3회라 무료 한도 소모는 번역과 같다.
 * 전시 분야는 보내지 않는다 — 힌트로 주면 모델이 그 업계 이야기로 내용까지 바꾼다(scripts/tone-core.mjs 참고).
 */
export async function requestTone(
  units: TranslationUnit[],
  tone: ToneKey,
  signal?: AbortSignal,
): Promise<ToneChange[]> {
  if (!endpoint) throw new ToneError('어투 변환 서버 주소가 설정되지 않았습니다.')
  if (units.length === 0) return []

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tone,
      items: units.map(({ id, source, sourceHtml }) => ({
        id,
        text: sourceHtml ?? source,
        format: sourceHtml ? 'html' : 'plain',
      })),
    }),
    signal,
  })

  const payload = (await response.json().catch(() => ({}))) as ToneResponse
  if (!response.ok) {
    throw new ToneError(payload.error || `어투 변환 요청에 실패했습니다. (${response.status})`)
  }

  const byId = new Map((payload.rewrites ?? []).map((item) => [item.id, item.text]))
  const changes: ToneChange[] = []
  for (const unit of units) {
    const result = byId.get(unit.id)
    if (typeof result !== 'string') continue
    const plain = unit.sourceHtml ? htmlToPlainText(result) : result
    // 공백만 다른 것도 '그대로'로 본다 — 모델이 줄 끝 공백을 다듬는 일이 있다
    if (plain.trim() === unit.source.trim()) continue
    changes.push(
      unit.sourceHtml
        ? { ...unit, translated: plain, translatedHtml: result, accepted: true }
        : { ...unit, translated: result, accepted: true },
    )
  }
  return changes
}
