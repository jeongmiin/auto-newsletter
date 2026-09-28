# Auto Newsletter

HTML 뉴스레터 제작 도구 — Vue 3 + TypeScript + PrimeVue 기반

전시팀 담당자가 코드를 몰라도 모듈을 조합해 뉴스레터를 만들고, 이미지 서버에 올리고,
발송용 HTML과 웹 링크까지 뽑을 수 있게 하는 사내 도구입니다.

## 배포 주소

https://jeongmiin.github.io/auto-newsletter/

> ⚠ **base 경로에 주의하세요.** GitHub Actions는 `DEPLOY_BASE`를 `/auto-newsletter/`(master)
> 또는 `/auto-newsletter/develop/`(develop)로 넣어 빌드합니다. 루트(`/`)에 올릴 때는
> 로컬 `npm run build` 결과물을 쓰세요 — base가 맞지 않으면 JS·CSS·모듈을 못 찾습니다.

## 제작 흐름

```
랜딩(/)  →  전시회 선택(/design)  →  저장 폴더 선택(/folder)  →  에디터(/editor)
```

이미지와 HTML이 **어느 폴더에 올라갈지 먼저 정하고** 시작합니다. 에디터에 들어간 뒤에는
저장 위치를 바꾸기 어려우므로, 라우터 가드가 각 단계를 건너뛰지 못하게 막습니다
(`src/router/index.ts`).

> ⚠ **라우트 경로 규칙**: 경로는 `public/` 폴더 이름과 겹치면 안 됩니다. 겹치면 새로고침할 때
> 서버가 화면 대신 그 폴더를 열려다 403을 냅니다(예전 `/templates` ↔ `public/templates/`).
> 경로 문자열은 `src/router/index.ts`에만 두고 다른 곳에서는 `router.push({ name })`으로
> 부릅니다. 두 규칙 모두 `src/router/__tests__/routePaths.test.ts`가 검사합니다.

## 주요 기능

- **모듈 33종** — 헤더·푸터·텍스트·이미지·버튼·테이블·구분선 등
- **전시회 템플릿 20종** — 부서/팀 트리에서 골라 바로 시작
- **조립형 모듈(v2)** — 원소 모듈(이미지·타이틀·텍스트·버튼)을 그룹으로 묶어 구성, 컬럼 분할 지원
- **드래그 앤 드롭** — 모듈 추가·순서 변경, 캔버스 오른쪽 '모듈 순서' 패널
- **WYSIWYG 편집** — Quill 기반. 폰트 크기·행간·자간·줄바꿈 규칙까지 선택 영역 단위로 지정
- **실시간 미리보기** — PC/모바일 전환
- **이미지 업로드** — 제작한 이미지를 팀 폴더로 바로 업로드(S3)
- **임시 저장** — 작업 중인 뉴스레터를 서버에 올려 두고 나중에 이어서 편집
- **HTML 웹 링크 생성** — 발송용 HTML을 올려 '웹으로 보기' 주소를 만들고, 내용이 바뀌면 리마인드
- **다국어 번역** — Azure 기반 영어·일본어·중국어(간체). 서식·링크는 두고 글자만 번역, 적용 전 검토
- **내보내기** — 저장용(재편집 가능)·발송용 HTML 내려받기, 코드 복사

## 모듈 카테고리

`public/modules/modules-config.json`이 정의하고, HTML 본체는 `public/modules/*.html`에 있습니다.

| 카테고리 | 개수 | 예시 |
|---------|-----|------|
| 공통 | 6 | 뉴스 헤드라인 헤더, 기본 헤더, 이미지형 헤더, 하단 푸터, 연락처, 구분선·여백 |
| 텍스트 | 8 | 섹션 타이틀, 설명 텍스트, 인라인 텍스트, 모듈 01·11·12번 |
| 이미지 | 13 | 단일/복수 이미지, 모듈 02·04·05·06·07·10번 |
| 버튼 | 5 | 단일 버튼, 복수 버튼, 작은 버튼, SNS 아이콘, 언어 선택 |
| 테이블 | 1 | 커스텀 테이블 (행/열 동적 추가) |

## 기술 스택

| 분류 | 사용 |
|------|------|
| Frontend | Vue 3 (Composition API) `^3.5`, TypeScript `~5.8` |
| UI | PrimeVue `^4.3`, Tailwind CSS `^3.4`, Material Symbols |
| 상태 관리 | Pinia `^3.0` |
| 라우팅 | Vue Router `^4.5` |
| 에디터 | Quill `^2.0` |
| 드래그 앤 드롭 | vuedraggable `^4.1` |
| 빌드 | Vite `^7.0` |
| 테스트 | Vitest `^4.0` + @vue/test-utils (937개) |
| 폰트 | Pretendard Variable |

## 설치 및 실행

