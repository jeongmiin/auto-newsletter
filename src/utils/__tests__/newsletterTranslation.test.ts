import { describe, expect, it } from 'vitest'
import type { ModuleInstance, ModuleMetadata } from '@/types'
import {
  applyTranslationChanges,
  collectTranslationUnits,
  isTranslatableProp,
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
      '참가 신청',
      '을 시작합니다.',
      '9월',
      '엑스포',
      '에 초대합니다.',
      '구분',
      '일정 안내',
      '다른 소식',
    ])
  })

  it('HTML 값은 태그·스타일 없이 텍스트 노드만 문장으로 뽑고 번호를 붙인다', () => {
    const units = collectTranslationUnits(modules, metadata).filter((unit) => unit.path[1] === 'body')
    expect(units.every((unit) => !/<[a-z]/i.test(unit.source))).toBe(true)
    expect(units.map((unit) => unit.propertyLabel)).toEqual(['본문 1', '본문 2', '본문 3', '본문 4', '본문 5'])
    expect(units.map((unit) => unit.textNodeIndex)).toEqual([0, 1, 2, 3, 4])
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

  it('HTML 값은 텍스트 노드만 바꾸고 태그·인라인 스타일·공백을 그대로 둔다', () => {
    const units = collectTranslationUnits(modules, metadata).filter((unit) => unit.path[1] === 'body')
    const translated = ['Registration', ' begins.', 'September', 'Expo', ' — you are invited.']
    const next = applyTranslationChanges(
      modules,
      units.map((unit, index) => ({ ...unit, translated: translated[index]! })),
    )
    expect(next[0].properties.body).toBe(
      '<p style="color: #333;"><strong>Registration</strong> begins.</p><p><span style="font-size: 12px;">September <a href="https://esfair.kr">Expo</a> — you are invited.</span></p>',
    )
    expect(modules[0].properties.body).toBe(BODY_HTML)
  })

  it('일부 문장만 적용해도 나머지 텍스트 노드는 원문으로 남는다', () => {
    const units = collectTranslationUnits(modules, metadata).filter((unit) => unit.path[1] === 'body')
    const next = applyTranslationChanges(modules, [{ ...units[0]!, translated: 'Registration' }])
    expect(next[0].properties.body).toBe(BODY_HTML.replace('참가 신청', 'Registration'))
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
