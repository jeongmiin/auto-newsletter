import { describe, it, expect } from 'vitest'
import {
  convertLegacyToComposed,
  isConvertibleToComposed,
  countConvertibleModules,
  CONVERTIBLE_LEGACY_IDS,
  FIT_NATURAL_WIDTH_KEY,
  canInlineIntoGroup,
  type ComposedConversion,
} from '@/utils/legacyToComposed'

/** 변환 결과에서 (row, col)에 해당하는 원소 id 목록 */
const idsAt = (c: ComposedConversion, row: number, col: number): string[] =>
  c.specs.filter((s) => s.row === row && s.col === col).map((s) => s.id)

const propsOf = (c: ComposedConversion, index: number) => c.specs[index].properties

describe('legacyToComposed — 대상 판별', () => {
  it('composedBuilderMap과 같은 17종 레거시 모듈을 변환 대상으로 본다', () => {
    // Module07_reverse는 실제 모듈 id가 아니라 빠른추가 전용 키라 목록에는 있지만
    // 저장 파일에는 등장하지 않는다. 실제 모듈 id 17종이 모두 포함돼야 한다.
    const realModuleIds = [
      'Module01',
      'Module01-1',
      'Module02',
      'Module04',
      'Module05',
      'Module05-1',
      'Module05-3',
      'Module06',
      'Module07',
      'Module10',
      'Module10-1',
      'ModuleNewsHeader',
      'ModuleBasicHeader',
      'ModuleImageHeader',
      'ModuleMultiImage',
      'ModuleFooter',
      'ModuleTwoButton',
      'SectionTitle',
    ]
    realModuleIds.forEach((id) => expect(isConvertibleToComposed(id)).toBe(true))
    expect(CONVERTIBLE_LEGACY_IDS).toEqual(expect.arrayContaining(realModuleIds))
  })

  it('원소 모듈과 v2 템플릿이 없는 모듈은 변환 대상이 아니다', () => {
    // 원소 모듈(이미 v2) + v2 템플릿 미보유(레거시 유지 방침)
    const keepAsIs = [
      'ModuleImg',
      'ModuleDescText',
      'ModuleDivider',
      'ModuleOneButton',
      'ModuleSmallButton',
      'ModuleTable',
      'Module11',
      'TopLanguageButton',
    ]
    keepAsIs.forEach((id) => expect(isConvertibleToComposed(id)).toBe(false))
    keepAsIs.forEach((id) => expect(convertLegacyToComposed(id, {})).toBeNull())
  })

  it('countConvertibleModules는 변환 가능한 것만 센다', () => {
    const modules = [
      { moduleId: 'ModuleBasicHeader' },
      { moduleId: 'ModuleImg' },
      { moduleId: 'Module02' },
      { moduleId: 'SectionTitle' },
      { moduleId: 'ModuleFooter' },
    ]
    expect(countConvertibleModules(modules)).toBe(4)
  })
})

