/**
 * 저장 창(showSaveFilePicker) 경로가 실패하면 **일반 다운로드로 넘어가 파일은 남아야** 한다.
 *
 * 2026-11 Chrome 157로 올라간 일부 랩탑에서 저장 창으로 고른 파일이 디스크에 남지 않았다.
 * 취소(AbortError)는 그대로 '취소'로 끝나야 하고, 그 밖의 실패만 넘어간다.
 *
 * 단, AbortError 가 전부 사용자의 취소는 아니다 — 회사 정책·보안 프로그램이 저장 창이나 쓰기를 막아도
 * 같은 오류가 온다. 그걸 취소로 읽으면 **파일도 안내도 없이** 끝난다.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const toastAdd = vi.fn()
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: toastAdd }) }))
const buildDocumentMock = vi.hoisted(() => vi.fn(async (): Promise<string> => '<html></html>'))
vi.mock('@/composables/useNewsletterDocument', () => ({
  useNewsletterDocument: () => ({ buildDocument: buildDocumentMock }),
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
    localStorage.clear() // '이 PC는 저장 창이 안 통한다'는 기억이 다음 테스트로 새지 않게
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

  it('저장을 누른 뒤 오류 없이 멈추면(쓰기가 끝나지 않음) 시간을 재서 일반 다운로드로 받는다', async () => {
    vi.useFakeTimers()
    ;(window as PickerWindow).showSaveFilePicker = async () => ({
      name: 'x.html',
      createWritable: () => new Promise(() => {}), // 끝나지 않는다
    })
    const pending = useNewsletterDownload().downloadHtml(true)
    await vi.advanceTimersByTimeAsync(8000)
    expect(await pending).toBe('triggered')
    expect(anchorClicks).toHaveLength(1)
    expect(toastAdd.mock.calls[0][0].detail).toContain('WriteStalled')
    vi.useRealTimers()
  })

  it('저장 창이 닫혀 화면으로 돌아왔는데 결과가 오지 않으면 일반 다운로드로 받는다', async () => {
    vi.useFakeTimers()
    ;(window as PickerWindow).showSaveFilePicker = () => new Promise(() => {})
    const pending = useNewsletterDownload().downloadHtml(false)
    await vi.advanceTimersByTimeAsync(0)
    window.dispatchEvent(new Event('blur')) // 저장 창이 떠서 화면이 focus 를 잃었다
    // 창이 떠 있는 동안에는 아무리 오래 걸려도 넘어가지 않는다
    await vi.advanceTimersByTimeAsync(60000)
    expect(anchorClicks).toHaveLength(0)
    window.dispatchEvent(new Event('focus'))
    await vi.advanceTimersByTimeAsync(4000)
    expect(await pending).toBe('triggered')
    expect(toastAdd.mock.calls[0][0].detail).toContain('PickerStalled')
    vi.useRealTimers()
  })

  it('사용자가 저장 창을 취소하면 아무것도 받지 않는다', async () => {
    ;(window as PickerWindow).showSaveFilePicker = async () => {
      window.dispatchEvent(new Event('blur')) // 저장 창이 떴다
      throw new DOMException('cancel', 'AbortError')
    }
    expect(await useNewsletterDownload().downloadHtml(false)).toBe('cancelled')
    expect(anchorClicks).toHaveLength(0)
    expect(toastAdd).not.toHaveBeenCalled()
  })

  it('창이 뜬 흔적을 못 잡았어도 한참 뒤에 온 취소는 사용자의 취소로 둔다', async () => {
    vi.useFakeTimers()
    ;(window as PickerWindow).showSaveFilePicker = () =>
      new Promise((_, reject) => setTimeout(() => reject(new DOMException('cancel', 'AbortError')), 3000))
    const pending = useNewsletterDownload().downloadHtml(false)
    await vi.advanceTimersByTimeAsync(3000)
    expect(await pending).toBe('cancelled')
    expect(anchorClicks).toHaveLength(0)
    vi.useRealTimers()
  })

  it("저장 창이 뜨지도 않고 곧바로 '취소'가 오면(정책·보안 프로그램) 일반 다운로드로 받는다", async () => {
    ;(window as PickerWindow).showSaveFilePicker = async () => {
      throw new DOMException('The user aborted a request.', 'AbortError')
    }
    expect(await useNewsletterDownload().downloadHtml(false)).toBe('triggered')
    expect(anchorClicks).toHaveLength(1)
    expect(toastAdd.mock.calls[0][0].detail).toContain('PickerBlocked')
  })

  it("'저장'을 누른 뒤 쓰기에서 '취소'가 오면(보안 차단) 취소가 아니라 일반 다운로드로 받는다", async () => {
    ;(window as PickerWindow).showSaveFilePicker = async () => {
      window.dispatchEvent(new Event('blur'))
      return {
        name: 'x.html',
        createWritable: async () => ({
          write: async () => {},
          close: async () => {
            throw new DOMException('Blocked by Safe Browsing.', 'AbortError')
          },
        }),
      }
    }
    expect(await useNewsletterDownload().downloadHtml(true)).toBe('triggered')
    expect(anchorClicks).toHaveLength(1)
    expect(toastAdd.mock.calls[0][0].detail).toContain('WriteAborted')
  })

  it('저장 창이 뜨지 않고 결과도 오지 않으면 시간을 재서 일반 다운로드로 받는다', async () => {
    vi.useFakeTimers()
    vi.spyOn(document, 'hasFocus').mockReturnValue(true) // 화면이 focus 를 잃은 적이 없다 = 창이 안 떴다
    ;(window as PickerWindow).showSaveFilePicker = () => new Promise(() => {})
    const pending = useNewsletterDownload().downloadHtml(false)
    await vi.advanceTimersByTimeAsync(5000)
    expect(await pending).toBe('triggered')
    expect(toastAdd.mock.calls[0][0].detail).toContain('PickerNotShown')
    vi.useRealTimers()
  })

  it('저장 창이 통하지 않았던 PC는 다음부터 기다리지 않고 바로 일반 다운로드로 받는다', async () => {
    const picker = vi.fn(async () => {
      throw new DOMException('The user aborted a request.', 'AbortError')
    })
    ;(window as PickerWindow).showSaveFilePicker = picker
    await useNewsletterDownload().downloadHtml(false) // 막힘 → 기억
    expect(await useNewsletterDownload().downloadHtml(false)).toBe('triggered')
    expect(picker).toHaveBeenCalledTimes(1) // 두 번째는 저장 창을 부르지 않았다
    expect(anchorClicks).toHaveLength(2)
  })

  it('폴더 권한 같은 한 번짜리 오류는 기억하지 않는다 — 다음에는 다시 저장 창을 쓴다', async () => {
    const picker = vi.fn(async () => {
      throw new DOMException('denied', 'NotAllowedError')
    })
    ;(window as PickerWindow).showSaveFilePicker = picker
    await useNewsletterDownload().downloadHtml(false)
    await useNewsletterDownload().downloadHtml(false)
    expect(picker).toHaveBeenCalledTimes(2)
  })

  it('받는 중에 또 누르면 겹쳐 돌리지 않는다', async () => {
    let cancel: () => void = () => {}
    const picker = vi.fn(() => {
      window.dispatchEvent(new Event('blur'))
      return new Promise((_, reject) => (cancel = () => reject(new DOMException('cancel', 'AbortError'))))
    })
    ;(window as PickerWindow).showSaveFilePicker = picker
    const { downloadHtml, isDownloading } = useNewsletterDownload()
    const first = downloadHtml(false)
    await vi.waitFor(() => expect(picker).toHaveBeenCalledTimes(1))
    expect(isDownloading.value).toBe(true)
    expect(await useNewsletterDownload().downloadHtml(true)).toBe('busy')
    expect(picker).toHaveBeenCalledTimes(1)
    cancel()
    expect(await first).toBe('cancelled')
    expect(isDownloading.value).toBe(false)
  })

  it('파일을 만들지 못하면 실패를 알리고 사유를 집계에 남긴다', async () => {
    const track = vi.fn()
    ;(window as PickerWindow).umami = { track }
    buildDocumentMock.mockRejectedValueOnce(new Error("'ModuleImg' 모듈을 불러오지 못해 파일을 만들지 못했어요."))
    expect(await useNewsletterDownload().downloadHtml(false)).toBe('failed')
    expect(anchorClicks).toHaveLength(0)
    expect(toastAdd.mock.calls[0][0].severity).toBe('error')
    expect(track).toHaveBeenCalledWith('download_failed', { kind: 'send', stage: 'build', reason: 'Error' })
  })

  it('파일 만들기가 끝나지 않으면 끝없이 기다리지 않고 실패를 알린다', async () => {
    vi.useFakeTimers()
    buildDocumentMock.mockReturnValueOnce(new Promise(() => {}))
    const pending = useNewsletterDownload().downloadHtml(false)
    await vi.advanceTimersByTimeAsync(20000)
    expect(await pending).toBe('failed')
    expect(toastAdd.mock.calls[0][0].severity).toBe('error')
    vi.useRealTimers()
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
