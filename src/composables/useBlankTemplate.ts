/**
 * 작업 내용을 비우는 두 가지 길 (확인 모달 포함).
 *
 * 같은 '비우기'처럼 보이지만 묻는 것이 다르다 —
 *
 * · **전체 삭제**(헤더): *이 폴더에서* 내용만 지운다. 팀·전시회·회차는 그대로라
 *   지우자마자 같은 자리에 이어서 올릴 수 있다. 이미 고른 폴더를 다시 고를 일이 없다.
 * · **빈 템플릿**(레일): *새 뉴스레터*를 시작한다. 팀과 저장할 폴더부터 다시 고르므로
 *   폴더 선택 걸음으로 되돌아간다 — 템플릿 선택 화면의 '빈 템플릿' 카드와 같은 흐름이다.
 *
 * 둘 다 되돌릴 수 없어 반드시 확인을 거치고, 문구·처리는 여기 한 곳에 둔다.
 */
import { useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { getHistoryInstance } from '@/composables/useHistory'

export function useBlankTemplate() {
  const confirm = useConfirm()
  const router = useRouter()
  const moduleStore = useModuleStore()
  const editorStore = useEditorStore()

  /** 확인 없이 즉시 비운다 — 이 폴더에 그대로 머문다 (확인은 호출부에서 이미 받은 상태) */
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
    // 보이는 이름만 '빈 템플릿'으로 바꾼다. 다른 전시로 옮기려면 아래 '빈 템플릿'(새로 시작)을 쓴다.
    // (`blank/` 폴더는 전시회를 안 정하고 시작했을 때만 쓴다 — 그때만 템플릿 id가 없다)
    editorStore.setCurrentTemplate({
      templateId: editorStore.currentTemplateId,
      templateName: '빈 템플릿',
      teamId: editorStore.currentTeamId,
    })
    // 히스토리까지 비워야 "되돌릴 수 없어요"가 실제와 맞는다.
    // (남겨두면 실행취소로 지운 내용이 되살아나 안내가 거짓이 된다)
    getHistoryInstance().clearHistory()
  }

  /**
   * 확인 없이 즉시 새로 시작한다 — 내용·전시회·저장 폴더를 모두 비우고 폴더 선택으로 되돌아간다.
   *
   * **팀은 남긴다.** 에디터에 들어와 있다는 건 이미 팀을 고른 뒤라는 뜻이라,
   * 폴더 선택 화면이 그 팀을 켜 둔 채 열려 곧바로 폴더만 고르면 된다
   * (거기서 다른 팀으로 옮기는 것도 열려 있다 — 전시회가 없는 빈 템플릿이라 팀을 바꿀 수 있다).
   */
  const restartBlank = (): void => {
    moduleStore.clearAll()
    // 여기서는 회차(저장 폴더)까지 비운다 — 새 뉴스레터를 어디에 쌓을지 다시 고르러 가기 때문.
    // (가드도 회차가 비면 에디터 대신 폴더 선택으로 보낸다)
    editorStore.resetWrapSettings()
    editorStore.setCurrentTemplate({
      templateId: null,
      templateName: '빈 템플릿',
      teamId: editorStore.currentTeamId,
    })
    getHistoryInstance().clearHistory()
    router.push({ name: 'folder' })
  }

  /** 헤더 '전체 삭제' — 이 폴더에 머문 채 내용만 비운다 */
  const confirmClearHere = (): void => {
    confirm.require({
      group: 'wide',
      header: '작업 내용을 모두 지울까요?',
      message:
        '저장할 폴더는 그대로 두고 내용만 비워요.\n이 작업은 되돌릴 수 없어요.',
      rejectLabel: '취소',
      acceptLabel: '전체 삭제',
      rejectClass: 'p-button-secondary p-button-outlined',
      acceptClass: 'p-button-danger',
      accept: clearToBlank,
    })
  }

  /** 레일 '빈 템플릿' — 팀·폴더부터 다시 고르는 새 뉴스레터 */
  const confirmBlankTemplate = (): void => {
    confirm.require({
      group: 'wide',
      header: '빈 템플릿으로 새로 시작할까요?',
      message:
        '지금 작업 내용은 저장되지 않고 사라져요.\n' +
        '팀과 저장할 폴더를 다시 고른 뒤 빈 화면에서 시작해요.\n' +
        "남겨야 한다면 취소하고 '**임시 저장**'을 먼저 해 주세요.",
      rejectLabel: '취소',
      acceptLabel: '폴더 선택으로 이동',
      rejectClass: 'p-button-secondary p-button-outlined',
      acceptClass: 'p-button-danger',
      accept: restartBlank,
    })
  }

  return { confirmBlankTemplate, confirmClearHere }
}
