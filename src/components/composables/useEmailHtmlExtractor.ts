// composables/useEmailHtmlExtractor.ts
import { nextTick, defineAsyncComponent, createVNode, h } from 'vue'
import { renderToString } from '@vue/server-renderer'

import type { Module, ModuleOneData, ModuleTwoData } from '@/components/types/modules'

interface HtmlExtractionResult {
  success: boolean
  html: string
  error?: string
}

// 각 모듈의 프리뷰 컴포넌트를 동적으로 가져오기 위한 맵
const modulePreviewComponents = {
  module1: defineAsyncComponent(() => import('@/components/newsletterModule/ModuleNum01.vue')),
  module2: defineAsyncComponent(() => import('@/components/newsletterModule/ModuleNum02.vue')),
  // 새로운 모듈이 추가되면 여기에 한 줄만 추가하면 됩니다.
  // module3: defineAsyncComponent(() => import('@/components/newsletterModule/ModuleNum03.vue')),
}

export const useEmailHtmlExtractor = () => {
  // 모듈 타입에 따른 HTML 생성
  const generateModuleHtml = async (module: Module): Promise<string> => {
    const componentLoader =
      modulePreviewComponents[module.type as keyof typeof modulePreviewComponents]
    if (!componentLoader) {
      console.warn(`Unknown module type or component not registered: ${module.type}`)
      return `<!-- Unknown module type: ${module.type} -->`
    }
  }

  // RGB를 Hex로 변환하는 함수
  const normalizeColorsToHex = (html: string): string => {
    html = html.replace(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g, (match, r, g, b) => {
      const toHex = (n: string) => parseInt(n).toString(16).padStart(2, '0')
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`
    })

    html = html.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/g, (match, r, g, b) => {
      const toHex = (n: string) => parseInt(n).toString(16).padStart(2, '0')
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`
    })

    return html
  }

  // 전체 이메일 HTML 생성 (템플릿 기반 - 수정됨)
  const generateCompleteEmailHtmlFromTemplate = async (
    modules: Module[],
  ): Promise<HtmlExtractionResult> => {
    try {
      await nextTick()

      // 데이터 유효성 검사 함수
      const hasContent = (data: any): boolean => {
        if (!data) return false
        // ModuleOneData 체크
        const isModuleOne =
          data.title?.trim() ||
          data.subtitle?.trim() ||
          (data.items && data.items.some((item: any) => item.redtitle?.trim() || item.desc?.trim()))
        // ModuleTwoData 체크
        const isModuleTwo =
          data.title?.trim() ||
          data.mainTitle?.trim() ||
          data.imageUrl?.trim() ||
          data.description?.trim()

        // 다른 모듈 타입에 대한 유효성 검사 추가 가능
        return isModuleOne || isModuleTwo
      }

      // 중복 제거 및 유효성 검사를 통과한 모듈만 필터링
      const validModules = modules
        .filter((module, index, self) => {
          // 중복 제거: instanceId로 고유성 확인
          const isUnique = index === self.findIndex((m) => m.instanceId === module.instanceId)
          return isUnique && hasContent(module.data)
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0))

      const moduleHtmlPromises = validModules.map((module, index) =>
        generateModuleHtml(module).then(
          (html) => `<!-- Module ${index + 1}: ${module.type} (${module.instanceId}) -->\n${html}`,
        ),
      )

      const moduleHtmls = await Promise.all(moduleHtmlPromises)

      // 완전한 이메일 HTML 구조 생성
      const completeHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: Arial, sans-serif;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 0;">
${moduleHtmls.join('\n')}
      </td>
    </tr>
  </table>
</body>
</html>`

      // RGB를 HEX로 변환
      const hexNormalizedHtml = normalizeColorsToHex(completeHtml)

      return {
        success: true,
        html: hexNormalizedHtml,
      }
    } catch (error) {
      return {
        success: false,
        html: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // 기존 DOM 기반 생성 (백업용)
  const generateCompleteEmailHtml = async (
    previewContainer: HTMLElement,
    modules: Module[],
  ): Promise<HtmlExtractionResult> => {
    try {
      await nextTick()

      const moduleHtmls: string[] = []
      const moduleRows = previewContainer.querySelectorAll('tbody > tr')

      moduleRows.forEach((row, index) => {
        const td = row.querySelector('td')
        if (td) {
          const tables = td.querySelectorAll('table')
          let moduleHtml = ''

          tables.forEach((table) => {
            moduleHtml += table.outerHTML + '\n'
          })

          if (moduleHtml.trim()) {
            moduleHtmls.push(
              `    <!-- Module ${index + 1}: ${modules[index]?.type || 'Unknown'} -->`,
            )
            moduleHtmls.push(moduleHtml.trim())
          }
        }
      })

      const completeHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: Arial, sans-serif;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 0;">
${moduleHtmls.join('\n')}
      </td>
    </tr>
  </table>
</body>
</html>`

      const hexNormalizedHtml = normalizeColorsToHex(completeHtml)

      return {
        success: true,
        html: hexNormalizedHtml,
      }
    } catch (error) {
      return {
        success: false,
        html: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // HTML을 클립보드에 복사
  const copyToClipboard = async (html: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(html)
      return true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)

      try {
        const textarea = document.createElement('textarea')
        textarea.value = html
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        return true
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError)
        return false
      }
    }
  }

  // HTML 파일로 다운로드
  const downloadHtml = (html: string, filename?: string) => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download =
      filename || `newsletter-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // HTML 미리보기 창 열기
  const previewInNewWindow = (html: string) => {
    const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes')
    if (newWindow) {
      newWindow.document.write(html)
      newWindow.document.close()
    }
  }

  return {
    generateCompleteEmailHtmlFromTemplate,
    copyToClipboard,
    downloadHtml,
    previewInNewWindow,
  }
}

// 기존 useModuleHtmlManager는 삭제 (사용하지 않음)

// utils/emailHtmlValidator.ts
export interface ValidationError {
  type: 'error' | 'warning'
  message: string
  moduleType?: string
  suggestion?: string
}

export const validateEmailHtml = (html: string): ValidationError[] => {
  const errors: ValidationError[] = []

  if (!html.includes('<!DOCTYPE html>')) {
    errors.push({
      type: 'warning',
      message: 'DOCTYPE 선언이 없습니다.',
      suggestion: '이메일 클라이언트 호환성을 위해 DOCTYPE을 추가하세요.',
    })
  }

  const tableMatches = html.match(/<table[^>]*>/g)
  const tableCloseMatches = html.match(/<\/table>/g)

  if (tableMatches && tableCloseMatches && tableMatches.length !== tableCloseMatches.length) {
    errors.push({
      type: 'error',
      message: '테이블 태그가 올바르게 닫히지 않았습니다.',
      suggestion: '모든 <table> 태그에 대응하는 </table> 태그를 확인하세요.',
    })
  }

  if (html.includes('class=') && !html.includes('style=')) {
    errors.push({
      type: 'warning',
      message: 'CSS 클래스가 발견되었습니다.',
      suggestion: '이메일에서는 인라인 스타일을 사용하는 것이 좋습니다.',
    })
  }

  const imgMatches = html.match(/<img[^>]*>/g)
  if (imgMatches) {
    imgMatches.forEach((img) => {
      if (!img.includes('alt=')) {
        errors.push({
          type: 'warning',
          message: '이미지에 alt 속성이 없습니다.',
          suggestion: '접근성을 위해 모든 이미지에 alt 속성을 추가하세요.',
        })
      }
    })
  }

  if (!html.includes('font-family')) {
    errors.push({
      type: 'warning',
      message: '폰트 패밀리가 지정되지 않았습니다.',
      suggestion: '이메일 클라이언트 호환성을 위해 폰트를 지정하세요.',
    })
  }

  return errors
}

// utils/emailClientTester.ts
export interface EmailClientTest {
  client: string
  version?: string
  issues: string[]
  recommendations: string[]
}

export const testEmailClientCompatibility = (html: string): EmailClientTest[] => {
  const tests: EmailClientTest[] = []

  const outlookIssues: string[] = []
  const outlookRecommendations: string[] = []

  if (html.includes('border-radius')) {
    outlookIssues.push('border-radius 속성이 지원되지 않을 수 있습니다.')
    outlookRecommendations.push('VML을 사용하거나 이미지로 대체하세요.')
  }

  if (html.includes('flexbox') || html.includes('display: flex')) {
    outlookIssues.push('Flexbox가 지원되지 않습니다.')
    outlookRecommendations.push('테이블 레이아웃을 사용하세요.')
  }

  tests.push({
    client: 'Microsoft Outlook',
    version: '2016+',
    issues: outlookIssues,
    recommendations: outlookRecommendations,
  })

  const gmailIssues: string[] = []
  const gmailRecommendations: string[] = []

  if (html.includes('<style>') && !html.includes('@media')) {
    gmailRecommendations.push('반응형 디자인을 위해 미디어 쿼리를 고려하세요.')
  }

  tests.push({
    client: 'Gmail',
    issues: gmailIssues,
    recommendations: gmailRecommendations,
  })

  return tests
}
