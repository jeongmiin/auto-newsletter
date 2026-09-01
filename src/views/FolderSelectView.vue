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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import FlowStepsHeader from '@/components/layout/FlowStepsHeader.vue'
import emptyIcon from '@/assets/img/empty_icon.png'
import { useEditorStore } from '@/stores/editorStore'
import { useModuleStore } from '@/stores/moduleStore'
import { buildUploadDirectory, normalizeVolume } from '@/utils/s3Upload'
import {
  BrowseError,
  fetchText,
  formatModified,
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
const templateName = computed(() => editorStore.currentTemplateName || '빈 템플릿')

/** 읽어올 자리 — 업로드 경로에서 회차만 뺀 앞부분 (`…/newsletterbuilder/{팀}/{전시회}/`) */
const basePrefix = computed(() => {
  const sample = buildUploadDirectory(editorStore.uploadFolder, 'vol01')
  return sample ? toPrefix(sample.replace(/vol01\/$/, '')) : ''
})

const load = async () => {
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
    folders.value = await listFolders(basePrefix.value, controller.signal)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    loadError.value = err instanceof BrowseError ? err.message : '목록을 읽지 못했어요'
    folders.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
onBeforeUnmount(() => controller?.abort())

/** 검색어로 걸러낸 목록 */
const visibleFolders = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? folders.value.filter((f) => f.name.toLowerCase().includes(q)) : folders.value
})

/**
 * '새 폴더' 만들기 — 검색과 섞지 않고 버튼으로 따로 연다.
 * (검색창이 이름 입력을 겸하면 폴더를 찾으려 친 글자가 곧 새 폴더 이름이 돼 헷갈린다)
 */
const creating = ref(false)
const newName = ref('')
const newNameInput = ref<InstanceType<typeof InputText> | null>(null)

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
  if (picked.value?.isNew) picked.value = null
}

/** 적어 넣은 이름으로 새로 만들 수 있는지 — 이미 있으면 만들기 대신 고르면 된다 */
const newNameError = computed(() =>
  newName.value.trim() ? validateFolderName(newName.value, folders.value.map((f) => f.name)) : null,
)
const canCreate = computed(() => !!newName.value.trim() && !newNameError.value)
/** 적은 이름이 그대로 골라져 있는 상태 — 줄에 선택 표시를 준다 */
const isNewPicked = computed(
  () => picked.value?.isNew && picked.value.name === newName.value.trim().toLowerCase(),
)

const pickExisting = (folder: S3Folder) => {
  if (!isUsableFolderName(folder.name)) return
  picked.value = { name: folder.name, isNew: false }
}

const createFolder = () => {
  if (!canCreate.value) return
  picked.value = { name: newName.value.trim().toLowerCase(), isNew: true }
}

// 이름을 고치면 방금 고른 것과 화면의 글자가 어긋난다 — 다시 '만들기'를 누르게 한다
watch(newName, () => {
  if (picked.value?.isNew) picked.value = null
})

/**
 * 폴더가 하나도 없는 상태 — 이때는 표 대신 일러스트와 '폴더 만들기' 버튼만 보여준다(Figma 1347-9429).
 * 만들기를 누른 뒤에는 표 안의 입력 줄로 이어지므로 빈 화면이 아니다.
 */
const isEmptyState = computed(
  () => !loading.value && !loadError.value && !folders.value.length && !creating.value,
)

/** 폴더는 있는데 검색어와 맞는 게 하나도 없는 상태 — 같은 빈 화면을 문구만 바꿔 재사용한다 */
const isNoMatch = computed(
  () => !loading.value && !loadError.value && !!folders.value.length && !visibleFolders.value.length,
)

/** 고른 폴더에 놓인 임시 저장 파일 — 있으면 '이어서 편집'을 내민다 */
const pickedEditFile = computed(() => {
  if (!picked.value || picked.value.isNew) return null
  return folders.value.find((f) => f.name === picked.value?.name)?.editFile ?? null
})

const goBack = () => router.push({ name: 'templates' })

