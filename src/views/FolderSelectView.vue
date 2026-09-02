<script setup lang="ts">
/**
 * 폴더 선택 (템플릿 선택 → **폴더 선택** → 에디터) — Figma 1347-9429 / 1334-7951.
 *
 * 이미지·HTML이 어느 회차 폴더에 쌓일지를 여기서 한 번 정하고 들어간다.
 * 예전에는 에디터 안 '전체 스타일 → 뉴스레터 회차'에서 숫자를 올렸는데,
 * 그러면 이미 있는 폴더를 모른 채 새 폴더를 만들어 같은 회차가 두 군데로 갈라졌다.
 *
 * 폴더를 고르지 않으면 에디터로 넘어갈 수 없다(router 가드가 한 번 더 막는다).
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import FlowStepsHeader from '@/components/layout/FlowStepsHeader.vue'
import TeamTreeSidebar from '@/components/layout/TeamTreeSidebar.vue'
import SearchField from '@/components/SearchField.vue'
import emptyIcon from '@/assets/img/empty_icon.png'
import { useEditorStore } from '@/stores/editorStore'
import { useModuleStore } from '@/stores/moduleStore'
import { buildUploadDirectory, MAX_VOLUME_DEPTH, normalizeVolume } from '@/utils/s3Upload'
import {
  BrowseError,
  fetchText,
  formatModified,
  isUsableFolderName,
  listFolders,
  objectUrl,
  toPrefix,
  validateFolderName,
  type S3Folder,
} from '@/utils/s3Browse'
import { useNewsletterImport } from '@/composables/useNewsletterImport'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const editorStore = useEditorStore()
const moduleStore = useModuleStore()
const toast = useToast()
const { restoreFromHtml } = useNewsletterImport()

const folders = ref<S3Folder[]>([])
const loading = ref(true)
const loadError = ref('')
/** 검색어 — 있는 폴더를 걸러내기만 한다. 새 폴더 이름은 아래 `newName`이 따로 받는다 */
const query = ref('')
/** 고른 폴더 이름. 아직 없는 폴더면 isNew */
const picked = ref<{ name: string; isNew: boolean } | null>(null)
let controller: AbortController | null = null

const teamName = computed(
  () =>
    moduleStore.availableDepartments
      .flatMap((d) => d.teams)
      .find((t) => t.id === editorStore.currentTeamId)?.name ?? '',
)
/** 소속 팀이 정해졌는지 — 빈 템플릿은 이 화면에서 고르므로 처음에는 비어 있다 */
const hasTeam = computed(() => !!editorStore.currentTeamId)
/**
 * 여기서 팀을 고를 수 있는지 — 빈 템플릿일 때만.
 * 템플릿으로 시작했으면 그 템플릿의 팀이 곧 소속이라, 트리는 어디에 저장되는지만 보여준다.
 */
const canPickTeam = computed(() => !editorStore.currentTemplateId)
const templateName = computed(() => editorStore.currentTemplateName || '빈 템플릿')
/** 경로에 쓰이는 전시회 폴더 이름 — 'gocaf' (템플릿 없이 시작하면 'blank') */
const rootFolderName = computed(() => editorStore.currentTemplateId || 'blank')

/** 읽어올 자리 — 업로드 경로에서 회차만 뺀 앞부분 (`…/newsletterbuilder/{팀}/{전시회}/`) */
const basePrefix = computed(() => {
  const sample = buildUploadDirectory(editorStore.uploadFolder, 'vol01')
  return sample ? toPrefix(sample.replace(/vol01\/$/, '')) : ''
})

/**
 * 지금 들어와 있는 폴더 — 전시회 폴더 바로 아래면 빈 값, 한 겹 들어가면 'eng'.
 *
 * 폴더 안에 폴더를 둘 수 있어(gocaf/eng/vol01) 목록이 한 층에서 끝나지 않는다.
 * 저장은 언제나 맨 안쪽 폴더에 하므로, 폴더를 품은 폴더는 고르는 대신 들어간다.
 */
const openedPath = ref<string[]>([])
/** 지금 보고 있는 자리의 전체 prefix */
const currentPrefix = computed(() =>
  openedPath.value.length ? `${basePrefix.value}${openedPath.value.join('/')}/` : basePrefix.value,
)
/** 폴더 안으로 한 겹이라도 들어와 있는지 — 이때는 화면 머리가 통째로 바뀐다 (Figma 1359-610) */
const isNested = computed(() => openedPath.value.length > 0)
/** 여기서 폴더를 더 만들 수 있는지 — 허용 깊이(2단계)를 넘지 않을 때만 */
const canNest = computed(() => openedPath.value.length < MAX_VOLUME_DEPTH)
/**
 * 여기 있는 폴더 안으로 들어갈 수 있는지.
 * 들어가면 그 안에 만들 폴더가 한 겹 더 깊어지므로, 그 깊이까지 허용될 때만 열어 준다.
 */
