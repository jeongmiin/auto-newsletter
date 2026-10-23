# Gemini 맞춤법 검사 연결

AI 도구의 '맞춤법 검사'는 번역과 같은 길로 호출한다: `Vue 앱 → 프록시 → Gemini API`.
Gemini 키는 프록시(로컬은 `.env.local`, 배포본은 Worker 시크릿)에만 두고, `VITE_` 환경변수에는
공개 프록시 주소만 넣는다. 프록시는 번역과 **같은 서버**다(`/api/translate` 옆에 `/api/proofread`).

## 무료로 쓰는 조건

- 키는 [Google AI Studio](https://aistudio.google.com/apikey)에서 발급한다. 키 목록의 **결제 등급이
  '무료 등급'** 인 프로젝트의 키여야 한다.
- 무료 등급은 한도를 넘어도 **과금되지 않고 요청이 거절(429)** 된다. 앱은 이때
  "오늘 쓸 수 있는 무료 검사 횟수를 모두 썼어요"라고 안내한다.
- ⚠ 키 목록의 **'결제 설정'을 눌러 결제 계정을 붙이면 유료 등급으로 바뀌어 쓴 만큼 과금된다.**
  무료로만 쓰려면 누르지 않는다.
- 무료 등급에서는 보낸 글이 구글의 모델 개선에 쓰일 수 있다. 발송 전 미공개 내용이 있으면 감안한다.
- 하루 요청 한도는 모델마다 다르고 자주 바뀐다 — AI Studio의 사용량·한도 화면에서 확인한다.
  뉴스레터 한 편 검사가 요청 **1회**다(같은 글은 한 번만 보내 3,000~5,000자 수준).

## 모델

기본은 `gemini-3.5-flash-lite`다(`scripts/proofread-core.mjs`의 `DEFAULT_GEMINI_MODEL`,
배포본은 `scripts/wrangler.jsonc`의 `GEMINI_MODEL`).

2026-10-01에 실제 뉴스레터 3편으로 견준 결과:

| | 3.5 Flash Lite | 3.7 / 3.8 Flash |
|---|---|---|
| 응답 | 3편 중 3편, 1~3초 | 12번 중 2번(나머지 503 수요 과다), 11~16초 |
| 일부러 넣은 오류 15개 | 15개 찾음 | 503으로 확인 못 함 |
| 고유명사를 건드린 제안 | 없음 | 없음 |

상위 모델이 조금 더 꼼꼼하지만 무료 등급에서는 실패가 잦아 기본으로 쓰지 않는다.
모델을 바꾸려면 `GEMINI_MODEL`만 고치고 다시 배포한다.

## 로컬 실행

`.env.local`에 키를 넣는다(`.gitignore`의 `*.local` 규칙으로 Git에 올라가지 않는다).

```dotenv
GEMINI_API_KEY=발급받은_키
```

```powershell
# 터미널 1 — 번역과 같은 프록시가 맞춤법 검사도 받는다
npm.cmd run proxy:translate

# 터미널 2
npm.cmd run dev
```

`http://localhost:5175/health`가 `"proofread": true`면 키까지 준비된 것이다.

## 운영 배포 — Cloudflare Worker

번역용 Worker(`scripts/translate-worker.mjs`)가 맞춤법 검사도 받는다.

```powershell
# 1) Gemini 키를 Worker 시크릿으로 등록 (프롬프트에 붙여 넣는다)
npx wrangler secret put GEMINI_API_KEY --config scripts/wrangler.jsonc

# 2) Worker 다시 배포 (/api/proofread 경로가 올라간다)
npm run deploy:translate
```

`https://<Worker 주소>/health`가 `"proofread": true`면 된다. 프런트는 `.env.production`의
`VITE_PROOFREAD_URL`을 본다 — 비우면 배포본의 맞춤법 검사 도구가 잠긴다.

⚠ **Worker를 먼저 배포한 뒤 프런트를 올린다.** 순서가 바뀌면 도구는 보이는데 눌렀을 때 404가 난다.

### Gemini 호출은 북미 고정 중계 객체를 거친다

Worker는 요청이 들어온 Cloudflare 지점에서 돌고 바깥 호출도 거기서 나간다. 통신사 경로에 따라
**Gemini API 서비스 지역이 아닌 지점**(응답 헤더 `cf-ray`의 끝 세 글자로 알 수 있다)을 타면 Google이
`User location is not supported for the API use.`로 거절한다(2026-10-08 실측 — 로컬 프록시는 한국에서
직접 부르므로 문제없었다).

그래서 Gemini 호출만 **Durable Object `GeminiRelay`**(`translate-worker.mjs`)가 대신 한다.
DO는 처음 만들 때 `locationHint: 'enam'`(북미 동부)으로 지역을 못 박을 수 있어 늘 북미에서 나간다.
무료 플랜에서도 쓸 수 있고(`wrangler.jsonc`의 `durable_objects`·`migrations`), 상태는 저장하지 않는다.
번역도 Gemini 로 옮긴 뒤(docs/gemini-translate.md)로는 둘 다 같은 중계 객체를 거친다.

- 중계 객체를 다른 지역으로 옮기려면 `idFromName('relay')`의 이름을 바꾸거나 새 힌트로 새 객체를 만든다
  — 힌트는 **처음 만들 때만** 적용된다.
- `migrations`의 `tag`는 배포 이력이라 지우거나 바꾸지 않는다. 클래스를 하나 더 만들면 새 tag를 덧붙인다.

## 다국어 — 언어는 항목(글 덩이)마다 검사기가 판단한다

번역 도구가 내는 영어·일본어·중국어(간체)·태국어와 원문 한국어를 한 검사기로 본다. 모델은 그대로
Flash Lite 이고 프롬프트만 다국어다(`scripts/proofread-core.mjs`의 `SYSTEM_INSTRUCTION`).

- **항목 단위 판단**: 문단·제목·버튼 글귀 하나가 항목 하나다. 일본어 뉴스레터 안에 영어 문단이
  통째로 있으면 그 항목만 영어 기준으로 본다. 응답의 `lang`이 그 판단이고, 화면 카드에는 한국어가
  아닐 때만 EN·JA·ZH·TH 태그가 붙는다.
- **힌트**: 전체 스타일의 글꼴 언어가 일본어·중국어면 `hint`로 보낸다(번역을 적용하면 글꼴 언어가
  같이 바뀐다). 참고값일 뿐이라 명백히 다른 언어인 항목은 그 언어 규칙을 따른다. '기본' 글꼴은
  한국어·영어 공용이라 힌트를 주지 않는다.
- **한 문장 안에 섞인 다른 문자**(일본어 문장 속 영어 단어)는 대개 이름이라 건드리지 말라고 지시한다.
  다만 실측에서 `Customer Servise`처럼 명백한 철자 오류는 제안이 왔다 — 카드에서 사람이 거른다.
- **언어별 "고치지 않는 것"**이 핵심이다: 영어의 영국식·미국식 철자와 옥스퍼드 콤마, 일본어의
  표기 흔들림(表記ゆれ), 중국어의 간체·번체 혼용과 문장부호 스타일. 이게 없으면 문체 교정이 쏟아진다.
- **수집 범위**: 맞춤법 검사는 `collectTranslationUnits(…, { letters: 'any' })`로 글자가 든 값을
  다 모은다(번역은 기본값 — 한국어가 든 값만).
- **영어 구절은 단어 경계**에서만 찾는다(`indexOfPhrase`, 프록시와 프런트에 같은 규칙). 'the'를
  'then' 안에서 바꾸지 않기 위해서다. 한중일 구절은 경계 규칙이 없다.
- 수정 이유(`reason`)는 언어와 상관없이 한국어로 받는다.

2026-10-08 실측(Flash Lite, 언어당 요청 1회): 심어 둔 오류를 영어 6/6, 일본어 3/3, 중국어 2/2 찾았고
영국식 철자(Organised·Colour)·브랜드명·숫자 표기는 건드리지 않았다. 응답은 1~2초.

## API 계약

요청 — 같은 글은 프런트가 한 번만 담아 보낸다. `hint`는 뉴스레터의 주 언어(알 때만, ko·en·ja·zh):

```json
{ "hint": "ja", "items": [{ "id": "0", "text": "상담회가 개최 됩니다!" }] }
```

응답 — `original`은 그 항목의 `text` 안에 **글자 그대로 있는** 구절이다(아닌 것은 프록시가 버린다).
`lang`은 그 항목을 어느 언어 기준으로 봤는지(모르면 빈 값):

```json
{
  "corrections": [
    { "id": "0", "lang": "ko", "original": "개최 됩니다", "corrected": "개최됩니다", "reason": "띄어쓰기" }
  ]
}
```

오류는 `{ "error": "사람이 읽을 문구" }`와 상태 코드로 온다: 429(한도 초과), 503(Gemini 붐빔), 502(그 밖의 Gemini 오류).

## 화면 동작

- 고칠 곳 하나가 카드 한 장이다. 카드마다 '적용'을 끌 수 있고, 고른 것만 한 번에 적용된다.
- 고칠 **구절만** 갈아 끼운다 — 굵게·색상·링크 같은 서식은 그대로 남는다(`src/utils/newsletterProofread.ts`).
- 검사기에는 고유명사·말투·줄바꿈을 건드리지 말라고 지시한다. 그래도 AI 제안이므로 자동 적용하지 않는다.
- 한국어가 아닌 항목의 카드에는 언어 태그(EN·JA·ZH·TH)가 붙는다 — 일본어 뉴스레터에 영어 제안이 섞여도 알아본다.
- 적용은 Ctrl+Z 한 번으로 되돌아간다.
