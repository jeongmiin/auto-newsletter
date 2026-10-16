import { afterEach, describe, expect, it, vi } from 'vitest'
import { BODY_IDS, HEADER_IDS, handleRecommend, usableOptions } from '../recommend-core.mjs'

/** Gemini 응답 흉내 — 본문은 candidates[0].content.parts[].text 에 JSON 글자로 온다 */
const geminiOk = (payload) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }), {
    status: 200,
  })

const option = (over = {}) => ({
  name: '임팩트형',
  summary: '큰 비주얼',
  header: { module: 'ModuleImageHeader', titles: ['행사명'], subtitles: ['8. 5 ~ 8. 8'], bodies: ['소개'], buttons: ['등록 →'] },
  body: [
    { module: 'Module02', reason: '소개', titles: ['t'], bodies: ['b'], buttons: ['더보기'], labels: [] },
    { module: 'ModuleTwoButton', reason: '행동', titles: [], bodies: [], buttons: ['등록', '홈'], labels: [] },
  ],
  ...over,
})

afterEach(() => vi.unstubAllGlobals())

describe('usableOptions', () => {
  it('모르는 본문 모듈은 버리고, 글은 다듬고, 헤더가 이상하면 기본 헤더로', () => {
    const [out] = usableOptions({
      options: [
        option({
          header: { module: 'ModuleFooter', titles: ['  x  ', 3], subtitles: [], bodies: [], buttons: [] },
          body: [
            { module: 'ModuleFooter', reason: '', titles: [], bodies: [], buttons: [], labels: [] },
            { module: 'Module02', reason: 'r', titles: [' t '], bodies: [''], buttons: ['b'], labels: [] },
          ],
        }),
      ],
    })
    expect(out.header).toEqual({ module: 'ModuleBasicHeader', titles: ['x'], subtitles: [], bodies: [], buttons: [] })
    expect(out.body).toEqual([{ module: 'Module02', reason: 'r', titles: ['t'], bodies: [], buttons: ['b'], labels: [] }])
  })

  it('문구 속 꺾쇠는 지운다 — 버튼·라벨은 모듈 HTML 에 그대로 들어간다', () => {
    const [out] = usableOptions({
      options: [option({ body: [{ module: 'ModuleTwoButton', reason: '', titles: [], bodies: [], buttons: ['등록<img src=x onerror=alert(1)>', '<b>홈</b>'], labels: [] }] })],
    })
    expect(out.body[0].buttons).toEqual(['등록img src=x onerror=alert(1)', 'b홈/b'])
  })

  it('본문이 하나도 안 남은 구성안은 빼고, 셋까지만 남긴다', () => {
    const bad = option({ body: [{ module: 'Nope', reason: '', titles: [], bodies: [], buttons: [], labels: [] }] })
    const out = usableOptions({ options: [bad, option(), option(), option(), option()] })
    expect(out).toHaveLength(3)
    expect(out.every((o) => o.body.length === 2)).toBe(true)
  })

  it('헤더·본문 enum 은 푸터를 포함하지 않는다(푸터는 화면이 붙인다)', () => {
    expect(HEADER_IDS).toEqual(['ModuleNewsHeader', 'ModuleBasicHeader', 'ModuleImageHeader'])
    expect(BODY_IDS).not.toContain('ModuleFooter')
    expect(BODY_IDS).toContain('Module02')
  })
})

describe('handleRecommend', () => {
  it('목적·행사 정보가 없으면 400', async () => {
    await expect(handleRecommend({ brief: 'x' }, { key: 'k' })).rejects.toMatchObject({ status: 400 })
    await expect(handleRecommend({ purpose: '사전등록 안내' }, { key: 'k' })).rejects.toMatchObject({ status: 400 })
  })

  it('키가 없으면 500', async () => {
    await expect(handleRecommend({ purpose: 'p', brief: 'b' }, { key: '' })).rejects.toMatchObject({ status: 500 })
  })

  it('Gemini 에 분야·목적·행사 정보를 보내고 구성안을 돌려준다', async () => {
    const fetchMock = vi.fn(async () => geminiOk({ options: [option()] }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await handleRecommend({ field: '법률', purpose: '사전등록 안내', brief: '행사명 X' }, { key: 'k' })
    expect(result.options).toHaveLength(1)
    expect(result.options[0].body.map((m) => m.module)).toEqual(['Module02', 'ModuleTwoButton'])
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.contents[0].parts[0].text).toContain('"purpose":"사전등록 안내"')
    expect(body.generationConfig.responseSchema.properties.options.items.properties.header.properties.module.enum).toEqual(HEADER_IDS)
  })

  it('쓸 만한 구성안이 하나도 없으면 502', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => geminiOk({ options: [] })))
    await expect(handleRecommend({ purpose: 'p', brief: 'b' }, { key: 'k' })).rejects.toMatchObject({ status: 502 })
  })
})
