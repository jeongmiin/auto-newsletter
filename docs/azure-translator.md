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

## 운영 배포

정적 GitHub Pages에서는 서버 코드를 실행할 수 없다. `scripts/azure-translate-proxy.mjs`와 같은
`POST /api/translate` 계약을 기존 API 서버 또는 서버리스 환경에 배포해야 한다.

서버 환경변수:

- `AZURE_TRANSLATOR_KEY`: 필수, 외부에 공개하면 안 됨
- `AZURE_TRANSLATOR_REGION`: Azure 리소스에서 요구할 때 설정
- `AZURE_TRANSLATOR_ENDPOINT`: 기본값은 Azure 글로벌 Translator 주소
- `TRANSLATE_ALLOWED_ORIGINS`: 쉼표로 구분한 실제 앱 오리진
- `TRANSLATE_PROXY_PORT`: 기본값 5175

프런트 빌드 환경변수:

```dotenv
VITE_AZURE_TRANSLATE_URL=https://api.example.com/api/translate
```

운영 프록시에는 HTTPS, 인증 또는 사내 접근 제한, 사용자별 요청 제한, 월 사용량 경고를 추가하는 것을 권장한다.
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
