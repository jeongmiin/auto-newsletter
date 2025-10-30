/**
 * RGB/RGBA 색상을 HEX 형식으로 변환하는 유틸리티
 * Quill 에디터가 RGB를 출력하는 경우 HEX로 변환
 */

/**
 * RGB 문자열을 HEX로 변환
 * @param rgb - rgb(255, 0, 0) 형식의 문자열
 * @returns HEX 색상 코드 (예: #ff0000)
 */
export const rgbToHex = (rgb: string): string => {
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
 * @param rgba - rgba(255, 0, 0, 0.5) 형식의 문자열
 * @returns HEX 색상 코드 (예: #ff000080)
 */
export const rgbaToHex = (rgba: string): string => {
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
 * HTML 문자열 내의 모든 RGB/RGBA를 HEX로 변환
 * @param html - HTML 문자열
 * @returns 변환된 HTML 문자열
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
 * 테스트용 함수 - 콘솔에서 변환 결과 확인
 */
export const testColorConversion = () => {

  const testCases = [
    'rgb(255, 0, 0)',
    'rgb(0, 255, 0)',
    'rgb(0, 0, 255)',
    'rgba(255, 0, 0, 0.5)',
    'rgba(0, 255, 0, 1)',
    '<p style="color: rgb(255, 0, 0);">빨간 텍스트</p>',
    '<p style="background-color: rgba(0, 255, 0, 0.5);">반투명 배경</p>',
  ]

  testCases.forEach((test) => {
  })
}
