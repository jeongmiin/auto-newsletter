import { reactive } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'

/**
 * 모듈 카드 상시 썸네일(iframe) 렌더 — ModulePanel.vue와 CategoryModulePanel.vue가 공유.
 * IntersectionObserver로 화면에 보이는 카드만 지연 렌더하고, 결과는 모듈 스코프 캐시(previewCache)에
 * 담아 모든 패널 인스턴스가 재사용한다.
 */

const MODULE_WIDTH = 680 // 모듈 템플릿 기준 폭(px)
const previewCache = new Map<string, string>() // module.id → iframe srcdoc (인스턴스 간 공유)

const buildPreviewDoc = (content: string): string =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank">` +
  `<style>html,body{margin:0;padding:0;background:#fff;overflow:hidden;}*{box-sizing:border-box;}</style></head>` +
  `<body><div style="width:${MODULE_WIDTH}px;max-width:${MODULE_WIDTH}px;margin:0;">${content}</div></body></html>`

export function useModuleThumbnails() {
  const moduleStore = useModuleStore()
  const thumbs = reactive<Record<string, string>>({})

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

  // IntersectionObserver로 보이는 카드만 지연 렌더
  const cardEls = new Map<string, Element>()
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
    const prev = cardEls.get(id)
    if (prev && thumbObserver) thumbObserver.unobserve(prev)
    if (!el) {
      cardEls.delete(id)
      return
    }
    cardEls.set(id, el)
    if (thumbObserver) thumbObserver.observe(el)
    else renderThumb(id) // 옵저버 미지원 폴백
  }

  return { thumbs, observeCard }
}
