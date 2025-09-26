import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ModuleInstance, ModuleMetadata } from '@/types'

export const useModuleStore = defineStore('module', () => {
  const modules = ref<ModuleInstance[]>([])
  const selectedModuleId = ref<string | null>(null)
  const availableModules = ref<ModuleMetadata[]>([])

  const selectedModule = computed(
    () => modules.value.find((m) => m.id === selectedModuleId.value) || null,
  )

  const selectedModuleMetadata = computed(() => {
    if (!selectedModule.value) return null
    return availableModules.value.find((m) => m.id === selectedModule.value!.moduleId) || null
  })

  // 사용 가능한 모듈 메타데이터 로드
  const loadAvailableModules = async (): Promise<ModuleMetadata[]> => {
    try {
      // 실제로는 API에서 가져오거나 설정 파일에서 로드
      const moduleConfigs: ModuleMetadata[] = [
        {
          id: 'SectionTitle',
          name: '섹션 타이틀',
          description: '제목과 부제목이 있는 헤더',
          category: 'header',
          icon: '📋',
          htmlFile: 'SectionTitle.html',
          editableProps: [
            {
              key: 'mainTitle',
              label: '메인 타이틀',
              type: 'text',
              placeholder: '모듈 섹션 타이틀 영역',
              required: true,
            },
            {
              key: 'subTitle',
              label: '서브 타이틀',
              type: 'text',
              placeholder: '서브 타이틀 영역',
            },
          ],
        },
        {
          id: 'Module02',
          name: '모듈 02',
          description: '이미지와 텍스트, 버튼이 포함된 모듈',
          category: 'image',
          icon: '🖼️',
          htmlFile: 'Module02.html',
          editableProps: [
            {
              key: 'title',
              label: '제목',
              type: 'text',
              required: true,
              placeholder: '제목을 입력하세요',
            },
            { key: 'imageUrl', label: '이미지 URL', type: 'url', placeholder: 'https://...' },
            { key: 'imageAlt', label: '이미지 설명', type: 'text', placeholder: '이미지 설명' },
            {
              key: 'description',
              label: '설명',
              type: 'textarea',
              placeholder: '설명을 입력하세요',
            },
            { key: 'buttonText', label: '버튼 텍스트', type: 'text', placeholder: '버튼 텍스트' },
            { key: 'buttonUrl', label: '버튼 링크', type: 'url', placeholder: 'https://...' },
          ],
        },
        {
          id: 'Module04',
          name: '모듈 04',
          description: '이미지와 텍스트가 있는 2단 구성 모듈',
          category: 'image',
          icon: '📄',
          htmlFile: 'Module04.html',
          editableProps: [
            {
              key: 'leftTitle',
              label: '왼쪽 타이틀',
              type: 'text',
              placeholder: '콘텐츠 타이틀',
              required: true,
            },
            {
              key: 'leftContent',
              label: '왼쪽 텍스트',
              type: 'textarea',
              placeholder: '콘텐츠 텍스트',
            },
            {
              key: 'leftSmallBtnText',
              label: '왼쪽 작은 버튼',
              type: 'text',
              placeholder: '작은 버튼 →',
            },
            { key: 'leftSmallBtnUrl', label: '왼쪽 작은 버튼 링크', type: 'url', placeholder: '#' },
            {
              key: 'leftBigBtnText',
              label: '왼쪽 큰 버튼',
              type: 'text',
              placeholder: '큰 버튼 →',
            },
            { key: 'leftBigBtnUrl', label: '왼쪽 큰 버튼 링크', type: 'url', placeholder: '#' },
            {
              key: 'leftImageUrl',
              label: '왼쪽 이미지 URL',
              type: 'url',
              placeholder: 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png',
            },
            {
              key: 'rightTitle',
              label: '오른쪽 타이틀',
              type: 'text',
              placeholder: '콘텐츠 타이틀',
            },
            {
              key: 'rightContent',
              label: '오른쪽 텍스트',
              type: 'textarea',
              placeholder: '콘텐츠 텍스트',
            },
            {
              key: 'rightSmallBtnText',
              label: '오른쪽 작은 버튼',
              type: 'text',
              placeholder: '작은 버튼 →',
            },
            {
              key: 'rightSmallBtnUrl',
              label: '오른쪽 작은 버튼 링크',
              type: 'url',
              placeholder: '#',
            },
            {
              key: 'rightBigBtnText',
              label: '오른쪽 큰 버튼',
              type: 'text',
              placeholder: '큰 버튼 →',
            },
            { key: 'rightBigBtnUrl', label: '오른쪽 큰 버튼 링크', type: 'url', placeholder: '#' },
            {
              key: 'rightImageUrl',
              label: '오른쪽 이미지 URL',
              type: 'url',
              placeholder: 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png',
            },
          ],
        },
        {
          id: 'Module05',
          name: '모듈 05',
          description: 'CTA 버튼',
          category: 'button',
          icon: '🔘',
          htmlFile: 'Module05.html',
          editableProps: [
            {
              key: 'buttonText',
              label: '버튼 텍스트',
              type: 'text',
              required: true,
              placeholder: '버튼 텍스트',
            },
            {
              key: 'buttonUrl',
              label: '버튼 링크',
              type: 'url',
              required: true,
              placeholder: 'https://...',
            },
            { key: 'buttonColor', label: '버튼 색상', type: 'color' },
          ],
        },
      ]

      availableModules.value = moduleConfigs
      return moduleConfigs
    } catch (error) {
      console.error('모듈 메타데이터 로드 실패:', error)
      return []
    }
  }

  // 모듈 추가
  const addModule = (moduleMetadata: ModuleMetadata) => {
    const newModule: ModuleInstance = {
      id: generateId(),
      moduleId: moduleMetadata.id,
      order: modules.value.length,
      properties: getDefaultProperties(moduleMetadata),
      styles: moduleMetadata.defaultStyles || {},
    }

    modules.value.push(newModule)
    selectedModuleId.value = newModule.id
  }

  // 모듈 선택
  const selectModule = (moduleId: string) => {
    selectedModuleId.value = moduleId
  }

  // 모듈 속성 업데이트
  const updateModuleProperty = (propertyKey: string, value: unknown) => {
    if (!selectedModule.value) return
    selectedModule.value.properties[propertyKey] = value
  }

  // 모듈 스타일 업데이트
  const updateModuleStyle = (styleKey: string, value: unknown) => {
    if (!selectedModule.value) return
    ;(selectedModule.value.styles as Record<string, unknown>)[styleKey] = value
  }

  // 모듈 제거
  const removeModule = (moduleId: string) => {
    const index = modules.value.findIndex((m) => m.id === moduleId)
    if (index !== -1) {
      modules.value.splice(index, 1)
      if (selectedModuleId.value === moduleId) {
        selectedModuleId.value = null
      }
      // 순서 재정렬
      modules.value.forEach((module, idx) => {
        module.order = idx
      })
    }
  }

  // 모듈 순서 변경
  const moveModuleUp = (moduleId: string) => {
    const index = modules.value.findIndex((m) => m.id === moduleId)
    if (index > 0) {
      ;[modules.value[index], modules.value[index - 1]] = [
        modules.value[index - 1],
        modules.value[index],
      ]
      // 순서 업데이트
      modules.value.forEach((module, idx) => {
        module.order = idx
      })
    }
  }

  const moveModuleDown = (moduleId: string) => {
    const index = modules.value.findIndex((m) => m.id === moduleId)
    if (index < modules.value.length - 1) {
      ;[modules.value[index], modules.value[index + 1]] = [
        modules.value[index + 1],
        modules.value[index],
      ]
      // 순서 업데이트
      modules.value.forEach((module, idx) => {
        module.order = idx
      })
    }
  }

  // 모듈 복제
  const duplicateModule = (moduleId: string) => {
    const originalModule = modules.value.find((m) => m.id === moduleId)
    if (!originalModule) return

    const duplicatedModule: ModuleInstance = {
      ...originalModule,
      id: generateId(),
      order: originalModule.order + 1,
      properties: { ...originalModule.properties },
      styles: { ...originalModule.styles },
    }

    // 원본 모듈 뒤에 삽입
    const insertIndex = modules.value.findIndex((m) => m.id === moduleId) + 1
    modules.value.splice(insertIndex, 0, duplicatedModule)

    // 순서 재정렬
    modules.value.forEach((module, idx) => {
      module.order = idx
    })

    selectedModuleId.value = duplicatedModule.id
  }

  // 전체 삭제
  const clearAll = () => {
    modules.value = []
    selectedModuleId.value = null
  }

  // 모듈별 특화된 콘텐츠 교체 함수 (ModuleRenderer와 동일)
  const replaceModuleContent = (html: string, module: ModuleInstance): string => {
    const { moduleId, properties } = module

    switch (moduleId) {
      case 'SectionTitle':
        return html
          .replace(
            /모듈 섹션 타이틀 영역/g,
            String(properties.mainTitle || '모듈 섹션 타이틀 영역'),
          )
          .replace(/서브 타이틀 영역/g, String(properties.subTitle || '서브 타이틀 영역'))

      case 'Module04':
        let modifiedHtml = html

        // 첫 번째와 두 번째 콘텐츠 타이틀을 각각 교체
        let titleIndex = 0
        modifiedHtml = modifiedHtml.replace(/콘텐츠 타이틀/g, () => {
          const replacement =
            titleIndex === 0
              ? String(properties.leftTitle || '콘텐츠 타이틀')
              : String(properties.rightTitle || '콘텐츠 타이틀')
          titleIndex++
          return replacement
        })

        // 첫 번째와 두 번째 콘텐츠 텍스트를 각각 교체
        let contentIndex = 0
        modifiedHtml = modifiedHtml.replace(/콘텐츠 텍스트/g, () => {
          const replacement =
            contentIndex === 0
              ? String(properties.leftContent || '콘텐츠 텍스트')
              : String(properties.rightContent || '콘텐츠 텍스트')
          contentIndex++
          return replacement
        })

        // 작은 버튼 텍스트 교체
        let smallBtnIndex = 0
        modifiedHtml = modifiedHtml.replace(/작은 버튼 →/g, () => {
          const replacement =
            smallBtnIndex === 0
              ? String(properties.leftSmallBtnText || '작은 버튼 →')
              : String(properties.rightSmallBtnText || '작은 버튼 →')
          smallBtnIndex++
          return replacement
        })

        // 큰 버튼 텍스트 교체
        let bigBtnIndex = 0
        modifiedHtml = modifiedHtml.replace(/큰 버튼 →/g, () => {
          const replacement =
            bigBtnIndex === 0
              ? String(properties.leftBigBtnText || '큰 버튼 →')
              : String(properties.rightBigBtnText || '큰 버튼 →')
          bigBtnIndex++
          return replacement
        })

        // href 링크 교체 (순서: 작은버튼1, 큰버튼1, 작은버튼2, 큰버튼2)
        let hrefIndex = 0
        modifiedHtml = modifiedHtml.replace(/href="#"/g, () => {
          let replacement = 'href="#"'
          switch (hrefIndex) {
            case 0:
              replacement = `href="${properties.leftSmallBtnUrl || '#'}"`
              break
            case 1:
              replacement = `href="${properties.leftBigBtnUrl || '#'}"`
              break
            case 2:
              replacement = `href="${properties.rightSmallBtnUrl || '#'}"`
              break
            case 3:
              replacement = `href="${properties.rightBigBtnUrl || '#'}"`
              break
          }
          hrefIndex++
          return replacement
        })

        // 이미지 URL 교체
        let imgIndex = 0
        modifiedHtml = modifiedHtml.replace(
          /src="https:\/\/design\.messeesang\.com\/e-dm\/newsletter\/images\/img-2column\.png"/g,
          () => {
            const replacement =
              imgIndex === 0
                ? `src="${properties.leftImageUrl || 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png'}"`
                : `src="${properties.rightImageUrl || 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png'}"`
            imgIndex++
            return replacement
          },
        )

        return modifiedHtml

      case 'Module02':
        // Module02의 경우 추후 HTML 파일 내용에 따라 구현
        return html

      case 'Module05':
        // Module05의 경우 추후 HTML 파일 내용에 따라 구현
        return html

      default:
        // 기본적으로 {{key}} 형태의 플레이스홀더 교체
        Object.entries(properties).forEach(([key, value]) => {
          const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
          html = html.replace(placeholder, String(value))
        })
        return html
    }
  }

  // HTML 생성
  const generateHtml = async (): Promise<string> => {
    let fullHtml = ''

    for (const module of modules.value.sort((a, b) => a.order - b.order)) {
      try {
        const response = await fetch(`/modules/${module.moduleId}.html`)
        let html = await response.text()

        // 모듈별 특화된 텍스트 교체 (ModuleRenderer와 동일한 로직)
        html = replaceModuleContent(html, module)

        // 스타일 적용
        if (module.styles && Object.keys(module.styles).length > 0) {
          const styles = Object.entries(module.styles)
            .filter(([, value]) => Boolean(value))
            .map(([key, value]) => {
              const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
              return `${cssKey}: ${value}`
            })
            .join('; ')

          if (styles) {
            // 첫 번째 table이나 div에 스타일 적용
            html = html.replace(/(<(?:table|div)[^>]*?)>/i, `$1 style="${styles}">`)
          }
        }

        fullHtml += html + '\n'
      } catch (error) {
        console.error(`모듈 ${module.moduleId} HTML 생성 실패:`, error)
      }
    }

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Email</title>
    <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        .email-container { max-width: 680px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="email-container">
        ${fullHtml}
    </div>
</body>
</html>`
  }

  // 헬퍼 함수들
  const generateId = () => 'module_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)

  const getDefaultProperties = (moduleMetadata: ModuleMetadata): Record<string, unknown> => {
    const props: Record<string, unknown> = {}
    moduleMetadata.editableProps.forEach((prop) => {
      switch (prop.type) {
        case 'boolean':
          props[prop.key] = false
          break
        case 'color':
          props[prop.key] = '#000000'
          break
        case 'number':
          props[prop.key] = 0
          break
        default:
          props[prop.key] = prop.placeholder || ''
      }
    })
    return props
  }

  return {
    modules,
    selectedModuleId,
    selectedModule,
    selectedModuleMetadata,
    availableModules,
    loadAvailableModules,
    addModule,
    selectModule,
    updateModuleProperty,
    updateModuleStyle,
    removeModule,
    moveModuleUp,
    moveModuleDown,
    duplicateModule,
    clearAll,
    generateHtml,
  }
})
