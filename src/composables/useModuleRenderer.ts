import { ref, watch, onMounted, computed } from 'vue'
import type { ModuleInstance, ModuleMetadata } from '@/types'
import { useModuleStore } from '@/stores/moduleStore'
import { applyStylesToHtml } from '@/utils/htmlUtils'
import {
  replaceSectionTitleContent,
  replaceModule04Content,
  replaceModule02Content,
  replaceModule05Content,
  replaceDefaultTemplate,
} from '@/utils/moduleContentReplacer'

/**
 * 모듈 렌더링 로직을 캡슐화한 composable
 */
export function useModuleRenderer(moduleId: string) {
  const moduleStore = useModuleStore()
  const renderedHtml = ref('')
  const moduleMetadata = ref<ModuleMetadata | null>(null)

  // 🐛 핵심 수정: store에서 직접 현재 모듈을 가져와 반응성 보장
  const currentModule = computed(() => {
    const found = moduleStore.modules.find(m => m.id === moduleId)
    console.log('[useModuleRenderer computed] moduleId:', moduleId, 'found:', !!found)
    if (found) {
      console.log('[useModuleRenderer computed] properties:', found.properties)
      console.log('[useModuleRenderer computed] tableRows:', found.properties.tableRows)
    }
    return found
  })

  /**
   * 모듈별 콘텐츠 교체
   */
  const replaceModuleContent = async (
    html: string,
    moduleInstance: ModuleInstance
  ): Promise<string> => {
    const { moduleId: mId, properties } = moduleInstance

    switch (mId) {
      case 'SectionTitle':
        return replaceSectionTitleContent(html, properties)

      case 'Module04':
        return replaceModule04Content(html, properties, moduleStore.insertAdditionalContents)

      case 'Module02':
        return replaceModule02Content(html, properties, moduleStore.insertAdditionalContents)

      case 'Module05':
        return replaceModule05Content(html, properties, moduleStore.insertAdditionalContents)

      default:
        return replaceDefaultTemplate(html, properties)
    }
  }

  /**
   * 모듈 HTML 로드 및 렌더링
   */
  const loadModuleHtml = async (): Promise<void> => {
    const module = currentModule.value
    if (!module) {
      console.warn('[useModuleRenderer] 모듈을 찾을 수 없음:', moduleId)
      return
    }

    console.log('[useModuleRenderer] loadModuleHtml 시작 - moduleId:', module.moduleId)
    try {
      // 모듈 메타데이터 설정
      if (moduleStore.availableModules.length === 0) {
        await moduleStore.loadAvailableModules()
      }
      moduleMetadata.value =
        moduleStore.availableModules.find((m) => m.id === module.moduleId) || null

      // HTML 파일 로드
      const response = await fetch(`/modules/${module.moduleId}.html`)
      let html = await response.text()

      console.log('[useModuleRenderer] 콘텐츠 교체 시작')
      console.log('[useModuleRenderer] module.properties:', module.properties)
      console.log('[useModuleRenderer] tableRows:', module.properties.tableRows)

      // 콘텐츠 교체
      html = await replaceModuleContent(html, module)

      // 스타일 적용
      if (module.styles && Object.keys(module.styles).length > 0) {
        html = applyStylesToHtml(html, module.styles as Record<string, unknown>)
      }

      renderedHtml.value = html
      console.log('[useModuleRenderer] 렌더링 완료')
    } catch (error) {
      console.error('Failed to load module HTML:', error)
      renderedHtml.value = `<div class="p-4 text-center text-red-500">모듈을 로드할 수 없습니다</div>`
    }
  }

  // 🐛 핵심 수정: computed를 watch하여 모듈 변경 즉시 감지
  watch(
    currentModule,
    (newModule) => {
      if (newModule) {
        console.log('[useModuleRenderer watch] currentModule 변경 감지 - 재렌더링')
        loadModuleHtml()
      }
    },
    { deep: true, immediate: false }  // deep: true로 properties 변경 감지
  )

  onMounted(() => {
    loadModuleHtml()
  })

  return {
    renderedHtml,
    moduleMetadata,
  }
}