const canEnter = computed(() => openedPath.value.length + 2 <= MAX_VOLUME_DEPTH)

const load = async () => {
  // 팀을 아직 안 골랐으면 읽을 자리가 없다 — 오류가 아니라 '팀부터 고르는' 화면을 보여준다
  if (!hasTeam.value) {
    folders.value = []
    loadError.value = ''
    loading.value = false
    return
  }
  if (!basePrefix.value) {
    loadError.value = '올릴 자리를 정할 수 없어요. 템플릿을 다시 골라 주세요.'
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = ''
  controller?.abort()
  controller = new AbortController()
  try {
    folders.value = await listFolders(currentPrefix.value, controller.signal)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    loadError.value = err instanceof BrowseError ? err.message : '목록을 읽지 못했어요'
    folders.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 폴더 안으로 들어간다 — 목록·검색·고른 것을 그 자리 기준으로 새로 시작한다.
 *
 * 아직 서버에 없는(방금 만든) 폴더로도 들어갈 수 있다. S3는 첫 파일이 올라갈 때
 * 폴더가 생기므로, 'eng'을 만들고 그 안에 'vol01'을 만들면 저장하는 순간 두 겹이 함께 생긴다.
 */
const openFolder = (name: string) => {
  openedPath.value = [...openedPath.value, name]
  pendingFolder.value = null
  picked.value = null
  query.value = ''
  creating.value = false
  void load()
}

/** 위로 — 인수 없이 부르면 맨 위(전시회 폴더)로 */
const goUp = (depth = 0) => {
  openedPath.value = openedPath.value.slice(0, depth)
  pendingFolder.value = null
  picked.value = null
  query.value = ''
  creating.value = false
  void load()
}

/**
 * 팀을 고른다 — 빈 템플릿 전용. 팀이 바뀌면 보고 있던 자리도 통째로 바뀌므로
 * 들어와 있던 폴더·고른 폴더·검색어를 모두 처음으로 돌리고 다시 읽는다.
 */
const pickTeam = (teamId: string) => {
  if (!canPickTeam.value || teamId === editorStore.currentTeamId) return
  editorStore.setCurrentTeam(teamId)
  openedPath.value = []
  pendingFolder.value = null
  picked.value = null
  query.value = ''
  creating.value = false
  void load()
}

onMounted(async () => {
  // 팀 트리는 템플릿 목록과 같은 파일에서 온다 — 빈 템플릿으로 곧장 들어오면 아직 비어 있다
  if (!moduleStore.availableDepartments.length) await moduleStore.loadAvailableTemplates()
  await load()
})
onBeforeUnmount(() => controller?.abort())

/** 화면에 그릴 목록 — 방금 만든 폴더를 맨 위에 얹는다 */
const allFolders = computed<S3Folder[]>(() =>
  pendingFolder.value
    ? [
        { name: pendingFolder.value, itemCount: 0, hasChildren: false, lastModified: null },
        ...folders.value.filter((f) => f.name !== pendingFolder.value),
      ]
    : folders.value,
)

/** 검색어로 걸러낸 목록 */
const visibleFolders = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? allFolders.value.filter((f) => f.name.toLowerCase().includes(q)) : allFolders.value
})

/**
 * '새 폴더' 만들기 — 검색과 섞지 않고 버튼으로 따로 연다.
 * (검색창이 이름 입력을 겸하면 폴더를 찾으려 친 글자가 곧 새 폴더 이름이 돼 헷갈린다)
 */
const creating = ref(false)
const newName = ref('')
const newNameInput = ref<InstanceType<typeof InputText> | null>(null)
/**
 * 방금 만든 폴더 — 아직 서버에는 없고 화면에만 있는 한 줄.
 *
 * 목록의 다른 폴더와 똑같이 다룬다(고를 수도, 안으로 들어갈 수도 있다).
 * 그래야 'eng'을 만들고 그 안에 'vol01'을 만드는 길이 열린다.
 */
const pendingFolder = ref<string | null>(null)

const focusInput = (holder: { $el?: HTMLInputElement } | null) => holder?.$el?.focus()

const startCreate = async () => {
  creating.value = true
  newName.value = ''
  await nextTick()
  focusInput(newNameInput.value as unknown as { $el?: HTMLInputElement })
}

const cancelCreate = () => {
  creating.value = false
  newName.value = ''
}

/** 적어 넣은 이름으로 새로 만들 수 있는지 — 이미 있으면 만들기 대신 고르면 된다 */
const newNameError = computed(() => {
  if (!newName.value.trim()) return null
  const taken = folders.value.map((f) => f.name)
  if (pendingFolder.value) taken.push(pendingFolder.value)
  return validateFolderName(newName.value, taken)
})
const canCreate = computed(() => !!newName.value.trim() && !newNameError.value)

/**
 * 폴더 한 줄을 눌렀을 때 — 안에 폴더가 또 있으면 **들어가고**, 아니면 고른다.
 * 저장은 언제나 맨 안쪽 폴더에 하므로, 폴더를 품은 폴더는 고를 대상이 아니다.
 * (안이 빈 폴더는 줄 오른쪽의 열기 버튼으로 들어간다)
 */
const pickExisting = (folder: S3Folder) => {
  if (!isUsableFolderName(folder.name)) return
  if (folder.hasChildren && canEnter.value) {
    openFolder(folder.name)
    return
  }
  picked.value = { name: folder.name, isNew: folder.name === pendingFolder.value }
}

/** 적어 넣은 이름으로 한 줄을 만든다 — 여기서 고르거나, 열기로 들어가 그 안에 또 만들 수 있다 */
const createFolder = () => {
  if (!canCreate.value) return
  const name = newName.value.trim().toLowerCase()
  pendingFolder.value = name
  picked.value = { name, isNew: true }
  creating.value = false
  newName.value = ''
}


/**
 * 폴더가 하나도 없는 상태 — 이때는 표 대신 일러스트와 '폴더 만들기' 버튼만 보여준다(Figma 1347-9429).
 * 만들기를 누른 뒤에는 표 안의 입력 줄로 이어지므로 빈 화면이 아니다.
 */
const isEmptyState = computed(
  () =>
    hasTeam.value &&
    !loading.value &&
    !loadError.value &&
    !allFolders.value.length &&
    !creating.value,
)

/** 폴더는 있는데 검색어와 맞는 게 하나도 없는 상태 — 같은 빈 화면을 문구만 바꿔 재사용한다 */
const isNoMatch = computed(
  () =>
    !loading.value && !loadError.value && !!allFolders.value.length && !visibleFolders.value.length,
)

/** 고른 폴더 — 서버에서 읽어 온 것일 때만(방금 만든 폴더에는 아직 아무것도 없다) */
const pickedFolder = computed(() =>
  picked.value && !picked.value.isNew
    ? (folders.value.find((f) => f.name === picked.value?.name) ?? null)
    : null,
)
/** 고른 폴더에 놓인 임시 저장 파일 — 있으면 '이어서 편집'을 내민다 */
const pickedEditFile = computed(() => pickedFolder.value?.editFile ?? null)
/** 고른 폴더에 놓인 발송용 파일 — 이 회차가 이미 나갔다는 표시 */
const pickedSendFile = computed(() => pickedFolder.value?.sendFile ?? null)
/** 발송본을 새 창에서 열 주소 */
const sendFileUrl = computed(() =>
  pickedSendFile.value ? objectUrl(pickedSendFile.value.key) : undefined,
)

/** 안이 빈 폴더에 들어와 있는지 — 빈 화면 문구를 그 자리에 맞게 바꾼다 */
const isInsideEmpty = computed(() => isEmptyState.value && openedPath.value.length > 0)

const goBack = () => router.push({ name: 'templates' })

/** 저장할 자리 — 들어와 있는 폴더까지 포함한 경로 ('eng/vol01') */
const pickedVolume = computed(() =>
  picked.value ? normalizeVolume([...openedPath.value, picked.value.name].join('/')) : '',
)

/**
 * 고른 폴더를 회차로 저장하고 에디터로.
 * 새 폴더는 여기서 만들지 않는다 — S3에는 빈 폴더가 없고, 첫 파일이 올라가면 그 자리가 곧 폴더다.
 */
const goNext = () => {
  if (!picked.value) return
  editorStore.updateWrapSettings({ volume: pickedVolume.value })
  router.push({ name: 'editor' })
}

/**
 * 이어서 편집 — 폴더에 올려 둔 임시 저장 파일을 읽어 그 상태로 복원한 뒤 에디터로 간다.
 *
 * 여기까지 오는 동안 템플릿이 이미 적용돼 있지만, 복원이 그 위를 덮어쓴다
 * ('파일 열기'와 같은 경로를 쓴다 — 예전 방식 모듈이 있으면 변환 여부도 똑같이 물어본다).
 */
const restoring = ref(false)
const continueEditing = async () => {
  const file = pickedEditFile.value
  if (!file || restoring.value) return
  restoring.value = true
  try {
    const html = await fetchText(file.key)
    const ok = await restoreFromHtml(html)
    if (!ok) return // 안내는 restoreFromHtml이 띄운다
    editorStore.updateWrapSettings({ volume: pickedVolume.value })
    router.push({ name: 'editor' })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: '불러오지 못했어요',
      detail: err instanceof BrowseError ? err.message : '파일을 읽는 중 문제가 생겼어요',
      life: 5000,
    })
  } finally {
    restoring.value = false
  }
}

