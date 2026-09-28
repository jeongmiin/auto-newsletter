/**
 * Umami — 빌더 화면의 방문자 수와 버튼 클릭 수를 재는 가벼운 분석 스크립트.
 * 스크립트 자체는 index.html 에 들어 있다(뷰저블과 같은 자리).
 *
 * - 페이지뷰·방문자는 스크립트가 알아서 찍는다(SPA 라우팅 포함).
 * - 버튼 클릭은 요소에 `data-umami-event="이름"` 속성만 달면 된다. 추가 속성은
 *   `data-umami-event-width="mobile"` 처럼 `data-umami-event-*` 로 붙인다.
 * - 아래 `track()` 은 두 경우에만 부른다: 속성을 달 수 없는 곳(PrimeVue Menu 항목 등)과,
 *   **성공했을 때만** 세야 하는 동작(번역 적용·웹 링크 생성). 누른 횟수를 세면 실패까지
 *   섞여 사용량이 부풀어 보인다.
 * - 이벤트 이름과 속성은 여기서 정한 규칙을 따른다: 이름은 `대상_동사`(snake_case),
 *   출처처럼 나뉘는 값은 이름을 늘리지 말고 속성으로 붙인다(`source: 'panel' | 'reminder'`).
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
