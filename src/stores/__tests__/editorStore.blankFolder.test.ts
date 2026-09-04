/**
 * 빈 템플릿의 업로드 폴더 — 폴더 선택의 팀 폴더 목록에서 고른 전시회 폴더를 따른다.
 *
 * 예전에는 빈 템플릿이 전부 `{팀}/blank/`로 갔다. 이제 팀 폴더 안의 전시회 폴더를 고르면
 * 그 폴더가 전시회 자리가 되고, 못 골랐을 때만 `blank/`로 떨어진다.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEditorStore } from '@/stores/editorStore'
import { buildUploadDirectory } from '@/utils/s3Upload'

describe('editorStore.blankFolder — 빈 템플릿의 전시회 폴더', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('고르기 전에는 blank/ 로 간다', () => {
    const store = useEditorStore()
    store.setCurrentTemplate({ templateId: null, templateName: '빈 템플릿', teamId: 'arch-plan' })
    expect(store.uploadFolder).toBe('arch-plan/blank')
  })

  it('전시회 폴더를 고르면 그 폴더가 업로드 경로의 전시회 자리가 된다', () => {
    const store = useEditorStore()
    store.setCurrentTemplate({ templateId: null, templateName: '빈 템플릿', teamId: 'arch-plan' })
    store.setBlankFolder('hobanexpo')
    expect(store.uploadFolder).toBe('arch-plan/hobanexpo')
    expect(buildUploadDirectory(store.uploadFolder, 'vol02', new Date(2026, 8, 3))).toBe(
      '/e-dm/2026/newsletterbuilder/arch-plan/hobanexpo/vol02/',
    )
  })

  it('템플릿으로 시작했으면 고른 폴더가 있어도 템플릿 id가 우선한다', () => {
    const store = useEditorStore()
    store.setCurrentTemplate({ templateId: 'nextcon', templateName: '넥스트콘', teamId: 'arch-plan' })
    store.setBlankFolder('hobanexpo')
    expect(store.uploadFolder).toBe('arch-plan/nextcon')
  })

  it('팀을 바꾸거나 템플릿을 다시 고르면 고른 폴더는 비워진다', () => {
    const store = useEditorStore()
    store.setCurrentTemplate({ templateId: null, templateName: '빈 템플릿', teamId: 'arch-plan' })
    store.setBlankFolder('hobanexpo')
    store.setCurrentTeam('mice')
    expect(store.blankFolder).toBeNull()
    expect(store.uploadFolder).toBe('mice/blank')

    store.setBlankFolder('gocaf')
    store.setCurrentTemplate({ templateId: null, templateName: '빈 템플릿', teamId: 'mice' })
    expect(store.blankFolder).toBeNull()
  })
})