</script>

<template>
  <div class="fd-page">
    <FlowStepsHeader :current="2" />

    <div class="fd-body">
      <!--
        좌측: 템플릿 선택과 같은 팀 메뉴.
        빈 템플릿이면 여기서 팀을 골라 폴더를 나누고, 템플릿으로 들어왔으면 그 팀만 켜 둔다.
        맨 윗칸('전체' 자리)은 템플릿을 다시 고르러 나가는 길이다.
      -->
      <TeamTreeSidebar
        :model-value="editorStore.currentTeamId ?? ''"
        top-label="다른 템플릿 선택"
        top-back
        :selectable="canPickTeam"
        @update:model-value="pickTeam"
        @top="goBack"
      />

      <main class="fd-main" :class="{ 'fd-main--nested': isNested }">
        <!--
          폴더 안에 들어와 있으면 머리가 통째로 바뀐다 (Figma 1359-610):
          맨 위에 지나온 경로, 그 아래 전시회 이름이 제목을 겸하고, 검색줄 대신 만들기 아이콘만 남는다.
        -->
        <nav v-if="isNested" class="fd-crumbs">
          <button type="button" class="fd-crumb fd-crumb--link" @click="goUp(0)">
            {{ rootFolderName }}
          </button>
          <template v-for="(segment, i) in openedPath" :key="segment">
            <span class="fd-crumb-sep">&gt;</span>
            <button
              v-if="i < openedPath.length - 1"
              type="button"
              class="fd-crumb fd-crumb--link"
              @click="goUp(i + 1)"
            >
              {{ segment }}
            </button>
            <span v-else class="fd-crumb">{{ segment }}</span>
          </template>
        </nav>

        <template v-if="!isNested">
          <h1 class="fd-title">저장할 폴더를 선택해주세요.</h1>

          <!-- 팀을 고르기 전에는 훑을 폴더도, 만들 자리도 없다 -->
          <div v-if="hasTeam" class="fd-search-row">
            <SearchField
              v-model="query"
              class="fd-search"
              size="lg"
              placeholder="폴더명을 검색하세요"
              aria-label="폴더 검색"
            />
            <!-- 빈 화면일 때는 그쪽 버튼 하나만 남긴다 — 같은 일을 하는 버튼이 둘이면 헷갈린다 -->
            <button
              v-if="canNest && !creating && !isEmptyState && !isNoMatch"
              type="button"
              class="fd-create-btn fd-create-btn--top"
              @click="startCreate"
            >
              <span class="material-symbols-outlined">create_new_folder</span>
              폴더 만들기
            </button>
          </div>
        </template>

        <!--
          어느 전시회의 폴더를 보고 있는지. 폴더 안에서는 이 줄이 제목 자리(34px)를 대신하므로
          빈 화면에서도 남는다 — 경로만 덩그러니 남으면 여기가 어디인지 알 수 없다.
        -->
        <div
          v-if="hasTeam && (isNested || !isEmptyState)"
          class="fd-context"
          :class="{ 'fd-context--title': isNested }"
        >
          <span class="fd-context-name">{{ templateName }}</span>
          <span v-if="teamName" class="fd-context-team">{{ teamName }}</span>
          <span v-if="!isNested" class="ml-auto text-gray-500">*폴더 삭제는 UXD팀에게 문의해주세요.</span>
          <!-- 폴더 안에는 검색줄이 없어 만들기 버튼이 이 줄 오른쪽 끝에 붙는다 (모양은 검색줄의 것과 같다) -->
          <button
            v-if="isNested && canNest && !creating && !isEmptyState"
            type="button"
            class="fd-create-btn fd-create-btn--top"
            @click="startCreate"
          >
            <span class="material-symbols-outlined">create_new_folder</span>
            폴더 만들기
          </button>
        </div>

        <!--
          빈 템플릿으로 들어와 아직 팀을 안 골랐을 때 — 폴더는 팀 아래에 나뉘어 있어
          팀부터 골라야 보여줄 것이 생긴다. 고르고 나면 아래 '폴더 만들기' 흐름으로 이어진다.
        -->
        <div v-if="!hasTeam" class="fd-empty">
          <img :src="emptyIcon" alt="" class="fd-empty-img" />
          <p class="fd-empty-text">
            팀을 먼저 선택해 주세요.<br />
            왼쪽에서 팀을 고르면 그 팀의 폴더를 보여드려요.
          </p>
        </div>

        <!-- 폴더가 없을 때는 표 대신 일러스트만 (Figma 1347-9429) -->
        <div v-else-if="isEmptyState" class="fd-empty">
          <img :src="emptyIcon" alt="" class="fd-empty-img" />
          <p v-if="isInsideEmpty" class="fd-empty-text">
            이 폴더 안에는 아직 폴더가 없어요.<br />
            여기에 새로 만들거나, 위 경로를 눌러 되돌아갈 수 있어요.
          </p>
          <p v-else class="fd-empty-text">
            아직 저장할 폴더가 없어요.<br />
            폴더를 새로 만들어 시작해 주세요.
          </p>
          <button v-if="canNest" type="button" class="fd-create-btn" @click="startCreate">
            <span class="material-symbols-outlined">create_new_folder</span>
            폴더 만들기
          </button>
        </div>

        <template v-else>
        <!-- 목록 -->
        <div class="fd-table">
          <div class="fd-thead">
            <span class="fd-col-name">이름</span>
            <span class="fd-col-type">유형</span>
            <span class="fd-col-at">마지막 수정</span>
            <!-- 줄 오른쪽 열기 버튼만큼 비워 둔다 — 없으면 머리글과 아래 값이 어긋난다 -->
            <span v-if="canEnter" class="fd-thead-enter" aria-hidden="true"></span>
          </div>

          <p v-if="loading" class="fd-state">폴더를 읽는 중…</p>
          <p v-else-if="loadError" class="fd-state fd-state--error">{{ loadError }}</p>

          <template v-else>
            <!-- 새 폴더 이름 — 목록 맨 위에서 바로 적는다 (검색창은 검색만 한다) -->
            <div v-if="creating" class="fd-row fd-row--new">
              <span class="fd-row-left">
                <span class="material-symbols-outlined fd-folder-icon">create_new_folder</span>
                <span class="fd-row-text">
                  <InputText
                    ref="newNameInput"
                    v-model="newName"
                    placeholder="새 폴더 이름 (예: vol01)"
                    class="fd-new-input"
                    @keydown.enter="createFolder"
                    @keydown.esc="cancelCreate"
                  />
                  <span class="fd-row-sub" :class="{ 'fd-row-sub--error': newNameError }">
                    {{ newNameError ?? '새로 만들 폴더' }}
                  </span>
                </span>
              </span>
              <span class="fd-row-right fd-new-actions">
                <button
                  type="button"
                  class="fd-new-action"
                  :disabled="!canCreate"
                  @click="createFolder"
                >
                  만들기
                </button>
                <button type="button" class="fd-new-action fd-new-action--ghost" @click="cancelCreate">
                  취소
                </button>
              </span>
            </div>

            <!--
              한 줄에 두 가지 일이 붙는다 — 왼쪽 넓은 자리는 '여기에 저장'(선택),
              오른쪽 화살표는 '이 폴더 안으로'. 버튼 안에 버튼을 넣을 수 없어 줄은 div로 둔다.
            -->
            <div
              v-for="folder in visibleFolders"
              :key="folder.name"
              class="fd-row"
              :class="{
                'is-picked': picked && picked.name === folder.name,
                'is-disabled': !isUsableFolderName(folder.name),
              }"
            >
              <button
                type="button"
                class="fd-row-main"
                :disabled="!isUsableFolderName(folder.name)"
                @click="pickExisting(folder)"
              >
                <span class="fd-row-left">
                  <span class="material-symbols-outlined fd-folder-icon">folder</span>
                  <span class="fd-row-text">
                    <span class="fd-row-name">
                      {{ folder.name }}/
                      <!-- 임시 저장 파일이 있으면 여기서 이어서 편집할 수 있다고 미리 알린다 -->
                      <!-- 이미 나간 회차 — 손대기 전에 알아볼 수 있게 앞에 둔다 -->
                      <span v-if="folder.sendFile" class="fd-row-badge fd-row-badge--sent">
                        발송 완료
                      </span>
                      <span v-if="folder.editFile" class="fd-row-badge">이어서 편집</span>
                      <span v-if="folder.name === pendingFolder" class="fd-row-badge fd-row-badge--new">
                        새 폴더
                      </span>
                    </span>
                    <span class="fd-row-sub">
                      {{ isUsableFolderName(folder.name)
                        ? (folder.name === pendingFolder
                          ? '저장할 때 만들어져요'
                          : `${folder.itemCount}개 항목`)
                        : '주소 규칙과 맞지 않아 고를 수 없어요' }}
                    </span>
                  </span>
                </span>
                <span class="fd-row-right">
                  <span class="fd-col-type">폴더</span>
                  <span class="fd-col-at">{{ formatModified(folder.lastModified) }}</span>
                </span>
              </button>
              <!-- 안으로 들어가기 — 방금 만든 빈 폴더도 여기로 들어가 그 안에 또 만든다 -->
              <button
                v-if="canEnter && isUsableFolderName(folder.name)"
                type="button"
                class="fd-row-enter"
                :title="`${folder.name} 폴더 열기`"
                @click="openFolder(folder.name)"
              >
                <span class="material-symbols-outlined">chevron_right</span>
              </button>
            </div>

            <!-- 검색어와 맞는 폴더가 없을 때 — 폴더가 아예 없을 때와 같은 빈 화면을 문구만 바꿔 쓴다 -->
            <div v-if="isNoMatch" class="fd-empty fd-empty--inline">
              <img :src="emptyIcon" alt="" class="fd-empty-img" />
              <p class="fd-empty-text">
                검색한 폴더가 없어요.<br />
                폴더를 새로 만들거나 다시 검색해주세요.
              </p>
              <button v-if="canNest && !creating" type="button" class="fd-create-btn" @click="startCreate">
                <span class="material-symbols-outlined">create_new_folder</span>
                폴더 만들기
              </button>
            </div>
          </template>
        </div>
        </template>
      </main>
    </div>

    <footer class="fd-footer">
      <div v-if="pickedEditFile || pickedSendFile" class="fd-footer-notes">
        <!-- 고른 폴더에 임시 저장 파일이 있으면 '이어서 편집'을 기본 동작으로 내민다 -->
        <p v-if="pickedEditFile" class="fd-footer-note">
          <span class="material-symbols-outlined">cloud_upload</span>
          {{ pickedEditFile.name }} · {{ formatModified(pickedEditFile.lastModified) }}
        </p>
        <!--
          이미 나간 회차 — 무엇이 나갔는지 열어 볼 수 있게 한다.
          발송용 파일은 재편집 메타데이터가 없어 불러올 수 없다(이어서 편집은 임시 저장 파일이 맡는다).
        -->
        <p v-if="pickedSendFile" class="fd-footer-note fd-footer-note--sent">
          <span class="material-symbols-outlined">send</span>
          {{ formatModified(pickedSendFile.lastModified) }}에 발송용 파일이 올라갔어요 ·
          <a :href="sendFileUrl" target="_blank" rel="noopener noreferrer">발송본 열기</a>
          <template v-if="pickedEditFile">— 이어서 편집한 뒤 링크를 다시 만들면 덮어써요</template>
          <template v-else>— 임시 저장 파일이 없어 이어서 편집은 할 수 없어요</template>
        </p>
      </div>
      <button type="button" class="fd-btn fd-btn--ghost" @click="goBack">이전으로</button>
      <button
        type="button"
        class="fd-btn"
        :class="pickedEditFile ? 'fd-btn--ghost' : 'fd-btn--primary'"
        :disabled="!picked || restoring"
        @click="goNext"
      >
        {{ pickedEditFile ? '새로 시작' : '다음' }}
      </button>
      <button
        v-if="pickedEditFile"
        type="button"
        class="fd-btn fd-btn--primary"
        :disabled="restoring"
        @click="continueEditing"
      >
        {{ restoring ? '불러오는 중…' : '이어서 편집' }}
      </button>
    </footer>
  </div>
