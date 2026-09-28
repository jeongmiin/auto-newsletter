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

  // 이미지 업로드 API 프록시 대상 (개발/미리보기 전용).
  //
  // CORS는 **브라우저가 거는 규칙**이라 서버↔서버 호출에는 적용되지 않는다. 브라우저가
  // localhost로만 요청하고 Vite가 뒤에서 대신 부르면, 업로드 서버에
  // Access-Control-Allow-Origin이 없어도 개발 중에는 그대로 쓸 수 있다.
  // (배포본은 프록시가 없어 브라우저가 직접 부르므로 서버 쪽 허용이 필요하다.)
  //
  // 기본값은 로컬 목 서버 — `npm run mock:upload`로 띄운다. 실제 서버를 붙이려면
  //   S3_UPLOAD_TARGET=https://fmstest.e-sang.net npm run dev
  const uploadTarget = process.env.S3_UPLOAD_TARGET || 'http://localhost:5174'
  const uploadProxy = {
    '/api/files': {
      target: uploadTarget,
      changeOrigin: true,
    },
  }

  // Azure 키를 숨기는 번역 프록시. 로컬 기본 서버는 `npm run proxy:translate`로 띄운다.
  const translateTarget = process.env.TRANSLATE_PROXY_TARGET || 'http://localhost:5175'
  const translateProxy = {
    '/api/translate': {
      target: translateTarget,
      changeOrigin: true,
    },
  }

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
      proxy: { ...uploadProxy, ...translateProxy },
      // 화면을 옮길 때 멈추지 않도록, 뒤에 나올 화면들을 미리 변환해 둔다.
      //
      // dev 서버는 빌드본과 달리 **필요할 때 한 파일씩** 변환한다. 라우트가 지연 로딩이라
      // (router/index.ts의 `import(...)`) 템플릿을 고른 그 순간에야 폴더·에디터 화면과
      // 딸린 컴포넌트 수백 개를 처음 변환하게 되고, 그 시간이 그대로 전환 지연으로 보인다.
      // 서버가 뜬 직후 미리 해 두면 클릭 시점에는 이미 준비돼 있다.
      warmup: {
        clientFiles: ['./src/views/*.vue', './src/components/**/*.vue', './src/main.ts'],
      },
    },
    // 지연 로딩되는 화면에서만 쓰는 바깥 라이브러리도 서버가 뜰 때 함께 묶어 둔다.
    //
    // 안 적어 두면 에디터로 들어가는 순간 Vite가 "새 의존성을 찾았다"며 다시 묶고
    // **페이지를 통째로 새로고침**한다 — 화면 전환 중에 한 번씩 길게 멎는 원인이다.
    // (quill·vuedraggable처럼 무거운 것이 여기 다 걸린다)
    optimizeDeps: {
      include: [
        'quill',
        'vuedraggable',
        'dompurify',
        'primevue/button',
        'primevue/checkbox',
        'primevue/colorpicker',
        'primevue/confirmdialog',
        'primevue/dialog',
        'primevue/editor',
        'primevue/inputnumber',
        'primevue/inputtext',
        'primevue/menu',
        'primevue/panel',
        'primevue/select',
        'primevue/tab',
        'primevue/tablist',
        'primevue/tabs',
        'primevue/textarea',
        'primevue/toast',
        'primevue/toggleswitch',
        'primevue/tooltip',
        'primevue/useconfirm',
        'primevue/usetoast',
      ],
    },
    // 빌드본 확인(vite preview)에서도 같은 프록시를 쓴다 — 배포 전 마지막 점검용
    preview: {
      proxy: { ...uploadProxy, ...translateProxy },
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
