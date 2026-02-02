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
 * 블록 요소에 margin: 0, padding: 0, word-wrap: break-word, word-break: break-all 추가
 * 처리 대상: p, h1, h2, h3
 * word-wrap: break-word는 긴 텍스트가 컨테이너를 넘어갈 때 자동 줄바꿈
 * word-break: break-all은 긴 텍스트(이모지, 특수문자 포함)가 컨테이너를 넘지 않도록 강제 줄바꿈
 */
export const addZeroSpacingToBlocks = (html: string): string => {
  if (!html) return ''

  // 기본 텍스트 스타일 (줄바꿈 관련)
  const baseTextStyle = 'margin: 0; padding: 0; line-height: 1.5; word-wrap: break-word; overflow-wrap: break-word;'

  // p, h1, h2, h3 태그 일괄 처리
  const tagPattern = /<(p|h[1-3])(\s+([^>]*))?>/gi

  html = html.replace(tagPattern, (match, tagName, attributes, attrContent) => {
    // 속성이 없는 경우
    if (!attributes) {
      return `<${tagName} style="${baseTextStyle}">`
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

      // word-wrap이 없으면 추가 (자동 줄바꿈)
      if (!existingStyle.includes('word-wrap')) {
        existingStyle += '; word-wrap: break-word; overflow-wrap: break-word'
      }

      // word-break가 없으면 추가 (강제 줄바꿈 - 이모지, 특수문자 포함 긴 텍스트 처리)
      if (!existingStyle.includes('word-break')) {
        existingStyle += '; word-break: break-all'
      }

      // 세미콜론 정리 (중복 제거, 앞뒤 공백 제거)
      existingStyle = existingStyle.replace(/;+/g, ';').replace(/^;\s*/, '').replace(/;\s*$/, '')

      // style 교체
      const newAttributes = attrContent.replace(/style="[^"]*"/, `style="${existingStyle};"`)
      return `<${tagName} ${newAttributes}>`
    } else {
      // style이 없는 경우 추가
      return `<${tagName} ${attrContent} style="${baseTextStyle}">`
    }
  })

  return html
}

/**
 * 빈 줄(엔터로 추가된 여백)을 이메일 호환 형태로 변환
 * Quill에서 엔터를 누르면 <p><br></p> 형태가 생성됨
 * 이를 높이가 있는 빈 줄로 변환하여 이메일에서도 여백이 표시되도록 함
 */
export const convertEmptyLinesToSpacing = (html: string): string => {
  if (!html) return ''

  // <p><br></p> 패턴을 높이가 있는 빈 줄로 변환
  // 이메일 클라이언트에서 빈 <p> 태그는 무시될 수 있으므로 &nbsp;와 line-height로 높이 확보
  html = html.replace(
    /<p([^>]*)><br\s*\/?><\/p>/gi,
    (match, attributes) => {
      // 기존 style 속성 확인
      const styleMatch = attributes.match(/style="([^"]*)"/)
      let style = styleMatch ? styleMatch[1].trim() : ''

      // 기본 스타일 추가
      if (!style.includes('margin')) {
        style = style ? `${style}; margin: 0` : 'margin: 0'
      }
      if (!style.includes('padding')) {
        style += '; padding: 0'
      }
      if (!style.includes('line-height')) {
        style += '; line-height: 1.5'
      }
      if (!style.includes('min-height')) {
        style += '; min-height: 1.5em'
      }

      // 빈 줄에 &nbsp; 추가하여 높이 확보
      const otherAttrs = attributes.replace(/style="[^"]*"/gi, '').trim()
      return `<p${otherAttrs ? ' ' + otherAttrs : ''} style="${style};">&nbsp;</p>`
    }
  )

  // 빈 <p></p> 패턴도 처리
  html = html.replace(
    /<p([^>]*)><\/p>/gi,
    (match, attributes) => {
      const styleMatch = attributes.match(/style="([^"]*)"/)
      let style = styleMatch ? styleMatch[1].trim() : ''

      if (!style.includes('margin')) {
        style = style ? `${style}; margin: 0` : 'margin: 0'
      }
      if (!style.includes('padding')) {
        style += '; padding: 0'
      }
      if (!style.includes('line-height')) {
        style += '; line-height: 1.5'
      }
      if (!style.includes('min-height')) {
        style += '; min-height: 1.5em'
      }

      const otherAttrs = attributes.replace(/style="[^"]*"/gi, '').trim()
      return `<p${otherAttrs ? ' ' + otherAttrs : ''} style="${style};">&nbsp;</p>`
    }
  )

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
      'gi',
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
 * 2. 빈 줄을 이메일 호환 형태로 변환
 * 3. 블록 요소에 margin: 0, padding: 0 추가
 * 4. Quill 정렬 클래스를 인라인 스타일로 변환
 */
export const processQuillHtml = (html: string): string => {
  if (!html) return ''

  // 1. RGB → HEX 변환
  html = convertRgbToHex(html)

  // 2. 빈 줄(엔터 여백)을 이메일 호환 형태로 변환
  html = convertEmptyLinesToSpacing(html)

  // 3. 블록 요소에 margin: 0, padding: 0 추가
  html = addZeroSpacingToBlocks(html)

  // 4. Quill 정렬 클래스를 인라인 스타일로 변환
  html = convertQuillAlignToInline(html)

  return html
}
