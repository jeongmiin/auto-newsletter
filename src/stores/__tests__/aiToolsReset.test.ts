/**
 * AI 도구 결과는 다른 뉴스레터로 넘어가면 버린다.
 *
 * 번역·맞춤법 검사 결과는 메뉴를 옮겨도 남도록 스토어에 두는데, 그 때문에 **다른 템플릿을 열어도**
 * 앞 템플릿의 결과 카드가 그대로 보이던 일이 있었다(2026-10-08). 새 뉴스레터는 어떤 길로 시작하든
 * (템플릿 선택·빈 템플릿·파일 열기) moduleStore.clearAll()을 거치므로 그걸 신호로 비운다.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useModuleStore } from '../moduleStore'
import { useProofreadStore } from '../proofreadStore'
import { useTranslationStore } from '../translationStore'
import type { TranslationUnit } from '@/utils/newsletterTranslation'

const unit: TranslationUnit = {
  id: 'm-1:properties.body',
  moduleInstanceId: 'm-1',
  moduleName: '설명 텍스트',
  category: 'text',
  propertyLabel: '본문',
  path: ['properties', 'body'],
  source: '참가신청 및 부스타입',
}

describe('AI 도구 결과 초기화', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('맞춤법 검사 결과·화면 상태는 새 뉴스레터를 시작하면 비워진다', () => {
    const moduleStore = useModuleStore()
    const proofread = useProofreadStore()
    proofread.panelOpen = true
    proofread.suggestions = [
      { id: 'm-1#0', unit, original: '부스타입', corrected: '부스 타입', reason: '띄어쓰기', before: '참가신청 및 ', after: '', accepted: true },
    ]
    proofread.selectedId = 'm-1#0'
    proofread.clean = false

    moduleStore.clearAll()

    expect(proofread.suggestions).toEqual([])
    expect(proofread.selectedId).toBeNull()
    expect(proofread.hasResult).toBe(false)
    // 다음 템플릿에서 AI 도구를 열면 결과 화면이 아니라 도구 메뉴부터
    expect(proofread.panelOpen).toBe(false)
  })

  it('번역 결과도 같은 규칙으로 비워진다', () => {
    const moduleStore = useModuleStore()
    const translation = useTranslationStore()
    translation.panelOpen = true
    translation.preview = [{ ...unit, translated: 'Booth type' }]

    moduleStore.clearAll()

    expect(translation.preview).toEqual([])
    expect(translation.hasResult).toBe(false)
    expect(translation.panelOpen).toBe(false)
  })

  it('템플릿을 불러올 때도 비워진다 — loadTemplate 안의 clearAll 은 스토어 밖 호출이 아니라 따로 봐야 한다', async () => {
    const moduleStore = useModuleStore()
    const proofread = useProofreadStore()
    proofread.panelOpen = true
    proofread.clean = true
    // 템플릿 목차가 없어 실패로 끝나지만, 액션이 불린 시점에 결과를 비우는지가 요점이다
    await moduleStore.loadTemplate('nextcon').catch(() => false)
    expect(proofread.clean).toBe(false)
    expect(proofread.panelOpen).toBe(false)
  })

  it('고친 곳이 없던 검사 결과(clean)도 다음 뉴스레터로 넘어가지 않는다', () => {
    const moduleStore = useModuleStore()
    const proofread = useProofreadStore()
    proofread.clean = true

    moduleStore.clearAll()

    expect(proofread.clean).toBe(false)
  })
})
