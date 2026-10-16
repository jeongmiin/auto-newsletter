import { describe, expect, it } from 'vitest'
import {
  isTitleHtml,
  planMemberFill,
  replaceParagraphAt,
  replaceParagraphText,
  stepsOf,
  toInlineHtml,
} from '../newsletterRecommend'

const p = (inner: string, style = 'margin:0; padding:0; line-height:1.7;') => `<p style="${style}">${inner}</p>`

describe('replaceParagraphText', () => {
  it('문단 스타일과 맨 앞의 굵게 span 은 두고 글만 바꾼다', () => {
    expect(replaceParagraphText(p('<strong style="font-size:20px;">옛 제목</strong>'), '새 제목')).toBe(
      p('<strong style="font-size:20px;">새 제목</strong>'),
    )
    expect(replaceParagraphText(p('<span style="font-size:24px; font-weight:700;">타이틀</span>'), '새')).toBe(
      p('<span style="font-size:24px; font-weight:700;">새</span>'),
    )
  })
  it('감싼 게 없으면 문단만 남기고, 중간에 든 굵게는 버린다(기본 헤더의 NEWSLETTER <strong>VOL.1</strong>)', () => {
    expect(replaceParagraphText(p('NEWSLETTER <strong>VOL.1</strong>', 'text-align:center;'), 'NEWSLETTER VOL.24')).toBe(
      p('NEWSLETTER VOL.24', 'text-align:center;'),
    )
  })
  it('태그는 글자로, 줄바꿈은 <br> 로 넣는다', () => {
    expect(toInlineHtml('a <b>\nc')).toBe('a &lt;b&gt;<br>c')
    expect(replaceParagraphText('', '글')).toBe(p('글'))
  })
})

describe('replaceParagraphAt', () => {
  it('n번째 문단만 바꾼다', () => {
    const html = p('VOL.1') + p('<strong>2023. 8. 3</strong>') + p('<a href="#">홈</a>')
    expect(replaceParagraphAt(html, 1, '2026. 8. 5 ~ 8. 8 코엑스')).toBe(
      p('VOL.1') + p('<strong>2026. 8. 5 ~ 8. 8 코엑스</strong>') + p('<a href="#">홈</a>'),
    )
    expect(replaceParagraphAt(html, 5, 'x')).toBe(html)
  })
})

describe('isTitleHtml', () => {
  it('<strong> 이나 font-weight:700 이면 타이틀', () => {
    expect(isTitleHtml(p('<strong>t</strong>'))).toBe(true)
    expect(isTitleHtml(p('<span style="font-weight:700;">t</span>'))).toBe(true)
    expect(isTitleHtml(p('본문'))).toBe(false)
  })
})

