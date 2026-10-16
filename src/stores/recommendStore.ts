/**
 * 모듈 조합 추천 상태 — AI 도구 패널의 '만들기: 모듈 조합 추천' 화면이 쓴다.
 *
 * 빈 템플릿에서 시작할 때 "무엇을 어떤 순서로 놓지?"를 덜어 준다: 분야·목적·행사 정보를 보내면
 * 우리 빌더의 조립형 모듈만으로 짠 구성안 2~3개가 온다. 하나를 고르면 헤더 → 본문 → 푸터 순으로
 * 캔버스에 깔고 초안 문구까지 채운다. 그 뒤는 평소처럼 편집한다.
 *
 * 컴포넌트에 두지 않는 이유는 번역·맞춤법 검사와 같다: 레일 메뉴를 옮기면 좌측 패널이 통째로
 * 내려가 입력과 결과가 사라진다. 결과는 무료 한도를 쓰고 받은 것이라 남아 있어야 한다.
 */
import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { getHistoryInstance } from '@/composables/useHistory'
import { isRecommendEnabled, RecommendError, requestRecommend } from '@/utils/geminiRecommender'
import {
  planMemberFill,
  RECOMMEND_MODULE_LABELS,
  stepsOf,
  type RecommendOption,
} from '@/utils/newsletterRecommend'
import {
  defaultFieldForTeam,
  NEWSLETTER_PURPOSES,
  type ExhibitionField,
  type NewsletterPurpose,
} from '@/constants/exhibitionFields'
import { COMPOSED_GROUP_SIDE_PADDING } from '@/constants/composedGroupPadding'
import type { ModuleInstance } from '@/types/module'
import { track } from '@/analytics/umami'

/** 캔버스에 이미 모듈이 있을 때 — 비우고 시작할지, 아래에 이어 붙일지 */
export type RecommendApplyMode = 'replace' | 'append'

