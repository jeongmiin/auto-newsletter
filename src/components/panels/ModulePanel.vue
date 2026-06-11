<template>
  <div class="h-full flex flex-col">
    <!-- 모듈 / 템플릿 세그먼트 토글 -->
    <div class="p-2 border-b">
      <div class="flex bg-gray-100 rounded-lg p-0.5">
        <button
          @click="mode = 'modules'"
          :class="[
            'flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors',
            mode === 'modules' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700',
          ]"
        >
          모듈
        </button>
        <button
          @click="mode = 'templates'"
          :class="[
            'flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors',
            mode === 'templates' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700',
          ]"
        >
          템플릿
        </button>
      </div>
    </div>

    <!-- 카테고리 (모듈 모드에서만) — 세그먼트 트랙 3열 그리드 -->
    <div v-if="mode === 'modules'" class="p-3 border-b">
      <div class="grid grid-cols-3 gap-1 bg-gray-100 rounded-lg p-1">
        <button
          v-for="category in categories"
          :key="category.id"
          @click="selectedCategory = category.id"
          :class="[
            'px-2 py-1.5 text-sm font-medium text-center rounded-md transition-colors',
            selectedCategory === category.id
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          ]"
        >
          {{ category.name }}
        </button>
      </div>
    </div>

    <!-- 콘텐츠 영역 -->
    <div class="flex-1 overflow-y-auto p-3 pb-10" @scroll="onModuleLeave">
      <!-- 템플릿 리스트 -->
      <div v-if="mode === 'templates'">
        <div v-if="templates.length === 0" class="text-center py-8 text-gray-500">
          <i class="pi pi-folder-open text-3xl text-gray-300 mb-3 block"></i>
          <div class="text-sm">사용 가능한 템플릿이 없습니다</div>
          <div class="text-xs text-gray-400 mt-1">상단의 "템플릿 내보내기"로<br />현재 작업을 템플릿으로 저장할 수 있습니다</div>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="template in templates"
            :key="template.id"
            @click="applyTemplate(template)"
            class="p-3 border-2 border-dashed border-blue-200 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-colors"
          >
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-blue-100 text-blue-700 rounded flex items-center justify-center">
                <i class="pi pi-file-edit"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm truncate">{{ template.name }}</div>
                <div class="text-xs text-gray-500 truncate">{{ template.description || `${template.modules.length}개 모듈` }}</div>
              </div>
            </div>
          </div>
          <div class="text-xs text-gray-500 mt-3 px-1 flex flex-wrap gap-2 items-center">
            <i class="pi pi-info-circle"></i>
            템플릿을 적용하면 현재 작업이 대체됩니다
          </div>
        </div>
      </div>

      <!-- 모듈 리스트 -->
      <div v-else class="space-y-2">
        <div
          v-for="module in filteredModules"
          :key="module.id"
          @click="addModule(module)"
          @mouseenter="onModuleHover(module, $event)"
          @mouseleave="onModuleLeave"
          class="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-blue-50 text-blue-600 rounded flex items-center justify-center">
              <i :class="module.icon"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">{{ module.name }}</div>
              <div class="text-xs text-gray-500 truncate">{{ module.description }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 모듈 호버 미리보기 (라이브 렌더 iframe, 화면 흐름 밖 floating) -->
    <Teleport to="body">
      <div
        v-if="preview.visible"
        class="module-preview-pop"
        :class="{ 'is-ready': preview.ready }"
        :style="{ left: preview.left + 'px', top: preview.top + 'px' }"
      >
        <div class="module-preview-inner" :style="{ height: preview.height + 'px' }">
          <iframe
            v-if="preview.srcdoc"
            :srcdoc="preview.srcdoc"
            class="module-preview-iframe"
            title="모듈 미리보기"
            sandbox="allow-same-origin"
            @load="onPreviewLoad"
          ></iframe>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import type { ModuleMetadata, NewsletterTemplate } from '@/types'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()
const toast = useToast()
const confirm = useConfirm()

// 모듈/템플릿 탭 모드는 editorStore에서 공유 (캔버스 빈 화면 버튼에서도 전환)
const { modulePanelMode: mode } = storeToRefs(editorStore)
const selectedCategory = ref<string>('all')
const modules = ref<ModuleMetadata[]>([])
const templates = ref<NewsletterTemplate[]>([])

const categories = [
  { id: 'all', name: '전체' },
  { id: 'common', name: '공통' },
  { id: 'text', name: '텍스트' },
  { id: 'image', name: '이미지' },
  { id: 'button', name: '버튼' },
  { id: 'table', name: '테이블' },
]

const filteredModules = computed(() => {
  if (selectedCategory.value === 'all') return modules.value
  return modules.value.filter((module) => module.category === selectedCategory.value)
})

const addModule = (module: ModuleMetadata) => {
  onModuleLeave() // 추가 시 미리보기 닫기
  moduleStore.addModule(module)
  toast.add({
    severity: 'success',
    summary: '모듈 추가됨',
    detail: `${module.name} 모듈이 추가되었습니다`,
    life: 2000,
  })
}

// ===== 모듈 호버 라이브 미리보기 =====
const PREVIEW_WIDTH = 300 // 미리보기 가시 폭(px)
const MODULE_WIDTH = 680 // 모듈 템플릿 기준 폭(px)
const PREVIEW_SCALE = PREVIEW_WIDTH / MODULE_WIDTH
const HOVER_DELAY = 180 // 호버 후 표시까지 지연(ms)
const VIEWPORT_MARGIN = 8 // 화면 가장자리 최소 여백(px)
const GAP = 8 // 호버한 모듈과 미리보기 사이 간격(px)

const preview = reactive({
  visible: false, // DOM 마운트 여부
  ready: false, // 높이 측정 완료 → 화면에 표시(깜빡임/리사이즈 방지)
  srcdoc: '',
  left: 0,
  top: 0,
  height: 0,
})

let hoverTimer: ReturnType<typeof setTimeout> | null = null
let currentHoverId: string | null = null
let previewToken = 0 // 비동기(이미지 로드 등) 결과의 최신성 판별
let anchorTop = 0 // 호버한 모듈의 화면상 top — 측정 후 세로 위치 정렬 기준
const previewCache = new Map<string, string>()

const buildPreviewDoc = (content: string): string =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank">` +
  `<style>html,body{margin:0;padding:0;background:#fff;overflow:hidden;}*{box-sizing:border-box;}</style></head>` +
  `<body><div style="width:${MODULE_WIDTH}px;max-width:${MODULE_WIDTH}px;margin:0;">${content}</div></body></html>`

const onModuleHover = (module: ModuleMetadata, event: MouseEvent) => {
  if (hoverTimer) clearTimeout(hoverTimer)
  const el = event.currentTarget as HTMLElement
  hoverTimer = setTimeout(() => openPreview(module, el), HOVER_DELAY)
}

const openPreview = async (module: ModuleMetadata, el: HTMLElement) => {
  const rect = el.getBoundingClientRect()
  currentHoverId = module.id
  previewToken++
  // 호버한 모듈 바로 오른쪽, 세로는 모듈 상단에 맞춤(측정 후 화면 밖이면 보정)
  preview.left = rect.right + GAP
  anchorTop = rect.top
  preview.top = rect.top
  preview.ready = false // 높이 확정 전까지 숨김
  preview.visible = true

  const cached = previewCache.get(module.id)
  if (cached) {
    preview.srcdoc = cached
    return
  }

  preview.srcdoc = ''
  try {
    const content = await moduleStore.renderModulePreview(module.id)
    const doc = buildPreviewDoc(content)
    previewCache.set(module.id, doc)
    if (preview.visible && currentHoverId === module.id) {
      preview.srcdoc = doc
    }
  } catch (e) {
    if (currentHoverId === module.id) onModuleLeave()
    console.error('[ModulePanel] 미리보기 렌더 실패:', e)
  }
}

const onModuleLeave = () => {
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
  currentHoverId = null
  previewToken++ // 진행 중인 측정 결과 무효화
  preview.visible = false
  preview.ready = false
  preview.srcdoc = ''
}

/** iframe 내 이미지 로드 완료까지 대기(정확한 높이 측정용) — 안전 타임아웃 포함 */
const waitForImages = (doc: Document): Promise<void> => {
  const imgs = Array.from(doc.images || [])
  const pending = imgs
    .filter((im) => !im.complete)
    .map(
      (im) =>
        new Promise<void>((res) => {
          im.addEventListener('load', () => res(), { once: true })
          im.addEventListener('error', () => res(), { once: true })
        }),
    )
  if (pending.length === 0) return Promise.resolve()
  return Promise.race([
    Promise.all(pending).then(() => undefined),
    new Promise<void>((res) => setTimeout(res, 1200)),
  ])
}

// iframe 로드 후 이미지까지 기다렸다가 실제 높이를 한 번에 확정 → 표시
const onPreviewLoad = async (event: Event) => {
  const iframe = event.target as HTMLIFrameElement
  const token = previewToken
  try {
    const doc = iframe.contentDocument
    if (!doc?.body) return
    await waitForImages(doc)
    // 대기 중 다른 모듈로 이동/닫힘 → 무시
    if (token !== previewToken || !preview.visible) return

    const contentHeight = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight)
    iframe.style.height = contentHeight + 'px'
    const scaled = Math.ceil(contentHeight * PREVIEW_SCALE)
    const maxH = window.innerHeight - VIEWPORT_MARGIN * 2
    preview.height = Math.min(scaled, maxH)

    // 세로 위치: 모듈 상단 정렬, 화면 아래로 넘치면 위로만 보정
    let top = anchorTop
    if (top + preview.height > window.innerHeight - VIEWPORT_MARGIN) {
      top = window.innerHeight - preview.height - VIEWPORT_MARGIN
    }
    preview.top = Math.max(VIEWPORT_MARGIN, top)
    preview.ready = true
  } catch {
    /* contentDocument 접근 불가 시 표시만 (높이 기본) */
    if (token === previewToken) preview.ready = true
  }
}

