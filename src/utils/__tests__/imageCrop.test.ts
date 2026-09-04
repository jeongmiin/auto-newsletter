import { describe, it, expect } from 'vitest'
import {
  ASPECT_PRESETS,
  DEFAULT_CROP_WIDTH,
  RETINA_SCALE,
  croppedFileName,
  heightForWidth,
  isGif,
  outputMimeOf,
  outputSize,
  widthForHeight,
} from '../imageCrop'

describe('widthForHeight / heightForWidth', () => {
  it('비율이 잠겨 있으면 높이에서 너비가 따라온다', () => {
    expect(widthForHeight(900, 16 / 9, 0)).toBe(1600)
    expect(widthForHeight(300, 1, 0)).toBe(300)
  })

  it('자유 비율이면 너비를 그대로 둔다', () => {
    expect(widthForHeight(900, null, 1234)).toBe(1234)
  })

  it('너비에서 높이도 같은 규칙으로', () => {
    expect(heightForWidth(1600, 16 / 9, 0)).toBe(900)
    expect(heightForWidth(1600, null, 777)).toBe(777)
  })

  it('0 이하로 내려가지 않는다', () => {
    expect(widthForHeight(0, 16 / 9, 0)).toBe(1)
    expect(heightForWidth(0, 1, 0)).toBe(1)
  })
})

describe('outputSize', () => {
  it('화면 폭 × 배율보다 크면 그 폭으로 줄인다(비율 유지)', () => {
    const out = outputSize({ width: 4000, height: 2250 }, 680)
    expect(out.width).toBe(680 * RETINA_SCALE)
    expect(out.height).toBe(Math.round(2250 * ((680 * RETINA_SCALE) / 4000)))
  })

  it('작으면 늘리지 않고 원본 픽셀 그대로', () => {
    expect(outputSize({ width: 500, height: 300 }, 680)).toEqual({ width: 500, height: 300 })
  })

  it('cropWidth 를 안 주면 메일 본문 폭(680)을 쓴다', () => {
    const out = outputSize({ width: 5000, height: 1000 })
    expect(out.width).toBe(DEFAULT_CROP_WIDTH * RETINA_SCALE)
  })

  it('2단 이미지는 좁은 폭으로 저장된다', () => {
    expect(outputSize({ width: 2000, height: 1000 }, 320).width).toBe(640)
  })
})

describe('outputMimeOf / croppedFileName', () => {
  it('JPEG·WebP 는 원본 형식을 지킨다', () => {
    expect(outputMimeOf({ name: 'a.jpg', type: 'image/jpeg' })).toBe('image/jpeg')
    expect(outputMimeOf({ name: 'a.webp', type: 'image/webp' })).toBe('image/webp')
  })

  it('PNG 와 GIF 는 PNG 로 저장한다(GIF 는 캔버스에서 움직임이 사라진다)', () => {
    expect(outputMimeOf({ name: 'a.png', type: 'image/png' })).toBe('image/png')
    expect(outputMimeOf({ name: 'a.gif', type: 'image/gif' })).toBe('image/png')
  })

  it('MIME 이 비어 오면 확장자로 정한다', () => {
    expect(outputMimeOf({ name: 'photo.JPEG', type: '' })).toBe('image/jpeg')
    expect(outputMimeOf({ name: 'unknown.bin', type: '' })).toBe('image/png')
  })

  it('파일 이름은 원본을 지키고 확장자만 형식에 맞춘다', () => {
    expect(croppedFileName('banner.jpeg', 'image/jpeg')).toBe('banner.jpg')
    expect(croppedFileName('anim.gif', 'image/png')).toBe('anim.png')
    expect(croppedFileName('noext', 'image/webp')).toBe('noext.webp')
  })
})

describe('isGif', () => {
  it('MIME 또는 확장자로 판단한다', () => {
    expect(isGif({ name: 'a.gif', type: '' })).toBe(true)
    expect(isGif({ name: 'a.png', type: 'image/gif' })).toBe(true)
    expect(isGif({ name: 'a.png', type: 'image/png' })).toBe(false)
  })
})

describe('ASPECT_PRESETS', () => {
  it('첫 항목은 자유 비율이다', () => {
    expect(ASPECT_PRESETS[0].ratio).toBeNull()
  })
})
