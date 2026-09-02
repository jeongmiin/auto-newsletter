/**
 * 비우는 두 가지 길이 무엇을 지우고 무엇을 남기는지.
 *
 * · 헤더 '전체 삭제'(`confirmClearHere`) — 이 폴더에 머문다. 내용은 전부 지우되
 *   **'어느 전시의 뉴스레터인가'는 남긴다**(소속 팀·템플릿 id·회차). 이미지 업로드 폴더
 *   (`/e-dm/{연도}/newsletterbuilder/{팀}/{전시회}/{회차}/`)가 계속 같은 자리를 가리켜야 하기 때문.
 * · 레일 '빈 템플릿'(`confirmBlankTemplate`) — 새 뉴스레터. 전시회·회차까지 비우고
 *   폴더 선택으로 되돌아간다. 팀만 남겨 그 화면이 지금 팀을 켠 채 열리게 한다.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

/** 확인 모달은 승인 콜백만 붙잡아 즉시 실행한다 (모달 UI는 이 테스트의 관심사가 아니다) */
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({
    require: (options: { accept?: () => void }) => options.accept?.(),
  }),
}))

/** 화면 이동은 라우터 없이 확인한다 — 어디로 보내는지만 보면 된다 */
const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

import { useBlankTemplate } from '@/composables/useBlankTemplate'
import { useEditorStore } from '@/stores/editorStore'
import { useModuleStore } from '@/stores/moduleStore'

describe('useBlankTemplate — 비울 때 남기는 것', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    push.mockClear()
  })

  it('템플릿 id와 팀 id는 남긴다 — 업로드 폴더가 같은 전시를 계속 가리키도록', () => {
    const editorStore = useEditorStore()
    editorStore.setCurrentTemplate({
      templateId: 'hobanexpo',
      templateName: '호반',
      teamId: 'arch-plan',
    })

    useBlankTemplate().confirmClearHere()

    expect(editorStore.currentTemplateId).toBe('hobanexpo')
    expect(editorStore.currentTeamId).toBe('arch-plan')
    // 보이는 이름만 바뀐다 — 내용은 비었으므로
    expect(editorStore.currentTemplateName).toBe('빈 템플릿')
  })

  it('모듈과 전체 스타일은 지운다', () => {
    const editorStore = useEditorStore()
    const moduleStore = useModuleStore()
    editorStore.setCurrentTemplate({
      templateId: 'hobanexpo',
      templateName: '호반',
      teamId: 'arch-plan',
    })
    editorStore.updateWrapSettings({
      backgroundColor: '#000000',
      summary: '앞 작업물 요약',
      volume: 'vol07',
    })

    useBlankTemplate().confirmClearHere()

    expect(moduleStore.modules).toHaveLength(0)
    expect(editorStore.wrapSettings.backgroundColor).toBe('#f9f9f9')
    expect(editorStore.wrapSettings.summary).toBe('')
    // 저장 폴더는 '무엇을 만드는가'가 아니라 '어디에 쌓는가'라 내용과 함께 지우지 않는다 —
    // 지우면 이어지는 업로드가 막히고 폴더 선택 걸음으로 되돌아가야 한다
    expect(editorStore.wrapSettings.volume).toBe('vol07')
  })

  it('비운 뒤에도 고른 폴더에 그대로 저장된다 (팀·전시회·회차 모두 유지)', async () => {
    const { buildUploadDirectory } = await import('@/utils/s3Upload')
    const editorStore = useEditorStore()
    editorStore.setCurrentTemplate({
      templateId: 'hobanexpo',
      templateName: '호반',
      teamId: 'arch-plan',
    })
    editorStore.updateWrapSettings({ volume: 'vol08' })

    useBlankTemplate().confirmClearHere()

    const at = new Date(2026, 7, 20)
    // 업로드 화면이 실제로 쓰는 값(uploadFolder = {팀}/{전시회})으로 확인한다
    expect(
      buildUploadDirectory(editorStore.uploadFolder, editorStore.wrapSettings.volume, at),
    ).toBe('/e-dm/2026/newsletterbuilder/arch-plan/hobanexpo/vol08/')
  })

  // `blank/`는 처음부터 팀에서 '빈 템플릿'으로 시작했을 때만 쓴다 —
  // 에디터 안에서 비우는 것은 '어느 전시인가'를 바꾸지 않는다
  it('에디터에서 비워도 blank 폴더로 옮겨가지 않는다', async () => {
    const { buildUploadDirectory } = await import('@/utils/s3Upload')
    const editorStore = useEditorStore()
    editorStore.setCurrentTemplate({
      templateId: 'kpet',
      templateName: '케이펫',
      teamId: 'pet-ind',
    })
    editorStore.updateWrapSettings({ volume: 'vol03' })

    useBlankTemplate().confirmClearHere()

    expect(editorStore.currentTemplateId).toBe('kpet')
    expect(buildUploadDirectory(editorStore.uploadFolder, editorStore.wrapSettings.volume)).toContain(
      '/pet-ind/kpet/vol03/',
    )
  })

  it('팀에서 빈 템플릿으로 시작했을 때만 blank 폴더를 쓴다', async () => {
    const { buildUploadDirectory } = await import('@/utils/s3Upload')
    const editorStore = useEditorStore()
    // 템플릿 선택 화면의 '빈 템플릿' 카드 = 템플릿 id 없이 팀만 들고 온다
    editorStore.setCurrentTemplate({ templateId: null, templateName: '빈 템플릿', teamId: 'mice' })
    editorStore.updateWrapSettings({ volume: 'vol01' })

    useBlankTemplate().confirmClearHere()

    expect(buildUploadDirectory(editorStore.uploadFolder, editorStore.wrapSettings.volume)).toContain(
      '/mice/blank/vol01/',
    )
  })
})

