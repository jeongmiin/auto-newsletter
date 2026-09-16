import type { EditableProp, ModuleInstance, ModuleMetadata } from '@/types'
import { sanitizeHtml } from '@/utils/sanitize'

export type TranslationLanguage = 'en' | 'ja' | 'zh-Hans'
export type TranslationPath = Array<string | number>

/**
 * 번역할 값 하나 — **편집 필드 하나가 카드 하나**다.
 *
 * 에디터에 쓴 글은 문장마다 쪼개지 않는다. 값 하나를 통째로 번역기에 보내므로 앞뒤 문맥이
 * 함께 가 번역이 자연스럽고, 화면에도 쓴 모양 그대로 한 덩어리로 보이고 한 번에 고칠 수 있다.
 *
 * 리치 텍스트는 **태그째**(format: 'html') 보낸다. 번역기가 태그를 제자리에 돌려주므로
 * 굵게·색상·링크가 살아 돌아온다. 사람에게는 태그를 뺀 평문(`source`)만 보여 주고,
 * 고치지 않았으면 돌려받은 HTML을 그대로 쓴다(`applyTranslationChanges` 참고).
 *
 * 다만 뉴스레터 HTML은 `style="…"`이 길어 그대로 보내면 글자 수가 6배쯤 된다(번역기는 태그도
 * 글자로 센다). 그래서 **속성을 떼고 번호만 남긴 뼈대**를 보내고, 돌아온 뒤 번호를 보고
 * 원래 속성을 되붙인다(`toSkeleton`/`restoreSkeleton`). 서식은 그대로 살면서 전송량은 2배대로 준다.
 */
export interface TranslationUnit {
  id: string
  moduleInstanceId: string
  moduleName: string
  /** 카드 아이콘용 — 모듈 카테고리(image·text·button·table …) */
  category: string
  propertyLabel: string
  /** 모듈 이름만으로 어느 값인지 알 수 없을 때만 (이미지 설명 · 1행 1열 …) */
  badge?: string
  path: TranslationPath
  /** 사람이 읽고 고치는 원문 — 블록(문단) 하나가 한 줄이다 */
  source: string
  /** 리치 텍스트면 번역기에 보낼 **뼈대** HTML(속성을 뗀 것). 평문 값이면 없다. */
  sourceHtml?: string
  /** 리치 텍스트면 손대지 않은 원래 HTML — 번역 결과에 속성을 되붙일 때 기준이 된다 */
  originalHtml?: string
}

export interface TranslationChange extends TranslationUnit {
  /** 사람이 읽고 고치는 번역문 — 원문과 같은 줄 구조 */
  translated: string
  /** 번역기가 태그째 돌려준 HTML. 사람이 번역문을 고치지 않았으면 이걸 그대로 쓴다. */
  translatedHtml?: string
}

/** 블록(문단)을 한 원문으로 잇는 구분자 */
const LINE_SEPARATOR = '\n'

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

/** 글이 든 텍스트 노드만 모은다. style/script 안은 글이 아니라 뺀다. */
function textNodesIn(root: HTMLElement): Text[] {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement?.tagName
    if (parent === 'STYLE' || parent === 'SCRIPT') continue
    nodes.push(node as Text)
  }
  return nodes
}

const parseBody = (html: string): HTMLElement =>
  new DOMParser().parseFromString(html, 'text/html').body

/** 한 줄이 되는 덩어리 — 문단·목록 항목·표 칸처럼 줄바꿈으로 끊기는 요소 */
const BLOCK_SELECTOR = 'p,div,li,h1,h2,h3,h4,h5,h6,blockquote,pre,td,th'

/**
 * 줄로 끊어 읽을 블록 목록.
 *
 * 블록 안에 또 블록이 있으면 바깥쪽은 세지 않는다(같은 글이 두 번 나오지 않게).
 * 문단 태그가 아예 없는 값(인라인만 있는 짧은 글)은 전체를 한 줄로 본다.
 */
function blockElements(body: HTMLElement): HTMLElement[] {
  const leaves = [...body.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)].filter(
    (el) => !el.querySelector(BLOCK_SELECTOR),
  )
  return leaves.length ? leaves : [body]
}

/** 사람이 읽을 줄 목록 — 블록 하나가 한 줄(빈 문단은 빈 줄로 남아 문단 사이가 벌어진다) */
function htmlToLines(html: string): string[] {
  return blockElements(parseBody(html)).map((el) =>
    (el.textContent ?? '').replace(/ /g, ' ').trim(),
  )
}

/** 사람이 읽을 평문 — 번역문 칸에 그대로 넣는다 */
export function htmlToPlainText(html: string): string {
  return htmlToLines(html).join(LINE_SEPARATOR)
}

