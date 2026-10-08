/**
 * SNS 아이콘(ModuleSnsIcons) 공유 상수 — 렌더 프로세서와 속성 패널 UI가 함께 사용.
 * 아이콘은 순서 있는 배열(SnsIconItem[])로 저장되어 '순서 변경'이 가능하다.
 *
 * 마크업 원칙 — 원형(45×45)의 크기를 **CSS width에 맡기지 않는다**.
 * 예전엔 `<a style="display:inline-block;width:45px;height:45px">` 안에 `<img style="width:25%;height:45px">`를
 * 두었는데, 일부 메일 클라이언트가 a 의 width 와 img 의 % 폭을 버려서 원형이 이미지 원본 비율로 찌그러졌다
 * (페이스북 아이콘 원본이 14×26 이라 24×45 타원이 됨). 그래서 원형은 `<td width="45" height="45">` HTML 속성으로,
 * 아이콘 이미지는 px 단위 `width`/`height` 속성으로 못 박는다 — 스타일을 버리는 클라이언트도 속성은 읽는다.
 * 레거시 푸터(public/modules/ModuleFooter.html)의 SNS 줄도 같은 마크업을 쓴다 — 여기를 바꾸면 거기도 맞출 것.
 */
const BASE = 'https://esang-newsletter.s3.ap-northeast-2.amazonaws.com/e-dm/newsletter/images/'

/** 원형 배경 한 변(px) */
export const SNS_CIRCLE_SIZE = 45

export interface SnsIconMeta {
  label: string
  img: string
  /** 원형 안에 그리는 아이콘 이미지 크기(px) — 원본 비율 그대로, 아이콘마다 다름 */
  w: number
  h: number
  alt: string
}

/**
 * 아이콘 키 → 표시 메타(라벨/이미지/크기)
 * 크기는 예전 %폭(홈 50%·페북 25%·X 40%·블로그/인스타/링크드인/쭈쭈쭈 45%·유튜브/카카오 50%·언어 80%)을
 * 45px 기준 px 로 환산하고, 높이는 이미지 원본 비율(홈 29×25, 페북 14×26, X 25×25, 블로그 28×26, 유튜브 27×19,
 * 인스타 24×24, 카카오 26×24, 링크드인 28×28, 쭈쭈쭈 27×27, 언어 50×50)로 맞춘 값 — 보이는 모양은 전과 같다.
 */
export const SNS_ICON_META: Record<string, SnsIconMeta> = {
  home: { label: '홈페이지', img: BASE + 'icon_home.png', w: 22, h: 19, alt: '홈페이지' },
  facebook: { label: '페이스북', img: BASE + 'icon_facebook.png', w: 11, h: 20, alt: '페이스북' },
  x: { label: 'X(트위터)', img: BASE + 'icon_X.png', w: 18, h: 18, alt: '트위터 X' },
  blog: { label: '블로그', img: BASE + 'icon_blog.png', w: 20, h: 19, alt: '블로그' },
  youtube: { label: '유튜브', img: BASE + 'icon_youtube.png', w: 22, h: 15, alt: '유튜브' },
  instagram: { label: '인스타그램', img: BASE + 'icon_instagram.png', w: 20, h: 20, alt: '인스타그램' },
  kakao: { label: '카카오톡', img: BASE + 'icon_kakao.png', w: 22, h: 20, alt: '카카오톡' },
  linkedin: { label: '링크드인', img: BASE + 'icon_linked.png', w: 20, h: 20, alt: '링크드인' },
  zuzuzu: { label: '쭈쭈쭈', img: BASE + 'icon_zuzuzu.png', w: 20, h: 20, alt: '쭈쭈쭈' },
  en: { label: '영어', img: BASE + 'icon_en.png', w: 36, h: 36, alt: '영어 뉴스레터' },
  jp: { label: '일본어', img: BASE + 'icon_jp.png', w: 36, h: 36, alt: '일본어 뉴스레터' },
  th: { label: '태국어', img: BASE + 'icon_th.png', w: 36, h: 36, alt: '태국어 뉴스레터' },
}

export interface SnsIconItem {
  key: string
  show: boolean
  url: string
}

/** 기본 노출: 홈·페북·X·블로그·유튜브·인스타·카카오 / 나머지(링크드인·쭈쭈쭈·영·일·태)는 기본 비활성 */
const DEFAULT_SHOWN = new Set(['home', 'facebook', 'x', 'blog', 'youtube', 'instagram', 'kakao'])
const DEFAULT_ORDER = [
  'home', 'facebook', 'x', 'blog', 'youtube', 'instagram', 'kakao',
  'linkedin', 'zuzuzu', 'en', 'jp', 'th',
]

/**
 * 기본 아이콘 배열(순서 포함). 새 인스턴스/렌더 폴백용 — 항상 새 복사본을 반환.
 * 쭈쭈쭈만 실제 주소를 갖고 나머지는 빈 값이다(입력 전 '#'이 채워져 보이지 않도록).
 */
export const defaultSnsIcons = (): SnsIconItem[] =>
  DEFAULT_ORDER.map((key) => ({
    key,
    show: DEFAULT_SHOWN.has(key),
    url: key === 'zuzuzu' ? 'https://kcoupet.com/' : '',
  }))

/**
 * 원형 배경 + 아이콘 하나의 HTML.
 * `<a>`(inline-block, 줄바꿈 흐름 담당) → `<table>`/`<td>`(45×45 를 HTML 속성으로 고정, 배경·원형) → `<img>`(px 크기).
 * border-collapse 는 separate 여야 td 의 border-radius 가 먹는다(문서 전역 style 이 collapse 로 두므로 인라인으로 덮는다).
 */
export const snsIconHtml = (href: string, img: string, alt: string, w: number, h: number, bgColor: string): string => {
  const S = SNS_CIRCLE_SIZE
  return (
    `<a href="${href || '#'}" target="_blank" style="text-decoration:none;display:inline-block;margin:5px 1%;">` +
    `<table border="0" cellpadding="0" cellspacing="0" width="${S}" height="${S}" style="width:${S}px;height:${S}px;border-collapse:separate;border-spacing:0;">` +
    `<tr><td width="${S}" height="${S}" align="center" valign="middle" style="width:${S}px;height:${S}px;line-height:0;background-color:${bgColor};border-radius:50%;">` +
    `<img src="${img}" alt="${alt}" width="${w}" height="${h}" style="display:block;width:${w}px;height:${h}px;border:0;margin:0 auto;">` +
    `</td></tr></table></a>`
  )
}

const iconAnchor = (item: SnsIconItem, bgColor: string): string => {
  const m = SNS_ICON_META[item.key]
  if (!m) return ''
  return snsIconHtml(item.url, m.img, m.alt, m.w, m.h, bgColor)
}

/** 표시 대상(show=true) 아이콘을 배열 순서대로 이어붙인 행 HTML */
export const buildSnsRowHtml = (icons: SnsIconItem[], bgColor: string): string =>
  (Array.isArray(icons) ? icons : [])
    .filter((i) => i?.show)
    .map((i) => iconAnchor(i, bgColor))
    .join('')
