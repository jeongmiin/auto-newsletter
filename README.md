# Auto Newsletter

HTML 뉴스레터 모듈 편집기 - Vue 3 + TypeScript + PrimeVue 기반

## Live Demo

배포 URL: https://jeongmiin.github.io/auto-newsletter/

## 프로젝트 설명

뉴스레터를 위한 HTML 모듈을 시각적으로 편집하고 관리할 수 있는 웹 애플리케이션입니다. 드래그 앤 드롭으로 모듈을 배치하고, 실시간으로 미리보기하며, 완성된 HTML 코드를 복사할 수 있습니다.

## 주요 기능

- **26개 HTML 모듈** - 헤더, 푸터, 텍스트, 이미지, 버튼, 테이블 등 다양한 모듈 제공
- **드래그 앤 드롭** - 모듈 추가 및 순서 변경
- **실시간 미리보기** - PC/모바일 화면 크기 전환 지원
- **WYSIWYG 에디터** - Quill 기반 리치 텍스트 편집
- **속성 편집** - 각 모듈별 상세 속성 커스터마이징
- **HTML 코드 복사** - 완성된 뉴스레터 HTML 즉시 복사
- **SNS 링크 관리** - 홈, 인스타그램, 페이스북, X, 블로그, 유튜브, 카카오톡

## 모듈 카테고리

| 카테고리 | 모듈 |
|---------|------|
| 공통 | 뉴스 헤드라인 헤더, 기본 헤더, 섹션 타이틀, 구분선, 하단 푸터 |
| 텍스트 | 설명 텍스트, 텍스트 레이아웃 (01, 01-1, 01-2, 05-1) |
| 이미지 | 단일 이미지, 복수 이미지, 이미지 레이아웃 (02, 04, 05, 05-3, 06, 07) |
| 버튼 | 단일 버튼, 2개 버튼 |
| 테이블 | 커스텀 테이블 (행/열 동적 추가) |

## 기술 스택

- **Frontend**: Vue 3 (Composition API), TypeScript
- **UI Framework**: PrimeVue 4, Tailwind CSS
- **상태 관리**: Pinia
- **에디터**: Quill
- **드래그 앤 드롭**: vuedraggable
- **빌드 도구**: Vite 7
- **테스트**: Vitest
- **폰트**: Pretendard Variable

## 설치 및 실행

```sh
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 미리보기
npm run preview
```

## 테스트

```sh
# Watch 모드
npm run test

# UI 모드
npm run test:ui

# 단일 실행 (CI)
npm run test:run

# 커버리지 리포트
npm run test:coverage
```

**테스트 현황**: 82개 테스트 통과

## 배포

GitHub Actions를 통해 `master` 브랜치에 푸시 시 자동으로 GitHub Pages에 배포됩니다.

## 개발 환경

- **Node.js**: ^20.19.0 || >=22.12.0
- **IDE**: VSCode + Volar 확장 권장

## 프로젝트 구조

```
src/
├── assets/          # 스타일 (CSS)
├── components/      # Vue 컴포넌트
│   ├── editor/      # 에디터 관련 (캔버스, 툴바)
│   ├── layout/      # 레이아웃 (헤더)
│   └── panels/      # 패널 (모듈, 속성)
├── stores/          # Pinia 스토어
├── types/           # TypeScript 타입 정의
└── utils/           # 유틸리티 함수
    └── processors/  # HTML 처리 로직

public/
└── modules/         # HTML 모듈 템플릿 (26개)
```
