<script setup lang="ts">
/**
 * 이미지 주소 입력 필드 — 파일을 올리면 그 주소가 값이 된다 (Figma 1398-6701 / 1406-7517 / 1412-683 / 1420-1115).
 *
 * 값은 **지금까지와 똑같이 URL 문자열 하나**다. 업로드는 그 문자열을 채우는 수단이 하나 더
 * 생긴 것뿐이라, 저장/불러오기/내보내기 파이프라인은 아무것도 바뀌지 않는다.
 *
 * 화면은 네 상태로 나뉜다 — 올리기 전(점선 상자) · 같은 이름 확인 · 올리는 중 · 올린 뒤.
 * 올린 뒤에는 **삭제만** 둔다. 바꾸려면 지우고 다시 올린다 — '교체'가 따로 있으면
 * 지금 무엇이 올라가 있는지와 무엇으로 바뀌는지가 한 줄에 겹쳐 읽기 어렵다.
 *
 * 올린 뒤에는 **다듬기**가 있다(버튼은 속성 패널 쪽, 열기는 `openCrop`) — 자르기 모달(ImageCropDialog)이
 * 뜨고, '적용하기'를 누르면 잘라낸 파일이 **바로 다시 올라간다**. 이름은 원본과 같으므로 보통
 * '같은 이름' 확인이 뜨고, 덮어쓰거나 'img(1).png'처럼 새 이름으로 남길 수 있다.
 * 자를 원본은 방금 올린 File 을 그대로 쓰고, 그게 없으면(불러온 문서·URL 직접 입력) 주소에서
 * 받아 온다 — 서버가 CORS 를 막으면 받지 못하니 그때는 다시 올려 달라고 안내한다.
 *
 * 업로드 주소(VITE_S3_UPLOAD_URL)가 비어 있으면 업로드 영역을 통째로 숨긴다 —
 * 서버 CORS 허용 전에 배포해도 눌러서 실패하는 버튼이 보이지 않게 하려는 것.
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { DEFAULT_IMAGE_URL, isPlaceholderImage } from '@/constants/defaults'
import { useToast } from 'primevue/usetoast'
import ImageCropDialog from './ImageCropDialog.vue'
import SameNameDialog from './SameNameDialog.vue'
import { DEFAULT_CROP_WIDTH } from '@/utils/imageCrop'
import { listFileNames, toPrefix } from '@/utils/s3Browse'
import {
  MAX_IMAGE_BYTES,
  MISSING_VOLUME_MESSAGE,
  UploadError,
  buildUploadDirectory,
  buildUploadFileName,
  formatBytes,
  isUploadEnabled,
  uniqueFileName,
  uploadImage,
  validateImageFile,
} from '@/utils/s3Upload'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    /** 업로드 영역 없이 URL 입력만 보여준다 (링크 URL 등 이미지가 아닌 필드용) */
    urlOnly?: boolean
    /**
     * '삭제'했을 때 되돌릴 자리표시 이미지 주소.
     * 이 모듈 필드의 기본 이미지를 넘기면(1단/2단/발표자 등) 그 모양에 맞는 자리표시로 돌아간다.
     */
    placeholderUrl?: string
    /**
     * 이 이미지가 메일에서 차지하는 가로 폭(px) — 자르기 다이얼로그가 저장 해상도를 정하는 기준.
     * modules-config.json 의 `cropWidth` 에서 온다. 없으면 본문 폭 680.
     */
    cropWidth?: number
  }>(),
  {
    placeholder: 'https://...',
    urlOnly: false,
    placeholderUrl: DEFAULT_IMAGE_URL,
    cropWidth: DEFAULT_CROP_WIDTH,
  },
)

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const editorStore = useEditorStore()
const toast = useToast()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const progress = ref(0)
const uploading = ref(false)
const errorText = ref('')
/** 올리는 중에 보여줄 그 파일의 미리보기 (objectURL — 끝나면 반드시 돌려준다) */
const previewUrl = ref('')
/** 올리는 중인 파일 이름 */
const uploadingName = ref('')
let controller: AbortController | null = null

