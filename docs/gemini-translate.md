# Gemini 번역 연결

AI 도구의 '다국어 번역'은 `Vue 앱 → 프록시 → Gemini API`로 호출한다. 맞춤법 검사(docs/gemini-proofread.md)와
**같은 프록시, 같은 Gemini 키**를 쓴다. Gemini 키는 프록시(로컬은 `.env.local`, 배포본은 Worker 시크릿)에만
두고, `VITE_` 환경변수에는 공개 프록시 주소만 넣는다.

> 2026-10-12까지는 Azure Translator(F0)를 썼다. Azure 무료 체험 구독이 끝나 키가 거절됐고
> (`ReadOnlyDisabledSubscription`), 다시 살리려면 카드 등록이 필요해 Gemini 무료 등급으로 옮겼다.
> 요청·응답 계약은 그대로라 화면 쪽 코드는 바뀌지 않았다.

## 무료로 쓰는 조건

맞춤법 검사와 같다 — docs/gemini-proofread.md '무료로 쓰는 조건' 참고. 요점만:

- 키는 [Google AI Studio](https://aistudio.google.com/apikey)에서 **결제 등급이 '무료 등급'** 인 프로젝트로 발급한다.
- 한도를 넘으면 **과금되지 않고 요청이 거절(429)** 된다. 앱은 "오늘 쓸 수 있는 무료 번역 횟수를 모두 썼어요"라고 안내한다.
- 뉴스레터 한 편 번역이 요청 **2~3회**다(3,000자 안팎으로 나눠 보낸다). 맞춤법 검사와 같은 하루 한도를 나눠 쓴다.

## 어떻게 번역하나

- 값 하나(문단·제목·버튼 글귀)가 항목 하나다. 리치 텍스트는 **속성을 뗀 뼈대 HTML**(`<p i="0"><strong i="1">…`)로
  보내고, 돌아온 뼈대에 원래 속성을 되붙인다(`src/utils/newsletterTranslation.ts`의 `toSkeleton`/`restoreSkeleton`).
- 프록시는 번역문의 **태그 뼈대가 원문과 같은지 검증**한다(`scripts/translate-core.mjs`의 `tagSignature`).
  태그 이름·순서는 같은데 번호(`i="n"`)만 틀리면 원문 번호로 고쳐 받는다(`repairSkeleton` — 실측에서 긴 글의
  마지막 문단 번호를 하나 작게 적는 일이 있었다). 구조 자체가 다르면 그 항목만 **하나씩** 한 번 더 묻고,
  그래도 다르면 502로 "서식이 원문과 달라 적용할 수 없어요"라고 알린다 — 틀린 서식을 캔버스에 넣지 않는다.
- 고유명사·숫자·날짜·URL·기호는 그대로 두라고 지시한다. 영어는 홍보 뉴스레터 어투.
- 모델은 맞춤법 검사와 같은 Flash Lite(`GEMINI_MODEL`).

2026-10-12 실측(실제 템플릿, 영·일·중 각 1편): 모든 항목이 돌아왔고 서식 뼈대 검증을 통과했다. 응답은 묶음당 2~5초.

## 로컬 실행

`.env.local`에 Gemini 키를 넣는다(`.gitignore`의 `*.local` 규칙으로 Git에 올라가지 않는다).

```dotenv
GEMINI_API_KEY=발급받은_키
```

```powershell
# 터미널 1 — 번역·맞춤법 검사 프록시(.env.local을 자동으로 읽는다). 이 터미널은 켜 둔 채로 둔다.
npm.cmd run proxy:translate

# 터미널 2
npm.cmd run dev
```

개발 앱은 `.env.development`의 `/api/translate`를 호출하고 Vite가 기본 포트 5175의 프록시로 전달한다.
`http://localhost:5175/health`가 `"configured": true`면 키까지 준비된 것이다.

## 운영 배포 — Cloudflare Worker

앱이 뜨는 곳(GitHub Pages `jeongmiin.github.io/auto-newsletter/`와 `/develop/`, 운영 `newsletter.messeesang.com`)은
정적 호스팅이라 Node 프록시를 돌릴 수 없다. 같은 로직을 **Cloudflare Worker**로 올린다
(`scripts/translate-worker.mjs`, 설정 `scripts/wrangler.jsonc`). 무료 플랜이면 충분하다.

```powershell
# 최초 한 번 — Cloudflare 로그인
npx wrangler login

# Gemini 키를 Worker 시크릿으로 등록 (프롬프트에 붙여 넣는다 — 코드·설정 파일에는 넣지 않는다)
npx wrangler secret put GEMINI_API_KEY --config scripts/wrangler.jsonc

# 배포. 코드를 고칠 때마다 이것만 다시 실행한다
npm run deploy:translate
```

`https://<Worker 주소>/health`가 `"configured": true`면 된다. 프런트는 `.env.production`의
`VITE_TRANSLATE_URL`을 본다 — 비우면 배포본의 번역 도구가 잠긴다.

- Gemini 호출은 북미에 고정한 중계 객체(`GeminiRelay`)를 거친다 — 이유는 docs/gemini-proofread.md.
- 허용 출처를 바꾸려면 `scripts/wrangler.jsonc`의 `TRANSLATE_ALLOWED_ORIGINS`를 고치고 다시 배포한다.
  Worker는 허용된 출처의 브라우저 요청만 받는다(Origin 검사). curl 같은 Origin 없는 요청도 거절한다.
- 키를 재발급했으면 `wrangler secret put`을 다시 실행한다. 재배포는 필요 없다.

### 환경변수 정리

| 이름 | 로컬 프록시 | Worker | 뜻 |
|---|---|---|---|
| `GEMINI_API_KEY` | `.env.local` | 시크릿 | 필수. 번역·맞춤법 검사 공용. 절대 공개 금지 |
| `GEMINI_MODEL` | 선택 | `wrangler.jsonc` vars | 기본 `gemini-3.5-flash-lite` |
| `TRANSLATE_ALLOWED_ORIGINS` | `.env.local` | `wrangler.jsonc` vars | 쉼표로 구분한 앱 출처 |
| `TRANSLATE_PROXY_PORT` | 선택 | — | 로컬 프록시 포트, 기본 5175 |

## API 계약

요청:

```json
{
  "sourceLanguage": "ko",
  "targetLanguage": "en",
  "items": [{ "id": "module-1:properties.title", "text": "행사 안내", "format": "plain" }]
}
```

`targetLanguage`은 `en`, `ja`, `zh-Hans`, `th` 중 하나. `format`이 `html`이면 태그 뼈대를 그대로 둔 번역문이 온다.

응답:

```json
{
  "translations": [{ "id": "module-1:properties.title", "text": "Event Information" }]
}
```

오류는 `{ "error": "사람이 읽을 문구" }`와 상태 코드로 온다: 429(한도 초과), 503(Gemini 붐빔), 502(서식 불일치·그 밖의 Gemini 오류).
