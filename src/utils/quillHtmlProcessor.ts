/**
 * Quill HTML 후처리 유틸리티
 * - RGB → HEX 색상 변환
 * - 블록 요소에 margin: 0, padding: 0 추가
 */

/**
 * RGB 문자열을 HEX로 변환
 */
const rgbToHex = (rgb: string): string => {
  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
  if (!match) return rgb

  const r = Number.parseInt(match[1])
  const g = Number.parseInt(match[2])
  const b = Number.parseInt(match[3])

  const toHex = (n: number) => {
    const hex = n.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * RGBA 문자열을 HEX로 변환
 */
const rgbaToHex = (rgba: string): string => {
  const match = rgba.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)$/)
  if (!match) return rgba

  const r = Number.parseInt(match[1])
  const g = Number.parseInt(match[2])
  const b = Number.parseInt(match[3])
  const a = Number.parseFloat(match[4])

  const toHex = (n: number) => {
    const hex = n.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  // 알파가 1이면 알파 채널 생략
  if (a === 1) {
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  const alpha = Math.round(a * 255)
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(alpha)}`
}

/**
 * HTML 내 모든 RGB/RGBA를 HEX로 변환
 */
export const convertRgbToHex = (html: string): string => {
  if (!html) return ''

  // RGBA 패턴 먼저 처리 (RGB보다 먼저 매칭되어야 함)
  let result = html.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)/g, (match) => {
    return rgbaToHex(match)
  })

  // RGB 패턴 처리
  result = result.replace(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g, (match) => {
    return rgbToHex(match)
  })

  return result
}

/**
 * 블록 요소에 margin: 0, padding: 0 추가
 * 처리 대상: p, h1, h2, h3
 */
export const addZeroSpacingToBlocks = (html: string): string => {
  if (!html) return ''

  // p, h1, h2, h3 태그 일괄 처리
  const tagPattern = /<(p|h[1-3])(\s+([^>]*))?>/gi

  html = html.replace(tagPattern, (match, tagName, attributes, attrContent) => {
    // 속성이 없는 경우
    if (!attributes) {
      return `<${tagName} style="margin: 0; padding: 0;">`
    }

    // style 속성 추출
    const styleMatch = attrContent.match(/style="([^"]*)"/)

    if (styleMatch) {
      // 이미 style이 있는 경우
      let existingStyle = styleMatch[1].trim()

      // margin이 없으면 추가
      if (!existingStyle.includes('margin')) {
        existingStyle += '; margin: 0'
      }

      // padding이 없으면 추가
      if (!existingStyle.includes('padding')) {
        existingStyle += '; padding: 0'
      }

      // 세미콜론 정리 (중복 제거, 앞뒤 공백 제거)
      existingStyle = existingStyle
        .replace(/;+/g, ';')
        .replace(/^;\s*/, '')
        .replace(/;\s*$/, '')

      // style 교체
      const newAttributes = attrContent.replace(/style="[^"]*"/, `style="${existingStyle};"`)
      return `<${tagName} ${newAttributes}>`
    } else {
      // style이 없는 경우 추가
      return `<${tagName} ${attrContent} style="margin: 0; padding: 0;">`
    }
  })

  return html
}

/**
 * Quill 정렬 클래스를 인라인 스타일로 변환
 * - ql-align-center → text-align: center
 * - ql-align-right → text-align: right
 * - ql-align-justify → text-align: justify
 */
export const convertQuillAlignToInline = (html: string): string => {
  if (!html) return ''


  // 정렬 클래스 매핑
  const alignMap: Record<string, string> = {
    'ql-align-center': 'center',
    'ql-align-right': 'right',
    'ql-align-justify': 'justify',
  }

  // 각 정렬 클래스 처리
  Object.entries(alignMap).forEach(([className, alignValue]) => {
    // class="ql-align-xxx" 또는 class="other ql-align-xxx" 패턴 찾기
    const classRegex = new RegExp(
      `(<(?:p|h1|h2|h3)[^>]*?)class="([^"]*?${className}[^"]*?)"([^>]*?>)`,
      'gi'
    )

    html = html.replace(classRegex, (match, before, classAttr, after) => {
      // 기존 클래스에서 정렬 클래스 제거
      let newClasses = classAttr.replace(className, '').trim()
      newClasses = newClasses.replace(/\s+/g, ' ') // 중복 공백 제거

      // style 속성 확인
      const styleMatch = (before + after).match(/style="([^"]*)"/)
      let style = styleMatch ? styleMatch[1].trim() : ''

      // text-align 추가 (기존에 없는 경우에만)
      if (!style.includes('text-align')) {
        style = style ? `${style}; text-align: ${alignValue}` : `text-align: ${alignValue}`
      }

      // class 속성 재구성 (빈 값이면 제거)
      const classStr = newClasses ? ` class="${newClasses}"` : ''

      // style 속성이 이미 있으면 제거하고 새로 추가
      const cleanBefore = before.replace(/\s*style="[^"]*"/gi, '').trim()
      const cleanAfter = after.replace(/\s*style="[^"]*"/gi, '').trim()

      // 최종 태그 재구성
      return `${cleanBefore}${classStr} style="${style};"${cleanAfter}`
    })
  })

  // 빈 class 속성 제거
  html = html.replace(/\s*class=""\s*/g, ' ')


  return html
}

/**
 * Quill HTML 통합 처리 함수
 * 1. RGB → HEX 변환
 * 2. 블록 요소에 margin: 0, padding: 0 추가
 * 3. Quill 정렬 클래스를 인라인 스타일로 변환
 */
export const processQuillHtml = (html: string): string => {
  if (!html) return ''


  // 1. RGB → HEX 변환
  html = convertRgbToHex(html)

  // 2. 블록 요소에 margin: 0, padding: 0 추가
  html = addZeroSpacingToBlocks(html)

  // 3. ✅ Quill 정렬 클래스를 인라인 스타일로 변환
  html = convertQuillAlignToInline(html)


  return html
}

/**
 * 테스트용 함수 - 블록 요소 spacing 테스트
 */
export const testBlockSpacing = () => {

  const testCases = [
    '<p>일반 문단</p>',
    '<h1>헤더 1</h1>',
    '<h2>헤더 2</h2>',
    '<h3>헤더 3</h3>',
    '<p style="color: red;">빨간색 문단</p>',
    '<h1 style="font-size: 32px;">큰 헤더</h1>',
    '<p class="custom">클래스 있는 문단</p>',
    '<h2 class="title" style="color: blue;">파란 헤더</h2>',
    '<p>첫 번째</p><h1>중간 헤더</h1><p>마지막</p>',
  ]

  testCases.forEach((html, index) => {
    const result = processQuillHtml(html)

    // margin: 0과 padding: 0 포함 여부 확인
    const hasMargin = result.includes('margin: 0')
    const hasPadding = result.includes('padding: 0')
  })
}

/**
 * HTML 검증 - 블록 태그 통계
 */
export const verifyBlockSpacing = (html: string): Record<string, { total: number; processed: number }> => {
  const blockTags = ['p', 'h1', 'h2', 'h3']
  const stats: Record<string, { total: number; processed: number }> = {}

  blockTags.forEach((tag) => {
    const totalCount = (html.match(new RegExp(`<${tag}[^>]*>`, 'gi')) || []).length
    const withSpacingCount =
      (html.match(new RegExp(`<${tag}[^>]*style="[^"]*margin:\\s*0[^"]*padding:\\s*0`, 'gi')) || [])
        .length

    stats[tag] = { total: totalCount, processed: withSpacingCount }


    if (totalCount > 0 && withSpacingCount < totalCount) {
      console.warn(`⚠️ 일부 <${tag}> 태그에 margin/padding: 0이 누락되었습니다`)
    }
  })

  return stats
}
