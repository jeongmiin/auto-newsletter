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
 *
 * AI 도구 이벤트(모두 성공했을 때만) — 도구마다 하나씩만 둔다. 이름을 늘리지 않는다:
 * - `tool_select {tool}`                도구 카드를 펼침(weblink·translate·proofread·recommend·tone)
 * - `translate_apply {lang, count}`     번역을 캔버스에 적용. 번역은 돌리면 대개 적용하므로 이걸로 사용량을 본다
 *                                       (무료 한도 소모는 한 편 = 요청 2~3회라 ×2~3).
 * - `proofread_run {suggestions, chars}` 맞춤법 검사를 돌려 결과를 받음. 적용이 아니라 **돌린 횟수**를 센다 —
 *                                       고칠 곳이 없거나 손으로 고치는 경우가 많아 적용 수는 사용을 작게 잡는다.
 *                                       한 편 = 요청 1회라 이 수가 곧 무료 한도 소모다.
 * - `recommend_apply {purpose, modules, mode}` 추천받은 구성을 캔버스에 깖. 받기만 한 횟수는 세지 않는다 —
 *                                       깔아야 쓴 것이다. 한 편 = 요청 1회(받고 안 깐 것은 한도만 쓴다).
 * - `tone_apply {tone, count}`          어투를 바꾼 글을 캔버스에 적용. 번역처럼 한 편 = 요청 2~3회.
 * - `web_link_create {source}` / `web_link_refresh {source}` / `web_link_copy`  웹 링크 생성·갱신·복사
 *   적용 여부까지 보고 싶어지면 이름을 늘리지 말고 같은 이름에 `step: 'run' | 'apply'` 속성을 붙인다.
 * (그 밖에 헤더의 `download_for_save`·`copy_html`·`open_file` 은 data-umami-event 대신 track() 으로 찍는다.)
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
