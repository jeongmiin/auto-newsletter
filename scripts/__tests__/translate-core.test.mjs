import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  batchesOf,
  handleTranslation,
  repairSkeleton,
  tagSignature,
  usableTranslation,
} from '../translate-core.mjs'
import { DEFAULT_GEMINI_MODEL } from '../gemini-core.mjs'

const plain = { id: 'p', text: '행사 안내', format: 'plain' }
const html = {
  id: 'h',
  text: '<p i="0"><strong i="1">상담회</strong>가 열립니다 <a i="2">자세히</a></p>',
  format: 'html',
}

/** Gemini 응답 흉내 — 본문은 candidates[0].content.parts[].text 에 JSON 글자로 온다 */
const geminiOk = (rows) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(rows) }] } }] }), {
    status: 200,
  })

afterEach(() => vi.unstubAllGlobals())

describe('tagSignature · isUsableTranslation — 서식 뼈대 검증', () => {
  it('태그 이름과 뼈대 번호만 순서대로 남긴다', () => {
    expect(tagSignature(html.text)).toBe('p#0 strong#1 /strong a#2 /a /p')
    expect(tagSignature('<P I="0">x<br i="1">y</P>')).toBe('p#0 br#1 /p')
  })

  it('서식 항목은 뼈대가 같을 때만, 평문 항목은 태그가 없을 때만 받는다', () => {
    const good = '<p i="0"><strong i="1">Meeting</strong> opens <a i="2">More</a></p>'
    expect(usableTranslation(html, good)).toBe(good)
    // 태그를 빼먹음 / 순서를 바꿈 → 못 쓴다
    expect(usableTranslation(html, '<p i="0">Meeting opens <a i="2">More</a></p>')).toBeNull()
    expect(usableTranslation(html, '<p i="0"><a i="2">More</a> <strong i="1">Meeting</strong></p>')).toBeNull()
    expect(usableTranslation(plain, 'Event guide')).toBe('Event guide')
    expect(usableTranslation(plain, '<b>Event</b> guide')).toBeNull()
    expect(usableTranslation(plain, '')).toBeNull()
    expect(usableTranslation(plain, undefined)).toBeNull()
  })

  it('태그 구조는 같은데 번호만 틀리면 원문 번호로 고쳐 받는다', () => {
    // 마지막 태그 번호를 틀리게 적음(실측: 23 → 22) + 모델이 지어낸 속성
    expect(usableTranslation(html, '<p i="0"><strong i="5">Meeting</strong> opens <a i="2" href="x">More</a></p>')).toBe(
      '<p i="0"><strong i="1">Meeting</strong> opens <a i="2">More</a></p>',
    )
    // 자기 닫힘 태그와 번호 없는 원문 태그도 자리대로
    expect(repairSkeleton('<p i="0">a<br i="1">b</p><div>c</div>', '<p i="9">x<br i="7"/>y</p><div i="3">z</div>')).toBe(
      '<p i="0">x<br i="1"/>y</p><div>z</div>',
    )
    expect(repairSkeleton(html.text, '<p i="0">Meeting opens</p>')).toBeNull()
  })
})

describe('batchesOf', () => {
  it('글자 수·항목 수로 나누고, 한도를 넘는 항목은 혼자 한 묶음이 된다', () => {
    const items = [
      { id: 'a', text: 'x'.repeat(2_000) },
      { id: 'b', text: 'y'.repeat(1_500) },
      { id: 'c', text: 'z'.repeat(5_000) },
      { id: 'd', text: 'w' },
    ]
    expect(batchesOf(items, 3_000, 80).map((batch) => batch.map((i) => i.id))).toEqual([['a'], ['b'], ['c'], ['d']])
    expect(batchesOf(items, 10_000, 2).map((batch) => batch.map((i) => i.id))).toEqual([['a', 'b'], ['c', 'd']])
  })
})

