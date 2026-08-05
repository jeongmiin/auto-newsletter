/**
 * 레거시 단일 모듈 → 모듈 v2(조립형 원소 모듈 그룹) 변환기.
 *
 * `moduleStore`의 `composedBuilderMap`(빠른추가용 v2 빌더)은 "플레이스홀더 내용으로 새 그룹을 만든다".
 * 이 파일은 그 반대 방향 — **이미 값이 채워진 레거시 인스턴스**를 같은 원소 모듈 구성으로 옮긴다.
 * 재편집용 HTML을 "파일 열기"할 때 v2로 변환해 여는 경로에서 사용한다.
 *
 * 원칙(사용자 확정: "픽셀 동일 우선"):
 *  - 여백·폰트 크기·색상은 레거시 템플릿의 실제 인라인 CSS를 그대로 옮긴다.
 *  - 재현 불가능한 구조 차이(원소 모듈에 대응 속성이 없는 경우)는 `warnings`로 보고한다.
 *
 * 컬럼 여백 규칙: v2 컬럼 셀은 `groupStyle.columnCellStyle`이 항상 `padding:5px`를 준다(COLUMN_GAP_PX).
 * 레거시가 `padding:0 5px`인 모듈은 그룹 상/하 여백에서 5px을 빼 바깥 경계를 맞춘다.
 */
import type { ModuleGroupStyles } from '@/types/module'
import { defaultContactItems, type ContactItem } from '@/constants/contactItems'
import { defaultSnsIcons, type SnsIconItem } from '@/constants/snsIcons'

/** 원소 모듈 하나 — 그룹 안 (row, col) 위치 + 기본값 위에 덮어쓸 속성 */
export interface ComposedElementSpec {
  id: string
  row: number
  col: number
  properties: Record<string, unknown>
}

export interface ComposedConversion {
  /** 그룹 표시 이름(좌측 "그룹 구성" 패널 타이틀) */
  name: string
  specs: ComposedElementSpec[]
  groupStyles?: Partial<ModuleGroupStyles>
  /** 행별 컬럼 너비(%) — colWidths[row] = 그 행 컬럼 너비 배열 */
  colWidths?: number[][]
  /** 원소가 1개뿐이라 그룹으로 묶지 않는 경우 true (단일 모듈로 추가) */
  single?: boolean
  /** 픽셀 동일하게 옮기지 못한 부분 (사용자에게 보고) */
  warnings?: string[]
}

type Props = Record<string, unknown>

// ────────────────────────────── 공통 헬퍼 ──────────────────────────────

/** 문자열 속성 읽기 (없거나 빈 문자열이면 fallback) */
const s = (p: Props, key: string, fallback = ''): string => {
  const v = p[key]
  if (v == null) return fallback
  const t = String(v)
  return t === '' ? fallback : t
}

/** 기본 노출 스위치 — 미설정이면 노출 */
const onByDefault = (p: Props, key: string): boolean => p[key] !== false
/** 기본 비노출 스위치 — 명시적으로 true일 때만 노출 */
const offByDefault = (p: Props, key: string): boolean => p[key] === true

/**
 * 포인트 색상 "추종" 메타(`__usePoint`/`__pointIndex`)를 색상 키 이름이 바뀌어도 유지한다.
 * (예: ModuleTwoButton.button1BgColor → ModuleOneButton.buttonBgColor)
 */
const carryPointMeta = (from: Props, fromKey: string, toKey: string, into: Props): void => {
  const use = from[`${fromKey}__usePoint`]
  const idx = from[`${fromKey}__pointIndex`]
  if (use !== undefined) into[`${toKey}__usePoint`] = use
  if (idx !== undefined) into[`${toKey}__pointIndex`] = idx
}

/** 이미 블록 태그를 가진 리치 텍스트인지 (Quill 편집 결과는 <p>로 시작한다) */
const isRichHtml = (t: string): boolean => /<(p|div|ul|ol|h[1-6]|table|blockquote)\b/i.test(t)

/**
 * 레거시의 평문 타이틀(text 입력)을 설명 텍스트 모듈의 리치 HTML로 감싼다.
 * 이미 블록 태그가 있으면(=리치 텍스트 필드였음) 그대로 둔다.
 */
const toRich = (
  text: string,
  opt: { lineHeight?: string; bold?: boolean; align?: string } = {},
): string => {
  if (!text) return ''
  if (isRichHtml(text)) return text
  const style = [
    'margin:0',
    'padding:0',
    opt.lineHeight ? `line-height:${opt.lineHeight}` : '',
    opt.align ? `text-align:${opt.align}` : '',
  ]
    .filter(Boolean)
    .join('; ')
  const body = opt.bold ? `<strong>${text}</strong>` : text
  return `<p style="${style};">${body}</p>`
}

/** 4방향 여백 속성 묶음 */
const pad = (top: string, right: string, bottom: string, left: string): Props => ({
  paddingTop: top,
  paddingRight: right,
  paddingBottom: bottom,
  paddingLeft: left,
})

/** 설명 텍스트 모듈의 '바깥 여백'(=td padding) 4방향 */
const outerMargin = (top: string, right: string, bottom: string, left: string): Props => ({
  marginTop: top,
  marginRight: right,
  marginBottom: bottom,
  marginLeft: left,
})

/** '0px'·'0'·빈 값이면 true — 모서리 둥글기 토글 판정용 */
const isZeroLength = (v: string): boolean => !v || /^0[a-z%]*$/i.test(v.trim())

/**
 * px 길이에 px를 더한다. 레거시가 '바깥 테이블 여백 + 안쪽 여백'으로 나눠 갖고 있던 값을
 * 원소 모듈 하나의 여백으로 합칠 때 쓴다.
 * px가 아닌 단위(%, em)는 더할 수 없으므로 원본을 그대로 둔다.
 */
const addPx = (value: string, add: number): string => {
  const t = (value || '').trim()
  const n = Number.parseFloat(t)
  if (!Number.isFinite(n)) return `${add}px`
  if (n !== 0 && !/px$/i.test(t)) return t
  return `${n + add}px`
}

/**
 * "원본 크기로 그려야 하는 이미지"(헤더 로고) 표식.
 *
 * 레거시 헤더는 로고를 `display:inline-block`으로 두어 **원본 크기**(최대 폭 제한)로 그렸지만,
 * 원소 모듈 `ModuleImg`는 항상 `width:100%`라 그대로 옮기면 로고가 가로로 늘어난다.
 * 변환 시점(스토어)에는 원본 크기를 알 수 없으므로 이 표식만 남기고,
 * 파일 열기 직후 브라우저에서 실제 크기를 재 `imageMaxWidth`를 px로 채운다.
 * (`applyNaturalImageWidths` 참고 — 채우고 나면 이 표식은 지운다)
 */
export const FIT_NATURAL_WIDTH_KEY = '__fitNaturalWidth'

/** 이미지 원소 모듈 속성 (레거시 이미지 필드 → ModuleImg) */
interface ImageSrc {
  url: string
  alt?: string
  linkUrl?: string
  showLink?: boolean
  borderRadius?: string
  borderStyle?: string
  borderWidth?: string
  borderColor?: string
  maxWidth?: string
  align?: string
  /** 원본 크기로 그려야 하는 이미지(헤더 로고) */
  fitNatural?: boolean
}
const imgProps = (src: ImageSrc, padding: Props): Props => {
  const radius = src.borderRadius ?? '0px'
  return {
    imageUrl: src.url,
    imageAlt: src.alt ?? '이미지',
    showImageLink: !!src.showLink,
    imageLinkUrl: src.linkUrl ?? '#',
    imageMaxWidth: src.maxWidth ?? '100%',
    imageAlign: src.align ?? 'center',
    showBorderRadius: !isZeroLength(radius),
    imageBorderRadius: radius,
    imageBorderStyle: src.borderStyle ?? 'none',
    imageBorderWidth: src.borderWidth ?? '1px',
    imageBorderColor: src.borderColor ?? '#000000',
    ...padding,
    ...(src.fitNatural ? { [FIT_NATURAL_WIDTH_KEY]: true } : {}),
  }
}

/** 작은 버튼 하나의 원본 정보 */
interface SmallBtn {
  text: string
  url: string
  bgColor: string
  textColor: string
  /** 포인트 색상 메타를 옮겨오기 위한 원본 배경색 키 */
  bgKey: string
}

/**
 * 노출 중인 작은 버튼들을 ModuleSmallButton 속성으로 압축한다.
 * (레거시는 1~4번 슬롯이 고정이지만 v2는 1번부터 순서대로 채운다 — 중간이 꺼져 있어도 앞으로 당겨진다)
 * @returns 노출 버튼이 하나도 없으면 null
 */
const smallButtonProps = (
  source: Props,
  visible: SmallBtn[],
  opt: { align: string; width: string; radius: string; padding: Props; fontSize?: string },
): Props | null => {
  if (visible.length === 0) return null
  const out: Props = {
    align: opt.align,
    btnWidth: opt.width,
    btnFontSize: opt.fontSize ?? '13px',
    showBorderRadius: !isZeroLength(opt.radius),
    btnBorderRadius: opt.radius,
    // 레거시 작은 버튼 <a>의 안쪽 여백은 템플릿 고정값(5px 20px)이라 그대로 옮긴다
    btnPaddingTop: '5px',
    btnPaddingRight: '20px',
    btnPaddingBottom: '5px',
    btnPaddingLeft: '20px',
    ...opt.padding,
  }
  visible.slice(0, 4).forEach((b, i) => {
    const n = i + 1
    out[`btn${n}Text`] = b.text
    out[`btn${n}Url`] = b.url
    out[`btn${n}BgColor`] = b.bgColor
    out[`btn${n}TextColor`] = b.textColor
    carryPointMeta(source, b.bgKey, `btn${n}BgColor`, out)
    if (n > 1) out[`showBtn${n}`] = true
  })
  for (let n = visible.length + 1; n <= 4; n++) out[`showBtn${n}`] = false
  return out
}

