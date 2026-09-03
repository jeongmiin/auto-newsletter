/**
 * Umami — 빌더 화면의 방문자 수와 버튼 클릭 수를 재는 가벼운 분석 스크립트.
 * 스크립트 자체는 index.html 에 들어 있다(뷰저블과 같은 자리).
 *
 * - 페이지뷰·방문자는 스크립트가 알아서 찍는다(SPA 라우팅 포함).
 * - 버튼 클릭은 요소에 `data-umami-event="이름"` 속성만 달면 된다. 추가 속성은
 *   `data-umami-event-width="mobile"` 처럼 `data-umami-event-*` 로 붙인다.
 * - 속성을 달 수 없는 곳(PrimeVue Menu 항목 등)에서만 아래 `track()` 을 부른다.
 * - 메일 본문(내보내기 HTML)에는 들어가지 않는다 — 빌더 UI 에서만 동작한다.
 */

type UmamiProps = Record<string, string | number | boolean>

declare global {
  interface Window {
    umami?: { track: (name: string, props?: UmamiProps) => void }
  }
}

/** 이름 있는 클릭 이벤트 한 건. 스크립트가 없거나 아직 안 실렸으면 no-op. */
export function track(name: string, props?: UmamiProps): void {
  window.umami?.track(name, props)
}
