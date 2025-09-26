<template>
  <div
    @click="$emit('select', module.id)"
    :class="[
      'relative group cursor-pointer border-2 transition-all',
      isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-transparent hover:border-gray-300'
    ]"
  >
    <!-- 모듈 컨텐츠 -->
    <div v-html="renderedHtml" class="module-content"></div>

    <!-- 선택시 표시되는 컨트롤 버튼들 -->
    <div
      v-if="isSelected"
      class="absolute top-2 right-2 flex space-x-1 bg-white rounded shadow-md border"
    >
      <button
        @click.stop="$emit('move-up', module.id)"
        :disabled="index === 0"
        class="p-1 text-xs hover:bg-gray-100 disabled:text-gray-300"
        title="위로 이동"
      >
        ↑
      </button>
      <button
        @click.stop="$emit('move-down', module.id)"
        class="p-1 text-xs hover:bg-gray-100"
        title="아래로 이동"
      >
        ↓
      </button>
      <button
        @click.stop="$emit('duplicate', module.id)"
        class="p-1 text-xs hover:bg-gray-100"
        title="복사"
      >
        📋
      </button>
      <button
        @click.stop="$emit('delete', module.id)"
        class="p-1 text-xs hover:bg-gray-100 text-red-600"
        title="삭제"
      >
        🗑️
      </button>
    </div>

    <!-- 호버시 표시되는 레이블 -->
    <div
      v-if="!isSelected"
      class="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity"
    >
      {{ moduleMetadata?.name }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { ModuleInstance, ModuleMetadata } from '@/types'
import { formatTextWithBreaks } from '@/utils/textUtils'

interface Props {
  module: ModuleInstance
  index: number
  isSelected: boolean
}

const props = defineProps<Props>()

defineEmits<{
  select: [moduleId: string]
  'move-up': [moduleId: string]
  'move-down': [moduleId: string]
  duplicate: [moduleId: string]
  delete: [moduleId: string]
}>()

const renderedHtml = ref('')
const moduleMetadata = ref<ModuleMetadata | null>(null)

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
    /<a href="[^"]*"\s*style="([^"]*)"[^>]*target="_blank">큰 버튼[\s\S]*?<\/a>/g,
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

// 모듈별 특화된 콘텐츠 교체 함수
const replaceModuleContent = (html: string, module: ModuleInstance): string => {
  const { moduleId, properties } = module

  switch (moduleId) {
    case 'SectionTitle':
      return html
        .replace(/모듈 섹션 타이틀 영역/g, formatTextWithBreaks(String(properties.mainTitle || '모듈 섹션 타이틀 영역')))
        .replace(/서브 타이틀 영역/g, formatTextWithBreaks(String(properties.subTitle || '서브 타이틀 영역')))

    case 'Module04':
      let modifiedHtml = html

      // 첫 번째와 두 번째 콘텐츠 타이틀을 각각 교체
      let titleIndex = 0
      modifiedHtml = modifiedHtml.replace(/콘텐츠 타이틀/g, () => {
        const replacement = titleIndex === 0
          ? formatTextWithBreaks(String(properties.leftTitle || '콘텐츠 타이틀'))
          : formatTextWithBreaks(String(properties.rightTitle || '콘텐츠 타이틀'))
        titleIndex++
        return replacement
      })

      // 첫 번째와 두 번째 콘텐츠 텍스트를 각각 교체
      let contentIndex = 0
      modifiedHtml = modifiedHtml.replace(/콘텐츠 텍스트/g, () => {
        const replacement = contentIndex === 0
          ? formatTextWithBreaks(String(properties.leftContent || '콘텐츠 텍스트'))
          : formatTextWithBreaks(String(properties.rightContent || '콘텐츠 텍스트'))
        contentIndex++
        return replacement
      })

      // 작은 버튼 텍스트 교체
      let smallBtnIndex = 0
      modifiedHtml = modifiedHtml.replace(/작은 버튼 →/g, () => {
        const replacement = smallBtnIndex === 0
          ? String(properties.leftSmallBtnText || '작은 버튼 →')
          : String(properties.rightSmallBtnText || '작은 버튼 →')
        smallBtnIndex++
        return replacement
      })

      // 큰 버튼 텍스트 교체
      let bigBtnIndex = 0
      modifiedHtml = modifiedHtml.replace(/큰 버튼 →/g, () => {
        const replacement = bigBtnIndex === 0
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
          case 0: replacement = `href="${properties.leftSmallBtnUrl || '#'}"`; break
          case 1: replacement = `href="${properties.leftBigBtnUrl || '#'}"`; break
          case 2: replacement = `href="${properties.rightSmallBtnUrl || '#'}"`; break
          case 3: replacement = `href="${properties.rightBigBtnUrl || '#'}"`; break
        }
        hrefIndex++
        return replacement
      })

      // 이미지 URL 교체
      let imgIndex = 0
      modifiedHtml = modifiedHtml.replace(/src="https:\/\/design\.messeesang\.com\/e-dm\/newsletter\/images\/img-2column\.png"/g, () => {
        const replacement = imgIndex === 0
          ? `src="${properties.leftImageUrl || 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png'}"`
          : `src="${properties.rightImageUrl || 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png'}"`
        imgIndex++
        return replacement
      })

      // 버튼 스타일 적용
      modifiedHtml = applyButtonStyles(modifiedHtml, properties)

      // 버튼 표시/숨김 처리
      modifiedHtml = handleButtonVisibility(modifiedHtml, properties)

      return modifiedHtml

    case 'Module02':
      let module02Html = html
        .replace(/src="https:\/\/design\.messeesang\.com\/e-dm\/newsletter\/images\/img-1column\.png"/g,
          `src="${properties.imageUrl || 'https://design.messeesang.com/e-dm/newsletter/images/img-1column.png'}"`)
        .replace(/alt="이미지"/g, `alt="${properties.imageAlt || '이미지'}"`)
        .replace(/콘텐츠 타이틀/g, formatTextWithBreaks(String(properties.title || '콘텐츠 타이틀')))
        .replace(/콘텐츠 텍스트/g, formatTextWithBreaks(String(properties.description || '콘텐츠 텍스트')))
        .replace(/테이블 타이틀/g, formatTextWithBreaks(String(properties.tableTitle || '테이블 타이틀')))
        .replace(/테이블 콘텐츠 텍스트/g, formatTextWithBreaks(String(properties.tableContent || '테이블 콘텐츠 텍스트')))
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
      module05Html = module05Html.replace(/src="https:\/\/design\.messeesang\.com\/e-dm\/newsletter\/images\/img-2column\.png"/g, () => {
        const replacement = imgIndexM05 === 0
          ? `src="${properties.topLeftImageUrl || 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png'}"`
          : `src="${properties.bottomLeftImageUrl || 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png'}"`
        imgIndexM05++
        return replacement
      })

      // 콘텐츠 타이틀 교체 (div 안의 콘텐츠 타이틀)
      let titleIndexM05 = 0
      module05Html = module05Html.replace(/>콘텐츠 타이틀</g, () => {
        const replacement = titleIndexM05 === 0
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
        const replacement = smallBtnIndexM05 === 0
          ? String(properties.topRightSmallBtnText || '작은 버튼 →')
          : String(properties.bottomRightSmallBtnText || '작은 버튼 →')
        smallBtnIndexM05++
        return replacement
      })

      // 큰 버튼 텍스트 교체
      module05Html = module05Html.replace(/큰 버튼 →/g, String(properties.bigButtonText || '큰 버튼 →'))

      // href 교체
      let hrefIndexM05 = 0
      module05Html = module05Html.replace(/href="#"/g, () => {
        let replacement = 'href="#"'
        switch (hrefIndexM05) {
          case 0: replacement = `href="${properties.topRightSmallBtnUrl || '#'}"`; break
          case 1: replacement = `href="${properties.bottomRightSmallBtnUrl || '#'}"`; break
          case 2: replacement = `href="${properties.bigButtonUrl || '#'}"`; break
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

const loadModuleHtml = async () => {
  try {
    // public/modules 폴더에서 HTML 파일 로드
    const response = await fetch(`/modules/${props.module.moduleId}.html`)
    let html = await response.text()

    // 모듈별 특화된 텍스트 교체
    html = replaceModuleContent(html, props.module)

    // 스타일 적용
    if (props.module.styles && Object.keys(props.module.styles).length > 0) {
      const styles = Object.entries(props.module.styles)
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

    renderedHtml.value = html
  } catch (error) {
    console.error('모듈 HTML 로드 실패:', error)
    renderedHtml.value = `<div class="p-4 text-center text-red-500">모듈을 로드할 수 없습니다</div>`
  }
}

// 모듈 속성이 변경될 때마다 HTML 재렌더링
watch(
  () => [props.module.properties, props.module.styles],
  () => loadModuleHtml(),
  { deep: true }
)

onMounted(() => {
  loadModuleHtml()
})
</script>

<style scoped>
.module-content :deep(*) {
  max-width: 100%;
}

.module-content :deep(img) {
  max-width: 100%;
  height: auto;
}
</style>