</template>

<style scoped>
.fd-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--white);
}
.fd-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.fd-main {
  flex: 1;
  min-width: 0;
  padding: 60px 68px 40px;
  overflow-y: auto;
}
.fd-title {
  margin: 0 0 32px;
  font-size: 34px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: -0.34px;
  color: var(--black);
}

/* 검색 = 필터 + 새 폴더 이름 입력 */
.fd-search-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
/* 모양은 공용 SearchField(lg)가 갖고, 여기서는 폭만 잡는다 */
.fd-search {
  width: 630px;
  max-width: 100%;
}
/* 폴더 만들기 — 검색줄 오른쪽과 빈 화면 가운데에서 같은 모양으로 쓴다 */
.fd-create-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: var(--blue-400);
  color: var(--white);
  font-size: 16px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}
.fd-create-btn:hover {
  background: var(--blue-500);
}
.fd-create-btn .material-symbols-outlined {
  font-size: 20px;
}
/* 검색줄에서는 오른쪽 끝으로 민다 */
.fd-create-btn--top {
  margin-left: auto;
}
/* 새 폴더 줄 — 이름 입력과 만들기/취소 */
.fd-new-input {
  width: 260px;
  max-width: 100%;
  height: 34px;
  padding: 0 10px;
  font-size: 17px;
}
.fd-row-sub--error {
  color: var(--red-700);
}
.fd-new-actions {
  gap: 8px;
}
.fd-new-action {
  padding: 9px 18px;
  border: none;
  border-radius: 8px;
  background: var(--blue-400);
  color: var(--white);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}
