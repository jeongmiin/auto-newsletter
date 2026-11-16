/**
 * 내보내기(generateHtml)의 모듈 템플릿 받기.
 *
 * - 파일로 남는 길(strict)은 모듈 하나라도 못 받으면 실패해야 한다 — 건너뛰면 모듈이 빠진 파일이
 *   '저장 완료'로 나간다. 미리보기(기본)는 건너뛰고 나머지를 보여 준다.
 * - 요청이 끝나지 않으면 시간을 재서 끊는다 — 안 그러면 내려받기가 아무 반응 없이 멈춘다.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useModuleStore } from '@/stores/moduleStore'

const ok = (html: string) => ({ ok: true, status: 200, text: async () => html })

describe('generateHtml — 모듈 템플릿 받기', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const store = useModuleStore()
    store.modules.push(
      { id: 'a', moduleId: 'TestModuleA', order: 0, properties: {}, styles: {} },
      { id: 'b', moduleId: 'TestModuleB', order: 1, properties: {}, styles: {} },
      { id: 'c', moduleId: 'TestModuleA', order: 2, properties: {}, styles: {} },
    )
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('같은 모듈은 한 번만 받고, 순서대로 조립한다', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      ok(url.includes('TestModuleA') ? '<table><tr><td>AAA</td></tr></table>' : '<table><tr><td>BBB</td></tr></table>'),
    )
    global.fetch = fetchMock as unknown as typeof fetch
    const html = await useModuleStore().generateHtml(false, undefined, { strict: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(html.indexOf('AAA')).toBeLessThan(html.indexOf('BBB'))
    expect(html.indexOf('BBB')).toBeLessThan(html.lastIndexOf('AAA'))
  })

  it('strict: 모듈 하나라도 못 받으면 오류를 던진다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch = vi.fn(async (url: string) =>
      url.includes('TestModuleB') ? { ok: false, status: 503 } : ok('<table><tr><td>AAA</td></tr></table>'),
    ) as unknown as typeof fetch
    await expect(useModuleStore().generateHtml(false, undefined, { strict: true })).rejects.toThrow('TestModuleB')
  })

  it('기본(미리보기): 못 받은 모듈은 건너뛰고 나머지를 만든다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch = vi.fn(async (url: string) =>
      url.includes('TestModuleB') ? { ok: false, status: 503 } : ok('<table><tr><td>AAA</td></tr></table>'),
    ) as unknown as typeof fetch
    const html = await useModuleStore().generateHtml(false)
    expect(html).toContain('AAA')
  })

  it('요청이 끝나지 않으면 시간을 재서 끊고, 취소(AbortError)가 아닌 오류로 알린다', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch = vi.fn(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        }),
    ) as unknown as typeof fetch
    const pending = useModuleStore().generateHtml(false, undefined, { strict: true })
    const assertion = expect(pending).rejects.toSatisfy(
      (err: unknown) => err instanceof Error && err.name !== 'AbortError',
    )
    await vi.advanceTimersByTimeAsync(10000)
    await assertion
  })
})
