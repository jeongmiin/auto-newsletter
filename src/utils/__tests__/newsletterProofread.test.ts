import { describe, expect, it } from 'vitest'
import type { ModuleInstance, ModuleMetadata } from '@/types'
import { collectTranslationUnits } from '@/utils/newsletterTranslation'
import {
  applyProofreadSuggestions,
  buildProofreadItems,
  toSuggestions,
} from '@/utils/newsletterProofread'

const metadata: ModuleMetadata[] = [
  {
    id: 'TextModule',
    name: '텍스트 모듈',
    description: '',
    category: 'text',
    icon: '',
    htmlFile: '',
    editableProps: [
      { key: 'buttonText', label: '버튼', type: 'text' },
      { key: 'body', label: '본문', type: 'textarea' },
      { key: 'tableCells', label: '표', type: 'table-editor' },
    ],
  },
]

const BODY_HTML =
  '<p style="color: #333;"><strong>상담회가 개최</strong> 됩니다!</p><p>많은 관심과 참석 부탁 드립니다.</p>'

const modules: ModuleInstance[] = [
  {
    id: 'module-1',
    moduleId: 'TextModule',
    order: 0,
    styles: {},
    properties: {
      buttonText: '자세히 보기',
      body: BODY_HTML,
      tableCells: [[{ id: 'c1', type: 'td', content: '<p>변경될수&nbsp;있습니다</p>', colspan: 1, rowspan: 1 }]],
    },
  },
  {
    id: 'module-2',
    moduleId: 'TextModule',
    order: 1,
    styles: {},
    properties: { buttonText: '자세히 보기', body: '' },
  },
]

const units = collectTranslationUnits(modules, metadata)

describe('buildProofreadItems', () => {
  it('같은 글은 한 번만 보내고, 그 글을 가진 값들을 짝지어 둔다', () => {
    const { items, unitsByItemId } = buildProofreadItems(units)
    expect(items.map((item) => item.text)).toEqual([
      '자세히 보기',
      '상담회가 개최 됩니다!\n많은 관심과 참석 부탁 드립니다.',
      '변경될수 있습니다',
    ])
    expect(unitsByItemId.get('0')!.map((unit) => unit.moduleInstanceId)).toEqual(['module-1', 'module-2'])
  })
})

describe('toSuggestions', () => {
  const { unitsByItemId } = buildProofreadItems(units)

  it('고칠 구절의 앞뒤 글을 같은 줄에서 잘라 카드로 만든다', () => {
    const [card] = toSuggestions(
      [{ id: '1', original: '개최 됩니다', corrected: '개최됩니다', reason: '띄어쓰기' }],
      unitsByItemId,
    )
    expect(card).toMatchObject({
      original: '개최 됩니다',
      corrected: '개최됩니다',
      before: '상담회가 ',
      after: '!',
      accepted: true,
    })
  })

  it('같은 글을 가진 값마다 카드가 하나씩 생긴다', () => {
    const cards = toSuggestions(
      [{ id: '0', original: '자세히', corrected: '자세이', reason: '' }],
      unitsByItemId,
    )
    expect(cards.map((card) => card.unit.moduleInstanceId)).toEqual(['module-1', 'module-2'])
  })

  it('문단을 넘나드는 구절·없는 id·고친 게 없는 항목은 버린다', () => {
    const cards = toSuggestions(
      [
        { id: '1', original: '됩니다!\n많은', corrected: '됩니다! 많은', reason: '' },
        { id: '99', original: '개최', corrected: '게최', reason: '' },
        { id: '1', original: '개최', corrected: '개최', reason: '' },
      ],
      unitsByItemId,
    )
    expect(cards).toEqual([])
  })
})

describe('applyProofreadSuggestions', () => {
  const { unitsByItemId } = buildProofreadItems(units)
  const suggest = (id: string, original: string, corrected: string) =>
    toSuggestions([{ id, original, corrected, reason: '' }], unitsByItemId)

  it('태그 경계를 걸친 구절도 서식을 둔 채 글자만 바꾼다', () => {
    const { modules: next, applied } = applyProofreadSuggestions(modules, [
      ...suggest('1', '개최 됩니다', '개최됩니다'),
      ...suggest('1', '부탁 드립니다', '부탁드립니다'),
    ])
    expect(applied).toBe(2)
    expect(next[0].properties.body).toBe(
      '<p style="color: #333;"><strong>상담회가 개최됩니다</strong>!</p><p>많은 관심과 참석 부탁드립니다.</p>',
    )
    // 원본은 그대로
    expect(modules[0].properties.body).toBe(BODY_HTML)
  })

  it('표 셀처럼 공백이 &nbsp;로 저장된 값에서도 구절을 찾는다', () => {
    const { modules: next, applied } = applyProofreadSuggestions(
      modules,
      suggest('2', '변경될수 있습니다', '변경될 수 있습니다'),
    )
    expect(applied).toBe(1)
    const cells = next[0].properties.tableCells as Array<Array<{ content: string }>>
    expect(cells[0][0].content).toBe('<p>변경될 수 있습니다</p>')
  })

  it('평문 값은 그 구절만 바꾸고, 같은 글을 가진 값 모두에 적용한다', () => {
    const { modules: next, applied } = applyProofreadSuggestions(modules, suggest('0', '자세히', '자세이'))
    expect(applied).toBe(2)
    expect(next.map((module) => module.properties.buttonText)).toEqual(['자세이 보기', '자세이 보기'])
  })

  it('끈 카드는 호출하는 쪽이 걸러 보내고, 검사 뒤 글이 바뀌어 구절이 없으면 건너뛴다', () => {
    const edited = JSON.parse(JSON.stringify(modules)) as ModuleInstance[]
    edited[0].properties.body = '<p>전혀 다른 글</p>'
    const { modules: next, applied } = applyProofreadSuggestions(
      edited,
      suggest('1', '개최 됩니다', '개최됩니다'),
    )
    expect(applied).toBe(0)
    expect(next[0].properties.body).toBe('<p>전혀 다른 글</p>')
  })

  it('고친 글 안에 원래 구절이 들어 있어도 한 번만 바꾼다', () => {
    const { modules: next } = applyProofreadSuggestions(modules, suggest('1', '참석', '참석과 참석'))
    expect(next[0].properties.body).toContain('관심과 참석과 참석 부탁')
    expect(String(next[0].properties.body).match(/참석/g)).toHaveLength(2)
  })
})
