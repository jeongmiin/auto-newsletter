/**
 * 투명도(알파) 평탄화 유틸리티
 *
 * 이 프로젝트는 뉴스레터(이메일) 빌더라, rgba()·8자리 HEX 같은 반투명 색상은
 * 일부 이메일 클라이언트(특히 Outlook 데스크톱)에서 무시된다.
 * 따라서 내부 저장은 알파를 유지(#RRGGBBAA)하되,
 * 미리보기·내보내기 출력 단계에서 배경색(backdrop)과 합성해 불투명 #RRGGBB로 평탄화한다.
 */

export interface Rgba {
  r: number
  g: number
  b: number
  a: number // 0..1
}

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)))

const toHex2 = (n: number): string => {
  const hex = clamp255(n).toString(16)
  return hex.length === 1 ? '0' + hex : hex
}

/** {r,g,b} → #rrggbb */
export const rgbToHex = (r: number, g: number, b: number): string =>
  `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`

/**
 * 색상 문자열을 RGBA로 파싱한다. (#rgb·#rgba·#rrggbb·#rrggbbaa·rgb()·rgba())
 * 파싱 불가(또는 'transparent' 외 키워드)면 null 반환.
 */
export const parseColorToRgba = (input: string): Rgba | null => {
  if (!input) return null
  const value = input.trim().toLowerCase()

  if (value === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }

  // HEX
  if (value.startsWith('#')) {
    const hex = value.slice(1)
    if (!/^[0-9a-f]+$/.test(hex)) return null
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16)
      const g = parseInt(hex[1] + hex[1], 16)
      const b = parseInt(hex[2] + hex[2], 16)
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1
      return { r, g, b, a }
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
      return { r, g, b, a }
    }
    return null
  }

  // rgb() / rgba()
  const rgbMatch = value.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+)\s*)?\)$/,
  )
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
      a: rgbMatch[4] !== undefined ? Number(rgbMatch[4]) : 1,
    }
  }

  return null
}

/**
 * 전경색(알파 포함)을 불투명 배경 위에 합성해 불투명 {r,g,b}를 만든다.
 * out = fg * a + bg * (1 - a)
 */
export const compositeOver = (
  fg: Rgba,
  backdrop: { r: number; g: number; b: number },
): { r: number; g: number; b: number } => {
  const a = Math.max(0, Math.min(1, fg.a))
  return {
    r: fg.r * a + backdrop.r * (1 - a),
    g: fg.g * a + backdrop.g * (1 - a),
    b: fg.b * a + backdrop.b * (1 - a),
  }
}

/** backdrop 문자열을 불투명 rgb로 해석 (자체 알파가 있으면 흰색 위에 합성, 실패 시 흰색) */
const resolveBackdrop = (backdrop?: string): { r: number; g: number; b: number } => {
  const parsed = backdrop ? parseColorToRgba(backdrop) : null
  if (!parsed) return { r: 255, g: 255, b: 255 }
  if (parsed.a >= 1) return { r: parsed.r, g: parsed.g, b: parsed.b }
  return compositeOver(parsed, { r: 255, g: 255, b: 255 })
}

/**
 * 단일 색상 값을 평탄화한다.
 * - 알파가 없는 값(#rgb·#rrggbb·rgb()·키워드)은 그대로 반환
 * - 알파가 있는 값(#rgba·#rrggbbaa·rgba())은 backdrop과 합성해 불투명 #rrggbb로 변환
 */
export const flattenColor = (value: string, backdrop?: string): string => {
  const parsed = parseColorToRgba(value)
  if (!parsed || parsed.a >= 1) return value
  const bg = resolveBackdrop(backdrop)
  const { r, g, b } = compositeOver(parsed, bg)
  return rgbToHex(r, g, b)
}

/**
 * HTML 문자열 안의 알파 포함 색상(8/4자리 HEX, rgba())만 골라
 * backdrop과 합성한 불투명 #rrggbb로 치환한다. 알파 없는 값은 건드리지 않는다.
 */
export const flattenAlphaColorsInHtml = (html: string, backdrop?: string): string => {
  if (!html) return ''
  const bg = resolveBackdrop(backdrop)

  // rgba() — 알파가 1 미만일 때만 치환
  let result = html.replace(
    /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[0-9.]+\s*\)/gi,
    (match) => {
      const parsed = parseColorToRgba(match)
      if (!parsed || parsed.a >= 1) return match
      const { r, g, b } = compositeOver(parsed, bg)
      return rgbToHex(r, g, b)
    },
  )

  // 8자리/4자리 HEX (알파 포함) — 뒤에 추가 hex 문자가 없을 때만
  result = result.replace(/#([0-9a-fA-F]{8}|[0-9a-fA-F]{4})(?![0-9a-fA-F])/g, (match) => {
    const parsed = parseColorToRgba(match)
    if (!parsed || parsed.a >= 1) return match
    const { r, g, b } = compositeOver(parsed, bg)
    return rgbToHex(r, g, b)
  })

  return result
}
