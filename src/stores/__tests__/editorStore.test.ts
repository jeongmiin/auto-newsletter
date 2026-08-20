/**
 * 전체 스타일(wrapSettings) — 기본값 복귀와 포인트 색상 팔레트 규칙.
 *
 * '빈 템플릿'·'전체 삭제'는 모듈만 지우는 게 아니라 전체 스타일도 처음 값으로 돌린다.
 * (안 그러면 앞 작업물의 배경색·뉴스레터 요약이 빈 템플릿에 그대로 묻어난다)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEditorStore } from '@/stores/editorStore'

describe('editorStore — 전체 스타일 초기화', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('바꿔 둔 배경색·요약·포인트 색상이 모두 기본값으로 돌아간다', () => {
    const store = useEditorStore()
    const defaults = { ...store.wrapSettings }

    store.updateWrapSettings({
      backgroundColor: '#000000',
      summary: '앞서 작업하던 뉴스레터입니다.',
      borderEnabled: true,
      borderWidth: '10px',
      fontLanguage: 'en',
      pointColors: ['#ff0000', '#00ff00'],
    })
    expect(store.wrapSettings.backgroundColor).toBe('#000000')

    store.resetWrapSettings()

    expect(store.wrapSettings).toEqual(defaults)
    expect(store.wrapSettings.summary).toBe('')
    expect(store.wrapSettings.pointColors).toEqual(['#2563eb'])
  })

  it('되돌린 뒤 다시 바꿔도 기본값 객체가 오염되지 않는다', () => {
    const store = useEditorStore()

    store.resetWrapSettings()
    store.updateWrapSettings({ backgroundColor: '#123456' })
    store.resetWrapSettings()

    expect(store.wrapSettings.backgroundColor).toBe('#f9f9f9')
  })
})
