/**
 * 웹 링크 리마인드 팝업 (Figma 1757-5327).
 *
 * 스토어 규칙은 `stores/__tests__/webLinkStore.test.ts`가 본다. 여기서는 **화면에 실제로
 * 뜨는지·닫히는지·반영이 걸려 있는지**만 확인한다 — 팝업은 AI 도구 밖에서만 보이는 물건이라
 * 평소 작업 중에는 눈에 띄지 않고, 배선이 끊겨도 한참 모른 채 지나가기 쉽다.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import WebLinkReminder from '../editor/WebLinkReminder.vue'
import { useWebLinkStore } from '@/stores/webLinkStore'

const createLink = vi.fn(async () => ({ status: 'updated' as const }))

const mountReminder = () =>
  mount(WebLinkReminder, { global: { plugins: [PrimeVue, ToastService] } })

describe('웹 링크 리마인드 팝업', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    createLink.mockClear()
  })

  /** 리마인드가 떠 있는 상태로 만든다 — 스토어 내부 규칙은 여기서 흉내 내지 않는다 */
  const openReminder = () => {
    const store = useWebLinkStore()
    store.existing = { url: 'https://example.com/a_send.html', name: 'a_send.html', at: new Date() }
    store.contentChanged = true
    store.createLink = createLink
    return store
  }

  it('평소에는 아무것도 그리지 않는다', () => {
    const wrapper = mountReminder()
    expect(wrapper.find('.wlr').exists()).toBe(false)
  })

  it('낡았을 때 Figma 문구 그대로 뜬다', async () => {
    openReminder()
    const wrapper = mountReminder()
    await flushPromises()

    const text = wrapper.find('.wlr-text').text().replace(/\s+/g, ' ')
    expect(text).toBe('뉴스레터 내용이 변경되었어요. HTML 링크에 최신 내용 반영할까요?')
    expect(wrapper.find('.wlr-btn').text()).toBe('반영하기')
    expect(wrapper.find('.wlr-close').exists()).toBe(true)
  })

  it('반영하기를 누르면 링크를 다시 올린다', async () => {
    openReminder()
    const wrapper = mountReminder()
    await flushPromises()

    await wrapper.find('.wlr-btn').trigger('click')
    await flushPromises()

    expect(createLink).toHaveBeenCalledTimes(1)
  })

  it('X로 닫으면 사라진다', async () => {
    const store = openReminder()
    const wrapper = mountReminder()
    await flushPromises()
    expect(wrapper.find('.wlr').exists()).toBe(true)

    await wrapper.find('.wlr-close').trigger('click')
    await flushPromises()

    expect(store.showReminder).toBe(false)
    expect(wrapper.find('.wlr').exists()).toBe(false)
  })

  it('올리는 중에는 버튼이 잠기고 진행을 알린다', async () => {
    const store = openReminder()
    store.uploading = true
    const wrapper = mountReminder()
    await flushPromises()

    const btn = wrapper.find('.wlr-btn')
    expect(btn.text()).toBe('반영하는 중…')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('AI 도구에서 같은 안내를 보고 있으면 뜨지 않는다', async () => {
    const store = openReminder()
    store.toolOpen = true
    const wrapper = mountReminder()
    await flushPromises()

    expect(wrapper.find('.wlr').exists()).toBe(false)
  })
})
