<template>
  <!-- Figma 1125-2964 top nav: 높이 60, 좌우 패딩 21 -->
  <header class="hnav">
    <!-- 왼쪽 묶음 (1125-3054): 홈 ↔ 나머지 25px -->
    <div class="hleft">
      <!-- 홈 (클릭 시 랜딩 페이지로) — 40×40, 아이콘 31px -->
      <button
        type="button"
        class="hicon hhome"
        @click="goHome"
        v-tooltip.bottom="'처음 화면으로'"
      >
        <span class="material-symbols-outlined">home</span>
      </button>

      <!-- 팀·실행취소·전체삭제·저장 위치 (1500-9764): 항목 간 15px. 브레드크럼은 디자인에서 빠졌다. -->
      <div v-if="showActions" class="hleft-group">
        <!-- 소속 팀 — 표시명은 teamId로 트리에서 찾는다(트리 미로딩 시엔 숨김) -->
        <span v-if="currentTeamName" class="hteam">{{ currentTeamName }}</span>

        <span class="hbar"></span>

        <!-- 실행취소/다시실행 (1125-3064): 40×40, 사이 8px -->
        <div class="hundo">
          <button
            type="button"
            class="hicon"
            :disabled="!canUndo"
            @click="doUndo"
            v-tooltip.bottom="'이전으로'"
          >
            <span class="material-symbols-outlined">undo</span>
          </button>
          <button
            type="button"
            class="hicon"
            :disabled="!canRedo"
            @click="doRedo"
            v-tooltip.bottom="'다음으로'"
          >
            <span class="material-symbols-outlined">redo</span>
          </button>
        </div>

        <span class="hbar"></span>

        <!--
          전체 삭제 = 이 폴더에 머문 채 내용만 비우기.
          팀·폴더부터 다시 고르는 '새로 시작'은 레일의 '빈 템플릿'이 맡는다.
        -->
        <button
          type="button"
          class="hclear"
          @click="confirmClearHere"
          v-tooltip.bottom="'저장할 폴더는 그대로 두고 작업 내용만 모두 지웁니다'"
        >
          <span class="material-symbols-outlined">delete</span>
          <span>전체 삭제</span>
        </button>

        <span class="hbar"></span>

        <!-- 파일 저장 위치 — 아이콘만 두고, 올리면 두 줄 말풍선으로 경로를 보여준다 (1534-6097) -->
        <button
          type="button"
          class="hicon hpath"
          aria-label="파일 저장 위치"
          v-tooltip.bottom="{ value: savePathTooltip, class: 'htip-path' }"
        >
          <span class="material-symbols-outlined">drive_file_move</span>
        </button>
      </div>
    </div>

    <template v-if="showActions">
      <!-- 중앙: PC / 모바일 토글 -->
      <div class="flex-1 flex justify-center">
        <div class="seg">
          <button
            type="button"
            class="seg-btn"
            :class="{ 'is-active': canvasWidth === 'desktop' }"
            @click="editorStore.setCanvasWidth('desktop')"
            v-tooltip.bottom="'PC 화면'"
          >
            <span class="material-symbols-outlined">desktop_windows</span>
          </button>
          <button
            type="button"
            class="seg-btn"
            :class="{ 'is-active': canvasWidth === 'mobile' }"
            @click="editorStore.setCanvasWidth('mobile')"
            v-tooltip.bottom="'모바일 화면'"
          >
            <span class="material-symbols-outlined">smartphone</span>
          </button>
        </div>
      </div>

      <!-- 우측 (1500-9791): 버튼끼리 10px. 저장 시각 문구는 디자인에서 빠졌다(말풍선으로만 알린다). -->
      <div class="hright">
        <!-- 임시 저장 — 지금 작업을 회차 폴더에 올려 둔다(같은 이름으로 덮어써 최신 하나만 남는다).
             업로드 주소가 없으면 눌러도 실패할 버튼을 아예 감춘다(이미지 업로드와 같은 규칙).
             말풍선은 두 가지 — 올린 직후 아래에 '저장 완료'(1542-6981), 저장 안 한 편집이 있을 때만
             마우스를 올리면 '최근 편집 저장 안됨'. -->
        <span v-if="canSaveToFolder" class="hsave-wrap">
          <button
            type="button"
            class="hbtn hbtn--tint"
            :disabled="savingToFolder"
            @click="saveToFolder"
            v-tooltip.bottom="{ value: '최근 편집 저장 안됨', disabled: !hasUnsavedEdits }"
          >
            <!-- 저장 안 한 편집이 있으면 구름 아이콘도 경고형으로 — 툴팁과 같은 조건 -->
            <span class="material-symbols-outlined">{{ hasUnsavedEdits ? 'cloud_alert' : 'cloud_done' }}</span>
            <span>{{ savingToFolder ? '올리는 중…' : '임시 저장' }}</span>
          </button>
          <Transition name="hbubble">
            <span v-if="savedFlash" class="hbubble" role="status">저장 완료</span>
          </Transition>
        </span>
        <button
          type="button"
          class="hbtn hbtn--muted"
          @click="previewEmail"
          v-tooltip.bottom="'새 창에서 완성된 모습을 확인합니다'"
        >
          <span class="material-symbols-outlined">visibility</span>
          <span>미리보기</span>
        </button>
        <button
          type="button"
          class="hbtn hbtn--primary"
          @click="downloadForSend"
          v-tooltip.bottom="'메일 발송용 HTML을 내려받습니다'"
        >
          <span class="material-symbols-outlined">send</span>
          <span>발송용 다운로드</span>
        </button>

        <!-- 자주 쓰지 않는 동작은 한 단계 안으로 (Figma 1125-3110) -->
        <button
          type="button"
          class="hbtn hbtn--icon"
          aria-haspopup="true"
          aria-controls="header-more-menu"
          @click="toggleMoreMenu"
          v-tooltip.bottom="'더 보기'"
        >
          <span class="material-symbols-outlined">more_horiz</span>
        </button>
        <Menu id="header-more-menu" ref="moreMenu" :model="moreMenuItems" popup class="hmore-menu" />
      </div>
    </template>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import Menu from 'primevue/menu'