describe('legacyToComposed — 섹션 타이틀', () => {
  const base = {
    showMainTitle: false,
    showSubTitle: false,
    topBorderWidth: '2px',
    topBorderColor: '#333333',
    showSectionImage: true,
    sectionImageUrl: 'https://example.com/title.png',
    sectionImageAlt: "캠퍼's pick",
    sectionImageLinkUrl: '#',
    sectionImagePaddingTop: '15px',
    sectionImagePaddingRight: '20px',
    sectionImagePaddingBottom: '20px',
    sectionImagePaddingLeft: '20px',
    sectionBgColor: 'transparent',
  }

  it('상단 테두리는 구분선/여백, 이미지 타이틀은 단일 이미지로 푼다', () => {
    const c = convertLegacyToComposed('SectionTitle', base)!
    expect(c.specs.map((s) => s.id)).toEqual(['ModuleDivider', 'ModuleImg'])
  })

  it('구분선이 상단 테두리 두께·색상을 그대로 가져간다', () => {
    const divider = propsOf(convertLegacyToComposed('SectionTitle', base)!, 0)
    expect(divider).toMatchObject({
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: '#333333',
      dividerWidth: '100%',
      paddingTop: '0px',
      paddingBottom: '0px',
    })
  })

  it('이미지가 원래 여백·정렬·대체 텍스트를 유지한다', () => {
    const img = propsOf(convertLegacyToComposed('SectionTitle', base)!, 1)
    expect(img.imageUrl).toBe('https://example.com/title.png')
    expect(img.imageAlt).toBe("캠퍼's pick")
    expect(img.imageAlign).toBe('center')
    expect([img.paddingTop, img.paddingRight, img.paddingBottom, img.paddingLeft]).toEqual([
      '15px',
      '20px',
      '20px',
      '20px',
    ])
  })

  it('자리채움 "#" 링크는 링크 없음으로 둔다', () => {
    const img = propsOf(convertLegacyToComposed('SectionTitle', base)!, 1)
    expect(img.showImageLink).toBe(false)
    const linked = propsOf(
      convertLegacyToComposed('SectionTitle', {
        ...base,
        sectionImageLinkUrl: 'https://example.com',
      })!,
      1,
    )
    expect(linked.showImageLink).toBe(true)
  })

  it('상단 테두리가 0이면 구분선 없이 이미지 하나만 남고 그룹을 만들지 않는다', () => {
    const c = convertLegacyToComposed('SectionTitle', { ...base, topBorderWidth: '0px' })!
    expect(c.specs.map((s) => s.id)).toEqual(['ModuleImg'])
    expect(c.single).toBe(true)
  })

  it('메인·서브 타이틀이 켜져 있으면 설명 텍스트로 이어 붙인다', () => {
    const c = convertLegacyToComposed('SectionTitle', {
      ...base,
      showMainTitle: true,
      mainTitle: '메인 타이틀',
      showSubTitle: true,
      subTitle: '서브 타이틀',
    })!
    expect(c.specs.map((s) => s.id)).toEqual([
      'ModuleDivider',
      'ModuleImg',
      'ModuleDescText',
      'ModuleDescText',
    ])
    expect(String(propsOf(c, 2).descriptionText)).toContain('메인 타이틀')
    expect(String(propsOf(c, 3).descriptionText)).toContain('서브 타이틀')
  })

  it('이미지 없이 텍스트 타이틀만 쓰면 "타이틀 추가"와 같은 구성이 된다', () => {
    // 타이틀 추가(ComposedTitleSection) = 구분선 + 타이틀 텍스트 + 본문 텍스트
    const c = convertLegacyToComposed('SectionTitle', {
      ...base,
      showSectionImage: false,
      showMainTitle: true,
      mainTitle: 'Complete Your Business Matching',
      showSubTitle: true,
      subTitle: '설명 문구',
    })!
    expect(c.specs.map((s) => s.id)).toEqual(['ModuleDivider', 'ModuleDescText', 'ModuleDescText'])
    // 세로 스택(행을 하나씩 내려 쌓음)
    expect(c.specs.map((s) => s.row)).toEqual([0, 1, 2])
    expect(c.specs.every((s) => s.col === 0)).toBe(true)
    expect(c.name).toBe('섹션 타이틀')
  })

  it('타이틀 텍스트를 "타이틀 추가"와 같은 마크업(font-size·font-weight span)으로 만든다', () => {
    const c = convertLegacyToComposed('SectionTitle', {
      ...base,
      showSectionImage: false,
      showMainTitle: true,
      mainTitle: '섹션 제목',
      mainTitleFontSize: '22px',
      mainTitleFontWeight: '700',
      mainTitleColor: '#e8590c',
    })!
    const title = propsOf(c, 1)
    expect(title.descriptionText).toBe(
      '<p style="margin:0; padding:0;"><span style="font-size:22px; font-weight:700;">섹션 제목</span></p>',
    )
    expect(title.fontSize).toBe('22px')
    expect(title.textColor).toBe('#e8590c')
  })

  it('메인 타이틀에 줄 간격을 임의로 넣지 않는다 (원래 제목 높이 유지)', () => {
    const c = convertLegacyToComposed('SectionTitle', {
      ...base,
      showSectionImage: false,
      showMainTitle: true,
      mainTitle: '제목',
    })!
    expect(String(propsOf(c, 1).descriptionText)).not.toContain('line-height')
  })

  it('서브 타이틀은 원래대로 400 굵기·1.5em 줄 간격을 쓴다', () => {
    const c = convertLegacyToComposed('SectionTitle', {
      ...base,
      showSectionImage: false,
      showSubTitle: true,
      subTitle: '설명',
      subTitleFontSize: '16px',
    })!
    const sub = propsOf(c, 1)
    expect(sub.descriptionText).toBe(
      '<p style="margin:0; padding:0; line-height:1.5em;"><span style="font-size:16px; font-weight:400;">설명</span></p>',
    )
    expect(sub.textColor).toBe('#333333')
  })

  it('이미 서식이 들어간 타이틀(가운데 정렬·색상 등)은 구조를 건드리지 않고 굵기만 겉에서 물려준다', () => {
    const rich = '<p style="text-align:center;"><strong style="color:#e8590c;">가운데 제목</strong></p>'
    const c = convertLegacyToComposed('SectionTitle', {
      ...base,
      showSectionImage: false,
      showMainTitle: true,
      mainTitle: rich,
    })!
    // 레거시 td가 mainTitleFontWeight(기본 700)를 걸어 줬으므로 그 굵기를 잃지 않아야 한다
    expect(propsOf(c, 1).descriptionText).toBe(`<div style="font-weight:700;">${rich}</div>`)
  })

  it('타이틀 여백을 원래 값 그대로 가져간다', () => {
    const c = convertLegacyToComposed('SectionTitle', {
      ...base,
      showSectionImage: false,
      showMainTitle: true,
      mainTitle: '제목',
      mainTitlePaddingTop: '15px',
      mainTitlePaddingRight: '20px',
      mainTitlePaddingBottom: '15px',
      mainTitlePaddingLeft: '20px',
    })!
    const title = propsOf(c, 1)
    expect([
      title.paddingTop,
      title.paddingRight,
      title.paddingBottom,
      title.paddingLeft,
    ]).toEqual(['15px', '20px', '15px', '20px'])
  })

  it('섹션 배경색이 있으면 그룹 배경색으로 옮긴다', () => {
    const c = convertLegacyToComposed('SectionTitle', { ...base, sectionBgColor: '#f5f5f5' })!
    expect(c.groupStyles).toEqual({ backgroundColor: '#f5f5f5' })
    const transparent = convertLegacyToComposed('SectionTitle', base)!
    expect(transparent.groupStyles).toBeUndefined()
  })
})

describe('legacyToComposed — 모듈 02번', () => {
  const base = {
    imageUrl: 'https://example.com/a.png',
    imageAlt: '대표 이미지',
    imageBorderRadius: '10px',
    title: '콘텐츠 타이틀',
    titleFontSize: '18px',
    titleLineHeight: '1.7',
    description: '<p style="margin:0;">본문</p>',
    descriptionFontSize: '14px',
    buttonText: '보러가기 →',
    buttonBgColor: '#e60013',
  }

  it('이미지·타이틀·본문·버튼을 1단 세로 스택으로 옮긴다', () => {
    const c = convertLegacyToComposed('Module02', base)!
    expect(c.name).toBe('모듈 02번')
    expect(idsAt(c, 0, 0)).toEqual([
      'ModuleImg',
      'ModuleDescText',
      'ModuleDescText',
      'ModuleOneButton',
    ])
  })

  it('이미지 여백/모서리 둥글기를 레거시 템플릿 값 그대로 옮긴다', () => {
    const img = propsOf(convertLegacyToComposed('Module02', base)!, 0)
    expect(img.imageUrl).toBe('https://example.com/a.png')
    expect(img.imageAlt).toBe('대표 이미지')
    // 레거시 td: padding:0 20px 20px
    expect([img.paddingTop, img.paddingRight, img.paddingBottom, img.paddingLeft]).toEqual([
      '0px',
      '20px',
      '20px',
      '20px',
    ])
    expect(img.showBorderRadius).toBe(true)
    expect(img.imageBorderRadius).toBe('10px')
  })

  it('평문 타이틀을 굵은 <p>로 감싸고 레거시 td 여백(0 20px 15px)을 유지한다', () => {
    const title = propsOf(convertLegacyToComposed('Module02', base)!, 1)
    expect(title.descriptionText).toBe(
      '<p style="margin:0; padding:0; line-height:1.7;"><strong>콘텐츠 타이틀</strong></p>',
    )
    expect(title.fontSize).toBe('18px')
    expect([title.paddingTop, title.paddingRight, title.paddingBottom, title.paddingLeft]).toEqual([
      '0px',
      '20px',
      '15px',
      '20px',
    ])
  })

  it('리치 텍스트 본문은 감싸지 않고 그대로 옮긴다', () => {
    const desc = propsOf(convertLegacyToComposed('Module02', base)!, 2)
    expect(desc.descriptionText).toBe('<p style="margin:0;">본문</p>')
  })

  it('showTitle=false면 타이틀 원소를 만들지 않는다', () => {
    const c = convertLegacyToComposed('Module02', { ...base, showTitle: false })!
    expect(idsAt(c, 0, 0)).toEqual(['ModuleImg', 'ModuleDescText', 'ModuleOneButton'])
  })

  it('showButton=false면 버튼 원소를 만들지 않는다', () => {
    const c = convertLegacyToComposed('Module02', { ...base, showButton: false })!
    expect(c.specs.some((s) => s.id === 'ModuleOneButton')).toBe(false)
  })

  it('포인트 색상 추종(__usePoint)을 새 색상 키로 옮긴다', () => {
    const c = convertLegacyToComposed('Module02', {
      ...base,
      buttonBgColor__usePoint: true,
      buttonBgColor__pointIndex: 1,
    })!
    const btn = c.specs.find((s) => s.id === 'ModuleOneButton')!.properties
    expect(btn.buttonBgColor__usePoint).toBe(true)
    expect(btn.buttonBgColor__pointIndex).toBe(1)
  })
})

