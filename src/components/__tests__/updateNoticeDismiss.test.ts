/**
 * 업데이트 공지 모달 — '오늘 하루 보지 않기'가 실제로 하루만 숨기는지.
 *
 * 모달이 뜨는 조건과 꺼 두는 기록이 서로 어긋나면 (키 이름·날짜 형식 등)
 * 공지가 아예 안 뜨거나, 껐는데도 매번 다시 뜬다. 둘 다 배포 뒤에야 드러나서
 * 손쓸 수 없으므로 여기서 잡는다.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import PrimeVue from 'primevue/config'
import Dialog from 'primevue/dialog'
import Checkbox from 'primevue/checkbox'
import UpdateNoticeModal from '../UpdateNoticeModal.vue'

const STORAGE_KEY = 'update-notice-dismissed'

/** 공지가 살아 있는 기간 안의 시각 (배포일 2026-09-28 18:00 이전) */
const DURING = new Date('2026-09-22T10:00:00+09:00')
const NEXT_DAY = new Date('2026-09-23T10:00:00+09:00')

const makeRouter = () =>
  createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'landing', component: { template: '<div />' } },
      { path: '/design', name: 'templates', component: { template: '<div />' } },
    ],
  })

const mountAt = async (path: string) => {
  const router = makeRouter()
  await router.push(path)
  await router.isReady()

  const wrapper = mount(UpdateNoticeModal, {
    global: {
      plugins: [router, PrimeVue],
      components: { Dialog, Checkbox },
      // Dialog는 body로 teleport 한다 — 붙여 두면 wrapper 안에서 찾을 수 있다
      stubs: { teleport: true },
    },
  })
  await flushPromises()
  return wrapper
}

type Wrapper = Awaited<ReturnType<typeof mountAt>>

/** 모달이 화면에 떠 있는지 */
const isOpen = (wrapper: Wrapper): boolean =>
  wrapper.text().includes('뉴스레터 빌더가 9월 28일 새롭게 바뀝니다')

const check = (wrapper: Wrapper) => wrapper.findComponent(Checkbox).setValue(true)

/** 푸터의 '확인'을 누른다 */
const clickConfirm = async (wrapper: Wrapper) => {
  const confirm = wrapper.findAll('button').find((b) => b.text() === '확인')
  if (!confirm) throw new Error("'확인' 버튼을 찾지 못했다")
  await confirm.trigger('click')
  await flushPromises()
}

/**
 * X·ESC·바깥 클릭으로 닫는 경우 — 어느 쪽이든 Dialog는 update:visible(false)를 낸다.
 * (`@hide`는 닫힘 애니메이션이 있어야 나오는 신호라 이 환경에서는 오지 않는다)
 */
const closeFromDialog = async (wrapper: Wrapper) => {
  wrapper.findComponent(Dialog).vm.$emit('update:visible', false)
  await flushPromises()
}

