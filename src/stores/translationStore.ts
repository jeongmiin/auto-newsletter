/**
 * 다국어 번역 상태 — AI 도구 패널(입력)과 캔버스 옆 번역 결과 패널(확인·수정)이 함께 쓴다.
 *
 * 컴포넌트에 두지 않는 이유: 레일 메뉴를 옮기면 좌측 패널이 통째로 내려가 번역 결과가 사라진다.
 * 결과는 Azure 글자 수를 쓰고 받은 것이라, 다른 메뉴에 다녀와도 그대로 남아 있어야 한다.
 * (새로고침하면 작업물과 함께 사라진다 — 작업물 자체가 메모리에만 있다)
 */
import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useEditorStore } from '@/stores/editorStore'
import { useModuleStore } from '@/stores/moduleStore'
import { getHistoryInstance } from '@/composables/useHistory'
import {
  applyTranslationChanges,
  collectTranslationUnits,
  type TranslationChange,
  type TranslationLanguage,
} from '@/utils/newsletterTranslation'
import { isTranslationEnabled, translateUnits, TranslationError } from '@/utils/azureTranslator'
import type { FontLanguage } from '@/utils/fontFamily'

// PrimeVue Select의 options가 readonly 배열을 받지 않아 일반 배열로 둔다 — 고치지 말 것
export const TRANSLATION_LANGUAGES: Array<{ value: TranslationLanguage; label: string }> = [
  { value: 'en', label: '영어' },
  { value: 'ja', label: '일본어' },
  { value: 'zh-Hans', label: '중국어(간체)' },
]

const TARGET_LANGUAGE_CODE: Record<TranslationLanguage, string> = {
  en: 'en',
  ja: 'jp',
  'zh-Hans': 'ch',
}

const FONT_LANGUAGE_BY_TARGET: Record<TranslationLanguage, FontLanguage> = {
  en: 'default',
  ja: 'ja',
  'zh-Hans': 'zh',
}

export interface TranslationPreviewGroup {
  id: string
  moduleName: string
  items: TranslationChange[]
}

export const useTranslationStore = defineStore('translation', () => {
  const moduleStore = useModuleStore()
  const editorStore = useEditorStore()

  /** 프록시 주소가 설정돼 있어 번역을 부를 수 있는지 (빌드 시점에 정해진다) */
  const enabled = isTranslationEnabled()

  /** AI 도구 패널에서 '다국어 번역' 카드를 펼쳐 둔 상태 — 메뉴를 옮겨도 유지 */
  const panelOpen = ref(false)
  const targetLanguage = ref<TranslationLanguage>('en')
  const translating = ref(false)
  const error = ref('')
  /** 확인·수정 중인 번역 결과. 비어 있으면 결과 패널이 뜨지 않는다. */
  const preview = ref<TranslationChange[]>([])
  let controller: AbortController | null = null

  /**
   * 캔버스 옆 결과 도크를 탭으로 접어 둔 상태.
   * AI 도구 메뉴에 다시 들어오면 펼쳐진 채로 시작한다 — 결과가 있는데 접힌 채 잊히지 않도록.
   */
  const dockCollapsed = ref(false)
  const toggleDock = (): void => {
    dockCollapsed.value = !dockCollapsed.value
  }
  watch(
    () => editorStore.activeMenu,
    (menu) => {
      if (menu === 'ai') dockCollapsed.value = false
    },
  )

  const targetLanguageLabel = computed(
    () => TRANSLATION_LANGUAGES.find((l) => l.value === targetLanguage.value)?.label ?? '',
  )
  /** 접힌 도크 탭에 보여줄 짧은 언어 표시 — 자리가 좁아 두 글자로 */
  const targetLanguageCode = computed(() => TARGET_LANGUAGE_CODE[targetLanguage.value])

  // 캔버스 전체가 대상이다. 문장은 태그를 뺀 텍스트 노드 단위라, 글자 수가 곧 Azure에 보내는 양이다.
  const units = computed(() =>
    collectTranslationUnits(moduleStore.modules, moduleStore.availableModules),
  )
  const characterCount = computed(() =>
    units.value.reduce((sum, unit) => sum + unit.source.length, 0),
  )

  /** 결과는 모듈 단위로 묶어 보여준다 — 같은 모듈의 제목·본문이 한 카드에 모이도록 */
  const previewGroups = computed<TranslationPreviewGroup[]>(() => {
    const groups = new Map<string, TranslationPreviewGroup>()
    for (const change of preview.value) {
      const group = groups.get(change.moduleInstanceId)
      if (group) group.items.push(change)
      else {
        groups.set(change.moduleInstanceId, {
          id: change.moduleInstanceId,
          moduleName: change.moduleName,
          items: [change],
        })
      }
    }
    return [...groups.values()]
  })

  /** 언어를 바꾸면 이전 언어의 결과는 뜻이 없어 비운다 */
  const setTargetLanguage = (language: TranslationLanguage): void => {
    if (language === targetLanguage.value) return
    targetLanguage.value = language
    clear()
  }

  const clear = (): void => {
    preview.value = []
    error.value = ''
  }

  const request = async (): Promise<void> => {
    if (translating.value) return
    clear()
    // 새 결과는 펼쳐진 도크에서 바로 보이게
    dockCollapsed.value = false
    // 문장 수집에는 모듈 메타데이터(어떤 속성이 번역 대상인지)가 필요하다
    if (!moduleStore.availableModules.length) await moduleStore.loadAvailableModules()
    const targets = units.value
    if (!targets.length) {
      error.value = '캔버스에서 번역할 한국어 문장을 찾지 못했어요.'
      return
    }

    translating.value = true
    controller = new AbortController()
    try {
      preview.value = await translateUnits(targets, targetLanguage.value, controller.signal)
    } catch (error_) {
      if (error_ instanceof DOMException && error_.name === 'AbortError') return
      error.value =
        error_ instanceof TranslationError || error_ instanceof Error
          ? error_.message
          : '번역 중 문제가 생겼어요. 다시 시도해 주세요.'
    } finally {
      translating.value = false
      controller = null
    }
  }

  const cancel = (): void => controller?.abort()

  /** 확인한 번역문을 캔버스에 넣는다. 적용한 문장 수를 돌려준다(알림용). */
  const apply = async (): Promise<number> => {
    if (!preview.value.length) return 0
    const history = getHistoryInstance()
    // 적용 전과 적용 후를 각각 남겨 Ctrl+Z 한 번으로 번역 전 상태가 복원되게 한다.
    history.saveState()
    const next = applyTranslationChanges(moduleStore.modules, preview.value)
    // 번역한 언어에 맞는 글꼴 묶음으로 바꾼다(전체 설정의 '폰트'). 영어는 기본(한국어·영어) 묶음이다.
    const fontLanguage = FONT_LANGUAGE_BY_TARGET[targetLanguage.value]
    await history.runBulk(() => {
      moduleStore.replaceModulesForBulkEdit(next)
      editorStore.updateWrapSettings({ fontLanguage })
    })
    history.saveState()
    const count = preview.value.length
    clear()
    return count
  }

  return {
    enabled,
    panelOpen,
    targetLanguage,
    targetLanguageLabel,
    targetLanguageCode,
    translating,
    error,
    preview,
    previewGroups,
    units,
    characterCount,
    dockCollapsed,
    toggleDock,
    setTargetLanguage,
    request,
    cancel,
    clear,
    apply,
  }
})