import { useConfirm } from 'primevue/useconfirm'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { processQuillHtml } from '@/utils/quillHtmlProcessor'
import { buildEmailPreviewDocument } from '@/utils/emailPreviewDoc'
import { useNewsletterImport } from '@/composables/useNewsletterImport'
import { useNewsletterDownload } from '@/composables/useNewsletterDownload'
import { buildDownloadFileName } from '@/utils/projectFile'
import {
  MISSING_VOLUME_MESSAGE,
  UploadError,
  buildUploadDirectory,
  displayUploadDirectory,
  isUploadEnabled,
  savePathLabel,
  uploadHtml,
} from '@/utils/s3Upload'
import { getHistoryInstance } from '@/composables/useHistory'
import { useBlankTemplate } from '@/composables/useBlankTemplate'
import { useNewsletterDocument } from '@/composables/useNewsletterDocument'
import { useToast } from 'primevue/usetoast'

// showActions=false면 오른쪽 파일 관리 버튼들을 숨긴다(예: 템플릿 선택 화면)
withDefaults(defineProps<{ showActions?: boolean }>(), { showActions: true })

const moduleStore = useModuleStore()
const editorStore = useEditorStore()
const toast = useToast()
const router = useRouter()
const confirm = useConfirm()
const { importHtmlFile } = useNewsletterImport()
const { confirmClearHere } = useBlankTemplate()
// 내려받기·복사·임시 저장·웹 링크가 모두 같은 문서를 쓰도록 한 곳에서 만든다
const { buildDocument } = useNewsletterDocument()
const { downloadHtml: downloadNewsletterHtml } = useNewsletterDownload()

// 실행취소/다시실행 (전역 히스토리 싱글턴)
const history = getHistoryInstance()
const canUndo = history.canUndo
const canRedo = history.canRedo
const doUndo = () => history.undo()
const doRedo = () => history.redo()

// PC/모바일 토글 상태
const canvasWidth = computed(() => editorStore.canvasWidth)

// 파일 저장 위치 — 'gocaf / eng / vol01 /'. 폴더 아이콘 말풍선에 두 줄로 보여준다 (1534-6097)
const savePathTooltip = computed(() => {
  const path = savePathLabel(editorStore.uploadFolder, editorStore.wrapSettings.volume)
  return `파일 저장 위치\n${path || '아직 정하지 않음'}`
})

