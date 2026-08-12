/**
 * '빈 템플릿으로 시작' 동작 (확인 모달 포함).
 *
 * 레일(EditorSidebar)과 헤더(AppHeader) 두 곳에서 부르므로 문구·처리를 여기 한 곳에 둔다.
 * 되돌릴 수 없는 조작이라 반드시 확인을 거친다.
 */
import { useConfirm } from 'primevue/useconfirm'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { getHistoryInstance } from '@/composables/useHistory'

export function useBlankTemplate() {
  const confirm = useConfirm()
  const moduleStore = useModuleStore()
  const editorStore = useEditorStore()

  /** 확인 없이 즉시 비운다 (확인은 호출부에서 이미 받은 상태) */
  const clearToBlank = (): void => {
    moduleStore.clearAll()
    // 템플릿만 비우고 소속 팀(teamId)은 유지한다 — 담당자가 바뀐 게 아니라 내용만 지운 것이라,
    // 이후 이미지 업로드 경로 등이 계속 같은 팀을 가리켜야 한다.
    editorStore.setCurrentTemplate({
      templateId: null,
      templateName: '빈 템플릿',
      teamId: editorStore.currentTeamId,
    })
    // 히스토리까지 비워야 "되돌릴 수 없어요"가 실제와 맞는다.
    // (남겨두면 실행취소로 지운 내용이 되살아나 안내가 거짓이 된다)
    getHistoryInstance().clearHistory()
  }

  /** 확인 모달을 띄우고, 승인하면 작업 영역을 비운다 */
  const confirmBlankTemplate = (): void => {
    confirm.require({
      header: '빈 템플릿을 적용할까요?',
      // 줄바꿈은 ConfirmDialog 메시지의 `white-space: pre-line`으로 살린다(main.css)
      message:
        '지금까지 작업한 내용이 모두 사라지고 빈 템플릿으로 시작해요.\n이 작업은 되돌릴 수 없어요.',
      rejectLabel: '취소',
      acceptLabel: '빈 템플릿 적용',
      rejectClass: 'p-button-secondary p-button-outlined',
      acceptClass: 'p-button-danger',
      accept: clearToBlank,
    })
  }

  return { confirmBlankTemplate }
}
