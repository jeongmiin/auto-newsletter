import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '../views/LandingView.vue'
import { useEditorStore } from '@/stores/editorStore'

/**
 * 라우트 경로 규칙 — `src/router/__tests__/routePaths.test.ts`가 지킨다.
 *
 * 1. **경로는 `public/`의 폴더 이름과 겹치면 안 된다.** (`assets`도 빌드가 만드는 폴더라 금지)
 *    화면 주소와 정적 파일이 서버에서 같은 이름 공간을 쓴다. 예전 `/templates`는
 *    `public/templates/`와 이름이 같아서, 새로고침하면 서버가 화면 대신 그 폴더를 열려다
 *    403을 냈다(앱 안에서 이동할 때는 서버에 묻지 않아 멀쩡했다). 그래서 `/design`이 됐다.
 * 2. **경로 문자열은 이 파일에만 적는다.** 다른 곳에서는 `router.push({ name: '…' })`처럼
 *    이름으로 부른다 — 경로를 바꿀 일이 생겨도 여기 한 줄만 고치면 되게.
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: LandingView,
    },
    {
      // 템플릿 선택. 경로가 이름과 다른 건 `templates`가 public 폴더 이름이라서다(위 규칙 1)
      path: '/design',
      name: 'templates',
      component: () => import('../views/TemplateSelectView.vue'),
    },
    {
      path: '/editor',
      name: 'editor',
      component: () => import('../views/HomeView.vue'),
    },
  ],
})

/**
 * 에디터는 반드시 템플릿 선택을 거쳐 들어온다.
 *
 * 팀·템플릿 정보는 메모리(Pinia)에만 있어서, 새로고침하거나 /editor로 바로 들어오면
 * 소속 팀을 알 수 없다 — 헤더의 팀 이름이 비고, 이후 팀별 이미지 업로드 경로도 정할 수 없다.
 * 그런 상태로 편집을 시작하게 두는 대신 템플릿 선택 화면으로 되돌린다.
 * (작업 내용 자체도 메모리에만 있어 새로고침 시점에 이미 사라진 뒤다)
 *
 * ⚠ 스토어는 함수 안에서 호출해야 한다 — 모듈 최상단에서 부르면 Pinia 설치 전이라 터진다.
 */
router.beforeEach((to) => {
  if (to.name !== 'editor') return true
  return useEditorStore().currentTeamId ? true : { name: 'templates' }
})

export default router
