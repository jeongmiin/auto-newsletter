import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isGitHubActionsBuild = command === 'build' && process.env.GITHUB_ACTIONS === 'true'

  // 배포 경로(base)는 워크플로에서 DEPLOY_BASE로 지정한다.
  //  - master → '/auto-newsletter/'          (https://<user>.github.io/auto-newsletter/)
  //  - develop → '/auto-newsletter/develop/'  (…/auto-newsletter/develop/)
  // DEPLOY_BASE가 없으면 기존 동작(로컬='/', GH Actions='/auto-newsletter/')을 유지한다.
  const deployBase = process.env.DEPLOY_BASE || (isGitHubActionsBuild ? '/auto-newsletter/' : '/')

  return {
    base: deployBase,
    plugins: [
      vue(),
      // Vue DevTools는 스토어 상태를 깊게 구독해서, 모듈을 하나 추가할 때마다 모듈 배열
      // 전체를 다시 순회한다. 모듈이 수십 개인 뉴스레터(템플릿 선택·파일 열기)에서는
      // 이 순회가 O(n²)로 불어나 68개 기준 13초가 걸린다(끄면 0.9초, 빌드본 0.35초).
      // 필요할 때만 VUE_DEVTOOLS=1 로 켠다.
      ...(process.env.VUE_DEVTOOLS === '1' ? [vueDevTools()] : []),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    // 개발 서버 — 포트를 항상 5173으로 고정.
    // strictPort:true 라 5173이 이미 점유돼 있으면 임의 포트로 넘어가지 않고 에러로 알려준다
    // (매 실행마다 포트가 바뀌어 열어둔 탭의 URL이 죽는 문제 방지).
    server: {
      port: 5173,
      strictPort: true,
    },
    // public 폴더 처리 명시
    publicDir: 'public',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      // public 폴더를 dist로 복사 (명시적 설정)
      copyPublicDir: true,
      // 소스맵 생성으로 디버깅 용이
      sourcemap: true,
      // 청크 크기 경고 제한 증가
      chunkSizeWarningLimit: 1000,
      // Rollup 옵션
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  }
})
