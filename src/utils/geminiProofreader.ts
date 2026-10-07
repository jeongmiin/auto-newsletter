import type { ProofreadCorrection, ProofreadItem } from '@/utils/newsletterProofread'

const endpoint = (import.meta.env.VITE_PROOFREAD_URL ?? '').trim()

export const isProofreadEnabled = (): boolean => endpoint !== ''

interface ProofreadResponse {
  corrections?: ProofreadCorrection[]
  error?: string
}

export class ProofreadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProofreadError'
  }
}

/**
 * 글 목록을 검사 프록시에 보내고 고칠 곳을 받는다.
 *
 * 뉴스레터 한 편을 요청 **한 번**으로 보낸다 — 무료 등급은 하루 요청 횟수로 세기 때문에
 * 값마다 나눠 보내면 한 편에 한도를 다 쓴다. 한도 초과·서버 붐빔 안내는 프록시가 문구로 돌려준다.
 */
export async function requestProofread(
  items: ProofreadItem[],
  signal?: AbortSignal,
): Promise<ProofreadCorrection[]> {
  if (!endpoint) throw new ProofreadError('맞춤법 검사 서버 주소가 설정되지 않았습니다.')
  if (items.length === 0) return []

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
    signal,
  })

  const payload = (await response.json().catch(() => ({}))) as ProofreadResponse
  if (!response.ok) {
    throw new ProofreadError(payload.error || `맞춤법 검사 요청에 실패했습니다. (${response.status})`)
  }
  return Array.isArray(payload.corrections) ? payload.corrections : []
}
