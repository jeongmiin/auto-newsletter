import {
  htmlToPlainText,
  type TranslationChange,
  type TranslationLanguage,
  type TranslationUnit,
} from '@/utils/newsletterTranslation'

const endpoint = (import.meta.env.VITE_AZURE_TRANSLATE_URL ?? '').trim()

export const isTranslationEnabled = (): boolean => endpoint !== ''

interface TranslationResponse {
  translations?: Array<{ id?: string; text?: string }>
  error?: string
}

export class TranslationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TranslationError'
  }
}

export async function translateUnits(
  units: TranslationUnit[],
  targetLanguage: TranslationLanguage,
  signal?: AbortSignal,
): Promise<TranslationChange[]> {
  if (!endpoint) throw new TranslationError('번역 API 주소가 설정되지 않았습니다.')
  if (units.length === 0) return []

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceLanguage: 'ko',
      targetLanguage,
      // 리치 텍스트는 태그째 보낸다 — 번역기가 태그를 제자리에 돌려주므로 굵게·색상·링크가 살아 온다.
      items: units.map(({ id, source, sourceHtml }) => ({
        id,
        text: sourceHtml ?? source,
        format: sourceHtml ? 'html' : 'plain',
      })),
    }),
    signal,
  })

  const payload = (await response.json().catch(() => ({}))) as TranslationResponse
  if (!response.ok) {
    throw new TranslationError(payload.error || `번역 요청에 실패했습니다. (${response.status})`)
  }

  const translatedById = new Map(
    (payload.translations ?? []).map((item) => [item.id, item.text]),
  )
  const missing = units.find((unit) => typeof translatedById.get(unit.id) !== 'string')
  if (missing) throw new TranslationError('번역 결과 일부가 누락되었습니다. 다시 시도해 주세요.')

  return units.map((unit) => {
    const result = translatedById.get(unit.id)!
    // 화면에는 태그를 뺀 평문만 보여 준다. 고치지 않고 적용하면 돌려받은 HTML을 그대로 쓴다.
    return unit.sourceHtml
      ? { ...unit, translated: htmlToPlainText(result), translatedHtml: result }
      : { ...unit, translated: result }
  })
}
