<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goToEditor = () => {
  router.push('/editor')
}

const advancedFeatures = [
  { icon: 'pi pi-code', title: 'Auto-Inline CSS', desc: 'Outlook, Gmail 등 모든 이메일 클라이언트에서 깨지지 않는 인라인 스타일을 자동 생성합니다.' },
  { icon: 'pi pi-objects-column', title: '모듈 시스템', desc: '26개 이상의 재사용 가능한 모듈 블록으로 브랜드 일관성을 유지합니다.' },
  { icon: 'pi pi-eye', title: '실시간 미리보기', desc: '편집 내용이 캔버스에 즉시 반영되어 최종 결과물을 바로 확인할 수 있습니다.' },
]
</script>

<template>
  <div class="landing-page bg-gray-50 text-gray-800 overflow-x-hidden h-screen flex justify-center items-center">

<div class="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              label="에디터 시작하기"
              icon="pi pi-arrow-right"
              iconPos="right"
              iconClass="!text-xs"
              @click="goToEditor"
              severity="contrast"
              class="!px-8 !py-3 !font-semibold !text-sm !gap-4"
            />
          </div>

  </div>
</template>

<style scoped>
.landing-page {
  overflow-x: hidden;
}
</style>
