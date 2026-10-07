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

번역용 Worker(`scripts/azure-translate-worker.mjs`)가 맞춤법 검사도 받는다.

```powershell
# 1) Gemini 키를 Worker 시크릿으로 등록 (프롬프트에 붙여 넣는다)
npx wrangler secret put GEMINI_API_KEY --config scripts/wrangler.jsonc

# 2) Worker 다시 배포 (/api/proofread 경로가 올라간다)
npm run deploy:translate
```

`https://<Worker 주소>/health`가 `"proofread": true`면 된다. 프런트는 `.env.production`의
`VITE_PROOFREAD_URL`을 본다 — 비우면 배포본의 맞춤법 검사 도구가 잠긴다.

⚠ **Worker를 먼저 배포한 뒤 프런트를 올린다.** 순서가 바뀌면 도구는 보이는데 눌렀을 때 404가 난다.

## API 계약

요청 — 같은 글은 프런트가 한 번만 담아 보낸다:

```json
{ "items": [{ "id": "0", "text": "상담회가 개최 됩니다!" }] }
```

응답 — `original`은 그 항목의 `text` 안에 **글자 그대로 있는** 구절이다(아닌 것은 프록시가 버린다):

```json
{
  "corrections": [
    { "id": "0", "original": "개최 됩니다", "corrected": "개최됩니다", "reason": "띄어쓰기" }
  ]
}
```

오류는 `{ "error": "사람이 읽을 문구" }`와 상태 코드로 온다: 429(한도 초과), 503(Gemini 붐빔), 502(그 밖의 Gemini 오류).

## 화면 동작

- 고칠 곳 하나가 카드 한 장이다. 카드마다 '적용'을 끌 수 있고, 고른 것만 한 번에 적용된다.
- 고칠 **구절만** 갈아 끼운다 — 굵게·색상·링크 같은 서식은 그대로 남는다(`src/utils/newsletterProofread.ts`).
- 검사기에는 고유명사·말투·줄바꿈을 건드리지 말라고 지시한다. 그래도 AI 제안이므로 자동 적용하지 않는다.
- 적용은 Ctrl+Z 한 번으로 되돌아간다.