/** 뼈대에서 원래 속성을 찾아갈 번호를 담는 자리 */
const SKELETON_INDEX_ATTR = 'i'

/**
 * 속성을 떼고 번호만 남긴 **뼈대 HTML**을 만든다.
 *
 * `<p style="margin:0;font-size:15px;line-height:1.6;color:#4e5968">` 같은 긴 속성이
 * 통째로 번역기 글자 수에 잡히므로, 보낼 때는 `<p i="3">`으로 줄인다.
 * 태그 이름과 구조는 그대로라 번역기가 서식을 제자리에 두는 데 문제가 없다.
 */
export function toSkeleton(html: string): { html: string; attrs: Array<Array<[string, string]>> } {
  const body = parseBody(html)
  const attrs: Array<Array<[string, string]>> = []
  for (const el of body.querySelectorAll('*')) {
    const own = [...el.attributes].map((attr) => [attr.name, attr.value] as [string, string])
    for (const [name] of own) el.removeAttribute(name)
    el.setAttribute(SKELETON_INDEX_ATTR, String(attrs.length))
    attrs.push(own)
  }
  return { html: body.innerHTML, attrs }
}

/**
 * 번역기가 돌려준 뼈대에 원래 속성을 되붙인다.
 *
 * 번호로 찾으므로 번역기가 태그 순서를 바꿔도 제 속성을 되찾는다. 번호가 없거나 모르는
 * 번호면 속성 없이 둔다 — 서식 하나를 잃을지언정 엉뚱한 서식이 붙는 일은 없다.
 */
export function restoreSkeleton(html: string, attrs: Array<Array<[string, string]>>): string {
  const body = parseBody(html)
  for (const el of body.querySelectorAll('*')) {
    // ⚠ Number(null)·Number('')은 0이다 — 번호가 없는 태그에 0번 속성이 붙지 않게 숫자만 받는다
    const raw = el.getAttribute(SKELETON_INDEX_ATTR)
    el.removeAttribute(SKELETON_INDEX_ATTR)
    const own = raw !== null && /^\d+$/.test(raw) ? attrs[Number(raw)] : undefined
    if (!own) continue
    for (const [name, value] of own) {
      // 번역기가 속성 이름을 망가뜨려 돌려주는 경우가 있어 한 칸씩 막아 둔다
      try {
        el.setAttribute(name, value)
      } catch {
        /* 이 속성만 건너뛴다 */
      }
    }
  }
  return body.innerHTML
}

/** 텍스트 노드 값을 (앞 공백, 본문, 뒤 공백)으로 나눈다 — 번역 후 공백을 원래대로 되살리기 위해 */
const splitWhitespace = (value: string): [string, string, string] => {
  const text = value.trim()
  if (!text) return [value, '', '']
  const start = value.indexOf(text)
  return [value.slice(0, start), text, value.slice(start + text.length)]
}

/** 한 모듈에서 값을 훑는 동안 바뀌지 않는 것들 */
interface UnitContext {
  module: ModuleInstance
  moduleName: string
  category: string
}

function pushString(
  units: TranslationUnit[],
  ctx: UnitContext,
  propertyLabel: string,
  badge: string | undefined,
  path: TranslationPath,
  value: unknown,
): void {
  if (typeof value !== 'string' || !KOREAN_TEXT.test(value)) return
  const base = {
    id: `${ctx.module.id}:${path.join('.')}`,
    moduleInstanceId: ctx.module.id,
    moduleName: ctx.moduleName,
    category: ctx.category,
    propertyLabel,
    path,
    ...(badge ? { badge } : {}),
  }

  if (!isHtml(value)) {
    units.push({ ...base, source: value })
    return
  }

  // 리치 텍스트 — 값 하나가 카드 한 장. 사람에겐 평문, 번역기에는 속성을 뗀 뼈대를 보낸다.
  const source = htmlToPlainText(value)
  if (!source.trim()) return
  units.push({ ...base, source, sourceHtml: toSkeleton(value).html, originalHtml: value })
}

function collectStructured(
  units: TranslationUnit[],
  ctx: UnitContext,
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
        const where = `${rowIndex + 1}행 ${colIndex + 1}열`
        pushString(
          units,
          ctx,
          `${prop.label} ${where}`,
          where,
          [...root, rowIndex, colIndex, 'content'],
          (cell as { content?: unknown }).content,
        )
        pushString(
          units,
          ctx,
          `${prop.label} 이미지 설명`,
          `${where} 이미지 설명`,
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
        ctx,
        `${prop.label} ${index + 1}`,
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
          ctx,
          `${prop.label} ${index + 1}`,
          `${prop.label} ${index + 1}`,
          [...root, index, 'data', key],
          nestedValue,
        ),
      )
    }
  })
}

