/**
 * 세 걸음(템플릿 선택 → 폴더 선택 → 에디터)을 건너뛰지 못하게 하는 라우터 가드.
 *
 * 화면에서는 '다음' 버튼이 비활성이라 못 넘어가지만, 주소를 직접 치거나 뒤로가기로는
 * 넘어갈 수 있다 — 그때 이미지를 올릴 자리가 없는 채로 편집이 시작된다.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEditorStore } from '@/stores/editorStore'

// 화면은 이 테스트의 관심사가 아니다 — 가드만 태운다
vi.mock('@/views/LandingView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/TemplateSelectView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/FolderSelectView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/HomeView.vue', () => ({ default: { template: '<div />' } }))

const freshRouter = async () => {
  vi.resetModules()
  const { default: router } = await import('../index')
  return router
}

describe('흐름 가드', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('팀이 없으면 폴더 선택도 에디터도 막고 템플릿 선택으로 보낸다', async () => {
    const router = await freshRouter()
    await router.push('/editor')
    expect(router.currentRoute.value.name).toBe('templates')
    await router.push('/folder')
    expect(router.currentRoute.value.name).toBe('templates')
  })

  it('팀은 있고 폴더를 아직 안 골랐으면 에디터 대신 폴더 선택으로 보낸다', async () => {
    const router = await freshRouter()
    const editorStore = useEditorStore()
    editorStore.setCurrentTemplate({
      templateId: 'police',
      templateName: '국제치안산업대전',
      teamId: 'conv1',
    })

    await router.push('/folder')
    expect(router.currentRoute.value.name).toBe('folder')

    await router.push('/editor')
    expect(router.currentRoute.value.name).toBe('folder')
  })

  it('폴더까지 골랐으면 에디터로 들어간다', async () => {
    const router = await freshRouter()
    const editorStore = useEditorStore()
    editorStore.setCurrentTemplate({
      templateId: 'police',
      templateName: '국제치안산업대전',
      teamId: 'conv1',
    })
    editorStore.updateWrapSettings({ volume: 'vol01' })

    await router.push('/editor')
    expect(router.currentRoute.value.name).toBe('editor')
  })

  it('템플릿 선택·랜딩은 언제나 열린다', async () => {
    const router = await freshRouter()
    await router.push('/templates')
    expect(router.currentRoute.value.name).toBe('templates')
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('landing')
  })
})
