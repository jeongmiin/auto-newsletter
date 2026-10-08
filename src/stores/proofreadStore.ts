/**
 * 맞춤법 검사 상태 — AI 도구 패널의 맞춤법 검사 화면(검사하기 · 고칠 곳 고르기)이 쓴다.
 *
 * 컴포넌트에 두지 않는 이유는 번역(translationStore)과 같다: 레일 메뉴를 옮기면 좌측 패널이
 * 통째로 내려가 결과가 사라진다. 결과는 하루 횟수가 정해진 무료 한도를 쓰고 받은 것이라,
 * 다른 메뉴에 다녀와도 그대로 남아 있어야 한다.
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useModuleStore } from '@/stores/moduleStore'
import { getHistoryInstance } from '@/composables/useHistory'
import { collectTranslationUnits } from '@/utils/newsletterTranslation'
import {
  applyProofreadSuggestions,
  buildProofreadItems,
  toSuggestions,
  type ProofreadSuggestion,
} from '@/utils/newsletterProofread'
import { isProofreadEnabled, ProofreadError, requestProofread } from '@/utils/geminiProofreader'

export const useProofreadStore = defineStore('proofread', () => {
  const moduleStore = useModuleStore()

  /** 프록시 주소가 설정돼 있어 검사를 부를 수 있는지 (빌드 시점에 정해진다) */
  const enabled = isProofreadEnabled()

  /** AI 도구 패널에서 '맞춤법 검사' 카드를 펼쳐 둔 상태 — 메뉴를 옮겨도 유지 */
  const panelOpen = ref(false)
  const checking = ref(false)
  const error = ref('')
  /** 고칠 곳 목록. 비어 있으면 결과 화면이 아니다. */
  const suggestions = ref<ProofreadSuggestion[]>([])
  /** 검사를 마쳤는데 고칠 곳이 없었다 — '찾지 못했어요' 화면을 띄운다 */
  const clean = ref(false)
  /** 결과 화면에서 눌러 둔 카드 */
  const selectedId = ref<string | null>(null)
  let controller: AbortController | null = null

  // 캔버스 전체가 대상이다. 글을 모으는 규칙은 번역과 같다(편집 필드 하나 = 값 하나).
  const units = computed(() =>
    collectTranslationUnits(moduleStore.modules, moduleStore.availableModules),
  )
  /** 실제로 보내는 글자 수 — 같은 글은 한 번만 보낸다 */
  const characterCount = computed(() =>
    buildProofreadItems(units.value).items.reduce((sum, item) => sum + item.text.length, 0),
  )
  const hasResult = computed(() => suggestions.value.length > 0)
  const acceptedCount = computed(() => suggestions.value.filter((item) => item.accepted).length)

  const clear = (): void => {
    suggestions.value = []
    clean.value = false
    selectedId.value = null
    error.value = ''
  }

  // 다른 뉴스레터로 넘어가면(템플릿 선택·빈 템플릿·파일 열기) 결과는 앞 글에 대한 것이라 뜻이 없다.
  // 비우고 도구 메뉴로 돌아간다 — 안 그러면 다음 템플릿에서 앞 템플릿의 카드가 보인다.
  // ⚠ loadTemplate 도 따로 본다 — 안에서 clearAll 을 부르지만 스토어 밖에서 부른 게 아니라 $onAction 에 안 잡힌다.
  moduleStore.$onAction(({ name }) => {
    if (name !== 'clearAll' && name !== 'loadTemplate') return
    cancel()
    clear()
    panelOpen.value = false
  })

  const request = async (): Promise<void> => {
    if (checking.value) return
    clear()
    // 값 수집에는 모듈 메타데이터(어떤 속성이 글인지)가 필요하다
    if (!moduleStore.availableModules.length) await moduleStore.loadAvailableModules()
    const { items, unitsByItemId } = buildProofreadItems(units.value)
    if (!items.length) {
      error.value = '캔버스에서 검사할 한국어 문장을 찾지 못했어요.'
      return
    }

    checking.value = true
    controller = new AbortController()
    try {
      const corrections = await requestProofread(items, controller.signal)
      suggestions.value = toSuggestions(corrections, unitsByItemId)
      clean.value = suggestions.value.length === 0
    } catch (error_) {
      if (error_ instanceof DOMException && error_.name === 'AbortError') return
      error.value =
        error_ instanceof ProofreadError
          ? error_.message
          : '검사 중 문제가 생겼어요. 다시 시도해 주세요.'
    } finally {
      checking.value = false
      controller = null
    }
  }

  const cancel = (): void => controller?.abort()

  /** 고른 수정안을 캔버스에 넣는다. 실제로 바꾼 수를 돌려준다(알림용). */
  const apply = async (): Promise<number> => {
    const accepted = suggestions.value.filter((item) => item.accepted)
    if (!accepted.length) return 0
    const { modules: next, applied } = applyProofreadSuggestions(moduleStore.modules, accepted)
    if (!applied) {
      // 검사한 뒤 글을 고쳐 구절이 사라진 경우 — 아무것도 바꾸지 않고 다시 검사하게 한다
      error.value = '검사한 뒤 내용이 바뀌어 고칠 곳을 찾지 못했어요. 다시 검사해 주세요.'
      return 0
    }
    const history = getHistoryInstance()
    // 적용 전 상태를 남겨 Ctrl+Z 한 번으로 되돌아가게 한다.
    // ⚠ 적용 후에는 따로 저장하지 않는다 — runBulk가 끝나면 멈춰 둔 감시가 되살아나 바뀐 상태를
    //   한 번 저장한다. 여기서 또 저장하면 같은 상태가 두 번 쌓여 Ctrl+Z 첫 번째가 헛돈다.
    history.saveState()
    await history.runBulk(() => {
      moduleStore.replaceModulesForBulkEdit(next)
    })
    clear()
    return applied
  }

  return {
    enabled,
    panelOpen,
    checking,
    error,
    suggestions,
    clean,
    selectedId,
    units,
    characterCount,
    hasResult,
    acceptedCount,
    request,
    cancel,
    clear,
    apply,
  }
})