/** 레거시 접두사(left/right/'')에서 작은 버튼 1~4를 수집 */
const collectSmallButtons = (
  p: Props,
  cfg: { showKey: (n: number) => string; key: (n: number, suffix: string) => string },
  defaultShown: number[] = [1],
): SmallBtn[] => {
  const out: SmallBtn[] = []
  for (let n = 1; n <= 4; n++) {
    const showKey = cfg.showKey(n)
    const shown = defaultShown.includes(n) ? onByDefault(p, showKey) : offByDefault(p, showKey)
    if (!shown) continue
    const bgKey = cfg.key(n, 'BgColor')
    out.push({
      text: s(p, cfg.key(n, 'Text'), `버튼 ${n} →`),
      url: s(p, cfg.key(n, 'Url'), '#'),
      bgColor: s(p, bgKey, '#e5e5e5'),
      textColor: s(p, cfg.key(n, 'TextColor'), '#333333'),
      bgKey,
    })
  }
  return out
}

/** 큰 버튼(ModuleOneButton) 속성 */
const bigButtonProps = (
  p: Props,
  keys: {
    text: string
    url: string
    bg: string
    fg: string
    borderStyle: string
    borderWidth: string
    borderColor: string
    radius: string
  },
  opt: { padding: Props; buttonPadding: Props; fontSize?: string },
): Props => {
  const radius = s(p, keys.radius, '5px')
  const out: Props = {
    buttonText: s(p, keys.text, '큰 버튼 →'),
    buttonUrl: s(p, keys.url, '#'),
    buttonFontSize: opt.fontSize ?? '15px',
    buttonBgColor: s(p, keys.bg, '#111111'),
    buttonTextColor: s(p, keys.fg, '#ffffff'),
    buttonBorderStyle: s(p, keys.borderStyle, 'none'),
    buttonBorderWidth: s(p, keys.borderWidth, '1px'),
    buttonBorderColor: s(p, keys.borderColor, '#000000'),
    showBorderRadius: !isZeroLength(radius),
    buttonBorderRadius: radius,
    ...opt.padding,
    ...opt.buttonPadding,
  }
  carryPointMeta(p, keys.bg, 'buttonBgColor', out)
  carryPointMeta(p, keys.fg, 'buttonTextColor', out)
  return out
}

/** 버튼 <a>의 안쪽 여백 4방향 */
const btnPad = (top: string, right: string, bottom: string, left: string): Props => ({
  buttonPaddingTop: top,
  buttonPaddingRight: right,
  buttonPaddingBottom: bottom,
  buttonPaddingLeft: left,
})

/** 컬럼 너비(%) 두 개를 colWidths 행 배열로 — 합이 0이면 균등 */
const twoColWidths = (p: Props): number[] => {
  const l = Number(s(p, 'leftWidthPercent', '50')) || 0
  const r = Number(s(p, 'rightWidthPercent', '50')) || 0
  if (l <= 0 || r <= 0) return [50, 50]
  return [l, r]
}

// ────────────────────────────── 모듈별 변환 ──────────────────────────────

/** 모듈 01번 — 배경 박스 하나 (타이틀 + 본문) → 설명 텍스트 1개 */
const convertModule01 = (p: Props): ComposedConversion => {
  const titleHtml = onByDefault(p, 'showTitle')
    ? `<span style="color:${s(p, 'titleColor', '#eb2a25')}; font-size:${s(p, 'contentTitleFontSize', '14px')}; font-weight:700; line-height:${s(p, 'contentTitleLineHeight', '1.7')};">${s(p, 'contentTitle')}</span><br>`
    : ''
  const body = s(p, 'contentText')
  return {
    name: '모듈 01번',
    single: true,
    specs: [
      {
        id: 'ModuleDescText',
        row: 0,
        col: 0,
        properties: {
          fontSize: s(p, 'contentTextFontSize', '14px'),
          textColor: '#333333',
          bgColor: s(p, 'bgColor', '#f5f5f5'),
          textAlign: s(p, 'textAlign', 'left'),
          descriptionText: titleHtml + (isRichHtml(body) ? body : toRich(body)),
          ...pad('15px', '20px', '15px', '20px'),
          ...outerMargin(
            s(p, 'paddingTop', '0px'),
            s(p, 'paddingRight', '0px'),
            s(p, 'paddingBottom', '10px'),
            s(p, 'paddingLeft', '0px'),
          ),
          __moduleLabel: '모듈 01번',
        },
      },
    ],
  }
}

/**
 * 모듈 12번 — 모듈 01번과 같은 "배경 박스 + 타이틀 + 본문" 한 덩어리라, **모듈 01번 형태**로 가져온다.
 * (사용자 요청: 모듈 12번 자리는 모듈 01번으로 불러오되 원래 스타일을 그대로 유지)
 *
 * 모듈 01번과 다른 점은 그대로 옮긴다:
 *  - 박스 테두리(4면) → 설명 텍스트의 테두리 위치를 네 변 모두로 지정
 *  - 타이틀이 블록(<p>, 아래 8px)이라 본문과 줄이 나뉜다 (모듈 01번은 <span>+<br>)
 *  - 본문에 자체 줄 간격이 있다
 */
const convertModule12 = (p: Props): ComposedConversion => {
  const titleText = s(p, 'titleText')
  const titleHtml =
    onByDefault(p, 'showTitle') && titleText
      ? isRichHtml(titleText)
        ? titleText
        : `<p style="margin:0 0 8px; color:${s(p, 'titleColor', '#f20404')}; font-size:${s(p, 'titleFontSize', '16px')}; font-weight:700; line-height:${s(p, 'titleLineHeight', '1.7')};">${titleText}</p>`
      : ''
  const borderWidth = s(p, 'boxBorderWidth', '0px')
  const hasBorder = !isZeroLength(borderWidth)
  return {
    name: '모듈 01번',
    single: true,
    specs: [
      {
        id: 'ModuleDescText',
        row: 0,
        col: 0,
        properties: {
          fontSize: s(p, 'textFontSize', '14px'),
          textColor: s(p, 'textColor', '#333333'),
          bgColor: s(p, 'boxBgColor', '#f5f5f5'),
          textAlign: s(p, 'textAlign', 'center'),
          descriptionText:
            titleHtml + toRich(s(p, 'contentText'), { lineHeight: s(p, 'textLineHeight', '1.7') }),
          showBorder: hasBorder,
          // 레거시는 박스 4면 테두리 — 설명 텍스트는 변을 골라 쓰므로 네 변을 모두 지정한다
          borderPosition: 'top,right,bottom,left',
          borderStyle: 'solid',
          borderWidth,
          borderColor: s(p, 'boxBorderColor', '#dddddd'),
          ...pad('15px', '20px', '15px', '20px'),
          ...outerMargin(
            s(p, 'paddingTop', '0px'),
            s(p, 'paddingRight', '0px'),
            s(p, 'paddingBottom', '10px'),
            s(p, 'paddingLeft', '0px'),
          ),
          __moduleLabel: '모듈 01번',
        },
      },
    ],
  }
}

/** 모듈 01-1번 — 2단 색 박스 카드(제목 박스 + 내용 박스) */
const convertModule011 = (p: Props): ComposedConversion => {
  const specs: ComposedElementSpec[] = []
  const side = (col: number, prefix: 'left' | 'right') => {
    specs.push({
      id: 'ModuleDescText',
      row: 0,
      col,
      properties: {
        fontSize: s(p, `${prefix}TitleFontSize`, '16px'),
        textColor: s(p, 'titleTextColor', '#111111'),
        bgColor: s(p, 'titleBgColor', '#e5e5e5'),
        textAlign: 'center',
        descriptionText: toRich(s(p, `${prefix}Title`), {
          lineHeight: s(p, `${prefix}TitleLineHeight`, '1.7'),
          bold: true,
          align: 'center',
        }),
        ...pad('6px', '0px', '6px', '0px'),
        ...outerMargin('0px', '0px', '0px', '0px'),
      },
    })
    specs.push({
      id: 'ModuleDescText',
      row: 0,
      col,
      properties: {
        fontSize: s(p, `${prefix}ContentFontSize`, '14px'),
        textColor: s(p, 'contentTextColor', '#333333'),
        bgColor: s(p, 'contentBgColor', '#f3f3f3'),
        textAlign: 'center',
        descriptionText: s(p, `${prefix}Content`),
        ...pad('10px', '10px', '10px', '10px'),
        // 레거시 컬럼의 padding-bottom:20px
        ...outerMargin('0px', '0px', '20px', '0px'),
      },
    })
  }
  side(0, 'left')
  side(1, 'right')
  return {
    name: '모듈 01-1번',
    specs,
    groupStyles: { paddingLeft: '15px', paddingRight: '15px' },
    warnings: ['모듈 01-1번: 좌우 두 카드 사이 간격이 10px 정도 벌어집니다.'],
  }
}

