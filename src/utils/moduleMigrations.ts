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
  return properties
}