describe('legacyToComposed — 모듈 05번(05-3형)', () => {
  const base = {
    showTopSectionTitle: false,
    showTopSectionText: false,
    topLeftImageUrl: 'https://example.com/pick.png',
    imageBorderRadius: '10px',
    showRightTitle: false,
    topRightText1: '<p>오른쪽 본문</p>',
    topRightText1FontSize: '14px',
    showSmallBtn1: true,
    smallBtn1Text: '더보기 →',
    smallBtn1Url: 'https://example.com',
    showSmallBtn2: true,
    smallBtn2Text: '챕터 2 →',
    leftWidthPercent: '40',
    rightWidthPercent: '60',
  }

  it('상단 섹션이 모두 꺼져 있으면 2단 행 하나만 만든다', () => {
    const c = convertLegacyToComposed('Module05-3', base)!
    expect(Math.max(...c.specs.map((s) => s.row))).toBe(0)
    expect(idsAt(c, 0, 0)).toEqual(['ModuleImg'])
    expect(idsAt(c, 0, 1)).toEqual(['ModuleDescText', 'ModuleSmallButton'])
  })

  it('상단 섹션이 켜져 있으면 0행=전체폭, 1행=2단이 된다', () => {
    const c = convertLegacyToComposed('Module05-3', {
      ...base,
      showTopSectionTitle: true,
      topSectionTitle: '상단 타이틀',
      showTopSectionText: true,
      topSectionText: '<p>상단 텍스트</p>',
    })!
    expect(idsAt(c, 0, 0)).toEqual(['ModuleDescText', 'ModuleDescText'])
    expect(idsAt(c, 1, 0)).toEqual(['ModuleImg'])
    expect(c.colWidths?.[1]).toEqual([40, 60])
  })

  it('컬럼 너비를 colWidths로 옮긴다', () => {
    const c = convertLegacyToComposed('Module05-3', base)!
    expect(c.colWidths?.[0]).toEqual([40, 60])
  })

  it('컬럼 셀의 5px 여백을 감안해 그룹 좌우 15px·하단 15px을 준다', () => {
    const c = convertLegacyToComposed('Module05-3', base)!
    expect(c.groupStyles).toMatchObject({
      paddingLeft: '15px',
      paddingRight: '15px',
      paddingBottom: '15px',
    })
  })

  it('꺼진 작은 버튼은 건너뛰고 남은 버튼을 1번부터 순서대로 채운다', () => {
    const c = convertLegacyToComposed('Module05-3', {
      ...base,
      showSmallBtn1: false,
      showSmallBtn3: true,
      smallBtn3Text: '세 번째 →',
    })!
    const btn = c.specs.find((s) => s.id === 'ModuleSmallButton')!.properties
    expect(btn.btn1Text).toBe('챕터 2 →')
    expect(btn.btn2Text).toBe('세 번째 →')
    expect(btn.showBtn2).toBe(true)
    expect(btn.showBtn3).toBe(false)
  })

  it('작은 버튼이 하나도 없으면 작은 버튼 원소를 만들지 않는다', () => {
    const c = convertLegacyToComposed('Module05-3', {
      ...base,
      showSmallBtn1: false,
      showSmallBtn2: false,
    })!
    expect(c.specs.some((s) => s.id === 'ModuleSmallButton')).toBe(false)
  })
})

describe('legacyToComposed — 모듈 04번', () => {
  const base = {
    leftImageUrl: 'https://example.com/l.png',
    leftTitle: '왼쪽 제목',
    leftContent: '<p>왼쪽 본문</p>',
    rightImageUrl: 'https://example.com/r.png',
    showRightTitle: true,
    rightTitle: '오른쪽 제목',
    rightContent: '<p>오른쪽 본문</p>',
    leftWidthPercent: '50',
    rightWidthPercent: '50',
  }

  it('좌·우 컬럼을 각각 이미지·타이틀·본문·작은 버튼으로 나눈다', () => {
    const c = convertLegacyToComposed('Module04', base)!
    expect(idsAt(c, 0, 0)).toEqual([
      'ModuleImg',
      'ModuleDescText',
      'ModuleDescText',
      'ModuleSmallButton',
    ])
    expect(idsAt(c, 0, 1)).toEqual([
      'ModuleImg',
      'ModuleDescText',
      'ModuleDescText',
      'ModuleSmallButton',
    ])
  })

  it('레거시 컬럼 셀 여백(5px)이 v2와 같으므로 그룹 좌우만 15px을 준다', () => {
    const c = convertLegacyToComposed('Module04', base)!
    expect(c.groupStyles).toEqual({ paddingLeft: '15px', paddingRight: '15px' })
  })

  it('큰 버튼은 켜져 있을 때만 만들고 바깥 여백을 margin 값에서 가져온다', () => {
    const c = convertLegacyToComposed('Module04', {
      ...base,
      showLeftBigBtn: true,
      leftBigBtnText: '신청하기 →',
      leftBigBtnMarginTop: '12px',
    })!
    const big = c.specs.find((s) => s.id === 'ModuleOneButton')!.properties
    expect(big.buttonText).toBe('신청하기 →')
    expect(big.paddingTop).toBe('12px')
    expect(big.buttonPaddingTop).toBe('10px')
  })
})

describe('legacyToComposed — 복수 버튼', () => {
  const base = {
    button1Text: '사전등록 →',
    button1Url: 'https://example.com/1',
    button1BgColor: '#e60013',
    button2Text: '트레일러 →',
    button2Url: 'https://example.com/2',
    button2BgColor: '#111111',
    paddingTop: '10px',
    paddingRight: '15px',
    paddingBottom: '15px',
    paddingLeft: '15px',
  }

  it('단일 버튼 2개를 2단 행으로 만든다', () => {
    const c = convertLegacyToComposed('ModuleTwoButton', base)!
    expect(idsAt(c, 0, 0)).toEqual(['ModuleOneButton'])
    expect(idsAt(c, 0, 1)).toEqual(['ModuleOneButton'])
    expect(propsOf(c, 0).buttonText).toBe('사전등록 →')
    expect(propsOf(c, 1).buttonBgColor).toBe('#111111')
  })

  it('바깥 td 여백을 그룹 여백으로 옮긴다 (컬럼 셀 5px은 레거시와 동일)', () => {
    const c = convertLegacyToComposed('ModuleTwoButton', base)!
    expect(c.groupStyles).toEqual({
      paddingTop: '10px',
      paddingRight: '15px',
      paddingBottom: '15px',
      paddingLeft: '15px',
    })
  })

  it('모서리 둥글기 토글이 꺼져 있으면 원소에서도 끈다', () => {
    const c = convertLegacyToComposed('ModuleTwoButton', { ...base, showBorderRadius: false })!
    expect(propsOf(c, 0).showBorderRadius).toBe(false)
  })
})