/** 모듈 02번 — 이미지 · 타이틀 · 본문 · 큰 버튼 (1단 세로 스택) */
const convertModule02 = (p: Props): ComposedConversion => {
  const specs: ComposedElementSpec[] = []
  specs.push({
    id: 'ModuleImg',
    row: 0,
    col: 0,
    properties: imgProps(
      {
        url: s(p, 'imageUrl'),
        alt: s(p, 'imageAlt', '이미지'),
        showLink: p.showImageLink === true,
        linkUrl: s(p, 'imageLinkUrl', '#'),
        borderRadius: s(p, 'imageBorderRadius', '0px'),
      },
      pad('0px', '20px', '20px', '20px'),
    ),
  })
  if (onByDefault(p, 'showTitle')) {
    specs.push({
      id: 'ModuleDescText',
      row: 0,
      col: 0,
      properties: {
        fontSize: s(p, 'titleFontSize', '18px'),
        textColor: '#333333',
        descriptionText: toRich(s(p, 'title'), {
          lineHeight: s(p, 'titleLineHeight', '1.7'),
          bold: true,
        }),
        ...pad('0px', '20px', '15px', '20px'),
        ...outerMargin('0px', '0px', '0px', '0px'),
      },
    })
  }
  specs.push({
    id: 'ModuleDescText',
    row: 0,
    col: 0,
    properties: {
      fontSize: s(p, 'descriptionFontSize', '14px'),
      textColor: '#333333',
      descriptionText: s(p, 'description'),
      ...pad('0px', '20px', '0px', '20px'),
      ...outerMargin('0px', '0px', '0px', '0px'),
    },
  })
  if (onByDefault(p, 'showButton')) {
    specs.push({
      id: 'ModuleOneButton',
      row: 0,
      col: 0,
      properties: bigButtonProps(
        p,
        {
          text: 'buttonText',
          url: 'buttonUrl',
          bg: 'buttonBgColor',
          fg: 'buttonTextColor',
          borderStyle: 'buttonBorderStyle',
          borderWidth: 'buttonBorderWidth',
          borderColor: 'buttonBorderColor',
          radius: 'buttonBorderRadius',
        },
        {
          padding: pad(
            s(p, 'buttonPaddingTop', '20px'),
            s(p, 'buttonPaddingRight', '20px'),
            s(p, 'buttonPaddingBottom', '20px'),
            s(p, 'buttonPaddingLeft', '20px'),
          ),
          buttonPadding: btnPad('15px', '0px', '15px', '0px'),
        },
      ),
    })
  }
  return { name: '모듈 02번', specs }
}

/** 모듈 04번 — 2단(각 컬럼: 이미지 · 타이틀 · 본문 · 작은 버튼 · 큰 버튼) */
const convertModule04 = (p: Props): ComposedConversion => {
  const specs: ComposedElementSpec[] = []
  const side = (col: number, prefix: 'left' | 'right') => {
    const cap = prefix === 'left' ? 'Left' : 'Right'
    specs.push({
      id: 'ModuleImg',
      row: 0,
      col,
      properties: imgProps(
        {
          url: s(p, `${prefix}ImageUrl`),
          alt: '이미지',
          showLink: p[`show${cap}ImageLink`] === true,
          linkUrl: s(p, `${prefix}ImageLinkUrl`, '#'),
          borderRadius: s(p, `${prefix}ImageBorderRadius`, '0px'),
          borderStyle: s(p, `${prefix}ImageBorderStyle`, 'none'),
          borderWidth: s(p, `${prefix}ImageBorderWidth`, '1px'),
          borderColor: s(p, `${prefix}ImageBorderColor`, '#000000'),
        },
        pad('0px', '0px', '0px', '0px'),
      ),
    })
    if (onByDefault(p, `show${cap}Title`)) {
      specs.push({
        id: 'ModuleDescText',
        row: 0,
        col,
        properties: {
          fontSize: s(p, `${prefix}TitleFontSize`, '16px'),
          textColor: '#111111',
          descriptionText: toRich(s(p, `${prefix}Title`), {
            lineHeight: s(p, `${prefix}TitleLineHeight`, '1.7'),
            bold: true,
          }),
          ...pad('6px', '0px', '6px', '0px'),
          ...outerMargin('0px', '0px', '0px', '0px'),
        },
      })
    }
    specs.push({
      id: 'ModuleDescText',
      row: 0,
      col,
      properties: {
        fontSize: s(p, `${prefix}ContentFontSize`, '14px'),
        textColor: '#333333',
        descriptionText: s(p, `${prefix}Content`),
        ...pad('0px', '0px', '0px', '0px'),
        ...outerMargin('0px', '0px', '0px', '0px'),
      },
    })
    const smalls = collectSmallButtons(p, {
      showKey: (n) => `show${cap}SmallBtn${n}`,
      key: (n, suffix) => `${prefix}SmallBtn${n}${suffix}`,
    })
    const smallProps = smallButtonProps(p, smalls, {
      align: 'left',
      width: s(p, `${prefix}SmallBtnWidth`, 'auto'),
      radius: s(p, `${prefix}SmallBtnBorderRadius`, '30px'),
      padding: pad('10px', '0px', '10px', '0px'),
    })
    if (smallProps) specs.push({ id: 'ModuleSmallButton', row: 0, col, properties: smallProps })
    if (offByDefault(p, `show${cap}BigBtn`)) {
      specs.push({
        id: 'ModuleOneButton',
        row: 0,
        col,
        properties: bigButtonProps(
          p,
          {
            text: `${prefix}BigBtnText`,
            url: `${prefix}BigBtnUrl`,
            bg: `${prefix}BigBtnBgColor`,
            fg: `${prefix}BigBtnTextColor`,
            borderStyle: `${prefix}BigBtnBorderStyle`,
            borderWidth: `${prefix}BigBtnBorderWidth`,
            borderColor: `${prefix}BigBtnBorderColor`,
            radius: `${prefix}BigBtnBorderRadius`,
          },
          {
            padding: pad(
              s(p, `${prefix}BigBtnMarginTop`, '10px'),
              s(p, `${prefix}BigBtnMarginRight`, '0px'),
              s(p, `${prefix}BigBtnMarginBottom`, '10px'),
              s(p, `${prefix}BigBtnMarginLeft`, '0px'),
            ),
            buttonPadding: btnPad('10px', '0px', '10px', '0px'),
          },
        ),
      })
    }
  }
  side(0, 'left')
  side(1, 'right')
  return {
    name: '모듈 04번',
    specs,
    groupStyles: { paddingLeft: '15px', paddingRight: '15px' },
    colWidths: [twoColWidths(p)],
  }
}

/** 모듈 05번 — 2단(좌 이미지 · 우 본문 + 작은 버튼) */
const convertModule05 = (p: Props): ComposedConversion => {
  const specs: ComposedElementSpec[] = [
    {
      id: 'ModuleImg',
      row: 0,
      col: 0,
      properties: imgProps(
        {
          url: s(p, 'imageUrl'),
          alt: s(p, 'imageAlt', '이미지'),
          showLink: p.showImageLink === true,
          linkUrl: s(p, 'imageLinkUrl', '#'),
          borderRadius: s(p, 'imageBorderRadius', '0px'),
        },
        pad('0px', '0px', '0px', '0px'),
      ),
    },
    {
      id: 'ModuleDescText',
      row: 0,
      col: 1,
      properties: {
        fontSize: s(p, 'contentTextFontSize', '14px'),
        textColor: '#111111',
        descriptionText: s(p, 'contentText'),
        ...pad('0px', '0px', '0px', '0px'),
        ...outerMargin('0px', '0px', '0px', '0px'),
      },
    },
  ]
  const smallProps = smallButtonProps(
    p,
    collectSmallButtons(p, {
      showKey: (n) => `showButton${n}`,
      key: (n, suffix) => `button${n}${suffix}`,
    }),
    {
      align: 'left',
      width: s(p, 'smallBtnWidth', 'auto'),
      radius: s(p, 'smallBtnBorderRadius', '30px'),
      padding: pad('10px', '0px', '0px', '0px'),
    },
  )
  if (smallProps) specs.push({ id: 'ModuleSmallButton', row: 0, col: 1, properties: smallProps })
  return {
    name: '모듈 05번',
    specs,
    // 레거시 바깥 td: padding 0 15px 20px → 컬럼 셀이 자체 5px을 주므로 아래는 15px만
    groupStyles: { paddingLeft: '15px', paddingRight: '15px', paddingBottom: '15px' },
    colWidths: [twoColWidths(p)],
  }
}

/** 모듈 05-1번 — 2단(좌 이미지 · 우 강조 타이틀 박스 + 본문 + 작은 버튼) */
const convertModule051 = (p: Props): ComposedConversion => {
  const specs: ComposedElementSpec[] = [
    {
      id: 'ModuleImg',
      row: 0,
      col: 0,
      properties: imgProps(
        {
          url: s(p, 'ImageUrl') || s(p, 'imageUrl'),
          alt: s(p, 'ImageAlt', '이미지'),
          showLink: p.showImageLink === true,
          linkUrl: s(p, 'imageLinkUrl', '#'),
          borderRadius: s(p, 'imageBorderRadius', '0px'),
        },
        pad('0px', '0px', '0px', '0px'),
      ),
    },
    {
      id: 'ModuleDescText',
      row: 0,
      col: 1,
      properties: {
        fontSize: s(p, 'boxTitleFontSize', '16px'),
        textColor: s(p, 'boxColor', '#111111'),
        bgColor: s(p, 'boxBgColor', '#e5e5e5'),
        descriptionText: toRich(s(p, 'boxTitle'), {
          lineHeight: s(p, 'boxTitleLineHeight', '1.7'),
          bold: true,
        }),
        ...pad('6px', '6px', '6px', '6px'),
        ...outerMargin('0px', '0px', '0px', '0px'),
      },
    },
    {
      id: 'ModuleDescText',
      row: 0,
      col: 1,
      properties: {
        fontSize: s(p, 'contentTextFontSize', '14px'),
        textColor: '#111111',
        descriptionText: s(p, 'contentText'),
        ...pad('5px', '0px', '10px', '0px'),
        ...outerMargin('0px', '0px', '0px', '0px'),
      },
    },
  ]
  const smallProps = smallButtonProps(
    p,
    collectSmallButtons(p, {
      showKey: (n) => `showButton${n}`,
      key: (n, suffix) => `button${n}${suffix}`,
    }),
    {
      align: 'left',
      width: s(p, 'smallBtnWidth', 'auto'),
      radius: s(p, 'smallBtnBorderRadius', '30px'),
      padding: pad('10px', '0px', '0px', '0px'),
    },
  )
  if (smallProps) specs.push({ id: 'ModuleSmallButton', row: 0, col: 1, properties: smallProps })
  return {
    name: '모듈 05-1번',
    specs,
    groupStyles: { paddingLeft: '15px', paddingRight: '15px', paddingBottom: '10px' },
    colWidths: [twoColWidths(p)],
  }
}

