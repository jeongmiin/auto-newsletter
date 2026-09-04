<script setup lang="ts">
/**
 * 폴더 선택 (템플릿 선택 → **폴더 선택** → 에디터) — Figma 1468-8970 / 1484-1081 / 1488-1333.
 *
 * 이미지·HTML이 어느 회차 폴더에 쌓일지를 여기서 한 번 정하고 들어간다.
 * 예전에는 에디터 안 '전체 스타일 → 뉴스레터 회차'에서 숫자를 올렸는데,
 * 그러면 이미 있는 폴더를 모른 채 새 폴더를 만들어 같은 회차가 두 군데로 갈라졌다.
 *
 * 줄을 다루는 규칙(화살표 버튼 없음):
 *   - 클릭으로 **고르고, 한 번 더 클릭하면 푼다** (안에 폴더가 있어도 같다)
 *   - **더블클릭**하면 안으로 들어간다 (빈 폴더에 또 폴더를 만들 때)
 *   - 1단계의 '여기로 저장'은 고른 폴더 **안으로 들어간다**(비어 있어도). 저장은 2단계에서 한다
 *   - 들어간 폴더가 비어 있으면 새 폴더를 만들거나 **그 자리에 바로 저장**할 수 있다 (1488-1333)
 *   - '이전으로'는 폴더 안이면 한 겹 위로, 맨 위면 템플릿 선택으로
 *
 * 폴더를 고르지 않으면 에디터로 넘어갈 수 없다(router 가드가 한 번 더 막는다).
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import FlowStepsHeader from '@/components/layout/FlowStepsHeader.vue'
import FlowFooter from '@/components/layout/FlowFooter.vue'
import TeamTreeSidebar from '@/components/layout/TeamTreeSidebar.vue'
import SearchField from '@/components/SearchField.vue'
import emptyIcon from '@/assets/img/empty_icon.png'
import emptyFolderIcon from '@/assets/img/empty_folder_icon.png'
import emptyTeamIcon from '@/assets/img/empty_team_icon.png'
import { useEditorStore } from '@/stores/editorStore'
import { useModuleStore } from '@/stores/moduleStore'
import { BLANK_FOLDER, buildUploadDirectory, MAX_VOLUME_DEPTH, normalizeVolume } from '@/utils/s3Upload'
import {
  BrowseError,
  fetchText,
  formatModified,
  isFreshEditFile,
  isUsableFolderName,
  listFolders,
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
/**
 * 빈 템플릿은 전시회 폴더를 모른 채 들어온다 — 그때는 **팀 폴더 안의 전시회 폴더 목록**을 먼저
 * 보여주고 하나를 고르게 한다(Figma 1500-9394). 고르면 그 폴더가 전시회 자리가 되어
 * 템플릿으로 들어왔을 때와 같은 화면(회차 폴더 목록)으로 이어진다.
 */
const atTeamLevel = computed(() => hasTeam.value && editorStore.isBlankStart && !editorStore.blankFolder)
/** 경로에 쓰이는 전시회 폴더 이름 — 'gocaf' (빈 템플릿이면 팀 폴더에서 고른 이름) */
const rootFolderName = computed(
  () => editorStore.currentTemplateId || editorStore.blankFolder || BLANK_FOLDER,
)
/**
 * 화면에 적는 전시회 이름.
 * 템플릿으로 들어왔으면 그 이름. 빈 템플릿이면 고른 폴더 이름과 **id가 같은 템플릿의 이름**을
 * 찾아 쓴다('nextcon' → '넥스트콘'). 짝이 없는 폴더(space_design 등)는 폴더 이름 그대로.
 */
const contextName = computed(() => {
  if (editorStore.currentTemplateId) return templateName.value
  const folder = editorStore.blankFolder
  if (!folder) return templateName.value
  return moduleStore.availableTemplates.find((t) => t.id === folder)?.name ?? folder
})

/**
 * 읽어올 자리 — 업로드 경로에서 회차만 뺀 앞부분.
 * 전시회 단계: `…/newsletterbuilder/{팀}/{전시회}/` · 팀 폴더 단계: `…/newsletterbuilder/{팀}/`
 */
