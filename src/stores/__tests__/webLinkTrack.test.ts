import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trackWebLink, type WebLinkResult } from '../webLinkStore'

/**
 * 웹 링크 결과 → Umami 이벤트 대응.
 *
 * 이벤트 이름과 '성공만 센다'는 규칙은 대시보드가 기대는 약속이라, 바뀌면 지표가 조용히 끊긴다.
 * (스토어 자체는 S3 호출이 얽혀 있어 여기서는 순수 함수인 대응만 본다)
 */
describe('trackWebLink', () => {
  const umamiTrack = vi.fn()

  beforeEach(() => {
    umamiTrack.mockClear()
    ;(window as any).umami = { track: umamiTrack }
  })

  it('처음 만들면 web_link_create, 다시 반영하면 web_link_refresh 로 센다', () => {
    trackWebLink({ status: 'created' }, 'panel')
    trackWebLink({ status: 'updated' }, 'reminder')

    expect(umamiTrack).toHaveBeenNthCalledWith(1, 'web_link_create', { source: 'panel' })
    expect(umamiTrack).toHaveBeenNthCalledWith(2, 'web_link_refresh', { source: 'reminder' })
  })

  it('실패·건너뜀·조건 미충족은 세지 않는다', () => {
    const notCounted: WebLinkResult[] = [
      { status: 'no-modules' },
      { status: 'no-volume' },
      { status: 'failed', message: 'x' },
      { status: 'skipped' },
    ]
    notCounted.forEach((r) => trackWebLink(r, 'panel'))

    expect(umamiTrack).not.toHaveBeenCalled()
  })

  it('Umami 스크립트가 없으면 조용히 넘어간다', () => {
    delete (window as any).umami
    expect(() => trackWebLink({ status: 'created' }, 'panel')).not.toThrow()
  })
})
