import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import type { ModuleInstance, ModuleMetadata } from '@/types'
import { useModuleStore } from '@/stores/moduleStore'
import { applyStylesToHtml } from '@/utils/htmlUtils'
import {
  replaceModuleBasicHeaderContent,
  replaceModuleDescTextContent,
  replaceModuleImgContent,
  replaceModuleOneButtonContent,
  replaceModuleTwoButtonContent,
  replaceSectionTitleContent,
  replaceModule04Content,
  replaceModule02Content,
  replaceModule053Content,
  replaceModule011Content,
  replaceModule012Content,
  replaceModule051Content,
  replaceModule052Content,
  replaceModule06Content,
  replaceModule07Content,
  replaceModule07ReverseContent,
  replaceModuleFooterContent,
  replaceModule10Content,
  replaceModule101Content,
  replaceModuleSubTitleContent,
  replaceModuleTableContent,
  replaceDefaultTemplate,
} from '@/utils/moduleContentReplacer'

/**
 * 모듈 렌더링 로직을 캡슐화한 composable
 */
export function useModuleRenderer(moduleId: string) {
  const moduleStore = useModuleStore()
  const renderedHtml = ref('')
  const moduleMetadata = ref<ModuleMetadata | null>(null)
  const isLoading = ref(true)

  // 🐛 핵심 수정: store에서 직접 현재 모듈을 가져와 반응성 보장
  const currentModule = computed(() => {
    const found = moduleStore.modules.find(m => m.id === moduleId)
    if (found) {
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
      case 'ModuleBasicHeader':
        return replaceModuleBasicHeaderContent(html, properties)

      case 'ModuleDescText':
        return replaceModuleDescTextContent(html, properties)

      case 'ModuleImg':
        return replaceModuleImgContent(html, properties)

      case 'ModuleOneButton':
        return replaceModuleOneButtonContent(html, properties)

      case 'ModuleTwoButton':
        return replaceModuleTwoButtonContent(html, properties)

      case 'SectionTitle':
        return replaceSectionTitleContent(html, properties)

      case 'Module04':
        return replaceModule04Content(html, properties, moduleStore.insertAdditionalContents)

      case 'Module02':
        return replaceModule02Content(html, properties, moduleStore.insertAdditionalContents)

      case 'Module05':
        return replaceModule052Content(html, properties)

      case 'Module01-1':
        return replaceModule011Content(html, properties)

      case 'Module01-2':
        return replaceModule012Content(html, properties)

      case 'Module05-1':
        return replaceModule051Content(html, properties)

      case 'Module05-3':
        return replaceModule053Content(html, properties)

      case 'Module06':
        return replaceModule06Content(html, properties)

      case 'Module07':
        return replaceModule07Content(html, properties)

      case 'Module07_reverse':
        return replaceModule07ReverseContent(html, properties)

      case 'ModuleFooter':
        return replaceModuleFooterContent(html, properties)

      case 'Module10':
        return replaceModule10Content(html, properties)

      case 'Module10-1':
        return replaceModule101Content(html, properties)

      case 'ModuleSubTitle':
        return replaceModuleSubTitleContent(html, properties)

      case 'ModuleTable':
        return replaceModuleTableContent(html, properties)

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

    isLoading.value = true

    try {
      // 모듈 메타데이터 설정
      if (moduleStore.availableModules.length === 0) {
        await moduleStore.loadAvailableModules()
      }
      moduleMetadata.value =
        moduleStore.availableModules.find((m) => m.id === module.moduleId) || null

      // HTML 파일 로드 (BASE_URL 경로 고려)
      const basePath = import.meta.env.BASE_URL || '/'
      const htmlPath = `${basePath}modules/${module.moduleId}.html`.replace(/\/+/g, '/')

      const response = await fetch(htmlPath)

      if (!response.ok) {
        console.error('[useModuleRenderer] ❌ HTML 로드 실패:', {
          htmlPath,
          status: response.status,
          statusText: response.statusText
        })
        throw new Error(`HTTP ${response.status}: ${htmlPath}`)
      }

      let html = await response.text()


      // 콘텐츠 교체
      html = await replaceModuleContent(html, module)

      // 스타일 적용
      if (module.styles && Object.keys(module.styles).length > 0) {
        html = applyStylesToHtml(html, module.styles as Record<string, unknown>)
      }

      renderedHtml.value = html
      isLoading.value = false
    } catch (error) {
      isLoading.value = false
      console.error('[useModuleRenderer] ❌ 모듈 로드 실패:', error)
      const basePath = import.meta.env.BASE_URL || '/'
      const expectedPath = `${basePath}modules/${module.moduleId}.html`.replace(/\/+/g, '/')
      renderedHtml.value = `
        <div class="p-6 text-center bg-red-50 border-2 border-red-300 rounded-lg">
          <div class="text-red-600 font-bold text-lg mb-2">❌ 모듈을 로드할 수 없습니다</div>
          <div class="text-sm text-gray-600 mb-2">모듈 ID: ${module.moduleId}</div>
          <div class="text-xs text-gray-500 mb-2">경로: ${expectedPath}</div>
          <div class="text-xs text-red-500">${error instanceof Error ? error.message : String(error)}</div>
          <div class="mt-4 text-xs text-gray-400">
            💡 개발자 도구(F12) → Console/Network 탭에서 상세 정보를 확인하세요
          </div>
        </div>
      `
    }
  }

  // 디바운스 타이머
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  const DEBOUNCE_DELAY = 300 // 300ms 후에 렌더링

  /**
   * 디바운스된 모듈 HTML 로드
   * 연속적인 입력 시 마지막 입력 후 일정 시간이 지나면 렌더링
   */
  const debouncedLoadModuleHtml = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
      loadModuleHtml()
    }, DEBOUNCE_DELAY)
  }

  // 🐛 핵심 수정: computed를 watch하여 모듈 변경 감지 (디바운스 적용)
  watch(
    currentModule,
    (newModule) => {
      if (newModule) {
        debouncedLoadModuleHtml()
      }
    },
    { deep: true, immediate: false }  // deep: true로 properties 변경 감지
  )

  onMounted(() => {
    loadModuleHtml()
  })

  // 컴포넌트 언마운트 시 타이머 정리
  onUnmounted(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
  })

  return {
    renderedHtml,
    moduleMetadata,
    isLoading,
  }
}