/** 모듈 05번(05-3형) — 상단 전체폭 섹션 + 하단 2단 */
const convertModule053 = (p: Props): ComposedConversion => {
  const specs: ComposedElementSpec[] = []
  const hasTopTitle = onByDefault(p, 'showTopSectionTitle')
  const hasTopText = onByDefault(p, 'showTopSectionText')
  // 0행: 상단 섹션(전체폭). 둘 다 꺼져 있으면 행 자체를 만들지 않는다.
  const contentRow = hasTopTitle || hasTopText ? 1 : 0
  if (hasTopTitle) {
    specs.push({
      id: 'ModuleDescText',
      row: 0,
      col: 0,
      properties: {
        fontSize: s(p, 'topSectionTitleFontSize', '16px'),
        textColor: s(p, 'topSectionTitleTextColor', '#111111'),
        bgColor: s(p, 'topSectionTitleBgColor', '#e5e5e5'),
        descriptionText: toRich(s(p, 'topSectionTitle'), {
          lineHeight: s(p, 'topSectionTitleLineHeight', '1.7'),
          bold: true,
        }),
        ...pad('6px', '0px', '6px', '20px'),
        ...outerMargin('0px', '5px', '0px', '5px'),
      },
    })
  }
  if (hasTopText) {
    specs.push({
      id: 'ModuleDescText',
      row: 0,
      col: 0,
      properties: {
        fontSize: s(p, 'topSectionTextFontSize', '15px'),
        textColor: '#111111',
        descriptionText: s(p, 'topSectionText'),
        ...pad('5px', '0px', '10px', '0px'),
        ...outerMargin('16px', '5px', '5px', '5px'),
      },
    })
  }
  specs.push({
    id: 'ModuleImg',
    row: contentRow,
    col: 0,
    properties: imgProps(
      {
        url: s(p, 'topLeftImageUrl'),
        alt: s(p, 'topLeftImageAlt', '이미지'),
        showLink: p.showImageLink === true,
        linkUrl: s(p, 'imageLinkUrl', '#'),
        borderRadius: s(p, 'imageBorderRadius', '0px'),
      },
      pad('0px', '0px', '0px', '0px'),
    ),
  })
  if (onByDefault(p, 'showRightTitle')) {
    const emphasis = offByDefault(p, 'rightTitleEmphasis')
    specs.push({
      id: 'ModuleDescText',
      row: contentRow,
      col: 1,
      properties: {
        fontSize: s(p, 'topRightTitle1FontSize', '14px'),
        textColor: emphasis ? s(p, 'rightTitleTextColor', '#111111') : '#111111',
        bgColor: emphasis ? s(p, 'rightTitleBgColor', '#e5e5e5') : 'transparent',
        descriptionText: toRich(s(p, 'topRightTitle1'), {
          lineHeight: s(p, 'topRightTitle1LineHeight', '1.7'),
          bold: true,
        }),
        ...pad(emphasis ? '6px' : '0px', emphasis ? '10px' : '0px', emphasis ? '6px' : '0px', emphasis ? '10px' : '0px'),
        ...outerMargin('0px', '0px', '0px', '0px'),
      },
    })
  }
  specs.push({
    id: 'ModuleDescText',
    row: contentRow,
    col: 1,
    properties: {
      fontSize: s(p, 'topRightText1FontSize', '14px'),
      textColor: '#111111',
      descriptionText: s(p, 'topRightText1'),
      ...pad('0px', '0px', '0px', '0px'),
      // 레거시 텍스트 div의 margin:4px 0 10px
      ...outerMargin('4px', '0px', '10px', '0px'),
    },
  })
  const smallProps = smallButtonProps(
    p,
    collectSmallButtons(p, {
      showKey: (n) => `showSmallBtn${n}`,
      key: (n, suffix) => `smallBtn${n}${suffix}`,
    }),
    {
      align: 'left',
      width: s(p, 'smallBtnWidth', 'auto'),
      radius: s(p, 'smallBtnBorderRadius', '30px'),
      padding: pad('0px', '0px', '0px', '0px'),
    },
  )
  if (smallProps) {
    specs.push({ id: 'ModuleSmallButton', row: contentRow, col: 1, properties: smallProps })
  }
  if (offByDefault(p, 'showBigBtn')) {
    specs.push({
      id: 'ModuleOneButton',
      row: contentRow,
      col: 1,
      properties: bigButtonProps(
        p,
        {
          text: 'bigBtnText',
          url: 'bigBtnUrl',
          bg: 'bigBtnBgColor',
          fg: 'bigBtnTextColor',
          borderStyle: 'bigBtnBorderStyle',
          borderWidth: 'bigBtnBorderWidth',
          borderColor: 'bigBtnBorderColor',
          radius: 'bigBtnBorderRadius',
        },
        { padding: pad('20px', '0px', '0px', '0px'), buttonPadding: btnPad('12px', '0px', '12px', '0px') },
      ),
    })
  }
  const colWidths: number[][] = []
  colWidths[contentRow] = twoColWidths(p)
  return {
    name: '모듈 05번',
    specs,
    // 레거시 바깥 td: padding 0 15px + 하단 20px 스페이서 행 → 컬럼 셀 5px을 뺀 15px
    groupStyles: { paddingLeft: '15px', paddingRight: '15px', paddingBottom: '15px' },
    colWidths,
  }
}

/** 모듈 06번 — 2단(각 컬럼: 섹션 타이틀 박스 · 이미지 · 본문 · 작은 버튼) */
const convertModule06 = (p: Props): ComposedConversion => {
  const specs: ComposedElementSpec[] = []
  const side = (col: number, prefix: 'left' | 'right') => {
    const cap = prefix === 'left' ? 'Left' : 'Right'
    specs.push({
      id: 'ModuleDescText',
      row: 0,
      col,
      properties: {
        fontSize: s(p, `${prefix}TitleFontSize`, '16px'),
        textColor: s(p, `${prefix}TitleColor`, '#111111'),
        bgColor: s(p, `${prefix}TitleBgColor`, '#e5e5e5'),
        textAlign: 'center',
        descriptionText: toRich(s(p, `${prefix}Title`), {
          lineHeight: s(p, `${prefix}TitleLineHeight`, '1.7'),
          bold: true,
          align: 'center',
        }),
        ...pad('6px', '0px', '6px', '0px'),
        ...outerMargin('0px', '0px', '6px', '0px'),
      },
    })
    specs.push({
      id: 'ModuleImg',
      row: 0,
      col,
      properties: imgProps(
        {
          url: s(p, `${prefix}ImageUrl`),
          alt: s(p, `${prefix}ImageAlt`, '이미지'),
          showLink: p[`show${cap}ImageLink`] === true,
          linkUrl: s(p, `${prefix}ImageLinkUrl`, '#'),
          borderRadius: s(p, `${prefix}ImageBorderRadius`, '0px'),
        },
        pad('0px', '0px', '0px', '0px'),
      ),
    })
    specs.push({
      id: 'ModuleDescText',
      row: 0,
      col,
      properties: {
        fontSize: s(p, `${prefix}ContentFontSize`, '14px'),
        textColor: '#333333',
        descriptionText: s(p, `${prefix}Content`),
        ...pad('10px', '0px', '10px', '0px'),
        ...outerMargin('0px', '0px', '0px', '0px'),
      },
    })
    const smallProps = smallButtonProps(
      p,
      collectSmallButtons(p, {
        showKey: (n) => `show${cap}Button${n}`,
        key: (n, suffix) => `${prefix}Button${n}${suffix}`,
      }),
      {
        align: 'left',
        width: s(p, `${prefix}SmallBtnWidth`, 'auto'),
        radius: s(p, `${prefix}SmallBtnBorderRadius`, '30px'),
        padding: pad('5px', '0px', '15px', '0px'),
      },
    )
    if (smallProps) specs.push({ id: 'ModuleSmallButton', row: 0, col, properties: smallProps })
  }
  side(0, 'left')
  side(1, 'right')
  return {
    name: '모듈 06번',
    specs,
    groupStyles: { paddingLeft: '10px', paddingRight: '10px' },
    colWidths: [twoColWidths(p)],
  }
}