describe('useBlankTemplate — 레일 빈 템플릿(새로 시작)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    push.mockClear()
  })

  it('전시회와 저장 폴더를 비우고 폴더 선택으로 보낸다 — 팀은 남긴다', () => {
    const editorStore = useEditorStore()
    const moduleStore = useModuleStore()
    editorStore.setCurrentTemplate({
      templateId: 'hobanexpo',
      templateName: '호반',
      teamId: 'arch-plan',
    })
    editorStore.updateWrapSettings({ volume: 'vol08', summary: '앞 작업물 요약' })

    useBlankTemplate().confirmBlankTemplate()

    expect(moduleStore.modules).toHaveLength(0)
    expect(editorStore.wrapSettings.summary).toBe('')
    // 어디에 쌓을지 다시 고르러 가므로 회차도 비운다
    expect(editorStore.wrapSettings.volume).toBe('')
    expect(editorStore.currentTemplateId).toBeNull()
    // 팀은 그대로 — 폴더 선택 화면이 이 팀을 켠 채 열린다
    expect(editorStore.currentTeamId).toBe('arch-plan')
    expect(editorStore.currentTemplateName).toBe('빈 템플릿')
    expect(push).toHaveBeenCalledWith({ name: 'folder' })
  })

  it('팀만 남으므로 다음 저장 자리는 그 팀의 blank 폴더다', async () => {
    const { buildUploadDirectory } = await import('@/utils/s3Upload')
    const editorStore = useEditorStore()
    editorStore.setCurrentTemplate({
      templateId: 'kpet',
      templateName: '케이펫',
      teamId: 'pet-ind',
    })
    editorStore.updateWrapSettings({ volume: 'vol03' })

    useBlankTemplate().confirmBlankTemplate()

    // 폴더 선택에서 vol01을 고르면 이 자리가 된다
    expect(buildUploadDirectory(editorStore.uploadFolder, 'vol01')).toContain('/pet-ind/blank/vol01/')
  })

  it('빈 템플릿 표시가 서 있어야 폴더 선택 가드를 통과한다', () => {
    const editorStore = useEditorStore()
    editorStore.setCurrentTemplate({
      templateId: 'kpet',
      templateName: '케이펫',
      teamId: 'pet-ind',
    })
    expect(editorStore.isBlankStart).toBe(false)

    useBlankTemplate().confirmBlankTemplate()

    expect(editorStore.isBlankStart).toBe(true)
  })
})
