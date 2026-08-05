/**
 * "전체 스타일 > 뉴스레터 요약" → 래퍼 테이블의 summary 속성.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'

global.fetch = vi.fn()

/** 모듈 없이 래퍼만 렌더한다 (모듈 템플릿 fetch가 필요 없다) */
const renderWrap = async (summary?: string): Promise<string> => {
  const editorStore = useEditorStore()
  editorStore.updateWrapSettings({ summary })
  return useModuleStore().generateHtml(false)
}

/** 래퍼 테이블 여는 태그만 뽑는다 */
const wrapTag = (html: string): string => /<table[^>]*class="wrap"[^>]*>/.exec(html)?.[0] ?? ''

describe('뉴스레터 요약 → 래퍼 테이블 summary', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('요약을 쓰면 래퍼 테이블에 summary 속성이 붙는다', async () => {
    const html = await renderWrap('고카프 전시 뉴스레터입니다.')
    expect(wrapTag(html)).toContain('summary="고카프 전시 뉴스레터입니다."')
  })

  it('요약이 비어 있으면 summary 속성을 넣지 않는다', async () => {
    expect(wrapTag(await renderWrap(''))).not.toContain('summary=')
  })

  it('공백만 있으면 summary 속성을 넣지 않는다', async () => {
    expect(wrapTag(await renderWrap('   '))).not.toContain('summary=')
  })

  it('요약을 지정하지 않아도 summary 속성이 없다', async () => {
    expect(wrapTag(await renderWrap(undefined))).not.toContain('summary=')
  })

  it('앞뒤 공백은 다듬어 넣는다', async () => {
    expect(wrapTag(await renderWrap('  전시 뉴스레터  '))).toContain('summary="전시 뉴스레터"')
  })

  it('따옴표·꺾쇠가 들어가도 속성이 깨지지 않게 이스케이프한다', async () => {
    const tag = wrapTag(await renderWrap('"고카프" <킨텍스> & 캠핑'))
    expect(tag).toContain('summary="&quot;고카프&quot; &lt;킨텍스&gt; &amp; 캠핑"')
    // 속성값 안의 따옴표가 태그를 조기 종료시키지 않아야 한다
    expect(tag.endsWith('>')).toBe(true)
  })

  it('완전한 HTML 문서로 내보낼 때도 붙는다', async () => {
    const editorStore = useEditorStore()
    editorStore.updateWrapSettings({ summary: '전시 뉴스레터입니다.' })
    const doc = await useModuleStore().generateHtml(true)
    expect(wrapTag(doc)).toContain('summary="전시 뉴스레터입니다."')
    expect(doc).toContain('<!DOCTYPE html>')
  })
})
