import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ModuleInstance, ModuleMetadata, TableRow, ContentTitle, ContentText, AdditionalContent } from '@/types'
import { formatTextWithBreaks, isEmptyValue, shouldRenderElement, safeFormatText } from '@/utils/textUtils'

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
      const response = await fetch('/modules/modules-config.json')
      if (!response.ok) {
        throw new Error(
          `모듈 설정 파일을 불러올 수 없습니다: ${response.status} ${response.statusText}`,
        )
      }

      const data = await response.json()

      // JSON 스키마 검증
      if (!data || !Array.isArray(data.modules)) {
        throw new Error('모듈 설정 파일 형식이 올바르지 않습니다')
      }

      // 모듈 데이터 유효성 검증
      const validatedModules = data.modules.filter((module: ModuleMetadata) => {
        return (
          module &&
          typeof module.id === 'string' &&
          typeof module.name === 'string' &&
          Array.isArray(module.editableProps)
        )
      })

      if (validatedModules.length !== data.modules.length) {
        console.warn('일부 모듈이 유효하지 않아 제외되었습니다')
      }

      availableModules.value = validatedModules
      return validatedModules
    } catch (error) {
      console.error('모듈 메타데이터 로드 실패:', error)

      // 사용자에게 에러 알림 (선택사항 - 실제 프로젝트에서는 toast나 alert 사용)
      if (typeof window !== 'undefined') {
        console.warn('모듈 설정을 불러올 수 없습니다. 기본 모듈을 사용합니다.')
      }

      // 빈 배열 반환으로 앱이 계속 동작하도록 함
      availableModules.value = []
      return []
    }
  }

  // 버튼 스타일 적용 함수
  const applyButtonStyles = (html: string, properties: Record<string, unknown>): string => {
    let styledHtml = html

    // 작은 버튼 스타일 적용
    let smallBtnStyleIndex = 0
    styledHtml = styledHtml.replace(
      /<a href="[^"]*" target="_blank"\s*style="[^"]*display:\s*inline-block[^"]*background-color:#e5e5e5[^"]*"/g,
      (match) => {
        const isLeft = smallBtnStyleIndex === 0
        const bgColor = isLeft ? properties.leftSmallBtnBgColor : properties.rightSmallBtnBgColor
        const textColor = isLeft
          ? properties.leftSmallBtnTextColor
          : properties.rightSmallBtnTextColor

        let newMatch = match
        if (bgColor) {
          newMatch = newMatch.replace(/background-color:#e5e5e5/, `background-color:${bgColor}`)
          newMatch = newMatch.replace(/bgcolor:\s*#e5e5e5/, `bgcolor: ${bgColor}`)
        }
        if (textColor) {
          newMatch = newMatch.replace(/color:#333333/, `color:${textColor}`)
        }

        smallBtnStyleIndex++
        return newMatch
      },
    )

    // 큰 버튼 스타일 적용
    let bigBtnStyleIndex = 0
    styledHtml = styledHtml.replace(
      /<a href="[^"]*"\s*style="[^"]*background-color:#111111[^"]*"/g,
      (match) => {
        const isLeft = bigBtnStyleIndex === 0
        const bgColor = isLeft ? properties.leftBigBtnBgColor : properties.rightBigBtnBgColor
        const textColor = isLeft ? properties.leftBigBtnTextColor : properties.rightBigBtnTextColor

        let newMatch = match
        if (bgColor) {
          newMatch = newMatch.replace(/background-color:#111111/, `background-color:${bgColor}`)
          newMatch = newMatch.replace(/bgcolor:\s*#111111/, `bgcolor: ${bgColor}`)
        }
        if (textColor) {
          newMatch = newMatch.replace(/color:#ffffff/, `color:${textColor}`)
        }

        bigBtnStyleIndex++
        return newMatch
      },
    )

    return styledHtml
  }

  // 버튼 표시/숨김 처리 함수 - 완전 제거 방식
  const handleButtonVisibility = (html: string, properties: Record<string, unknown>): string => {
    let visibilityHtml = html

    // 작은 버튼들의 span 태그를 완전히 제거
    let spanIndex = 0
    visibilityHtml = visibilityHtml.replace(
      /<span align="left" style="display: block; padding:15px 0px; box-sizing: border-box;">[\s\S]*?<\/span>/g,
      (match) => {
        const isLeft = spanIndex === 0
        const shouldShow = isLeft
          ? properties.showLeftSmallBtn === true
          : properties.showRightSmallBtn === true
        spanIndex++

        if (!shouldShow) {
          return '' // 완전히 제거
        }
        return match
      },
    )

    // 큰 버튼들을 완전히 제거
    let bigBtnIndex = 0
    visibilityHtml = visibilityHtml.replace(
      /<a href="[^"]*"\s*style="([^"]*)"\s*[^>]*target="_blank">큰 버튼[\s\S]*?<\/a>/g,
      (match) => {
        const isLeft = bigBtnIndex === 0
        const shouldShow = isLeft
          ? properties.showLeftBigBtn === true
          : properties.showRightBigBtn === true
        bigBtnIndex++

        if (!shouldShow) {
          return '' // 완전히 제거
        }
        return match
      },
    )

    return visibilityHtml
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

  // Module05 버튼 표시/숨김 처리 함수 (HTML 복사용)
  const handleModule05ButtonVisibilityForCopy = (html: string, properties: Record<string, unknown>): string => {
    let visibilityHtml = html

    // 작은 버튼들 처리 (위쪽)
    if (properties.showTopSmallBtn !== true) {
      visibilityHtml = visibilityHtml.replace(
        /<span align="left" style="display: block; padding:15px 0px; box-sizing: border-box;">\s*<a href="[^"]*" target="_blank"[^>]*>[^<]*작은 버튼[^<]*<\/a>\s*<\/span>/,
        ''
      )
    }

    // 작은 버튼들 처리 (아래쪽)
    if (properties.showBottomSmallBtn !== true) {
      const spans = visibilityHtml.match(/<span align="left" style="display: block; padding:15px 0px; box-sizing: border-box;">\s*<a href="[^"]*" target="_blank"[^>]*>[^<]*작은 버튼[^<]*<\/a>\s*<\/span>/g)
      if (spans && spans.length > 1) {
        let spanCount = 0
        visibilityHtml = visibilityHtml.replace(
          /<span align="left" style="display: block; padding:15px 0px; box-sizing: border-box;">\s*<a href="[^"]*" target="_blank"[^>]*>[^<]*작은 버튼[^<]*<\/a>\s*<\/span>/g,
          (match) => {
            spanCount++
            return spanCount === 2 ? '' : match
          }
        )
      }
    }

    // 큰 버튼 처리
    if (properties.showBigBtn !== true) {
      visibilityHtml = visibilityHtml.replace(
        /<tr>\s*<td align="center" style="padding:20px; box-sizing: border-box;">\s*<a href="[^"]*"[^>]*>[^<]*큰 버튼[^<]*<\/a>\s*<\/td>\s*<\/tr>/,
        ''
      )
    }

    return visibilityHtml
  }

  // Module05 버튼 스타일 적용 함수 (HTML 복사용)
  const applyModule05ButtonStylesForCopy = (html: string, properties: Record<string, unknown>): string => {
    let styledHtml = html

    // 작은 버튼 스타일 적용
    if (properties.smallBtnBgColor || properties.smallBtnTextColor) {
      styledHtml = styledHtml.replace(
        /<a href="[^"]*" target="_blank"\s*style="([^"]*)"/g,
        (match, existingStyle) => {
          let newStyle = existingStyle
          if (properties.smallBtnBgColor) {
            newStyle = newStyle.replace(/background-color:#e5e5e5/, `background-color:${properties.smallBtnBgColor}`)
            newStyle = newStyle.replace(/bgcolor: #e5e5e5/, `bgcolor: ${properties.smallBtnBgColor}`)
          }
          if (properties.smallBtnTextColor) {
            newStyle = newStyle.replace(/color:#333333/, `color:${properties.smallBtnTextColor}`)
          }
          return match.replace(existingStyle, newStyle)
        }
      )
    }

    // 큰 버튼 스타일 적용
    if (properties.bigBtnBgColor || properties.bigBtnTextColor) {
      styledHtml = styledHtml.replace(
        /<a href="[^"]*"\s*style="([^"]*)"/g,
        (match, existingStyle) => {
          if (existingStyle.includes('background-color:#111111')) {
            let newStyle = existingStyle
            if (properties.bigBtnBgColor) {
              newStyle = newStyle.replace(/background-color:#111111/, `background-color:${properties.bigBtnBgColor}`)
              newStyle = newStyle.replace(/bgcolor: #111111/, `bgcolor: ${properties.bigBtnBgColor}`)
            }
            if (properties.bigBtnTextColor) {
              newStyle = newStyle.replace(/color:#ffffff/, `color:${properties.bigBtnTextColor}`)
            }
            return match.replace(existingStyle, newStyle)
          }
          return match
        }
      )
    }

    return styledHtml
  }

  // 동적 테이블 행 관리 함수들
  const addTableRow = (moduleId: string, header: string = '', data: string = '') => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    if (!module.properties.tableRows) {
      module.properties.tableRows = []
    }

    const newRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      header: header,
      data: data,
    }

    ;(module.properties.tableRows as TableRow[]).push(newRow)
  }

  const updateTableRow = (
    moduleId: string,
    rowId: string,
    field: 'header' | 'data',
    value: string,
  ) => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties.tableRows) return

    const row = (module.properties.tableRows as TableRow[]).find((r: TableRow) => r.id === rowId)
    if (row) {
      row[field] = value
    }
  }

  const removeTableRow = (moduleId: string, rowId: string) => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties.tableRows) return

    const index = (module.properties.tableRows as TableRow[]).findIndex((r: TableRow) => r.id === rowId)
    if (index !== -1) {
      ;(module.properties.tableRows as TableRow[]).splice(index, 1)
    }
  }

  // 동적 콘텐츠 타이틀 관리 함수들
  const addContentTitle = (moduleId: string, text: string = '') => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    if (!module.properties.contentTitles) {
      module.properties.contentTitles = []
    }

    const newTitle = {
      id: `title-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: text
    }

    ;(module.properties.contentTitles as ContentTitle[]).push(newTitle)
  }

  const updateContentTitle = (moduleId: string, titleId: string, text: string) => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties.contentTitles) return

    const title = (module.properties.contentTitles as ContentTitle[]).find((t: ContentTitle) => t.id === titleId)
    if (title) {
      title.text = text
    }
  }

  const removeContentTitle = (moduleId: string, titleId: string) => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties.contentTitles) return

    const index = (module.properties.contentTitles as ContentTitle[]).findIndex((t: ContentTitle) => t.id === titleId)
    if (index !== -1) {
      ;(module.properties.contentTitles as ContentTitle[]).splice(index, 1)
    }
  }

  // 동적 콘텐츠 텍스트 관리 함수들
  const addContentText = (moduleId: string, content: string = '') => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    if (!module.properties.contentTexts) {
      module.properties.contentTexts = []
    }

    const newText = {
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: content
    }

    ;(module.properties.contentTexts as ContentText[]).push(newText)
  }

  const updateContentText = (moduleId: string, textId: string, content: string) => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties.contentTexts) return

    const text = (module.properties.contentTexts as ContentText[]).find((t: ContentText) => t.id === textId)
    if (text) {
      text.content = content
    }
  }

  const removeContentText = (moduleId: string, textId: string) => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties.contentTexts) return

    const index = (module.properties.contentTexts as ContentText[]).findIndex((t: ContentText) => t.id === textId)
    if (index !== -1) {
      ;(module.properties.contentTexts as ContentText[]).splice(index, 1)
    }
  }

  // 서브 모듈 HTML 로드 함수
  const loadContentTemplate = async (type: 'title' | 'text'): Promise<string> => {
    try {
      const filename = type === 'title' ? 'ModuleContent_title.html' : 'ModuleContent_text.html'
      const response = await fetch(`/modules/${filename}`)
      if (!response.ok) {
        throw new Error(`서브 모듈 로드 실패: ${response.status}`)
      }
      return await response.text()
    } catch (error) {
      console.error(`서브 모듈 로드 실패 (${type}):`, error)
      return ''
    }
  }

  // 추가 콘텐츠 관리 함수들
  const addAdditionalContent = async (moduleId: string, type: 'title' | 'text', propertyKey: string = 'additionalContents') => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    if (!module.properties[propertyKey]) {
      module.properties[propertyKey] = []
    }

    const template = await loadContentTemplate(type)
    if (!template) return

    const existingContents = module.properties[propertyKey] as AdditionalContent[]
    const maxOrder = existingContents.length > 0 ? Math.max(...existingContents.map(c => c.order)) : 0

    const newContent: AdditionalContent = {
      id: `content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: type,
      htmlTemplate: type === 'title' ? 'ModuleContent_title.html' : 'ModuleContent_text.html',
      data: type === 'title' ? { title_text: '새 타이틀' } : { text_content: '새 텍스트 내용' },
      order: maxOrder + 1
    }

    ;(module.properties[propertyKey] as AdditionalContent[]).push(newContent)
  }

  const updateAdditionalContent = (moduleId: string, contentId: string, data: Record<string, string>, propertyKey: string = 'additionalContents') => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties[propertyKey]) return

    const content = (module.properties[propertyKey] as AdditionalContent[]).find((c: AdditionalContent) => c.id === contentId)
    if (content) {
      content.data = { ...content.data, ...data }
    }
  }

  const removeAdditionalContent = (moduleId: string, contentId: string, propertyKey: string = 'additionalContents') => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties[propertyKey]) return

    const index = (module.properties[propertyKey] as AdditionalContent[]).findIndex((c: AdditionalContent) => c.id === contentId)
    if (index !== -1) {
      ;(module.properties[propertyKey] as AdditionalContent[]).splice(index, 1)
      // 순서 재정렬
      const contents = module.properties[propertyKey] as AdditionalContent[]
      contents.sort((a, b) => a.order - b.order).forEach((content, idx) => {
        content.order = idx + 1
      })
    }
  }

  const moveAdditionalContentUp = (moduleId: string, contentId: string, propertyKey: string = 'additionalContents') => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties[propertyKey]) return

    const contents = module.properties[propertyKey] as AdditionalContent[]
    const index = contents.findIndex((c: AdditionalContent) => c.id === contentId)
    if (index > 0) {
      [contents[index], contents[index - 1]] = [contents[index - 1], contents[index]]
      // 순서 업데이트
      contents.sort((a, b) => a.order - b.order).forEach((content, idx) => {
        content.order = idx + 1
      })
    }
  }

  const moveAdditionalContentDown = (moduleId: string, contentId: string, propertyKey: string = 'additionalContents') => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties[propertyKey]) return

    const contents = module.properties[propertyKey] as AdditionalContent[]
    const index = contents.findIndex((c: AdditionalContent) => c.id === contentId)
    if (index < contents.length - 1) {
      [contents[index], contents[index + 1]] = [contents[index + 1], contents[index]]
      // 순서 업데이트
      contents.sort((a, b) => a.order - b.order).forEach((content, idx) => {
        content.order = idx + 1
      })
    }
  }

  // HTML 템플릿에 데이터 적용 함수
  const applyDataToTemplate = (htmlTemplate: string, data: Record<string, string>): string => {
    let result = htmlTemplate
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{\s*${key}\s*}}`, 'g')
      result = result.replace(placeholder, formatTextWithBreaks(value))
    })
    return result
  }

  // 추가 콘텐츠 HTML 삽입 함수
  const insertAdditionalContents = async (baseHtml: string, contents: AdditionalContent[], insertMarker: string): Promise<string> => {
    if (!contents || contents.length === 0) {
      return baseHtml.replace(insertMarker, '')
    }

    const sortedContents = contents.sort((a, b) => a.order - b.order)
    const insertHtmlPromises = sortedContents.map(async (content) => {
      const template = await loadContentTemplate(content.type)
      return applyDataToTemplate(template, content.data)
    })

    const insertHtmlArray = await Promise.all(insertHtmlPromises)
    const insertHtml = insertHtmlArray.join('\n')
    return baseHtml.replace(insertMarker, insertHtml)
  }

  // 전체 삭제
  const clearAll = () => {
    modules.value = []
    selectedModuleId.value = null
  }

  // 추가 콘텐츠를 포함한 모듈별 특화된 콘텐츠 교체 함수 (HTML 복사용)
  const replaceModuleContentWithAdditionalContents = async (html: string, module: ModuleInstance): Promise<string> => {
    const { moduleId, properties } = module

    switch (moduleId) {
      case 'SectionTitle':
        let sectionHtml = html

        // 메인 타이틀 처리
        const mainTitle = shouldRenderElement(properties.mainTitle)
          ? safeFormatText(String(properties.mainTitle))
          : '모듈 섹션 타이틀 영역'
        sectionHtml = sectionHtml.replace(/모듈 섹션 타이틀 영역/g, mainTitle)

        // 서브 타이틀 처리 - 빈 값이면 해당 요소 제거
        if (shouldRenderElement(properties.subTitle)) {
          const subTitle = safeFormatText(String(properties.subTitle))
          sectionHtml = sectionHtml.replace(/서브 타이틀 영역/g, subTitle)
        } else {
          // 서브 타이틀이 비어있으면 관련 HTML 요소 제거
          sectionHtml = sectionHtml.replace(
            /<div[^>]*>[\s\S]*?서브 타이틀 영역[\s\S]*?<\/div>/g,
            ''
          )
        }

        return sectionHtml

      case 'Module04':
        let modifiedHtml = html

        // 기본 텍스트 교체
        let titleIndex = 0
        modifiedHtml = modifiedHtml.replace(/콘텐츠 타이틀/g, () => {
          const isLeft = titleIndex === 0
          const titleValue = isLeft ? properties.leftTitle : properties.rightTitle
          const replacement = shouldRenderElement(titleValue)
            ? safeFormatText(String(titleValue))
            : '콘텐츠 타이틀'
          titleIndex++
          return replacement
        })

        let contentIndex = 0
        modifiedHtml = modifiedHtml.replace(/콘텐츠 텍스트/g, () => {
          const isLeft = contentIndex === 0
          const contentValue = isLeft ? properties.leftContent : properties.rightContent
          const replacement = shouldRenderElement(contentValue)
            ? safeFormatText(String(contentValue))
            : '콘텐츠 텍스트'
          contentIndex++
          return replacement
        })

        // 버튼 텍스트 교체
        let smallBtnIndex = 0
        modifiedHtml = modifiedHtml.replace(/작은 버튼 →/g, () => {
          const isLeft = smallBtnIndex === 0
          const btnValue = isLeft ? properties.leftSmallBtnText : properties.rightSmallBtnText
          const replacement = shouldRenderElement(btnValue)
            ? String(btnValue)
            : '작은 버튼 →'
          smallBtnIndex++
          return replacement
        })

        let bigBtnIndex = 0
        modifiedHtml = modifiedHtml.replace(/큰 버튼 →/g, () => {
          const isLeft = bigBtnIndex === 0
          const btnValue = isLeft ? properties.leftBigBtnText : properties.rightBigBtnText
          const replacement = shouldRenderElement(btnValue)
            ? String(btnValue)
            : '큰 버튼 →'
          bigBtnIndex++
          return replacement
        })

        // href 링크 교체
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

        // 추가 콘텐츠 삽입 (단일 관리)
        if (
          properties.additionalContents &&
          Array.isArray(properties.additionalContents) &&
          properties.additionalContents.length > 0
        ) {
          modifiedHtml = await insertAdditionalContents(
            modifiedHtml,
            properties.additionalContents as AdditionalContent[],
            '<!-- 추가 콘텐츠 위치 (오른쪽) -->'
          )
        } else {
          modifiedHtml = modifiedHtml.replace(/<!-- 추가 콘텐츠 위치 \(오른쪽\) -->/g, '')
        }

        // 버튼 스타일 적용
        modifiedHtml = applyButtonStyles(modifiedHtml, properties)

        // 버튼 표시/숨김 처리
        modifiedHtml = handleButtonVisibility(modifiedHtml, properties)

        return modifiedHtml

      case 'Module02':
        let module02Html = html
          .replace(
            /src="https:\/\/design\.messeesang\.com\/e-dm\/newsletter\/images\/img-1column\.png"/g,
            `src="${properties.imageUrl || 'https://design.messeesang.com/e-dm/newsletter/images/img-1column.png'}"`,
          )
          .replace(/alt="이미지"/g, `alt="${properties.imageAlt || '이미지'}"`)
          .replace(
            /콘텐츠 타이틀/g,
            formatTextWithBreaks(String(properties.title || '콘텐츠 타이틀')),
          )
          .replace(
            /콘텐츠 텍스트/g,
            formatTextWithBreaks(String(properties.description || '콘텐츠 텍스트')),
          )
          .replace(
            /테이블 타이틀/g,
            formatTextWithBreaks(String(properties.tableTitle || '테이블 타이틀')),
          )
          .replace(
            /테이블 콘텐츠 텍스트/g,
            formatTextWithBreaks(String(properties.tableContent || '테이블 콘텐츠 텍스트')),
          )
          .replace(/큰 버튼 →/g, String(properties.buttonText || '큰 버튼 →'))
          .replace(/href="#"/g, `href="${properties.buttonUrl || '#'}"`)

        // 버튼 스타일 적용
        if (properties.buttonBgColor || properties.buttonTextColor) {
          const existingStyleRegex = /(<a[^>]*style="[^"]*)/g
          module02Html = module02Html.replace(existingStyleRegex, (match) => {
            let styleAdditions = ''
            if (properties.buttonBgColor) {
              styleAdditions += ` background-color:${properties.buttonBgColor} !important;`
            }
            if (properties.buttonTextColor) {
              styleAdditions += ` color:${properties.buttonTextColor} !important;`
            }
            return match + styleAdditions
          })
        }

        // 동적 테이블 행 추가
        if (
          properties.tableRows &&
          Array.isArray(properties.tableRows) &&
          properties.tableRows.length > 0
        ) {
          const dynamicRows = (properties.tableRows as TableRow[])
            .map(
              (row) => `
            <tr>
              <th scope="row" style="font-size:14px; font-weight:400; border-bottom:1px #a7a7a7 solid; background:#f6f6f6; bgcolor: #f6f6f6; text-align:center; color:#333333; letter-spacing:-0.03em; line-height:2em; font-family:AppleSDGothic, malgun gothic, nanum gothic, Noto Sans KR, sans-serif; word-break:keep-all;" width="20%"><strong>${formatTextWithBreaks(row.header || '')}</strong></th>
              <td style="font-size:14px; font-weight:400; border-bottom:1px #a7a7a7 solid; background:#ffffff; bgcolor: #ffffff; text-align:left; word-break:keep-all; color:#333333; padding-left:10px; letter-spacing:-0.03em; line-height:2em; font-family:AppleSDGothic, malgun gothic, nanum gothic, Noto Sans KR, sans-serif; box-sizing: border-box;" width="80%">${formatTextWithBreaks(row.data || '')}</td>
            </tr>`,
            )
            .join('')

          module02Html = module02Html.replace(/<!-- 추가 tr 위치 -->/g, dynamicRows)
        }

        // 추가 콘텐츠 삽입
        if (
          properties.additionalContents &&
          Array.isArray(properties.additionalContents) &&
          properties.additionalContents.length > 0
        ) {
          module02Html = await insertAdditionalContents(
            module02Html,
            properties.additionalContents as AdditionalContent[],
            '<!-- 추가 콘텐츠 위치 -->'
          )
        } else {
          module02Html = module02Html.replace(/<!-- 추가 콘텐츠 위치 -->/g, '')
        }

        // 테이블 완전 제거 (showTable이 false인 경우)
        if (properties.showTable !== true) {
          module02Html = module02Html.replace(
            /<tr>\s*<td style="padding:0px 20px; box-sizing: border-box;">\s*<table align="center"[\s\S]*?<\/table>\s*<\/td>\s*<\/tr>/,
            '',
          )
        }

        // 버튼 완전 제거 (showButton이 false인 경우)
        if (properties.showButton !== true) {
          module02Html = module02Html.replace(
            /<!-- 버튼 -->\s*<tr>\s*<td align="center"[\s\S]*?<\/tr>\s*<!-- \/\/버튼 -->/,
            '',
          )
        }

        return module02Html

      case 'Module05':
        let module05Html = html

        // 이미지 URL 교체
        let imgIndexM05 = 0
        module05Html = module05Html.replace(
          /src="https:\/\/design\.messeesang\.com\/e-dm\/newsletter\/images\/img-2column\.png"/g,
          () => {
            const replacement =
              imgIndexM05 === 0
                ? `src="${properties.topLeftImageUrl || 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png'}"`
                : `src="${properties.bottomLeftImageUrl || 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png'}"`
            imgIndexM05++
            return replacement
          },
        )

        // 콘텐츠 타이틀 교체
        let titleIndexM05 = 0
        module05Html = module05Html.replace(/>콘텐츠 타이틀</g, () => {
          const replacement =
            titleIndexM05 === 0
              ? `>${formatTextWithBreaks(String(properties.topRightTitle || '콘텐츠 타이틀'))}<`
              : titleIndexM05 === 2
                ? `>${formatTextWithBreaks(String(properties.bottomRightTitle || '콘텐츠 타이틀'))}<`
                : `>${formatTextWithBreaks(String(properties.topRightTableTitle || '콘텐츠 타이틀'))}<`
          titleIndexM05++
          return replacement
        })

        // 작은 버튼 텍스트 교체
        let smallBtnIndexM05 = 0
        module05Html = module05Html.replace(/작은 버튼 →/g, () => {
          const replacement =
            smallBtnIndexM05 === 0
              ? String(properties.topRightSmallBtnText || '작은 버튼 →')
              : String(properties.bottomRightSmallBtnText || '작은 버튼 →')
          smallBtnIndexM05++
          return replacement
        })

        // 큰 버튼 텍스트 교체
        module05Html = module05Html.replace(
          /큰 버튼 →/g,
          String(properties.bigButtonText || '큰 버튼 →'),
        )

        // href 교체
        let hrefIndexM05 = 0
        module05Html = module05Html.replace(/href="#"/g, () => {
          let replacement = 'href="#"'
          switch (hrefIndexM05) {
            case 0:
              replacement = `href="${properties.topRightSmallBtnUrl || '#'}"`
              break
            case 1:
              replacement = `href="${properties.bottomRightSmallBtnUrl || '#'}"`
              break
            case 2:
              replacement = `href="${properties.bigButtonUrl || '#'}"`
              break
          }
          hrefIndexM05++
          return replacement
        })

        // 추가 콘텐츠 삽입 (상단)
        if (
          properties.additionalContentsTop &&
          Array.isArray(properties.additionalContentsTop) &&
          properties.additionalContentsTop.length > 0
        ) {
          module05Html = await insertAdditionalContents(
            module05Html,
            properties.additionalContentsTop as AdditionalContent[],
            '<!-- 추가 콘텐츠 위치 (상단) -->'
          )
        } else {
          module05Html = module05Html.replace(/<!-- 추가 콘텐츠 위치 \(상단\) -->/g, '')
        }

        // 추가 콘텐츠 삽입 (하단)
        if (
          properties.additionalContentsBottom &&
          Array.isArray(properties.additionalContentsBottom) &&
          properties.additionalContentsBottom.length > 0
        ) {
          module05Html = await insertAdditionalContents(
            module05Html,
            properties.additionalContentsBottom as AdditionalContent[],
            '<!-- 추가 콘텐츠 위치 (하단) -->'
          )
        } else {
          module05Html = module05Html.replace(/<!-- 추가 콘텐츠 위치 \(하단\) -->/g, '')
        }

        // Module05 버튼 표시/숨김 처리
        module05Html = handleModule05ButtonVisibilityForCopy(module05Html, properties)

        // Module05 버튼 스타일 적용
        module05Html = applyModule05ButtonStylesForCopy(module05Html, properties)

        return module05Html

      default:
        // 기본적으로 {{key}} 형태의 플레이스홀더 교체
        Object.entries(properties).forEach(([key, value]) => {
          const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
          html = html.replace(placeholder, String(value))
        })
        return html
    }
  }

  // 모듈별 특화된 콘텐츠 교체 함수 (ModuleRenderer와 동일)
  const replaceModuleContent = (html: string, module: ModuleInstance): string => {
    const { moduleId, properties } = module

    switch (moduleId) {
      case 'SectionTitle':
        return html
          .replace(
            /모듈 섹션 타이틀 영역/g,
            formatTextWithBreaks(String(properties.mainTitle || '모듈 섹션 타이틀 영역')),
          )
          .replace(
            /서브 타이틀 영역/g,
            formatTextWithBreaks(String(properties.subTitle || '서브 타이틀 영역')),
          )

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

        // 버튼 스타일 적용
        modifiedHtml = applyButtonStyles(modifiedHtml, properties)

        // 버튼 표시/숨김 처리
        modifiedHtml = handleButtonVisibility(modifiedHtml, properties)

        return modifiedHtml

      case 'Module02':
        let module02Html = html
          .replace(
            /src="https:\/\/design\.messeesang\.com\/e-dm\/newsletter\/images\/img-1column\.png"/g,
            `src="${properties.imageUrl || 'https://design.messeesang.com/e-dm/newsletter/images/img-1column.png'}"`,
          )
          .replace(/alt="이미지"/g, `alt="${properties.imageAlt || '이미지'}"`)
          .replace(
            /콘텐츠 타이틀/g,
            formatTextWithBreaks(String(properties.title || '콘텐츠 타이틀')),
          )
          .replace(
            /콘텐츠 텍스트/g,
            formatTextWithBreaks(String(properties.description || '콘텐츠 텍스트')),
          )
          .replace(
            /테이블 타이틀/g,
            formatTextWithBreaks(String(properties.tableTitle || '테이블 타이틀')),
          )
          .replace(
            /테이블 콘텐츠 텍스트/g,
            formatTextWithBreaks(String(properties.tableContent || '테이블 콘텐츠 텍스트')),
          )
          .replace(/큰 버튼 →/g, String(properties.buttonText || '큰 버튼 →'))
          .replace(/href="#"/g, `href="${properties.buttonUrl || '#'}"`)

        // Module02 버튼 스타일 적용
        if (properties.buttonBgColor || properties.buttonTextColor) {
          const existingStyleRegex = /(<a[^>]*style="[^"]*)/g
          module02Html = module02Html.replace(existingStyleRegex, (match) => {
            let styleAdditions = ''
            if (properties.buttonBgColor) {
              styleAdditions += ` background-color:${properties.buttonBgColor} !important;`
            }
            if (properties.buttonTextColor) {
              styleAdditions += ` color:${properties.buttonTextColor} !important;`
            }
            return match + styleAdditions
          })
        }

        // 동적 테이블 행 추가
        if (
          properties.tableRows &&
          Array.isArray(properties.tableRows) &&
          properties.tableRows.length > 0
        ) {
          const dynamicRows = (properties.tableRows as TableRow[])
            .map(
              (row) => `
            <tr>
              <th scope="row" style="font-size:14px; font-weight:400; border-bottom:1px #a7a7a7 solid; background:#f6f6f6; bgcolor: #f6f6f6; text-align:center; color:#333333; letter-spacing:-0.03em; line-height:2em; font-family:AppleSDGothic, malgun gothic, nanum gothic, Noto Sans KR, sans-serif; word-break:keep-all;" width="20%"><strong>${formatTextWithBreaks(row.header || '')}</strong></th>
              <td style="font-size:14px; font-weight:400; border-bottom:1px #a7a7a7 solid; background:#ffffff; bgcolor: #ffffff; text-align:left; word-break:keep-all; color:#333333; padding-left:10px; letter-spacing:-0.03em; line-height:2em; font-family:AppleSDGothic, malgun gothic, nanum gothic, Noto Sans KR, sans-serif; box-sizing: border-box;" width="80%">${formatTextWithBreaks(row.data || '')}</td>
            </tr>`,
            )
            .join('')

          module02Html = module02Html.replace(/<!-- 추가 tr 위치 -->/g, dynamicRows)
        }

        // 테이블 완전 제거 (showTable이 false인 경우)
        if (properties.showTable !== true) {
          module02Html = module02Html.replace(
            /<tr>\s*<td style="padding:0px 20px; box-sizing: border-box;">\s*<table align="center"[\s\S]*?<\/table>\s*<\/td>\s*<\/tr>/,
            '',
          )
        }

        // 버튼 완전 제거 (showButton이 false인 경우)
        if (properties.showButton !== true) {
          module02Html = module02Html.replace(
            /<!-- 버튼 -->\s*<tr>\s*<td align="center"[\s\S]*?<\/tr>\s*<!-- \/\/버튼 -->/,
            '',
          )
        }

        return module02Html

      case 'Module05':
        let module05Html = html

        // 이미지 URL 교체
        let imgIndexM05 = 0
        module05Html = module05Html.replace(
          /src="https:\/\/design\.messeesang\.com\/e-dm\/newsletter\/images\/img-2column\.png"/g,
          () => {
            const replacement =
              imgIndexM05 === 0
                ? `src="${properties.topLeftImageUrl || 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png'}"`
                : `src="${properties.bottomLeftImageUrl || 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png'}"`
            imgIndexM05++
            return replacement
          },
        )

        // 콘텐츠 타이틀 교체 (div 안의 콘텐츠 타이틀)
        let titleIndexM05 = 0
        module05Html = module05Html.replace(/>콘텐츠 타이틀</g, () => {
          const replacement =
            titleIndexM05 === 0
              ? `>${formatTextWithBreaks(String(properties.topRightTitle || '콘텐츠 타이틀'))}<`
              : titleIndexM05 === 2
                ? `>${formatTextWithBreaks(String(properties.bottomRightTitle || '콘텐츠 타이틀'))}<`
                : `>${formatTextWithBreaks(String(properties.topRightTableTitle || '콘텐츠 타이틀'))}<`
          titleIndexM05++
          return replacement
        })

        // 작은 버튼 텍스트 교체
        let smallBtnIndexM05 = 0
        module05Html = module05Html.replace(/작은 버튼 →/g, () => {
          const replacement =
            smallBtnIndexM05 === 0
              ? String(properties.topRightSmallBtnText || '작은 버튼 →')
              : String(properties.bottomRightSmallBtnText || '작은 버튼 →')
          smallBtnIndexM05++
          return replacement
        })

        // 큰 버튼 텍스트 교체
        module05Html = module05Html.replace(
          /큰 버튼 →/g,
          String(properties.bigButtonText || '큰 버튼 →'),
        )

        // href 교체
        let hrefIndexM05 = 0
        module05Html = module05Html.replace(/href="#"/g, () => {
          let replacement = 'href="#"'
          switch (hrefIndexM05) {
            case 0:
              replacement = `href="${properties.topRightSmallBtnUrl || '#'}"`
              break
            case 1:
              replacement = `href="${properties.bottomRightSmallBtnUrl || '#'}"`
              break
            case 2:
              replacement = `href="${properties.bigButtonUrl || '#'}"`
              break
          }
          hrefIndexM05++
          return replacement
        })

        return module05Html

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

        // 모듈별 특화된 텍스트 교체 (ModuleRenderer와 동일한 로직) - 추가 콘텐츠 포함
        html = await replaceModuleContentWithAdditionalContents(html, module)

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
          // 표시/숨김 관련 속성들은 false가 기본값
          props[prop.key] = false
          break
        case 'color':
          props[prop.key] = '#000000'
          break
        case 'number':
          props[prop.key] = 0
          break
        case 'table-rows':
          props[prop.key] = prop.defaultRows || []
          break
        case 'content-titles':
          props[prop.key] = []
          break
        case 'content-texts':
          props[prop.key] = []
          break
        case 'additional-contents':
          props[prop.key] = []
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
    addTableRow,
    updateTableRow,
    removeTableRow,
    addContentTitle,
    updateContentTitle,
    removeContentTitle,
    addContentText,
    updateContentText,
    removeContentText,
    loadContentTemplate,
    addAdditionalContent,
    updateAdditionalContent,
    removeAdditionalContent,
    moveAdditionalContentUp,
    moveAdditionalContentDown,
    applyDataToTemplate,
    insertAdditionalContents,
  }
})