describe('legacyToComposed — 기본 헤더', () => {
  const base = {
    topBorderWidth: '3px',
    topBorderColor: '#000000',
    logoImageUrl: 'https://example.com/logo.png',
    logoPaddingTop: '30px',
    logoPaddingBottom: '20px',
    logoBorderWidth: '0px',
    logoBorderColor: '#dddddd',
    headerText: '<p>NEWSLETTER</p>',
    headerFontSize: '20px',
  }

  it('상단 테두리 · 로고 · 로고 하단선 · 헤더 텍스트를 세로 스택으로 만든다', () => {
    const c = convertLegacyToComposed('ModuleBasicHeader', base)!
    expect(c.specs.map((s) => `${s.row}:${s.id}`)).toEqual([
      '0:ModuleDivider',
      '1:ModuleImg',
      '2:ModuleDivider',
      '3:ModuleDescText',
    ])
  })

  it('그룹 단위 스타일을 쓰지 않아 이미 묶인 그룹 안에도 풀어 넣을 수 있다', () => {
    const c = convertLegacyToComposed('ModuleBasicHeader', base)!
    expect(c.groupStyles).toBeUndefined()
    expect(canInlineIntoGroup(c)).toBe(true)
  })

  it('상단 테두리를 구분선으로 옮긴다', () => {
    const divider = propsOf(convertLegacyToComposed('ModuleBasicHeader', base)!, 0)
    expect(divider).toMatchObject({
      borderWidth: '3px',
      borderStyle: 'solid',
      borderColor: '#000000',
      paddingLeft: '0px',
      paddingRight: '0px',
    })
  })

  it('상단 테두리가 0이면 구분선을 만들지 않는다', () => {
    const c = convertLegacyToComposed('ModuleBasicHeader', { ...base, topBorderWidth: '0' })!
    expect(c.specs.map((s) => s.id)).toEqual(['ModuleImg', 'ModuleDivider', 'ModuleDescText'])
  })

  it('레거시 테이블의 좌우 여백 20px을 각 원소 여백에 더한다', () => {
    const c = convertLegacyToComposed('ModuleBasicHeader', base)!
    const logo = propsOf(c, 1)
    expect([logo.paddingLeft, logo.paddingRight]).toEqual(['20px', '20px'])
    // 로고 하단선은 td 안쪽이라 좌우 20px 들여쓰기
    expect([propsOf(c, 2).paddingLeft, propsOf(c, 2).paddingRight]).toEqual(['20px', '20px'])
    const text = propsOf(c, 3)
    expect([text.marginLeft, text.marginRight]).toEqual(['20px', '20px'])
  })

  it('원소에 이미 좌우 여백이 있으면 20px을 더해 합친다', () => {
    const c = convertLegacyToComposed('ModuleBasicHeader', {
      ...base,
      logoPaddingLeft: '10px',
      logoPaddingRight: '10px',
    })!
    expect([propsOf(c, 1).paddingLeft, propsOf(c, 1).paddingRight]).toEqual(['30px', '30px'])
  })

  it('로고 최대 너비가 %면 "원본 크기로 다시 재라" 표식을 남긴다', () => {
    const c = convertLegacyToComposed('ModuleBasicHeader', { ...base, logoMaxWidth: '100%' })!
    expect(propsOf(c, 1)[FIT_NATURAL_WIDTH_KEY]).toBe(true)
  })

  it('로고 최대 너비를 px로 지정했으면 그 값을 그대로 쓰고 표식을 남기지 않는다', () => {
    const c = convertLegacyToComposed('ModuleBasicHeader', { ...base, logoMaxWidth: '200px' })!
    expect(propsOf(c, 1).imageMaxWidth).toBe('200px')
    expect(propsOf(c, 1)[FIT_NATURAL_WIDTH_KEY]).toBeUndefined()
  })
})

describe('legacyToComposed — 기존 그룹 안에 풀어 넣기(canInlineIntoGroup)', () => {
  it('1단 구성이고 그룹 스타일이 없으면 풀어 넣을 수 있다', () => {
    const sectionTitle = convertLegacyToComposed('SectionTitle', {
      showMainTitle: true,
      mainTitle: '제목',
      showSubTitle: false,
      showSectionImage: false,
    })!
    expect(canInlineIntoGroup(sectionTitle)).toBe(true)

    const module02 = convertLegacyToComposed('Module02', {
      imageUrl: 'https://example.com/a.png',
      description: '<p>본문</p>',
    })!
    expect(canInlineIntoGroup(module02)).toBe(true)
  })

  it('2단이 필요한 변환은 풀어 넣을 수 없다 (그룹 칸 안에 컬럼을 만들 수 없음)', () => {
    const module04 = convertLegacyToComposed('Module04', {
      leftImageUrl: 'https://example.com/l.png',
      rightImageUrl: 'https://example.com/r.png',
    })!
    expect(canInlineIntoGroup(module04)).toBe(false)

    const twoButton = convertLegacyToComposed('ModuleTwoButton', { button1Text: 'A' })!
    expect(canInlineIntoGroup(twoButton)).toBe(false)
  })

  it('그룹 배경색이 필요한 변환은 풀어 넣을 수 없다 (형제 모듈까지 물든다)', () => {
    const footer = convertLegacyToComposed('ModuleFooter', { footerBgColor: '#e9e9e9' })!
    expect(canInlineIntoGroup(footer)).toBe(false)

    const tinted = convertLegacyToComposed('SectionTitle', {
      showMainTitle: true,
      mainTitle: '제목',
      showSectionImage: false,
      sectionBgColor: '#f5f5f5',
    })!
    expect(canInlineIntoGroup(tinted)).toBe(false)
  })
})