/** 모듈 07번 — 2단(이미지 · 타이틀 박스 + 본문 + 작은 버튼). reverse면 좌우 교체 */
const convertModule07 = (p: Props, reverse: boolean): ComposedConversion => {
  const imgCol = reverse ? 1 : 0
  const txtCol = reverse ? 0 : 1
  const specs: ComposedElementSpec[] = [
    {
      id: 'ModuleImg',
      row: 0,
      col: imgCol,
      properties: imgProps(
        {
          url: s(p, 'imageUrl'),
          alt: s(p, 'imageAlt', '이미지'),
          showLink: p.showImageLink === true,
          linkUrl: s(p, 'imageLinkUrl', '#'),
          borderRadius: s(p, 'imageBorderRadius', '0px'),
        },
        pad('0px', '0px', '0px', '0px'),
      ),
    },
    {
      id: 'ModuleDescText',
      row: 0,
      col: txtCol,
      properties: {
        fontSize: s(p, 'titleFontSize', '18px'),
        textColor: s(p, 'titleTextColor', '#111111'),
        bgColor: s(p, 'titleBgColor', 'transparent'),
        textAlign: s(p, 'titleAlign', 'left'),
        showBorderRadius: !isZeroLength(s(p, 'titleBorderRadius', '0px')),
        borderRadius: s(p, 'titleBorderRadius', '0px'),
        descriptionText: `<p style="margin:0; padding:0; line-height:${s(p, 'titleLineHeight', '1.7')}; text-align:${s(p, 'titleAlign', 'left')};"><span style="font-weight:${s(p, 'titleFontWeight', '700')};">${s(p, 'title')}</span></p>`,
        ...pad('5px', '10px', '5px', '10px'),
        ...outerMargin(
          s(p, 'textAreaPaddingTop', '25px'),
          s(p, 'textAreaPaddingRight', '0px'),
          '0px',
          s(p, 'textAreaPaddingLeft', '0px'),
        ),
      },
    },
    {
      id: 'ModuleDescText',
      row: 0,
      col: txtCol,
      properties: {
        fontSize: s(p, 'contentTextFontSize', '14px'),
        textColor: s(p, 'contentTextColor', '#333333'),
        bgColor: s(p, 'contentBgColor', 'transparent'),
        showBorderRadius: !isZeroLength(s(p, 'contentBorderRadius', '0px')),
        borderRadius: s(p, 'contentBorderRadius', '0px'),
        descriptionText: s(p, 'contentText'),
        ...pad('0px', '10px', '0px', '10px'),
        ...outerMargin(
          '0px',
          s(p, 'textAreaPaddingRight', '0px'),
          s(p, 'textAreaPaddingBottom', '25px'),
          s(p, 'textAreaPaddingLeft', '0px'),
        ),
      },
    },
  ]
  if (offByDefault(p, 'showButton')) {
    const smallProps = smallButtonProps(
      p,
      [
        {
          text: s(p, 'buttonText', '더보기 →'),
          url: s(p, 'buttonUrl', '#'),
          bgColor: s(p, 'buttonBgColor', '#e5e5e5'),
          textColor: s(p, 'buttonTextColor', '#333333'),
          bgKey: 'buttonBgColor',
        },
      ],
      {
        align: s(p, 'buttonAlign', 'center'),
        width: s(p, 'buttonWidth', 'auto'),
        radius: s(p, 'buttonBorderRadius', '30px'),
        padding: pad('10px', '10px', '0px', '10px'),
      },
    )
    if (smallProps) specs.push({ id: 'ModuleSmallButton', row: 0, col: txtCol, properties: smallProps })
  }
  const widths = twoColWidths(p)
  return {
    name: reverse ? '모듈 07번(좌우 반전)' : '모듈 07번',
    specs,
    groupStyles: { paddingLeft: '15px', paddingRight: '15px' },
    colWidths: [reverse ? [widths[1], widths[0]] : widths],
  }
}

/** 모듈 10번 — 좌 이미지 · 우 [라벨 + 시간 + 타이틀] */
const convertModule10 = (p: Props): ComposedConversion => {
  const specs: ComposedElementSpec[] = []
  if (onByDefault(p, 'showImage')) {
    specs.push({
      id: 'ModuleImg',
      row: 0,
      col: 0,
      properties: imgProps(
        {
          url: s(p, 'imageUrl'),
          alt: s(p, 'imageAlt', '이미지'),
          showLink: p.showImageLink === true,
          linkUrl: s(p, 'imageLinkUrl', '#'),
          borderRadius: s(p, 'imageBorderRadius', '0px'),
        },
        pad('5px', '5px', '5px', '5px'),
      ),
    })
  }
  // 라벨(배지) + 시간을 한 줄로 — 레거시 인라인 마크업을 그대로 옮긴다
  const labelHtml = onByDefault(p, 'showLabel')
    ? `<span style="display:inline-block; background-color:${s(p, 'labelBgColor', '#333333')}; border-radius:30px; padding:5px 20px; color:${s(p, 'labelTextColor', '#ffffff')}; font-size:${s(p, 'labelTextFontSize', '13px')}; line-height:1.5em; font-weight:700;">${s(p, 'labelText')}</span>`
    : ''
  const timeHtml = offByDefault(p, 'showTime')
    ? `<span style="display:inline-block; margin:5px; color:${s(p, 'timeTextColor', '#666666')}; font-size:${s(p, 'timeTextFontSize', '13px')}; line-height:1.5em; font-weight:600;">${s(p, 'timeText')}</span>`
    : ''
  if (labelHtml || timeHtml) {
    specs.push({
      id: 'ModuleDescText',
      row: 0,
      col: 1,
      properties: {
        fontSize: s(p, 'labelTextFontSize', '13px'),
        textColor: '#111111',
        descriptionText: `<p style="margin:0; padding:0;">${labelHtml}${timeHtml}</p>`,
        ...pad('0px', '0px', '0px', '0px'),
        ...outerMargin('0px', '0px', '0px', '0px'),
      },
    })
  }
  specs.push({
    id: 'ModuleDescText',
    row: 0,
    col: 1,
    properties: {
      fontSize: s(p, 'titleFontSize', '16px'),
      textColor: '#111111',
      descriptionText: s(p, 'title'),
      ...pad('10px', '0px', '0px', '0px'),
      ...outerMargin('0px', '0px', '0px', '0px'),
    },
  })
  return {
    name: '모듈 10번',
    specs,
    groupStyles: { paddingLeft: '5px', paddingRight: '5px' },
    colWidths: [[25, 75]],
    warnings: [
      '모듈 10번: 이미지와 글 영역의 가로 비율이 25:75로 고정됩니다. 다르게 하려면 그룹의 컬럼 너비를 조정해 주세요.',
    ],
  }
}

/** 모듈 10-1번 — 2단, 각 컬럼 = 이미지 · 라벨 · 타이틀 */
const convertModule101 = (p: Props): ComposedConversion => {
  const specs: ComposedElementSpec[] = []
  const side = (col: number, prefix: 'left' | 'right') => {
    const cap = prefix === 'left' ? 'Left' : 'Right'
    specs.push({
      id: 'ModuleImg',
      row: 0,
      col,
      properties: imgProps(
        {
          url: s(p, `${prefix}ImageUrl`),
          alt: s(p, `${prefix}ImageAlt`, '이미지'),
          showLink: p[`show${cap}ImageLink`] === true,
          linkUrl: s(p, `${prefix}ImageLinkUrl`, '#'),
          borderRadius: s(p, `${prefix}ImageBorderRadius`, '0px'),
        },
        pad('5px', '5px', '5px', '5px'),
      ),
    })
    if (onByDefault(p, `show${cap}Label`)) {
      specs.push({
        id: 'ModuleDescText',
        row: 0,
        col,
        properties: {
          fontSize: s(p, `${prefix}LabelTextFontSize`, '13px'),
          textColor: '#111111',
          textAlign: 'center',
          descriptionText: `<p style="margin:0; padding:0; text-align:center;"><span style="display:inline-block; background-color:${s(p, `${prefix}LabelBgColor`, '#333333')}; border-radius:30px; padding:5px 20px; color:${s(p, `${prefix}LabelTextColor`, '#ffffff')}; font-size:${s(p, `${prefix}LabelTextFontSize`, '13px')}; line-height:1.5em; font-weight:700;">${s(p, `${prefix}LabelText`)}</span></p>`,
          ...pad('0px', '0px', '0px', '0px'),
          ...outerMargin('0px', '0px', '0px', '0px'),
        },
      })
    }
    specs.push({
      id: 'ModuleDescText',
      row: 0,
      col,
      properties: {
        fontSize: s(p, `${prefix}TitleFontSize`, '16px'),
        textColor: '#111111',
        textAlign: 'center',
        descriptionText: s(p, `${prefix}Title`),
        ...pad('10px', '0px', '0px', '0px'),
        ...outerMargin('0px', '0px', '0px', '0px'),
      },
    })
  }
  side(0, 'left')
  side(1, 'right')
  return { name: '모듈 10-1번', specs, groupStyles: { paddingLeft: '5px', paddingRight: '5px' } }
}

