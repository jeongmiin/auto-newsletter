import { describe, it, expect } from 'vitest'
import {
  MAX_HTML_BYTES,
  MAX_IMAGE_BYTES,
  buildUploadDirectory,
  displayUploadDirectory,
  extractErrorMessage,
  buildUploadFileName,
  formatBytes,
  formatVolume,
  normalizeVolume,
  parseVolumeNumber,
  uniqueFileName,
  uploadFolderOf,
  validateHtmlFile,
  validateImageFile,
  MAX_VOLUME,
} from '../s3Upload'

/** 크기·형식만 흉내 내는 가짜 File (내용은 검사하지 않는다) */
const fakeFile = (name: string, size: number, type = ''): File => {
  const file = new File([''], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('uniqueFileName', () => {
  it('겹치지 않으면 그대로 쓴다', () => {
    expect(uniqueFileName('img01.png', ['other.png'])).toBe('img01.png')
  })

  it('겹치면 괄호 번호를 붙인다 — 서버가 붙이는 날짜·시각보다 짧고 알아보기 쉽다', () => {
    expect(uniqueFileName('img01.png', ['img01.png'])).toBe('img01(1).png')
  })

  it('번호도 차 있으면 다음 번호로 넘어간다', () => {
    expect(uniqueFileName('img01.png', ['img01.png', 'img01(1).png', 'img01(2).png'])).toBe(
      'img01(3).png',
    )
  })

  it('중간이 비어 있으면 그 자리를 쓴다', () => {
    expect(uniqueFileName('img01.png', ['img01.png', 'img01(2).png'])).toBe('img01(1).png')
  })

  it('확장자가 없어도 번호를 붙인다', () => {
    expect(uniqueFileName('logo', ['logo'])).toBe('logo(1)')
  })

  it('확장자가 여러 개면 마지막 것만 확장자로 본다', () => {
    expect(uniqueFileName('archive.tar.gz', ['archive.tar.gz'])).toBe('archive.tar(1).gz')
  })
})

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

  describe('덮어쓰기(unique=false)', () => {
    it('날짜·시각을 붙이지 않아 같은 파일은 같은 이름이 된다', () => {
      expect(buildUploadFileName('main.png', at, false)).toBe('main.png')
      expect(buildUploadFileName('main.png', new Date(2027, 0, 1), false)).toBe('main.png')
    })

    it('이름 다듬기는 그대로 적용한다', () => {
      expect(buildUploadFileName('main image.png', at, false)).toBe('main-image.png')
      expect(buildUploadFileName('한글.png', at, false)).toBe('image.png')
      expect(buildUploadFileName('logo', at, false)).toBe('logo')
    })
  })
})

/**
 * 덮어쓰기를 켠 상태에서 화면은 이름이 그대로일 것처럼 보이지만 실제로는 다듬어져 올라간다.
 * ImageUploadField는 `unique=false`로 만든 이름이 원본과 다르면 사용자에게 알린다 —
 * 그 판단이 성립하는지(=다듬어지는 이름을 실제로 구분해내는지) 여기서 못박아 둔다.
 */
describe('덮어쓰기 이름 경고 판단', () => {
  const saveAs = (name: string) => buildUploadFileName(name, new Date(), false)
  const changed = (name: string) => saveAs(name) !== name

  it('한글·공백이 든 이름은 달라진다', () => {
    expect(saveAs('메인배너.jpg')).toBe('image.jpg')
    expect(saveAs('배너-01.png')).toBe('01.png')
    expect(saveAs('main image.png')).toBe('main-image.png')
    expect(changed('메인배너.jpg')).toBe(true)
    expect(changed('배너-01.png')).toBe(true)
  })

  it('영문·숫자로만 된 이름은 그대로라 알리지 않는다', () => {
    expect(changed('main.png')).toBe(false)
    expect(changed('banner_01.png')).toBe(false)
    expect(changed('logo')).toBe(false)
  })
})

describe('normalizeVolume', () => {
  it('표기가 흔들려도 같은 폴더명으로 모은다', () => {
    expect(normalizeVolume('vol01')).toBe('vol01')
    expect(normalizeVolume('Vol 01')).toBe('vol01')
    expect(normalizeVolume('Vol/01')).toBe('vol/01')
  })

  it('하이픈·밑줄은 살린다 — 폴더 선택 화면의 이름과 실제 경로가 같아야 한다', () => {
    expect(normalizeVolume('VOL-01')).toBe('vol-01')
    expect(normalizeVolume(' vol_01 ')).toBe('vol_01')
    expect(normalizeVolume('space_design')).toBe('space_design')
  })

  it('폴더명이 될 수 없으면 빈 문자열', () => {
    expect(normalizeVolume('')).toBe('')
    expect(normalizeVolume('   ')).toBe('')
    expect(normalizeVolume('!!!')).toBe('')
    expect(normalizeVolume('회차')).toBe('')
    expect(normalizeVolume(null)).toBe('')
    expect(normalizeVolume(undefined)).toBe('')
  })

  it('지나치게 긴 값은 잘라낸다', () => {
    expect(normalizeVolume('v'.repeat(50))).toHaveLength(30)
  })

  // 폴더 안에 폴더를 둘 수 있다 — 'eng/vol01'
  describe('폴더 안의 폴더', () => {
    it('칸 구분은 살리고 칸마다 다듬는다', () => {
      expect(normalizeVolume('eng/vol01')).toBe('eng/vol01')
      expect(normalizeVolume('ENG / Vol 01')).toBe('eng/vol01')
    })

    it('빈 칸은 접는다 — 앞뒤·가운데 슬래시가 남지 않는다', () => {
      expect(normalizeVolume('/eng//vol01/')).toBe('eng/vol01')
      expect(normalizeVolume('eng/회차')).toBe('eng')
    })

    it('허용 깊이를 넘는 뒷부분은 버린다', () => {
      expect(normalizeVolume('eng/2026/q1/vol01')).toBe('eng/2026')
    })
  })
})