describe('legacyToComposed — 하단 푸터', () => {
  const base = {
    footerBgColor: '#e9e9e9',
    footerTextColor: '#333333',
    companyInfo: '<p>주식회사 메쎄이상</p>',
    showWebsite: true,
    websiteUrl: 'www.example.com',
    showPhone: true,
    phone: '02-0000-0000',
    showEmail: true,
    email: 'a@example.com',
    showFax: false,
    snsIconBgColor: '#333333',
    showHome: true,
    homeUrl: 'https://example.com',
    showFacebook: false,
    showLinkedin: false,
    unsubscribeUrl: 'https://example.com/unsub',
    showInquiry: true,
    inquiryEmail: 'a@example.com',
  }

  it('푸터 배경색을 그룹 배경색으로 옮긴다', () => {
    const c = convertLegacyToComposed('ModuleFooter', base)!
    expect(c.groupStyles).toEqual({ backgroundColor: '#e9e9e9' })
  })

  it('회사정보 · 연락처 · 구분선 · SNS · 안내문구 순서로 만든다', () => {
    const c = convertLegacyToComposed('ModuleFooter', base)!
    expect(c.specs.map((s) => s.id)).toEqual([
      'ModuleDescText',
      'ModuleContactInfo',
      'ModuleDivider',
      'ModuleSnsIcons',
      'ModuleDescText',
    ])
  })

  it('레거시 연락처 플래그를 연락처 항목 배열로 옮긴다', () => {
    const c = convertLegacyToComposed('ModuleFooter', base)!
    const items = c.specs[1].properties.contactItems as Array<{
      key: string
      show: boolean
      value: string
    }>
    expect(items.find((i) => i.key === 'website')).toMatchObject({
      show: true,
      value: 'www.example.com',
    })
    expect(items.find((i) => i.key === 'fax')?.show).toBe(false)
  })

  it('이미 contactItems 배열이 있으면 그대로 쓴다', () => {
    const items = [{ key: 'email', show: true, value: 'z@example.com' }]
    const c = convertLegacyToComposed('ModuleFooter', { ...base, contactItems: items })!
    expect(c.specs[1].properties.contactItems).toEqual(items)
  })

  it('레거시 SNS 플래그/URL을 아이콘 배열로 옮기고 자리채움 "#"은 비운다', () => {
    const c = convertLegacyToComposed('ModuleFooter', { ...base, showX: true, xUrl: '#' })!
    const icons = c.specs[3].properties.snsIcons as Array<{
      key: string
      show: boolean
      url: string
    }>
    expect(icons.find((i) => i.key === 'home')).toMatchObject({
      show: true,
      url: 'https://example.com',
    })
    expect(icons.find((i) => i.key === 'facebook')?.show).toBe(false)
    expect(icons.find((i) => i.key === 'x')?.url).toBe('')
  })

  it('영문 안내문구는 켜져 있을 때만 넣는다', () => {
    const off = convertLegacyToComposed('ModuleFooter', base)!
    expect(String(off.specs[4].properties.descriptionText)).not.toContain('unsubscription')
    const on = convertLegacyToComposed('ModuleFooter', { ...base, showEnglishFooter: true })!
    expect(String(on.specs[4].properties.descriptionText)).toContain('unsubscription')
  })

  it('국·영문 안내문구가 모두 꺼져 있으면 안내문구 원소를 만들지 않는다', () => {
    const c = convertLegacyToComposed('ModuleFooter', { ...base, showKoreanFooter: false })!
    expect(c.specs).toHaveLength(4)
  })
})

describe('legacyToComposed — 모듈 12번 → 모듈 01번 형태', () => {
  const base = {
    showTitle: true,
    titleText: '✨ 혜택 1. 핸드메이드 교류 문화 활성화',
    titleFontSize: '16px',
    titleColor: '#111111',
    titleLineHeight: '1.7',
    contentText: '<p>혜택 설명</p>',
    textFontSize: '14px',
    textColor: '#333333',
    textLineHeight: '1.7',
    boxBgColor: '#f5f5f5',
    boxBorderWidth: '0px',
    boxBorderColor: '#dddddd',
    textAlign: 'center',
    paddingTop: '0px',
    paddingRight: '20px',
    paddingBottom: '5px',
    paddingLeft: '20px',
  }

  it('설명 텍스트 하나(모듈 01번 형태)로 만들고 그룹을 만들지 않는다', () => {
    const c = convertLegacyToComposed('Module12', base)!
    expect(c.name).toBe('모듈 01번')
    expect(c.single).toBe(true)
    expect(c.specs.map((s) => s.id)).toEqual(['ModuleDescText'])
    expect(propsOf(c, 0).__moduleLabel).toBe('모듈 01번')
  })

  it('박스 배경색·정렬·본문 색상/크기를 그대로 옮긴다', () => {
    const props = propsOf(convertLegacyToComposed('Module12', base)!, 0)
    expect(props.bgColor).toBe('#f5f5f5')
    expect(props.textAlign).toBe('center')
    expect(props.textColor).toBe('#333333')
    expect(props.fontSize).toBe('14px')
    // 레거시 박스 안쪽 여백은 15px 20px 고정, 바깥 여백은 인스턴스 값
    expect([props.paddingTop, props.paddingRight]).toEqual(['15px', '20px'])
    expect([props.marginTop, props.marginRight, props.marginBottom, props.marginLeft]).toEqual([
      '0px',
      '20px',
      '5px',
      '20px',
    ])
  })

  it('타이틀을 아래 8px 간격의 블록 문단으로 옮긴다', () => {
    const html = String(propsOf(convertLegacyToComposed('Module12', base)!, 0).descriptionText)
    expect(html).toContain('margin:0 0 8px')
    expect(html).toContain('color:#111111')
    expect(html).toContain('font-size:16px')
    expect(html).toContain('font-weight:700')
    expect(html).toContain('✨ 혜택 1. 핸드메이드 교류 문화 활성화')
    expect(html).toContain('<p>혜택 설명</p>')
  })

  it('타이틀이 꺼져 있으면 본문만 넣는다', () => {
    const html = String(
      propsOf(convertLegacyToComposed('Module12', { ...base, showTitle: false })!, 0)
        .descriptionText,
    )
    expect(html).not.toContain('혜택 1')
    expect(html).toContain('<p>혜택 설명</p>')
  })

  it('박스 테두리(4면)를 네 변 모두 지정한 테두리로 옮긴다', () => {
    const props = propsOf(
      convertLegacyToComposed('Module12', {
        ...base,
        boxBorderWidth: '2px',
        boxBorderColor: '#e4e4e4',
      })!,
      0,
    )
    expect(props.showBorder).toBe(true)
    expect(props.borderPosition).toBe('top,right,bottom,left')
    expect(props.borderWidth).toBe('2px')
    expect(props.borderColor).toBe('#e4e4e4')
    expect(props.borderStyle).toBe('solid')
  })

  it('테두리 두께가 0이면 테두리를 끈다', () => {
    expect(propsOf(convertLegacyToComposed('Module12', base)!, 0).showBorder).toBe(false)
  })

  it('평문 본문은 줄 간격을 넣어 감싼다', () => {
    const html = String(
      propsOf(
        convertLegacyToComposed('Module12', {
          ...base,
          contentText: '평문 본문',
          textLineHeight: '2',
        })!,
        0,
      ).descriptionText,
    )
    expect(html).toContain('line-height:2')
    expect(html).toContain('평문 본문')
  })

  it('이미 묶인 그룹 안에도 풀어 넣을 수 있다', () => {
    expect(canInlineIntoGroup(convertLegacyToComposed('Module12', base)!)).toBe(true)
  })
})