const basePrefix = computed(() => {
  const folder = atTeamLevel.value ? editorStore.currentTeamId : editorStore.uploadFolder
  const sample = buildUploadDirectory(folder, 'vol01')
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
/** 폴더 안으로 한 겹이라도 들어와 있는지 — 이때는 화면 머리가 통째로 바뀐다 (Figma 1484-1140) */
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

/** 보고 있던 자리를 처음으로 — 팀이나 전시회 폴더가 바뀌었을 때 */
const resetBrowsing = () => {
  openedPath.value = []
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
  resetBrowsing()
}

/** 팀 폴더 목록에서 전시회 폴더를 골라 들어간다 — 그 안이 회차 폴더 목록이다 */
const enterExhibition = (name: string) => {
  editorStore.setBlankFolder(name)
  resetBrowsing()
}
/** 전시회 폴더에서 나와 팀 폴더 목록으로 */
const leaveExhibition = () => {
  editorStore.setBlankFolder(null)
  resetBrowsing()
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

const isPicked = (folder: S3Folder) => picked.value?.name === folder.name

/** 폴더 한 줄을 눌렀을 때 — 고르고, 다시 누르면 푼다 (안에 폴더가 있어도 똑같다) */
const onRowClick = (folder: S3Folder) => {
  if (!isUsableFolderName(folder.name)) return
  picked.value = isPicked(folder)
    ? null
    : { name: folder.name, isNew: folder.name === pendingFolder.value }
}

/** 더블클릭 — 안으로 들어간다(빈 폴더라도. 그 안에 또 폴더를 만들거나 그 자리에 저장하려고) */
const onRowDblClick = (folder: S3Folder) => {
  if (!isUsableFolderName(folder.name)) return
  if (atTeamLevel.value) {
    enterExhibition(folder.name)
    return
  }
  if (canEnter.value) openFolder(folder.name)
}


/** 적어 넣은 이름으로 한 줄을 만든다 — 여기서 고르거나, 더블클릭으로 들어가 그 안에 또 만들 수 있다 */
const createFolder = () => {
  if (!canCreate.value) return
  const name = newName.value.trim().toLowerCase()
  pendingFolder.value = name
  picked.value = { name, isNew: true }
  creating.value = false
  newName.value = ''
}

/**
 * 폴더가 하나도 없는 상태 — 이때는 표 대신 일러스트만 보여준다.
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
/** 고른 폴더에 놓인 **최근** 임시 저장 파일 — 있으면 '이어서 편집'을 내민다 (배지와 같은 기준) */
const pickedEditFile = computed(() => {
  const file = pickedFolder.value?.editFile
  return file && isFreshEditFile(file) ? file : null
})

/** 안이 빈 폴더에 들어와 있는지 — 이때는 새 폴더 없이 그 자리에 바로 저장할 수도 있다 (Figma 1488-1333) */
const isInsideEmpty = computed(() => isEmptyState.value && openedPath.value.length > 0)
/** 지금 들어와 있는 자리 — 'gocaf/ vol53/' (빈 폴더 안내 문구용) */
const currentLocationLabel = computed(() => `${[rootFolderName.value, ...openedPath.value].join('/ ')}/`)

const goBack = () => router.push({ name: 'templates' })

/**
 * 저장할 자리 — 고른 폴더까지 포함한 경로 ('eng/vol01').
 * 빈 폴더 안에서는 고른 것이 없어도 **그 자리**('vol53')가 곧 저장할 자리다.
 */
const targetVolume = computed(() => {
  if (atTeamLevel.value) return ''
  if (picked.value) return normalizeVolume([...openedPath.value, picked.value.name].join('/'))
  if (isInsideEmpty.value) return normalizeVolume(openedPath.value.join('/'))
  return ''
})
/** '여기로 저장'을 누를 수 있는지 — 팀 폴더 단계에서는 고른 전시회 폴더로 들어가는 버튼이다 */
const canSave = computed(() => (atTeamLevel.value ? !!picked.value : !!targetVolume.value))
/**
 * 하단 '저장위치' 표기 — 'gocaf / eng / vol01 /' (Figma 1468-9089).
 * 들어와 있는 폴더까지는 늘 보이고, 고른 폴더가 있으면 그 이름이 맨 뒤에 붙는다.
 * 팀 폴더 단계에서는 아직 전시회를 못 정했으니 비워 둔다(Figma 1500-9394).
 */
const savePathLabel = computed(() => {
  if (!hasTeam.value || atTeamLevel.value) return ''
  const parts = [rootFolderName.value, ...openedPath.value]
  if (picked.value) parts.push(picked.value.name)
  return `${parts.join(' / ')} /`
})

/**
 * '여기로 저장'.
 *   - 팀 폴더 단계(빈 템플릿)에서는 고른 전시회 폴더 **안으로 들어간다**.
 *   - 1단계(전시회 폴더 바로 아래)에서는 고른 폴더 **안으로 들어간다** — 안이 비어 있어도 마찬가지.
 *     2단계에서 폴더를 더 만들지, 그 자리에 바로 저장할지를 보고 정하게 하려는 것.
 *   - 2단계에서는 고른 자리(또는 비어 있으면 지금 자리)를 회차로 저장하고 에디터로.
 * 새 폴더는 여기서 만들지 않는다 — S3에는 빈 폴더가 없고, 첫 파일이 올라가면 그 자리가 곧 폴더다.
 */
const goNext = () => {
  if (!canSave.value) return
  if (atTeamLevel.value) {
    if (picked.value) enterExhibition(picked.value.name)
    return
  }
  if (picked.value && canEnter.value) {
    openFolder(picked.value.name)
    return
  }
  editorStore.updateWrapSettings({ volume: targetVolume.value })
  router.push({ name: 'editor' })
}

/**
 * '이전으로' — 폴더 안이면 한 겹 위로, 전시회 폴더 맨 위면(빈 템플릿) 팀 폴더 목록으로,
 * 그것도 아니면 템플릿 선택으로.
 */
const goPrev = () => {
  if (openedPath.value.length) goUp(openedPath.value.length - 1)
  else if (editorStore.isBlankStart && editorStore.blankFolder) leaveExhibition()
  else goBack()
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
    editorStore.updateWrapSettings({ volume: targetVolume.value })
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
        좌측: 전시회 선택과 같은 팀 메뉴(맨 윗칸 없음 — 되돌아가는 길은 하단 '이전으로').
        빈 템플릿이면 여기서 팀을 골라 폴더를 나누고, 템플릿으로 들어왔으면 그 팀만 켜 둔다.
      -->
      <TeamTreeSidebar
        class="fd-team-nav"
        :model-value="editorStore.currentTeamId ?? ''"
        :selectable="canPickTeam"
        @update:model-value="pickTeam"
      />

      <!-- 우측 열 — 스크롤되는 본문 + 고정 하단. 하단선은 사이드바 오른쪽에서만 긋는다 (Figma 1468-8970) -->
      <div class="fd-column">
        <main class="fd-main" :class="{ 'fd-main--nested': isNested }">
          <!--
            폴더 안에 들어와 있으면 머리가 통째로 바뀐다 (Figma 1484-1140):
            맨 위에 지나온 경로, 그 아래 전시회 이름이 제목을 겸하고, 검색줄은 없다.
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

          <!-- 팀을 고르기 전에는 제목·검색 없이 안내만 (Figma 1488-2128) -->
          <template v-if="!isNested && hasTeam">
            <h1 class="fd-title">저장할 폴더를 선택해주세요.</h1>
            <SearchField
              v-model="query"
              class="fd-search"
              size="lg"
              placeholder="폴더명을 검색하세요"
              aria-label="폴더 검색"
            />
          </template>

          <!--
            어느 폴더를 보고 있는지 + 오른쪽 끝의 '폴더 만들기' 아이콘.
            팀 폴더 단계에서는 팀 이름만(1500-9394), 전시회 단계에서는 전시회 이름 + 팀 배지.
            폴더 안에서는 이 줄이 제목 자리(34px)를 대신한다.
          -->
          <div v-if="hasTeam" class="fd-context" :class="{ 'fd-context--title': isNested }">
            <template v-if="atTeamLevel">
              <span class="fd-context-name">{{ teamName }}</span>
            </template>
            <template v-else>
              <span class="fd-context-name">{{ contextName }}</span>
              <span v-if="teamName" class="fd-context-team">{{ teamName }}</span>
            </template>
            <button
              v-if="canNest && !creating"
              type="button"
              class="fd-create-icon"
              :class="{ 'is-accent': isEmptyState || isNoMatch }"
              title="폴더 만들기"
              @click="startCreate"
            >
              <span class="material-symbols-outlined">create_new_folder</span>
            </button>
          </div>

          <!--
            빈 템플릿으로 들어와 아직 팀을 안 골랐을 때 — 폴더는 팀 아래에 나뉘어 있어
            팀부터 골라야 보여줄 것이 생긴다. 고르고 나면 아래 '폴더 만들기' 흐름으로 이어진다.
          -->
          <div v-if="!hasTeam" class="fd-empty fd-empty--folder fd-empty--team">
            <img :src="emptyTeamIcon" alt="" class="fd-empty-folder-img fd-empty-team-img" />
            <p class="fd-empty-title">어느 팀 소속이신가요?</p>
            <p class="fd-empty-text">
              좌측 메뉴에 소속된 팀을 선택 후에<br />
              뉴스레터를 저장할 폴더를 선택할 수 있어요
            </p>
          </div>

          <!-- 들어간 폴더가 비어 있을 때 — 새로 만들거나 그 자리에 바로 저장 (Figma 1488-1333) -->
          <div v-else-if="isInsideEmpty" class="fd-empty fd-empty--folder">
            <img :src="emptyFolderIcon" alt="" class="fd-empty-folder-img" />
            <p class="fd-empty-title">아직 폴더가 없어요</p>
            <p class="fd-empty-text">
              새 폴더를 만들거나,<br />
              현재 위치 <strong>{{ currentLocationLabel }}</strong> 에 저장할 수 있어요.
            </p>
          </div>

          <!-- 전시회 폴더(또는 팀 폴더) 자체가 비어 있을 때 -->
          <div v-else-if="isEmptyState" class="fd-empty">
            <img :src="emptyIcon" alt="" class="fd-empty-img" />
            <p v-if="atTeamLevel" class="fd-empty-text">
              이 팀에는 아직 전시회 폴더가 없어요.<br />
              오른쪽 위 아이콘으로 전시회 폴더를 만들어 시작해 주세요.
            </p>
            <p v-else class="fd-empty-text">
              아직 저장할 폴더가 없어요.<br />
              오른쪽 위 아이콘으로 폴더를 새로 만들어 시작해 주세요.
            </p>
          </div>

          <template v-else>
            <!-- 목록 -->
            <div class="fd-table">
              <div class="fd-thead">
                <span class="fd-col-name">이름</span>
                <span class="fd-right">
                  <span class="fd-col-type">유형</span>
                  <span class="fd-col-at">마지막 수정</span>
                </span>
              </div>

              <p v-if="loading" class="fd-state">폴더를 읽는 중…</p>
              <p v-else-if="loadError" class="fd-state fd-state--error">{{ loadError }}</p>

              <template v-else>
                <!-- 새 폴더 이름 — 목록 맨 위에서 바로 적는다 (검색창은 검색만 한다) (Figma 1488-1463).
                     [폴더 아이콘][10px][채움형 입력 300×40][30px][확인][12px][취소] … 오른쪽엔 '폴더'만.
                     이름이 규칙에 안 맞을 때만 입력 아래 한 줄로 알린다(디자인엔 없는 줄 — 안 알리면 왜 안 되는지 모른다). -->
                <div v-if="creating" class="fd-row fd-row--new">
                  <span class="fd-row-left">
                    <span class="material-symbols-outlined fd-folder-icon">folder</span>
                    <span class="fd-new-field">
                      <InputText
                        ref="newNameInput"
                        v-model="newName"
                        placeholder="폴더명을 입력하세요"
                        class="fd-new-input"
                        aria-label="새 폴더 이름"
                        @keydown.enter="createFolder"
                        @keydown.esc="cancelCreate"
                      />
                      <span v-if="newNameError" class="fd-new-error">{{ newNameError }}</span>
                    </span>
                    <span class="fd-new-actions">
                      <button
                        type="button"
                        class="fd-new-action"
                        :disabled="!canCreate"
                        @click="createFolder"
                      >
                        확인
                      </button>
                      <button type="button" class="fd-new-action fd-new-action--ghost" @click="cancelCreate">
                        취소
                      </button>
                    </span>
                  </span>
                  <span class="fd-right">
                    <span class="fd-col-type">폴더</span>
                    <span class="fd-col-at"></span>
                  </span>
                </div>

                <!--
                  한 줄 = 버튼 하나. 클릭으로 고르거나 풀고, 더블클릭이면 안으로 들어간다.
                  고른 줄은 왼쪽에 체크가 붙고 파랗게 칠해진다 (Figma 1484-1081).
                -->
                <button
                  v-for="folder in visibleFolders"
                  :key="folder.name"
                  type="button"
                  class="fd-row"
                  :class="{
                    'is-picked': isPicked(folder),
                    'is-disabled': !isUsableFolderName(folder.name),
                  }"
                  :disabled="!isUsableFolderName(folder.name)"
                  :aria-pressed="isPicked(folder)"
                  :title="atTeamLevel || canEnter ? '클릭: 선택 · 더블클릭: 폴더 열기' : '클릭: 선택'"
                  @click="onRowClick(folder)"
                  @dblclick="onRowDblClick(folder)"
                >
                  <span class="fd-row-left">
                    <span v-if="isPicked(folder)" class="material-symbols-outlined fd-row-check">
                      check_circle
                    </span>
                    <span class="material-symbols-outlined fd-folder-icon">folder</span>
                    <span class="fd-row-text">
                      <span class="fd-row-name">
                        {{ folder.name }}/
                        <!-- 최근(EDIT_FILE_FRESH_DAYS) 임시 저장 파일이 있으면 이어서 편집할 수 있다고 미리 알린다.
                             오래된 것은 지난 회차의 흔적이라 접는다. 발송 여부는 여기서 알리지 않는다
                             (AI 도구의 웹 링크 카드가 맡는다). -->
                        <span v-if="isFreshEditFile(folder.editFile)" class="fd-row-badge">이어서 편집</span>
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
                  <span class="fd-right">
                    <span class="fd-col-type">폴더</span>
                    <span class="fd-col-at">{{ formatModified(folder.lastModified) }}</span>
                  </span>
                </button>

                <!-- 검색어와 맞는 폴더가 없을 때 -->
                <div v-if="isNoMatch" class="fd-empty fd-empty--inline">
                  <img :src="emptyIcon" alt="" class="fd-empty-img" />
                  <p class="fd-empty-text">
                    검색한 폴더가 없어요.<br />
                    오른쪽 위 아이콘으로 새로 만들거나 다시 검색해주세요.
                  </p>
                </div>
              </template>
            </div>
          </template>
        </main>

        <!-- 하단 — 왼쪽에 저장 위치만, 오른쪽에 이전/여기로 저장 (템플릿 선택 화면과 같은 FlowFooter).
             최근 임시 저장은 줄의 배지가 알리고, 여기서는 그 폴더를 골랐을 때 버튼만 달라진다. -->
        <FlowFooter>
          <template #info>
            <!-- 라벨은 늘 두고, 전시회 폴더가 정해진 뒤에만 경로를 적는다 (Figma 1488-2128 / 1500-9394) -->
            <p class="flow-info">
              <span class="flow-info-label">
                <span class="material-symbols-outlined">drive_file_move</span>
                저장위치
              </span>
              <span v-if="savePathLabel" class="flow-info-value">{{ savePathLabel }}</span>
            </p>
          </template>
          <button type="button" class="flow-btn flow-btn--ghost" @click="goPrev">이전으로</button>
          <button
            type="button"
            class="flow-btn"
            :class="pickedEditFile ? 'flow-btn--ghost' : 'flow-btn--primary'"
            :disabled="!canSave || restoring"
            @click="goNext"
          >
            {{ pickedEditFile ? '새로 시작' : '여기로 저장' }}
          </button>
          <button
            v-if="pickedEditFile"
            type="button"
            class="flow-btn flow-btn--primary"
            :disabled="restoring"
            @click="continueEditing"
          >
            {{ restoring ? '불러오는 중…' : '이어서 편집' }}
          </button>
        </FlowFooter>
      </div>
    </div>
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
/* 좌측 팀 메뉴 — 맨 윗칸('전체'·'뒤로가기')이 없어 첫 본부가 위에서 80px에 오도록 여백을 준다 */
.fd-team-nav {
  padding-top: 83px;
}
/* 우측 열 — 본문이 스크롤되고 하단 바는 늘 보인다 */
.fd-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 본문 — 제목이 위에서 122px(헤더 60 + 62), 좌우는 사이드바에서 67px·오른쪽 115px (Figma 1468-8970) */
.fd-main {
  flex: 1;
  min-width: 0;
  padding: 62px 115px 40px 67px;
  overflow-y: auto;
}
.fd-title {
  margin: 0 0 22px;
  font-size: 34px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: -0.34px;
  color: var(--black);
}
/* 모양은 공용 SearchField(lg)가 갖고, 여기서는 폭만 잡는다 */
.fd-search {
  width: 630px;
  max-width: 100%;
}

/* 어느 폴더 안에 들어와 있는지 — gocaf > eng, 화면 맨 위(헤더 아래 40px) (Figma 1484-1140) */
.fd-crumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 25px;
  font-size: 17px;
  line-height: 20px;
  color: var(--gray-700);
}
.fd-crumb {
  padding: 0;
  border: none;
  background: none;
  font-size: 17px;
  line-height: 20px;
  color: var(--gray-700);
}
.fd-crumb--link {
  color: var(--blue-500);
  text-decoration: underline;
  cursor: pointer;
}
.fd-crumb--link:hover {
  color: var(--blue-600);
}
.fd-crumb-sep {
  color: var(--gray-700);
}
.fd-main--nested {
  padding-top: 40px;
}

/* 어느 전시회의 폴더를 보고 있는지 + 오른쪽 끝 '폴더 만들기' 아이콘 — 검색줄 아래 50px */
.fd-context {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 50px;
}
.fd-context-name {
  font-size: 24px;
  font-weight: 500;
  line-height: 1.5;
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
/* 폴더 안에서는 이 줄이 곧 제목이다 — 크기·색을 fd-title과 맞춘다 */
.fd-context--title {
  margin-top: 0;
}
.fd-context--title .fd-context-name {
  font-size: 34px;
  letter-spacing: -0.34px;
  color: var(--black);
}
/* 폴더 만들기 — 줄 오른쪽 끝의 아이콘 버튼. 폴더가 없을 때는 채워서 눈에 띄게 (Figma 1488-1333) */
.fd-create-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-left: auto;
  border: none;
  border-radius: 8px;
  background: none;
  color: var(--gray-800);
  cursor: pointer;
}
.fd-create-icon:hover,
.fd-create-icon.is-accent {
  background: var(--gray-100);
}
.fd-create-icon .material-symbols-outlined {
  font-size: 28px;
}

/* 표 — 머리글은 전시회 줄 아래 50px(폴더 안에서는 60px), 줄은 머리글 아래 22px */
.fd-table {
  margin-top: 50px;
}
.fd-main--nested .fd-table {
  margin-top: 60px;
}
.fd-thead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px 22px 0;
  font-size: 15px;
  color: var(--gray-600);
}
.fd-col-name {
  flex: 1;
  min-width: 0;
}
/* 오른쪽 묶음 — 유형은 왼쪽 끝, 마지막 수정은 오른쪽 213px 칸 가운데 (머리글·줄이 같은 폭을 쓴다) */
.fd-right {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 387px;
  flex-shrink: 0;
}
.fd-col-type {
  flex-shrink: 0;
}
.fd-col-at {
  width: 213px;
  flex-shrink: 0;
  text-align: center;
}

/* 줄 = 버튼 하나. 위아래 선, 18/20 안쪽 여백 (Figma 1468-8976) */
.fd-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 18px 20px;
  border: 0;
  border-top: 1px solid var(--gray-200);
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s;
}
.fd-row:last-of-type {
  border-bottom: 1px solid var(--gray-200);
}
.fd-row:hover:not(:disabled) {
  background: var(--gray-50);
}
/* 고른 줄 — 파란 바탕 + 왼쪽 체크 (Figma 1484-1081) */
.fd-row.is-picked,
.fd-row.is-picked:hover {
  background: var(--blue-50);
}
.fd-row.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.fd-row-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.fd-row-check {
  flex-shrink: 0;
  margin-right: 10px;
  font-size: 28px;
  color: var(--blue-500);
}
.fd-folder-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  aspect-ratio: 1/1;
  font-size: 26px;
  color: var(--gray-500);
  flex-shrink: 0;
  border-radius: 8px;
  border: 1px solid var(--gray-300);
  background: var(--white);
}
/* 고른 줄의 폴더 아이콘 상자는 회색으로 채운다 (Figma 1484-1127) */
.fd-row.is-picked .fd-folder-icon {
  background: var(--blue-50);
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
.fd-row-sub--error {
  color: var(--red-700);
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
.fd-row .fd-right {
  font-size: 15px;
  color: var(--gray-750);
}
.fd-row .fd-col-type {
  font-size: 16px;
}

/* 새 폴더 줄 — 이름 입력과 확인/취소 (버튼이 아니라 div) (Figma 1488-1463) */
.fd-row--new {
  cursor: default;
}
.fd-row--new .fd-row-left {
  gap: 10px;
}
.fd-new-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  /* 입력 → 버튼 사이 30px */
  margin-right: 20px;
}
/* 채움형 입력 300×40 — 테두리 없이 gray/100, 15px medium, 자리글 gray/500 */
.fd-new-input {
  width: 300px;
  max-width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: var(--gray-100);
  font-size: 15px;
  font-weight: 500;
  color: var(--gray-800);
  box-shadow: none;
}
.fd-new-input::placeholder {
  color: var(--gray-500);
  font-weight: 500;
}
.fd-new-input:focus {
  outline: none;
  box-shadow: inset 0 0 0 1px var(--blue-400);
}
.fd-new-error {
  font-size: 13px;
  color: var(--red-700);
}
.fd-new-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
/* 확인 — gray/700 채움 · 취소 — 흰 배경 + gray/200 테두리. 둘 다 h40 px16 14px medium */
.fd-new-action {
  height: 40px;
  padding: 0 16px;
  border: 1px solid var(--gray-700);
  border-radius: 8px;
  background: var(--gray-700);
  color: var(--white);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.fd-new-action:hover:not(:disabled) {
  border-color: var(--gray-750);
  background: var(--gray-750);
}
.fd-new-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.fd-new-action--ghost {
  border-color: var(--gray-200);
  background: var(--white);
  color: var(--gray-600);
}
.fd-new-action--ghost:hover {
  border-color: var(--gray-300) !important;
  background: var(--gray-50) !important;
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

/* 빈 상태 — 일러스트를 가운데에 */
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
.fd-empty-text {
  margin: 0;
  font-size: 16px;
  line-height: 1.6;
  color: var(--gray-600);
  text-align: center;
}
/* 들어간 폴더가 비어 있을 때 — 제목 아래 79px, 284×245 일러스트 + 28px 제목 + 안내 (Figma 1488-1416) */
.fd-empty--folder {
  margin-top: 79px;
  gap: 0;
}
.fd-empty-folder-img {
  width: 284px;
  height: 245px;
  object-fit: contain;
  margin-bottom: 20px;
}
.fd-empty-title {
  margin: 0 0 12px;
  font-size: 28px;
  font-weight: 500;
  color: var(--gray-800);
  text-align: center;
}
.fd-empty--folder .fd-empty-text strong {
  font-weight: 500;
  color: var(--gray-800);
}
/* 팀을 고르기 전 — 제목·검색이 없어 위에서 211px(헤더 60 + 본문 여백 62 + 89) (Figma 1488-2128) */
.fd-empty--team {
  margin-top: 150px;
}
.fd-empty-team-img {
  height: 253px;
}

</style>
