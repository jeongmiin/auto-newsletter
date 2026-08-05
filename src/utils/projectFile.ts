/**
 * 재편집용 HTML 파일(프로젝트 메타데이터) 저장·복원.
 *
 * "저장용 내려받기"는 본문 HTML 끝에 현재 모듈 구성을 JSON 주석으로 붙이고,
 * "파일 열기"는 그 주석을 다시 읽어 작업 영역을 되살린다.
 * 저장과 복원이 **정확히 같은 필드 집합**을 다뤄야 왕복(저장→열기)이 깨지지 않으므로 한 파일에 둔다.
 */
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { migrateModuleProperties } from '@/utils/moduleMigrations'
import {
  convertLegacyToComposed,
  isConvertibleToComposed,
  canInlineIntoGroup,
} from '@/utils/legacyToComposed'
import type { ModuleGroup, ModuleInstance } from '@/types'

export const METADATA_START = '<!-- AUTO_NEWSLETTER_METADATA_START -->'
export const METADATA_END = '<!-- AUTO_NEWSLETTER_METADATA_END -->'

/** 저장 파일에 담기는 모듈 한 개 */
export interface ProjectModuleData {
  moduleId: string
  order: number
  properties: Record<string, unknown>
  styles: Record<string, unknown>
  groupId?: string
  rowIndex?: number
  columnIndex?: number
  fullWidth?: boolean
}

export interface ProjectMetadata {
  modules: ProjectModuleData[]
  groups?: ModuleGroup[]
  wrapSettings?: {
    backgroundColor: string
    borderWidth: string
    borderColor: string
    borderStyle: string
  }
}

/**
 * 모듈 인스턴스 → 저장 파일용 데이터.
 *
 * ⚠ `groupId`만 저장하면 안 된다. 그룹 안 배치(`rowIndex`/`columnIndex`)가 빠지면
 * 다시 열었을 때 모든 멤버가 0번 컬럼으로 몰려 2단 구성이 무너진다(한쪽 컬럼이 빈 칸이 됨).
 */
export const serializeModule = (m: ModuleInstance): ProjectModuleData => ({
  moduleId: m.moduleId,
  order: m.order,
  properties: m.properties,
  styles: { ...m.styles },
  ...(m.groupId ? { groupId: m.groupId } : {}),
  ...(m.rowIndex != null ? { rowIndex: m.rowIndex } : {}),
  ...(m.columnIndex != null ? { columnIndex: m.columnIndex } : {}),
  ...(m.fullWidth ? { fullWidth: true } : {}),
})

/** HTML 파일에서 프로젝트 메타데이터 주석을 뽑아낸다. 없거나 깨졌으면 null. */
export const extractProjectMetadata = (htmlContent: string): ProjectMetadata | null => {
  const startIndex = htmlContent.indexOf(METADATA_START)
  const endIndex = htmlContent.indexOf(METADATA_END)
  if (startIndex === -1 || endIndex === -1) return null

  const section = htmlContent.substring(startIndex + METADATA_START.length, endIndex).trim()
  const jsonMatch = /<!--\s*([\s\S]*?)\s*-->/.exec(section)
  if (!jsonMatch) return null

  try {
    const metadata = JSON.parse(jsonMatch[1].trim())
    // 아주 예전 파일은 modules 배열만 저장했다
    if (Array.isArray(metadata)) return { modules: metadata }
    return metadata as ProjectMetadata
  } catch {
    return null
  }
}

export interface RestoreResult {
  restoredCount: number
  /** 새 편집 방식(원소 모듈 그룹)으로 바꿔 넣은 개수 */
  convertedCount: number
  /** 원본과 달라진 부분 안내 */
  warnings: string[]
}

/**
 * 메타데이터를 현재 작업 영역에 복원한다.
 * @param toComposed true면 예전 편집 방식 모듈을 원소 모듈 그룹으로 바꿔 넣는다
 */