/**
 * 같은 이름의 파일이 이미 있어 물어보는 중 — 답을 받을 때까지 들고 있는다.
 *
 * 예전에는 '같은 이름이면 덮어쓰기' 체크박스를 미리 켜 두게 했는데, 올리기 전에는
 * 겹치는지 알 수 없어 대부분 의미 없이 켜져 있는 스위치였다. 이제 실제로 겹칠 때만 묻는다.
 *
 * 그때 읽어 둔 폴더의 이름 목록(`taken`)을 함께 들고 있는다 — '취소'(덮어쓰지 않기)를
 * 고르면 그 목록에서 비어 있는 번호를 찾아 'img01(1).png'로 올리기 때문이다.
 */
const conflict = ref<{ file: File; saveAs: string; taken: string[] } | null>(null)

/** 자르기 모달에 올라가 있는 파일 — null 이면 닫힌 상태 */
const cropSource = ref<File | null>(null)
/** 주소에서 원본을 받아 오는 중(다듬기 버튼을 눌렀을 때) */
const loadingCrop = ref(false)
/**
 * 마지막으로 올린 파일과 그 주소 — 다듬기의 원본으로 쓴다.
 * 값이 이 주소와 같을 때만 믿는다(그 사이 URL 을 직접 바꿨으면 다른 이미지다).
 */
let lastUploaded: { file: File; url: string } | null = null

const showUploader = computed(() => !props.urlOnly && isUploadEnabled())

/** '20MB' — 안내에 소수점(20.0MB)까지 적으면 눈에 걸린다 */
const maxSizeLabel = computed(() => formatBytes(MAX_IMAGE_BYTES).replace('.0', ''))

/**
 * 실제로 넣은 이미지가 있는지.
 * 자리표시 이미지(모듈 기본 이미지)는 '아직 안 넣음'으로 보고 업로드 영역을 계속 보여준다 —
 * 삭제하자마자 다시 올릴 수 있어야 하기 때문.
 */
const hasValue = computed(() => !isPlaceholderImage(props.modelValue))

/**
 * 올라갈 폴더 — '폴더 선택' 걸음에서 정해진다(화면에는 보여주지 않는다).
 * 어쩌다 폴더가 비어 있으면 null이고, 그때는 업로드를 막고 안내만 띄운다.
 */
const targetDirectory = computed(() =>
  buildUploadDirectory(editorStore.uploadFolder, editorStore.wrapSettings.volume),
)
/** 쿼리·해시를 뗀 주소 — 같은 파일인지 비교할 때 쓴다 */
const stripQuery = (url: string): string => url.split(/[?#]/)[0]
/** 주소에서 파일 이름만 — 'banner_main.jpg' */
const nameFromUrl = (url: string): string => {
  const path = stripQuery(url)
  const last = path.slice(path.lastIndexOf('/') + 1)
  try {
    return decodeURIComponent(last)
  } catch {
    return last
  }
}
/** 확장자는 늘 보이게 이름과 따로 그린다 — 긴 이름이 잘려도 무슨 파일인지 알 수 있다 */
const doneName = computed(() => {
  const name = nameFromUrl(props.modelValue)
  const dot = name.lastIndexOf('.')
  return dot > 0 ? { base: name.slice(0, dot), ext: name.slice(dot) } : { base: name, ext: '' }
})
const setValue = (url: string) => emit('update:modelValue', url)

const openPicker = () => {
  if (uploading.value) return
  fileInput.value?.click()
}

const releasePreview = () => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
}

/**
 * 그 폴더에 이미 있는 파일 이름들.
 * 읽지 못하면(네트워크·CORS) **빈 목록**으로 본다 — 확인이 안 된다고 올리는 일 자체를
 * 막으면 더 나쁘다(그때는 서버의 override 규칙에 맡긴다).
 */
const takenNames = async (directory: string): Promise<string[]> => {
  try {
    return await listFileNames(toPrefix(directory))
  } catch {
    return []
  }
}

/** 파일을 받아 검사하고, 겹치는 이름이면 먼저 물어본다 */
const requestUpload = (file: File) => {
  errorText.value = ''
  conflict.value = null

  // 올릴 폴더가 정해지지 않았으면 알림을 띄우고 여기서 멈춘다.
  const directory = targetDirectory.value
  if (!directory) {
    errorText.value = MISSING_VOLUME_MESSAGE
    toast.add({
      severity: 'warn',
      summary: '저장할 폴더가 필요해요',
      detail: MISSING_VOLUME_MESSAGE,
      life: 6000,
    })
    return
  }

  const invalid = validateImageFile(file)
  if (invalid) {
    errorText.value = invalid
    return
  }

  void checkNameAndUpload(file)
}

/**
 * '다듬기' — 지금 올라가 있는 이미지를 자르기 모달에 올린다.
 * 방금 올린 File 이 있으면 그걸 쓰고, 없으면 주소에서 받아 온다.
 */
const openCrop = async () => {
  if (uploading.value || loadingCrop.value) return
  errorText.value = ''
  conflict.value = null

  const url = props.modelValue
  if (lastUploaded && lastUploaded.url === url) {
    cropSource.value = lastUploaded.file
    return
  }

  loadingCrop.value = true
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const file = new File([blob], nameFromUrl(url) || 'image.png', {
      type: blob.type || 'image/png',
    })
    const invalid = validateImageFile(file)
    if (invalid) throw new Error(invalid)
    cropSource.value = file
  } catch {
    // 다른 서버의 이미지는 CORS 로 막히는 경우가 대부분 — 받지 못하면 다시 올리라고만 안내한다
    errorText.value = '이 이미지는 불러올 수 없어요. 삭제하고 다시 올린 뒤 다듬어 주세요.'
  } finally {
    loadingCrop.value = false
  }
}