.fd-new-action:hover:not(:disabled) {
  background: var(--blue-500);
}
.fd-new-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.fd-new-action--ghost {
  background: var(--gray-100);
  color: var(--gray-800);
}
.fd-new-action--ghost:hover {
  background: var(--gray-200) !important;

}

/* 어느 폴더 안에 들어와 있는지 — gocaf > eng, 화면 맨 위 (Figma 1359-610) */
.fd-crumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 5px;
  font-size: 17px;
  line-height: 20px;
  color: var(--gray-600);
}
.fd-crumb {
  padding: 0;
  border: none;
  background: none;
  font-size: 17px;
  line-height: 20px;
  color: var(--gray-600);
}
.fd-crumb--link {
  text-decoration: underline;
  cursor: pointer;
}
.fd-crumb--link:hover {
  color: var(--blue-500);
}
.fd-crumb-sep {
  color: var(--gray-600);
}
/* 경로가 제목 위로 올라오는 만큼 위 여백을 줄인다 (경로 가운데가 nav에서 47px) */
.fd-main--nested {
  padding-top: 37px;
}

/* 어느 전시회의 폴더를 보고 있는지 */
.fd-context {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 46px;
}
.fd-context-name {
  font-size: 24px;
  font-weight: 500;
  letter-spacing: -0.24px;
  color: var(--gray-800);
}
.fd-context-team {
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--green-50);
  color: var(--green-700);
  font-size: 14px;
  font-weight: 500;
}
/* 폴더 안에서는 이 줄이 곧 제목이다 — 크기·색을 fd-title과 맞춘다 (Figma 1359-610) */
.fd-context--title {
  margin-top: 0;
}
.fd-context--title .fd-context-name {
  font-size: 34px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: -0.34px;
  color: var(--black);
}
.fd-table {
  margin-top: 32px;
}
/* 제목(34px)과 머리글 사이는 62px */
.fd-main--nested .fd-table {
  margin-top: 62px;
}
.fd-thead {
  display: flex;
  align-items: center;
  padding: 0 20px 12px;
  font-size: 15px;
  color: var(--gray-600);
}
.fd-col-name {
  flex: 1;
  min-width: 0;
}
.fd-col-type {
  width: 120px;
  flex-shrink: 0;
}
.fd-col-at {
  width: 260px;
  flex-shrink: 0;
  text-align: center;
}
/* 머리글 끝의 빈자리 — .fd-row-enter(40px + 오른쪽 여백 12px)와 같은 폭 */
.fd-thead-enter {
  width: 40px;
  margin-right: 12px;
  flex-shrink: 0;
}