export const useRecommendStore = defineStore('recommend', () => {
  const moduleStore = useModuleStore()
  const editorStore = useEditorStore()

  /** 프록시 주소가 설정돼 있어 추천을 부를 수 있는지 (빌드 시점에 정해진다) */
  const enabled = isRecommendEnabled()

  /** AI 도구 패널에서 이 카드를 펼쳐 둔 상태 — 메뉴를 옮겨도 유지 */
  const panelOpen = ref(false)

  // ── 입력 ──
  /** 전시 분야 — 팀에서 자동으로 채우고, 담당자가 바꾸면 그 뒤로는 손대지 않는다 */
  const field = ref<ExhibitionField | null>(defaultFieldForTeam(editorStore.currentTeamId))
  let fieldTouched = false
  watch(
    () => editorStore.currentTeamId,
    (teamId) => {
      if (!fieldTouched) field.value = defaultFieldForTeam(teamId)
    },
  )
  const setField = (next: ExhibitionField): void => {
    field.value = next
    fieldTouched = true
  }
  const purpose = ref<NewsletterPurpose | null>(null)
  const brief = ref('')
  const canRequest = computed(() => !!purpose.value && brief.value.trim().length > 0)

  // ── 결과 ──
  const loading = ref(false)
  const error = ref('')
  const options = ref<RecommendOption[]>([])
  const selectedIndex = ref(0)
  const hasResult = computed(() => options.value.length > 0)
  const selected = computed(() => options.value[selectedIndex.value] ?? null)
  const mode = ref<RecommendApplyMode>('replace')
  let controller: AbortController | null = null
  /** apply() 가 캔버스를 비우는 중 — 아래 $onAction 이 자기 결과를 지우지 않게 */
  let applying = false

  const clear = (): void => {
    options.value = []
    selectedIndex.value = 0
    error.value = ''
  }

  // 다른 뉴스레터로 넘어가면(템플릿 선택·빈 템플릿·파일 열기) 받은 구성안은 뜻이 없다 — 비우고 메뉴로 돌아간다.
  // 입력(분야·목적·행사 정보)은 남겨 둔다: 같은 행사로 다시 받는 경우가 많다.
  // ⚠ loadTemplate 도 따로 본다 — 안에서 clearAll 을 부르지만 스토어 밖에서 부른 게 아니라 $onAction 에 안 잡힌다.
  moduleStore.$onAction(({ name }) => {
    if (applying || (name !== 'clearAll' && name !== 'loadTemplate')) return
    cancel()
    clear()
    panelOpen.value = false
  })

  const request = async (): Promise<void> => {
    if (loading.value || !canRequest.value) return
    clear()
    loading.value = true
    controller = new AbortController()
    try {
      options.value = await requestRecommend(
        { field: field.value ?? '', purpose: purpose.value!, brief: brief.value.trim() },
        controller.signal,
      )
      if (!options.value.length) error.value = '쓸 만한 구성안을 받지 못했어요. 행사 정보를 조금 더 적고 다시 받아 보세요.'
    } catch (error_) {
      if (error_ instanceof DOMException && error_.name === 'AbortError') return
      error.value =
        error_ instanceof RecommendError ? error_.message : '추천을 받는 중 문제가 생겼어요. 다시 시도해 주세요.'
    } finally {
      loading.value = false
      controller = null
    }
  }

  const cancel = (): void => controller?.abort()

  /** 조립 함수 키의 보여 줄 이름 — 모듈 메타데이터의 이름을 먼저, 없으면 고정 표 */
  const moduleLabel = (key: string): string =>
    moduleStore.availableModules.find((m) => m.id === key)?.name ?? RECOMMEND_MODULE_LABELS[key] ?? key

  /**
   * 고른 구성안을 캔버스에 깐다. 놓은 모듈(그룹) 수를 돌려준다(알림용). 0이면 아무것도 바꾸지 않았다.
   *
   * 헤더·본문·푸터를 조립 함수로 차례로 만들고(각각 맨 끝에 — 선택을 비워 두면 끝에 붙는다),
   * 그룹 멤버를 훑어 초안 문구를 넣은 모듈 배열을 한 번에 바꿔 넣는다(replaceModulesForBulkEdit).
   * 적용 전 상태를 남겨 Ctrl+Z 한 번으로 돌아간다 — 비우고 시작한 경우도 되살아난다.
   */
  const apply = async (): Promise<number> => {
    const option = selected.value
    if (!option) return 0
    if (!moduleStore.availableModules.length) await moduleStore.loadAvailableModules()
    const history = getHistoryInstance()
    history.saveState()
    applying = true
    let placed = 0
    try {
      await history.runBulk(() => {
        if (mode.value === 'replace') moduleStore.clearAll()
        const fillById = new Map<string, Record<string, string>>()
        for (const step of stepsOf(option)) {
          const build = moduleStore.composedBuilderMap[step.module]
          if (!build) continue
          moduleStore.clearSelection()
          const groupId = build()
          // 조립 함수는 그룹을 만들고 첫 멤버를 고른다. 모듈 01번처럼 그룹 없이 하나만 넣는 함수는 그 모듈을 고른다
          const members: ModuleInstance[] = groupId
            ? moduleStore.modules.filter((m) => m.groupId === groupId)
            : moduleStore.selectedModule
              ? [moduleStore.selectedModule]
              : []
          if (groupId) {
            moduleStore.setGroupName(groupId, moduleLabel(step.module))
            // 모듈 패널에서 넣을 때와 같은 좌·우 안쪽 여백 — 추천으로 넣어도 모양이 같아야 한다
            const sidePadding = COMPOSED_GROUP_SIDE_PADDING[step.module]
            if (sidePadding) moduleStore.setGroupSidePadding(groupId, sidePadding)
          }
          for (const fill of planMemberFill(members, step, step.module)) {
            fillById.set(members[fill.index].id, fill.props)
          }
          placed += 1
        }
        if (fillById.size) {
          moduleStore.replaceModulesForBulkEdit(
            moduleStore.modules.map((m) =>
              fillById.has(m.id) ? { ...m, properties: { ...m.properties, ...fillById.get(m.id) } } : m,
            ),
          )
        }
        moduleStore.clearSelection()
      })
    } finally {
      applying = false
    }
    if (placed) {
      // 구성을 **실제로 깐** 횟수 — 받기만 하고 안 쓴 경우는 세지 않는다. 한 편 = 요청 1회
      track('recommend_apply', { purpose: purpose.value ?? '', modules: placed, mode: mode.value })
    }
    clear()
    return placed
  }

  return {
    enabled,
    panelOpen,
    field,
    setField,
    purpose,
    purposes: NEWSLETTER_PURPOSES,
    brief,
    canRequest,
    loading,
    error,
    options,
    selectedIndex,
    selected,
    hasResult,
    mode,
    moduleLabel,
    request,
    cancel,
    clear,
    apply,
  }
})
