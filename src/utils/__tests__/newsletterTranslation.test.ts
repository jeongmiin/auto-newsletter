import { describe, expect, it } from 'vitest'
import type { ModuleInstance, ModuleMetadata } from '@/types'
import {
  applyTranslationChanges,
  collectTranslationUnits,
  isTranslatableProp,
  restoreSkeleton,
  toSkeleton,
} from '@/utils/newsletterTranslation'

const metadata: ModuleMetadata[] = [
  {
    id: 'TextModule',
    name: '텍스트 모듈',
    description: '',
    category: 'text',
    icon: '',
    htmlFile: '',
    editableProps: [
      { key: 'titleText', label: '제목', type: 'text' },
      { key: 'body', label: '본문', type: 'textarea' },
      { key: 'buttonUrl', label: 'URL', type: 'url' },
      { key: 'fontSize', label: '크기', type: 'text' },
      { key: 'tableCells', label: '표', type: 'table-editor' },
    ],
  },
]

const BODY_HTML =
  '<p style="color: #333;"><strong>참가 신청</strong>을 시작합니다.</p><p><span style="font-size: 12px;">9월 <a href="https://esfair.kr">엑스포</a>에 초대합니다.</span></p>'

const modules: ModuleInstance[] = [
  {
    id: 'module-1',
    moduleId: 'TextModule',
    order: 0,
    groupId: 'group-1',
    styles: {},
    properties: {
      titleText: '행사 안내',
      body: BODY_HTML,
      buttonUrl: 'https://example.com/신청',
      fontSize: '16px',
      tableCells: [[
        { id: 'cell-1', type: 'th', content: '구분', colspan: 1, rowspan: 1 },
        { id: 'cell-2', type: 'td', content: '일정 안내', colspan: 1, rowspan: 1 },
      ]],
    },
  },
  {
    id: 'module-2',
    moduleId: 'TextModule',
    order: 1,
    styles: {},
    properties: { titleText: '다른 소식', body: '', fontSize: '14px' },
  },
]

