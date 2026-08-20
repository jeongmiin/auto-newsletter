/**
 * 푸터 연락처 줄(H 홈페이지 · T 전화 · E 이메일 · F 팩스) 항목 정의.
 *
 * 예전에는 show 플래그와 값 속성이 따로 있고 순서는 템플릿에 고정돼 있었다.
 * 이제 `properties.contactItems`(순서 있는 배열)가 노출·순서·값을 모두 담는다.
 * 값은 하위호환을 위해 기존 키(websiteUrl/phone/email/fax)에도 함께 기록한다.
 */
export type ContactItemKey = 'website' | 'phone' | 'email' | 'fax'

export interface ContactItem {
  key: ContactItemKey
  show: boolean
  value: string
}

export const CONTACT_ITEM_META: Record<
  ContactItemKey,
  { label: string; prefix: string; legacyKey: string; legacyShowKey: string; placeholder: string }
> = {
  website: {
    label: '홈페이지',
    prefix: 'H',
    legacyKey: 'websiteUrl',
    legacyShowKey: 'showWebsite',
    placeholder: 'www.example.com',
  },
  phone: {
    label: '전화',
    prefix: 'T',
    legacyKey: 'phone',
    legacyShowKey: 'showPhone',
    placeholder: '02-0000-0000',
  },
  email: {
    label: '이메일',
    prefix: 'E',
    legacyKey: 'email',
    legacyShowKey: 'showEmail',
    placeholder: 'name@example.com',
  },
  fax: {
    label: '팩스',
    prefix: 'F',
    legacyKey: 'fax',
    legacyShowKey: 'showFax',
    placeholder: '02-0000-0000',
  },
}

/** 기본 순서 (기존 템플릿 순서와 동일) */
export const CONTACT_ITEM_ORDER: ContactItemKey[] = ['website', 'phone', 'email', 'fax']

/**
 * 구버전 속성(show 플래그와 값)에서 항목 배열을 만든다.
 * 노출 기본값: 홈페이지·전화·이메일은 표시, 팩스는 숨김(기존 동작과 동일).
 */
export function defaultContactItems(properties: Record<string, unknown> = {}): ContactItem[] {
  return CONTACT_ITEM_ORDER.map((key) => {
    const meta = CONTACT_ITEM_META[key]
    const legacyShow = properties[meta.legacyShowKey]
    const show = key === 'fax' ? legacyShow === true : legacyShow !== false
    const raw = properties[meta.legacyKey]
    return { key, show, value: typeof raw === 'string' ? raw : '' }
  })
}

/** properties에서 항목 배열을 읽는다(없으면 구버전 속성으로 생성). */
export function readContactItems(properties: Record<string, unknown>): ContactItem[] {
  const raw = properties.contactItems
  if (!Array.isArray(raw) || raw.length === 0) return defaultContactItems(properties)
  // 알 수 없는 키 제거 + 새로 추가된 항목 보강 (앞으로 항목이 늘어나도 안전하게)
  const known = (raw as ContactItem[]).filter((it) => it && CONTACT_ITEM_META[it.key])
  const missing = CONTACT_ITEM_ORDER.filter((k) => !known.some((it) => it.key === k)).map((k) => ({
    key: k,
    show: false,
    value: typeof properties[CONTACT_ITEM_META[k].legacyKey] === 'string'
      ? (properties[CONTACT_ITEM_META[k].legacyKey] as string)
      : '',
  }))
  return [...known, ...missing]
}

/** 항목 하나의 HTML (기존 템플릿 블록과 동일한 마크업) */
const contactCell = (item: ContactItem): string => {
  const meta = CONTACT_ITEM_META[item.key]
  if (!meta) return ''
  return (
    `<div style="display: inline-block; padding-right: 10px; padding-left: 10px;">` +
    `<strong>${meta.prefix}</strong> ${item.value}</div>`
  )
}

/** 표시 대상(show=true) 항목을 배열 순서대로 이어붙인 연락처 줄 HTML */
export const buildContactRowHtml = (items: ContactItem[]): string =>
  (Array.isArray(items) ? items : [])
    .filter((i) => i && i.show)
    .map(contactCell)
    .join('')
