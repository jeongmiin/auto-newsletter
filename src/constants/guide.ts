/**
 * 뉴스레터 이용 가이드 PDF — 내려받기 주소와 저장될 이름.
 *
 * 파일은 `public/guide/` 에 둔다 — public 은 빌드가 손대지 않고 그대로 복사하므로
 * 같은 이름으로 덮어써 넣기만 하면 코드를 고치지 않아도 된다.
 *
 * ⚠ 주소 앞에 `BASE_URL` 을 붙여야 한다. 배포는 `/auto-newsletter/` 같은 하위 경로에 올라가서,
 *   `/guide/...` 로 적으면 도메인 최상위를 찾아 404가 난다.
 *
 * 에디터의 가이드 버튼(GuideButton)과 랜딩의 '이용 가이드 내려받기'가 같은 파일을 가리킨다 —
 * 두 곳에 따로 적어 두면 파일을 옮길 때 한쪽만 고쳐져 404가 난다.
 */
const GUIDE_FILE = 'guide/newsletter-guide.pdf'

/** 내려받기·새 탭으로 열기에 쓰는 주소 */
export const GUIDE_PDF_URL = `${import.meta.env.BASE_URL}${GUIDE_FILE}`

/** 내려받을 때 저장될 이름 */
export const GUIDE_PDF_SAVE_NAME = '뉴스레터 가이드.pdf'