describe('parseVolumeNumber', () => {
  it('저장 표기에서 숫자만 뽑는다', () => {
    expect(parseVolumeNumber('vol01')).toBe(1)
    expect(parseVolumeNumber('vol12')).toBe(12)
    expect(parseVolumeNumber('Vol 3')).toBe(3)
    expect(parseVolumeNumber('vol100')).toBe(100)
    expect(parseVolumeNumber('7')).toBe(7)
  })

  it('회차를 아직 안 정했으면 null', () => {
    expect(parseVolumeNumber('')).toBeNull()
    expect(parseVolumeNumber('   ')).toBeNull()
    expect(parseVolumeNumber('vol')).toBeNull()
    expect(parseVolumeNumber('vol00')).toBeNull() // 0회차는 없다
    expect(parseVolumeNumber(null)).toBeNull()
    expect(parseVolumeNumber(undefined)).toBeNull()
  })

  it('최댓값을 넘으면 최댓값으로 잡아둔다', () => {
    expect(parseVolumeNumber('vol12345')).toBe(MAX_VOLUME)
  })
})

describe('formatVolume', () => {
  it('두 자리로 채운 저장 표기를 만든다', () => {
    expect(formatVolume(1)).toBe('vol01')
    expect(formatVolume(9)).toBe('vol09')
    expect(formatVolume(12)).toBe('vol12')
    expect(formatVolume(100)).toBe('vol100')
  })

  it('범위를 벗어난 값은 잡아둔다', () => {
    expect(formatVolume(0)).toBe('vol01')
    expect(formatVolume(-5)).toBe('vol01')
    expect(formatVolume(9999)).toBe(`vol${MAX_VOLUME}`)
  })

  it('폴더명(normalizeVolume)과 왕복해도 값이 유지된다', () => {
    for (const n of [1, 9, 10, 99, 100]) {
      expect(parseVolumeNumber(normalizeVolume(formatVolume(n)))).toBe(n)
    }
  })
})

describe('buildUploadDirectory', () => {
  const at = new Date(2026, 7, 20)

  it('연도·빌더 폴더·팀/전시회·회차로 경로를 만든다', () => {
    expect(buildUploadDirectory('arch-plan/nextcon', 'vol01', at)).toBe(
      '/e-dm/2026/newsletterbuilder/arch-plan/nextcon/vol01/',
    )
  })

  // 이미지·HTML이 실제로 어디로 올라가는지 — 폴더 안의 폴더를 고른 경우
  it('폴더 안의 폴더까지 경로에 담는다', () => {
    expect(buildUploadDirectory('leisure-ind/gocaf', 'eng/vol01', at)).toBe(
      '/e-dm/2026/newsletterbuilder/leisure-ind/gocaf/eng/vol01/',
    )
  })

  it('빈 문서 폴더도 같은 자리에 들어간다', () => {
    expect(buildUploadDirectory('mice/blank', 'vol01', at)).toBe(
      '/e-dm/2026/newsletterbuilder/mice/blank/vol01/',
    )
  })

  it('회차 표기가 흔들려도 같은 폴더로 간다', () => {
    expect(buildUploadDirectory('arch-plan/nextcon', 'Vol 01', at)).toBe(
      '/e-dm/2026/newsletterbuilder/arch-plan/nextcon/vol01/',
    )
  })

  it('폴더가 없으면 경로를 지어내지 않고 null (업로드를 막기 위함)', () => {
    expect(buildUploadDirectory(null, 'vol01', at)).toBeNull()
    expect(buildUploadDirectory('', 'vol01', at)).toBeNull()
    expect(buildUploadDirectory('   ', 'vol01', at)).toBeNull()
    expect(buildUploadDirectory(undefined, 'vol01', at)).toBeNull()
  })

  it('회차가 없으면 경로를 지어내지 않고 null', () => {
    expect(buildUploadDirectory('nextcon', '', at)).toBeNull()
    expect(buildUploadDirectory('nextcon', '   ', at)).toBeNull()
    expect(buildUploadDirectory('nextcon', null, at)).toBeNull()
    expect(buildUploadDirectory('nextcon', undefined, at)).toBeNull()
  })

  it('폴더명이 될 수 없는 회차도 null로 본다', () => {
    expect(buildUploadDirectory('nextcon', '회차', at)).toBeNull()
  })
})

