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
import { isWebViewModule, useWebLinkStore } from '@/stores/webLinkStore'
import { useModuleStore } from '@/stores/moduleStore'
import type { ModuleInstance } from '@/types'

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

const webViewHtml =
  '<p><a href="#" target="_blank" style="color:#333333;">👀 웹으로 보기</a></p>'
const descText = (over: Partial<ModuleInstance>): ModuleInstance => ({
  id: 'm-web',
  moduleId: 'ModuleDescText',
  order: 0,
  styles: {},
  properties: { descriptionText: webViewHtml },
  groupId: 'g-header',
  ...over,
})

describe('isWebViewModule — 헤더의 "웹으로 보기"만', () => {
  it('그룹 안의 설명 텍스트에 웹으로 보기 링크가 있으면 맞다', () => {
    expect(isWebViewModule(descText({}))).toBe(true)
    expect(isWebViewModule(descText({ properties: { descriptionText: '<p><a href="#">웹에서 보기</a></p>' } }))).toBe(true)
  })
  it('레거시 뉴스 헤드라인 헤더 모듈도 맞다', () => {
    expect(isWebViewModule(descText({ moduleId: 'ModuleNewsHeader', groupId: undefined, properties: {} }))).toBe(true)
  })
  it('그룹 밖의 설명 텍스트·다른 글·다른 모듈은 아니다', () => {
    expect(isWebViewModule(descText({ groupId: undefined }))).toBe(false)
    expect(isWebViewModule(descText({ properties: { descriptionText: '<p>안녕하세요</p>' } }))).toBe(false)
    expect(isWebViewModule(descText({ moduleId: 'ModuleImg' }))).toBe(false)
    expect(isWebViewModule(null)).toBe(false)
  })
})

describe('웹으로 보기 링크 생성 안내 (Figma 1964-11113 · 1971-11436)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    createLink.mockClear()
  })

  /** 헤더의 '웹으로 보기'를 고른 상태. 업로드 주소가 없는 테스트 환경이라 enabled 를 켜 둔다 */
  const selectWebView = () => {
    const modules = useModuleStore()
    modules.modules = [descText({})]
    modules.selectedModuleId = 'm-web'
    const store = useWebLinkStore()
    // 테스트 환경에는 업로드 주소가 없다 — 켜진 것으로 둔다
    store.enabled = true
    store.createLink = createLink
    return store
  }

  it('링크가 없으면 "생성할까요?"와 생성 버튼이 뜬다', async () => {
    selectWebView()
    const wrapper = mountReminder()
    await flushPromises()
    expect(wrapper.find('.wlr--prompt').exists()).toBe(true)
    expect(wrapper.find('.wlr-text').text()).toBe('HTML 웹 링크를 생성할까요?')
    expect(wrapper.find('.wlr-btn').text()).toBe('링크 생성하기')
  })

  it('생성하기를 누르면 링크를 만들고, 카드가 "생성되었어요 · 링크 복사"로 바뀐다', async () => {
    const store = selectWebView()
    createLink.mockImplementationOnce(async () => {
      store.existing = { url: 'https://example.com/a_send.html', name: 'a_send.html', at: new Date() }
      return { status: 'created' as const }
    })
    const wrapper = mountReminder()
    await flushPromises()
    await wrapper.find('.wlr-btn').trigger('click')
    await flushPromises()

    expect(createLink).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.wlr-text').text()).toContain('링크가 생성되었어요')
    expect(wrapper.find('.wlr-btn').text()).toBe('링크 복사')
  })

  it('링크가 이미 있으면 바로 복사 카드가 뜨고, 복사 버튼이 주소를 클립보드에 넣는다', async () => {
    const store = selectWebView()
    store.existing = { url: 'https://example.com/a_send.html', name: 'a_send.html', at: new Date() }
    const writeText = vi.fn(async () => {})
    // jsdom 의 navigator.clipboard 는 getter 뿐이라 정의를 덮어쓴다
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const wrapper = mountReminder()
    await flushPromises()
    expect(wrapper.find('.wlr-text').text()).toContain('HTML 웹 링크가 있어요')

    await wrapper.find('.wlr-btn').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('https://example.com/a_send.html')
    expect(wrapper.find('.wlr-btn').text()).toBe('복사했어요')
  })

  it('X로 닫으면 같은 모듈을 고른 채로는 다시 뜨지 않고, 다른 모듈을 고르면 사라진다', async () => {
    const store = selectWebView()
    const wrapper = mountReminder()
    await flushPromises()
    await wrapper.find('.wlr-close').trigger('click')
    await flushPromises()
    expect(store.showPrompt).toBe(false)
    expect(wrapper.find('.wlr').exists()).toBe(false)

    useModuleStore().selectedModuleId = null
    await flushPromises()
    expect(store.webViewSelected).toBe(false)
    expect(wrapper.find('.wlr').exists()).toBe(false)
  })

  it('AI 도구를 펼쳐 둔 동안이나 최신화 리마인드가 떠 있을 때는 생성 안내를 띄우지 않는다', async () => {
    const store = selectWebView()
    store.toolOpen = true
    const wrapper = mountReminder()
    await flushPromises()
    expect(wrapper.find('.wlr').exists()).toBe(false)

    store.toolOpen = false
    store.existing = { url: 'https://example.com/a_send.html', name: 'a_send.html', at: new Date() }
    store.contentChanged = true
    await flushPromises()
    expect(wrapper.find('.wlr--prompt').exists()).toBe(false)
    expect(wrapper.find('.wlr-btn').text()).toBe('반영하기')
  })
})