/** 뉴스 헤드라인 헤더 — 로고 · 구분선 · (제목 | 웹으로 보기) · 얇은 구분선 */
const convertNewsHeader = (p: Props): ComposedConversion => {
  const warnings: string[] = []
  const logoMaxWidth = s(p, 'logoMaxWidth', '100%')
  // 최대 너비가 %면 레거시에서는 '원본 크기'로 그려졌다 → 열 때 실제 크기를 재 px로 채운다
  const fitNatural = logoMaxWidth.endsWith('%')
  if (s(p, 'tableSummary')) {
    warnings.push(
      '뉴스 헤드라인 헤더: 화면 낭독기용 표 설명(summary)은 새 편집 방식에 해당 설정이 없어 빠집니다.',
    )
  }
  const specs: ComposedElementSpec[] = []
  if (onByDefault(p, 'showLogo')) {
    specs.push({
      id: 'ModuleImg',
      row: 0,
      col: 0,
      properties: imgProps(
        {
          url: s(p, 'logoImageUrl'),
          alt: s(p, 'logoAlt', '로고'),
          maxWidth: logoMaxWidth,
          align: s(p, 'logoAlign', 'center'),
          fitNatural,
        },
        pad('30px', '30px', '30px', '30px'),
      ),
    })
  }
  specs.push({
    id: 'ModuleDivider',
    row: 1,
    col: 0,
    properties: {
      borderWidth: s(p, 'logoBorderWidth', '5px'),
      borderStyle: 'solid',
      borderColor: s(p, 'logoBorderColor', '#000000'),
      dividerWidth: '100%',
      ...pad('0px', '0px', '0px', '0px'),
    },
  })
  specs.push({
    id: 'ModuleDescText',
    row: 2,
    col: 0,
    properties: {
      fontSize: s(p, 'headerTitleFontSize', '16px'),
      textColor: s(p, 'titleColor', '#333333'),
      textAlign: 'left',
      descriptionText: `<p style="margin:0; padding:0; line-height:1.7;"><span style="font-weight:600;">${s(p, 'headerTitle')}</span></p>`,
      ...pad('0px', '0px', '0px', '0px'),
      ...outerMargin(
        s(p, 'headerTitlePaddingTop', '5px'),
        '0px',
        s(p, 'headerTitlePaddingBottom', '10px'),
        s(p, 'headerTitlePaddingLeft', '20px'),
      ),
    },
  })
  specs.push({
    id: 'ModuleDescText',
    row: 2,
    col: 1,
    properties: {
      fontSize: s(p, 'webViewFontSize', '16px'),
      textColor: s(p, 'webViewColor', '#333333'),
      textAlign: 'right',
      descriptionText: `<p style="margin:0; padding:0; line-height:1.7em; text-align:right;"><a href="${s(p, 'webViewUrl', '#')}" target="_blank" style="text-decoration:none; color:${s(p, 'webViewColor', '#333333')};">${s(p, 'webViewText', '👀 웹으로 보기')}</a></p>`,
      ...pad('0px', '0px', '0px', '0px'),
      ...outerMargin(
        s(p, 'headerTitlePaddingTop', '5px'),
        s(p, 'headerTitlePaddingRight', '20px'),
        s(p, 'headerTitlePaddingBottom', '10px'),
        '0px',
      ),
    },
  })
  specs.push({
    id: 'ModuleDivider',
    row: 3,
    col: 0,
    properties: {
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '#dddddd',
      dividerWidth: '100%',
      ...pad('0px', '0px', '0px', '0px'),
    },
  })
  return { name: '뉴스 헤드라인 헤더', specs, warnings }
}

/** 기본 헤더 — 상단 라인(그룹 테두리) · 로고 · 하단 라인 · 헤더 텍스트 */
const convertBasicHeader = (p: Props): ComposedConversion => {
  const warnings: string[] = []
  const logoMaxWidth = s(p, 'logoMaxWidth', '100%')
  // 최대 너비가 %면 레거시에서는 '원본 크기'로 그려졌다 → 열 때 실제 크기를 재 px로 채운다
  const fitNatural = logoMaxWidth.endsWith('%')
  if (s(p, 'tableSummary')) {
    warnings.push(
      '기본 헤더: 화면 낭독기용 표 설명(summary)은 새 편집 방식에 해당 설정이 없어 빠집니다.',
    )
  }
  // 그룹 스타일(테두리·좌우 여백)을 쓰지 않고 전부 원소 모듈 속성으로 푼다 —
  // 그래야 이미 다른 그룹 안에 있는 헤더도 그 그룹에 그대로 풀어 넣을 수 있다.
  // 레거시 테이블의 좌우 여백 20px은 각 원소의 좌우 여백에 더한다.
  // (상단 테두리는 테이블 바깥선이라 전체 폭, 로고 하단선은 td 안쪽이라 좌우 20px 들여쓰기)
  const specs: ComposedElementSpec[] = []
  let row = 0
  const topBorderWidth = s(p, 'topBorderWidth', '3px')
  if (!isZeroLength(topBorderWidth)) {
    specs.push({
      id: 'ModuleDivider',
      row: row++,
      col: 0,
      properties: {
        borderWidth: topBorderWidth,
        borderStyle: 'solid',
        borderColor: s(p, 'topBorderColor', '#000000'),
        dividerWidth: '100%',
        ...pad('0px', '0px', '0px', '0px'),
      },
    })
  }
  return {
    name: '기본 헤더',
    warnings,
    specs: [
      ...specs,
      {
        id: 'ModuleImg',
        row: row++,
        col: 0,
        properties: imgProps(
          {
            url: s(p, 'logoImageUrl'),
            alt: s(p, 'logoAlt', '로고'),
            maxWidth: logoMaxWidth,
            align: s(p, 'logoAlign', 'center'),
            fitNatural,
          },
          pad(
            s(p, 'logoPaddingTop', '30px'),
            addPx(s(p, 'logoPaddingRight', '0'), 20),
            s(p, 'logoPaddingBottom', '20px'),
            addPx(s(p, 'logoPaddingLeft', '0'), 20),
          ),
        ),
      },
      {
        id: 'ModuleDivider',
        row: row++,
        col: 0,
        properties: {
          borderWidth: s(p, 'logoBorderWidth', '1px'),
          borderStyle: 'solid',
          borderColor: s(p, 'logoBorderColor', '#dddddd'),
          dividerWidth: '100%',
          ...pad('0px', '20px', '0px', '20px'),
        },
      },
      {
        id: 'ModuleDescText',
        row: row++,
        col: 0,
        properties: {
          fontSize: s(p, 'headerFontSize', '20px'),
          textColor: s(p, 'headerTextColor', '#111111'),
          descriptionText: s(p, 'headerText'),
          ...pad('0px', '0px', '0px', '0px'),
          ...outerMargin(
            s(p, 'headerTitlePaddingTop', '15px'),
            addPx(s(p, 'headerTitlePaddingRight', '0'), 20),
            s(p, 'headerTitlePaddingBottom', '15px'),
            addPx(s(p, 'headerTitlePaddingLeft', '0'), 20),
          ),
        },
      },
    ],
  }
}

/** 이미지형 헤더 — 비주얼 · 볼/일정/홈 · 구분선 · 타이틀 · 본문 · 큰 버튼 */
const convertImageHeader = (p: Props): ComposedConversion => {
  const specs: ComposedElementSpec[] = []
  const warnings: string[] = []
  if (s(p, 'tableSummary')) {
    warnings.push(
      '이미지형 헤더: 화면 낭독기용 표 설명(summary)은 새 편집 방식에 해당 설정이 없어 빠집니다.',
    )
  }
  specs.push({
    id: 'ModuleImg',
    row: 0,
    col: 0,
    properties: imgProps(
      {
        url: s(p, 'imageUrl'),
        alt: s(p, 'imageAlt', '전시 소개글'),
        showLink: p.showImageLink === true,
        linkUrl: s(p, 'imageLinkUrl', '#'),
      },
      pad(
        s(p, 'imagePaddingTop', '20px'),
        s(p, 'imagePaddingRight', '20px'),
        s(p, 'imagePaddingBottom', '20px'),
        s(p, 'imagePaddingLeft', '20px'),
      ),
    ),
  })
  const lines: string[] = []
  if (onByDefault(p, 'showVol')) {
    lines.push(
      `<p style="margin:0; padding:0; text-align:center; font-size:${s(p, 'volFontSize', '15px')}; line-height:${s(p, 'volLineHeight', '1.7')}; color:${s(p, 'volColor', '#333333')};">${s(p, 'volText')}</p>`,
    )
  }
  if (onByDefault(p, 'showDate')) {
    lines.push(
      `<p style="margin:0; padding:0; text-align:center; font-size:${s(p, 'dateFontSize', '20px')}; line-height:${s(p, 'dateLineHeight', '1.7')}; color:${s(p, 'dateColor', '#333333')};"><span style="font-weight:600;">${s(p, 'dateText')}</span></p>`,
    )
  }
  if (onByDefault(p, 'showHome')) {
    lines.push(
      `<p style="margin:0; padding:0; text-align:center; font-size:${s(p, 'homeFontSize', '14px')}; line-height:${s(p, 'homeLineHeight', '1.7')};"><a href="${s(p, 'homeLinkUrl', '#')}" target="_blank" style="text-decoration:none; color:${s(p, 'homeColor', '#333333')};">${s(p, 'homeLinkText')}</a></p>`,
    )
  }
  if (lines.length > 0) {
    specs.push({
      id: 'ModuleDescText',
      row: 1,
      col: 0,
      properties: {
        fontSize: s(p, 'volFontSize', '15px'),
        textColor: s(p, 'volColor', '#333333'),
        textAlign: 'center',
        descriptionText: lines.join(''),
        ...pad('20px', '0px', '20px', '0px'),
        ...outerMargin('0px', '0px', '0px', '0px'),
      },
    })
  }
  specs.push({
    id: 'ModuleDivider',
    row: 2,
    col: 0,
    properties: {
      borderWidth: s(p, 'dividerWidth', '1px'),
      borderStyle: s(p, 'dividerStyle', 'dotted'),
      borderColor: s(p, 'dividerColor', '#999999'),
      dividerWidth: '100%',
      ...pad(
        s(p, 'dividerPaddingTop', '0px'),
        s(p, 'dividerPaddingRight', '20px'),
        s(p, 'dividerPaddingBottom', '20px'),
        s(p, 'dividerPaddingLeft', '20px'),
      ),
    },
  })
  if (onByDefault(p, 'showTitle')) {
    specs.push({
      id: 'ModuleDescText',
      row: 3,
      col: 0,
      properties: {
        fontSize: s(p, 'titleFontSize', '20px'),
        textColor: s(p, 'titleColor', '#111111'),
        descriptionText: toRich(s(p, 'titleText'), { lineHeight: '1.5em', bold: true }),
        ...pad('0px', '20px', '0px', '20px'),
        ...outerMargin('0px', '0px', '0px', '0px'),
      },
    })
  }
  if (onByDefault(p, 'showBody')) {
    specs.push({
      id: 'ModuleDescText',
      row: 3,
      col: 0,
      properties: {
        fontSize: s(p, 'bodyFontSize', '14px'),
        textColor: s(p, 'bodyColor', '#333333'),
        descriptionText: toRich(s(p, 'bodyText'), { lineHeight: '1.7em' }),
        ...pad('20px', '20px', '20px', '20px'),
        ...outerMargin('0px', '0px', '0px', '0px'),
      },
    })
  }
  if (onByDefault(p, 'showButton')) {
    specs.push({
      id: 'ModuleOneButton',
      row: 4,
      col: 0,
      properties: bigButtonProps(
        p,
        {
          text: 'buttonText',
          url: 'buttonUrl',
          bg: 'buttonBgColor',
          fg: 'buttonTextColor',
          borderStyle: 'buttonBorderStyle',
          borderWidth: 'buttonBorderWidth',
          borderColor: 'buttonBorderColor',
          radius: 'buttonBorderRadius',
        },
        {
          padding: pad(
            s(p, 'buttonPaddingTop', '20px'),
            s(p, 'buttonPaddingRight', '20px'),
            s(p, 'buttonPaddingBottom', '20px'),
            s(p, 'buttonPaddingLeft', '20px'),
          ),
          buttonPadding: btnPad('15px', '0px', '15px', '0px'),
        },
      ),
    })
  }
  return { name: '이미지형 헤더', specs, warnings }
}