describe("업데이트 공지 '오늘 하루 보지 않기'", () => {
  beforeEach(() => {
    localStorage.clear()
    // ⚠ Date만 바꾼다 — 타이머까지 통째로 가짜로 두면 Vue의 닫힘 전환(requestAnimationFrame)이
    //   멈춰 Dialog가 hide를 내보내지 못하고, 멀쩡한 코드가 실패로 보인다.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(DURING)
  })

  it('처음 오면 템플릿 선택 화면에서 뜬다', async () => {
    expect(isOpen(await mountAt('/design'))).toBe(true)
  })

  it('랜딩에서는 뜨지 않는다', async () => {
    expect(isOpen(await mountAt('/'))).toBe(false)
  })

  /**
   * 주의 문구는 굵은 앞머리·붉은 버튼 이름·줄바꿈이 한 문단에 섞인다.
   * 태그 사이 줄바꿈이 빈칸으로 새거나 반대로 글자가 붙는 일이 잦아 실제 결과를 못 박아 둔다.
   */
  it('주의 문구가 띄어쓰기 그대로 나오고, 버튼 이름은 따로 표시된다', async () => {
    const wrapper = await mountAt('/design')
    const first = wrapper.findAll('.un-caution-text')[0]

    // 굵은 앞머리와 뒤 문장이 **한 칸 띄어** 이어진다.
    // (태그 사이 줄바꿈이 먹혀 '않습니다.브라우저'로 붙어 버리기 쉬운 자리다)
    expect(first.text()).toContain('저장되지 않습니다. 브라우저 창을')

    // <br>로 끊어 줄별로 본다 — 줄 안의 띄어쓰기가 살아 있는지.
    // 문구는 아직 다듬는 중이라 전문을 박지 않고, 버튼 이름이 든 줄만 확인한다.
    const lines = first
      .html()
      .split(/<br[^>]*>/) // scoped CSS 속성이 붙어 `<br data-v-…="">`로 나온다
      .map((chunk) =>
        chunk
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim(),
      )
    expect(lines.length).toBeGreaterThan(1)
    expect(lines).toContain(
      '중요한 작업은 [임시 저장] 버튼으로 서버에 임시 저장하거나, [저장용 내보내기]로 저장해 주세요.',
    )
    expect(first.findAll('.un-key').map((k) => k.text())).toEqual([
      '[임시 저장]',
      '[저장용 내보내기]',
    ])

    // 붉은색은 '지금 안 누르면 잃는다'는 뜻으로만 쓴다 — 알아 두기만 하면 되는 줄은 칠하지 않는다.
    // 대괄호는 남아 있어야 버튼 이름인 줄 알아본다.
    const second = wrapper.findAll('.un-caution-text')[1]
    expect(second.text()).toContain('[파일 열기]')
    expect(second.findAll('.un-key')).toHaveLength(0)
  })

  it("체크하고 '확인'을 누르면 오늘 날짜가 기록된다", async () => {
    const wrapper = await mountAt('/design')
    await check(wrapper)
    await clickConfirm(wrapper)

    expect(localStorage.getItem(STORAGE_KEY)).toBe(
      'v2.1-upload-tempsave-translate-weblink:2026-09-22',
    )
  })

  // X·ESC·바깥 클릭은 모두 Dialog가 update:visible(false)로 알린다.
  // 확인 버튼에만 걸려 있으면 이 경로로 닫은 사람은 체크하고도 다시 보게 된다.
  it('X·ESC로 닫아도 기록된다', async () => {
    const wrapper = await mountAt('/design')
    await check(wrapper)
    await closeFromDialog(wrapper)

    expect(localStorage.getItem(STORAGE_KEY)).toBe(
      'v2.1-upload-tempsave-translate-weblink:2026-09-22',
    )
  })

  it('체크하지 않고 닫으면 아무것도 기록하지 않는다', async () => {
    const wrapper = await mountAt('/design')
    await clickConfirm(wrapper)

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('같은 날 다시 들어오면 뜨지 않는다', async () => {
    const first = await mountAt('/design')
    await check(first)
    await clickConfirm(first)

    expect(isOpen(await mountAt('/design'))).toBe(false)
  })

  it('다음 날에는 다시 뜬다 — 하루만 숨기는 것이 요점이다', async () => {
    const first = await mountAt('/design')
    await check(first)
    await clickConfirm(first)

    vi.setSystemTime(NEXT_DAY)
    expect(isOpen(await mountAt('/design'))).toBe(true)
  })

  // 날짜로 저절로 사라지게 두지 않았다 — 배포가 예정 시각보다 늦어지면 정작 안내가
  // 필요한 동안 아무것도 뜨지 않기 때문이다. 대신 9/28 머지 때 컴포넌트를 지운다.
  it('배포 예정 시각이 지나도 계속 뜬다 — 지우는 것은 사람이 한다', async () => {
    vi.setSystemTime(new Date('2026-09-28T18:00:01+09:00'))
    expect(isOpen(await mountAt('/design'))).toBe(true)
  })
})
