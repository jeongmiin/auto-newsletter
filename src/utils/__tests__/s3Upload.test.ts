import { describe, it, expect } from 'vitest'
import {
  MAX_IMAGE_BYTES,
  buildUploadDirectory,
  extractErrorMessage,
  buildUploadFileName,
  formatBytes,
  normalizeVolume,
  validateImageFile,
} from '../s3Upload'

/** 크기·형식만 흉내 내는 가짜 File (내용은 검사하지 않는다) */
const fakeFile = (name: string, size: number, type = ''): File => {
  const file = new File([''], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('buildUploadFileName', () => {
  const at = new Date(2026, 7, 20, 14, 30, 52) // 2026-08-20 14:30:52

  it('원본 이름 뒤에 날짜·시각을 붙인다', () => {
    expect(buildUploadFileName('main.png', at)).toBe('main_20260820_143052.png')
  })

  it('월·일·시·분·초를 두 자리로 채운다', () => {
    expect(buildUploadFileName('a.jpg', new Date(2026, 0, 5, 9, 8, 7))).toBe(
      'a_20260105_090807.jpg',
    )
  })

  it('확장자가 여러 개면 마지막 것만 확장자로 본다', () => {
    expect(buildUploadFileName('archive.tar.gz', at)).toBe('archive.tar_20260820_143052.gz')
  })

  it('확장자가 없으면 붙이지 않는다', () => {
    expect(buildUploadFileName('logo', at)).toBe('logo_20260820_143052')
  })

  it('URL·서버에서 문제될 문자는 하이픈으로 바꾸고, 앞뒤 하이픈은 잘라낸다', () => {
    expect(buildUploadFileName('내 사진 (1).png', at)).toBe('1_20260820_143052.png')
    expect(buildUploadFileName('main image.png', at)).toBe('main-image_20260820_143052.png')
  })

  it('바꿀 문자만 남아 이름이 비면 image로 채운다', () => {
    expect(buildUploadFileName('한글.png', at)).toBe('image_20260820_143052.png')
  })

  it('같은 초에 올린 같은 이름은 겹치지만, 초가 다르면 갈린다', () => {
    const a = buildUploadFileName('main.png', new Date(2026, 7, 20, 14, 30, 52))
    const b = buildUploadFileName('main.png', new Date(2026, 7, 20, 14, 30, 53))
    expect(a).not.toBe(b)
  })
})

describe('normalizeVolume', () => {
  it('표기가 흔들려도 같은 폴더명으로 모은다', () => {
    expect(normalizeVolume('vol01')).toBe('vol01')
    expect(normalizeVolume('Vol 01')).toBe('vol01')
    expect(normalizeVolume('VOL-01')).toBe('vol01')
    expect(normalizeVolume(' vol_01 ')).toBe('vol01')
  })

  it('폴더명이 될 수 없으면 빈 문자열', () => {
    expect(normalizeVolume('')).toBe('')
    expect(normalizeVolume('   ')).toBe('')
    expect(normalizeVolume('---')).toBe('')
    expect(normalizeVolume('회차')).toBe('')
    expect(normalizeVolume(null)).toBe('')
    expect(normalizeVolume(undefined)).toBe('')
  })

  it('지나치게 긴 값은 잘라낸다', () => {
    expect(normalizeVolume('v'.repeat(50))).toHaveLength(30)
  })
})

describe('buildUploadDirectory', () => {
  const at = new Date(2026, 7, 20)

  it('연도·템플릿 id·회차로 경로를 만든다', () => {
    expect(buildUploadDirectory('nextcon', 'vol01', at)).toBe('/e-dm/2026/nextcon/vol01/')
  })

  it('회차 표기가 흔들려도 같은 폴더로 간다', () => {
    expect(buildUploadDirectory('nextcon', 'Vol 01', at)).toBe('/e-dm/2026/nextcon/vol01/')
  })

  it('템플릿이 없으면(빈 문서) common으로 모은다', () => {
    expect(buildUploadDirectory(null, 'vol01', at)).toBe('/e-dm/2026/common/vol01/')
    expect(buildUploadDirectory('', 'vol01', at)).toBe('/e-dm/2026/common/vol01/')
    expect(buildUploadDirectory('   ', 'vol01', at)).toBe('/e-dm/2026/common/vol01/')
    expect(buildUploadDirectory(undefined, 'vol01', at)).toBe('/e-dm/2026/common/vol01/')
  })

  it('회차가 없으면 경로를 지어내지 않고 null (업로드를 막기 위함)', () => {
    expect(buildUploadDirectory('nextcon', '', at)).toBeNull()
    expect(buildUploadDirectory('nextcon', '   ', at)).toBeNull()
    expect(buildUploadDirectory('nextcon', null, at)).toBeNull()
    expect(buildUploadDirectory('nextcon', undefined, at)).toBeNull()
  })

  it('폴더명이 될 수 없는 회차도 null로 본다', () => {
    expect(buildUploadDirectory('nextcon', '회차', at)).toBeNull()
  })
})

describe('validateImageFile', () => {
  it('허용 형식은 통과시킨다', () => {
    expect(validateImageFile(fakeFile('a.png', 1024, 'image/png'))).toBeNull()
    expect(validateImageFile(fakeFile('a.jpg', 1024, 'image/jpeg'))).toBeNull()
    expect(validateImageFile(fakeFile('a.gif', 1024, 'image/gif'))).toBeNull()
  })

  // SVG는 스크립트를 품을 수 있어 목록에서 뺐다 (저장형 XSS 방지)
  it('SVG는 확장자로 와도 MIME으로 와도 막는다', () => {
    expect(validateImageFile(fakeFile('a.svg', 1024, 'image/svg+xml'))).toMatch(/SVG는 올릴 수 없어요/)
    expect(validateImageFile(fakeFile('a.svg', 1024, ''))).toMatch(/SVG는 올릴 수 없어요/)
    // 확장자를 png로 바꿔 놓아도 MIME이 남아 있으면 막힌다
    expect(validateImageFile(fakeFile('a.png', 1024, 'image/svg+xml'))).toMatch(/SVG는 올릴 수 없어요/)
  })

  it('MIME이 비어 있어도 확장자가 맞으면 통과시킨다', () => {
    expect(validateImageFile(fakeFile('a.webp', 1024, ''))).toBeNull()
  })

  it('확장자가 없어도 MIME이 맞으면 통과시킨다', () => {
    expect(validateImageFile(fakeFile('clipboard', 1024, 'image/png'))).toBeNull()
  })

  it('이미지가 아니면 막는다', () => {
    expect(validateImageFile(fakeFile('a.pdf', 1024, 'application/pdf'))).toMatch(/이미지 파일만/)
  })

  it('최대 크기를 넘으면 막는다', () => {
    const msg = validateImageFile(fakeFile('a.png', MAX_IMAGE_BYTES + 1, 'image/png'))
    expect(msg).toMatch(/너무 커요/)
  })

  it('최대 크기와 같으면 통과시킨다 (경계값)', () => {
    expect(validateImageFile(fakeFile('a.png', MAX_IMAGE_BYTES, 'image/png'))).toBeNull()
  })

  it('빈 파일은 막는다', () => {
    expect(validateImageFile(fakeFile('a.png', 0, 'image/png'))).toBe('빈 파일이에요')
  })
})

describe('formatBytes', () => {
  it('1MB 이상은 MB로', () => {
    expect(formatBytes(10 * 1024 * 1024)).toBe('10.0MB')
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5MB')
  })

  it('1MB 미만은 KB로', () => {
    expect(formatBytes(2048)).toBe('2KB')
  })

  it('아주 작은 파일도 0KB로 보이지 않게 한다', () => {
    expect(formatBytes(10)).toBe('1KB')
  })
})

describe('회차 저장/복원', () => {
  it('저장 파일 메타데이터의 wrapSettings에 volume이 실린다', async () => {
    const { useEditorStore } = await import('@/stores/editorStore')
    const { setActivePinia, createPinia } = await import('pinia')
    setActivePinia(createPinia())
    const store = useEditorStore()

    store.updateWrapSettings({ volume: 'vol07' })
    expect(store.wrapSettings.volume).toBe('vol07')

    // 파일을 열면 그 파일의 값으로 되돌아온다
    store.applyLoadedWrapSettings({ volume: 'vol02' })
    expect(store.wrapSettings.volume).toBe('vol02')

    // '빈 템플릿'·'전체 삭제'는 기본값(빈 값)으로 되돌린다 — 다른 회차 폴더에 섞이지 않도록
    store.resetWrapSettings()
    expect(store.wrapSettings.volume).toBe('')
  })
})

describe('extractErrorMessage', () => {
  it('서버가 JSON으로 사유를 주면 그대로 보여준다', () => {
    expect(extractErrorMessage('{"message":"업로드 경로를 입력하세요."}', 400)).toBe(
      '업로드 경로를 입력하세요.',
    )
    // ASP.NET은 대문자 Message로 준다
    expect(extractErrorMessage('{"Message":"지원하지 않습니다."}', 405)).toBe('지원하지 않습니다.')
  })

  it('JSON이 아니면 원문을 쓰되 너무 길면 자른다', () => {
    expect(extractErrorMessage('plain error', 400)).toBe('plain error')
    expect(extractErrorMessage('x'.repeat(300), 400)).toHaveLength(201) // 200자 + '…'
  })

  it('본문이 빈 5xx는 앞단이 막힌 경우 — 개발 중엔 목 서버 실행을 안내한다', () => {
    expect(extractErrorMessage('', 500, true)).toMatch(/목 서버/)
    expect(extractErrorMessage('   ', 502, true)).toMatch(/목 서버/)
  })

  it('배포본에서는 목 서버 얘기를 하지 않는다', () => {
    const msg = extractErrorMessage('', 500, false)
    expect(msg).not.toMatch(/목 서버/)
    expect(msg).toMatch(/HTTP 500/)
  })

  it('4xx는 그대로 상태 코드를 알려준다', () => {
    expect(extractErrorMessage('', 413, true)).toBe('업로드에 실패했어요 (HTTP 413)')
  })
})

describe('자리표시 이미지 판별', () => {
  it('모듈 기본 이미지는 "아직 안 넣음"으로 본다 (업로드 영역 유지·엑박 방지)', async () => {
    const { isPlaceholderImage, DEFAULT_IMAGE_URL, DEFAULT_TWO_COLUMN_IMAGE_URL } = await import(
      '@/constants/defaults'
    )
    expect(isPlaceholderImage(DEFAULT_IMAGE_URL)).toBe(true)
    expect(isPlaceholderImage(DEFAULT_TWO_COLUMN_IMAGE_URL)).toBe(true)
    expect(
      isPlaceholderImage('https://design.messeesang.com/e-dm/newsletter/images/img-speaker.png'),
    ).toBe(true)
  })

  it('빈 값도 "아직 안 넣음"', async () => {
    const { isPlaceholderImage } = await import('@/constants/defaults')
    expect(isPlaceholderImage('')).toBe(true)
    expect(isPlaceholderImage('   ')).toBe(true)
    expect(isPlaceholderImage(null)).toBe(true)
    expect(isPlaceholderImage(undefined)).toBe(true)
  })

  it('실제로 올린 이미지는 자리표시가 아니다', async () => {
    const { isPlaceholderImage } = await import('@/constants/defaults')
    expect(
      isPlaceholderImage('https://esang-newsletter.s3.ap-northeast-2.amazonaws.com/e-dm/2026/nextcon/vol01/main.png'),
    ).toBe(false)
  })
})
