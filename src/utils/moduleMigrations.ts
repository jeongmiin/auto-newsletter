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
 * 구버전 푸터의 국문 안내문구를 자유 편집 텍스트(koreanNoticeText)로 합성한다.
 * 구버전 ModuleFooter.html의 마크업을 그대로 재현해 기존 저장 파일이 동일하게 열리도록 한다.
 * (구버전은 수신거부 URL·문의 이메일이 분리 필드였고, 문구 자체는 템플릿에 고정돼 있었다)
 */
export function buildKoreanNoticeFromLegacy(p: Record<string, unknown>): string {
  const color = String(p.footerTextColor || '#333333')
  const url = String(p.unsubscribeUrl || '#')
  const email = String(p.inquiryEmail ?? '')
  // 구버전은 showInquiry가 false일 때 문의 줄을 '삭제'가 아니라 발신전용 안내로 치환했다
  const inquiry =
    p.showInquiry === false
      ? '본 메일은 발신전용 메일입니다.'
      : `본 메일은 발신전용 메일이므로 문의사항은 <strong>${email}</strong>으로 문의 바랍니다`
  return (
    '본 메일은 회원님의 수신동의 여부를 확인한 결과 회원님께서 수신동의를 하셨기에 발송되었습니다.<br>' +
    `메일 수신을 원치 않으시면 <a style="text-decoration:none; color:${color}; font-weight:700;" href="${url}" target="_blank">[수신거부]</a> 를 클릭하십시오.<br>` +
    `<div>${inquiry}</div>`
  )
}

/**
 * 구버전 푸터의 영문 안내문구를 자유 편집 텍스트(englishNoticeText)로 합성한다.
 * 노출 토글(showEnglishFooter)이 꺼져 있어도 만들어 둔다 — 나중에 켜면 원래 문구가 나오도록.
 */
export function buildEnglishNoticeFromLegacy(p: Record<string, unknown>): string {
  const color = String(p.footerTextColor || '#333333')
  const url = String(p.unsubscribeUrl || '#')
  const email = String(p.inquiryEmail ?? '')
  const phone = String(p.phone ?? '')
  return (
    `If you don't want this type of information or e-mail, please click the <a style="text-decoration:none; color:${color}; font-weight:700;" href="${url}" target="_blank">[unsubscription]</a><br>` +
    'Please note that this is a no-reply email. For any inquiries,<br>' +
    `contact us at ${phone} or via email at ${email}.`
  )
}

/**
 * 모듈 인스턴스 속성을 현재 스키마로 변환한다 (새 객체 반환, 원본 불변).
 * 변환 대상이 아니면 원본을 그대로 반환한다.
 */
export function migrateModuleProperties(
  moduleId: string,
  properties: Record<string, unknown>,
): Record<string, unknown> {
  if (moduleId === 'ModuleFooter') {
    // 1) 구버전 분리 필드 → companyInfo 단일 에디터 필드
    const hasLegacyCompany =
      !!properties.topTextTitle || !!properties.topTextCompany || !!properties.addressText
    const needCompany = !properties.companyInfo && hasLegacyCompany

    // 2) 구버전 안내문구 분리 필드 → koreanNoticeText / englishNoticeText 자유 편집 텍스트
    //    (이 필드들은 현재 렌더에서 더 이상 쓰이지 않아, 옮기지 않으면 문구가 기본값으로 대체된다)
    const hasLegacyNotice =
      properties.unsubscribeUrl !== undefined ||
      properties.inquiryEmail !== undefined ||
      properties.showInquiry !== undefined

    if (!needCompany && !hasLegacyNotice) return properties

    const next = { ...properties }

    if (needCompany) {
      next.companyInfo = buildCompanyInfoFromLegacy(properties)
      delete next.topTextTitle
      delete next.topTextTitleFontSize
      delete next.topTextCompany
      delete next.topTextCompanyFontSize
      delete next.addressText
    }

    if (hasLegacyNotice) {
      if (!properties.koreanNoticeText) {
        next.koreanNoticeText = buildKoreanNoticeFromLegacy(properties)
      }
      if (!properties.englishNoticeText) {
        next.englishNoticeText = buildEnglishNoticeFromLegacy(properties)
      }
      // phone은 연락처 영역에서 계속 쓰이므로 남긴다
      delete next.unsubscribeUrl
      delete next.showInquiry
      delete next.inquiryEmail
    }

    return next
  }
  return properties
}
