import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleProofread, usableCorrections, indexOfPhrase, DEFAULT_GEMINI_MODEL } from '../proofread-core.mjs'

const items = [
  { id: '0', text: '상담회가 개최 됩니다!' },
  { id: '1', text: '문의 바람니다' },
  { id: '2', text: 'Register now and then recieve the guide.' },
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
    ).toEqual([{ id: '0', lang: '', original: '개최 됩니다', corrected: '개최됩니다', reason: '띄어쓰기' }])
  })

  it('영어 구절은 단어 경계에 있는 것만 남기고, lang 은 아는 값만 둔다', () => {
    expect(
      usableCorrections(
        [
          { id: '2', lang: 'en', original: 'recieve', corrected: 'receive', reason: '철자' },
          // 'the' 는 'then' 안에도 있지만 단어로는 뒤쪽에 있다 — 통과
          { id: '2', lang: 'en', original: 'the guide', corrected: 'the guides', reason: '' },
          // 'ow' 는 'now' 의 일부로만 있다 — 버린다
          { id: '2', lang: 'en', original: 'ow', corrected: 'own', reason: '' },
          { id: '0', lang: 'klingon', original: '개최 됩니다', corrected: '개최됩니다', reason: '' },
        ],
        items,
      ),
    ).toEqual([
      { id: '2', lang: 'en', original: 'recieve', corrected: 'receive', reason: '철자' },
      { id: '2', lang: 'en', original: 'the guide', corrected: 'the guides', reason: '' },
      { id: '0', lang: '', original: '개최 됩니다', corrected: '개최됩니다', reason: '' },
    ])
  })

  it('목록이 아니면 빈 목록', () => {
    expect(usableCorrections({ oops: true }, items)).toEqual([])
  })
})

describe('indexOfPhrase', () => {
  it('라틴 문자 구절은 단어 경계에서만 찾는다', () => {
    expect(indexOfPhrase('then the end', 'the')).toBe(5)
    expect(indexOfPhrase('then', 'the')).toBe(-1)
    expect(indexOfPhrase('Café café', 'café')).toBe(5)
    expect(indexOfPhrase("don't", 'don')).toBe(0) // 아포스트로피는 경계
  })
  it('한국어·일본어·중국어 구절은 경계 없이 그대로 찾는다', () => {
    expect(indexOfPhrase('상담회가개최됩니다', '개최')).toBe(4)
    expect(indexOfPhrase('ご参加ください', '参加')).toBe(1)
    expect(indexOfPhrase('欢迎参加', '参加')).toBe(2)
  })
  it('섞인 구절은 라틴 쪽 끝만 경계를 본다', () => {
    expect(indexOfPhrase('AI에듀엑스포', 'AI에듀')).toBe(0)
    expect(indexOfPhrase('KAI에듀', 'AI에듀')).toBe(-1)
  })
})

describe('handleProofread', () => {
  it('키를 헤더로 보내고 기본 모델을 부른다', async () => {
    const fetchMock = vi.fn(async () =>
      geminiOk([{ id: '1', original: '바람니다', corrected: '바랍니다', reason: '오타' }]),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await handleProofread({ items, hint: 'ja' }, { key: 'k' })

    expect(result).toEqual({
      corrections: [{ id: '1', lang: '', original: '바람니다', corrected: '바랍니다', reason: '오타' }],
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain(`/models/${DEFAULT_GEMINI_MODEL}:generateContent`)
    expect(init.headers['x-goog-api-key']).toBe('k')
    // 키가 주소에 실려 로그에 남지 않게
    expect(url).not.toContain('k=')
    // 모델에는 {hint, items} 로 간다 — 주 언어 힌트는 아는 값만, 응답 스키마는 lang 을 요구한다
    const sent = JSON.parse(init.body)
    expect(JSON.parse(sent.contents[0].parts[0].text)).toEqual({ hint: 'ja', items })
    expect(sent.generationConfig.responseSchema.items.required).toContain('lang')
  })

  it('모르는 힌트는 unknown 으로 보낸다', async () => {
    const fetchMock = vi.fn(async () => geminiOk([]))
    vi.stubGlobal('fetch', fetchMock)
    await handleProofread({ items, hint: 'fr' }, { key: 'k' })
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(JSON.parse(sent.contents[0].parts[0].text).hint).toBe('unknown')
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
