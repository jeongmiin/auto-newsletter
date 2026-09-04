import type { EditableProp, ModuleInstance, ModuleMetadata } from '@/types'
import { sanitizeHtml } from '@/utils/sanitize'

export type TranslationLanguage = 'en' | 'ja' | 'zh-Hans'
export type TranslationScope = 'all' | 'group' | 'module'
export type TranslationFormat = 'plain' | 'html'
export type TranslationPath = Array<string | number>

export interface TranslationUnit {
  id: string
  moduleInstanceId: string
  moduleName: string
  propertyLabel: string
  path: TranslationPath
  source: string
  format: TranslationFormat
}

export interface TranslationChange extends TranslationUnit {
  translated: string
}

interface CollectOptions {
  scope: TranslationScope
  selectedModuleId?: string | null
  selectedGroupId?: string | null
}

const TRANSLATABLE_KEY = /(text|title|description|content|label|alt|summary|companyinfo|header)$/i
const NON_CONTENT_KEY = /(font|size|color|width|height|padding|margin|radius|border|lineheight|url|email)$/i
const KOREAN_TEXT = /[가-힣ㄱ-ㅎㅏ-ㅣ]/

const isHtml = (value: string): boolean => /<([a-z][\w-]*)(?:\s[^>]*)?>/i.test(value)

/**
 * modules-config의 `translatable` 명시값을 우선하고, 기존 설정에는 안전한 키 규칙을 적용한다.
 * text 타입에는 px·색상·URL도 섞여 있어 타입만 보고 번역하면 레이아웃이 깨진다.
 */
export function isTranslatableProp(prop: EditableProp): boolean {
  if (prop.translatable !== undefined) return prop.translatable
  if (prop.type === 'textarea') return true
  if (prop.type === 'text') {
    return TRANSLATABLE_KEY.test(prop.key) && !NON_CONTENT_KEY.test(prop.key)
  }
  return [
    'table-rows',
    'content-titles',
    'content-texts',
    'additional-contents',
    'table-editor',
  ].includes(prop.type)
}

function pushString(
  units: TranslationUnit[],
  module: ModuleInstance,
  moduleName: string,
  propertyLabel: string,
  path: TranslationPath,
  value: unknown,
): void {
  if (typeof value !== 'string' || !KOREAN_TEXT.test(value)) return
  units.push({
    id: `${module.id}:${path.join('.')}`,
    moduleInstanceId: module.id,
    moduleName,
    propertyLabel,
    path,
    source: value,
    format: isHtml(value) ? 'html' : 'plain',
  })
}

function collectStructured(
  units: TranslationUnit[],
  module: ModuleInstance,
  moduleName: string,
  prop: EditableProp,
  value: unknown,
): void {
  if (!Array.isArray(value)) return
  const root = ['properties', prop.key]

  if (prop.type === 'table-editor') {
    value.forEach((row, rowIndex) => {
      if (!Array.isArray(row)) return
      row.forEach((cell, colIndex) => {
        if (!cell || typeof cell !== 'object' || (cell as { hidden?: boolean }).hidden) return
        pushString(
          units,
          module,
          moduleName,
          `${prop.label} ${rowIndex + 1}행 ${colIndex + 1}열`,
          [...root, rowIndex, colIndex, 'content'],
          (cell as { content?: unknown }).content,
        )
        pushString(
          units,
          module,
          moduleName,
          `${prop.label} 이미지 설명`,
          [...root, rowIndex, colIndex, 'imageAlt'],
          (cell as { imageAlt?: unknown }).imageAlt,
        )
      })
    })
    return
  }

  value.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const record = item as Record<string, unknown>
    const keys =
      prop.type === 'table-rows'
        ? ['header', 'data']
        : prop.type === 'content-titles'
          ? ['text']
          : prop.type === 'content-texts'
            ? ['content']
            : []

    keys.forEach((key) =>
      pushString(
        units,
        module,
        moduleName,
        `${prop.label} ${index + 1}`,
        [...root, index, key],
        record[key],
      ),
    )

    // additional-contents는 HTML 골격이 아니라 사용자가 채운 data만 번역한다.
    if (prop.type === 'additional-contents' && record.data && typeof record.data === 'object') {
      Object.entries(record.data as Record<string, unknown>).forEach(([key, nestedValue]) =>
        pushString(
          units,
          module,
          moduleName,
          `${prop.label} ${index + 1}`,
          [...root, index, 'data', key],
          nestedValue,
        ),
      )
    }
  })
}

/** 현재 범위에서 실제 한국어가 들어 있는 편집 필드만 수집한다. */
export function collectTranslationUnits(
  modules: ModuleInstance[],
  metadata: ModuleMetadata[],
  options: CollectOptions,
): TranslationUnit[] {
  const selectedModule = modules.find((module) => module.id === options.selectedModuleId)
  const effectiveGroupId = options.selectedGroupId ?? selectedModule?.groupId ?? null
  const targets = modules.filter((module) => {
    if (options.scope === 'module') return module.id === options.selectedModuleId
    if (options.scope === 'group') return !!effectiveGroupId && module.groupId === effectiveGroupId
    return true
  })

  const units: TranslationUnit[] = []
  for (const module of targets) {
    const meta = metadata.find((item) => item.id === module.moduleId)
    if (!meta) continue
    for (const prop of meta.editableProps) {
      if (!isTranslatableProp(prop)) continue
      const value = module.properties[prop.key]
      if (typeof value === 'string') {
        pushString(
          units,
          module,
          meta.name,
          prop.label,
          ['properties', prop.key],
          value,
        )
      } else {
        collectStructured(units, module, meta.name, prop, value)
      }
    }
  }
  return units
}

/** 번역 미리보기에서 확정된 값을 모듈 복사본에 적용한다. */
export function applyTranslationChanges(
  modules: ModuleInstance[],
  changes: TranslationChange[],
): ModuleInstance[] {
  const cloned = JSON.parse(JSON.stringify(modules)) as ModuleInstance[]
  const byId = new Map(cloned.map((module) => [module.id, module]))

  for (const change of changes) {
    let cursor: unknown = byId.get(change.moduleInstanceId)
    if (!cursor) continue
    let validPath = true
    for (let index = 0; index < change.path.length - 1; index += 1) {
      const key = change.path[index]
      if (typeof cursor !== 'object' || cursor === null) {
        validPath = false
        break
      }
      cursor = (cursor as Record<string | number, unknown>)[key]
    }
    const last = change.path[change.path.length - 1]
    if (validPath && typeof cursor === 'object' && cursor !== null && last !== undefined) {
      ;(cursor as Record<string | number, unknown>)[last] =
        change.format === 'html' ? sanitizeHtml(change.translated) : change.translated
    }
  }
  return cloned
}
