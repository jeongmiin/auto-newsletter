# Auto Newsletter

HTML 뉴스레터 모듈 편집기 - Vue 3 + TypeScript + PrimeVue 기반

## 🌐 Live Demo

배포 URL: https://jeongmiin.github.io/auto-newsletter/

## 📝 프로젝트 설명

뉴스레터를 위한 HTML 모듈을 시각적으로 편집하고 관리할 수 있는 웹 애플리케이션입니다.

### 주요 기능
- 다양한 HTML 모듈 컴포넌트 제공
- 실시간 미리보기
- 드래그 앤 드롭으로 모듈 순서 변경
- HTML 코드 복사 기능

### 기술 스택
- Vue 3 (Composition API)
- TypeScript
- PrimeVue UI Framework
- Vite
- Pinia (상태 관리)

## 🚀 배포

GitHub Actions를 통해 자동 배포됩니다. `master` 브랜치에 푸시하면 자동으로 GitHub Pages에 배포됩니다.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
