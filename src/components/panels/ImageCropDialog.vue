<script setup lang="ts">
/**
 * 이미지 다듬기 모달 — 이미 올린 이미지를 비율·높이에 맞춰 잘라낸다.
 *
 * - 비율을 고르면(16:9 등) 상자가 그 비율로 잠긴다. 높이를 입력하면 너비가 비율로 따라오고,
 *   '자유'에서는 너비·높이를 따로 입력한다. 숫자는 **원본 픽셀** 기준이다.
 * - 저장 크기는 모듈 폭(cropWidth) × 2로 줄여서 만든다(원본이 그보다 작으면 그대로).
 *   드래그 UI는 vue-advanced-cropper 가 맡고, 결과 캔버스 → File 변환은 utils/imageCrop 이 맡는다.
 * - '적용하기'는 잘라낸 File 을 넘길 뿐이다. 올리는 일(같은 이름 확인 포함)은
 *   ImageUploadField 가 그대로 이어서 한다.
 */
import { computed, ref, watch } from 'vue'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import {
  ASPECT_PRESETS,
  DEFAULT_CROP_WIDTH,
  RETINA_SCALE,
  canvasToFile,
  heightForWidth,
  isGif,
  outputSize,
  widthForHeight,
} from '@/utils/imageCrop'

const props = withDefaults(
  defineProps<{
    /** 자를 파일. null 이면 닫힌 상태 */
    file: File | null
    /** 이 이미지가 메일에서 차지하는 가로 폭(px) — 저장 해상도의 기준 */
    cropWidth?: number
    /** 부모가 '적용하기' 뒤 같은 이름을 확인하는 중 — 버튼을 잠그고 문구를 바꾼다 */
    applying?: boolean
  }>(),
  { cropWidth: DEFAULT_CROP_WIDTH, applying: false },
)

const emit = defineEmits<{
  /** 잘라낸 파일을 적용(다시 올리기) */
  apply: [File]
  /** 아무것도 바꾸지 않고 닫기 */
  cancel: []
}>()

type CropperInstance = InstanceType<typeof Cropper>
const cropper = ref<CropperInstance | null>(null)

const visible = computed(() => props.file !== null)

/** Cropper 에 넘길 objectURL — 파일이 바뀔 때마다 새로 만들고 이전 것은 돌려준다 */
const src = ref('')
watch(
  () => props.file,
  (file) => {
    if (src.value) URL.revokeObjectURL(src.value)
    src.value = file ? URL.createObjectURL(file) : ''
    // 새 파일마다 비율·좌표를 처음으로
    presetIndex.value = 0
    coords.value = { width: 0, height: 0 }
    imageSize.value = { width: 0, height: 0 }
    busy.value = false
    errorText.value = ''
  },
)

const presetIndex = ref(0)
const ratio = computed(() => ASPECT_PRESETS[presetIndex.value]?.ratio ?? null)
/** stencil-props 는 undefined 여야 자유 비율이다(null 을 주면 0으로 취급될 수 있다) */
const stencilProps = computed(() => ({ aspectRatio: ratio.value ?? undefined }))

/** 현재 자르기 상자(원본 픽셀) — Cropper 의 change 로 받는다 */
const coords = ref({ width: 0, height: 0 })
const imageSize = ref({ width: 0, height: 0 })

const onChange = (result: { coordinates: { width: number; height: number }; image: { width: number; height: number } }) => {
  coords.value = { width: Math.round(result.coordinates.width), height: Math.round(result.coordinates.height) }
  imageSize.value = { width: result.image.width, height: result.image.height }
}

/** 입력 상자에 보이는 값 — 드래그로 바뀌면 따라오고, 직접 치면 상자를 옮긴다 */
const heightInput = computed({
  get: () => coords.value.height,
  set: (h: number) => {
    const height = clampInt(h, imageSize.value.height)
    const width = ratio.value === null ? coords.value.width : widthForHeight(height, ratio.value, coords.value.width)
    cropper.value?.setCoordinates({ width, height })
  },
})
const widthInput = computed({
  get: () => coords.value.width,
  set: (w: number) => {
    const width = clampInt(w, imageSize.value.width)
    const height = ratio.value === null ? coords.value.height : heightForWidth(width, ratio.value, coords.value.height)
    cropper.value?.setCoordinates({ width, height })
  },
})
const clampInt = (n: number, max: number) => {
  const v = Math.round(Number(n) || 0)
  return Math.min(Math.max(1, v), Math.max(1, max))
}

/** 실제로 저장될 크기 — 화면에 알려 준다 */
const saved = computed(() => outputSize(coords.value, props.cropWidth))
/** Cropper 가 결과 캔버스를 바로 이 폭으로 줄여 준다 */
const canvasOptions = computed(() => ({
  maxWidth: props.cropWidth * RETINA_SCALE,
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'high' as const,
}))

const gifWarning = computed(() => (props.file && isGif(props.file) ? 'GIF는 자르면 움직임이 사라지고 PNG로 저장돼요.' : ''))

const busy = ref(false)
const errorText = ref('')

/** 만드는 중이거나 부모가 이름을 확인하는 중 — 둘 다 버튼을 잠근다 */
const locked = computed(() => busy.value || props.applying)