/**
 * 자르기 모달의 '적용하기' — 같은 이름이 있으면 자르기 모달을 **닫지 않고** 그 위에 확인 모달을
 * 띄운다. '취소'하면 자르던 화면으로 돌아가고, 나머지 둘은 모달을 다 닫고 바로 올린다.
 */
const applying = ref(false)
const cropConflict = ref<{ file: File; saveAs: string; taken: string[] } | null>(null)

const onCropApply = async (file: File) => {
  const directory = targetDirectory.value
  if (!directory || applying.value) return
  applying.value = true
  try {
    const saveAs = buildUploadFileName(file.name, new Date(), false)
    const taken = await takenNames(directory)
    if (taken.includes(saveAs)) {
      cropConflict.value = { file, saveAs, taken }
      return
    }
    cropSource.value = null
    await startUpload(file)
  } finally {
    applying.value = false
  }
}
const onCropCancel = () => {
  cropSource.value = null
}

/** 확인 모달 — 취소는 자르기 화면으로, 나머지는 모달을 다 닫고 올린다 */
const cropConflictCancel = () => {
  cropConflict.value = null
}
const cropConflictOverwrite = () => {
  const pending = cropConflict.value
  cropConflict.value = null
  cropSource.value = null
  if (pending) void startUpload(pending.file)
}
const cropConflictNewName = () => {
  const pending = cropConflict.value
  cropConflict.value = null
  cropSource.value = null
  if (pending) void startUpload(pending.file, uniqueFileName(pending.saveAs, pending.taken))
}

/** 겹치는 이름이면 먼저 물어보고, 아니면 바로 올린다 */
const checkNameAndUpload = async (file: File) => {
  const directory = targetDirectory.value
  if (!directory) return

  // 올라갈 때 이름이 다듬어진다('메인배너.png' → 'image.png'). 겹치는지는 **다듬은 이름**으로 봐야
  // 화면에서 다른 이름으로 보이던 파일끼리 조용히 덮어쓰는 일을 막을 수 있다.
  const saveAs = buildUploadFileName(file.name, new Date(), false)
  const taken = await takenNames(directory)
  if (taken.includes(saveAs)) {
    conflict.value = { file, saveAs, taken }
    return
  }

  await startUpload(file)
}

/**
 * 실제 업로드.
 * @param fileName 이 이름으로 올린다(겹치는 이름을 피해 정한 'img01(1).png' 등). 없으면 원본 이름.
 */
