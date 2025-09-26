import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ModuleInstance, ModuleMetadata } from '@/types'
import { formatTextWithBreaks } from '@/utils/textUtils'

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
          description: '이미지와 텍스트, 테이블, 버튼이 포함된 모듈',
          category: 'image',
          icon: '🖼️',
          htmlFile: 'Module02.html',
          editableProps: [
            {
              key: 'imageUrl',
              label: '이미지 URL',
              type: 'url',
              placeholder: 'https://design.messeesang.com/e-dm/newsletter/images/img-1column.png',
            },
            { key: 'imageAlt', label: '이미지 설명', type: 'text', placeholder: '이미지' },
            {
              key: 'title',
              label: '콘텐츠 타이틀',
              type: 'text',
              required: true,
              placeholder: '콘텐츠 타이틀',
            },
            {
              key: 'description',
              label: '콘텐츠 텍스트',
              type: 'textarea',
              placeholder: '콘텐츠 텍스트',
            },
            {
              key: 'tableTitle',
              label: '테이블 타이틀',
              type: 'text',
              placeholder: '테이블 타이틀',
            },
            {
              key: 'tableContent',
              label: '테이블 콘텐츠',
              type: 'textarea',
              placeholder: '테이블 콘텐츠 텍스트',
            },
            { key: 'buttonText', label: '버튼 텍스트', type: 'text', placeholder: '큰 버튼 →' },
            { key: 'buttonUrl', label: '버튼 링크', type: 'url', placeholder: '#' },
            { key: 'showTable', label: '테이블 표시', type: 'boolean' },
            { key: 'showButton', label: '버튼 표시', type: 'boolean' },
            { key: 'buttonBgColor', label: '버튼 배경색', type: 'color' },
            { key: 'buttonTextColor', label: '버튼 글자색', type: 'color' },
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
            // 요소 표시/숨김 제어
            { key: 'showLeftSmallBtn', label: '왼쪽 작은 버튼 표시', type: 'boolean' },
            { key: 'showLeftBigBtn', label: '왼쪽 큰 버튼 표시', type: 'boolean' },
            { key: 'showRightSmallBtn', label: '오른쪽 작은 버튼 표시', type: 'boolean' },
            { key: 'showRightBigBtn', label: '오른쪽 큰 버튼 표시', type: 'boolean' },
            // 버튼 스타일 설정
            { key: 'leftSmallBtnBgColor', label: '왼쪽 작은 버튼 배경색', type: 'color' },
            { key: 'leftSmallBtnTextColor', label: '왼쪽 작은 버튼 글자색', type: 'color' },
            { key: 'leftBigBtnBgColor', label: '왼쪽 큰 버튼 배경색', type: 'color' },
            { key: 'leftBigBtnTextColor', label: '왼쪽 큰 버튼 글자색', type: 'color' },
            { key: 'rightSmallBtnBgColor', label: '오른쪽 작은 버튼 배경색', type: 'color' },
            { key: 'rightSmallBtnTextColor', label: '오른쪽 작은 버튼 글자색', type: 'color' },
            { key: 'rightBigBtnBgColor', label: '오른쪽 큰 버튼 배경색', type: 'color' },
            { key: 'rightBigBtnTextColor', label: '오른쪽 큰 버튼 글자색', type: 'color' },
          ],
        },
        {
          id: 'Module05',
          name: '모듈 05',
          description: '2단 이미지와 텍스트, 버튼이 포함된 모듈',
          category: 'image',
          icon: '🔘',
          htmlFile: 'Module05.html',
          editableProps: [
            // 첫 번째 섹션
            {
              key: 'topLeftImageUrl',
              label: '위쪽 왼쪽 이미지 URL',
              type: 'url',
              placeholder: 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png',
            },
            {
              key: 'topLeftImageAlt',
              label: '위쪽 왼쪽 이미지 설명',
              type: 'text',
              placeholder: '이미지',
            },
            {
              key: 'topRightTitle',
              label: '위쪽 오른쪽 타이틀',
              type: 'text',
              placeholder: '콘텐츠 타이틀',
            },
            {
              key: 'topRightTableTitle',
              label: '위쪽 오른쪽 테이블 타이틀',
              type: 'text',
              placeholder: '콘텐츠 타이틀',
            },
            {
              key: 'topRightSmallBtnText',
              label: '위쪽 오른쪽 작은 버튼',
              type: 'text',
              placeholder: '작은 버튼 →',
            },
            {
              key: 'topRightSmallBtnUrl',
              label: '위쪽 오른쪽 작은 버튼 링크',
              type: 'url',
              placeholder: '#',
            },

            // 두 번째 섹션
            {
              key: 'bottomLeftImageUrl',
              label: '아래쪽 왼쪽 이미지 URL',
              type: 'url',
              placeholder: 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png',
            },
            {
              key: 'bottomLeftImageAlt',
              label: '아래쪽 왼쪽 이미지 설명',
              type: 'text',
              placeholder: '이미지',
            },
            {
              key: 'bottomRightTitle',
              label: '아래쪽 오른쪽 타이틀',
              type: 'text',
              placeholder: '콘텐츠 타이틀',
            },
            {
              key: 'bottomRightTableTitle',
              label: '아래쪽 오른쪽 테이블 타이틀',
              type: 'text',
              placeholder: '콘텐츠 타이틀',
            },
            {
              key: 'bottomRightSmallBtnText',
              label: '아래쪽 오른쪽 작은 버튼',
              type: 'text',
              placeholder: '작은 버튼 →',
            },
            {
              key: 'bottomRightSmallBtnUrl',
              label: '아래쪽 오른쪽 작은 버튼 링크',
              type: 'url',
              placeholder: '#',
            },

            // 큰 버튼
            {
              key: 'bigButtonText',
              label: '큰 버튼 텍스트',
              type: 'text',
              placeholder: '큰 버튼 →',
            },
            { key: 'bigButtonUrl', label: '큰 버튼 링크', type: 'url', placeholder: '#' },

            // 스타일링
            { key: 'smallBtnBgColor', label: '작은 버튼 배경색', type: 'color' },
            { key: 'smallBtnTextColor', label: '작은 버튼 글자색', type: 'color' },
            { key: 'bigBtnBgColor', label: '큰 버튼 배경색', type: 'color' },
            { key: 'bigBtnTextColor', label: '큰 버튼 글자색', type: 'color' },

            // 표시/숨김
            { key: 'showTopSmallBtn', label: '위쪽 작은 버튼 표시', type: 'boolean' },
            { key: 'showBottomSmallBtn', label: '아래쪽 작은 버튼 표시', type: 'boolean' },
            { key: 'showBigBtn', label: '큰 버튼 표시', type: 'boolean' },
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

  // 버튼 스타일 적용 함수
  const applyButtonStyles = (html: string, properties: any): string => {
    let styledHtml = html

    // 작은 버튼 스타일 적용
    let smallBtnStyleIndex = 0
    styledHtml = styledHtml.replace(
      /<a href="[^"]*" target="_blank"\s*style="[^"]*display:\s*inline-block[^"]*background-color:#e5e5e5[^"]*"/g,
      (match) => {
        const isLeft = smallBtnStyleIndex === 0
        const bgColor = isLeft ? properties.leftSmallBtnBgColor : properties.rightSmallBtnBgColor
        const textColor = isLeft ? properties.leftSmallBtnTextColor : properties.rightSmallBtnTextColor

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
      }
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
      }
    )

    return styledHtml
  }

  // 버튼 표시/숨김 처리 함수 - 완전 제거 방식
  const handleButtonVisibility = (html: string, properties: any): string => {
    let visibilityHtml = html

    // 작은 버튼들의 span 태그를 완전히 제거
    let spanIndex = 0
    visibilityHtml = visibilityHtml.replace(
      /<span align="left" style="display: block; padding:15px 0px; box-sizing: border-box;">[\s\S]*?<\/span>/g,
      (match) => {
        const isLeft = spanIndex === 0
        const shouldShow = isLeft ? properties.showLeftSmallBtn === true : properties.showRightSmallBtn === true
        spanIndex++

        if (!shouldShow) {
          return '' // 완전히 제거
        }
        return match
      }
    )

    // 큰 버튼들을 완전히 제거
    let bigBtnIndex = 0
    visibilityHtml = visibilityHtml.replace(
      /<a href="[^"]*"\s*style="([^"]*)"\s*[^>]*target="_blank">큰 버튼[\s\S]*?<\/a>/g,
      (match) => {
        const isLeft = bigBtnIndex === 0
        const shouldShow = isLeft ? properties.showLeftBigBtn === true : properties.showRightBigBtn === true
        bigBtnIndex++

        if (!shouldShow) {
          return '' // 완전히 제거
        }
        return match
      }
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

        // 테이블 완전 제거 (showTable이 false인 경우)
        if (properties.showTable !== true) {
          module02Html = module02Html.replace(
            /<tr>\s*<td style="padding:0px 20px; box-sizing: border-box;">\s*<table align="center"[\s\S]*?<\/table>\s*<\/td>\s*<\/tr>/,
            ''
          )
        }

        // 버튼 완전 제거 (showButton이 false인 경우)
        if (properties.showButton !== true) {
          module02Html = module02Html.replace(
            /<!-- 버튼 -->\s*<tr>\s*<td align="center"[\s\S]*?<\/tr>\s*<!-- \/\/버튼 -->/,
            ''
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
          // 표시/숨김 관련 속성들은 false가 기본값
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