const apply = async () => {
  const file = props.file
  const instance = cropper.value
  if (!file || !instance || locked.value) return
  busy.value = true
  errorText.value = ''
  try {
    const { canvas } = instance.getResult()
    if (!canvas) throw new Error('자를 영역을 정해 주세요.')
    emit('apply', await canvasToFile(canvas, file))
  } catch (err) {
    errorText.value = err instanceof Error ? err.message : '이미지를 자르지 못했어요.'
  } finally {
    busy.value = false
  }
}

const cancel = () => {
  if (!locked.value) emit('cancel')
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="이미지 다듬기"
    :closable="!locked"
    :draggable="false"
    class="crop-dialog"
    :style="{ width: 'min(880px, 94vw)' }"
    @update:visible="(v: boolean) => !v && cancel()"
  >
    <div class="crop-body">
      <div class="crop-stage">
        <Cropper
          v-if="src"
          ref="cropper"
          class="crop-cropper"
          :src="src"
          :stencil-props="stencilProps"
          :canvas="canvasOptions"
          image-restriction="stencil"
          @change="onChange"
        />
      </div>

      <div class="crop-controls">
        <div class="crop-row">
          <span class="crop-label">비율</span>
          <div class="crop-seg">
            <button
              v-for="(preset, i) in ASPECT_PRESETS"
              :key="preset.label"
              type="button"
              class="crop-seg-btn"
              :class="{ 'is-active': presetIndex === i }"
              @click="presetIndex = i"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>

        <div class="crop-row">
          <span class="crop-label">크기</span>
          <label class="crop-num">
            <span>너비</span>
            <input
              type="number"
              min="1"
              :max="imageSize.width || undefined"
              :value="widthInput"
              :disabled="ratio !== null"
              :title="ratio !== null ? '비율이 잠겨 있어 높이에서 계산돼요' : ''"
              @change="widthInput = Number(($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="crop-num">
            <span>높이</span>
            <input
              type="number"
              min="1"
              :max="imageSize.height || undefined"
              :value="heightInput"
              @change="heightInput = Number(($event.target as HTMLInputElement).value)"
            />
          </label>
          <span class="crop-unit">px (원본 기준)</span>
        </div>

        <p class="crop-info">
          저장 크기 {{ saved.width }} × {{ saved.height }}px
          <span class="crop-info-sub">· 모듈 폭 {{ cropWidth }}px의 {{ RETINA_SCALE }}배까지만 저장해요</span>
        </p>
        <p v-if="gifWarning" class="crop-warn">{{ gifWarning }}</p>
        <p v-if="errorText" class="crop-error">{{ errorText }}</p>
      </div>
    </div>

    <template #footer>
      <div class="crop-footer">
        <button type="button" class="crop-btn crop-btn--ghost" :disabled="locked" @click="cancel">취소</button>
        <button type="button" class="crop-btn crop-btn--primary" :disabled="locked || !coords.width" @click="apply">
          {{ busy ? '만드는 중…' : applying ? '확인 중…' : '적용하기' }}
        </button>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.crop-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 자르기 화면 — 어두운 바탕에 이미지가 떠 보이게 */
.crop-stage {
  background: var(--gray-800);
  border-radius: 8px;
  overflow: hidden;
}
.crop-cropper {
  height: min(60vh, 520px);
}

.crop-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.crop-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.crop-label {
  flex: none;
  width: 36px;
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-700);
}

/* 비율 선택 — 헤더의 PC/모바일 세그먼트와 같은 결 */
.crop-seg {
  display: inline-flex;
  padding: 3px;
  border-radius: 8px;
  background: var(--gray-100);
  gap: 2px;
}
.crop-seg-btn {
  min-width: 48px;
  height: 30px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: var(--gray-600);
  cursor: pointer;
}
.crop-seg-btn:hover {
  color: var(--gray-800);
}
.crop-seg-btn.is-active {
  background: var(--white);
  color: var(--blue-500);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
}

.crop-num {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--gray-600);
}
.crop-num input {
  width: 88px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--gray-200);
  border-radius: 6px;
  font-size: 13px;
  color: var(--gray-800);
  background: var(--white);
}
.crop-num input:disabled {
  background: var(--gray-50);
  color: var(--gray-400);
}
.crop-unit {
  font-size: 12px;
  color: var(--gray-500);
}

.crop-info {
  margin: 0;
  font-size: 13px;
  color: var(--gray-700);
}
.crop-info-sub {
  color: var(--gray-500);
}
.crop-warn {
  margin: 0;
  font-size: 13px;
  color: var(--red-700);
}
.crop-error {
  margin: 0;
  font-size: 13px;
  color: var(--red-700);
}

.crop-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
}
.crop-btn {
  height: 40px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.crop-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.crop-btn--ghost {
  border: 1px solid var(--gray-200);
  background: var(--white);
  color: var(--gray-600);
}
.crop-btn--ghost:not(:disabled):hover {
  background: var(--gray-50);
}
.crop-btn--primary {
  border: 0;
  background: var(--blue-400);
  color: var(--white);
}
.crop-btn--primary:not(:disabled):hover {
  background: var(--blue-500);
}
</style>