/* 줄은 테두리와 배경만 맡고, 안의 두 버튼(선택·열기)이 자리를 나눠 쓴다 */
.fd-row {
  display: flex;
  align-items: center;
  width: 100%;
  border-top: 1px solid var(--gray-200);
}
.fd-row:last-of-type {
  border-bottom: 1px solid var(--gray-200);
}
.fd-row:hover {
  background: var(--gray-50);
}
.fd-row.is-picked {
  background: var(--blue-50);
}
.fd-row.is-disabled {
  opacity: 0.55;
}
/* 넓은 왼쪽 — 이 폴더에 저장하기 */
.fd-row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
}
.fd-row-main:disabled {
  cursor: not-allowed;
}
/* 새 폴더 줄(입력)은 안에 버튼이 없어 자기 여백을 스스로 잡는다 */
.fd-row--new {
  justify-content: space-between;
  padding: 18px 20px;
}
.fd-row-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.fd-folder-icon {
  display: flex;
  align-items: center; justify-content: center;
  width: 48px;
  aspect-ratio: 1/1;
  font-size: 26px;
  color: var(--gray-500);
  flex-shrink: 0;
  border-radius: 8px;
  border: 1px solid var(--gray-300);
}
.fd-row--new .fd-folder-icon {
  color: var(--blue-400);
}
.fd-row-text {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}
.fd-row-name {
  font-size: 17px;
  color: var(--gray-800);
  overflow: hidden;
  text-overflow: ellipsis;
}
.fd-row-sub {
  font-size: 15px;
  color: var(--gray-600);
}
/* 이어서 편집할 파일이 있는 폴더 표시 */
.fd-row-badge {
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 20px;
  background: var(--blue-50);
  color: var(--blue-600);
  font-size: 13px;
  font-weight: 500;
  vertical-align: middle;
}
/* 아직 서버에 없는 폴더 — 저장할 때 만들어진다 */
.fd-row-badge--new {
  background: var(--gray-100);
  color: var(--gray-700);
}
/* 이미 나간 회차 */
.fd-row-badge--sent {
  background: var(--green-50);
  color: var(--green-700);
}
.fd-row-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  font-size: 15px;
  color: var(--gray-800);
}
.fd-row-right .fd-col-type {
  font-size: 16px;
}
/* 오른쪽 끝 — 이 폴더 안으로 */
.fd-row-enter {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-right: 12px;
  border: none;
  border-radius: 8px;
  background: none;
  color: var(--gray-500);
  cursor: pointer;
}
.fd-row-enter:hover {
  background: var(--gray-200);
  color: var(--blue-500);
}
.fd-row-enter .material-symbols-outlined {
  font-size: 24px;
}

