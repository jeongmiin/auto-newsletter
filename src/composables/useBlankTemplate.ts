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
    // 저장 폴더는 '무엇을 만드는가'가 아니라 '어디에 쌓는가'라 내용과 함께 지우면 안 된다.
    // 지우면 업로드가 막히고(회차 없음) 다시 폴더 선택 걸음으로 돌아가야 한다.
    const folder = editorStore.wrapSettings.volume
    // 전체 스타일(배경색·테두리·포인트 색상·뉴스레터 요약)은 처음 값으로 —
    // 모듈만 지우면 앞 작업물의 배경색·요약이 빈 템플릿에 그대로 묻어난다.
    editorStore.resetWrapSettings()
    editorStore.updateWrapSettings({ volume: folder })
    // 내용만 지운 것이지 '어느 전시의 뉴스레터인가'가 바뀐 건 아니다 —
    // 소속 팀(teamId)과 템플릿 id를 모두 유지해, 업로드 경로가 계속 같은 폴더를 가리키게 한다.
    // 보이는 이름만 '빈 템플릿'으로 바꾼다. 다른 전시로 옮기려면 템플릿 선택 화면에서 고른다.
    // (`blank/` 폴더는 처음부터 팀에서 '빈 템플릿'으로 시작했을 때만 쓴다 — 그때만 템플릿 id가 없다)
    editorStore.setCurrentTemplate({
      templateId: editorStore.currentTemplateId,
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