describe('displayUploadDirectory', () => {
  it('모든 업로드가 공유하는 /e-dm/{연도}/newsletterbuilder/ 앞부분만 뗀다', () => {
    expect(displayUploadDirectory('/e-dm/2026/newsletterbuilder/arch-plan/hobanexpo/vol99/')).toBe(
      'arch-plan/hobanexpo/vol99/',
    )
    expect(displayUploadDirectory('/e-dm/2026/newsletterbuilder/conv1/blank/vol01/')).toBe(
      'conv1/blank/vol01/',
    )
  })

  it('모양이 다르면 그대로 보여준다 (임의로 잘라내지 않는다)', () => {
    expect(displayUploadDirectory('/other/2026/vms/vol01/')).toBe('/other/2026/vms/vol01/')
  })

  it('값이 없으면 빈 문자열', () => {
    expect(displayUploadDirectory(null)).toBe('')
    expect(displayUploadDirectory(undefined)).toBe('')
  })
})

describe('uploadFolderOf', () => {
  it('{팀}/{전시회} 순서 — S3에 준비된 폴더 구조와 같다', () => {
    expect(uploadFolderOf('nextcon', 'arch-plan')).toBe('arch-plan/nextcon')
    expect(uploadFolderOf('c-uas', 'growth-plan')).toBe('growth-plan/c-uas')
    expect(uploadFolderOf('space_design', 'arch-str')).toBe('arch-str/space_design')
  })

  it('빈 문서면 그 팀의 blank에 모은다', () => {
    expect(uploadFolderOf(null, 'mice')).toBe('mice/blank')
    expect(uploadFolderOf('', 'conv1')).toBe('conv1/blank')
    expect(uploadFolderOf(undefined, 'arch-plan')).toBe('arch-plan/blank')
  })

  // 팀이 곧 폴더 주인이라, 팀을 모르면 올릴 자리를 정할 수 없다(템플릿만 있어도 마찬가지)
  it('팀이 없으면 빈 문자열 — 올릴 자리를 지어내지 않는다', () => {
    expect(uploadFolderOf(null, null)).toBe('')
    expect(uploadFolderOf('', '')).toBe('')
    expect(uploadFolderOf('   ', '   ')).toBe('')
    expect(uploadFolderOf('nextcon', null)).toBe('')
    expect(uploadFolderOf('한글', '한글')).toBe('') // S3 키로 쓸 글자가 안 남는다
  })

  it('S3 키에 안전한 글자만 남긴다', () => {
    expect(uploadFolderOf('Next Con', 'arch-plan')).toBe('arch-plan/nextcon')
    expect(uploadFolderOf(null, 'MICE 팀')).toBe('mice/blank')
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

describe('validateHtmlFile', () => {
  it('html·htm은 통과시킨다', () => {
    expect(validateHtmlFile(fakeFile('a.html', 1024, 'text/html'))).toBeNull()
    expect(validateHtmlFile(fakeFile('a.htm', 1024, 'text/html'))).toBeNull()
  })

  it('MIME이 비어 있어도 확장자가 맞으면 통과시킨다', () => {
    expect(validateHtmlFile(fakeFile('newsletter.html', 1024, ''))).toBeNull()
  })

  it('HTML이 아니면 막는다', () => {
    expect(validateHtmlFile(fakeFile('a.png', 1024, 'image/png'))).toMatch(/HTML 파일만/)
    expect(validateHtmlFile(fakeFile('a.txt', 1024, 'text/plain'))).toMatch(/HTML 파일만/)
  })

  it('최대 크기를 넘으면 막고, 경계값은 통과시킨다', () => {
    expect(validateHtmlFile(fakeFile('a.html', MAX_HTML_BYTES + 1, 'text/html'))).toMatch(/너무 커요/)
    expect(validateHtmlFile(fakeFile('a.html', MAX_HTML_BYTES, 'text/html'))).toBeNull()
  })

  it('빈 파일은 막는다', () => {
    expect(validateHtmlFile(fakeFile('a.html', 0, 'text/html'))).toBe('빈 파일이에요')
  })
})

describe('HTML 업로드 이름 — 한글 이름이면 newsletter로 채운다', () => {
  it('이름에 쓸 글자가 남지 않으면 넘긴 이름을 쓴다', () => {
    // 이미지(기본값 image)와 달리 HTML은 'newsletter.html'이 되도록 uploadHtml이 넘긴다
    expect(buildUploadFileName('뉴스레터.html', new Date(), false, 'newsletter')).toBe(
      'newsletter.html',
    )
    expect(buildUploadFileName('뉴스레터.png', new Date(), false)).toBe('image.png')
  })

  it('영문 이름은 그대로 살린다', () => {
    expect(buildUploadFileName('kpex-vol04.html', new Date(), false, 'newsletter')).toBe(
      'kpex-vol04.html',
    )
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