describe('planMemberFill', () => {
  const desc = (inner: string) => ({ moduleId: 'ModuleDescText', properties: { descriptionText: p(inner) } })
  const img = { moduleId: 'ModuleImg', properties: { imageUrl: 'x' } }

  it('모듈 02번: 이미지 → 굵은 타이틀 → 본문 → 버튼 순으로 넣는다', () => {
    const members = [
      img,
      desc('<strong style="font-size:22px;">타이틀</strong>'),
      desc('본문'),
      { moduleId: 'ModuleOneButton', properties: { buttonText: '버튼 →' } },
    ]
    expect(planMemberFill(members, { module: 'Module02', titles: ['새 제목'], bodies: ['새 본문'], buttons: ['신청 →'] }, 'Module02')).toEqual([
      { index: 1, props: { descriptionText: p('<strong style="font-size:22px;">새 제목</strong>') } },
      { index: 2, props: { descriptionText: p('새 본문') } },
      { index: 3, props: { buttonText: '신청 →' } },
    ])
  })

  it('2단 모듈: 왼쪽 칸 멤버가 먼저라 titles[0]·bodies[0] 이 왼쪽에 간다. 모자란 자리는 그대로', () => {
    const col = (n: number) => [
      img,
      desc(`<strong>제목${n}</strong>`),
      desc(`본문${n}`),
      { moduleId: 'ModuleSmallButton', properties: { btn1Text: '더보기' } },
    ]
    const fills = planMemberFill([...col(1), ...col(2)], { module: 'Module04', titles: ['왼', '오'], bodies: ['왼본'], buttons: [] }, 'Module04')
    expect(fills).toEqual([
      { index: 1, props: { descriptionText: p('<strong>왼</strong>') } },
      { index: 2, props: { descriptionText: p('왼본') } },
      { index: 5, props: { descriptionText: p('<strong>오</strong>') } },
    ])
  })

  it('뉴스 헤드라인 헤더: 링크가 든 "웹으로 보기"는 건드리지 않는다', () => {
    const members = [
      img,
      { moduleId: 'ModuleDivider', properties: {} },
      desc('<strong style="font-size:16px;">NEWSLETTER VOL.1</strong>'),
      desc('<a href="#">👀 웹으로 보기</a>'),
    ]
    expect(planMemberFill(members, { module: 'ModuleNewsHeader', titles: ['NEWSLETTER VOL.3'], bodies: ['x'] }, 'ModuleNewsHeader')).toEqual([
      { index: 2, props: { descriptionText: p('<strong style="font-size:16px;">NEWSLETTER VOL.3</strong>') } },
    ])
  })

  it('이미지형 헤더: 첫 글의 가운데 문단만 부제로, 이어서 타이틀·본문·버튼', () => {
    const lead = {
      moduleId: 'ModuleDescText',
      properties: { descriptionText: p('VOL.1') + p('<strong>2023. 8. 3</strong>') + p('<a href="#">홈</a>') },
    }
    const members = [
      img,
      lead,
      { moduleId: 'ModuleDivider', properties: {} },
      desc('<strong>옛 타이틀</strong>'),
      desc('옛 본문'),
      { moduleId: 'ModuleOneButton', properties: { buttonText: '사전등록 →' } },
    ]
    const fills = planMemberFill(
      members,
      { module: 'ModuleImageHeader', subtitles: ['8. 5 ~ 8. 8 코엑스'], titles: ['행사명'], bodies: ['소개'], buttons: ['등록 →'] },
      'ModuleImageHeader',
    )
    expect(fills).toEqual([
      { index: 1, props: { descriptionText: p('VOL.1') + p('<strong>8. 5 ~ 8. 8 코엑스</strong>') + p('<a href="#">홈</a>') } },
      { index: 3, props: { descriptionText: p('<strong>행사명</strong>') } },
      { index: 4, props: { descriptionText: p('소개') } },
      { index: 5, props: { buttonText: '등록 →' } },
    ])
  })

  it('모듈 01번: 글 하나의 두 문단에 타이틀·본문', () => {
    const one = {
      moduleId: 'ModuleDescText',
      properties: { descriptionText: p('<span style="font-weight:700; color:#eb2a25;">콘텐츠 타이틀</span>') + p('<span style="color:#333333;">콘텐츠 텍스트</span>') },
    }
    expect(planMemberFill([one], { module: 'Module01', titles: ['안내'], bodies: ['내용'] }, 'Module01')).toEqual([
      { index: 0, props: { descriptionText: p('<span style="font-weight:700; color:#eb2a25;">안내</span>') + p('<span style="color:#333333;">내용</span>') } },
    ])
  })

  it('버튼·라벨에 든 꺾쇠는 지우고, 글(descriptionText)은 글자로 바꿔 넣는다', () => {
    const members = [
      { moduleId: 'ModuleOneButton', properties: { buttonText: 'x' } },
      { moduleId: 'ModuleInlineText', properties: { text1: 'x' } },
      desc('본문'),
    ]
    expect(planMemberFill(members, { module: 'Module02', buttons: ['<b>등록</b>'], labels: ['<img src=x>'], bodies: ['<script>1</script>'] }, 'Module02')).toEqual([
      { index: 0, props: { buttonText: 'b등록/b' } },
      { index: 1, props: { text1: 'img src=x' } },
      { index: 2, props: { descriptionText: p('&lt;script&gt;1&lt;/script&gt;') } },
    ])
  })

  it('모듈 10번: 인라인 텍스트의 라벨만 바꾸고 시간은 둔다', () => {
    const members = [img, { moduleId: 'ModuleInlineText', properties: { text1: '라벨', text2: '14:20' } }, desc('<strong>t</strong>')]
    expect(planMemberFill(members, { module: 'Module10', labels: ['기조연설'], titles: ['연사'] }, 'Module10')).toEqual([
      { index: 1, props: { text1: '기조연설' } },
      { index: 2, props: { descriptionText: p('<strong>연사</strong>') } },
    ])
  })
})

describe('stepsOf', () => {
  it('헤더 → 본문 → 푸터 순이고 푸터는 늘 붙는다', () => {
    const option = {
      name: 'a',
      summary: '',
      header: { module: 'ModuleBasicHeader' as const, titles: [], subtitles: [], bodies: [], buttons: [], labels: [] },
      body: [{ module: 'Module02', reason: '', titles: [], bodies: [], buttons: [], labels: [] }],
    }
    expect(stepsOf(option).map((s) => s.module)).toEqual(['ModuleBasicHeader', 'Module02', 'ModuleFooter'])
  })
})
