import { describe, expect, it } from 'vitest'
import type { ModuleInstance, ModuleMetadata } from '@/types'
import { collectTranslationUnits } from '@/utils/newsletterTranslation'
import {
  applyProofreadSuggestions,
  buildProofreadItems,
  indexOfPhrase,
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

// 맞춤법 검사는 어느 언어든 글자가 든 값을 다 모은다(스토어와 같은 옵션)
const units = collectTranslationUnits(modules, metadata, { letters: 'any' })

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

describe('영어처럼 띄어 쓰는 글 — 단어 경계', () => {
  it('indexOfPhrase 는 라틴 구절을 단어 경계에서만, 한중일 구절은 그대로 찾는다', () => {
    expect(indexOfPhrase('then the end', 'the')).toBe(5)
    expect(indexOfPhrase('then', 'the')).toBe(-1)
    expect(indexOfPhrase('상담회가개최됩니다', '개최')).toBe(4)
    expect(indexOfPhrase('KAI에듀', 'AI에듀')).toBe(-1)
  })

  const english: ModuleInstance[] = [
    {
      id: 'en-1',
      moduleId: 'TextModule',
      order: 0,
      styles: {},
      properties: {
        buttonText: 'Register now and then',
        body: '<p>Then <strong>the</strong> show opens. Visit the booth.</p>',
      },
    },
  ]
  it('번역용 수집(기본)은 한국어가 든 값만, 검사용 수집은 글자가 든 값을 다 모은다', () => {
    expect(collectTranslationUnits(english, metadata)).toEqual([])
    expect(collectTranslationUnits(english, metadata, { letters: 'any' }).map((u) => u.source)).toEqual([
      'Register now and then',
      'Then the show opens. Visit the booth.',
    ])
    // 숫자·기호뿐인 값은 어느 모드에서도 안 모은다
    const symbols: ModuleInstance[] = [
      { id: 's', moduleId: 'TextModule', order: 0, styles: {}, properties: { buttonText: '→ 2026. 10. 15', body: '<p>₩30,000</p>' } },
    ]
    expect(collectTranslationUnits(symbols, metadata, { letters: 'any' })).toEqual([])
  })

  const enUnits = collectTranslationUnits(english, metadata, { letters: 'any' })
  const { unitsByItemId } = buildProofreadItems(enUnits)

  it('카드의 앞뒤 글도 단어 경계에 맞춘 자리에서 자른다', () => {
    const [card] = toSuggestions(
      [{ id: '1', lang: 'en', original: 'the show', corrected: 'the shows', reason: '' }],
      unitsByItemId,
    )
    expect(card).toMatchObject({ lang: 'en', before: 'Then ', after: ' opens. Visit the booth.' })
  })

  it("서식 안의 'the' 를 바꿀 때 'Then' 은 건드리지 않고, 평문 값도 단어로만 바꾼다", () => {
    const { modules: next, applied } = applyProofreadSuggestions(english, [
      ...toSuggestions([{ id: '1', lang: 'en', original: 'the', corrected: 'The', reason: '' }], unitsByItemId),
      ...toSuggestions([{ id: '0', lang: 'en', original: 'the', corrected: 'THE', reason: '' }], unitsByItemId),
    ])
    expect(applied).toBe(1) // 버튼 글귀 'Register now and then' 에는 단어 'the' 가 없다
    expect(next[0].properties.body).toBe('<p>Then <strong>The</strong> show opens. Visit The booth.</p>')
    expect(next[0].properties.buttonText).toBe('Register now and then')
  })
})
