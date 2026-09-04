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

const modules: ModuleInstance[] = [
  {
    id: 'module-1',
    moduleId: 'TextModule',
    order: 0,
    groupId: 'group-1',
    styles: {},
    properties: {
      titleText: '행사 안내',
      body: '<p><strong>참가 신청</strong>을 시작합니다.</p>',
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
    const units = collectTranslationUnits(modules, metadata, { scope: 'all' })
    expect(units.map((unit) => unit.source)).toEqual([
      '행사 안내',
      '<p><strong>참가 신청</strong>을 시작합니다.</p>',
      '구분',
      '일정 안내',
      '다른 소식',
    ])
    expect(units[1].format).toBe('html')
  })

  it('선택 모듈과 선택 그룹 범위를 구분한다', () => {
    expect(
      collectTranslationUnits(modules, metadata, {
        scope: 'module',
        selectedModuleId: 'module-2',
      }),
    ).toHaveLength(1)
    expect(
      collectTranslationUnits(modules, metadata, {
        scope: 'group',
        selectedGroupId: 'group-1',
      }),
    ).toHaveLength(4)
  })

  it('명시적인 translatable 설정을 기본 규칙보다 우선한다', () => {
    expect(isTranslatableProp({ key: 'custom', label: '', type: 'text', translatable: true })).toBe(true)
    expect(isTranslatableProp({ key: 'body', label: '', type: 'textarea', translatable: false })).toBe(false)
  })

  it('원본을 변경하지 않고 중첩된 번역 결과를 적용한다', () => {
    const [unit] = collectTranslationUnits(modules, metadata, { scope: 'all' })
    const next = applyTranslationChanges(modules, [{ ...unit, translated: 'Event Information' }])
    expect(next[0].properties.titleText).toBe('Event Information')
    expect(modules[0].properties.titleText).toBe('행사 안내')
  })

  it('HTML 번역 결과를 적용하기 전에 위험한 태그를 제거한다', () => {
    const unit = collectTranslationUnits(modules, metadata, { scope: 'all' })[1]
    const next = applyTranslationChanges(modules, [
      { ...unit, translated: '<p>Translated</p><script>alert(1)</script>' },
    ])
    expect(next[0].properties.body).toBe('<p>Translated</p>')
  })
})
