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
      path: '/folder',
      name: 'folder',
      component: () => import('../views/FolderSelectView.vue'),
    },
    {
      path: '/editor',
      name: 'editor',
      component: () => import('../views/HomeView.vue'),
    },
  ],
})

/**
 * 세 걸음(템플릿 선택 → 폴더 선택 → 에디터)을 건너뛰고 들어오지 못하게 막는다.
 *
 * 팀·템플릿·폴더는 메모리(Pinia)에만 있어서, 새로고침하거나 /editor로 바로 들어오면
 * 소속 팀도 저장할 폴더도 알 수 없다 — 헤더의 팀 이름이 비고, 이미지를 올릴 자리도 없다.
 * 그런 상태로 편집을 시작하게 두는 대신 앞 단계로 되돌린다.
 * (작업 내용 자체도 메모리에만 있어 새로고침 시점에 이미 사라진 뒤다)
 *
 * ⚠ 스토어는 함수 안에서 호출해야 한다 — 모듈 최상단에서 부르면 Pinia 설치 전이라 터진다.
 */
router.beforeEach((to) => {
  if (to.name !== 'editor' && to.name !== 'folder') return true

  const editorStore = useEditorStore()
  // 팀이 있어야 올릴 자리(`{팀}/{전시회}`)가 정해진다 — 빈 문서로 시작해도 팀은 반드시 있다
  if (!editorStore.currentTeamId) return { name: 'templates' }
  if (to.name === 'folder') return true

  // 폴더(회차)를 고르지 않았으면 에디터로 넘기지 않는다 — 올린 이미지가 갈 곳이 없다
  return editorStore.wrapSettings.volume ? true : { name: 'folder' }
})

export default router
