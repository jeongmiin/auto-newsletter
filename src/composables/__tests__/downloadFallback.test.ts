/**
 * 저장 창(showSaveFilePicker) 경로가 실패하면 **일반 다운로드로 넘어가 파일은 남아야** 한다.
 *
 * 2026-11 Chrome 157로 올라간 일부 랩탑에서 저장 창으로 고른 파일이 디스크에 남지 않았다.
 * 취소(AbortError)는 그대로 '취소'로 끝나야 하고, 그 밖의 실패만 넘어간다.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const toastAdd = vi.fn()
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: toastAdd }) }))
vi.mock('@/composables/useNewsletterDocument', () => ({
  useNewsletterDocument: () => ({ buildDocument: async () => '<html></html>' }),
}))

import { useNewsletterDownload } from '../useNewsletterDownload'
import { useModuleStore } from '@/stores/moduleStore'

type PickerWindow = Window & { showSaveFilePicker?: unknown; umami?: { track: (...a: unknown[]) => void } }

describe('다운로드 — 저장 창 실패 시 일반 다운로드로', () => {
  let anchorClicks: string[]

  beforeEach(() => {
    setActivePinia(createPinia())
    useModuleStore().modules.push({ id: 'm1', moduleId: 'ModuleImg', order: 0, properties: {}, styles: {} })
    toastAdd.mockClear()
    anchorClicks = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      anchorClicks.push(this.download)
    })
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => {
    delete (window as PickerWindow).showSaveFilePicker
    delete (window as PickerWindow).umami
    vi.restoreAllMocks()
  })

  it('쓰기 마무리(close)에서 실패하면 일반 다운로드로 받고 사유를 알린다', async () => {
    const track = vi.fn()
    ;(window as PickerWindow).umami = { track }
    ;(window as PickerWindow).showSaveFilePicker = async () => ({
      name: 'renamed.html',
      createWritable: async () => ({
        write: async () => {},
        close: async () => {
          throw new DOMException('rename failed', 'InvalidStateError')
        },
      }),
    })

    const result = await useNewsletterDownload().downloadHtml(false)

    expect(result).toBe('triggered')
    expect(anchorClicks).toHaveLength(1)
    expect(anchorClicks[0]).toMatch(/_send\.html$/)
    const toast = toastAdd.mock.calls[0][0]
    expect(toast.severity).toBe('warn')
    expect(toast.detail).toContain('InvalidStateError')
    expect(track).toHaveBeenCalledWith('download_fallback', { kind: 'send', reason: 'InvalidStateError' })
  })

  it('저장 창을 여는 것부터 막히면(정책 등) 일반 다운로드로 받는다', async () => {
    ;(window as PickerWindow).showSaveFilePicker = async () => {
      throw new DOMException('blocked', 'NotAllowedError')
    }
    expect(await useNewsletterDownload().downloadHtml(true)).toBe('triggered')
    expect(anchorClicks[0]).toMatch(/_edit\.html$/)
  })

  it('사용자가 저장 창을 취소하면 아무것도 받지 않는다', async () => {
    ;(window as PickerWindow).showSaveFilePicker = async () => {
      throw new DOMException('cancel', 'AbortError')
    }
    expect(await useNewsletterDownload().downloadHtml(false)).toBe('cancelled')
    expect(anchorClicks).toHaveLength(0)
    expect(toastAdd).not.toHaveBeenCalled()
  })

  it('정상 저장이면 저장 창에서 바꾼 이름으로 안내한다', async () => {
    ;(window as PickerWindow).showSaveFilePicker = async () => ({
      name: 'my_name.html',
      createWritable: async () => ({ write: async () => {}, close: async () => {} }),
    })
    expect(await useNewsletterDownload().downloadHtml(false)).toBe('saved')
    expect(anchorClicks).toHaveLength(0)
    expect(toastAdd.mock.calls[0][0].detail).toContain('my_name.html')
  })
})
