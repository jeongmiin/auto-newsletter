import { defineStore } from 'pinia'
import { ref, computed, triggerRef } from 'vue'
import type {
  ModuleInstance,
  ModuleMetadata,
  TableRow,
  ContentTitle,
  ContentText,
  AdditionalContent,
  TableCell,
  NewsletterTemplate,
  ModuleGroup,
  ModuleGroupStyles,
  DisplayItem,
} from '@/types'
import { useEditorStore } from './editorStore'
import { formatTextWithBreaks } from '@/utils/textUtils'
import { generateUniqueId, applyStylesToHtml } from '@/utils/htmlUtils'
import {
  replaceModuleNewsHeaderContent,
  replaceModuleBasicHeaderContent,
  replaceModuleImageHeaderContent,
  replaceModuleDescTextContent,
  replaceModuleImgContent,
  replaceModuleOneButtonContent,
  replaceModuleTwoButtonContent,
  replaceTopLanguageButtonContent,
  replaceSectionTitleContent,
  replaceModule04Content,
  replaceModule02Content,
  replaceModule053Content,
  replaceModule051Content,
  replaceModule052Content,
  replaceModule06Content,
  replaceModule07Content,
  replaceModule07ReverseContent,
  replaceModule011Content,
  replaceModule012Content,
  replaceModuleFooterContent,
  replaceModule10Content,
  replaceModule11Content,
  replaceModule101Content,
  replaceModuleSubTitleContent,
  replaceModuleTableContent,
  replaceModuleDividerContent,
  replaceModule01Content,
  replaceModule12Content,
  replaceDefaultTemplate,
} from '@/utils/moduleContentReplacer'
import { convertQuillListsToEmailHtml } from '@/utils/quillHtmlProcessor'
import { flattenAlphaColorsInHtml } from '@/utils/colorFlatten'
import { resolvePointColors, resolvePointColorVar } from '@/utils/pointColor'
import { applyFontFamily } from '@/utils/fontFamily'
import { migrateModuleProperties } from '@/utils/moduleMigrations'
import { sanitizeHtml } from '@/utils/sanitize'
import { DEFAULT_GROUP_STYLES, wrapGroupHtmlForEmail, resolveGroupStyles } from '@/utils/groupStyle'