// 소속 팀 표시명 — 저장된 건 불변 id뿐이라 트리에서 찾아 쓴다.
// (팀명이 바뀌어도 id는 그대로이므로 항상 최신 이름이 나온다)
const currentTeamName = computed(() => {
  const id = editorStore.currentTeamId
  if (!id) return ''
  for (const dept of moduleStore.availableDepartments) {
    const team = dept.teams.find((t) => t.id === id)
    if (team) return team.name
  }
  return ''
})

/**
 * 우측 '더 보기' 메뉴 — 자주 쓰지 않는 동작만 모은다.
 *
 * '저장용 다운로드'도 여기로 들어왔다. 폴더에 올려 두는 '임시 저장'이 생기면서
 * 이어서 편집할 파일을 내 PC로 받아 둘 일이 드물어졌기 때문이다.
 * 겉에 남는 것은 늘 쓰는 셋 — 임시 저장 · 미리보기 · 발송용 다운로드.
 */
const moreMenu = ref<InstanceType<typeof Menu> | null>(null)
const moreMenuItems = computed(() => [
  { label: '저장용 다운로드', icon: 'pi pi-download', command: () => void downloadForSave() },
  { label: '코드 복사', icon: 'pi pi-copy', command: () => void exportHtml() },
  { label: '파일 열기', icon: 'pi pi-folder-open', command: () => void importHtmlFile() },
])
const toggleMoreMenu = (event: Event) => moreMenu.value?.toggle(event)

// 로고 클릭 → 홈으로. 작업 중(변경사항 있음)이면 확인 후 이동.
const goHome = () => {
  if (moduleStore.modules.length > 0 && moduleStore.isDirty) {
    confirm.require({
      group:"wide",
      message: '저장하지 않은 변경사항이 있습니다. 홈으로 나가시겠어요?',
      header: '홈으로 이동',
      acceptLabel: '나가기',
      rejectLabel: '취소',
      rejectClass: 'p-button-secondary p-button-outlined',
      accept: () => router.push('/'),
    })
    return
  }
  router.push('/')
}

/** 임시 저장이 가능한 상태인지 — 업로드 주소가 설정돼 있어야 한다 */
const canSaveToFolder = isUploadEnabled()
const savingToFolder = ref(false)

/**
 * 저장하지 않은 편집이 있는지 — 마지막 저장(임시 저장·저장용 다운로드) 뒤에 무엇이든 바뀌었으면 true.
 * 이때만 '임시 저장'에 마우스를 올리면 '최근 편집 저장 안됨'을 띄운다.
 * (편집은 브라우저 메모리에만 있어 '며칠 전 편집'을 따로 셀 수 없다 — 안 저장한 편집이 있느냐가 전부다)
 */
const hasUnsavedEdits = computed(() => moduleStore.modules.length > 0 && moduleStore.isDirty)

/** 임시 저장 직후 버튼 아래에 잠깐 뜨는 '저장 완료' 말풍선 (1542-6981) */
const savedFlash = ref(false)
let savedFlashTimer: ReturnType<typeof setTimeout> | null = null
const flashSaved = () => {
  savedFlash.value = true
  if (savedFlashTimer) clearTimeout(savedFlashTimer)
  savedFlashTimer = setTimeout(() => (savedFlash.value = false), 2200)
}
onBeforeUnmount(() => {
  if (savedFlashTimer) clearTimeout(savedFlashTimer)
})

// 미리보기 창 재사용용 — 이름 있는 타깃으로 열어 같은 창을 새로고침한다
const PREVIEW_WINDOW_NAME = 'newsletter-preview'
let previewObjectUrl: string | null = null

// Toast 헬퍼 함수
const showSuccess = (summary: string, detail?: string) => {
  toast.add({ severity: 'success', summary, detail, life: 3000 })
}

const showError = (summary: string, detail?: string) => {
  toast.add({ severity: 'error', summary, detail, life: 5000 })
}

const showWarn = (summary: string, detail?: string) => {
  toast.add({ severity: 'warn', summary, detail, life: 4000 })
}

/**
 * 미리보기: 최종 HTML을 새 창에서 표시
 */