```sh
npm install
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드 (type-check 포함 + dist/modules 검증)
npm run preview    # 빌드 결과물 미리보기
npm run lint       # ESLint (--fix)
npm run format     # Prettier
```

> ⚠ 타입 검증은 `npm run build`로 하세요. `vue-tsc --noEmit`만 돌리면 통과했는데
> 빌드는 실패하는 경우가 있습니다.

### 환경 변수

`.env.development` / `.env.production`에 빌드 시점 값이 들어갑니다.

| 변수 | 쓰임 |
|------|------|
| `VITE_S3_UPLOAD_URL` | 이미지·HTML 업로드 엔드포인트 |
| `VITE_S3_BUCKET_URL` | 폴더 목록 조회 |
| `VITE_S3_PUBLIC_BASE` | 업로드된 파일의 공개 주소 |
| `VITE_AZURE_TRANSLATE_URL` | 번역 프록시 주소 |

주소가 비어 있으면 해당 기능의 UI가 **아예 나타나지 않습니다**(눌러야 실패하는 버튼을 두지 않습니다).

Azure 키는 프런트엔드에 넣지 않고 프록시에만 둡니다 — 연결·키 보관 방식은
[`docs/azure-translator.md`](docs/azure-translator.md)를 참고하세요.
로컬 개발용 키는 `.env.local.example`을 `.env.local`로 복사해 채웁니다.

### 로컬 보조 서버

```sh
npm run mock:upload       # S3 업로드 목 서버 (업로드 기능 로컬 테스트용)
npm run proxy:translate   # Azure 번역 프록시 (로컬)
npm run deploy:translate  # 번역 워커를 Cloudflare에 배포
```

## 테스트

```sh
npm run test           # watch 모드
npm run test:run       # 단일 실행 (CI)
npm run test:ui        # UI 모드
npm run test:coverage  # 커버리지
```

테스트는 단순 회귀 방지뿐 아니라 **말로만 두면 뒤집히기 쉬운 규칙**을 고정하는 데 씁니다.
예: 라우트 경로 규칙, Material Symbols 아이콘 subset 목록과 코드의 일치,
파일을 열 때 현재 팀을 덮어쓰지 않는 규칙, 번역 전송량 상한.

## 배포

GitHub Actions가 `master`·`develop` 푸시를 받아 같은 `gh-pages` 브랜치에 배포합니다
(master는 루트, develop은 `/develop` 하위, `keep_files: true`).

## 개발 환경

- **Node.js**: `^20.19.0 || >=22.12.0`
- **IDE**: VSCode + Vue (Official) 확장 권장

## 프로젝트 구조

```
src/
├── assets/          # tokens.css(디자인 토큰) · main.css · 패널/폼 공통 CSS
├── components/
│   ├── editor/      # 캔버스, 좌측 아이콘 레일, 모듈 순서 패널, 가이드 버튼
│   ├── layout/      # 앱 셸, 헤더, 흐름 단계 헤더/푸터
│   ├── modules/     # 모듈 렌더러
│   └── panels/      # 좌측 컨텍스트 패널 (전체 스타일·포인트 색상·모듈·속성·AI 도구)
├── composables/     # 되돌리기, 문서 생성, 가져오기/내보내기, 썸네일, 단축키
├── constants/       # 기본값, 연락처 항목, SNS 아이콘, 가이드 PDF 경로
├── router/          # 라우트 + 단계 가드
├── stores/          # Pinia (module · editor · translation · webLink)
├── types/           # 타입 정의
├── utils/           # HTML 처리, S3, 번역, 색상, 그룹 레이아웃 등
└── views/           # 랜딩 · 전시회 선택 · 폴더 선택 · 에디터

public/
├── modules/         # 모듈 HTML + modules-config.json (편집 가능 속성 정의)
├── templates/       # 전시회 템플릿 (부서별 폴더) + index.json
└── guide/           # 이용 가이드 PDF

scripts/             # 템플릿 등록, 번역 프록시/워커, S3 업로드 목 서버
docs/                # 연동 문서
```

### 알아 두면 좋은 것

- **렌더 경로가 둘입니다** — 캔버스(`useModuleRenderer`)와 내보내기(`moduleStore.generateHtml`).
  모듈 렌더를 고치면 **양쪽 모두** 확인해야 합니다.
- **색은 `assets/tokens.css` 변수로** 씁니다. 단 뉴스레터 *내용*(모듈 기본값·내보낸 HTML)은
  메일 클라이언트가 CSS 변수를 못 읽으므로 리터럴 hex를 그대로 둡니다.
- **Material Symbols는 subset**으로 받습니다. 새 아이콘을 쓰면 `index.html`의 `icon_names`에
  추가해야 하고, 빠뜨리면 아이콘 대신 이름 글자가 보입니다(테스트가 잡아 줍니다).
- **작업 내용은 메모리에만 있습니다.** 새로고침하면 사라지므로, 임시 저장이나 저장용
  내려받기로 남겨야 합니다.
