import type { WrapSettings } from '@/types'

/**
 * "전체 스타일" 패널의 테두리 CSS 값을 계산한다.
 * borderEnabled 토글이 꺼져 있거나(신규) borderStyle이 'none'이면(구버전 저장값) 테두리를 그리지 않는다.
 */
export function resolveWrapBorderCss(
  wrap: Pick<WrapSettings, 'borderEnabled' | 'borderWidth' | 'borderStyle' | 'borderColor'>,
): string {
  const enabled = wrap.borderEnabled !== false && wrap.borderStyle !== 'none'
  if (!enabled) return 'none'
  return `${wrap.borderWidth} ${wrap.borderStyle} ${wrap.borderColor}`
}
