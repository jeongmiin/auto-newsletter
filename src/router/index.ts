import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '../views/LandingView.vue'
import { useEditorStore } from '@/stores/editorStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: LandingView,
    },
    {
      path: '/templates',
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
  // 팀만 본다 — 빈 문서로 시작하면 템플릿 id가 없고, 그때 업로드 폴더는 팀으로 정해진다
  // (`blank/{팀}` — s3Upload.uploadFolderOf). 팀조차 없으면 올릴 자리를 만들 수 없다.
  return useEditorStore().currentTeamId ? true : { name: 'templates' }
})

export default router