/**
 * 폰트 크기·굵기를 지정한 한 줄 설명 텍스트 HTML.
 * `moduleStore`의 `weightedTextHtml`(= '타이틀 추가' 조립형이 쓰는 포맷)과 같은 마크업이라,
 * 변환 결과가 좌측 패널에서 '타이틀 추가'로 만든 것과 동일하게 편집된다.
 *
 * 줄 간격은 레거시 값을 그대로 넘긴다 — 섹션 타이틀 td에는 line-height가 없었으므로(브라우저 기본),
 * 여기서 임의로 1.7을 넣으면 제목 줄 높이가 눈에 띄게 커진다.
 */
const weightedTextHtml = (
  text: string,
  fontSize: string,
  weight: string,
  lineHeight?: string,
): string => {
  if (!text) return ''
  if (isRichHtml(text)) return text
  const lh = lineHeight ? ` line-height:${lineHeight};` : ''
  return (
    `<p style="margin:0; padding:0;${lh}">` +
    `<span style="font-size:${fontSize}; font-weight:${weight};">${text}</span></p>`
  )
}

/**
 * 섹션 타이틀 — '타이틀 추가'(ComposedTitleSection)와 **같은 구성**으로 푼다.
 *
 * 전용 모듈을 남겨둘 이유가 없어서 원소 모듈로 분해한다:
 *   상단 테두리 → **구분선/여백** · 이미지 타이틀 → **단일 이미지** · 메인/서브 타이틀 → **설명 텍스트**
 * 원소 배치(행)와 텍스트 마크업을 `addComposedTitleSection`과 맞춰, 변환한 것과 '타이틀 추가'로
 * 새로 만든 것이 좌측 패널에서 똑같이 보이고 똑같이 편집되게 한다.
 * 결과가 원소 하나뿐이면(이미지만 있는 경우) 그룹으로 묶지 않고 단독 모듈로 넣는다.
 */
const convertSectionTitle = (p: Props): ComposedConversion => {
  const specs: ComposedElementSpec[] = []
  const borderWidth = s(p, 'topBorderWidth', '2px')
  // '타이틀 추가'와 같은 세로 스택(행을 하나씩 내려 쌓는다)
  let row = 0

  // 상단 테두리 → 구분선/여백 (두께 0이면 보이지도 편집할 것도 없으므로 만들지 않는다)
  if (!isZeroLength(borderWidth)) {
    specs.push({
      id: 'ModuleDivider',
      row: row++,
      col: 0,
      properties: {
        borderWidth,
        borderStyle: 'solid',
        borderColor: s(p, 'topBorderColor', '#333333'),
        dividerWidth: '100%',
        ...pad('0px', '0px', '0px', '0px'),
      },
    })
  }

  if (onByDefault(p, 'showSectionImage')) {
    const linkUrl = s(p, 'sectionImageLinkUrl', '#')
    specs.push({
      id: 'ModuleImg',
      row: row++,
      col: 0,
      properties: imgProps(
        {
          url: s(p, 'sectionImageUrl'),
          alt: s(p, 'sectionImageAlt', '섹션 이미지 타이틀'),
          showLink: !!linkUrl && linkUrl !== '#',
          linkUrl,
          maxWidth: s(p, 'sectionImageMaxWidth', '100%'),
          align: s(p, 'sectionImageAlign', 'center'),
        },
        pad(
          s(p, 'sectionImagePaddingTop', '15px'),
          s(p, 'sectionImagePaddingRight', '20px'),
          s(p, 'sectionImagePaddingBottom', '0'),
          s(p, 'sectionImagePaddingLeft', '20px'),
        ),
      ),
    })
  }

  // 메인 타이틀 → '타이틀 추가'의 강조 타이틀 텍스트 자리
  if (onByDefault(p, 'showMainTitle')) {
    const fontSize = s(p, 'mainTitleFontSize', '22px')
    specs.push({
      id: 'ModuleDescText',
      row: row++,
      col: 0,
      properties: {
        fontSize,
        textColor: s(p, 'mainTitleColor', '#111111'),
        descriptionText: weightedTextHtml(
          s(p, 'mainTitle'),
          fontSize,
          s(p, 'mainTitleFontWeight', '700'),
        ),
        ...pad(
          s(p, 'mainTitlePaddingTop', '15px'),
          s(p, 'mainTitlePaddingRight', '20px'),
          s(p, 'mainTitlePaddingBottom', '15px'),
          s(p, 'mainTitlePaddingLeft', '20px'),
        ),
        ...outerMargin('0px', '0px', '0px', '0px'),
      },
    })
  }

  // 서브 타이틀 → '타이틀 추가'의 본문 텍스트 자리 (레거시 td: font-weight:normal, line-height:1.5em)
  if (onByDefault(p, 'showSubTitle')) {
    const fontSize = s(p, 'subTitleFontSize', '16px')
    specs.push({
      id: 'ModuleDescText',
      row: row++,
      col: 0,
      properties: {
        fontSize,
        textColor: '#333333',
        descriptionText: weightedTextHtml(s(p, 'subTitle'), fontSize, '400', '1.5em'),
        ...pad(
          s(p, 'subTitlePaddingTop', '0'),
          s(p, 'subTitlePaddingRight', '15px'),
          s(p, 'subTitlePaddingBottom', '20px'),
          s(p, 'subTitlePaddingLeft', '15px'),
        ),
        ...outerMargin('0px', '0px', '0px', '0px'),
      },
    })
  }

  const bgColor = s(p, 'sectionBgColor', 'transparent')
  return {
    // '타이틀 추가'가 붙이는 그룹 이름(SectionTitle 모듈명)과 동일하게 맞춘다
    name: '섹션 타이틀',
    specs,
    single: specs.length === 1,
    ...(bgColor && bgColor !== 'transparent' ? { groupStyles: { backgroundColor: bgColor } } : {}),
  }
}

/** 복수 이미지 — 좌·우 이미지 2단 */
const convertMultiImage = (p: Props): ComposedConversion => ({
  name: '복수 이미지',
  groupStyles: { paddingLeft: '15px', paddingRight: '15px' },
  warnings: ['복수 이미지: 좌우 두 이미지 사이 간격이 6px 정도 벌어집니다.'],
  specs: (['left', 'right'] as const).map((prefix, col) => {
    const cap = prefix === 'left' ? 'Left' : 'Right'
    return {
      id: 'ModuleImg',
      row: 0,
      col,
      properties: imgProps(
        {
          url: s(p, `${prefix}ImageUrl`),
          alt: s(p, `${prefix}ImageAlt`, '이미지'),
          showLink: p[`show${cap}ImageLink`] === true,
          linkUrl: s(p, `${prefix}ImageLinkUrl`, '#'),
          borderRadius: s(p, `${prefix}ImageBorderRadius`, '0px'),
          borderStyle: s(p, `${prefix}ImageBorderStyle`, 'none'),
          borderWidth: s(p, `${prefix}ImageBorderWidth`, '1px'),
          borderColor: s(p, `${prefix}ImageBorderColor`, '#000000'),
        },
        pad('0px', '0px', '0px', '0px'),
      ),
    }
  }),
})

/** 복수 버튼 — 단일 버튼 2개를 2단 행으로 */
const convertTwoButton = (p: Props): ComposedConversion => {
  const specs: ComposedElementSpec[] = ([1, 2] as const).map((n, col) => {
    const radius = s(p, `button${n}BorderRadius`, '5px')
    const props: Props = {
      buttonText: s(p, `button${n}Text`, `버튼 ${n} →`),
      buttonUrl: s(p, `button${n}Url`, ''),
      buttonFontSize: s(p, `button${n}FontSize`, '15px'),
      buttonBgColor: s(p, `button${n}BgColor`, '#111111'),
      buttonTextColor: s(p, `button${n}TextColor`, '#ffffff'),
      buttonBorderStyle: s(p, `button${n}BorderStyle`, 'none'),
      buttonBorderWidth: s(p, `button${n}BorderWidth`, '1px'),
      buttonBorderColor: s(p, `button${n}BorderColor`, '#000000'),
      showBorderRadius: p.showBorderRadius !== false && !isZeroLength(radius),
      buttonBorderRadius: radius,
      ...pad('0px', '0px', '0px', '0px'),
      ...btnPad(
        s(p, `button${n}PaddingTop`, '15px'),
        s(p, `button${n}PaddingRight`, '0px'),
        s(p, `button${n}PaddingBottom`, '15px'),
        s(p, `button${n}PaddingLeft`, '0px'),
      ),
    }
    carryPointMeta(p, `button${n}BgColor`, 'buttonBgColor', props)
    carryPointMeta(p, `button${n}TextColor`, 'buttonTextColor', props)
    return { id: 'ModuleOneButton', row: 0, col, properties: props }
  })
  return {
    name: '복수 버튼',
    specs,
    groupStyles: {
      paddingTop: s(p, 'paddingTop', '10px'),
      paddingRight: s(p, 'paddingRight', '0px'),
      paddingBottom: s(p, 'paddingBottom', '15px'),
      paddingLeft: s(p, 'paddingLeft', '0px'),
    },
  }
}

