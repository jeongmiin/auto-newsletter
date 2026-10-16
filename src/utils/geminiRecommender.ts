import type { RecommendOption } from '@/utils/newsletterRecommend'

const endpoint = (import.meta.env.VITE_RECOMMEND_URL ?? '').trim()

export const isRecommendEnabled = (): boolean => endpoint !== ''

export interface RecommendRequest {
  /** 전시 분야 — 문구 어휘를 맞추는 힌트. 비워도 된다 */
  field: string
  purpose: string
  /** 행사명·일정·장소·핵심 메시지 — 담당자가 적은 그대로 */
  brief: string
}

interface RecommendResponse {
  options?: RecommendOption[]
  error?: string
}

export class RecommendError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RecommendError'
  }
}

/**
 * 목적·행사 정보를 추천 프록시에 보내고 구성안 2~3개를 받는다 — 한 번에 요청 **하나**다.
 * 무료 등급은 하루 요청 횟수로 세므로 번역(2~3회)보다 싸다. 한도 초과·서버 붐빔 안내는 프록시가 문구로 돌려준다.
 */
export async function requestRecommend(input: RecommendRequest, signal?: AbortSignal): Promise<RecommendOption[]> {
  if (!endpoint) throw new RecommendError('추천 서버 주소가 설정되지 않았습니다.')

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  })

  const payload = (await response.json().catch(() => ({}))) as RecommendResponse
  if (!response.ok) {
    throw new RecommendError(payload.error || `구성 추천 요청에 실패했습니다. (${response.status})`)
  }
  return Array.isArray(payload.options) ? payload.options : []
}