/**
 * 고른 폴더를 회차로 저장하고 에디터로.
 * 새 폴더는 여기서 만들지 않는다 — S3에는 빈 폴더가 없고, 첫 파일이 올라가면 그 자리가 곧 폴더다.
 */
const goNext = () => {
  if (!picked.value) return
  editorStore.updateWrapSettings({ volume: normalizeVolume(picked.value.name) })
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
    editorStore.updateWrapSettings({ volume: normalizeVolume(picked.value!.name) })
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
      <!-- 좌측: 어디에 저장되는지 맥락 (팀·전시회). 바꾸려면 이전 단계로 -->
      <aside class="fd-side">
        <p class="fd-side-label">저장 위치</p>
        <p class="fd-side-team">{{ teamName }}</p>
        <p class="fd-side-tpl">{{ templateName }}</p>
        <button type="button" class="fd-side-change" @click="goBack">전시회 바꾸기</button>
      </aside>

      <main class="fd-main">
        <h1 class="fd-title">저장할 폴더를 선택해주세요.</h1>

        <div class="fd-search-row">
          <div class="fd-search">
            <span class="material-symbols-outlined">search</span>
            <InputText
              v-model="query"
              placeholder="폴더명을 검색하세요"
              class="fd-search-input"
            />
          </div>
          <button type="button" class="fd-new-btn" title="새 폴더 만들기" @click="startCreate">
            <span class="material-symbols-outlined">create_new_folder</span>
          </button>
        </div>

        <!-- 폴더가 없을 때는 표 대신 일러스트만 (Figma 1347-9429) -->
        <div v-if="isEmptyState" class="fd-empty">
          <img :src="emptyIcon" alt="" class="fd-empty-img" />
          <p class="fd-empty-text">
            아직 저장할 폴더가 없어요.<br />
            폴더를 새로 만들어 시작해 주세요.
          </p>
          <button type="button" class="fd-empty-btn" @click="startCreate">
            <span class="material-symbols-outlined">create_new_folder</span>
            폴더 만들기
          </button>
        </div>

        <template v-else>
        <div class="fd-context">
          <span class="fd-context-name">{{ templateName }}</span>
          <span v-if="teamName" class="fd-context-team">{{ teamName }}</span>
          <span class="ml-auto text-gray-500">*폴더 삭제는 UXD팀에게 문의해주세요.</span>
        </div>

        <!-- 목록 -->
        <div class="fd-table">
          <div class="fd-thead">
            <span class="fd-col-name">이름</span>
            <span class="fd-col-type">유형</span>
            <span class="fd-col-at">마지막 수정</span>
          </div>

          <p v-if="loading" class="fd-state">폴더를 읽는 중…</p>
          <p v-else-if="loadError" class="fd-state fd-state--error">{{ loadError }}</p>

          <template v-else>
            <!-- 새 폴더 이름 — 목록 맨 위에서 바로 적는다 (검색창은 검색만 한다) -->
            <div v-if="creating" class="fd-row fd-row--new" :class="{ 'is-picked': isNewPicked }">
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
                    {{ newNameError ?? (isNewPicked ? '이 폴더로 시작해요' : '새로 만들 폴더') }}
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

            <button
              v-for="folder in visibleFolders"
              :key="folder.name"
              type="button"
              class="fd-row"
              :class="{
                'is-picked': picked && !picked.isNew && picked.name === folder.name,
                'is-disabled': !isUsableFolderName(folder.name),
              }"
              :disabled="!isUsableFolderName(folder.name)"
              @click="pickExisting(folder)"
            >
              <span class="fd-row-left">
                <span class="material-symbols-outlined fd-folder-icon">folder</span>
                <span class="fd-row-text">
                  <span class="fd-row-name">
                    {{ folder.name }}/
                    <!-- 임시 저장 파일이 있으면 여기서 이어서 편집할 수 있다고 미리 알린다 -->
                    <span v-if="folder.editFile" class="fd-row-badge">이어서 편집</span>
                  </span>
                  <span class="fd-row-sub">
                    {{ isUsableFolderName(folder.name)
                      ? `${folder.itemCount}개 항목`
                      : '주소 규칙과 맞지 않아 고를 수 없어요' }}
                  </span>
                </span>
              </span>
              <span class="fd-row-right">
                <span class="fd-col-type">폴더</span>
                <span class="fd-col-at">{{ formatModified(folder.lastModified) }}</span>
              </span>
            </button>

            <!-- 검색어와 맞는 폴더가 없을 때 — 폴더가 아예 없을 때와 같은 빈 화면을 문구만 바꿔 쓴다 -->
            <div v-if="isNoMatch" class="fd-empty fd-empty--inline">
              <img :src="emptyIcon" alt="" class="fd-empty-img" />
              <p class="fd-empty-text">
                검색한 폴더가 없어요.<br />
                폴더를 새로 만들거나 다시 검색해주세요.
              </p>
              <button v-if="!creating" type="button" class="fd-empty-btn" @click="startCreate">
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
      <!-- 고른 폴더에 임시 저장 파일이 있으면 '이어서 편집'을 기본 동작으로 내민다 -->
      <p v-if="pickedEditFile" class="fd-footer-note">
        <span class="material-symbols-outlined">cloud_upload</span>
        {{ pickedEditFile.name }} · {{ formatModified(pickedEditFile.lastModified) }}
      </p>
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