export function restoreProject(
  projectData: ProjectMetadata,
  toComposed: boolean,
): RestoreResult {
  const moduleStore = useModuleStore()
  const editorStore = useEditorStore()

  moduleStore.clearAll()
  if (projectData.wrapSettings) {
    editorStore.updateWrapSettings(projectData.wrapSettings)
  }

  let restoredCount = 0
  let convertedCount = 0
  const warnings = new Set<string>()

  const ordered = [...projectData.modules].sort((a, b) => a.order - b.order)

  /**
   * 한 모듈을 새 편집 방식(원소 모듈)으로 바꿔 넣어본다.
   *
   * 이미 그룹에 속해 있어도 변환한다 — 그룹은 "이미 새 방식"이라는 뜻이 아니라
   * 사용자가 직접 묶어둔 묶음일 수도 있기 때문. 그룹 안 모듈은 세 갈래로 갈린다:
   *  1) 그룹 안에 그대로 풀어 넣을 수 있으면 → 그 그룹의 원소로 편입 (사용자 묶음 유지)
   *  2) 못 넣지만 그룹 **양 끝**이면 → 자기 그룹으로 떼어낸다. 그룹 멤버는 항상 연속 배치되므로
   *     (normalizeGroupContiguity) 가운데 모듈을 떼면 형제들이 당겨지며 순서가 뒤집히지만,
   *     양 끝은 떼어내도 순서가 그대로다. (푸터·헤더처럼 쪼개야 하는 모듈은 거의 항상 양 끝)
   *  3) 둘 다 아니면 → 변환하지 않는다
   *
   * @returns 변환해 넣었으면 true (호출부는 예전 방식 복원을 건너뛴다)
   */
  const tryConvert = (index: number, props: Record<string, unknown>): boolean => {
    const moduleData = ordered[index]
    if (!isConvertibleToComposed(moduleData.moduleId)) return false

    const conversion = convertLegacyToComposed(moduleData.moduleId, props)
    if (!conversion) return false

    const groupId = moduleData.groupId
    const canInline = canInlineIntoGroup(conversion)
    const isEdgeOfGroup =
      !!groupId &&
      (ordered[index - 1]?.groupId !== groupId || ordered[index + 1]?.groupId !== groupId)

    if (groupId && !canInline && !isEdgeOfGroup) {
      warnings.add(
        `${conversion.name}: 묶어둔 그룹 가운데에 있어 예전 방식 그대로 두었습니다. 그룹을 해제한 뒤 다시 열면 나눠집니다.`,
      )
      return false
    }

    moduleStore.addComposedConversion(
      conversion,
      groupId && canInline
        ? {
            groupId,
            rowIndex: moduleData.rowIndex ?? 0,
            columnIndex: moduleData.columnIndex ?? 0,
          }
        : undefined,
    )
    conversion.warnings?.forEach((w) => warnings.add(w))
    // 변환이 그룹을 만들면 createGroup이 그 그룹을 '선택' 상태로 둔다. 그대로 두면 다음 모듈이
    // addModule의 "선택 그룹 바로 아래 삽입" 규칙에 걸려 엉뚱한 자리에 끼어든다.
    moduleStore.clearSelection()
    return true
  }

  for (let i = 0; i < ordered.length; i++) {
    const moduleData = ordered[i]
    const migratedProps = migrateModuleProperties(moduleData.moduleId, moduleData.properties || {})

    if (toComposed && tryConvert(i, migratedProps)) {
      restoredCount++
      convertedCount++
      continue
    }

    // ── 저장된 그대로 복원 ──
    const moduleMetadata = moduleStore.availableModules.find((m) => m.id === moduleData.moduleId)
    if (!moduleMetadata) continue

    // addModule은 선택 상태에 따라 삽입 위치를 바꾼다 —
    //  · 선택 모듈이 그룹에 속하면 새 모듈도 그 그룹 안에 넣고(조립형 편집 규칙)
    //  · 그룹이 선택돼 있으면 그 그룹 '바로 아래'에 넣는다.
    // 임포트에서는 둘 다 방금 넣은 것을 가리키고 있어 다음 모듈이 엉뚱한 자리에 끼어든다
    // → 선택을 통째로 비워 항상 맨 끝에 붙게 한다.
    moduleStore.clearSelection()
    moduleStore.addModule(moduleMetadata)
    const addedModule = moduleStore.modules[moduleStore.modules.length - 1]

    Object.entries(migratedProps).forEach(([key, value]) => {
      addedModule.properties[key] = value
    })
    if (moduleData.styles) {
      Object.entries(moduleData.styles).forEach(([key, value]) => {
        ;(addedModule.styles as Record<string, unknown>)[key] = value
      })
    }

    // 그룹 소속·컬럼 배치 복원 (그룹 정의는 아래에서 일괄 복원).
    // 저장 파일에 없는 값은 '지운다' — 남겨두면 addModule이 채워 넣은 값이 살아남는다.
    if (moduleData.groupId) addedModule.groupId = moduleData.groupId
    else delete addedModule.groupId
    if (moduleData.rowIndex != null) addedModule.rowIndex = moduleData.rowIndex
    else delete addedModule.rowIndex
    if (moduleData.columnIndex != null) addedModule.columnIndex = moduleData.columnIndex
    else delete addedModule.columnIndex
    if (moduleData.fullWidth) addedModule.fullWidth = true
    else delete addedModule.fullWidth

    restoredCount++
  }

  // 저장돼 있던 그룹 정의 복원 후 연속성 정리.
  // (변환으로 새로 만든 그룹은 addComposedConversion이 이미 등록했으므로 덮어쓰지 않고 이어붙인다)
  if (projectData.groups && projectData.groups.length > 0) {
    const restoredGroups: ModuleGroup[] = JSON.parse(JSON.stringify(projectData.groups))
    const existingIds = new Set(moduleStore.groups.map((g) => g.id))
    moduleStore.groups = [
      ...moduleStore.groups,
      ...restoredGroups.filter((g) => !existingIds.has(g.id)),
    ]
    moduleStore.normalizeGroupContiguity()
  }

  if (moduleStore.modules.length > 0) {
    moduleStore.selectModule(moduleStore.modules[0].id)
  }

  return { restoredCount, convertedCount, warnings: [...warnings] }
}
