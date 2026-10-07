import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleProofread, usableCorrections, DEFAULT_GEMINI_MODEL } from '../proofread-core.mjs'

const items = [
  { id: '0', text: '상담회가 개최 됩니다!' },
  { id: '1', text: '문의 바람니다' },
]

/** Gemini 응답 흉내 — 본문은 candidates[0].content.parts[].text 에 JSON 글자로 온다 */
const geminiOk = (rows) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(rows) }] } }] }), {
    status: 200,
  })

afterEach(() => vi.unstubAllGlobals())

describe('usableCorrections', () => {
  it('원문에 글자 그대로 있는 구절만 남긴다', () => {
    expect(
      usableCorrections(
        [
          { id: '0', original: '개최 됩니다', corrected: '개최됩니다', reason: '띄어쓰기' },
          // 모델이 구절을 다듬어 적은 경우 — 화면에서 자리를 찾을 수 없다
          { id: '0', original: '개최  됩니다', corrected: '개최됩니다', reason: '' },
          // 없는 id, 고친 게 없는 항목, 태그가 섞인 것, 같은 자리 중복
          { id: '7', original: '개최', corrected: '게최', reason: '' },
          { id: '1', original: '바람니다', corrected: '바랍니다<img src=x onerror=alert(1)>', reason: '' },
          { id: '1', original: '바람니다', corrected: '바람니다', reason: '' },
          { id: '0', original: '개최 됩니다', corrected: '개최됩니다', reason: '중복' },
        ],
        items,
      ),
    ).toEqual([{ id: '0', original: '개최 됩니다', corrected: '개최됩니다', reason: '띄어쓰기' }])
  })

  it('목록이 아니면 빈 목록', () => {
    expect(usableCorrections({ oops: true }, items)).toEqual([])
  })
})

describe('handleProofread', () => {
  it('키를 헤더로 보내고 기본 모델을 부른다', async () => {
    const fetchMock = vi.fn(async () =>
      geminiOk([{ id: '1', original: '바람니다', corrected: '바랍니다', reason: '오타' }]),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await handleProofread({ items }, { key: 'k' })

    expect(result).toEqual({
      corrections: [{ id: '1', original: '바람니다', corrected: '바랍니다', reason: '오타' }],
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain(`/models/${DEFAULT_GEMINI_MODEL}:generateContent`)
    expect(init.headers['x-goog-api-key']).toBe('k')
    // 키가 주소에 실려 로그에 남지 않게
    expect(url).not.toContain('k=')
  })

  it('하루 한도 초과(429)는 과금이 아니라 안내 문구로 돌려준다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: { details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] }] },
          }),
          { status: 429 },
        ),
      ),
    )
    await expect(handleProofread({ items }, { key: 'k' })).rejects.toMatchObject({
      status: 429,
      message: expect.stringContaining('오늘'),
    })
  })

  it('분당 한도 초과(429)는 잠시 뒤 다시 하라고 알린다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: { details: [{ violations: [{ quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier' }] }] },
          }),
          { status: 429 },
        ),
      ),
    )
    await expect(handleProofread({ items }, { key: 'k' })).rejects.toMatchObject({
      status: 429,
      message: expect.stringContaining('1분'),
    })
  })

  it('503(수요 과다)은 한 번 더 해 보고, 풀리면 결과를 돌려준다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(geminiOk([]))
    vi.stubGlobal('fetch', fetchMock)

    await expect(handleProofread({ items }, { key: 'k' })).resolves.toEqual({ corrections: [] })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('키가 없거나 보낼 글이 없으면 Gemini를 부르지 않는다', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(handleProofread({ items }, { key: '' })).rejects.toMatchObject({ status: 500 })
    await expect(handleProofread({ items: [] }, { key: 'k' })).rejects.toMatchObject({ status: 400 })
    await expect(
      handleProofread({ items: [{ id: '0', text: '가'.repeat(40_001) }] }, { key: 'k' }),
    ).rejects.toMatchObject({ status: 400 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('답이 JSON이 아니면(잘림·빈 답) 다시 시도하라고 알린다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '[{"id":' }] } }] }), {
          status: 200,
        }),
      ),
    )
    await expect(handleProofread({ items }, { key: 'k' })).rejects.toMatchObject({ status: 502 })
  })
})