describe('legacyToComposed — 모듈 01번(단일 원소)', () => {
  it('설명 텍스트 하나로 만들고 그룹을 만들지 않는다', () => {
    const c = convertLegacyToComposed('Module01', {
      contentTitle: '타이틀',
      titleColor: '#eb2a25',
      contentText: '<p>본문</p>',
      bgColor: '#f5f5f5',
    })!
    expect(c.single).toBe(true)
    expect(c.specs).toHaveLength(1)
    expect(c.specs[0].id).toBe('ModuleDescText')
    const p = c.specs[0].properties
    expect(p.bgColor).toBe('#f5f5f5')
    expect(String(p.descriptionText)).toContain('#eb2a25')
    expect(String(p.descriptionText)).toContain('<p>본문</p>')
  })

  it('showTitle=false면 타이틀 span 없이 본문만 넣는다', () => {
    const c = convertLegacyToComposed('Module01', {
      showTitle: false,
      contentTitle: '숨긴 타이틀',
      contentText: '<p>본문</p>',
    })!
    expect(String(c.specs[0].properties.descriptionText)).not.toContain('숨긴 타이틀')
  })
})

describe('legacyToComposed — 뉴스 헤드라인 헤더', () => {
  const base = {
    logoImageUrl: 'https://example.com/logo.png',
    headerTitle: 'NEWSLETTER VOL.5',
    webViewText: '👀 웹으로 보기',
    webViewUrl: 'https://example.com',
  }

  it('제목|웹으로 보기 행(2행)을 2컬럼으로 만든다', () => {
    const c = convertLegacyToComposed('ModuleNewsHeader', base)!
    expect(idsAt(c, 2, 0)).toEqual(['ModuleDescText']) // 제목
    expect(idsAt(c, 2, 1)).toEqual(['ModuleDescText']) // 웹으로 보기
  })

  it('그 행만 모바일에서도 가로 유지로 표시한다 (레거시 테이블에서 한 줄이던 행)', () => {
    const c = convertLegacyToComposed('ModuleNewsHeader', base)!
    expect(c.keepInlineRows).toEqual([false, false, true])
  })
})

describe('legacyToComposed — 섹션 타이틀 굵기', () => {
  it('평문 타이틀은 레거시 굵기를 span에 넣는다', () => {
    const c = convertLegacyToComposed('SectionTitle', {
      mainTitle: '섹션 타이틀',
      mainTitleFontWeight: '700',
      showSubTitle: false,
    })!
    const main = c.specs.find((s) => String(s.properties.descriptionText).includes('섹션 타이틀'))!
    expect(String(main.properties.descriptionText)).toContain('font-weight:700')
  })

  it('리치 텍스트 타이틀도 굵기를 잃지 않는다 (설명 텍스트 td가 400을 강제하므로 겉을 감싼다)', () => {
    const c = convertLegacyToComposed('SectionTitle', {
      mainTitle: '<p style="margin:0;">리치 타이틀</p>',
      mainTitleFontWeight: '700',
      showSubTitle: false,
    })!
    const main = c.specs.find((s) => String(s.properties.descriptionText).includes('리치 타이틀'))!
    const html = String(main.properties.descriptionText)
    expect(html).toContain('font-weight:700')
    expect(html).toContain('<p style="margin:0;">리치 타이틀</p>') // 원래 구조는 그대로
  })

  it('기본 굵기(400/normal)면 감싸지 않는다', () => {
    const c = convertLegacyToComposed('SectionTitle', {
      mainTitle: '<p>보통 굵기</p>',
      mainTitleFontWeight: '400',
      showSubTitle: false,
    })!
    const main = c.specs.find((s) => String(s.properties.descriptionText).includes('보통 굵기'))!
    expect(String(main.properties.descriptionText)).toBe('<p>보통 굵기</p>')
  })
})

describe('legacyToComposed — 하단 푸터 안내문구', () => {
  const korean =
    '<p style="line-height:1.7;"><span style="color:#999999;">본 메일은 …</span></p>' +
    '<p><a href="https://edm.esfair.kr/rejectMail.aspx?code=HOBAN">[수신거부]</a></p>'

  it('저장된 국문 안내문구가 있으면 그대로 가져온다 (문장·링크를 새로 찍지 않는다)', () => {
    const c = convertLegacyToComposed('ModuleFooter', {
      showKoreanFooter: true,
      koreanNoticeText: korean,
      // 예전 키는 저장돼 있지 않은 파일이 많다
    })!
    const notice = c.specs.at(-1)!
    expect(String(notice.properties.descriptionText)).toBe(korean)
    // 하드코딩 문장이 섞여 들어가면 안 된다
    expect(String(notice.properties.descriptionText)).not.toContain('으로 문의 바랍니다')
  })

  it('영문 안내문구도 저장값을 쓰고, 국문 뒤에 빈 줄로 띄운다', () => {
    const english = "If you don't want this type of information, click <a href=\"#\">[unsubscription]</a>"
    const c = convertLegacyToComposed('ModuleFooter', {
      showKoreanFooter: true,
      koreanNoticeText: korean,
      showEnglishFooter: true,
      englishNoticeText: english,
    })!
    const html = String(c.specs.at(-1)!.properties.descriptionText)
    expect(html).toContain(korean)
    expect(html).toContain(english)
    expect(html.indexOf(korean)).toBeLessThan(html.indexOf(english))
  })

  it('안내문구 속성이 없는 옛 파일은 기존 기본 문장으로 되살린다', () => {
    const c = convertLegacyToComposed('ModuleFooter', {
      showKoreanFooter: true,
      unsubscribeUrl: 'https://example.com/reject',
      inquiryEmail: 'a@b.com',
    })!
    const html = String(c.specs.at(-1)!.properties.descriptionText)
    expect(html).toContain('수신동의')
    expect(html).toContain('https://example.com/reject')
    expect(html).toContain('a@b.com')
  })
})

