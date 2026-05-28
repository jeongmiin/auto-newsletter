/**
 * Quill 형광펜(반투명 마커) 커스텀 Blot
 * - 텍스트 하단 절반에만 색이 깔리는 형광펜 효과
 * - background: linear-gradient(transparent 50%, COLOR 50%) 인라인 스타일을 부여하여
 *   이메일 클라이언트 호환성을 유지 (출력 HTML에 인라인 스타일이 그대로 보존됨)
 */

import Quill from 'quill'

/** 형광펜 색상 팔레트 */
export const HIGHLIGHT_COLORS = [
  '#fff555',
  '#ffd1d1',
  '#c7f0c7',
  '#cce4ff',
  '#ffd9b3',
  '#e0c7ff',
]

type InlineBlotConstructor = {
  new (...args: unknown[]): {
    domNode: HTMLElement
    format(name: string, value: unknown): void
  }
  create(value: unknown): HTMLElement
}

let registered = false

/**
 * 형광펜 Blot을 Quill 전역 레지스트리에 등록한다.
 * Quill 인스턴스(또는 PrimeVue Editor) 생성 전에 1회 호출해야 한다.
 */
export const registerHighlightMarker = (): void => {
  if (registered) return
  const Inline = Quill.import('blots/inline') as InlineBlotConstructor

  class HighlightMarkerBlot extends Inline {
    static blotName = 'highlightMarker'
    static tagName = 'span'

    static create(value: string) {
      const node = super.create(value) as HTMLElement
      const color = value || HIGHLIGHT_COLORS[0]
      node.setAttribute(
        'style',
        `background: linear-gradient(transparent 50%, ${color} 50%);`,
      )
      node.dataset.highlightColor = color
      return node
    }

    static formats(node: HTMLElement): string | undefined {
      return node.dataset.highlightColor || undefined
    }

    format(name: string, value: unknown) {
      if (name === 'highlightMarker' && typeof value === 'string' && value) {
        const node = this.domNode
        node.setAttribute(
          'style',
          `background: linear-gradient(transparent 50%, ${value} 50%);`,
        )
        node.dataset.highlightColor = value
      } else {
        super.format(name, value)
      }
    }
  }

  Quill.register('formats/highlightMarker', HighlightMarkerBlot, true)
  registered = true
}
