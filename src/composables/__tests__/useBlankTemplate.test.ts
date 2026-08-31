/**
 * '빈 템플릿'·'전체 삭제'가 무엇을 지우고 무엇을 남기는지.
 *
 * 내용은 전부 지우되 **'어느 전시의 뉴스레터인가'는 남긴다** — 소속 팀과 템플릿 id.
 * 이미지 업로드 폴더(`/e-dm/{연도}/{템플릿id}/{회차}/`)가 계속 같은 전시를 가리켜야 하기 때문.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

/** 확인 모달은 승인 콜백만 붙잡아 즉시 실행한다 (모달 UI는 이 테스트의 관심사가 아니다) */
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({
    require: (options: { accept?: () => void }) => options.accept?.(),
  }),
}))

import { useBlankTemplate } from '@/composables/useBlankTemplate'
import { useEditorStore } from '@/stores/editorStore'
import { useModuleStore } from '@/stores/moduleStore'

describe('useBlankTemplate — 비울 때 남기는 것', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('템플릿 id와 팀 id는 남긴다 — 업로드 폴더가 같은 전시를 계속 가리키도록', () => {
    const editorStore = useEditorStore()
    editorStore.setCurrentTemplate({
      templateId: 'hobanexpo',
      templateName: '호반',
      teamId: 'arch-plan',
    })

    useBlankTemplate().confirmBlankTemplate()

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

    useBlankTemplate().confirmBlankTemplate()

    expect(moduleStore.modules).toHaveLength(0)
    expect(editorStore.wrapSettings.backgroundColor).toBe('#f9f9f9')
    expect(editorStore.wrapSettings.summary).toBe('')
    // 회차는 발행 건마다 다르므로 비운다 — 앞 회차 폴더에 새 이미지가 섞이지 않도록
    expect(editorStore.wrapSettings.volume).toBe('')
  })

  it('업로드 폴더는 전시 폴더까지 유지되고 회차만 다시 받는다', async () => {
    const { buildUploadDirectory } = await import('@/utils/s3Upload')
    const editorStore = useEditorStore()
    editorStore.setCurrentTemplate({
      templateId: 'hobanexpo',
      templateName: '호반',
      teamId: 'arch-plan',
    })

    useBlankTemplate().confirmBlankTemplate()

    const at = new Date(2026, 7, 20)
    // 회차를 비워 둔 동안에는 업로드가 막힌다
    expect(
      buildUploadDirectory(editorStore.currentTemplateId, editorStore.wrapSettings.volume, at),
    ).toBeNull()
    // 회차를 새로 적으면 같은 전시 폴더 아래로 이어진다
    editorStore.updateWrapSettings({ volume: 'vol08' })
    expect(
      buildUploadDirectory(editorStore.currentTemplateId, editorStore.wrapSettings.volume, at),
    ).toBe('/e-dm/2026/hobanexpo/vol08/')
  })
})
