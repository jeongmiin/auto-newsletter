import { describe, it, expect } from 'vitest'
import {
  formatModified,
  isUsableFolderName,
  parseFileNames,
  parseFolderList,
  toPrefix,
  validateFolderName,
} from '../s3Browse'

/** 실제 ListObjectsV2 응답과 같은 모양의 XML */
const xml = (keys: { key: string; at?: string }[]) => `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>esang-newsletter</Name>
  <IsTruncated>false</IsTruncated>
  ${keys
    .map(
      (k) => `<Contents>
    <Key>${k.key}</Key>
    <LastModified>${k.at ?? '2026-06-18T09:55:33.000Z'}</LastModified>
    <Size>100</Size>
  </Contents>`,
    )
    .join('\n')}
</ListBucketResult>`

const PREFIX = 'e-dm/2026/newsletterbuilder/conv1/police/'

/** 이미지를 올리기 전에 '같은 이름이 이미 있는지' 보는 자리 — 그 폴더 바로 아래만 본다 */
describe('parseFileNames', () => {
  const VOL = `${PREFIX}vol01/`

  it('prefix 바로 아래 파일 이름만 돌려준다', () => {
    const names = parseFileNames(
      xml([{ key: `${VOL}banner.png` }, { key: `${VOL}main.jpg` }]),
      VOL,
    )
    expect(names).toEqual(['banner.png', 'main.jpg'])
  })

  it('하위 폴더 안의 파일은 세지 않는다 — 덮어쓰기는 같은 자리에서만 일어난다', () => {
    const names = parseFileNames(
      xml([{ key: `${VOL}banner.png` }, { key: `${VOL}eng/banner.png` }]),
      VOL,
    )
    expect(names).toEqual(['banner.png'])
  })

  it('폴더 자리를 잡는 0바이트 키는 이름이 아니다', () => {
    expect(parseFileNames(xml([{ key: VOL }]), VOL)).toEqual([])
  })

  it('다른 폴더의 키는 건너뛴다', () => {
    const names = parseFileNames(
      xml([{ key: `${PREFIX}vol02/banner.png` }, { key: `${VOL}main.jpg` }]),
      VOL,
    )
    expect(names).toEqual(['main.jpg'])
  })
})

