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

// 모듈별 특화된 콘텐츠 교체 함수
const replaceModuleContent = (html: string, module: ModuleInstance): string => {
  const { moduleId, properties } = module

  switch (moduleId) {
    case 'SectionTitle':
      return html
        .replace(/모듈 섹션 타이틀 영역/g, String(properties.mainTitle || '모듈 섹션 타이틀 영역'))
        .replace(/서브 타이틀 영역/g, String(properties.subTitle || '서브 타이틀 영역'))

    case 'Module04':
      let modifiedHtml = html

      // 첫 번째와 두 번째 콘텐츠 타이틀을 각각 교체
      let titleIndex = 0
      modifiedHtml = modifiedHtml.replace(/콘텐츠 타이틀/g, () => {
        const replacement = titleIndex === 0
          ? String(properties.leftTitle || '콘텐츠 타이틀')
          : String(properties.rightTitle || '콘텐츠 타이틀')
        titleIndex++
        return replacement
      })

      // 첫 번째와 두 번째 콘텐츠 텍스트를 각각 교체
      let contentIndex = 0
      modifiedHtml = modifiedHtml.replace(/콘텐츠 텍스트/g, () => {
        const replacement = contentIndex === 0
          ? String(properties.leftContent || '콘텐츠 텍스트')
          : String(properties.rightContent || '콘텐츠 텍스트')
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