const previewEmail = async (): Promise<void> => {
  try {
    const modules = moduleStore.modules

    if (!modules || modules.length === 0) {
      showWarn('미리보기 불가', '먼저 모듈을 추가해주세요')
      return
    }

    // 최종 HTML 생성
    let finalHtml = await moduleStore.generateHtml()
    finalHtml = processQuillHtml(finalHtml)

    // 편집 화면의 PC/모바일 선택을 미리보기 초기 모드로 연결
    const initialMode = editorStore.canvasWidth === 'mobile' ? 'mobile' : 'pc'

    // 이메일 본문 문서 (iframe 안에 들어갈 실제 메일) — 템플릿 선택의 미리보기 모달과 공용
    const emailDocument = buildEmailPreviewDocument(finalHtml)

    // 미리보기 창(바깥 크롬) — 상단 PC/모바일 토글 + 가운데 기기 프레임(iframe)
    const fullHtmlDocument = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>이메일 미리보기</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #e5e7eb;
    }
    .preview-header {
      background: #333;
      color: white;
      padding: 12px 20px;
      position: sticky;
      top: 0;
      z-index: 1000;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .preview-header h2 { margin: 0; font-size: 18px; font-weight: 600; }
    .header-right { display: flex; align-items: center; gap: 16px; }
    .mode-toggle { display: flex; background: rgba(255,255,255,0.12); border-radius: 6px; padding: 3px; }
    .mode-btn {
      background: transparent;
      border: none;
      color: rgba(255,255,255,0.7);
      font-size: 14px;
      cursor: pointer;
      padding: 6px 16px;
      border-radius: 4px;
      transition: all 0.15s;
    }
    .mode-btn:hover { color: white; }
    .mode-btn.active { background: white; color: #333; font-weight: 600; }
    .close-btn {
      background: rgba(255,255,255,0.1);
      border: none;
      color: white;
      font-size: 14px;
      cursor: pointer;
      padding: 8px 16px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .close-btn:hover { background: rgba(255,255,255,0.2); }
    .stage {
      display: flex;
      justify-content: center;
      padding: 24px 16px;
    }
    .device-frame {
      width: 100%;
      max-width: 680px;
      transition: max-width 0.25s ease;
    }
    .device-label {
      text-align: center;
      color: #6b7280;
      font-size: 13px;
      margin-bottom: 10px;
    }
    .preview-frame {
      width: 100%;
      border: none;
      background: white;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      border-radius: 4px;
      display: block;
    }
    body.mode-mobile .device-frame { max-width: 375px; }
  </style>
</head>
<body class="mode-${initialMode}">
  <div class="preview-header">
    <h2>📧 이메일 미리보기</h2>
    <div class="header-right">
      <div class="mode-toggle">
        <button class="mode-btn${initialMode === 'pc' ? ' active' : ''}" id="btn-pc">🖥️ PC</button>
        <button class="mode-btn${initialMode === 'mobile' ? ' active' : ''}" id="btn-mobile">📱 모바일</button>
      </div>
      <button class="close-btn" onclick="window.close()">닫기</button>
    </div>
  </div>
  <div class="stage">
    <div class="device-frame">
      <div class="device-label" id="device-label">${initialMode === 'mobile' ? '모바일 · 너비 375px' : 'PC · 너비 680px'}</div>
      <iframe class="preview-frame" id="preview-frame"></iframe>
    </div>
  </div>
  <script>
    var emailDoc = ${JSON.stringify(emailDocument)};
    var frame = document.getElementById('preview-frame');
    var label = document.getElementById('device-label');
    var btnPc = document.getElementById('btn-pc');
    var btnMobile = document.getElementById('btn-mobile');
    frame.srcdoc = emailDoc;

    // 내부 콘텐츠 높이에 맞춰 iframe 높이 자동 조정 (스크롤 중첩 방지)
    function syncHeight() {
      try {
        var doc = frame.contentDocument || frame.contentWindow.document;
        if (doc && doc.body) {
          frame.style.height = doc.body.scrollHeight + 'px';
        }
      } catch (e) {}
    }
    frame.addEventListener('load', function () {
      syncHeight();
      setTimeout(syncHeight, 150);
    });

    function setMode(mode) {
      if (mode === 'mobile') {
        document.body.className = 'mode-mobile';
        btnMobile.classList.add('active');
        btnPc.classList.remove('active');
        label.textContent = '모바일 · 너비 375px';
      } else {
        document.body.className = 'mode-pc';
        btnPc.classList.add('active');
        btnMobile.classList.remove('active');
        label.textContent = 'PC · 너비 680px';
      }
      // 폭 전환 애니메이션(0.25s) 이후 높이 재측정
      setTimeout(syncHeight, 300);
    }
    btnPc.addEventListener('click', function () { setMode('pc'); });
    btnMobile.addEventListener('click', function () { setMode('mobile'); });
  <\/script>
</body>
</html>`

    const blob = new Blob([fullHtmlDocument], { type: 'text/html; charset=utf-8' })
    const url = URL.createObjectURL(blob)

    // 이전 미리보기 blob URL 정리 (이미 열린 창은 곧 새 URL로 이동하므로 안전)
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl)
    }
    previewObjectUrl = url

    // 이름 있는 타깃으로 열기 — 같은 이름의 창이 이미 있으면 새 창을 띄우지 않고
    // 해당 창을 새 내용으로 이동(새로고침)시킨다
    const previewWindow = window.open(url, PREVIEW_WINDOW_NAME, 'width=800,height=600,scrollbars=yes')

    if (!previewWindow) {
      showError('팝업 차단됨', '브라우저 설정에서 팝업 차단을 해제해주세요')
      URL.revokeObjectURL(url)
      previewObjectUrl = null
      return
    }

    // 재사용된 창을 앞으로 가져온다
    previewWindow.focus()
  } catch (error) {
    showError('미리보기 실패', error instanceof Error ? error.message : '알 수 없는 오류')
  }
}

/**
 * HTML 복사
 */
const exportHtml = async (): Promise<void> => {
  try {
    // 다운로드(발송용)와 동일하게 완전한 HTML 문서로 감싸 복사 (메타데이터 제외)
    const html = await buildDocument(false)
    await navigator.clipboard.writeText(html)
    showSuccess('복사 완료', 'HTML이 클립보드에 복사되었습니다')
  } catch (error) {
    showError('복사 실패', 'HTML을 복사하지 못했습니다')
  }
}

/** HTML 파일 다운로드 — 실제 저장은 useNewsletterDownload(레일 '새 작업'과 공용)가 한다 */
const downloadHtml = async (includeMetadata: boolean): Promise<void> => {
  await downloadNewsletterHtml(includeMetadata)
}

/**
 * 임시 저장 — 지금 작업을 **회차 폴더에** 저장용(재편집 가능) HTML로 올린다.
 *
 * '저장용 내려받기'는 내 PC로만 받기 때문에 담당자나 PC가 바뀌면 이어서 편집할 방법이 없다.
 * 같은 이름(`{전시회}_{폴더}_edit.html`)으로 덮어써 **폴더에는 최신 한 개만** 남는다.
 * (이미지와 같은 폴더에 두는 이유: 파일이 하나뿐이라 하위 폴더를 팔 이유가 없고,
 *  폴더 선택 화면이 이미 그 폴더의 목록을 받아오므로 '이어서 편집'을 바로 알아볼 수 있다)
 */
const saveToFolder = async (): Promise<void> => {
  if (savingToFolder.value) return

  if (!moduleStore.modules?.length) {
    showWarn('임시 저장 불가', '먼저 모듈을 추가해주세요')
    return
  }
  const directory = buildUploadDirectory(editorStore.uploadFolder, editorStore.wrapSettings.volume)
  if (!directory) {
    showWarn('저장할 폴더가 필요해요', MISSING_VOLUME_MESSAGE)
    return
  }

  savingToFolder.value = true
  try {
    // 재편집 메타데이터를 담아 올린다 — 나중에 그대로 불러와 이어서 편집하기 위함
    const document = await buildDocument(true)
    const filename = buildDownloadFileName(
      editorStore.currentTemplateId,
      editorStore.wrapSettings.volume,
      'edit',
    )

    await uploadHtml(new File([document], filename, { type: 'text/html' }), directory, {
      overwrite: true,
    })

    // 폴더에 남았으니 '저장됨'으로 본다 — 내려받기와 같은 기준
    moduleStore.markAsSaved()
    flashSaved()
    showSuccess('임시 저장 완료', `${displayUploadDirectory(directory)}${filename}`)
  } catch (error) {
    showError(
      '임시 저장 실패',
      error instanceof UploadError
        ? error.message
        : '저장 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
    )
  } finally {
    savingToFolder.value = false
  }
}

// 저장용: 재편집 메타데이터 포함
const downloadForSave = (): Promise<void> => downloadHtml(true)
// 발송용: 메타데이터 제거 (메일 발송용)
const downloadForSend = (): Promise<void> => downloadHtml(false)
</script>

<style scoped>
/* 세로 구분선 */
/* ── 상단 바 골격 (Figma 1125-3053: 1920×60, 좌우 21px) ────────────────── */
.hnav {
  display: flex;
  align-items: center;
  height: 60px;
  padding: 0 21px;
  background: var(--white);
  border-bottom: 1px solid var(--gray-200);
}
/* 홈 ↔ 나머지 25px (1125-3054) */
.hleft {
  display: flex;
  align-items: center;
  gap: 25px;
  min-width: 0;
}
/* 팀·구분선·실행취소·전체삭제·저장 위치 사이 15px (1500-9770) */
.hleft-group {
  display: flex;
  align-items: center;
  gap: 15px;
  min-width: 0;
}
/* 실행취소 ↔ 다시실행 8px (1125-3064) */
.hundo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
/* 우측 묶음 — 저장상태·버튼 모두 10px 간격 (1125-3080 / 1125-3082) */
.hright {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.hbar {
  width: 1px;
  height: 32px;
  background: var(--gray-200);
  flex-shrink: 0;
}
/* 아이콘 버튼 (홈·실행취소/다시실행) — Figma 40×40 */
.hicon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--gray-700);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s;
}
.hicon:hover:not(:disabled) {
  background: var(--gray-100);
}
.hicon:disabled {
  color: var(--gray-300);
  cursor: default;
}
.hicon .material-symbols-outlined {
  font-size: 24px;
}

/* ── 우측 액션 버튼 (Figma 1125-3082: h40 · px16 · gap6 · rounded8 · 15px) ── */
.hbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border: 0;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  transition: filter 0.12s, background 0.12s;
}
.hbtn:hover {
  filter: brightness(0.96);
}
.hbtn .material-symbols-outlined {
  font-size: 22px;
}
/* 임시저장 */
.hbtn--tint {
  background: var(--blue-50);
  color: var(--blue-600);
}
/* 미리보기 — gray/100 배경 + gray/700 글자 */
.hbtn--muted {
  background: var(--gray-100);
  color: var(--gray-700);
}
/* 발송용 — blue/400 채움 */
.hbtn--primary {
  background: var(--blue-400);
  color: var(--white);
}
/* 더 보기 — 40×40 정사각, 흰 배경 + gray/200 테두리 */
.hbtn--icon {
  width: 40px;
  padding: 0;
  background: var(--white);
  border: 1px solid var(--gray-200);
  color: var(--gray-700);
}
/* 소속 팀 (Figma 1125-3060: success/50 배경 + success/700 글자) */
.hteam {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  min-width: 100px;
  border-radius: 8px;
  background: var(--green-50);
  color: var(--green-700);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}
/* 임시 저장 + '저장 완료' 말풍선 (1542-6981: 버튼 아래 8px, 진회색 카드에 흰 16px medium, 위쪽 꼬리) */
.hsave-wrap {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}
.hbubble {
  position: absolute;
  top: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  padding: 12px 20px;
  border-radius: 8px;
  background: var(--gray-750);
  color: var(--white);
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
}
.hbubble::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 7px solid transparent;
  border-bottom-color: var(--gray-750);
}
.hbubble-enter-active,
.hbubble-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.hbubble-enter-from,
.hbubble-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px);
}

/* 파일 저장 위치 — 누르는 버튼이 아니라 말풍선만 띄우는 아이콘 (1527-9112) */
.hpath {
  cursor: default;
}
.hpath:hover,
.hpath:focus-visible {
  background: var(--gray-100);
  outline: none;
}
/* 전체 삭제 (Figma 1125-2964: gap 6px, px 10px, rounded 8px, 14px medium, error/400) */
.hclear {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--red-400);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s;
}
.hclear:hover {
  background: var(--red-50);
}
.hclear .material-symbols-outlined {
  font-size: 22px;
}
/* PC/모바일 세그먼트 토글 */
.seg {
  display: inline-flex;
  background-color:var(--gray-100);
  border-radius: 5rem;
}
.seg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 32px;
  border: 0;
  border-radius: 1000px;
  background: var(--gray-100);
  color: var(--gray-600);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.seg-btn.is-active {
  background: var(--gray-800);
  color: var(--white);
}
.seg-btn .material-symbols-outlined {
  font-size: 20px;
}
</style>
