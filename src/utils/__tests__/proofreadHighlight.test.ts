/**
 * 캔버스 표시용 Range 찾기 — 그려진 모듈 DOM 에서 카드의 구절 자리를 정확히 집는지.
 * (Highlight 등록 자체는 jsdom 에 CSS.highlights 가 없어 조용히 건너뛴다 — isHighlightSupported 가 막는다)
 */
import { describe, expect, it } from 'vitest'
import type { ProofreadSuggestion } from '@/utils/newsletterProofread'
import type { TranslationUnit } from '@/utils/newsletterTranslation'
import {
  findSuggestionRange,
  isHighlightSupported,
  setModuleHighlights,
} from '@/utils/proofreadHighlight'

const unit = {
  id: 'm1:properties.body',
  moduleInstanceId: 'm1',
  moduleName: '텍스트',
  category: 'text',
  propertyLabel: '본문',
  path: ['properties', 'body'],
  source: '',
} satisfies TranslationUnit

const card = (over: Partial<ProofreadSuggestion>): ProofreadSuggestion => ({
  id: 'm1#0',
  unit,
  lang: 'ko',
  original: '개최 됩니다',
  corrected: '개최됩니다',
  reason: '',
  before: '',
  after: '',
  accepted: true,
  ...over,
})

const mount = (html: string): HTMLElement => {
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

describe('findSuggestionRange', () => {
  it('태그 경계를 걸친 구절도 하나의 Range 로 집는다', () => {
    const root = mount('<table><tr><td><p>상담회가 <strong>개최</strong> 됩니다!</p></td></tr></table>')
    const range = findSuggestionRange(root, card({ before: '상담회가 ', after: '!' }))
    expect(range?.toString()).toBe('개최 됩니다')
  })

  it('같은 구절이 여러 번 있으면 카드의 앞뒤 글과 맞는 자리를 고른다', () => {
    const root = mount('<p>첫째 개최 됩니다. 둘째 개최 됩니다!</p>')
    const range = findSuggestionRange(root, card({ before: '…째 ', after: '!' }))
    expect(range?.toString()).toBe('개최 됩니다')
    expect(range?.startOffset).toBe('첫째 개최 됩니다. 둘째 '.length)
  })

  it('앞뒤 글이 안 맞으면 첫 자리를 쓰고, 구절이 없으면 null', () => {
    const root = mount('<p>개최 됩니다 (안내)</p>')
    expect(findSuggestionRange(root, card({ before: '없는 앞글 ', after: '' }))?.startOffset).toBe(0)
    expect(findSuggestionRange(root, card({ original: '없는 구절' }))).toBeNull()
  })

  it('표 셀처럼 nbsp 가 든 글에서도 찾고, 영어 구절은 단어 경계만 본다', () => {
    const root = mount('<table><tr><td>변경될수 있습니다</td></tr></table><p>Then the end</p>')
    expect(findSuggestionRange(root, card({ original: '변경될수 있습니다' }))?.toString()).toBe('변경될수 있습니다')
    const en = findSuggestionRange(root, card({ original: 'the', lang: 'en' }))
    expect(en?.startOffset).toBe(5)
  })

  it('Highlight API 가 없는 환경에서는 등록을 건너뛴다', () => {
    expect(isHighlightSupported()).toBe(false)
    expect(() => setModuleHighlights('m1', mount('<p>개최 됩니다</p>'), [card({})], null)).not.toThrow()
  })
})
