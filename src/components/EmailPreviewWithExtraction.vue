<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue'
import { useEmailHtmlExtractor } from '@/components/composables/useEmailHtmlExtractor'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Badge from 'primevue/badge'
import ProgressSpinner from 'primevue/progressspinner'
import type { Module } from '@/components/types/modules'

const props = defineProps<{
  modules: Module[]
}>()

// generateCompleteEmailHtmlFromTemplate 함수를 사용하도록 수정
const { generateCompleteEmailHtmlFromTemplate, copyToClipboard, downloadHtml, previewInNewWindow } =
  useEmailHtmlExtractor()
const toast = useToast()

const isExtracting = ref(false)

// 동적 컴포넌트 로딩
const loadedPreviewComponents = ref(new Map())

const loadPreviewComponent = (moduleType: string) => {
  if (loadedPreviewComponents.value.has(moduleType)) {
    return loadedPreviewComponents.value.get(moduleType)
  }

  let component
  try {
    switch (moduleType) {
      case 'module1':
        component = defineAsyncComponent(
          () => import('@/components/newsletterModule/ModuleNum01.vue'),
        )
        break
      case 'module2':
        component = defineAsyncComponent(
          () => import('@/components/newsletterModule/ModuleNum02.vue'),
        )
        break
      // 추가 모듈들...
      default:
        return null
    }

    loadedPreviewComponents.value.set(moduleType, component)
    return component
  } catch (error) {
    console.error(`Failed to load preview component for ${moduleType}:`, error)
    return null
  }
}

const sortedModules = computed(() => {
  return [...props.modules].sort((a, b) => (a.order || 0) - (b.order || 0))
})

// HTML 추출 및 복사 - 템플릿 기반 함수 사용
const extractAndCopyHtml = async () => {
  if (props.modules.length === 0) {
    toast.add({
      severity: 'error',
      summary: '오류',
      detail: '추출할 모듈이 없습니다.',
      life: 3000,
    })
    return
  }

  isExtracting.value = true

  try {
    // DOM 기반이 아닌 템플릿 기반 함수 사용
    const result = await generateCompleteEmailHtmlFromTemplate(props.modules)

    if (!result.success) {
      throw new Error(result.error || 'HTML 생성에 실패했습니다.')
    }

    const copied = await copyToClipboard(result.html)

    if (copied) {
      toast.add({
        severity: 'success',
        summary: '복사 완료',
        detail: 'HTML이 클립보드에 복사되었습니다.',
        life: 3000,
      })
    } else {
      toast.add({
        severity: 'error',
        summary: '복사 실패',
        detail: '클립보드 복사에 실패했습니다.',
        life: 3000,
      })
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '추출 실패',
      detail: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      life: 5000,
    })
  } finally {
    isExtracting.value = false
  }
}

// HTML 다운로드 - 템플릿 기반 함수 사용
const extractAndDownloadHtml = async () => {
  if (props.modules.length === 0) return

  isExtracting.value = true

  try {
    // DOM 기반이 아닌 템플릿 기반 함수 사용
    const result = await generateCompleteEmailHtmlFromTemplate(props.modules)

    if (result.success) {
      downloadHtml(result.html)
      toast.add({
        severity: 'success',
        summary: '다운로드 완료',
        detail: 'HTML 파일이 다운로드되었습니다.',
        life: 3000,
      })
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '다운로드 실패',
      detail: '파일 다운로드에 실패했습니다.',
      life: 3000,
    })
  } finally {
    isExtracting.value = false
  }
}

// 새 창에서 미리보기 - 템플릿 기반 함수 사용
const openPreviewWindow = async () => {
  if (props.modules.length === 0) return

  try {
    // DOM 기반이 아닌 템플릿 기반 함수 사용
    const result = await generateCompleteEmailHtmlFromTemplate(props.modules)

    if (result.success) {
      previewInNewWindow(result.html)
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '미리보기 실패',
      detail: '새 창 미리보기에 실패했습니다.',
      life: 3000,
    })
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 미리보기 헤더 -->
    <div class="bg-white p-4 border-b border-gray-200 flex items-center justify-between">
      <div class="flex items-center">
        <i class="pi pi-eye mr-2 text-blue-500"></i>
        <h2 class="text-lg font-semibold text-gray-800">실시간 미리보기</h2>
        <Badge v-if="modules.length > 0" :value="modules.length" severity="info" class="ml-2" />
      </div>

      <div class="flex gap-2">
        <Button
          size="small"
          severity="secondary"
          @click="openPreviewWindow"
          :disabled="modules.length === 0"
          v-tooltip="'새 창에서 미리보기'"
        >
          새 창
        </Button>

        <Button
          size="small"
          @click="extractAndCopyHtml"
          :disabled="modules.length === 0"
          :loading="isExtracting"
        >
          HTML 복사
        </Button>

        <Button
          size="small"
          severity="success"
          @click="extractAndDownloadHtml"
          :disabled="modules.length === 0"
          :loading="isExtracting"
        >
          HTML 다운로드
        </Button>
      </div>
    </div>

    <!-- 미리보기 콘텐츠 -->
    <div class="flex-1 p-4 overflow-y-auto bg-gray-100">
      <!-- 빈 상태 -->
      <div v-if="modules.length === 0" class="text-center py-16">
        <div class="text-gray-400 mb-4">
          <i class="pi pi-image text-6xl"></i>
        </div>
        <h3 class="text-lg font-medium text-gray-600 mb-2">미리보기가 여기에 표시됩니다</h3>
        <p class="text-gray-500">모듈을 추가하여 이메일을 구성해보세요</p>
      </div>

      <!-- 이메일 미리보기 -->
      <div
        v-else
        class="bg-white shadow-lg rounded-lg overflow-hidden mx-auto"
        style="max-width: 680px"
      >
        <!-- 실제 이메일 콘텐츠 -->
        <div>
          <table
            align="center"
            border="0"
            cellpadding="0"
            cellspacing="0"
            style="width: 100%; max-width: 680px; background-color: #ffffff"
          >
            <tbody>
              <tr v-for="module in sortedModules" :key="`preview-${module.instanceId}`">
                <td>
                  <Suspense>
                    <component
                      :is="loadPreviewComponent(module.type)"
                      v-if="loadPreviewComponent(module.type)"
                      v-bind="module.data"
                    />

                    <template #fallback>
                      <div class="text-center py-8 border-2 border-dashed border-gray-300">
                        <ProgressSpinner style="width: 24px; height: 24px" />
                        <p class="text-xs text-gray-500 mt-2">{{ module.type }} 로딩 중...</p>
                      </div>
                    </template>
                  </Suspense>

                  <!-- 로딩 실패 시 -->
                  <div
                    v-if="!loadPreviewComponent(module.type)"
                    class="text-center py-8 border-2 border-dashed border-red-300 bg-red-50"
                  >
                    <i class="pi pi-exclamation-triangle text-red-500 text-2xl mb-2"></i>
                    <p class="text-sm text-red-600">
                      {{ module.type }} 미리보기를 불러올 수 없습니다
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
