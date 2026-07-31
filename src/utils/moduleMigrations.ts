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

/** 버튼 <a>의 안쪽 여백 키 접두사 — 상하 한 값에서 4방향으로 확장된 모듈들 */
const BUTTON_PADDING_BASES: Record<string, string[]> = {
  ModuleOneButton: ['button'],
  ModuleTwoButton: ['button1', 'button2'],
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