const startUpload = async (file: File, fileName?: string) => {
  const directory = targetDirectory.value
  if (!directory) return

  releasePreview()
  previewUrl.value = URL.createObjectURL(file)
  // 이름을 바꿔 올리는 중이면 **바뀐 이름**을 보여준다 — 폴더에 그 이름으로 남기 때문
  uploadingName.value = fileName ?? file.name
  uploading.value = true
  progress.value = 0
  controller = new AbortController()
  try {
    const { url } = await uploadImage(file, directory, {
      onProgress: (p) => (progress.value = p),
      signal: controller.signal,
      fileName,
      // 이름이 겹치면 위에서 이미 물어봤다 — 여기까지 왔다는 건 덮어써도 된다는 뜻
      // (다른 이름으로 올리는 쪽은 겹칠 자리가 없어 이 값과 무관하다)
      overwrite: true,
    })
    // 같은 주소를 덮어썼으면(다듬기 → 덮어쓰기) 브라우저가 캐시한 예전 그림을 계속 보여 준다.
    // 그때만 뒤에 버전 값을 붙여 새로 받게 한다 — S3 는 쿼리를 무시하므로 메일에서도 같은 파일이다.
    const next = stripQuery(url) === stripQuery(props.modelValue) ? `${stripQuery(url)}?v=${Date.now()}` : url
    // 다듬기의 원본으로 쓰려고 들고 있는다 — 주소에서 다시 받아 오지 않아도 된다
    lastUploaded = { file, url: next }
    setValue(next)
  } catch (err) {
    errorText.value =
      err instanceof UploadError ? err.message : '업로드 중 문제가 생겼어요. 다시 시도해 주세요.'
  } finally {
    uploading.value = false
    controller = null
    releasePreview()
  }
}

/** 같은 이름 확인 — 덮어쓰기 */
const confirmOverwrite = () => {
  const pending = conflict.value
  conflict.value = null
  if (pending) void startUpload(pending.file)
}
/**
 * 같은 이름 확인 — 덮어쓰지 않고 **새 이름으로** 올린다.
 * 비어 있는 번호를 찾아 'img01(1).png'로 올린다 — 먼저 올린 이미지는 그대로 남는다.
 */
const uploadAsNewName = () => {
  const pending = conflict.value
  conflict.value = null
  if (pending) void startUpload(pending.file, uniqueFileName(pending.saveAs, pending.taken))
}

const onFilePicked = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // 같은 파일을 다시 골라도 change가 일어나도록 값을 비운다
  input.value = ''
  if (file) requestUpload(file)
}

const onDrop = (event: DragEvent) => {
  isDragOver.value = false
  if (uploading.value) return
  const file = event.dataTransfer?.files?.[0]
  if (file) requestUpload(file)
}

/**
 * '삭제' — 값을 비우지 않고 자리표시 이미지로 되돌린다.
 * 빈 값으로 두면 캔버스와 내보낸 메일에 깨진 이미지(엑스박스)가 뜬다.
 * 되돌리면 다시 올리기 화면이 나오므로, 바꾸는 길도 여기서 이어진다.
 */
const clearImage = () => {
  errorText.value = ''
  conflict.value = null
  cropSource.value = null
  cropConflict.value = null
  lastUploaded = null
  setValue(props.placeholderUrl)
}

onBeforeUnmount(() => {
  controller?.abort()
  releasePreview()
})

/**
 * 다듬기 버튼은 이 필드 안이 아니라 속성 패널의 '이미지 크기 조정' 그룹에 있다(ModuleForm 의
 * image-crop 타입). 그쪽에서 이 메서드를 불러 모달을 연다 — 원본 File·같은 이름 확인·재업로드는
 * 전부 여기서 이어진다.
 */
defineExpose({ openCrop, loadingCrop })
</script>