describe('legacyToComposed — 포인트 색상 추종 유지', () => {
  it('모듈 05번 오른쪽 강조 타이틀의 배경이 포인트 색상을 계속 따른다', () => {
    const c = convertLegacyToComposed('Module05-3', {
      showRightTitle: true,
      rightTitleEmphasis: true,
      topRightTitle1: '1:1 건축사 상담회',
      rightTitleBgColor: '#e5e5e5',
      rightTitleBgColor__usePoint: true,
      rightTitleTextColor: '#ffffff',
    })!
    const title = c.specs.find((s) => String(s.properties.descriptionText).includes('건축사'))!
    expect(title.properties.bgColor).toBe('#e5e5e5') // 리터럴 값도 그대로 (추종 해제 시 복귀용)
    expect(title.properties.bgColor__usePoint).toBe(true)
  })

  it('강조가 꺼져 있으면 추종 메타를 넘기지 않는다 (투명 배경이 포인트 색으로 칠해지면 안 된다)', () => {
    const c = convertLegacyToComposed('Module05-3', {
      showRightTitle: true,
      rightTitleEmphasis: false,
      topRightTitle1: '제목',
      rightTitleBgColor: '#e5e5e5',
      rightTitleBgColor__usePoint: true,
    })!
    const title = c.specs.find((s) => String(s.properties.descriptionText).includes('제목'))!
    expect(title.properties.bgColor).toBe('transparent')
    expect(title.properties.bgColor__usePoint).toBeUndefined()
  })

  it('모듈 06번 좌·우 타이틀 배경도 추종을 유지한다', () => {
    const c = convertLegacyToComposed('Module06', {
      leftTitle: '왼쪽',
      leftTitleBgColor: '#e5e5e5',
      leftTitleBgColor__usePoint: true,
      leftTitleBgColor__pointIndex: 1,
      rightTitle: '오른쪽',
      rightTitleBgColor: '#e5e5e5',
      rightTitleBgColor__usePoint: true,
    })!
    const left = c.specs.find((s) => String(s.properties.descriptionText).includes('왼쪽'))!
    const right = c.specs.find((s) => String(s.properties.descriptionText).includes('오른쪽'))!
    expect(left.properties.bgColor__usePoint).toBe(true)
    expect(left.properties.bgColor__pointIndex).toBe(1)
    expect(right.properties.bgColor__usePoint).toBe(true)
  })
})

describe('legacyToComposed — 뉴스 헤드라인 헤더 제목 줄 여백', () => {
  const titleRow = (props: Record<string, unknown>) => {
    const c = convertLegacyToComposed('ModuleNewsHeader', props)!
    const cells = c.specs.filter((s) => s.row === 2)
    return { left: cells.find((s) => s.col === 0)!.properties, right: cells.find((s) => s.col === 1)!.properties }
  }

  it('컬럼 셀이 갖는 5px을 빼서 원본 여백(5/20/10/20)과 같아진다', () => {
    // 레거시 td: padding:5px 20px 10px 20px (두 칸을 감싼 하나의 td)
    const { left, right } = titleRow({
      headerTitle: 'NEWSLETTER VOL.1',
      headerTitlePaddingTop: '5px',
      headerTitlePaddingRight: '20px',
      headerTitlePaddingBottom: '10px',
      headerTitlePaddingLeft: '20px',
    })
    // 셀 padding 5px + 여기 값 = 원본 여백
    expect([left.marginTop, left.marginBottom, left.marginLeft, left.marginRight]).toEqual([
      '0px',
      '5px',
      '15px',
      '0px',
    ])
    expect([right.marginTop, right.marginBottom, right.marginRight, right.marginLeft]).toEqual([
      '0px',
      '5px',
      '15px',
      '0px',
    ])
  })

  it('네 방향이 20px인 파일도 15px + 셀 5px = 20px가 된다', () => {
    const { left, right } = titleRow({
      headerTitlePaddingTop: '20px',
      headerTitlePaddingRight: '20px',
      headerTitlePaddingBottom: '20px',
      headerTitlePaddingLeft: '20px',
    })
    expect(left.marginTop).toBe('15px')
    expect(left.marginLeft).toBe('15px')
    expect(right.marginRight).toBe('15px')
  })

  it('px이 아니거나 5px보다 작은 값은 0 아래로 내리지 않는다', () => {
    const { left } = titleRow({ headerTitlePaddingTop: '2px', headerTitlePaddingLeft: '1em' })
    expect(left.marginTop).toBe('0px')
    expect(left.marginLeft).toBe('1em')
  })
})

describe('legacyToComposed — 기본 헤더 텍스트 정렬', () => {
  it('레거시 표의 text-align:center를 이어받아 가운데 정렬로 온다', () => {
    const c = convertLegacyToComposed('ModuleBasicHeader', {
      logoImageUrl: 'https://example.com/logo.png',
      headerText: '<p style="margin:0; padding:0;">NEWSLETTER <strong>VOL.1</strong></p>',
    })!
    const text = c.specs.find((s) => String(s.properties.descriptionText).includes('NEWSLETTER'))!
    expect(text.properties.textAlign).toBe('center')
  })
})

describe('legacyToComposed — 이미지형 헤더 타이틀 굵기', () => {
  it('리치 텍스트 타이틀도 레거시 컨테이너의 굵기(700)를 유지한다', () => {
    const rich =
      '<p style="margin: 0; padding: 0;"><span style="color: var(--point-color, #4161af);">📢 ISSA SHOW ASIA 2026</span></p>'
    const c = convertLegacyToComposed('ModuleImageHeader', {
      imageUrl: 'https://example.com/main.jpg',
      showTitle: true,
      titleText: rich,
    })!
    const title = c.specs.find((s) => String(s.properties.descriptionText).includes('ISSA SHOW'))!
    expect(title.properties.descriptionText).toBe(`<div style="font-weight:700;">${rich}</div>`)
  })

  it('본문(굵기 없음)은 감싸지 않는다', () => {
    const rich = '<p style="margin: 0; padding: 0;">본문입니다</p>'
    const c = convertLegacyToComposed('ModuleImageHeader', {
      imageUrl: 'https://example.com/main.jpg',
      showTitle: false,
      showBody: true,
      bodyText: rich,
    })!
    const body = c.specs.find((s) => String(s.properties.descriptionText).includes('본문입니다'))!
    expect(body.properties.descriptionText).toBe(rich)
  })
})