describe('parseFolderList', () => {
  it('prefix 바로 아래 폴더로 묶고 파일 수를 센다', () => {
    const list = parseFolderList(
      xml([
        { key: `${PREFIX}vol01/banner.png` },
        { key: `${PREFIX}vol01/main.jpg` },
        { key: `${PREFIX}vol02/main.jpg` },
      ]),
      PREFIX,
    )
    expect(list.map((f) => [f.name, f.itemCount])).toEqual([
      ['vol01', 2],
      ['vol02', 1],
    ])
  })

  // S3에는 빈 폴더가 없어 '자리를 잡는' 0바이트 키가 폴더 이름으로 남는다 — 항목으로 세면 안 된다
  it('폴더 자리를 잡는 키는 폴더로만 잡고 항목 수엔 넣지 않는다', () => {
    const list = parseFolderList(xml([{ key: `${PREFIX}vol03/` }]), PREFIX)
    expect(list).toEqual([
      { name: 'vol03', itemCount: 0, hasChildren: false, lastModified: null },
    ])
  })

  it('폴더 안에서 가장 최근 수정 시각을 남긴다', () => {
    const list = parseFolderList(
      xml([
        { key: `${PREFIX}vol01/a.png`, at: '2026-06-01T00:00:00.000Z' },
        { key: `${PREFIX}vol01/b.png`, at: '2026-06-18T09:55:33.000Z' },
      ]),
      PREFIX,
    )
    expect(list[0].lastModified?.toISOString()).toBe('2026-06-18T09:55:33.000Z')
  })

  it('더 깊은 곳의 파일도 맨 윗 폴더로 묶는다', () => {
    const list = parseFolderList(xml([{ key: `${PREFIX}vol01/sub/deep.png` }]), PREFIX)
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('vol01')
  })

  // 폴더 안에 폴더를 둘 수 있어(eng/vol01), 화면이 '고를 자리'와 '들어갈 자리'를 갈라야 한다
  describe('폴더 안의 폴더', () => {
    it('안에 폴더가 있으면 hasChildren', () => {
      const list = parseFolderList(
        xml([
          { key: `${PREFIX}eng/vol01/main.jpg` },
          { key: `${PREFIX}vol53/main.jpg` },
        ]),
        PREFIX,
      )
      expect(list.map((f) => [f.name, f.hasChildren])).toEqual([
        ['eng', true],
        ['vol53', false],
      ])
    })

    it('항목 수는 바로 아래만 센다 — 하위 폴더는 그 안의 파일 수와 무관하게 하나', () => {
      const list = parseFolderList(
        xml([
          { key: `${PREFIX}eng/vol01/a.jpg` },
          { key: `${PREFIX}eng/vol01/b.jpg` },
          { key: `${PREFIX}eng/vol02/c.jpg` },
          { key: `${PREFIX}eng/memo.html` },
        ]),
        PREFIX,
      )
      // 하위 폴더 2개(vol01·vol02) + 바로 아래 파일 1개
      expect(list[0]).toMatchObject({ name: 'eng', itemCount: 3, hasChildren: true })
    })

    it('폴더 자리를 잡는 키만 있어도 하위 폴더로 센다', () => {
      const list = parseFolderList(xml([{ key: `${PREFIX}eng/vol01/` }]), PREFIX)
      expect(list[0]).toMatchObject({ name: 'eng', itemCount: 1, hasChildren: true })
    })
  })

  it('폴더 바로 아래 파일(회차 없이 놓인 것)은 목록에 넣지 않는다', () => {
    const list = parseFolderList(xml([{ key: `${PREFIX}stray.png` }]), PREFIX)
    expect(list).toEqual([])
  })

  it('숫자 순서로 정렬한다 — vol2가 vol10보다 앞', () => {
    const list = parseFolderList(
      xml([
        { key: `${PREFIX}vol10/a.png` },
        { key: `${PREFIX}vol2/a.png` },
        { key: `${PREFIX}common/a.png` },
      ]),
      PREFIX,
    )
    expect(list.map((f) => f.name)).toEqual(['common', 'vol2', 'vol10'])
  })

  it('비어 있으면 빈 배열', () => {
    expect(parseFolderList(xml([]), PREFIX)).toEqual([])
  })

  describe('임시 저장 파일 찾기 (이어서 편집)', () => {
    it('폴더 바로 아래 _edit.html을 집어낸다', () => {
      const list = parseFolderList(
        xml([
          { key: `${PREFIX}vol01/banner.png` },
          { key: `${PREFIX}vol01/police_vol01_edit.html`, at: '2026-09-01T02:00:00.000Z' },
        ]),
        PREFIX,
      )
      expect(list[0].editFile?.name).toBe('police_vol01_edit.html')
      expect(list[0].editFile?.key).toBe(`${PREFIX}vol01/police_vol01_edit.html`)
      expect(list[0].editFile?.lastModified?.toISOString()).toBe('2026-09-01T02:00:00.000Z')
    })

    it('발송용(_send.html)이나 그냥 html은 대상이 아니다', () => {
      const list = parseFolderList(
        xml([
          { key: `${PREFIX}vol01/police_vol01_send.html` },
          { key: `${PREFIX}vol01/2026-newsletter.html` },
        ]),
        PREFIX,
      )
      expect(list[0].editFile).toBeUndefined()
    })

    it('더 깊은 곳의 파일은 보지 않는다', () => {
      const list = parseFolderList(xml([{ key: `${PREFIX}vol01/old/a_edit.html` }]), PREFIX)
      expect(list[0].editFile).toBeUndefined()
    })

    // 발송용이 있으면 '이미 나간 회차'라는 뜻 — 화면이 '발송 완료'로 알린다
    it('발송용(_send.html)은 sendFile로 따로 잡는다', () => {
      const list = parseFolderList(
        xml([
          { key: `${PREFIX}vol01/police_vol01_edit.html` },
          { key: `${PREFIX}vol01/police_vol01_send.html`, at: '2026-09-02T05:00:00.000Z' },
        ]),
        PREFIX,
      )
      expect(list[0].sendFile?.name).toBe('police_vol01_send.html')
      expect(list[0].sendFile?.lastModified?.toISOString()).toBe('2026-09-02T05:00:00.000Z')
      // 이어서 편집은 그대로 임시 저장 파일이 맡는다
      expect(list[0].editFile?.name).toBe('police_vol01_edit.html')
    })

    it('발송용이 없으면 sendFile도 없다', () => {
      const list = parseFolderList(xml([{ key: `${PREFIX}vol01/a_edit.html` }]), PREFIX)
      expect(list[0].sendFile).toBeUndefined()
    })

    it('여러 개면 가장 최근 것을 남긴다', () => {
      const list = parseFolderList(
        xml([
          { key: `${PREFIX}vol01/a_edit.html`, at: '2026-08-01T00:00:00.000Z' },
          { key: `${PREFIX}vol01/b_edit.html`, at: '2026-09-01T00:00:00.000Z' },
        ]),
        PREFIX,
      )
      expect(list[0].editFile?.name).toBe('b_edit.html')
    })
  })
})