/* 좌측 — 어디에 저장되는지만 알려주는 좁은 기둥 (Figma의 트리 자리) */
.fd-side {
  width: 223px;
  flex-shrink: 0;
  padding: 40px 24px;
  border-right: 1px solid var(--gray-200);
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}
.fd-side-label {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--gray-500);
}
.fd-side-team {
  margin: 0;
  font-size: 14px;
  color: var(--gray-600);
}
.fd-side-tpl {
  margin: 0;
  font-size: 17px;
  font-weight: 500;
  color: var(--gray-900);
  word-break: keep-all;
}
.fd-side-change {
  margin-top: 10px;
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  font-size: 1rem;
  color: var(--blue-500);
  cursor: pointer;
}
.fd-side-change:hover {
  text-decoration: underline;
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
.fd-search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 630px;
  max-width: 100%;
  height: 48px;
  padding: 0 20px;
  border-radius: 50px;
  background: var(--gray-100);
}
.fd-search .material-symbols-outlined {
  font-size: 22px;
  color: var(--gray-600);
}
.fd-search-input {
  flex: 1;
  min-width: 0;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  font-size: 17px;
  color: var(--gray-900);
  padding: 0;
}
.fd-search-input::placeholder {
  color: var(--gray-600);
}
.fd-new-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: none;
  color: var(--gray-700);
  cursor: pointer;
}
.fd-new-btn:hover {
  background: var(--gray-100);
  color: var(--blue-500);
}
.fd-new-btn .material-symbols-outlined {
  font-size: 32px;
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
  color: var(--gray-900);
}
.fd-context-team {
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--green-50);
  color: var(--green-700);
  font-size: 14px;
  font-weight: 500;
}

.fd-table {
  margin-top: 22px;
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

.fd-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 18px 20px;
  border: none;
  border-top: 1px solid var(--gray-200);
  background: none;
  text-align: left;
  cursor: pointer;
}
.fd-row:last-of-type {
  border-bottom: 1px solid var(--gray-200);
}
.fd-row:hover:not(:disabled) {
  background: var(--gray-50);
}
.fd-row.is-picked {
  background: var(--blue-50);
}
.fd-row.is-disabled {
  cursor: not-allowed;
  opacity: 0.55;
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
  color: var(--gray-900);
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
.fd-empty-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: var(--blue-400);
  color: var(--white);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}
.fd-empty-btn:hover {
  background: var(--blue-500);
}
.fd-empty-btn .material-symbols-outlined {
  font-size: 20px;
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

/* 이어서 편집할 파일 안내 — 버튼 왼쪽에 파일명·시각 */
.fd-footer-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 auto 0 0;
  font-size: 14px;
  color: var(--gray-600);
}
.fd-footer-note .material-symbols-outlined {
  font-size: 20px;
  color: var(--blue-500);
}
</style>
