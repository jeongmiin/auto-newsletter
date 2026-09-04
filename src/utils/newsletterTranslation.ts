import type { EditableProp, ModuleInstance, ModuleMetadata } from '@/types'
import { sanitizeHtml } from '@/utils/sanitize'

export type TranslationLanguage = 'en' | 'ja' | 'zh-Hans'
export type TranslationPath = Array<string | number>

/**
 * 번역할 문장 하나.
 *
 * HTML 값(리치 텍스트)은 통째로 보내지 않고 **글자가 들어 있는 텍스트 노드**만 따로 뽑는다.
 * 그래서 번역기에는 태그·인라인 스타일이 전혀 가지 않고, 미리보기에도 글자만 보이며,
 * 적용할 때는 같은 자리의 텍스트 노드만 바꿔 넣어 서식이 그대로 남는다.
 * `textNodeIndex`가 있으면 그 값은 HTML 속성 안 n번째 텍스트 노드다.
 */
export interface TranslationUnit {
  id: string
  moduleInstanceId: string
  moduleName: string
  propertyLabel: string
  path: TranslationPath
  source: string
  textNodeIndex?: number
}

export interface TranslationChange extends TranslationUnit {
  translated: string
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

/** HTML 문자열을 DOM으로 읽고 (문서 조각의 body, 텍스트 노드 목록)을 돌려준다. style/script 안은 글이 아니라 뺀다. */
function parseTextNodes(html: string): { body: HTMLElement; nodes: Text[] } {
  const body = new DOMParser().parseFromString(html, 'text/html').body
  const walker = body.ownerDocument.createTreeWalker(body, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement?.tagName
    if (parent === 'STYLE' || parent === 'SCRIPT') continue
    nodes.push(node as Text)
  }
  return { body, nodes }
}

/** 텍스트 노드 값을 (앞 공백, 본문, 뒤 공백)으로 나눈다 — 번역 후 공백을 원래대로 되살리기 위해 */
const splitWhitespace = (value: string): [string, string, string] => {
  const text = value.trim()
  if (!text) return [value, '', '']
  const start = value.indexOf(text)
  return [value.slice(0, start), text, value.slice(start + text.length)]
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
  const base = { moduleInstanceId: module.id, moduleName, path }

  if (!isHtml(value)) {
    units.push({ ...base, id: `${module.id}:${path.join('.')}`, propertyLabel, source: value })
    return
  }

  // 리치 텍스트 — 한국어가 든 텍스트 노드만 문장으로 뽑는다. 같은 속성에서 여러 개가 나오면 번호를 붙여 구분한다.
  const { nodes } = parseTextNodes(value)
  const picked = nodes
    .map((node, index) => ({ index, text: splitWhitespace(node.data)[1] }))
    .filter(({ text }) => KOREAN_TEXT.test(text))
  picked.forEach(({ index, text }, order) => {
    units.push({
      ...base,
      id: `${module.id}:${path.join('.')}#${index}`,
      propertyLabel: picked.length > 1 ? `${propertyLabel} ${order + 1}` : propertyLabel,
      source: text,
      textNodeIndex: index,
    })
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

/** 캔버스의 모든 모듈에서 실제 한국어가 들어 있는 편집 필드만 문장 단위로 수집한다. */
export function collectTranslationUnits(
  modules: ModuleInstance[],
  metadata: ModuleMetadata[],
): TranslationUnit[] {
  const units: TranslationUnit[] = []
  for (const module of modules) {
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

/** 경로의 마지막 앞까지 따라가 값을 담고 있는 객체를 돌려준다. 경로가 끊겨 있으면 null. */
function resolveParent(
  root: ModuleInstance,
  path: TranslationPath,
): Record<string | number, unknown> | null {
  let cursor: unknown = root
  for (let index = 0; index < path.length - 1; index += 1) {
    if (typeof cursor !== 'object' || cursor === null) return null
    cursor = (cursor as Record<string | number, unknown>)[path[index]!]
  }
  return typeof cursor === 'object' && cursor !== null
    ? (cursor as Record<string | number, unknown>)
    : null
}

/** HTML 속성 하나에 들어갈 텍스트 노드 교체분을 모두 적용해 새 HTML을 만든다. 태그·스타일은 그대로다. */
function replaceTextNodes(html: string, replacements: Map<number, string>): string {
  const { body, nodes } = parseTextNodes(html)
  replacements.forEach((translated, index) => {
    const node = nodes[index]
    if (!node) return
    const [leading, , trailing] = splitWhitespace(node.data)
    node.data = `${leading}${translated}${trailing}`
  })
  return sanitizeHtml(body.innerHTML)
}

/** 번역 미리보기에서 확정된 값을 모듈 복사본에 적용한다. */
export function applyTranslationChanges(
  modules: ModuleInstance[],
  changes: TranslationChange[],
): ModuleInstance[] {
  const cloned = JSON.parse(JSON.stringify(modules)) as ModuleInstance[]
  const byId = new Map(cloned.map((module) => [module.id, module]))

  // HTML 속성은 텍스트 노드 여러 개가 한 값에 모이므로, 속성별로 묶어 한 번에 다시 쓴다.
  const htmlEdits = new Map<
    string,
    { parent: Record<string | number, unknown>; key: string | number; nodes: Map<number, string> }
  >()

  for (const change of changes) {
    const module = byId.get(change.moduleInstanceId)
    if (!module) continue
    const parent = resolveParent(module, change.path)
    const key = change.path[change.path.length - 1]
    if (!parent || key === undefined) continue

    if (change.textNodeIndex === undefined) {
      parent[key] = change.translated
      continue
    }
    const editKey = `${change.moduleInstanceId}:${change.path.join('.')}`
    const edit = htmlEdits.get(editKey) ?? { parent, key, nodes: new Map<number, string>() }
    edit.nodes.set(change.textNodeIndex, change.translated)
    htmlEdits.set(editKey, edit)
  }

  htmlEdits.forEach(({ parent, key, nodes }) => {
    const current = parent[key]
    if (typeof current !== 'string') return
    parent[key] = replaceTextNodes(current, nodes)
  })

  return cloned
}