onUnmounted(() => {
  if (hoverTimer) clearTimeout(hoverTimer)
})

const applyTemplate = (template: NewsletterTemplate) => {
  const doLoad = async () => {
    const ok = await moduleStore.loadTemplate(template.id)
    if (ok) {
      toast.add({
        severity: 'success',
        summary: '템플릿 적용됨',
        detail: `${template.name} 템플릿이 적용되었습니다`,
        life: 2500,
      })
    } else {
      toast.add({
        severity: 'error',
        summary: '템플릿 적용 실패',
        detail: '템플릿을 불러올 수 없습니다',
        life: 4000,
      })
    }
  }

  // 작업 내용이 있으면 확인
  if (moduleStore.modules.length > 0) {
    confirm.require({
      message: `현재 ${moduleStore.modules.length}개의 모듈이 있습니다. 템플릿을 적용하면 모두 대체됩니다. 계속하시겠습니까?`,
      header: '템플릿 적용 확인',
      rejectLabel: '취소',
      acceptLabel: '적용',
      rejectClass: 'p-button-secondary',
      acceptClass: 'p-button-primary',
      accept: doLoad,
    })
  } else {
    doLoad()
  }
}

onMounted(async () => {
  modules.value = await moduleStore.loadAvailableModules()
  templates.value = await moduleStore.loadAvailableTemplates()
})
</script>

<style scoped>
/* 모듈 호버 미리보기 — 화면 흐름 밖 floating, 클릭/호버 방해 없음 */
.module-preview-pop {
  position: fixed;
  z-index: 1100;
  width: 300px;
  pointer-events: none;
  filter: drop-shadow(0 6px 20px rgba(0, 0, 0, 0.18));
  /* 높이 확정 전엔 숨김 → 커졌다 작아지는 리사이즈 없이 한 번에 표시 */
  opacity: 0;
  transition: opacity 0.12s ease;
}
.module-preview-pop.is-ready {
  opacity: 1;
}
.module-preview-inner {
  width: 300px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
.module-preview-iframe {
  width: 680px;
  border: 0;
  display: block;
  background: #ffffff;
  transform: scale(0.4412);
  transform-origin: top left;
}
</style>