describe('handleTranslation', () => {
  const body = { sourceLanguage: 'ko', targetLanguage: 'ja', items: [plain, html] }

  it('Gemini 에 JSON 모드로 묻고 입력 순서대로 번역문을 돌려준다', async () => {
    const fetchMock = vi.fn(async () =>
      geminiOk([
        { id: 'h', text: '<p i="0"><strong i="1">商談会</strong>が開かれます <a i="2">詳しく</a></p>' },
        { id: 'p', text: 'イベント案内' },
      ]),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(handleTranslation(body, { key: 'k' })).resolves.toEqual({
      translations: [
        { id: 'p', text: 'イベント案内' },
        { id: 'h', text: '<p i="0"><strong i="1">商談会</strong>が開かれます <a i="2">詳しく</a></p>' },
      ],
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain(`/models/${DEFAULT_GEMINI_MODEL}:generateContent`)
    expect(init.headers['x-goog-api-key']).toBe('k')
    expect(url).not.toContain('k=')
    const sent = JSON.parse(init.body)
    const input = JSON.parse(sent.contents[0].parts[0].text)
    expect(input.target).toContain('日本語')
    expect(input.items).toEqual([
      { id: 'p', text: '행사 안내', format: 'plain' },
      { id: 'h', text: html.text, format: 'html' },
    ])
    expect(sent.generationConfig.responseMimeType).toBe('application/json')
  })

  it('뼈대가 어긋난 항목만 모아 한 번 더 묻고, 그래도 안 되면 502 로 알린다', async () => {
    const broken = { id: 'h', text: '<p i="0">商談会が開かれます</p>' }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(geminiOk([{ id: 'p', text: 'イベント案内' }, broken]))
      .mockResolvedValueOnce(geminiOk([broken]))
    vi.stubGlobal('fetch', fetchMock)

    await expect(handleTranslation(body, { key: 'k' })).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining('서식'),
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    // 재시도는 어긋난 항목만, 주의 문구와 함께
    const retryInput = JSON.parse(JSON.parse(fetchMock.mock.calls[1][1].body).contents[0].parts[0].text)
    expect(retryInput.items.map((i) => i.id)).toEqual(['h'])
    expect(retryInput.note).toContain('태그')
  })

  it('재시도에서 맞게 오면 그 결과를 쓴다', async () => {
    const good = { id: 'h', text: '<p i="0"><strong i="1">商談会</strong>が開かれます <a i="2">詳しく</a></p>' }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(geminiOk([{ id: 'p', text: 'イベント案内' }, { id: 'h', text: '商談会' }]))
      .mockResolvedValueOnce(geminiOk([good]))
    vi.stubGlobal('fetch', fetchMock)
    const result = await handleTranslation(body, { key: 'k' })
    expect(result.translations[1]).toEqual(good)
  })

  it('하루 한도 초과(429)는 과금이 아니라 안내 문구로, 503은 한 번 더 해 본다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ error: { details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] }] } }),
          { status: 429 },
        ),
      ),
    )
    await expect(handleTranslation(body, { key: 'k' })).rejects.toMatchObject({
      status: 429,
      message: expect.stringContaining('번역 횟수'),
    })

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(geminiOk([{ id: 'p', text: 'Event guide' }]))
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      handleTranslation({ sourceLanguage: 'ko', targetLanguage: 'en', items: [plain] }, { key: 'k' }),
    ).resolves.toEqual({ translations: [{ id: 'p', text: 'Event guide' }] })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('키·언어·형식이 틀리면 Gemini 를 부르지 않는다', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(handleTranslation(body, { key: '' })).rejects.toMatchObject({ status: 500 })
    await expect(handleTranslation({ ...body, sourceLanguage: 'en' }, { key: 'k' })).rejects.toMatchObject({ status: 400 })
    await expect(handleTranslation({ ...body, targetLanguage: 'fr' }, { key: 'k' })).rejects.toMatchObject({ status: 400 })
    await expect(handleTranslation({ ...body, items: [] }, { key: 'k' })).rejects.toMatchObject({ status: 400 })
    await expect(
      handleTranslation({ ...body, items: [{ id: 'x', text: '가'.repeat(12_001) }] }, { key: 'k' }),
    ).rejects.toMatchObject({ status: 400 })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
