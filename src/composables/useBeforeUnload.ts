import { onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useModuleStore } from '@/stores/moduleStore'

/**
 * 페이지 이탈 시 변경사항이 있으면 경고를 표시하는 컴포저블
 */
export function useBeforeUnload() {
  const moduleStore = useModuleStore()
  const { isDirty } = storeToRefs(moduleStore)

  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (isDirty.value) {
      // 표준 방식으로 이탈 경고 표시
      event.preventDefault()
      // Chrome에서는 returnValue 설정이 필요
      event.returnValue = ''
      return ''
    }
  }

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  // isDirty 상태 변화 감시 (디버깅용)
  watch(isDirty, (newValue) => {
    if (import.meta.env.DEV) {
      console.log('[useBeforeUnload] isDirty changed:', newValue)
    }
  })

  return {
    isDirty,
  }
}
