/**
 * SNS 아이콘(ModuleSnsIcons) 공유 상수 — 렌더 프로세서와 속성 패널 UI가 함께 사용.
 * 아이콘은 순서 있는 배열(SnsIconItem[])로 저장되어 '순서 변경'이 가능하다.
 */
const BASE = 'https://esang-newsletter.s3.ap-northeast-2.amazonaws.com/e-dm/newsletter/images/'

export interface SnsIconMeta {
  label: string
  img: string
  /** 원형 배경 안 아이콘 이미지 폭(%) — 아이콘마다 다름 */
  width: string
  alt: string
}

/** 아이콘 키 → 표시 메타(라벨/이미지/폭) */
export const SNS_ICON_META: Record<string, SnsIconMeta> = {
  home: { label: '홈페이지', img: BASE + 'icon_home.png', width: '50%', alt: '홈페이지' },
  facebook: { label: '페이스북', img: BASE + 'icon_facebook.png', width: '25%', alt: '페이스북' },
  x: { label: 'X(트위터)', img: BASE + 'icon_X.png', width: '40%', alt: '트위터 X' },
  blog: { label: '블로그', img: BASE + 'icon_blog.png', width: '45%', alt: '블로그' },
  youtube: { label: '유튜브', img: BASE + 'icon_youtube.png', width: '50%', alt: '유튜브' },
  instagram: { label: '인스타그램', img: BASE + 'icon_instagram.png', width: '45%', alt: '인스타그램' },
  kakao: { label: '카카오톡', img: BASE + 'icon_kakao.png', width: '50%', alt: '카카오톡' },
  linkedin: { label: '링크드인', img: BASE + 'icon_linked.png', width: '45%', alt: '링크드인' },
  zuzuzu: { label: '쭈쭈쭈', img: BASE + 'icon_zuzuzu.png', width: '45%', alt: '쭈쭈쭈' },
  en: { label: '영어', img: BASE + 'icon_en.png', width: '80%', alt: '영어 뉴스레터' },
  jp: { label: '일본어', img: BASE + 'icon_jp.png', width: '80%', alt: '일본어 뉴스레터' },
  th: { label: '태국어', img: BASE + 'icon_th.png', width: '80%', alt: '태국어 뉴스레터' },
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

/** 기본 아이콘 배열(순서 포함). 새 인스턴스/렌더 폴백용 — 항상 새 복사본을 반환 */
export const defaultSnsIcons = (): SnsIconItem[] =>
  DEFAULT_ORDER.map((key) => ({
    key,
    show: DEFAULT_SHOWN.has(key),
    url: key === 'zuzuzu' ? 'https://kcoupet.com/' : '#',
  }))

/** 원형 배경 + 아이콘 하나의 앵커 HTML */
const iconAnchor = (item: SnsIconItem, bgColor: string): string => {
  const m = SNS_ICON_META[item.key]
  if (!m) return ''
  return (
    `<a href="${item.url || '#'}" target="_blank" style="text-decoration:none;display:inline-block;margin:5px 1%;` +
    `width:45px;height:45px;line-height:40px;background-color:${bgColor};border-radius:50%;box-sizing:border-box;">` +
    `<img src="${m.img}" alt="${m.alt}" style="display:block;width:${m.width};height:45px;object-fit:contain;margin:0 auto;"></a>`
  )
}

/** 표시 대상(show=true) 아이콘을 배열 순서대로 이어붙인 행 HTML */
export const buildSnsRowHtml = (icons: SnsIconItem[], bgColor: string): string =>
  (Array.isArray(icons) ? icons : [])
    .filter((i) => i && i.show)
    .map((i) => iconAnchor(i, bgColor))
    .join('')
