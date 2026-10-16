import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleTone, TONE_KEYS } from '../tone-core.mjs'

/** Gemini 응답 흉내 — 본문은 candidates[0].content.parts[].text 에 JSON 글자로 온다 */
const geminiOk = (rows) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(rows) }] } }] }), {
    status: 200,
  })

afterEach(() => vi.unstubAllGlobals())

describe('handleTone', () => {
  it('어투 셋을 안다', () => {
    expect(TONE_KEYS).toEqual(['formal', 'friendly', 'concise'])
  })

  it('모르는 어투·빈 항목·키 없음은 거절한다', async () => {
    await expect(handleTone({ tone: 'shouting', items: [{ id: '0', text: 'a' }] }, { key: 'k' })).rejects.toMatchObject({ status: 400 })
    await expect(handleTone({ tone: 'formal', items: [] }, { key: 'k' })).rejects.toMatchObject({ status: 400 })
    await expect(handleTone({ tone: 'formal', items: [{ id: '0', text: 'a' }] }, { key: '' })).rejects.toMatchObject({ status: 500 })
  })

  it('어투·기준과 항목을 보내고(분야는 안 보낸다), 뼈대가 같은 결과만 돌려준다', async () => {
    const fetchMock = vi.fn(async () =>
      geminiOk([
        { id: '0', text: '<p i="0">사전등록을 완료해 주시기 바랍니다.</p>' },
        { id: '1', text: '등록하기' },
      ]),
    )
    vi.stubGlobal('fetch', fetchMock)
    const result = await handleTone(
      {
        tone: 'formal',
        field: '법률',
        items: [
          { id: '0', text: '<p i="0">사전등록 꼭 해요!</p>', format: 'html' },
          { id: '1', text: '등록하기', format: 'plain' },
        ],
      },
      { key: 'k' },
    )
    expect(result.rewrites).toEqual([
      { id: '0', text: '<p i="0">사전등록을 완료해 주시기 바랍니다.</p>' },
      { id: '1', text: '등록하기' },
    ])
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    const input = JSON.parse(body.contents[0].parts[0].text)
    expect(input.tone).toBe('격식 있게')
    expect(input).not.toHaveProperty('field')
    expect(input.guide).toContain('합니다')
    expect(body.systemInstruction.parts[0].text).toContain('언어를 바꾸지 않습니다')
  })

  it('뼈대가 어긋난 항목은 단독으로 다시 묻고, 그래도 안 되면 502', async () => {
    const fetchMock = vi.fn(async () => geminiOk([{ id: '0', text: '사전등록 바랍니다' }]))
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      handleTone({ tone: 'concise', items: [{ id: '0', text: '<p i="0">사전등록 꼭 해요!</p>', format: 'html' }] }, { key: 'k' }),
    ).rejects.toMatchObject({ status: 502, message: expect.stringContaining('어투 변환 결과 1곳') })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
