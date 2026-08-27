<script setup lang="ts">
/**
 * 이미지 주소 입력 필드 — 업로드와 URL 직접 입력을 함께 제공한다.
 *
 * 값은 **지금까지와 똑같이 URL 문자열 하나**다. 업로드는 그 문자열을 채우는 수단이 하나 더
 * 생긴 것뿐이라, 저장/불러오기/내보내기 파이프라인은 아무것도 바뀌지 않는다.
 *
 * 업로드 주소(VITE_S3_UPLOAD_URL)가 비어 있으면 업로드 영역을 통째로 숨기고 URL 입력만
 * 남긴다 — 서버 CORS 허용 전에 배포해도 눌러서 실패하는 버튼이 보이지 않게 하려는 것.
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import InputText from 'primevue/inputtext'
import Checkbox from 'primevue/checkbox'
import { useEditorStore } from '@/stores/editorStore'
import { DEFAULT_IMAGE_URL, isPlaceholderImage } from '@/constants/defaults'
import { useToast } from 'primevue/usetoast'
import {
  ALLOWED_IMAGE_EXT,
  MAX_IMAGE_BYTES,
  MISSING_VOLUME_MESSAGE,
  UploadError,
  buildUploadDirectory,
  buildUploadFileName,
  formatBytes,
  isUploadEnabled,
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
  }>(),
  { placeholder: 'https://...', urlOnly: false, placeholderUrl: DEFAULT_IMAGE_URL },
)

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const editorStore = useEditorStore()
const toast = useToast()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const progress = ref(0)
const uploading = ref(false)
const errorText = ref('')
const previewFailed = ref(false)
let controller: AbortController | null = null

/**
 * 같은 이름의 이미지를 다시 올렸을 때 덮어쓸지.
 *
 * 켜짐(기본): 파일 이름 그대로 올려 같은 이름이면 이전 것을 대체한다 — 시안을 고쳐 다시
 *   올리는 게 대부분이라, 회차 폴더에 비슷한 파일이 쌓이지 않게 이쪽을 기본으로 둔다.
 * 꺼짐: 이름 뒤에 날짜·시각을 붙여 새 파일로 올린다(이전 이미지는 그대로 남는다).
 */
const overwrite = ref(true)

const showUploader = computed(() => !props.urlOnly && isUploadEnabled())

/** 드롭존 안내에 쓸 허용 형식 — 'JPG · PNG · GIF · WEBP' (중복 확장자 jpeg는 접는다) */
const allowedFormatsLabel = [...new Set(ALLOWED_IMAGE_EXT.filter((e) => e !== 'jpeg'))]
  .map((e) => e.toUpperCase())
  .join(' · ')

/**
 * 실제로 넣은 이미지가 있는지.
 * 자리표시 이미지(모듈 기본 이미지)는 '아직 안 넣음'으로 보고 업로드 영역을 계속 보여준다 —
 * 삭제하자마자 다시 올릴 수 있어야 하기 때문.
 */
const hasValue = computed(() => !isPlaceholderImage(props.modelValue))

/**
 * 업로드될 폴더 — 사용자에게 미리 보여줘 어디에 쌓이는지 알 수 있게 한다.
 * 회차('전체 스타일' → 뉴스레터 회차)를 아직 안 적었으면 null이다.
 */
const targetDirectory = computed(() =>
  buildUploadDirectory(editorStore.currentTemplateId, editorStore.wrapSettings.volume),
)

const setValue = (url: string) => {
  previewFailed.value = false
  emit('update:modelValue', url)
}

const openPicker = () => {
  if (uploading.value) return
  fileInput.value?.click()
}