describe('toPrefix', () => {
  it('업로드 경로의 앞 슬래시를 떼어 S3 prefix로 만든다', () => {
    expect(toPrefix('/e-dm/2026/newsletterbuilder/conv1/police/')).toBe(
      'e-dm/2026/newsletterbuilder/conv1/police/',
    )
  })
})

describe('isUsableFolderName', () => {
  // 경로를 만들 때 normalizeVolume이 소문자 영숫자·하이픈·밑줄만 남기므로, 그 밖의 이름은 실제 폴더와 어긋난다
  it('소문자 영숫자·하이픈·밑줄만 통과시킨다', () => {
    expect(isUsableFolderName('vol01')).toBe(true)
    expect(isUsableFolderName('common')).toBe(true)
    expect(isUsableFolderName('vol-56')).toBe(true)
    expect(isUsableFolderName('vol_56')).toBe(true)
    expect(isUsableFolderName('space_design')).toBe(true)
    expect(isUsableFolderName('Vol01')).toBe(false)
    expect(isUsableFolderName('vol 01')).toBe(false)
    expect(isUsableFolderName('회차')).toBe(false)
  })
})

describe('validateFolderName', () => {
  it('쓸 수 있는 이름이면 null', () => {
    expect(validateFolderName('vol01')).toBeNull()
    expect(validateFolderName('VOL01')).toBeNull() // 저장할 때 소문자로 눕힌다
    expect(validateFolderName('vol-01')).toBeNull()
    expect(validateFolderName('space_design')).toBeNull()
  })

  it('빈 값·공백·한글·다른 기호는 막는다', () => {
    expect(validateFolderName('   ')).toBe('폴더명을 입력해 주세요')
    expect(validateFolderName('vol 01')).toMatch(/영문 소문자·숫자/)
    expect(validateFolderName('회차1')).toMatch(/영문 소문자·숫자/)
    expect(validateFolderName('vol.01')).toMatch(/영문 소문자·숫자/)
  })

  it('이미 있는 이름은 막는다 (대소문자 무관)', () => {
    expect(validateFolderName('vol01', ['vol01'])).toBe('같은 이름의 폴더가 이미 있어요')
    expect(validateFolderName('VOL01', ['vol01'])).toBe('같은 이름의 폴더가 이미 있어요')
  })

  it('너무 길면 막는다', () => {
    expect(validateFolderName('v'.repeat(41))).toMatch(/너무 길어요/)
  })
})

describe('formatModified', () => {
  it('파일이 없으면 하이픈', () => {
    expect(formatModified(null)).toBe('-')
  })

  it('날짜가 있으면 사람이 읽는 표기로', () => {
    expect(formatModified(new Date('2026-06-18T09:55:33.000Z'))).toMatch(/2026/)
  })
})