<template>
  <div class="iu-field">
    <template v-if="showUploader">
      <!-- 올리는 중 — 그 파일의 미리보기와 진행률 (Figma 1406-7517) -->
      <div v-if="uploading" class="iu-busy">
        <div class="iu-busy-thumb">
          <img v-if="previewUrl" :src="previewUrl" alt="" />
        </div>
        <div class="iu-busy-body">
          <p class="iu-file-name" :title="uploadingName">
            <span class="iu-file-base">{{ uploadingName }}</span>
          </p>
          <p class="iu-status">
            <span class="iu-status-state iu-status-state--busy">
              <span class="iu-bullet">⦁</span> 업로드 중
            </span>
          </p>
          <div class="iu-progress">
            <div class="iu-progress-track">
              <div class="iu-progress-bar" :style="{ width: `${progress}%` }"></div>
            </div>
            <span class="iu-progress-pct">{{ progress }}%</span>
          </div>
        </div>
      </div>

      <!-- 같은 이름의 파일이 이미 있을 때 (Figma 1412-683).
           '올린 뒤'보다 앞에 둔다 — 다듬기 뒤 다시 올릴 때는 이미 값이 있는 상태에서 묻기 때문. -->
      <div v-else-if="conflict" class="iu-box iu-box--alert">
        <span class="material-symbols-outlined iu-alert-icon">warning</span>
        <p class="iu-alert-text">
          같은 이름의 파일이 이미 있어요<br />
          기존 파일을 덮어쓸까요?
        </p>
        <!--
          '취소'가 아니라 '새 이름으로 저장' — 어느 쪽을 눌러도 이미지는 올라간다.
          갈리는 것은 먼저 올린 파일을 남기느냐(번호를 붙인 새 이름) 대체하느냐뿐이다.
        -->
        <div class="iu-alert-actions">
          <button type="button" class="iu-ghost-btn" @click="uploadAsNewName">새 이름으로 저장</button>
          <button type="button" class="iu-ghost-btn" @click="confirmOverwrite">덮어쓰기</button>
        </div>
      </div>

      <!-- 올린 뒤 — 다듬기와 삭제 (Figma 1420-1115) -->
      <div v-else-if="hasValue" class="iu-done">
        <div class="iu-done-body">
          <span class="material-symbols-outlined iu-done-check">check_circle</span>
          <div class="iu-done-text">
            <p class="iu-file-name" :title="modelValue">
              <span class="iu-file-base">{{ doneName.base }}</span>
              <span v-if="doneName.ext" class="iu-file-ext">{{ doneName.ext }}</span>
            </p>
            <p class="iu-status">
              <span class="iu-status-state iu-status-state--done">
                <span class="iu-bullet">⦁</span> 업로드 완료
              </span>
            </p>
          </div>
        </div>
        <button type="button" class="iu-icon-btn" title="이미지 삭제" @click="clearImage">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>

      <!-- 올리기 전 (Figma 1398-6701) -->
      <div
        v-else
        class="iu-box iu-box--drop"
        :class="{ 'is-over': isDragOver }"
        @click="openPicker"
        @dragover.prevent="isDragOver = true"
        @dragenter.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="onDrop"
      >
        <p class="iu-drop-text">
          첨부할 이미지를 여기에 끌어다 놓거나.<br />
          파일 선택 버튼을 직접 선택해주세요.
        </p>
        <button type="button" class="iu-pick-btn" @click.stop="openPicker">
          <span class="material-symbols-outlined">upload</span>
          파일 선택
        </button>
        <p class="iu-drop-hint">최대 크기 : {{ maxSizeLabel }}</p>
      </div>

      <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFilePicked" />

      <!-- 저장 위치는 보여주지 않는다 — 폴더는 에디터에 들어오기 전 '폴더 선택' 걸음에서
           이미 정해졌고, 올리는 동안·올린 뒤에는 위 줄에 그 자리가 적힌다.
           (올릴 자리가 없는 경우는 아래 errorText가 알린다) -->
      <p v-if="errorText" class="iu-error">{{ errorText }}</p>

      <!-- 다듬기 모달 — '적용하기'면 잘라낸 파일을 바로 다시 올린다.
           같은 이름이 있으면 이 모달 위에 확인 모달(SameNameDialog)이 겹쳐 뜬다. -->
      <ImageCropDialog
        :file="cropSource"
        :cropWidth="cropWidth"
        :applying="applying"
        @apply="onCropApply"
        @cancel="onCropCancel"
      />
      <SameNameDialog
        :visible="cropConflict !== null"
        :fileName="cropConflict?.saveAs"
        @cancel="cropConflictCancel"
        @newName="cropConflictNewName"
        @overwrite="cropConflictOverwrite"
      />
    </template>
  </div>
</template>

<style scoped>
.iu-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 점선 상자 — 올리기 전 · 같은 이름 확인이 같은 자리를 쓴다 */
.iu-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 200px;
  border: 2px dashed var(--gray-300);
  border-radius: 8px;
  box-sizing: border-box;
}