const startUpload = async (file: File) => {
  errorText.value = ''

  // 회차를 안 적었으면 올릴 폴더가 정해지지 않는다 — 알림을 띄우고 여기서 멈춘다.
  const directory = targetDirectory.value
  if (!directory) {
    errorText.value = MISSING_VOLUME_MESSAGE
    toast.add({
      severity: 'warn',
      summary: '뉴스레터 회차가 필요해요',
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

  // 덮어쓰기는 '이름이 같으면 대체한다'는 뜻인데, 한글·공백이 든 이름은 올릴 때 다듬어진다
  // ('메인배너.png' → 'image.png', '배너-01.png' → '01.png'). 그래서 화면에서 다른 이름으로
  // 보이던 이미지끼리도 겹칠 수 있다. 막지는 않고(사용자가 고른 동작이다) 바뀐 이름만 알린다.
  const saveAs = buildUploadFileName(file.name, new Date(), false)
  if (overwrite.value && saveAs !== file.name) {
    toast.add({
      severity: 'warn',
      summary: '파일 이름이 바뀌어 올라가요',
      detail:
        `'${file.name}' → '${saveAs}'. 같은 폴더에 같은 이름이 있으면 덮어씁니다. ` +
        '다른 이미지를 지우고 싶지 않다면 파일 이름을 영문으로 바꾸거나 ' +
        '"같은 이름이면 덮어쓰기"를 꺼 주세요.',
      life: 8000,
    })
  }

  uploading.value = true
  progress.value = 0
  controller = new AbortController()
  try {
    const { url } = await uploadImage(file, directory, {
      onProgress: (p) => (progress.value = p),
      signal: controller.signal,
      overwrite: overwrite.value,
    })
    setValue(url)
  } catch (err) {
    errorText.value =
      err instanceof UploadError ? err.message : '업로드 중 문제가 생겼어요. 다시 시도해 주세요.'
  } finally {
    uploading.value = false
    controller = null
  }
}

const onFilePicked = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // 같은 파일을 다시 골라도 change가 일어나도록 값을 비운다
  input.value = ''
  if (file) void startUpload(file)
}

const onDrop = (event: DragEvent) => {
  isDragOver.value = false
  if (uploading.value) return
  const file = event.dataTransfer?.files?.[0]
  if (file) void startUpload(file)
}

const cancelUpload = () => controller?.abort()

/**
 * '삭제' — 값을 비우지 않고 자리표시 이미지로 되돌린다.
 * 빈 값으로 두면 캔버스와 내보낸 메일에 깨진 이미지(엑스박스)가 뜬다.
 */
const clearImage = () => {
  errorText.value = ''
  setValue(props.placeholderUrl)
}

onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <div class="iu-field">
    <!-- ── 업로드 영역 ── -->
    <template v-if="showUploader">
      <!-- 업로드 중 -->
      <div v-if="uploading" class="iu-box iu-box--busy">
        <div class="iu-progress"><div class="iu-progress-bar" :style="{ width: `${progress}%` }"></div></div>
        <div class="iu-busy-row">
          <span class="iu-busy-text">업로드 중… {{ progress }}%</span>
          <button type="button" class="iu-link-btn" @click="cancelUpload">취소</button>
        </div>
      </div>

      <!-- 이미지가 있을 때 — 미리보기 + 교체/삭제 -->
      <div v-else-if="hasValue" class="iu-box iu-box--filled">
        <div class="iu-thumb">
          <img v-if="!previewFailed" :src="modelValue" alt="" @error="previewFailed = true" />
          <span v-else class="material-symbols-outlined iu-thumb-broken">broken_image</span>
        </div>
        <div class="iu-filled-body">
          <p class="iu-filled-name" :title="modelValue">{{ modelValue }}</p>
          <div class="iu-filled-actions">
            <button type="button" class="iu-link-btn" @click="openPicker">교체</button>
            <span class="iu-dot">·</span>
            <button type="button" class="iu-link-btn iu-link-btn--danger" @click="clearImage">삭제</button>
          </div>
        </div>
      </div>

      <!-- 비어 있을 때 — 드롭존 -->
      <button
        v-else
        type="button"
        class="iu-box iu-box--drop"
        :class="{ 'is-over': isDragOver }"
        @click="openPicker"
        @dragover.prevent="isDragOver = true"
        @dragenter.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="onDrop"
      >
        <span class="material-symbols-outlined iu-drop-icon">add_photo_alternate</span>
        <span class="iu-drop-title">이미지를 끌어다 놓거나 클릭해서 올리세요</span>
        <!-- 허용 형식은 목록에서 그대로 만든다 — 따로 적어두면 목록을 고칠 때 안내가 어긋난다 -->
        <span class="iu-drop-sub">{{ allowedFormatsLabel }}, 최대 {{ formatBytes(MAX_IMAGE_BYTES) }}</span>
      </button>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="onFilePicked"
      />

      <!-- 같은 이름 처리 방식 — 올리는 중에 바꿔도 이번 건에는 반영되지 않으므로 그동안 감춘다 -->
      <label v-if="!uploading" class="iu-overwrite">
        <Checkbox v-model="overwrite" :binary="true" />
        <span class="iu-overwrite-body">
          <span class="iu-overwrite-title">같은 이름이면 덮어쓰기</span>
          <span class="iu-overwrite-hint">{{
            overwrite
              ? '파일 이름 그대로 올려 먼저 올린 같은 이름의 이미지를 대체해요'
              : '이름 뒤에 날짜·시각을 붙여 새 파일로 올려요 (기존 이미지는 그대로)'
          }}</span>
        </span>
      </label>

      <p v-if="errorText" class="iu-error">{{ errorText }}</p>
      <p v-if="targetDirectory" class="iu-target">저장 위치 <code>{{ targetDirectory }}</code></p>
      <!-- 회차 미입력 안내는 오류 문구와 내용이 같다 — 오류가 떠 있으면 반복하지 않는다 -->
      <p v-else-if="!errorText" class="iu-target iu-target--missing">
        저장 위치를 정하려면 <strong>전체 스타일 → 뉴스레터 회차</strong>를 먼저 입력해 주세요.
      </p>
    </template>

    <!-- ── URL 이미지 직접 입력 숨김 (업로드 가능 여부와 무관하게 항상 제공) ── -->
    <!-- <div class="gg-text-input space-y-2">
      <label v-if="showUploader" class="gg-field-label">또는 이미지 주소 직접 입력</label>
      <InputText
        :modelValue="modelValue"
        @update:modelValue="setValue($event ?? '')"
        :placeholder="placeholder"
        class="w-full"
      />
    </div> -->
  </div>
</template>

<style scoped>
.iu-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 업로드 영역 공통 상자 */
.iu-box {
  width: 100%;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  background: var(--white);
  box-sizing: border-box;
}

/* 비어 있을 때 — 점선 드롭존 */
.iu-box--drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 20px 12px;
  border-style: dashed;
  border-color: var(--gray-300);
  background: var(--gray-50);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
}
.iu-box--drop:hover,
.iu-box--drop.is-over {
  border-color: var(--blue-400);
  background: var(--blue-50);
}
.iu-drop-icon {
  font-size: 28px;
  color: var(--gray-500);
}
.iu-box--drop:hover .iu-drop-icon,
.iu-box--drop.is-over .iu-drop-icon {
  color: var(--blue-400);
}
.iu-drop-title {
  font-size: 14px;
  color: var(--gray-700);
}
.iu-drop-sub {
  font-size: 12px;
  color: var(--gray-500);
}

/* 이미지가 있을 때 — 썸네일 + 액션 */
.iu-box--filled {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
}
.iu-thumb {
  flex: none;
  width: 52px;
  height: 52px;
  border: 1px solid var(--gray-200);
  border-radius: 6px;
  background: var(--gray-100);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.iu-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.iu-thumb-broken {
  font-size: 22px;
  color: var(--gray-400);
}
.iu-filled-body {
  /* min-width:0 이 없으면 긴 URL이 상자를 밀어 패널이 가로로 잘린다 */
  min-width: 0;
  flex: 1;
}
.iu-filled-name {
  margin: 0 0 4px;
  font-size: 13px;
  color: var(--gray-600);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.iu-filled-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.iu-dot {
  color: var(--gray-300);
  font-size: 12px;
}

/* 업로드 중 */
.iu-box--busy {
  padding: 12px;
}
.iu-progress {
  height: 6px;
  border-radius: 3px;
  background: var(--gray-100);
  overflow: hidden;
}
.iu-progress-bar {
  height: 100%;
  border-radius: 3px;
  background: var(--blue-400);
  transition: width 0.15s linear;
}
.iu-busy-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}
.iu-busy-text {
  font-size: 13px;
  color: var(--gray-600);
}

.iu-link-btn {
  padding: 0;
  border: 0;
  background: none;
  font-size: 13px;
  color: var(--blue-500);
  cursor: pointer;
}
.iu-link-btn:hover {
  text-decoration: underline;
}
.iu-link-btn--danger {
  color: var(--red-400);
}

/* 같은 이름이면 덮어쓰기 */
.iu-overwrite {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
}
.iu-overwrite-body {
  /* min-width:0 이 없으면 안내 문구가 상자를 밀어 패널이 가로로 잘린다 */
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.iu-overwrite-title {
  font-size: 13px;
  color: var(--gray-700);
}
.iu-overwrite-hint {
  font-size: 12px;
  color: var(--gray-500);
  line-height: 1.5;
}

.iu-error {
  margin: 0;
  font-size: 13px;
  color: var(--red-700);
}
.iu-target {
  margin: 0;
  font-size: 12px;
  color: var(--gray-500);
}
.iu-target code {
  font-size: 12px;
  color: var(--gray-600);
}
/* 회차 미입력 — 업로드가 막혀 있다는 걸 눈에 띄게 */
.iu-target--missing {
  color: var(--yellow-700);
}
.iu-target--missing strong {
  font-weight: 600;
}
</style>