/** 레거시 푸터의 개별 SNS 플래그/URL → ModuleSnsIcons의 순서 있는 배열 */
const snsIconsFromLegacy = (p: Props): SnsIconItem[] => {
  const legacyKey: Record<string, { show: string; url: string }> = {
    home: { show: 'showHome', url: 'homeUrl' },
    facebook: { show: 'showFacebook', url: 'facebookUrl' },
    x: { show: 'showX', url: 'xUrl' },
    blog: { show: 'showBlog', url: 'blogUrl' },
    youtube: { show: 'showYoutube', url: 'youtubeUrl' },
    instagram: { show: 'showInstagram', url: 'instagramUrl' },
    kakao: { show: 'showKakao', url: 'kakaoUrl' },
    linkedin: { show: 'showLinkedin', url: 'linkedinUrl' },
    zuzuzu: { show: 'showZuzuzu', url: 'zuzuzuUrl' },
    en: { show: 'showEn', url: 'enUrl' },
    jp: { show: 'showJp', url: 'jpUrl' },
    th: { show: 'showTh', url: 'thUrl' },
  }
  return defaultSnsIcons().map((item) => {
    const keys = legacyKey[item.key]
    if (!keys) return item
    const rawShow = p[keys.show]
    const url = s(p, keys.url, '')
    return {
      key: item.key,
      show: typeof rawShow === 'boolean' ? rawShow : item.show,
      // 입력 전 자리채움이던 '#'은 빈 값으로 (속성 패널에 '#'이 남아 보이지 않도록)
      url: url === '#' ? '' : url || item.url,
    }
  })
}

/** 레거시 푸터의 연락처(개별 플래그/값 또는 contactItems 배열) → ModuleContactInfo 항목 배열 */
const contactItemsFromLegacy = (p: Props): ContactItem[] => {
  const raw = p.contactItems
  if (Array.isArray(raw) && raw.length > 0) return raw as ContactItem[]
  return defaultContactItems(p)
}

/** 하단 푸터 — 회사정보 · 연락처 · 구분선 · SNS · 안내문구 (그룹 배경색 사용) */
const convertFooter = (p: Props): ComposedConversion => {
  const textColor = s(p, 'footerTextColor', '#333333')
  const unsubscribeUrl = s(p, 'unsubscribeUrl', '#')
  const inquiryEmail = s(p, 'inquiryEmail', '')
  const specs: ComposedElementSpec[] = []
  specs.push({
    id: 'ModuleDescText',
    row: 0,
    col: 0,
    properties: {
      fontSize: s(p, 'companyInfoFontSize', '13px'),
      textColor,
      textAlign: 'center',
      descriptionText: s(p, 'companyInfo'),
      ...pad('0px', '0px', '10px', '0px'),
      // 레거시 상단 30px 스페이서 행 + td padding 0 25px
      ...outerMargin('30px', '25px', '0px', '25px'),
    },
  })
  specs.push({
    id: 'ModuleContactInfo',
    row: 0,
    col: 0,
    properties: {
      contactItems: contactItemsFromLegacy(p),
      contactFontSize: s(p, 'contactInfoFontSize', '13px'),
      contactTextColor: textColor,
      contactAlign: 'center',
      // 레거시 하단 30px 스페이서 행
      ...pad('0px', '25px', '30px', '25px'),
    },
  })
  specs.push({
    id: 'ModuleDivider',
    row: 1,
    col: 0,
    properties: {
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '#aaaaaa',
      dividerWidth: '100%',
      ...pad('0px', '0px', '15px', '0px'),
    },
  })
  specs.push({
    id: 'ModuleSnsIcons',
    row: 2,
    col: 0,
    properties: {
      snsIconBgColor: s(p, 'snsIconBgColor', '#333333'),
      snsAlign: 'center',
      snsIcons: snsIconsFromLegacy(p),
      ...pad('0px', '5px', '15px', '5px'),
    },
  })
  const guide: string[] = []
  if (onByDefault(p, 'showKoreanFooter')) {
    guide.push(
      '<p style="margin:0; padding:0; line-height:1.7em;">본 메일은 회원님의 수신동의 여부를 확인한 결과 회원님께서 수신동의를 하셨기에 발송되었습니다.</p>',
      `<p style="margin:0; padding:0; line-height:1.7em;">메일 수신을 원치 않으시면 <a href="${unsubscribeUrl}" target="_blank" style="text-decoration:none; color:${textColor}; font-weight:700;">[수신거부]</a> 를 클릭하십시오.</p>`,
    )
    if (onByDefault(p, 'showInquiry')) {
      guide.push(
        `<p style="margin:0; padding:0; line-height:1.7em;">본 메일은 발신전용 메일이므로 문의사항은 <strong>${inquiryEmail}</strong>으로 문의 바랍니다</p>`,
      )
    }
  }
  if (offByDefault(p, 'showEnglishFooter')) {
    guide.push(
      `<p style="margin:0; padding:0; line-height:1.7em;">&nbsp;</p>`,
      `<p style="margin:0; padding:0; line-height:1.7em;">If you don't want this type of information or e-mail, please click the <a href="${unsubscribeUrl}" target="_blank" style="text-decoration:none; color:${textColor}; font-weight:700;">[unsubscription]</a></p>`,
      `<p style="margin:0; padding:0; line-height:1.7em;">Please note that this is a no-reply email. For any inquiries,</p>`,
      `<p style="margin:0; padding:0; line-height:1.7em;">contact us at ${s(p, 'phone')} or via email at ${inquiryEmail}.</p>`,
    )
  }
  if (guide.length > 0) {
    specs.push({
      id: 'ModuleDescText',
      row: 3,
      col: 0,
      properties: {
        fontSize: '12px',
        textColor,
        textAlign: 'center',
        descriptionText: guide.join(''),
        ...pad('10px', '25px', '40px', '25px'),
        ...outerMargin('0px', '0px', '0px', '0px'),
      },
    })
  }
  return {
    name: '하단 푸터',
    specs,
    groupStyles: { backgroundColor: s(p, 'footerBgColor', '#e9e9e9') },
  }
}

// ────────────────────────────── 공개 API ──────────────────────────────

type Converter = (p: Props) => ComposedConversion

const CONVERTERS: Record<string, Converter> = {
  Module01: convertModule01,
  // 모듈 12번은 모듈 01번과 같은 '배경 박스 텍스트'라 모듈 01번 형태로 가져온다
  Module12: convertModule12,
  'Module01-1': convertModule011,
  Module02: convertModule02,
  Module04: convertModule04,
  Module05: convertModule05,
  'Module05-1': convertModule051,
  'Module05-3': convertModule053,
  Module06: convertModule06,
  Module07: (p) => convertModule07(p, false),
  Module07_reverse: (p) => convertModule07(p, true),
  Module10: convertModule10,
  'Module10-1': convertModule101,
  ModuleNewsHeader: convertNewsHeader,
  ModuleBasicHeader: convertBasicHeader,
  ModuleImageHeader: convertImageHeader,
  ModuleMultiImage: convertMultiImage,
  ModuleFooter: convertFooter,
  ModuleTwoButton: convertTwoButton,
  SectionTitle: convertSectionTitle,
}

/** v2로 변환 가능한 레거시 모듈 id 목록 */
export const CONVERTIBLE_LEGACY_IDS: string[] = Object.keys(CONVERTERS)

/** 이 모듈 id를 v2 조립형으로 바꿀 수 있는가 */
export const isConvertibleToComposed = (moduleId: string): boolean => moduleId in CONVERTERS

/**
 * 레거시 모듈 인스턴스를 v2 조립형 구성으로 변환한다.
 * @returns 변환 대상이 아니면 null (호출부는 레거시 그대로 복원해야 함)
 */
export function convertLegacyToComposed(
  moduleId: string,
  properties: Props,
): ComposedConversion | null {
  const convert = CONVERTERS[moduleId]
  if (!convert) return null
  const result = convert(properties || {})
  // 빈 스펙(모든 요소가 비노출)은 변환하지 않고 레거시를 유지한다
  if (!result.specs || result.specs.length === 0) return null
  return result
}

/** 모듈 목록에서 v2로 바꿀 수 있는 레거시 모듈 개수 */
export function countConvertibleModules(modules: Array<{ moduleId: string }>): number {
  return modules.filter((m) => isConvertibleToComposed(m.moduleId)).length
}

/**
 * 이 변환 결과를 **이미 존재하는 그룹 안에** 원소 모듈로 그대로 풀어 넣을 수 있는가.
 *
 * 사용자가 직접 묶어둔 그룹 안에 레거시 모듈이 들어 있는 경우, 그룹을 쪼개면 순서가 흐트러지므로
 * (그룹 멤버는 항상 연속 배치된다) 원소들을 그 그룹의 같은 칸에 이어 붙인다.
 * 다만 아래 두 경우는 칸 하나 안에서 표현할 수 없어 레거시를 그대로 둬야 한다:
 *  - 2단 이상이 필요한 변환 → 그룹 칸 안에 다시 컬럼을 만들 수 없다
 *  - 그룹 배경색 등 그룹 단위 스타일이 필요한 변환 → 형제 모듈까지 물들인다
 */
export function canInlineIntoGroup(conversion: ComposedConversion): boolean {
  if (conversion.groupStyles && Object.keys(conversion.groupStyles).length > 0) return false
  return conversion.specs.every((spec) => spec.col === 0)
}