export const useModuleStore = defineStore('module', () => {
  // ============= State =============
  const modules = ref<ModuleInstance[]>([])
  const selectedModuleId = ref<string | null>(null)
  const availableModules = ref<ModuleMetadata[]>([])
  const availableTemplates = ref<NewsletterTemplate[]>([])
  const isDirty = ref(false) // 변경사항 추적

  // 모듈 그룹 (그룹 단위 스타일). 멤버십은 ModuleInstance.groupId로 표현된다.
  const groups = ref<ModuleGroup[]>([])
  // 현재 선택된 그룹 (속성 패널에서 그룹 스타일 편집 대상)
  const selectedGroupId = ref<string | null>(null)

  // ============= Computed =============
  const selectedModule = computed(
    () => modules.value.find((m) => m.id === selectedModuleId.value) || null,
  )

  const selectedGroup = computed(
    () => groups.value.find((g) => g.id === selectedGroupId.value) || null,
  )

  /**
   * 캔버스/목차 표시용 리스트.
   * order 정렬된 모듈을 훑으며 '연속된 같은 groupId'를 하나의 group 항목으로 묶는다.
   * (그룹 멤버는 항상 연속이도록 createGroup/이동 시 보장됨)
   */
  const displayItems = computed<DisplayItem[]>(() => {
    const sorted = [...modules.value].sort((a, b) => a.order - b.order)
    const items: DisplayItem[] = []
    let i = 0
    while (i < sorted.length) {
      const m = sorted[i]
      const gid = m.groupId
      const group = gid ? groups.value.find((g) => g.id === gid) : undefined
      if (gid && group) {
        const members: ModuleInstance[] = []
        while (i < sorted.length && sorted[i].groupId === gid) {
          members.push(sorted[i])
          i++
        }
        items.push({ type: 'group', id: gid, group, modules: members })
      } else {
        items.push({ type: 'module', id: m.id, module: m })
        i++
      }
    }
    return items
  })

  const selectedModuleMetadata = computed(() => {
    if (!selectedModule.value) return null
    return availableModules.value.find((m) => m.id === selectedModule.value!.moduleId) || null
  })

  // ============= Module Metadata =============
  /**
   * 경로 정규화 헬퍼 함수
   */
  const normalizePath = (path: string): string => {
    // 중복 슬래시 제거
    return path.replace(/\/+/g, '/')
  }

  /**
   * 사용 가능한 모듈 메타데이터 로드
   */
  const loadAvailableModules = async (): Promise<ModuleMetadata[]> => {
    try {
      // 개발/프로덕션 환경에 따른 경로 처리
      const basePath = import.meta.env.BASE_URL || '/'
      const configPath = normalizePath(`${basePath}modules/modules-config.json`)

      const response = await fetch(configPath)
      if (!response.ok) {
        throw new Error(`Failed to load modules: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (!data || !Array.isArray(data.modules)) {
        throw new Error('Invalid modules configuration format')
      }

      const validatedModules = data.modules.filter((module: ModuleMetadata) => {
        return (
          module &&
          typeof module.id === 'string' &&
          typeof module.name === 'string' &&
          Array.isArray(module.editableProps)
        )
      })

      if (validatedModules.length !== data.modules.length) {
        console.warn('Some modules were excluded due to invalid format')
      }

      availableModules.value = validatedModules
      return validatedModules
    } catch (error) {
      console.error('[loadAvailableModules] Failed to load module metadata:', error)
      if (typeof window !== 'undefined') {
        console.warn('Cannot load module configuration. Using empty modules.')
      }
      availableModules.value = []
      return []
    }
  }

  // ============= Module Management =============
  /**
   * 모듈 추가
   */
  const addModule = (moduleMetadata: ModuleMetadata): void => {
    const newModule: ModuleInstance = {
      id: generateUniqueId('module'),
      moduleId: moduleMetadata.id,
      order: modules.value.length, // reorderModules에서 최종 보정
      properties: getDefaultProperties(moduleMetadata),
      styles: moduleMetadata.defaultStyles || {},
    }

    // 선택된 모듈이 있으면 그 바로 아래에 삽입, 없으면 맨 끝에 추가
    let selectedIndex = selectedModuleId.value
      ? modules.value.findIndex((m) => m.id === selectedModuleId.value)
      : -1

    // 선택 모듈이 그룹에 속하면, 그룹 연속성이 깨지지 않도록 그룹 마지막 멤버 뒤에 삽입
    // (새 모듈은 그룹에 포함되지 않음)
    if (selectedIndex !== -1) {
      const selGroupId = modules.value[selectedIndex].groupId
      if (selGroupId) {
        while (
          selectedIndex + 1 < modules.value.length &&
          modules.value[selectedIndex + 1].groupId === selGroupId
        ) {
          selectedIndex++
        }
      }
    }

    if (selectedIndex === -1) {
      modules.value.push(newModule)
    } else {
      modules.value.splice(selectedIndex + 1, 0, newModule)
    }

    reorderModules()
    selectedModuleId.value = newModule.id
    selectedGroupId.value = null
    isDirty.value = true
  }

  /**
   * 모듈 선택
   */
  const selectModule = (moduleId: string): void => {
    selectedModuleId.value = moduleId
    selectedGroupId.value = null
  }

  /**
   * 모듈 속성 업데이트
   */
  const updateModuleProperty = (propertyKey: string, value: unknown): void => {
    if (!selectedModule.value) return
    selectedModule.value.properties[propertyKey] = value
    // 🐛 해결책: 속성 변경 후 modules ref 트리거
    triggerRef(modules)
    isDirty.value = true
  }

  /**
   * 모듈 스타일 업데이트
   */
  const updateModuleStyle = (styleKey: string, value: unknown): void => {
    if (!selectedModule.value) return
    ;(selectedModule.value.styles as Record<string, unknown>)[styleKey] = value
    triggerRef(modules)
    isDirty.value = true
  }

  /**
   * 모듈 제거
   */
  const removeModule = (moduleId: string): void => {
    const index = modules.value.findIndex((m) => m.id === moduleId)
    if (index === -1) return

    const removedGroupId = modules.value[index].groupId
    modules.value.splice(index, 1)
    if (selectedModuleId.value === moduleId) {
      selectedModuleId.value = null
    }
    // 멤버가 0개가 된(빈) 그룹은 자동 해제 (1개짜리 그룹은 허용)
    if (removedGroupId) cleanupGroup(removedGroupId)
    reorderModules()
    isDirty.value = true
  }

  /**
   * 그룹에 멤버가 하나도 없으면(빈 그룹) 그룹 정의를 삭제한다.
   * (1개짜리 그룹도 그룹 스타일 적용을 위해 허용한다)
   */
  const cleanupGroup = (groupId: string): void => {
    const members = modules.value.filter((m) => m.groupId === groupId)
    if (members.length < 1) {
      members.forEach((m) => {
        delete m.groupId
      })
      const gi = groups.value.findIndex((g) => g.id === groupId)
      if (gi !== -1) groups.value.splice(gi, 1)
      if (selectedGroupId.value === groupId) selectedGroupId.value = null
    }
  }

  /**
   * 모듈 순서 재정렬
   */
  const reorderModules = (): void => {
    modules.value.forEach((module, idx) => {
      module.order = idx
    })
  }

  /**
   * 모듈 위로 이동
   */
  const moveModuleUp = (moduleId: string): void => {
    const index = modules.value.findIndex((m) => m.id === moduleId)
    if (index <= 0) return
    // 그룹 연속성 보호: 위 이웃과 그룹 소속이 같을 때만 교환
    // (그룹 경계에서는 동작하지 않음 — 그룹 통째 이동은 드래그/그룹 이동 사용)
    if ((modules.value[index].groupId ?? null) !== (modules.value[index - 1].groupId ?? null)) {
      return
    }
    ;[modules.value[index], modules.value[index - 1]] = [
      modules.value[index - 1],
      modules.value[index],
    ]
    reorderModules()
    isDirty.value = true
  }

  /**
   * 모듈 아래로 이동
   */
  const moveModuleDown = (moduleId: string): void => {
    const index = modules.value.findIndex((m) => m.id === moduleId)
    if (index < 0 || index >= modules.value.length - 1) return
    // 그룹 연속성 보호: 아래 이웃과 그룹 소속이 같을 때만 교환
    if ((modules.value[index].groupId ?? null) !== (modules.value[index + 1].groupId ?? null)) {
      return
    }
    ;[modules.value[index], modules.value[index + 1]] = [
      modules.value[index + 1],
      modules.value[index],
    ]
    reorderModules()
    isDirty.value = true
  }

  /**
   * 모듈 복제
   */
  const duplicateModule = (moduleId: string): void => {
    const originalModule = modules.value.find((m) => m.id === moduleId)
    if (!originalModule) return

    const duplicatedModule: ModuleInstance = {
      ...originalModule,
      id: generateUniqueId('module'),
      order: originalModule.order + 1,
      properties: JSON.parse(JSON.stringify(originalModule.properties)),
      styles: JSON.parse(JSON.stringify(originalModule.styles)),
    }

    const insertIndex = modules.value.findIndex((m) => m.id === moduleId) + 1
    modules.value.splice(insertIndex, 0, duplicatedModule)
    reorderModules()

    selectedModuleId.value = duplicatedModule.id
    isDirty.value = true
  }

  /**
   * 전체 삭제
   */
  const clearAll = (): void => {
    modules.value = []
    groups.value = []
    selectedModuleId.value = null
    selectedGroupId.value = null
    isDirty.value = false
  }

  // ============= Group Management =============
  /**
   * 선택된 모듈들을 하나의 그룹으로 묶는다.
   * - 1개 이상이면 가능하며(단일 모듈 그룹 허용), 묶인 결과는 항상 '연속'되도록 순서를 재배치한다.
   * - 이미 다른 그룹에 속한 모듈이 하나라도 포함되면 그룹을 만들지 않고 null을 반환한다.
   *   (기존 그룹을 먼저 해제한 뒤 다시 묶어야 한다)
   * @returns 생성된 그룹 id (실패 시 null)
   */
  const createGroup = (moduleIds: string[]): string | null => {
    const ids = Array.from(new Set(moduleIds))
    if (ids.length < 1) return null

    const targets = ids
      .map((id) => modules.value.find((m) => m.id === id))
      .filter((m): m is ModuleInstance => !!m)
    if (targets.length < 1) return null

    // 이미 그룹에 속한 모듈이 포함되면 묶지 않고 그대로 반환
    if (targets.some((m) => m.groupId)) return null

    const newGroupId = generateUniqueId('group')

    // 묶을 모듈들을 현재 order 순으로 정렬
    const sortedTargets = [...targets].sort((a, b) => a.order - b.order)
    // 새 위치: 첫 멤버가 있던 자리에 모두 연속 배치
    const firstIndex = modules.value
      .map((m) => m.id)
      .indexOf(sortedTargets[0].id)

    const targetIdSet = new Set(sortedTargets.map((m) => m.id))
    const remaining = modules.value.filter((m) => !targetIdSet.has(m.id))

    // firstIndex 기준으로 remaining 위치를 계산해 그 자리에 그룹 멤버 삽입
    // (firstIndex 앞에 있던 비대상 모듈 수 = 삽입 위치)
    const insertAt = modules.value
      .slice(0, firstIndex)
      .filter((m) => !targetIdSet.has(m.id)).length

    sortedTargets.forEach((m) => {
      m.groupId = newGroupId
    })

    const next = [...remaining]
    next.splice(insertAt, 0, ...sortedTargets)
    modules.value.splice(0, modules.value.length, ...next)

    groups.value.push({ id: newGroupId, styles: { ...DEFAULT_GROUP_STYLES } })

    reorderModules()
    selectedGroupId.value = newGroupId
    selectedModuleId.value = null
    isDirty.value = true
    return newGroupId
  }

  /**
   * 그룹 통째 복제 — 그룹의 모든 멤버 모듈 + 그룹 스타일을 새 ID로 복제해
   * 원본 그룹 바로 아래에 연속 배치한다. (그룹 연속성 유지)
   * @returns 생성된 새 그룹 id (실패 시 null)
   */
  const duplicateGroup = (groupId: string): string | null => {
    const group = groups.value.find((g) => g.id === groupId)
    if (!group) return null

    // 원본 그룹 멤버를 현재 order 순으로
    const members = modules.value
      .filter((m) => m.groupId === groupId)
      .sort((a, b) => a.order - b.order)
    if (members.length === 0) return null

    const newGroupId = generateUniqueId('group')

    // 멤버 복제 (새 모듈 ID + 새 groupId, 속성·스타일 깊은 복사)
    const clones: ModuleInstance[] = members.map((m) => ({
      ...m,
      id: generateUniqueId('module'),
      groupId: newGroupId,
      properties: JSON.parse(JSON.stringify(m.properties)),
      styles: JSON.parse(JSON.stringify(m.styles)),
    }))

    // 원본 그룹의 마지막 멤버 바로 뒤에 연속 삽입
    const lastMemberId = members[members.length - 1].id
    const insertIndex = modules.value.findIndex((m) => m.id === lastMemberId) + 1
    modules.value.splice(insertIndex, 0, ...clones)

    // 그룹 정의 복제 (스타일 깊은 복사)
    groups.value.push({ id: newGroupId, styles: JSON.parse(JSON.stringify(group.styles)) })

    reorderModules()
    selectedGroupId.value = newGroupId
    selectedModuleId.value = null
    isDirty.value = true
    return newGroupId
  }

  /**
   * 그룹 해제 — 멤버들의 groupId 제거, 그룹 정의 삭제 (모듈 자체는 유지)
   */
  const ungroup = (groupId: string): void => {
    modules.value.forEach((m) => {
      if (m.groupId === groupId) delete m.groupId
    })
    const gi = groups.value.findIndex((g) => g.id === groupId)
    if (gi !== -1) groups.value.splice(gi, 1)
    if (selectedGroupId.value === groupId) selectedGroupId.value = null
    isDirty.value = true
  }

  /**
   * 그룹 전체 삭제 — 그룹의 모든 멤버 모듈과 그룹 정의를 함께 제거한다.
   * (그룹 해제(ungroup)는 모듈을 유지하지만, 이 함수는 모듈까지 삭제한다)
   */
  const deleteGroup = (groupId: string): void => {
    const hadMembers = modules.value.some((m) => m.groupId === groupId)
    // 멤버 모듈 제거
    modules.value = modules.value.filter((m) => m.groupId !== groupId)
    // 그룹 정의 제거
    const gi = groups.value.findIndex((g) => g.id === groupId)
    if (gi !== -1) groups.value.splice(gi, 1)
    // 선택 상태 정리
    if (selectedGroupId.value === groupId) selectedGroupId.value = null
    if (
      selectedModuleId.value &&
      !modules.value.some((m) => m.id === selectedModuleId.value)
    ) {
      selectedModuleId.value = null
    }
    if (hadMembers || gi !== -1) {
      reorderModules()
      isDirty.value = true
    }
  }

  /**
   * 그룹 선택 (속성 패널에서 그룹 스타일 편집)
   */
  const selectGroup = (groupId: string): void => {
    selectedGroupId.value = groupId
    selectedModuleId.value = null
  }

  /**
   * 그룹 스타일 업데이트
   */
  const updateGroupStyle = (
    groupId: string,
    styleKey: keyof ModuleGroupStyles,
    value: ModuleGroupStyles[keyof ModuleGroupStyles],
  ): void => {
    const group = groups.value.find((g) => g.id === groupId)
    if (!group) return
    ;(group.styles as Record<string, unknown>)[styleKey] = value
    triggerRef(groups)
    isDirty.value = true
  }

  /**
   * 표시 항목(displayItems) 순서를 새 배열로 적용 — 평평한 modules 배열로 펼쳐 재구성.
   * 그룹 항목은 내부 모듈을 통째로 유지하므로 그룹 연속성이 보존된다.
   * (캔버스/목차 상위 레벨 드래그에서 호출)
   */
  const setDisplayOrder = (items: DisplayItem[]): void => {
    const flat: ModuleInstance[] = []
    for (const item of items) {
      if (item.type === 'group') {
        flat.push(...item.modules)
      } else {
        flat.push(item.module)
      }
    }
    modules.value.splice(0, modules.value.length, ...flat)
    reorderModules()
    isDirty.value = true
  }

  /**
   * 그룹을 표시 단위로 위/아래 한 칸 이동 (그룹 통째 이동)
   */
  const moveGroup = (groupId: string, direction: 'up' | 'down'): void => {
    const items = displayItems.value
    const idx = items.findIndex((it) => it.type === 'group' && it.id === groupId)
    if (idx === -1) return
    const swapWith = direction === 'up' ? idx - 1 : idx + 1
    if (swapWith < 0 || swapWith >= items.length) return
    const next = [...items]
    ;[next[idx], next[swapWith]] = [next[swapWith], next[idx]]
    setDisplayOrder(next)
  }

  /**
   * 저장됨으로 표시 (내보내기 후 호출)
   */
  const markAsSaved = (): void => {
    isDirty.value = false
  }

  // ============= Newsletter Templates =============
  /**
   * 사용 가능한 뉴스레터 템플릿 카탈로그 로드
   */
  const loadAvailableTemplates = async (): Promise<NewsletterTemplate[]> => {
    try {
      const basePath = import.meta.env.BASE_URL || '/'
      const configPath = normalizePath(`${basePath}templates/templates-config.json`)

      const response = await fetch(configPath)
      if (!response.ok) {
        throw new Error(`Failed to load templates: ${response.status}`)
      }

      const data = await response.json()
      if (!data || !Array.isArray(data.templates)) {
        throw new Error('Invalid templates configuration format')
      }

      const validated = (data.templates as NewsletterTemplate[]).filter(
        (t) => t && typeof t.id === 'string' && typeof t.name === 'string' && Array.isArray(t.modules),
      )

      availableTemplates.value = validated
      return validated
    } catch (error) {
      console.error('[loadAvailableTemplates] Failed:', error)
      availableTemplates.value = []
      return []
    }
  }

  /**
   * 템플릿을 현재 작업 영역에 로드
   * 모듈 ID는 충돌 방지를 위해 재생성됨
   */
  const loadTemplate = async (templateId: string): Promise<boolean> => {
    const template = availableTemplates.value.find((t) => t.id === templateId)
    if (!template) {
      console.error(`[loadTemplate] Template not found: ${templateId}`)
      return false
    }

    if (availableModules.value.length === 0) {
      await loadAvailableModules()
    }

    const editorStore = useEditorStore()

    clearAll()

    if (template.wrapSettings) {
      editorStore.updateWrapSettings(template.wrapSettings)
    }

    // 배열 순서를 그대로 적용 (JSON 작성 시 직관적으로 추가/삭제 가능)
    for (const moduleData of template.modules) {
      const moduleMetadata = availableModules.value.find((m) => m.id === moduleData.moduleId)
      if (!moduleMetadata) {
        console.warn(`[loadTemplate] Unknown moduleId skipped: ${moduleData.moduleId}`)
        continue
      }

      addModule(moduleMetadata)
      const added = modules.value[modules.value.length - 1]

      // 구버전 템플릿 속성을 현재 스키마로 변환 후 적용
      const migratedProps = migrateModuleProperties(moduleData.moduleId, moduleData.properties)
      Object.entries(migratedProps).forEach(([key, value]) => {
        added.properties[key] = value
      })
      if (moduleData.styles) {
        Object.entries(moduleData.styles).forEach(([key, value]) => {
          ;(added.styles as Record<string, unknown>)[key] = value
        })
      }
      // 그룹 소속 복원 (그룹 정의는 아래에서 일괄 복원)
      if (moduleData.groupId) {
        added.groupId = moduleData.groupId
      }
    }

    // 그룹 정의 복원 후 연속성 정리
    if (template.groups && template.groups.length > 0) {
      groups.value = JSON.parse(JSON.stringify(template.groups))
      normalizeGroupContiguity()
    }

    if (modules.value.length > 0) {
      selectedModuleId.value = modules.value[0].id
    }
    isDirty.value = false
    return true
  }

  /**
   * 그룹 멤버가 항상 '연속'이 되도록 modules 순서를 안정적으로 재배치한다.
   * (가져오기/템플릿 로드처럼 외부에서 순서가 들어올 때 방어적으로 호출)
   * 또한 정의가 없는 groupId나 멤버 2개 미만 그룹은 정리한다.
   */
  const normalizeGroupContiguity = (): void => {
    const sorted = [...modules.value].sort((a, b) => a.order - b.order)
    const validGroupIds = new Set(groups.value.map((g) => g.id))

    // 정의 없는 groupId 제거
    sorted.forEach((m) => {
      if (m.groupId && !validGroupIds.has(m.groupId)) delete m.groupId
    })

    const emitted = new Set<string>()
    const result: ModuleInstance[] = []
    for (const m of sorted) {
      const gid = m.groupId
      if (gid && !emitted.has(gid)) {
        // 이 그룹의 모든 멤버를 현재 상대 순서대로 연속 배치
        result.push(...sorted.filter((x) => x.groupId === gid))
        emitted.add(gid)
      } else if (!gid) {
        result.push(m)
      }
      // 이미 emit된 그룹 멤버는 건너뜀
    }
    modules.value.splice(0, modules.value.length, ...result)
    reorderModules()

    // 멤버 2개 미만 그룹 정리
    ;[...groups.value].forEach((g) => cleanupGroup(g.id))
  }

  /**
   * 현재 작업 상태를 템플릿 JSON 문자열로 직렬화
   * 외부에서 이름/설명을 받아 그대로 사용
   */
  const exportCurrentAsTemplate = (name: string, description: string = ''): string => {
    const editorStore = useEditorStore()
    const template: NewsletterTemplate = {
      id: `template-${Date.now()}`,
      name,
      description,
      wrapSettings: { ...editorStore.wrapSettings },
      modules: modules.value.map((m) => ({
        moduleId: m.moduleId,
        order: m.order,
        properties: JSON.parse(JSON.stringify(m.properties)),
        styles: JSON.parse(JSON.stringify(m.styles)),
        ...(m.groupId ? { groupId: m.groupId } : {}),
      })),
      groups: JSON.parse(JSON.stringify(groups.value)),
    }
    return JSON.stringify(template, null, 2)
  }

  // ============= Table Row Management =============
  const addTableRow = (moduleId: string, header: string = '', data: string = ''): void => {
    const moduleIndex = modules.value.findIndex((m) => m.id === moduleId)
    if (moduleIndex === -1) {
      console.error(`[addTableRow] Module not found: ${moduleId}`)
      return
    }

    const module = modules.value[moduleIndex]

    const newRow: TableRow = {
      id: generateUniqueId('row'),
      header,
      data,
    }

    // tableRows 초기화 및 추가
    const currentRows = (module.properties.tableRows as TableRow[]) || []

    // 🐛 해결책: modules.value를 직접 변경하고 triggerRef로 강제 업데이트
    module.properties.tableRows = [...currentRows, newRow]

    // modules ref를 강제로 트리거하여 Vue에게 변경을 알림
    triggerRef(modules)
  }

  const updateTableRow = (
    moduleId: string,
    rowId: string,
    field: 'header' | 'data',
    value: string,
  ): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties.tableRows) return

    const row = (module.properties.tableRows as TableRow[]).find((r: TableRow) => r.id === rowId)
    if (row) {
      row[field] = value
      triggerRef(modules)
      isDirty.value = true
    }
  }

  const removeTableRow = (moduleId: string, rowId: string): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties.tableRows) return

    const index = (module.properties.tableRows as TableRow[]).findIndex(
      (r: TableRow) => r.id === rowId,
    )
    if (index !== -1) {
      ;(module.properties.tableRows as TableRow[]).splice(index, 1)
      triggerRef(modules)
      isDirty.value = true
    }
  }

  // ============= Custom Table Cell Management =============
  /**
   * 테이블 셀 초기화 (기본 2x2 테이블)
   */
  const initializeTableCells = (moduleId: string): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    // 정렬은 셀별로 지정하지 않고 열 공통값(tableColAligns)을 기본으로 사용한다.
    // 셀별 align은 사용자가 '가' 편집기에서 직접 지정했을 때만 채워지며, 그때 더 우선한다.
    const defaultCells: TableCell[][] = [
      [
        { id: generateUniqueId('cell'), type: 'th', content: '항목', colspan: 1, rowspan: 1 },
        { id: generateUniqueId('cell'), type: 'td', content: '내용', colspan: 1, rowspan: 1 },
      ],
      [
        { id: generateUniqueId('cell'), type: 'th', content: '항목', colspan: 1, rowspan: 1 },
        { id: generateUniqueId('cell'), type: 'td', content: '내용', colspan: 1, rowspan: 1 },
      ],
    ]

    module.properties.tableCells = defaultCells
    // 열 공통 정렬: 1열 가운데, 2열 왼쪽
    module.properties.tableColAligns = ['center', 'left']
    triggerRef(modules)
  }

  /**
   * 테이블 행 추가 (커스텀 테이블)
   */
  const addTableCellRow = (moduleId: string): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    const cells = (module.properties.tableCells as TableCell[][]) || []

    // 첫 행이 없으면 초기화
    if (cells.length === 0) {
      initializeTableCells(moduleId)
      return
    }

    // 기존 열 수에 맞춰 새 행 추가
    const colCount = cells[0].length
    const newRow: TableCell[] = Array.from({ length: colCount }, () => ({
      id: generateUniqueId('cell'),
      type: 'td' as const,
      content: '',
      colspan: 1,
      rowspan: 1,
    }))

    cells.push(newRow)
    module.properties.tableCells = [...cells]
    triggerRef(modules)
  }

  /**
   * 테이블 열 추가 (커스텀 테이블)
   */
  const addTableCellColumn = (moduleId: string): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    const cells = (module.properties.tableCells as TableCell[][]) || []

    if (cells.length === 0) {
      initializeTableCells(moduleId)
      return
    }

    // 각 행에 새 열 추가 (정렬은 열 공통값으로 관리)
    cells.forEach((row, rowIndex) => {
      const cellType = rowIndex === 0 ? 'th' : 'td'
      row.push({
        id: generateUniqueId('cell'),
        type: cellType,
        content: '',
        colspan: 1,
        rowspan: 1,
      })
    })

    // 열 너비 배열도 동기화 (새 열은 기본 너비)
    const colWidths = (module.properties.tableColWidths as string[] | undefined) || []
    module.properties.tableColWidths = [...colWidths, '']

    // 열 공통 정렬 배열도 동기화 (새 열은 왼쪽 기본)
    const colAligns = (module.properties.tableColAligns as string[] | undefined) || []
    module.properties.tableColAligns = [...colAligns, 'left']

    module.properties.tableCells = [...cells]
    triggerRef(modules)
  }

  /**
   * 테이블 행 삭제 (커스텀 테이블)
   */
  const removeTableCellRow = (moduleId: string, rowIndex: number): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    const cells = (module.properties.tableCells as TableCell[][]) || []
    if (rowIndex < 0 || rowIndex >= cells.length || cells.length <= 1) return

    cells.splice(rowIndex, 1)
    module.properties.tableCells = [...cells]
    triggerRef(modules)
  }

  /**
   * 테이블 열 삭제 (커스텀 테이블)
   */
  const removeTableCellColumn = (moduleId: string, colIndex: number): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    const cells = (module.properties.tableCells as TableCell[][]) || []
    if (cells.length === 0 || colIndex < 0 || colIndex >= cells[0].length || cells[0].length <= 1) return

    cells.forEach((row) => {
      row.splice(colIndex, 1)
    })

    // 열 너비 배열도 동기화
    const colWidths = (module.properties.tableColWidths as string[] | undefined) || []
    if (colWidths.length > 0) {
      const next = [...colWidths]
      next.splice(colIndex, 1)
      module.properties.tableColWidths = next
    }

    // 열 공통 정렬 배열도 동기화
    const colAligns = (module.properties.tableColAligns as string[] | undefined) || []
    if (colAligns.length > 0) {
      const next = [...colAligns]
      next.splice(colIndex, 1)
      module.properties.tableColAligns = next
    }

    module.properties.tableCells = [...cells]
    triggerRef(modules)
  }

  /**
   * 테이블 열 너비 업데이트 (커스텀 테이블)
   */
  const updateTableColWidth = (moduleId: string, colIndex: number, width: string): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    const cells = (module.properties.tableCells as TableCell[][]) || []
    const colCount = cells[0]?.length || 0
    if (colIndex < 0 || colIndex >= colCount) return

    const current = (module.properties.tableColWidths as string[] | undefined) || []
    const next = Array.from({ length: colCount }, (_, i) => current[i] ?? '')
    next[colIndex] = (width || '').trim()

    module.properties.tableColWidths = next
    triggerRef(modules)
  }

  /**
   * 테이블 열 공통 정렬 업데이트 (커스텀 테이블)
   * 셀별 align이 지정되지 않은 셀에 적용되는 열 단위 기본 정렬.
   */
  const updateTableColAlign = (
    moduleId: string,
    colIndex: number,
    align: 'left' | 'center' | 'right',
  ): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    const cells = (module.properties.tableCells as TableCell[][]) || []
    const colCount = cells[0]?.length || 0
    if (colIndex < 0 || colIndex >= colCount) return

    const current = (module.properties.tableColAligns as string[] | undefined) || []
    const next = Array.from({ length: colCount }, (_, i) => current[i] || (i === 0 ? 'center' : 'left'))
    next[colIndex] = align

    module.properties.tableColAligns = next
    triggerRef(modules)
  }

  /**
   * 테이블 셀 업데이트 (colspan/rowspan 변경 시 hidden 셀 처리 포함)
   */
  const updateTableCell = (
    moduleId: string,
    rowIndex: number,
    colIndex: number,
    updates: Partial<TableCell>
  ): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    const cells = (module.properties.tableCells as TableCell[][]) || []
    if (rowIndex < 0 || rowIndex >= cells.length) return
    if (colIndex < 0 || colIndex >= cells[rowIndex].length) return

    const cell = cells[rowIndex][colIndex]
    const prevColspan = cell.colspan || 1
    const prevRowspan = cell.rowspan || 1

    // colspan 또는 rowspan이 변경되는 경우 hidden 셀 처리
    if (updates.colspan !== undefined || updates.rowspan !== undefined) {
      const newColspan = updates.colspan ?? prevColspan
      const newRowspan = updates.rowspan ?? prevRowspan

      // 기존 병합 해제 (이전에 hidden이었던 셀들 복원)
      for (let r = rowIndex; r < rowIndex + prevRowspan && r < cells.length; r++) {
        for (let c = colIndex; c < colIndex + prevColspan && c < cells[r].length; c++) {
          if (r !== rowIndex || c !== colIndex) {
            cells[r][c].hidden = false
          }
        }
      }

      // 새로운 병합 적용
      for (let r = rowIndex; r < rowIndex + newRowspan && r < cells.length; r++) {
        for (let c = colIndex; c < colIndex + newColspan && c < cells[r].length; c++) {
          if (r !== rowIndex || c !== colIndex) {
            cells[r][c].hidden = true
          }
        }
      }
    }

    Object.assign(cell, updates)

    module.properties.tableCells = [...cells]
    triggerRef(modules)
  }

  /**
   * 셀 병합 (colspan/rowspan 설정)
   */
  const mergeCells = (
    moduleId: string,
    startRow: number,
    startCol: number,
    rowSpan: number,
    colSpan: number
  ): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    const cells = (module.properties.tableCells as TableCell[][]) || []
    if (startRow < 0 || startRow >= cells.length) return
    if (startCol < 0 || startCol >= cells[startRow].length) return

    // 시작 셀에 colspan/rowspan 설정
    cells[startRow][startCol].colspan = colSpan
    cells[startRow][startCol].rowspan = rowSpan

    // 병합되는 나머지 셀들을 hidden으로 표시
    for (let r = startRow; r < startRow + rowSpan && r < cells.length; r++) {
      for (let c = startCol; c < startCol + colSpan && c < cells[r].length; c++) {
        if (r !== startRow || c !== startCol) {
          cells[r][c].hidden = true
        }
      }
    }

    module.properties.tableCells = [...cells]
    triggerRef(modules)
  }

  /**
   * 셀 병합 해제
   */
  const unmergeCell = (moduleId: string, rowIndex: number, colIndex: number): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    const cells = (module.properties.tableCells as TableCell[][]) || []
    if (rowIndex < 0 || rowIndex >= cells.length) return
    if (colIndex < 0 || colIndex >= cells[rowIndex].length) return

    const cell = cells[rowIndex][colIndex]
    const prevColspan = cell.colspan
    const prevRowspan = cell.rowspan

    // 병합 해제
    cell.colspan = 1
    cell.rowspan = 1

    // 병합되었던 셀들의 hidden 해제
    for (let r = rowIndex; r < rowIndex + prevRowspan && r < cells.length; r++) {
      for (let c = colIndex; c < colIndex + prevColspan && c < cells[r].length; c++) {
        cells[r][c].hidden = false
      }
    }

    module.properties.tableCells = [...cells]
    triggerRef(modules)
  }

  /**
   * 셀 타입 토글 (th <-> td)
   * 타입 변경 시 기본 정렬도 함께 변경 (TH: center, TD: left)
   */
  const toggleCellType = (moduleId: string, rowIndex: number, colIndex: number): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    const cells = (module.properties.tableCells as TableCell[][]) || []
    if (rowIndex < 0 || rowIndex >= cells.length) return
    if (colIndex < 0 || colIndex >= cells[rowIndex].length) return

    const cell = cells[rowIndex][colIndex]
    const newType = cell.type === 'th' ? 'td' : 'th'
    cell.type = newType
    // 타입 변경 시 기본 정렬 적용 (TH: center, TD: left)
    cell.align = newType === 'th' ? 'center' : 'left'

    module.properties.tableCells = [...cells]
    triggerRef(modules)
  }

  /**
   * 테이블 프리셋 적용
   */
  const applyTablePreset = (
    moduleId: string,
    presetId: string,
    rows: number,
    cols: number,
    structure: ('th' | 'td')[][],
    defaultLabels?: Record<string, string[]>
  ): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    // 프리셋별 기본 라벨
    const labels: Record<string, string[][]> = {
      '2col-simple': [
        ['항목', '내용'],
        ['항목', '내용'],
        ['항목', '내용'],
      ],
      '3col-simple': [
        ['항목', '내용', '내용'],
        ['항목', '내용', '내용'],
        ['항목', '내용', '내용'],
      ],
      'schedule': [
        ['시간', '내용', '비고'],
        ['10:00', '', ''],
        ['11:00', '', ''],
        ['12:00', '', ''],
      ],
      'price': [
        ['구분', '가격', '비고'],
        ['항목1', '', ''],
        ['항목2', '', ''],
        ['항목3', '', ''],
      ],
    }

    const presetLabels = labels[presetId] || []

    // 새 테이블 셀 생성
    const newCells: TableCell[][] = []
    for (let r = 0; r < rows; r++) {
      const row: TableCell[] = []
      for (let c = 0; c < cols; c++) {
        const cellType = structure[r]?.[c] || 'td'
        const content = presetLabels[r]?.[c] || ''
        row.push({
          id: generateUniqueId('cell'),
          type: cellType,
          content,
          colspan: 1,
          rowspan: 1,
        })
      }
      newCells.push(row)
    }

    module.properties.tableCells = newCells
    module.properties.tablePresetId = presetId
    module.properties.tableColWidths = Array.from({ length: cols }, () => '')
    // 열 공통 정렬: 1열 가운데, 나머지 왼쪽
    module.properties.tableColAligns = Array.from({ length: cols }, (_, i) => (i === 0 ? 'center' : 'left'))
    triggerRef(modules)
  }

  // ============= Content Title Management =============
  const addContentTitle = (moduleId: string, text: string = ''): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    if (!module.properties.contentTitles) {
      module.properties.contentTitles = []
    }

    const newTitle: ContentTitle = {
      id: generateUniqueId('title'),
      text,
    }

    ;(module.properties.contentTitles as ContentTitle[]).push(newTitle)
    triggerRef(modules)
    isDirty.value = true
  }

  const updateContentTitle = (moduleId: string, titleId: string, text: string): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties.contentTitles) return

    const title = (module.properties.contentTitles as ContentTitle[]).find(
      (t: ContentTitle) => t.id === titleId,
    )
    if (title) {
      title.text = text
      triggerRef(modules)
      isDirty.value = true
    }
  }

  const removeContentTitle = (moduleId: string, titleId: string): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties.contentTitles) return

    const index = (module.properties.contentTitles as ContentTitle[]).findIndex(
      (t: ContentTitle) => t.id === titleId,
    )
    if (index !== -1) {
      ;(module.properties.contentTitles as ContentTitle[]).splice(index, 1)
      triggerRef(modules)
      isDirty.value = true
    }
  }

  // ============= Content Text Management =============
  const addContentText = (moduleId: string, content: string = ''): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    if (!module.properties.contentTexts) {
      module.properties.contentTexts = []
    }

    const newText: ContentText = {
      id: generateUniqueId('text'),
      content,
    }

    ;(module.properties.contentTexts as ContentText[]).push(newText)
    triggerRef(modules)
    isDirty.value = true
  }

  const updateContentText = (moduleId: string, textId: string, content: string): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties.contentTexts) return

    const text = (module.properties.contentTexts as ContentText[]).find(
      (t: ContentText) => t.id === textId,
    )
    if (text) {
      text.content = content
      triggerRef(modules)
      isDirty.value = true
    }
  }

  const removeContentText = (moduleId: string, textId: string): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties.contentTexts) return

    const index = (module.properties.contentTexts as ContentText[]).findIndex(
      (t: ContentText) => t.id === textId,
    )
    if (index !== -1) {
      ;(module.properties.contentTexts as ContentText[]).splice(index, 1)
      triggerRef(modules)
      isDirty.value = true
    }
  }

  // ============= Additional Content Management =============
  /**
   * 서브 모듈 HTML 로드
   */
  const loadContentTemplate = async (type: 'title' | 'text'): Promise<string> => {
    try {
      const basePath = import.meta.env.BASE_URL || '/'
      const filename = type === 'title' ? 'ModuleContent_title.html' : 'ModuleContent_text.html'
      const templatePath = normalizePath(`${basePath}modules/${filename}`)

      const response = await fetch(templatePath)
      if (!response.ok) {
        console.error('[loadContentTemplate] ❌ Failed:', templatePath, response.status)
        throw new Error(`Failed to load sub-module: ${response.status}`)
      }
      const html = await response.text()
      return html
    } catch (error) {
      console.error(`[loadContentTemplate] ❌ Error loading sub-module (${type}):`, error)
      return ''
    }
  }

  const addAdditionalContent = async (
    moduleId: string,
    type: 'title' | 'text',
    propertyKey: string = 'additionalContents',
  ): Promise<void> => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    if (!module.properties[propertyKey]) {
      module.properties[propertyKey] = []
    }

    const template = await loadContentTemplate(type)
    if (!template) return

    const existingContents = module.properties[propertyKey] as AdditionalContent[]
    const maxOrder =
      existingContents.length > 0 ? Math.max(...existingContents.map((c) => c.order)) : 0

    const newContent: AdditionalContent = {
      id: generateUniqueId('content'),
      type: type,
      htmlTemplate: type === 'title' ? 'ModuleContent_title.html' : 'ModuleContent_text.html',
      data: type === 'title' ? { title_text: '새 타이틀' } : { text_content: '새 텍스트 내용' },
      order: maxOrder + 1,
    }

    ;(module.properties[propertyKey] as AdditionalContent[]).push(newContent)
    triggerRef(modules)
    isDirty.value = true
  }

  const updateAdditionalContent = (
    moduleId: string,
    contentId: string,
    data: Record<string, string>,
    propertyKey: string = 'additionalContents',
  ): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties[propertyKey]) return

    const content = (module.properties[propertyKey] as AdditionalContent[]).find(
      (c: AdditionalContent) => c.id === contentId,
    )
    if (content) {
      content.data = { ...content.data, ...data }
      triggerRef(modules)
      isDirty.value = true
    }
  }

  const removeAdditionalContent = (
    moduleId: string,
    contentId: string,
    propertyKey: string = 'additionalContents',
  ): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties[propertyKey]) return

    const index = (module.properties[propertyKey] as AdditionalContent[]).findIndex(
      (c: AdditionalContent) => c.id === contentId,
    )
    if (index !== -1) {
      ;(module.properties[propertyKey] as AdditionalContent[]).splice(index, 1)
      const contents = module.properties[propertyKey] as AdditionalContent[]
      contents.sort((a, b) => a.order - b.order)
      contents.forEach((content, idx) => {
        content.order = idx + 1
      })
      triggerRef(modules)
      isDirty.value = true
    }
  }

  const moveAdditionalContentUp = (
    moduleId: string,
    contentId: string,
    propertyKey: string = 'additionalContents',
  ): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties[propertyKey]) return

    const contents = module.properties[propertyKey] as AdditionalContent[]
    const index = contents.findIndex((c: AdditionalContent) => c.id === contentId)
    if (index > 0) {
      // swap order values
      const tempOrder = contents[index].order
      contents[index].order = contents[index - 1].order
      contents[index - 1].order = tempOrder
      // re-sort by order and re-assign sequential order
      contents.sort((a, b) => a.order - b.order)
      contents.forEach((content, idx) => {
        content.order = idx + 1
      })
      triggerRef(modules)
      isDirty.value = true
    }
  }

  const moveAdditionalContentDown = (
    moduleId: string,
    contentId: string,
    propertyKey: string = 'additionalContents',
  ): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties[propertyKey]) return

    const contents = module.properties[propertyKey] as AdditionalContent[]
    const index = contents.findIndex((c: AdditionalContent) => c.id === contentId)
    if (index < contents.length - 1) {
      // swap order values
      const tempOrder = contents[index].order
      contents[index].order = contents[index + 1].order
      contents[index + 1].order = tempOrder
      // re-sort by order and re-assign sequential order
      contents.sort((a, b) => a.order - b.order)
      contents.forEach((content, idx) => {
        content.order = idx + 1
      })
      triggerRef(modules)
      isDirty.value = true
    }
  }

  /**
   * HTML 템플릿에 데이터 적용
   */
  const applyDataToTemplate = (htmlTemplate: string, data: Record<string, string>): string => {
    let result = htmlTemplate
    Object.entries(data).forEach(([key, value]) => {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const placeholder = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'g')
      result = result.replace(placeholder, formatTextWithBreaks(value))
    })
    return result
  }

  /**
   * 추가 콘텐츠 HTML 삽입
   */
  const insertAdditionalContents = async (
    baseHtml: string,
    contents: AdditionalContent[],
    insertMarker: string,
  ): Promise<string> => {
    if (!contents || contents.length === 0) {
      return baseHtml.replace(insertMarker, '')
    }

    const sortedContents = [...contents].sort((a, b) => a.order - b.order)
    const insertHtmlPromises = sortedContents.map(async (content) => {
      const template = await loadContentTemplate(content.type)
      return applyDataToTemplate(template, content.data)
    })

    const insertHtmlArray = await Promise.all(insertHtmlPromises)
    const insertHtml = insertHtmlArray.join('\n')
    return baseHtml.replace(insertMarker, insertHtml)
  }

  // ============= HTML Generation =============
  /**
   * 모듈별 콘텐츠 교체
   */
  const replaceModuleContent = async (html: string, module: ModuleInstance): Promise<string> => {
    const editorStore = useEditorStore()
    const { moduleId } = module
    // '포인트 색상 사용'으로 체크된 색상 속성을 전역 포인트 색상으로 해소
    const properties = resolvePointColors(module.properties, editorStore.wrapSettings.pointColor)

    switch (moduleId) {
      case 'ModuleNewsHeader':
        return replaceModuleNewsHeaderContent(html, properties)

      case 'ModuleBasicHeader':
        return replaceModuleBasicHeaderContent(html, properties)

      case 'ModuleImageHeader':
        return replaceModuleImageHeaderContent(html, properties)

      case 'ModuleDescText':
        return replaceModuleDescTextContent(html, properties)

      case 'ModuleImg':
        return replaceModuleImgContent(html, properties)

      case 'ModuleOneButton':
        return replaceModuleOneButtonContent(html, properties)

      case 'ModuleTwoButton':
        return replaceModuleTwoButtonContent(html, properties)

      case 'TopLanguageButton':
        return replaceTopLanguageButtonContent(html, properties)

      case 'SectionTitle':
        return replaceSectionTitleContent(html, properties)

      case 'Module04':
        return replaceModule04Content(html, properties, insertAdditionalContents)

      case 'Module02':
        return replaceModule02Content(html, properties, insertAdditionalContents)

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

      case 'Module11':
        return replaceModule11Content(html, properties)

      case 'Module10-1':
        return replaceModule101Content(html, properties)

      case 'ModuleSubTitle':
        return replaceModuleSubTitleContent(html, properties)

      case 'ModuleTable':
        return replaceModuleTableContent(html, properties)

      case 'ModuleDivider':
        return replaceModuleDividerContent(html, properties)

      case 'Module01':
        return replaceModule01Content(html, properties)

      case 'Module12':
        return replaceModule12Content(html, properties)

      default:
        return replaceDefaultTemplate(html, properties)
    }
  }

  /**
   * 전체 HTML 생성
   * @param wrapWithDocument - true면 완전한 HTML 문서로 감싸고, false면 콘텐츠만 반환
   */
  const generateHtml = async (wrapWithDocument: boolean = false): Promise<string> => {
    const editorStore = useEditorStore()
    const wrapSettings = editorStore.wrapSettings

    const basePath = import.meta.env.BASE_URL || '/'

    // 1) 모듈별 HTML을 순서대로 생성 (그룹 정보와 함께 보관)
    const rendered: Array<{ html: string; groupId?: string }> = []
    for (const module of [...modules.value].sort((a, b) => a.order - b.order)) {
      try {
        const modulePath = normalizePath(`${basePath}modules/${module.moduleId}.html`)

        const response = await fetch(modulePath)
        if (!response.ok) {
          console.error('[generateHtml] ❌ Failed:', modulePath, response.status)
          throw new Error(`Failed to load module HTML: ${response.status}`)
        }
        let html = await response.text()

        html = await replaceModuleContent(html, module)

        // 본문 인라인 '포인트 색상'(var(--point-color)) → 실제 색상값 (이메일은 CSS 변수 미지원)
        html = resolvePointColorVar(html, wrapSettings.pointColor)

        // 이메일용: Quill 리스트(<ol><li data-list>)를 인라인 스타일 <ul>/<ol>로 변환
        html = convertQuillListsToEmailHtml(html)

        if (module.styles && Object.keys(module.styles).length > 0) {
          html = applyStylesToHtml(html, module.styles as Record<string, unknown>)
        }

        // 반투명 색상을 전역 배경색과 합성해 불투명으로 평탄화 (이메일 호환)
        html = flattenAlphaColorsInHtml(html, wrapSettings.backgroundColor)

        // 다국어 폰트: 선택 언어에 따라 기본 폰트 스택을 일괄 치환
        html = applyFontFamily(html, wrapSettings.fontLanguage)

        rendered.push({ html, groupId: module.groupId })
      } catch (error) {
        console.error(
          `[generateHtml] Failed to generate HTML for module ${module.moduleId}:`,
          error,
        )
      }
    }

    // 2) 연속된 같은 그룹 모듈을 단일 셀 <table>로 감싸 결합 (이메일 호환)
    let fullHtml = ''
    let i = 0
    while (i < rendered.length) {
      const gid = rendered[i].groupId
      const group = gid ? groups.value.find((g) => g.id === gid) : undefined
      if (gid && group) {
        let inner = ''
        while (i < rendered.length && rendered[i].groupId === gid) {
          inner += rendered[i].html + '\n'
          i++
        }
        const resolvedGroupStyles = resolveGroupStyles(group.styles, wrapSettings.pointColor)
        fullHtml +=
          wrapGroupHtmlForEmail(inner, resolvedGroupStyles, wrapSettings.backgroundColor) + '\n'
      } else {
        fullHtml += rendered[i].html + '\n'
        i++
      }
    }

    // wrap 스타일 생성 (래퍼 자체의 배경/테두리 알파는 이메일 본문(흰색) 기준으로 평탄화)
    const wrapStyle = flattenAlphaColorsInHtml(
      `width:100%; max-width:680px; margin:0 auto; background-color:${wrapSettings.backgroundColor}; border:${wrapSettings.borderWidth} ${wrapSettings.borderStyle} ${wrapSettings.borderColor};`,
      '#ffffff',
    )
    // 아웃룩(Word 엔진)은 max-width/margin:auto를 무시하므로, 고정폭(680) + align=center +
    // bgcolor 속성을 가진 테이블로 감싸 680px 중앙 정렬을 강제한다. 최신 클라이언트는
    // style의 width:100%/max-width로 반응형 동작한다. (div 래퍼 → 테이블 래퍼)
    const wrapBgHex = /background-color:\s*(#[0-9a-fA-F]{6})/.exec(wrapStyle)?.[1] || '#ffffff'

    const wrapOpen = `<table role="presentation" class="wrap" align="center" width="680" cellpadding="0" cellspacing="0" border="0" bgcolor="${wrapBgHex}" style="${wrapStyle}">
<tr><td style="padding:0;">`
    const wrapClose = `</td></tr></table>`

    // wrapWithDocument가 false면 wrap 테이블로 감싼 콘텐츠만 반환
    if (!wrapWithDocument) {
      return `${wrapOpen}
${fullHtml}
${wrapClose}`
    }

    // wrapWithDocument가 true면 완전한 HTML 문서로 감싸서 반환
    return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <!--[if mso]>
    <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
    <![endif]-->
    <title>Auto Newsletter</title>
    <style>
      table { border-collapse: collapse; }
      img { -ms-interpolation-mode: bicubic; border: 0; outline: none; }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; ">
    ${wrapOpen}
${fullHtml}
    ${wrapClose}
</body>
</html>`
  }

  /**
   * 모듈 미리보기용 콘텐츠 HTML 생성 (기본 속성으로 단발 렌더)
   * - store에 추가하지 않고 모듈 템플릿을 기본값으로 렌더한 콘텐츠만 반환
   * - ModulePanel 호버 미리보기(iframe srcdoc)에서 사용. 기존 replaceModuleContent 스위치 재사용
   */
  const renderModulePreview = async (moduleId: string): Promise<string> => {
    if (availableModules.value.length === 0) {
      await loadAvailableModules()
    }
    const meta = availableModules.value.find((m) => m.id === moduleId)
    if (!meta) throw new Error(`Unknown module: ${moduleId}`)

    const basePath = import.meta.env.BASE_URL || '/'
    const modulePath = normalizePath(`${basePath}modules/${moduleId}.html`)
    const response = await fetch(modulePath)
    if (!response.ok) throw new Error(`Failed to load module HTML: ${response.status}`)
    let html = await response.text()

    const tempModule: ModuleInstance = {
      id: 'preview',
      moduleId,
      order: 0,
      properties: getDefaultProperties(meta),
      styles: {},
    }
    html = await replaceModuleContent(html, tempModule)
    html = resolvePointColorVar(html, useEditorStore().wrapSettings.pointColor)
    html = convertQuillListsToEmailHtml(html)
    html = flattenAlphaColorsInHtml(html, useEditorStore().wrapSettings.backgroundColor)
    html = applyFontFamily(html, useEditorStore().wrapSettings.fontLanguage)
    return sanitizeHtml(html)
  }

  // ============= Helper Functions =============
  const getDefaultProperties = (moduleMetadata: ModuleMetadata): Record<string, unknown> => {
    const props: Record<string, unknown> = {}
    moduleMetadata.editableProps.forEach((prop) => {
      // 🐛 버그 수정 3: default 값이 있으면 우선 사용
      if (prop.default !== undefined) {
        props[prop.key] = prop.default
        return
      }

      switch (prop.type) {
        case 'boolean':
        case 'checkbox':
          props[prop.key] = false
          break
        case 'color':
          props[prop.key] = '#000000'
          break
        case 'number':
          props[prop.key] = 0
          break
        case 'table-rows':
          props[prop.key] = prop.defaultRows || []
          break
        case 'table-editor':
          // 커스텀 테이블의 기본 2x2 셀 생성 (정렬은 열 공통값 tableColAligns로 관리)
          props[prop.key] = [
            [
              { id: generateUniqueId('cell'), type: 'th', content: '항목', colspan: 1, rowspan: 1 },
              { id: generateUniqueId('cell'), type: 'td', content: '내용', colspan: 1, rowspan: 1 },
            ],
            [
              { id: generateUniqueId('cell'), type: 'th', content: '항목', colspan: 1, rowspan: 1 },
              { id: generateUniqueId('cell'), type: 'td', content: '내용', colspan: 1, rowspan: 1 },
            ],
          ]
          // 열 공통 정렬 기본값: 1열 가운데, 2열 왼쪽
          props.tableColAligns = ['center', 'left']
          break
        case 'content-titles':
        case 'content-texts':
        case 'additional-contents':
          props[prop.key] = []
          break
        default:
          props[prop.key] = ''
      }
    })
    return props
  }

  return {
    modules,
    selectedModuleId,
    selectedModule,
    selectedModuleMetadata,
    availableModules,
    availableTemplates,
    isDirty,
    // 그룹
    groups,
    selectedGroupId,
    selectedGroup,
    displayItems,
    createGroup,
    duplicateGroup,
    ungroup,
    deleteGroup,
    selectGroup,
    updateGroupStyle,
    setDisplayOrder,
    moveGroup,
    normalizeGroupContiguity,
    loadAvailableModules,
    loadAvailableTemplates,
    loadTemplate,
    exportCurrentAsTemplate,
    addModule,
    selectModule,
    updateModuleProperty,
    updateModuleStyle,
    removeModule,
    moveModuleUp,
    moveModuleDown,
    duplicateModule,
    clearAll,
    markAsSaved,
    generateHtml,
    renderModulePreview,
    addTableRow,
    updateTableRow,
    removeTableRow,
    // 커스텀 테이블 셀 관리
    initializeTableCells,
    addTableCellRow,
    addTableCellColumn,
    removeTableCellRow,
    removeTableCellColumn,
    updateTableCell,
    updateTableColWidth,
    updateTableColAlign,
    mergeCells,
    unmergeCell,
    toggleCellType,
    applyTablePreset,
    addContentTitle,
    updateContentTitle,
    removeContentTitle,
    addContentText,
    updateContentText,
    removeContentText,
    loadContentTemplate,
    addAdditionalContent,
    updateAdditionalContent,
    removeAdditionalContent,
    moveAdditionalContentUp,
    moveAdditionalContentDown,
    applyDataToTemplate,
    insertAdditionalContents,
  }
})