describe('legacyToComposed — 로고 최대 너비', () => {
  const logoOf = (moduleId: string, props: Record<string, unknown>) => {
    const c = convertLegacyToComposed(moduleId, props)!
    return c.specs.find((s) => s.id === 'ModuleImg')!.properties
  }

  it('30%처럼 직접 줄여 둔 값은 그대로 가져오고 원본 크기로 덮지 않는다', () => {
    const logo = logoOf('ModuleBasicHeader', {
      logoImageUrl: 'https://example.com/logo.png',
      logoMaxWidth: '30%',
    })
    expect(logo.imageMaxWidth).toBe('30%')
    expect(logo[FIT_NATURAL_WIDTH_KEY]).toBeUndefined()
  })

  it('100%는 예전처럼 원본 크기로 채우도록 표식을 남긴다', () => {
    const logo = logoOf('ModuleBasicHeader', {
      logoImageUrl: 'https://example.com/logo.png',
      logoMaxWidth: '100%',
    })
    expect(logo[FIT_NATURAL_WIDTH_KEY]).toBe(true)
  })

  it('뉴스 헤드라인 헤더도 같은 규칙을 따른다', () => {
    expect(
      logoOf('ModuleNewsHeader', { logoImageUrl: 'https://example.com/l.png', logoMaxWidth: '50%' })
        .imageMaxWidth,
    ).toBe('50%')
    expect(
      logoOf('ModuleNewsHeader', { logoImageUrl: 'https://example.com/l.png', logoMaxWidth: '100%' })[
        FIT_NATURAL_WIDTH_KEY
      ],
    ).toBe(true)
  })
})

describe('legacyToComposed — 테두리 색 포인트 추종', () => {
  it('2개 버튼의 테두리 색 추종을 유지한다', () => {
    const c = convertLegacyToComposed('ModuleTwoButton', {
      button1Text: '버튼1',
      button2Text: '버튼2',
      button2BorderStyle: 'solid',
      button2BorderColor: '#000000',
      button2BorderColor__usePoint: true,
      button2TextColor__usePoint: true,
    })!
    const btn2 = c.specs.find((s) => s.properties.buttonText === '버튼2')!
    expect(btn2.properties.buttonBorderColor__usePoint).toBe(true)
    expect(btn2.properties.buttonTextColor__usePoint).toBe(true)
  })

  it('단일 버튼(모듈 05번 큰 버튼 등)도 테두리 색 추종을 유지한다', () => {
    const c = convertLegacyToComposed('Module02', {
      imageUrl: 'https://example.com/a.png',
      showButton: true,
      buttonText: '버튼',
      buttonBorderColor: '#000000',
      buttonBorderColor__usePoint: true,
      buttonBorderColor__pointIndex: 2,
    })!
    const btn = c.specs.find((s) => s.id === 'ModuleOneButton')!
    expect(btn.properties.buttonBorderColor__usePoint).toBe(true)
    expect(btn.properties.buttonBorderColor__pointIndex).toBe(2)
  })

  it('2단 이미지의 테두리 색 추종도 유지한다', () => {
    const c = convertLegacyToComposed('ModuleMultiImage', {
      leftImageUrl: 'https://example.com/l.png',
      rightImageUrl: 'https://example.com/r.png',
      leftImageBorderColor: '#e1e1e1',
      leftImageBorderColor__usePoint: true,
    })!
    const left = c.specs.find((s) => s.id === 'ModuleImg' && s.col === 0)!
    expect(left.properties.imageBorderColor__usePoint).toBe(true)
  })
})

describe('legacyToComposed — 모듈 07번 컬럼 너비·텍스트 정렬', () => {
  const base = {
    imageUrl: 'https://example.com/a.jpg',
    title: '독립부스',
    contentText: '<p>3,000,000원</p>',
  }

  it('좌우 반전형도 너비를 자리(왼쪽/오른쪽) 그대로 쓴다', () => {
    // 반전형: 왼쪽=텍스트(55) / 오른쪽=이미지(45)
    const c = convertLegacyToComposed('Module07_reverse', {
      ...base,
      leftWidthPercent: '55',
      rightWidthPercent: '45',
    })!
    expect(c.colWidths).toEqual([[55, 45]])
    // 텍스트가 왼쪽(0번), 이미지가 오른쪽(1번)
    expect(c.specs.find((s) => s.id === 'ModuleImg')!.col).toBe(1)
    expect(c.specs.filter((s) => s.id === 'ModuleDescText').every((s) => s.col === 0)).toBe(true)
  })

  it('기본형 너비도 그대로 쓴다', () => {
    const c = convertLegacyToComposed('Module07', {
      ...base,
      leftWidthPercent: '51',
      rightWidthPercent: '50',
    })!
    expect(c.colWidths).toEqual([[51, 50]])
    expect(c.specs.find((s) => s.id === 'ModuleImg')!.col).toBe(0)
  })

  it('정렬 값이 없는 예전 파일은 가운데 정렬로 읽는다 (원본이 td align=center를 물려받았다)', () => {
    const c = convertLegacyToComposed('Module07_reverse', base)!
    const texts = c.specs.filter((s) => s.id === 'ModuleDescText')
    expect(texts).toHaveLength(2)
    expect(texts.every((s) => s.properties.textAlign === 'center')).toBe(true)
    expect(String(texts[0].properties.descriptionText)).toContain('text-align:center')
  })

  it('titleAlign이 있으면 그 값을 쓴다', () => {
    const c = convertLegacyToComposed('Module07', { ...base, titleAlign: 'right' })!
    const texts = c.specs.filter((s) => s.id === 'ModuleDescText')
    expect(texts.every((s) => s.properties.textAlign === 'right')).toBe(true)
  })
})

describe('legacyToComposed — 모듈 10번 라벨·시간', () => {
  const base = {
    imageUrl: 'https://example.com/a.png',
    title: '<p>14:00 ~ 14:30</p><p><strong>발표 제목</strong></p>',
    timeText: '14:00 ~ 14:30',
  }
  const textsOf = (c: NonNullable<ReturnType<typeof convertLegacyToComposed>>) =>
    c.specs.filter((s) => s.id === 'ModuleDescText').map((s) => String(s.properties.descriptionText))

  it('라벨을 껐으면 시간도 내보내지 않는다 (레거시는 시간이 라벨 블록 안에 있다)', () => {
    const c = convertLegacyToComposed('Module10', { ...base, showLabel: false, showTime: true })!
    const texts = textsOf(c)
    // 타이틀 하나만 — 시간 줄이 따로 붙지 않는다(타이틀 본문의 시간과 중복 방지)
    expect(texts).toHaveLength(1)
    expect(texts[0]).toContain('14:00 ~ 14:30')
  })

  it('라벨을 켜면 라벨과 시간이 한 줄로 나온다', () => {
    const c = convertLegacyToComposed('Module10', {
      ...base,
      showLabel: true,
      labelText: '기조연설',
      showTime: true,
    })!
    const texts = textsOf(c)
    expect(texts).toHaveLength(2)
    expect(texts[0]).toContain('기조연설')
    expect(texts[0]).toContain('14:00 ~ 14:30')
  })

  it('라벨 스위치가 없으면 라벨 줄을 만들지 않는다 (레거시 프로세서와 동일)', () => {
    const c = convertLegacyToComposed('Module10', { ...base, showTime: true })!
    expect(textsOf(c)).toHaveLength(1)
  })
})