describe('newsletterTranslation', () => {
  it('레이아웃 값과 URL을 제외하고 한국어 콘텐츠만 수집한다', () => {
    const units = collectTranslationUnits(modules, metadata)
    expect(units.map((unit) => unit.source)).toEqual([
      '행사 안내',
      // 리치 텍스트는 문장마다 쪼개지 않고 한 덩어리로 — 문단이 한 줄이 된다
      '참가 신청을 시작합니다.\n9월 엑스포에 초대합니다.',
      '구분',
      '일정 안내',
      '다른 소식',
    ])
  })

  it('HTML 값은 카드 한 장이고, 사람에겐 평문·번역기에는 속성을 뗀 뼈대가 간다', () => {
    const units = collectTranslationUnits(modules, metadata).filter((unit) => unit.path[1] === 'body')
    expect(units).toHaveLength(1)
    expect(/<[a-z]/i.test(units[0]!.source)).toBe(false)
    expect(units[0]!.propertyLabel).toBe('본문')
    expect(units[0]!.originalHtml).toBe(BODY_HTML)
    // 보내는 건 style·href 가 빠지고 번호만 남은 뼈대라 훨씬 짧다
    expect(units[0]!.sourceHtml).toBe(
      '<p i="0"><strong i="1">참가 신청</strong>을 시작합니다.</p><p i="2"><span i="3">9월 <a i="4">엑스포</a>에 초대합니다.</span></p>',
    )
    expect(units[0]!.sourceHtml!.length).toBeLessThan(BODY_HTML.length)
  })

  it('뼈대로 보내도 번역 결과에 원래 속성이 그대로 되붙는다', () => {
    const { html, attrs } = toSkeleton(BODY_HTML)
    expect(restoreSkeleton(html, attrs)).toBe(BODY_HTML)
  })

  it('번역기가 태그 순서를 바꿔 돌려줘도 번호를 보고 제 속성을 찾아간다', () => {
    const { attrs } = toSkeleton(BODY_HTML)
    // <a>가 <strong> 앞으로 오도록 뒤집힌 상황
    const shuffled = '<p i="2"><a i="4">Expo</a></p><p i="0"><strong i="1">Registration</strong></p>'
    const restored = restoreSkeleton(shuffled, attrs)
    expect(restored).toContain('<a href="https://esfair.kr">Expo</a>')
    expect(restored).toContain('<strong>Registration</strong>')
    expect(restored).toContain('style="color: #333;"')
  })

  it('번호가 없거나 모르는 번호면 속성 없이 두고 엉뚱한 서식을 붙이지 않는다', () => {
    const { attrs } = toSkeleton(BODY_HTML)
    const restored = restoreSkeleton('<p><strong i="99">Hello</strong></p>', attrs)
    expect(restored).toBe('<p><strong>Hello</strong></p>')
  })

  it('이미지 설명처럼 모듈 이름만으로 알 수 없는 값에만 배지를 붙인다', () => {
    const withAlt: ModuleMetadata[] = [
      {
        ...metadata[0]!,
        editableProps: [
          { key: 'body', label: '본문', type: 'textarea' },
          { key: 'imageAlt', label: '이미지 설명', type: 'text' },
        ],
      },
    ]
    const instance: ModuleInstance[] = [
      { ...modules[0]!, properties: { body: '본문입니다', imageAlt: '로고' } },
    ]
    const units = collectTranslationUnits(instance, withAlt)
    expect(units.map((unit) => [unit.propertyLabel, unit.badge])).toEqual([
      ['본문', undefined],
      ['이미지 설명', '이미지 설명'],
    ])
  })

  it('표의 셀에는 몇 행 몇 열인지 배지를 붙인다', () => {
    const units = collectTranslationUnits(modules, metadata).filter(
      (unit) => unit.path[1] === 'tableCells',
    )
    expect(units.map((unit) => unit.badge)).toEqual(['1행 1열', '1행 2열'])
  })

  it('명시적인 translatable 설정을 기본 규칙보다 우선한다', () => {
    expect(isTranslatableProp({ key: 'custom', label: '', type: 'text', translatable: true })).toBe(true)
    expect(isTranslatableProp({ key: 'body', label: '', type: 'textarea', translatable: false })).toBe(false)
  })

  it('원본을 변경하지 않고 중첩된 번역 결과를 적용한다', () => {
    const [unit] = collectTranslationUnits(modules, metadata)
    const next = applyTranslationChanges(modules, [{ ...unit, translated: 'Event Information' }])
    expect(next[0].properties.titleText).toBe('Event Information')
    expect(modules[0].properties.titleText).toBe('행사 안내')
  })

  it('번역문을 고치지 않았으면 번역기가 돌려준 HTML을 그대로 써 서식이 살아남는다', () => {
    const [unit] = collectTranslationUnits(modules, metadata).filter(
      (item) => item.path[1] === 'body',
    )
    // 번역기는 보낸 뼈대 그대로(번호를 단 채) 글자만 바꿔 돌려준다
    const translatedHtml =
      '<p i="0"><strong i="1">Registration</strong> begins.</p><p i="2"><span i="3">September <a i="4">Expo</a> — you are invited.</span></p>'
    const next = applyTranslationChanges(modules, [
      {
        ...unit!,
        translatedHtml,
        translated: 'Registration begins.\nSeptember Expo — you are invited.',
      },
    ])
    // 번호를 보고 style·href 가 제자리에 되붙는다
    expect(next[0].properties.body).toBe(
      '<p style="color: #333;"><strong>Registration</strong> begins.</p><p><span style="font-size: 12px;">September <a href="https://esfair.kr">Expo</a> — you are invited.</span></p>',
    )
    expect(modules[0].properties.body).toBe(BODY_HTML)
  })

  it('번역문을 고치면 사람이 쓴 글이 우선이고, 문단 구조와 태그 자체는 남는다', () => {
    const [unit] = collectTranslationUnits(modules, metadata).filter(
      (item) => item.path[1] === 'body',
    )
    const next = applyTranslationChanges(modules, [
      {
        ...unit!,
        translatedHtml: '<p>auto</p><p>auto2</p>',
        translated: '내가 고친 첫 줄\n내가 고친 둘째 줄',
      },
    ])
    const body = String(next[0].properties.body)
    expect(body).toContain('내가 고친 첫 줄')
    expect(body).toContain('내가 고친 둘째 줄')
    // 문단은 그대로 둘이고, 원래 있던 링크 태그도 사라지지 않는다
    expect(body.match(/<p/g)).toHaveLength(2)
    expect(body).toContain('href="https://esfair.kr"')
  })

  it('줄이 모자라면 남는 문단은 원문 그대로 둔다', () => {
    const [unit] = collectTranslationUnits(modules, metadata).filter(
      (item) => item.path[1] === 'body',
    )
    const next = applyTranslationChanges(modules, [
      { ...unit!, translatedHtml: '<p>a</p><p>b</p>', translated: 'Only the first line' },
    ])
    expect(next[0].properties.body).toContain('9월')
  })

  it('번역문에 태그가 섞여 와도 글자로만 들어가고 실행되지 않는다', () => {
    const [unit] = collectTranslationUnits(modules, metadata).filter((unit) => unit.path[1] === 'body')
    const next = applyTranslationChanges(modules, [
      { ...unit!, translated: 'Translated<script>alert(1)</script>' },
    ])
    expect(next[0].properties.body).not.toContain('<script>')
    expect(next[0].properties.body).toContain('Translated&lt;script&gt;')
  })
})