/* 올리기 전 */
.iu-box--drop {
  background: var(--gray-100);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.iu-box--drop:hover,
.iu-box--drop.is-over {
  border-color: var(--blue-400);
  background: var(--blue-50);
}
.iu-drop-text {
  margin: 0 0 26px;
  font-size: 16px;
  line-height: 1.5;
  color: var(--gray-700);
  text-align: center;
}
.iu-pick-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border: 0;
  border-radius: 8px;
  background: var(--blue-400);
  color: var(--white);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.iu-pick-btn:hover {
  background: var(--blue-500);
}
.iu-pick-btn .material-symbols-outlined {
  font-size: 24px;
}
.iu-drop-hint {
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 1.5;
  letter-spacing: -0.14px;
  color: var(--gray-600);
}

/* 같은 이름 확인 */
.iu-box--alert {
  background: var(--white);
}
.iu-alert-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  aspect-ratio: 1/1;
  border-radius: 50%;
  background-color: var(--red-50);
  color: var(--red-400);
}
.iu-alert-text {
  margin: 10px 0 22px;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--gray-800);
  text-align: center;
}
.iu-alert-actions {
  display: flex;
  gap: 15px;
}
.iu-ghost-btn {
  /* 디자인은 80px 고정이지만 '덮어쓰기'가 줄바꿈되지 않도록 최소 폭으로 둔다 */
  min-width: 80px;
  height: 40px;
  padding: 0 16px;
  white-space: nowrap;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  background: var(--white);
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-600);
  cursor: pointer;
}
.iu-ghost-btn:hover {
  background: var(--gray-50);
}

/* 올리는 중 */
.iu-busy {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.iu-busy-thumb {
  flex: none;
  width: 70px;
  height: 70px;
  border-radius: 8px;
  background: var(--gray-100);
  overflow: hidden;
}
.iu-busy-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.iu-busy-body {
  /* min-width:0 이 없으면 긴 파일 이름이 상자를 밀어 패널이 가로로 잘린다 */
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.iu-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}
.iu-progress-track {
  flex: 1;
  min-width: 0;
  height: 4px;
  border-radius: 2px;
  background: var(--gray-200);
  overflow: hidden;
}
.iu-progress-bar {
  height: 100%;
  border-radius: 2px;
  background: var(--blue-400);
  transition: width 0.15s linear;
}
.iu-progress-pct {
  flex: none;
  font-size: 13px;
  line-height: 1.5;
  color: var(--gray-500);
}

/* 올린 뒤 — 왼쪽에 초록 띠를 둘러 '올라갔다'를 한눈에 */
.iu-done {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 8px;
  border: 1px solid var(--gray-200);
  border-left: 5px solid var(--green-400);
  border-radius: 8px;
  background: var(--white);
}
.iu-done-body {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}
.iu-done-check {
  flex: none;
  font-size: 22px;
  color: var(--green-400);
  /* 채운 글리프 — 초록 원 안의 흰 체크 (폰트에 FILL 축이 있다) */
  font-variation-settings: 'FILL' 1;
}
.iu-done-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 파일 이름 — 이름만 줄이고 확장자는 남긴다 */
.iu-file-name {
  display: flex;
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--gray-800);
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}
.iu-file-base {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.iu-file-ext {
  flex: none;
}

/* 상태 줄 — '⦁ 업로드 중/완료' + 올라가는 자리 */
.iu-status {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0;
  min-width: 0;
  font-size: 13px;
  line-height: 1.5;
}
.iu-status-state {
  flex: none;
  font-weight: 500;
}
.iu-status-state--busy {
  color: var(--blue-400);
}
.iu-status-state--done {
  color: var(--green-700);
}
.iu-bullet {
  font-size: 11px;
}
.iu-icon-btn {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: none;
  color: var(--gray-600);
  cursor: pointer;
}
.iu-icon-btn:hover {
  color: var(--red-400);
}
.iu-icon-btn .material-symbols-outlined {
  font-size: 24px;
}

.iu-error {
  margin: 0;
  font-size: 13px;
  color: var(--red-700);
}
</style>
