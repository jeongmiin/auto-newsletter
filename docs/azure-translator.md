# Azure Translator 연결

번역 기능은 Azure 키를 브라우저에 노출하지 않기 위해 `Vue 앱 → 번역 프록시 → Azure` 순서로 호출한다.
`VITE_` 환경변수에는 공개 프록시 주소만 넣고 Azure 키는 서버 환경변수에만 둔다.

## 로컬 실행

Azure Portal에서 Translator F0 리소스를 만든 뒤 예제 파일을 복사하고 실제 키를 입력한다.

```powershell
# 최초 한 번만 실행한 뒤 .env.local을 편집한다.
Copy-Item .env.local.example .env.local

# 터미널 1 — 프록시가 .env.local을 자동으로 읽는다.
npm.cmd run proxy:translate

# 터미널 2
npm.cmd run dev
```

개발 앱은 `.env.development`의 `/api/translate`를 호출하고 Vite가 기본 포트 5175의 프록시로 전달한다.
`.env.local`은 `.gitignore`의 `*.local` 규칙으로 제외되며, `VITE_` 접두사가 없는 Azure 키는
Vite 클라이언트 번들에도 노출되지 않는다. 운영 환경변수로 이미 설정한 값은 `.env.local`보다 우선한다.

## 운영 배포 — Cloudflare Worker

앱이 뜨는 곳(로컬 5173, GitHub Pages `jeongmiin.github.io/auto-newsletter/`와 `/develop/`,
운영 `newsletter.messeesang.com`)은 모두 정적 호스팅이라 Node 프록시를 돌릴 수 없다.
그래서 같은 로직(`scripts/translate-core.mjs`)을 **Cloudflare Worker**로 올린다
(`scripts/azure-translate-worker.mjs`, 설정 `scripts/wrangler.jsonc`).
무료 플랜은 카드 등록 없이 하루 10만 요청까지 쓸 수 있고, 뉴스레터 한 통 번역이 요청 1~2개라 충분하다.

### 최초 한 번

```powershell
# 1) Cloudflare 계정으로 로그인 (브라우저가 열린다. 계정이 없으면 무료로 만든다)
npx wrangler login

# 2) Azure 키를 Worker 시크릿으로 등록 (프롬프트에 붙여 넣는다 — 코드·설정 파일에는 넣지 않는다)
npx wrangler secret put AZURE_TRANSLATOR_KEY --config scripts/wrangler.jsonc

# 3) 배포. 끝나면 https://auto-newsletter-translate.<계정>.workers.dev 주소를 출력한다
npm run deploy:translate
```

`https://<주소>/health` 를 열어 `"configured": true` 면 키까지 준비된 것이다.

### 프런트에 주소 연결

`.env.production`에 Worker 주소를 넣고 develop/master에 푸시하면 GitHub Actions가 다시 빌드·배포한다.

```dotenv
VITE_AZURE_TRANSLATE_URL=https://auto-newsletter-translate.<계정>.workers.dev/api/translate
```

### 이후 운영

- Worker 코드를 고쳤으면 `npm run deploy:translate`만 다시 실행한다.
- 허용 출처(사이트 도메인)나 Azure 지역을 바꾸려면 `scripts/wrangler.jsonc`의 `vars`를 고치고 다시 배포한다.
  출처는 `https://newsletter.messeesang.com`처럼 프로토콜+도메인까지만 적는다(경로 없음).
  GitHub Pages는 루트와 `/develop/`가 같은 출처(`https://jeongmiin.github.io`)라 하나면 된다.
- Worker는 허용된 출처의 브라우저 요청만 받는다(Origin 헤더 검사). 로컬 프록시와 달리 Origin 없는
  요청(curl 등)도 거절해 공개 주소를 남이 써서 무료 한도를 소모하지 못하게 한다.
- 키를 재발급했으면 `wrangler secret put`을 다시 실행한다. 재배포는 필요 없다.
- 사용량: Azure 포털 → 리소스 → 메트릭 "Text Characters Translated". Cloudflare 대시보드 → Workers → 요청 수.

### 환경변수 정리

| 이름 | 로컬 프록시 | Worker | 뜻 |
|---|---|---|---|
| `AZURE_TRANSLATOR_KEY` | `.env.local` | 시크릿 | 필수. 절대 공개 금지 |
| `AZURE_TRANSLATOR_REGION` | `.env.local` | `wrangler.jsonc` vars | 리소스 지역(`koreacentral`). Global이면 빈 값 |
| `AZURE_TRANSLATOR_ENDPOINT` | 선택 | 선택 | 기본값은 Azure 글로벌 주소 |
| `TRANSLATE_ALLOWED_ORIGINS` | `.env.local` | `wrangler.jsonc` vars | 쉼표로 구분한 앱 출처 |
| `TRANSLATE_PROXY_PORT` | 선택 | — | 로컬 프록시 포트, 기본 5175 |

Azure 제한에 맞춰 프록시는 일반 텍스트와 HTML을 분리하고 요청당 45,000자 이하로 자동 분할한다.

## API 계약

요청:

```json
{
  "sourceLanguage": "ko",
  "targetLanguage": "en",
  "items": [{ "id": "module-1:properties.title", "text": "행사 안내", "format": "plain" }]
}
```

`targetLanguage`은 `en`, `ja`, `zh-Hans` 중 하나다.

응답:

```json
{
  "translations": [{ "id": "module-1:properties.title", "text": "Event Information" }]
}
```
