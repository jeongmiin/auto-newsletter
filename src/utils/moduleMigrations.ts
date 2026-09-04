/**
 * 모듈 인스턴스 속성 마이그레이션
 * 구버전 템플릿/저장 파일의 속성을 현재 스키마로 변환한다.
 */

/**
 * 구버전 푸터의 분리 필드(상단제목/회사명/주소 + 각 폰트 크기)를
 * 단일 companyInfo(에디터 HTML)로 합성한다.
 */
export function buildCompanyInfoFromLegacy(p: Record<string, unknown>): string {
  const titleSize = String(p.topTextTitleFontSize || '16px')
  const companySize = String(p.topTextCompanyFontSize || '16px')
  const title = String(p.topTextTitle ?? '')
  const company = String(p.topTextCompany ?? '')
  const address = String(p.addressText ?? '')
  const parts: string[] = []
  if (title)
    parts.push(`<p style="margin:0; padding:0;"><strong style="font-size:${titleSize};">${title}</strong></p>`)
  if (company)
    parts.push(`<p style="margin:0; padding:0;"><span style="font-size:${companySize};">${company}</span></p>`)
  if (address) parts.push(`<p style="margin:0; padding:0; font-size:13px;">${address}</p>`)
  return parts.join('')
}

/**
 * 리치 에디터 이전의 테이블 셀 저장 형식인지 — '**굵게**' 마커와 '\n' 줄바꿈을 쓰던 값.
 * 지금 셀 내용은 Quill HTML이라 태그가 하나라도 있으면 이미 새 형식으로 본다.
 */
export function isLegacyTableCellText(content: string): boolean {
  if (/<[a-z][^>]*>/i.test(content)) return false
  return /\*\*[^*]+?\*\*/.test(content) || /\r?\n/.test(content)
}

/**
 * 옛 마커 형식 셀 내용 → HTML.
 * 구버전 렌더러가 만들던 결과와 같은 모양(이스케이프 후 줄바꿈·굵게만 태그로 복원).
 */
export function legacyTableCellToHtml(content: string): string {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\r?\n/g, '<br>')
    .replace(/\*\*([^*]+?)\*\*/g, '<strong style="font-weight:700;">$1</strong>')
}

/**
 * 셀 종류(contentType)가 생기기 전의 이미지 셀인지 — 그 시절엔 imageUrl이 있으면 이미지 셀이었다.
 * contentType이 정해진 셀은 그 값이 우선이다('text'로 바꿔 둔 셀에 옛 imageUrl이 남아 있어도
 * 이미지로 되살리면 안 된다).
 */
export function isLegacyImageCell(cell: { contentType?: unknown; imageUrl?: unknown }): boolean {
  if (cell.contentType !== undefined) return false
  return typeof cell.imageUrl === 'string' && cell.imageUrl.trim() !== ''
}

/** 버튼 <a>의 안쪽 여백 키 접두사 — 상하 한 값에서 4방향으로 확장된 모듈들 */
const BUTTON_PADDING_BASES: Record<string, string[]> = {
  ModuleOneButton: ['button'],
  ModuleTwoButton: ['button1', 'button2'],
}

/** '0px'·'0'·''처럼 둥글기가 없는 값인지 */
const isZeroRadius = (value: unknown): boolean => {
  const s = typeof value === 'string' ? value.trim() : ''
  return s === '' || /^0[a-z%]*$/i.test(s)
}

/**
 * 모듈 인스턴스 속성을 현재 스키마로 변환한다 (새 객체 반환, 원본 불변).
 * 변환 대상이 아니면 원본을 그대로 반환한다.
 */
export function migrateModuleProperties(
  moduleId: string,
  properties: Record<string, unknown>,
): Record<string, unknown> {
  // ModuleFooter: 구버전 분리 필드 → companyInfo 단일 에디터 필드
  if (moduleId === 'ModuleFooter') {
    const hasLegacy =
      !!properties.topTextTitle || !!properties.topTextCompany || !!properties.addressText
    if (!properties.companyInfo && hasLegacy) {
      const next = { ...properties }
      next.companyInfo = buildCompanyInfoFromLegacy(properties)
      delete next.topTextTitle
      delete next.topTextTitleFontSize
      delete next.topTextCompany
      delete next.topTextCompanyFontSize
      delete next.addressText
      return next
    }
  }

  // ModuleTable 셀의 옛 저장 형식 두 가지를 현재 스키마로 옮긴다.
  //  · 내용: '**굵게**' 마커 + '\n' 줄바꿈 → HTML (지금은 셀 내용을 리치 HTML 그대로 내보낸다)
  //  · 이미지 셀: imageUrl만 있던 것 → contentType:'image' (지금은 셀 종류로 판별한다)
  if (moduleId === 'ModuleTable' && Array.isArray(properties.tableCells)) {
    const rows = properties.tableCells as Array<Array<Record<string, unknown>>>
    let changed = false
    const migrated = rows.map((row) =>
      Array.isArray(row)
        ? row.map((cell) => {
            if (!cell) return cell
            const content = typeof cell.content === 'string' ? cell.content : ''
            const next = { ...cell }
            let cellChanged = false
            if (isLegacyTableCellText(content)) {
              next.content = legacyTableCellToHtml(content)
              cellChanged = true
            }
            if (isLegacyImageCell(cell)) {
              next.contentType = 'image'
              cellChanged = true
            }
            changed = changed || cellChanged
            return cellChanged ? next : cell
          })
        : row,
    )
    if (changed) return { ...properties, tableCells: migrated }
  }

  // 버튼: 상하 한 값(*PaddingV) → 4방향 안쪽 여백(*PaddingTop/Right/Bottom/Left)
  const buttonPaddingBases = BUTTON_PADDING_BASES[moduleId]
  if (buttonPaddingBases) {
    let next: Record<string, unknown> | null = null
    for (const base of buttonPaddingBases) {
      const legacy = properties[`${base}PaddingV`]
      if (legacy == null || properties[`${base}PaddingTop`] != null) continue
      next = next ?? { ...properties }
      // 기존 값은 위·아래에만 있었으므로 좌우는 0으로 둔다(겉모습 변화 없음)
      next[`${base}PaddingTop`] = legacy
      next[`${base}PaddingBottom`] = legacy
      next[`${base}PaddingRight`] = '0px'
      next[`${base}PaddingLeft`] = '0px'
      delete next[`${base}PaddingV`]
    }
    if (next) return next
  }

  // 모서리 둥글기: 나중에 생긴 '모서리 둥글기 사용'(showBorderRadius) 토글의 기본값이 false라,
  // 토글이 없던 시절 파일은 저장된 둥글기(예: imageBorderRadius:10px)가 있어도 열 때 0으로 깎였다.
  // 토글 값이 아예 없고 둥글기 값이 남아 있으면 '켜짐'으로 본다(저장 당시 겉모습 그대로).
  if (
    properties.showBorderRadius === undefined &&
    Object.keys(properties).some((k) => /[Bb]orderRadius$/.test(k) && !isZeroRadius(properties[k]))
  ) {
    return { ...properties, showBorderRadius: true }
  }

  // SNS 아이콘: 입력 전 자리채움이던 '#' 링크를 빈 값으로 (입력창에 '#'이 남아 보이지 않도록)
  if (moduleId === 'ModuleSnsIcons' && Array.isArray(properties.snsIcons)) {
    const icons = properties.snsIcons as Array<Record<string, unknown>>
    if (icons.some((i) => i?.url === '#')) {
      return {
        ...properties,
        snsIcons: icons.map((i) => (i?.url === '#' ? { ...i, url: '' } : i)),
      }
    }
  }

  return properties
}
