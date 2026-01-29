import { onMounted, onUnmounted } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import { getHistoryInstance } from './useHistory'
import { useToast } from 'primevue/usetoast'

/**
 * 키보드 단축키를 처리하는 컴포저블
 */
export function useKeyboardShortcuts() {
  const moduleStore = useModuleStore()
  const history = getHistoryInstance()
  const toast = useToast()

  const handleKeyDown = (event: KeyboardEvent) => {
    // 입력 필드에서는 단축키 비활성화
    const target = event.target as HTMLElement
    const isInputField =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.closest('.ql-editor') // Quill 에디터 내부

    // Ctrl+Z: 실행 취소 (입력 필드 외부에서만)
    if (event.ctrlKey && event.key === 'z' && !event.shiftKey && !isInputField) {
      event.preventDefault()
      if (history.undo()) {
        toast.add({
          severity: 'info',
          summary: '실행 취소',
          detail: '이전 상태로 복원되었습니다',
          life: 2000,
        })
      }
      return
    }

    // Ctrl+Y 또는 Ctrl+Shift+Z: 다시 실행 (입력 필드 외부에서만)
    if (
      ((event.ctrlKey && event.key === 'y') ||
        (event.ctrlKey && event.shiftKey && event.key === 'z')) &&
      !isInputField
    ) {
      event.preventDefault()
      if (history.redo()) {
        toast.add({
          severity: 'info',
          summary: '다시 실행',
          detail: '작업이 다시 실행되었습니다',
          life: 2000,
        })
      }
      return
    }

    // Delete: 선택된 모듈 삭제 (입력 필드 외부에서만)
    if (event.key === 'Delete' && !isInputField) {
      if (moduleStore.selectedModuleId) {
        event.preventDefault()
        const moduleName =
          moduleStore.availableModules.find(
            (m) =>
              m.id ===
              moduleStore.modules.find((mod) => mod.id === moduleStore.selectedModuleId)?.moduleId
          )?.name || '모듈'
        moduleStore.removeModule(moduleStore.selectedModuleId)
        toast.add({
          severity: 'success',
          summary: '삭제 완료',
          detail: `${moduleName}이(가) 삭제되었습니다`,
          life: 2000,
        })
      }
      return
    }

    // Ctrl+D: 선택된 모듈 복제 (입력 필드 외부에서만)
    if (event.ctrlKey && event.key === 'd' && !isInputField) {
      if (moduleStore.selectedModuleId) {
        event.preventDefault()
        moduleStore.duplicateModule(moduleStore.selectedModuleId)
        toast.add({
          severity: 'success',
          summary: '복제 완료',
          detail: '모듈이 복제되었습니다',
          life: 2000,
        })
      }
      return
    }

    // 방향키 위/아래: 모듈 선택 이동 (입력 필드 외부에서만)
    if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && !isInputField) {
      const modules = moduleStore.modules
      if (modules.length === 0) return

      const currentIndex = modules.findIndex((m) => m.id === moduleStore.selectedModuleId)

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (currentIndex > 0) {
          moduleStore.selectModule(modules[currentIndex - 1].id)
        } else if (currentIndex === -1) {
          moduleStore.selectModule(modules[modules.length - 1].id)
        }
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        if (currentIndex < modules.length - 1) {
          moduleStore.selectModule(modules[currentIndex + 1].id)
        } else if (currentIndex === -1) {
          moduleStore.selectModule(modules[0].id)
        }
      }
      return
    }

    // Ctrl+Shift+위/아래: 모듈 순서 이동 (입력 필드 외부에서만)
    if (
      event.ctrlKey &&
      event.shiftKey &&
      (event.key === 'ArrowUp' || event.key === 'ArrowDown') &&
      !isInputField
    ) {
      if (moduleStore.selectedModuleId) {
        event.preventDefault()
        if (event.key === 'ArrowUp') {
          moduleStore.moveModuleUp(moduleStore.selectedModuleId)
        } else {
          moduleStore.moveModuleDown(moduleStore.selectedModuleId)
        }
      }
      return
    }

    // Escape: 선택 해제
    if (event.key === 'Escape') {
      if (moduleStore.selectedModuleId) {
        moduleStore.selectModule('')
      }
      return
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return {
    history,
  }
}