.fd-state {
  margin: 0;
  padding: 28px 20px;
  font-size: 15px;
  color: var(--gray-600);
  border-top: 1px solid var(--gray-200);
}
.fd-state--error {
  color: var(--red-700);
}

/* 빈 상태 — 검색창 아래 87px 띄우고 289px 일러스트만 가운데에 (Figma 1347-9429) */
.fd-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 10rem;
  flex-direction: column;
  gap: 1rem;
}
.fd-empty-img {
  width: 289px;
  height: 289px;
  object-fit: contain;
}
/* 표 안(검색 결과 없음)에서 다시 쓸 때는 위 여백만 줄인다 */
.fd-empty--inline {
  margin-top: 4rem;
  padding-bottom: 2rem;
}
/* 디자인엔 문구가 없지만, 여기서 할 일(폴더 만들기)을 알려주는 안내를 일러스트 아래 둔다 */
.fd-empty-text {
  margin: 0;
  font-size: 16px;
  line-height: 1.6;
  color: var(--gray-600);
  text-align: center;
}
.fd-empty .fd-create-btn {
  margin-top: 6px;
}

/* 하단 — 다음/이전 */
.fd-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  height: 96px;
  padding: 0 68px;
  border-top: 1px solid var(--gray-200);
  background: var(--white);
  flex-shrink: 0;
}
.fd-btn {
  padding: 14px 36px;
  border: none;
  border-radius: 8px;
  font-size: 17px;
  font-weight: 500;
  cursor: pointer;
}
.fd-btn--ghost {
  background: var(--gray-100);
  color: var(--gray-800);
}
.fd-btn--ghost:hover {
  background: var(--gray-200);
}
.fd-btn--primary {
  background: var(--blue-400);
  color: var(--white);
}
.fd-btn--primary:hover:not(:disabled) {
  background: var(--blue-500);
}
.fd-btn--primary:disabled,
.fd-btn--ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 고른 폴더의 상태 — 버튼 왼쪽에 파일명·시각 */
.fd-footer-notes {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0 auto 0 0;
  min-width: 0;
}
.fd-footer-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 14px;
  color: var(--gray-600);
}
.fd-footer-note .material-symbols-outlined {
  font-size: 20px;
  color: var(--blue-500);
}
/* 이미 나간 회차 — 되돌릴 수 없는 쪽이라 눈에 띄게 */
.fd-footer-note--sent .material-symbols-outlined {
  color: var(--green-700);
}
.fd-footer-note--sent a {
  color: var(--blue-500);
}
</style>
