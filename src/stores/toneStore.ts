/**
 * 어투 변환 상태 — AI 도구 패널의 '톤 변환' 화면(어투 고르기 · 바뀐 글 확인·고르기)이 쓴다.
 *
 * 다 쓴 글의 어투만 바꾼다(격식 있게 · 친근하게 · 간결하게). 값 모으기·보내기·적용은 번역과 같은 길을 쓰고
 * (뼈대 HTML, applyTranslationChanges — 굵게·색상·링크가 그대로 남는다), 화면은 맞춤법 검사처럼
 * 카드마다 적용 여부를 고른다. 컴포넌트에 두지 않는 이유도 둘과 같다 — 메뉴를 옮겨도 결과가 남아야 한다.
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useModuleStore } from '@/stores/moduleStore'
import { getHistoryInstance } from '@/composables/useHistory'
import { applyTranslationChanges, collectTranslationUnits } from '@/utils/newsletterTranslation'
import { isToneEnabled, requestTone, ToneError, type ToneChange, type ToneKey } from '@/utils/geminiToner'
import { track } from '@/analytics/umami'

export const useToneStore = defineStore('tone', () => {
  const moduleStore = useModuleStore()

  /** 프록시 주소가 설정돼 있어 변환을 부를 수 있는지 (빌드 시점에 정해진다) */
  const enabled = isToneEnabled()

  /** AI 도구 패널에서 '톤 변환' 카드를 펼쳐 둔 상태 — 메뉴를 옮겨도 유지 */
  const panelOpen = ref(false)
  const tone = ref<ToneKey>('formal')
  const converting = ref(false)
  const error = ref('')
  /** 바뀐 글 목록. 비어 있으면 결과 화면이 아니다 */
  const changes = ref<ToneChange[]>([])
  /** 변환을 마쳤는데 바뀐 글이 없었다 — '바꿀 곳이 없어요' 화면을 띄운다 */
  const unchanged = ref(false)
  /** 결과 화면에서 눌러 둔 카드 */
  const selectedUnitId = ref<string | null>(null)
  let controller: AbortController | null = null

  // 캔버스 전체가 대상이다. 번역과 달리 **글자가 든 값은 다** 모은다 — 번역한 영·일·중 뉴스레터도 다듬는다(맞춤법 검사와 같다).
  const units = computed(() =>
    collectTranslationUnits(moduleStore.modules, moduleStore.availableModules, { letters: 'any' }),
  )
  const characterCount = computed(() => units.value.reduce((sum, unit) => sum + unit.source.length, 0))
  const hasResult = computed(() => changes.value.length > 0)
  const acceptedCount = computed(() => changes.value.filter((item) => item.accepted).length)

  const clear = (): void => {
    changes.value = []
    unchanged.value = false
    selectedUnitId.value = null
    error.value = ''
  }

  /** 어투를 바꾸면 이전 어투의 결과는 뜻이 없어 비운다 */
  const setTone = (next: ToneKey): void => {
    if (next === tone.value) return
    tone.value = next
    clear()
  }

  // 다른 뉴스레터로 넘어가면(템플릿 선택·빈 템플릿·파일 열기) 결과는 앞 글에 대한 것이라 뜻이 없다 — 비우고 메뉴로.
  // ⚠ loadTemplate 도 따로 본다 — 안에서 clearAll 을 부르지만 스토어 밖에서 부른 게 아니라 $onAction 에 안 잡힌다.
  moduleStore.$onAction(({ name }) => {
    if (name !== 'clearAll' && name !== 'loadTemplate') return
    cancel()
    clear()
    panelOpen.value = false
  })

  const request = async (): Promise<void> => {
    if (converting.value) return
    clear()
    if (!moduleStore.availableModules.length) await moduleStore.loadAvailableModules()
    const targets = units.value
    if (!targets.length) {
      error.value = '캔버스에서 바꿀 문장을 찾지 못했어요.'
      return
    }

    converting.value = true
    controller = new AbortController()
    try {
      changes.value = await requestTone(targets, tone.value, controller.signal)
      unchanged.value = changes.value.length === 0
    } catch (error_) {
      if (error_ instanceof DOMException && error_.name === 'AbortError') return
      error.value = error_ instanceof ToneError ? error_.message : '어투를 바꾸는 중 문제가 생겼어요. 다시 시도해 주세요.'
    } finally {
      converting.value = false
      controller = null
    }
  }

  const cancel = (): void => controller?.abort()

  /** 고른 카드의 글을 캔버스에 넣는다. 실제로 바꾼 수를 돌려준다(알림용). */
  const apply = async (): Promise<number> => {
    const accepted = changes.value.filter((item) => item.accepted)
    if (!accepted.length) return 0
    const history = getHistoryInstance()
    // 적용 전 상태를 남겨 Ctrl+Z 한 번으로 되돌아가게 한다(적용 후 저장은 runBulk 가 끝나며 한 번 된다).
    history.saveState()
    const next = applyTranslationChanges(moduleStore.modules, accepted)
    await history.runBulk(() => {
      moduleStore.replaceModulesForBulkEdit(next)
    })
    // 실제로 캔버스에 넣은 횟수만 — 어투별 사용량이 무료 한도 소모(한 편 = 요청 2~3회)와 이어진다
    track('tone_apply', { tone: tone.value, count: accepted.length })
    clear()
    return accepted.length
  }

  return {
    enabled,
    panelOpen,
    tone,
    setTone,
    converting,
    error,
    changes,
    unchanged,
    selectedUnitId,
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