/**
 * 배지를 붙일 값인지.
 *
 * 모듈 이름만 보면 무엇을 고치는지 알 수 없는 값에만 붙인다 — 이미지의 '이미지 설명'이 그렇다.
 * 본문 텍스트나 버튼 문구처럼 모듈 이름이 곧 그 값인 경우에는 붙이지 않는다(Figma 1671-4504).
 */
const ALT_KEY = /alt$/i
const propBadge = (prop: EditableProp): string | undefined =>
  ALT_KEY.test(prop.key) ? prop.label : undefined

/** 캔버스의 모든 모듈에서 실제 한국어가 들어 있는 편집 필드를 값 단위로 수집한다. */
export function collectTranslationUnits(
  modules: ModuleInstance[],
  metadata: ModuleMetadata[],
): TranslationUnit[] {
  const units: TranslationUnit[] = []
  for (const module of modules) {
    const meta = metadata.find((item) => item.id === module.moduleId)
    if (!meta) continue
    const ctx: UnitContext = { module, moduleName: meta.name, category: meta.category }
    for (const prop of meta.editableProps) {
      if (!isTranslatableProp(prop)) continue
      const value = module.properties[prop.key]
      if (typeof value === 'string') {
        pushString(units, ctx, prop.label, propBadge(prop), ['properties', prop.key], value)
      } else {
        collectStructured(units, ctx, prop, value)
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

/**
 * 블록 하나의 글자를 주어진 한 줄로 바꾼다.
 *
 * 글자가 한 군데뿐이면(대부분의 문단) 그 자리만 갈아 끼우므로 서식이 그대로 남는다.
 * 굵게·링크로 여러 조각이 난 문단은 어느 조각이 번역문의 어디에 해당하는지 알 수 없어
 * **한 자리에 몰아넣는다**. 이때 `<strong>` 안에 넣으면 줄 전체가 굵어지므로,
 * 블록 바로 아래에 있는 자리를 먼저 고른다.
 */
function setBlockLine(block: HTMLElement, line: string): void {
  const nodes = textNodesIn(block)
  if (!nodes.length) {
    if (line) block.textContent = line
    return
  }
  const target = nodes.find((node) => node.parentElement === block) ?? nodes[0]!
  const [leading, , trailing] = splitWhitespace(target.data)
  for (const node of nodes) if (node !== target) node.data = ''
  target.data = `${leading}${line}${trailing}`
}

/** 사람이 고친 줄들을 원래 문단 자리에 되돌린다. 줄이 모자라면 남는 문단은 그대로 둔다. */
function replaceBlockLines(html: string, lines: string[]): string {
  const body = parseBody(html)
  blockElements(body).forEach((block, index) => {
    const line = lines[index]
    if (line === undefined) return
    setBlockLine(block, line)
  })
  return sanitizeHtml(body.innerHTML)
}

/**
 * 번역 화면에서 확정된 값을 모듈 복사본에 적용한다.
 *
 * 리치 텍스트는 두 갈래다.
 * - **번역문을 고치지 않았으면** 번역기가 돌려준 뼈대에 원래 속성을 되붙여 쓴다 → 굵게·색상·링크가 그대로다.
 * - **고쳤으면** 사람이 쓴 글이 우선이므로 줄 단위로 되돌린다. 이때 한 문단 안에서 굵게로 쪼개져
 *   있던 서식은 한 자리로 모인다(어느 조각이 번역문의 어디인지 알 수 없으므로).
 */
export function applyTranslationChanges(
  modules: ModuleInstance[],
  changes: TranslationChange[],
): ModuleInstance[] {
  const cloned = JSON.parse(JSON.stringify(modules)) as ModuleInstance[]
  const byId = new Map(cloned.map((module) => [module.id, module]))

  for (const change of changes) {
    const module = byId.get(change.moduleInstanceId)
    if (!module) continue
    const parent = resolveParent(module, change.path)
    const key = change.path[change.path.length - 1]
    if (!parent || key === undefined) continue

    if (!change.originalHtml) {
      parent[key] = change.translated
      continue
    }
    const current = parent[key]
    if (typeof current !== 'string') continue

    const untouched =
      change.translatedHtml !== undefined &&
      htmlToPlainText(change.translatedHtml) === change.translated
    parent[key] = untouched
      ? sanitizeHtml(restoreSkeleton(change.translatedHtml!, toSkeleton(change.originalHtml).attrs))
      : replaceBlockLines(current, change.translated.split(LINE_SEPARATOR))
  }

  return cloned
}
