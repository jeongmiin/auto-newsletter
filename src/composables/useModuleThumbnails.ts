import { reactive } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'

/**
 * 모듈 카드 상시 썸네일(iframe) 렌더 — ModulePanel.vue와 CategoryModulePanel.vue가 공유.
 * IntersectionObserver로 화면에 보이는 카드만 지연 렌더하고, 결과는 모듈 스코프 캐시(previewCache)에
 * 담아 모든 패널 인스턴스가 재사용한다.
 */

const MODULE_WIDTH = 680 // 모듈 템플릿 기준 폭(px)
const previewCache = new Map<string, string>() // module.id → iframe srcdoc (인스턴스 간 공유)

// ===== 썸네일 카드 기하 (ModulePanel·CategoryModulePanel·ModuleCard 공유 단일 소스) =====
// 표시 영역 = 카드 폭 308px − 카드 테두리 1px×2 − .module-thumb padding 10px×2 = 286px.
// 680px 렌더를 286/680 ≈ 0.4206으로 축소해 padding을 제외한 영역에 딱 맞춘다.
// ModuleCard의 CSS transform: scale()은 이 상수를 CSS 변수로 받아 쓰므로 값이 항상 일치한다.
export const THUMB_RENDER_WIDTH = MODULE_WIDTH
export const THUMB_PADDING = 10
export const THUMB_SCALE = 0.4206
export const THUMB_FALLBACK_H = 900 // 측정 전 임시 높이(미스케일 px)

const buildPreviewDoc = (content: string): string =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank">` +
  `<style>html,body{margin:0;padding:0;background:#fff;overflow:hidden;}*{box-sizing:border-box;}</style></head>` +
  `<body><div style="width:${MODULE_WIDTH}px;max-width:${MODULE_WIDTH}px;margin:0;">${content}</div></body></html>`

export function useModuleThumbnails() {
  const moduleStore = useModuleStore()
  const thumbs = reactive<Record<string, string>>({})
  // module.id → 실제 렌더된 콘텐츠 높이(680px 폭 기준, 미스케일 px). 카드가 이 높이×스케일로 맞춰진다.
  const thumbHeights = reactive<Record<string, number>>({})

  // iframe 로드 시 실제 콘텐츠 높이를 측정한다. sandbox="allow-same-origin"이라 contentDocument 접근 가능.
  // (load 이벤트는 이미지 등 하위 리소스까지 로드된 뒤 발생 → scrollHeight가 정확)
  const measureThumbHeight = (id: string, event: Event): void => {
    const iframe = event.target as HTMLIFrameElement
    const read = (): void => {
      try {
        const doc = iframe.contentDocument
        if (!doc) return
        const h = doc.body?.scrollHeight || doc.documentElement?.scrollHeight || 0
        if (h > 0 && h !== thumbHeights[id]) thumbHeights[id] = h
      } catch {
        /* 접근 불가 시 폴백 높이 사용 */
      }
    }
    read()
    // 폰트·이미지 로드로 인한 레이아웃 안정화 후 한 번 더 측정
    if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(read)
  }

  // 카드가 화면에 들어올 때만 렌더(성능) — 결과는 캐시
  const renderThumb = async (id: string) => {
    if (thumbs[id]) return
    const cached = previewCache.get(id)
    if (cached) {
      thumbs[id] = cached
      return
    }
    try {
      const doc = buildPreviewDoc(await moduleStore.renderModulePreview(id))
      previewCache.set(id, doc)
      thumbs[id] = doc
    } catch (e) {
      console.warn('[useModuleThumbnails] 썸네일 렌더 실패:', id, e)
    }
  }

  // IntersectionObserver로 보이는 카드만 지연 렌더.
  // 같은 모듈 id가 여러 아코디언(카테고리)에 중복 노출될 수 있으므로 '엘리먼트 단위'로 관찰한다.
  // (한 곳이 보이면 renderThumb(id)로 캐시 → 나머지 중복 카드도 같은 썸네일을 즉시 공유)
  const thumbObserver =
    typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (!e.isIntersecting) continue
              const id = (e.target as HTMLElement).dataset.moduleId
              if (id) renderThumb(id)
              thumbObserver?.unobserve(e.target)
            }
          },
          { rootMargin: '200px' },
        )
      : null

  const observeCard = (el: Element | null, id: string) => {
    // el이 실제 DOM Element일 때만 관찰(방어) — 컴포넌트 ref가 비Element를 넘기면 observe가 throw해
    // 렌더 트리 전체가 크래시했었다. Element가 아니면 건너뛴다.
    if (!(el instanceof Element)) return
    if (thumbObserver) thumbObserver.observe(el)
    else renderThumb(id) // 옵저버 미지원 폴백
  }

  // 여러 썸네일을 미리 렌더(캐시)한다 — 카테고리 아코디언에서 카드 높이를 미리 확정해
  // 탭 이동 시 스크롤 위치가 흔들리지 않도록 한다.
  const prerenderThumbs = (ids: string[]): void => {
    for (const id of ids) renderThumb(id)
  }

  // 카드가 표시할 iframe 높이(미스케일) — 측정 전에는 폴백 높이
  const thumbIframeHeight = (id: string): number => thumbHeights[id] || THUMB_FALLBACK_H
  // .module-thumb는 box-sizing:border-box → 축소 높이 + 상하 padding
  const thumbBoxHeight = (id: string): number =>
    Math.round(thumbIframeHeight(id) * THUMB_SCALE) + THUMB_PADDING * 2

  return {
    thumbs,
    observeCard,
    prerenderThumbs,
    thumbHeights,
    measureThumbHeight,
    thumbIframeHeight,
    thumbBoxHeight,
  }
}
