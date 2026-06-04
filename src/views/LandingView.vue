<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goToEditor = () => {
  router.push('/editor')
}

const navLinks = [
  { href: '#how-it-works', label: '사용 방법' },
  { href: '#features', label: '주요 기능' },
]

const steps = [
  {
    no: '1',
    icon: 'pi pi-objects-column',
    title: '모듈 선택',
    desc: '26개 이상의 모듈 라이브러리에서 헤더, 본문, 이미지, 버튼, 테이블 등을 선택하여 캔버스에 추가합니다.',
  },
  {
    no: '2',
    icon: 'pi pi-sliders-h',
    title: '속성 편집',
    desc: '오른쪽 속성 패널에서 텍스트, 색상, 이미지, 링크를 자유롭게 수정하고 캔버스에서 실시간으로 확인합니다.',
  },
  {
    no: '3',
    icon: 'pi pi-code',
    title: '내보내기',
    desc: '완성된 뉴스레터를 HTML 코드로 복사하거나 파일로 내려받습니다. 모든 이메일 클라이언트와 호환됩니다.',
  },
]

const features = [
  { icon: 'pi pi-th-large', title: '26+ 모듈 템플릿', desc: '헤더, 본문, 이미지, 버튼, 테이블 등 다양한 모듈을 조합하여 나만의 뉴스레터를 만들 수 있습니다.' },
  { icon: 'pi pi-arrows-alt', title: '드래그 앤 드롭', desc: '모듈을 끌어다 놓기만 하면 순서를 자유롭게 변경할 수 있습니다.' },
  { icon: 'pi pi-pencil', title: '실시간 편집', desc: '텍스트, 색상, 이미지, 링크를 속성 패널에서 바로 수정하고 캔버스에서 확인하세요.' },
  { icon: 'pi pi-file', title: '이메일 호환 HTML', desc: '생성된 HTML은 주요 이메일 클라이언트와 호환되는 인라인 스타일로 출력됩니다.' },
  { icon: 'pi pi-copy', title: '코드 복사 & 내보내기', desc: 'HTML 코드를 클립보드에 복사하거나 파일로 저장하여 어디서든 활용할 수 있습니다.' },
  { icon: 'pi pi-history', title: '실행 취소 / 다시 실행', desc: 'Ctrl+Z / Ctrl+Y로 편집 히스토리를 자유롭게 오갈 수 있습니다.' },
]
</script>

<template>
  <div class="landing-page bg-gray-50 text-gray-800 overflow-x-hidden">

    <!-- ===== TopNavBar ===== -->
    <nav class="fixed top-0 w-full z-50 bg-white border-b border-gray-200">
      <div class="flex justify-between items-center w-full max-w-screen-xl mx-auto xl:px-0 px-4 py-3 md:h-20">
        <div class="flex items-center">
          <img src="/src/assets/img/logo/logo.png" alt="Logo" class="w-8 h-8" />
          <span class="md:text-xl font-bold">Newsletter Builder</span>
        </div>
        <!-- <div class="hidden md:flex gap-8 items-center">
          <a
            v-for="link in navLinks"
            :key="link.href"
            :href="link.href"
            class="text-base font-medium text-gray-500 hover:text-blue-600 transition-colors"
          >
            {{ link.label }}
          </a>
        </div> -->
        <Button
          label="에디터 시작하기"
          icon="pi pi-arrow-right"
          iconPos="right"
          iconClass="!text-xs"
          variant="outlined"
          @click="goToEditor"
          class="!font-semibold !text-sm !gap-3"
        />
      </div>
    </nav>

    <main class="pt-20">

      <!-- ===== Hero Section ===== -->
      <section class="max-w-screen-xl mx-auto px-4 md:px-10 py-20 md:py-30 flex flex-col items-center text-center">
        <div class="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-base font-semibold mb-6">
          프로페셔널 뉴스레터 빌더
        </div>
        <h1 class="md:text-6xl text-4xl font-extrabold mb-6 text-gray-800">
          자동화 뉴스레터
        </h1>
        <p class="text-lg md:text-xl text-gray-500 max-w-2xl mb-10 leading-normal break-keep">
          누구나 쉽게 뉴스레터를 제작하고 만들고,<br />
          이메일 클라이언트에 최적화된 HTML을 바로 내보낼 수 있습니다.
        </p>
        <Button
          label="에디터 시작하기"
          @click="goToEditor"
          class="!px-10 !py-3 !text-lg !font-bold"
        />

        <!-- Hero Visual: Builder Mockup -->
        <div class="md:mt-20 mt-12 w-full max-w-5xl bg-white rounded-xl overflow-hidden shadow-2xl border border-gray-200">
          <!-- Window bar -->
          <div class="h-10 border-b border-gray-200 flex items-center gap-2 px-4">
            <div class="w-3 h-3 rounded-full bg-red-300"></div>
            <div class="w-3 h-3 rounded-full bg-amber-300"></div>
            <div class="w-3 h-3 rounded-full bg-green-300"></div>
          </div>
          <!-- Mock editor -->
          <div class="flex gap-4 p-4 h-[360px] bg-gray-50">
            <!-- Sidebar -->
            <div class="w-1/4 bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-2">
              <div class="h-4 w-1/2 bg-gray-200 rounded mb-2"></div>
              <div class="h-20 bg-gray-50 rounded border border-gray-200"></div>
              <div class="h-20 bg-gray-50 rounded border border-gray-200"></div>
            </div>
            <!-- Canvas -->
            <div class="flex-1 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
              <div class="w-3/4 h-3/4 border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center text-blue-500 text-lg font-medium break-keep">
                드래그 앤 드롭 영역
              </div>
            </div>
            <!-- Properties -->
            <div class="w-1/4 bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-2">
              <div class="h-4 w-2/3 bg-gray-200 rounded mb-2"></div>
              <div class="h-9 bg-gray-50 rounded border border-gray-200"></div>
              <div class="h-9 bg-gray-50 rounded border border-gray-200"></div>
              <div class="mt-2 flex gap-2">
                <div class="w-8 h-8 bg-blue-500 rounded"></div>
                <div class="w-8 h-8 bg-gray-100 border border-gray-300 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== How to Use / 3 Steps Section ===== -->
      <section id="how-it-works" class="bg-white py-20 md:py-30 px-4 md:px-10 border-t border-gray-200">
        <div class="max-w-screen-xl mx-auto">
          <div class="text-center md:mb-20 mb-12">
            <h2 class="text-4xl font-bold text-gray-900 mb-4">에디터 사용 방법</h2>
            <p class="text-lg md:text-xl text-gray-500">직관적이고 단순한 3단계 프로세스</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-10">
            <div
              v-for="step in steps"
              :key="step.no"
              class="relative bg-white md:p-8 md:pt-10 p-4 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <div class="absolute -top-6 -left-6 w-8 h-8 md:w-12 md:h-12 bg-blue-500 text-white rounded-full items-center justify-center text-xl font-bold shadow-md md:flex hidden">
                {{ step.no }}
              </div>
              <div class="md:w-16 md:h-16 w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center md:mb-6 mb-4 text-blue-600">
                <i :class="step.icon"></i>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mb-4">{{ step.title }}</h3>
              <p class="text-base text-gray-500 leading-relaxed break-keep">{{ step.desc }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== Features Grid ===== -->
      <section id="features" class="bg-white py-20 md:py-30 px-4 md:px-10 border-t border-gray-200">
        <div class="max-w-screen-xl mx-auto">
          <div class="text-center md:mb-20 mb-12">
            <h2 class="text-4xl font-bold text-gray-900 mb-4">기능 살펴보기</h2>
            <p class="text-lg md:text-xl text-gray-500">완벽한 뉴스레터 제작을 위한 핵심 기능</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:gap-8 gap-4">
            <div
              v-for="feature in features"
              :key="feature.title"
              class="bg-gray-50 md:p-8 p-6 rounded-xl border border-gray-200 hover:shadow-lg hover:bg-white transition-all flex flex-col gap-4"
            >
              <div class="text-blue-500">
                <i :class="feature.icon" class="text-2xl"></i>
              </div>
              <h3 class="text-xl font-bold text-gray-900">{{ feature.title }}</h3>
              <p class="text-base text-gray-500 leading-relaxed break-keep">{{ feature.desc }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== CTA Section ===== -->
      <section class="py-20 md:py-30 px-4 md:px-10 text-center bg-blue-100/70">
        <div class="max-w-3xl mx-auto">
          <h2 class="text-4xl font-extrabold text-gray-900 mb-6">
            지금 바로 시작하세요
          </h2>
          <p class="text-lg text-gray-600 mb-10 max-w-lg mx-auto break-keep">
            별도의 설치나 회원가입 없이 바로 사용할 수 있습니다.
          </p>
          <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              label="에디터 시작하기"
              icon="pi pi-arrow-right"
              iconPos="right"
              @click="goToEditor"
              class="!px-8 !py-4 !font-bold !text-lg !gap-3"
            />
          </div>
        </div>
      </section>

    </main>

    <!-- ===== Footer ===== -->
    <footer class="bg-white w-full border-t border-gray-200">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8 w-full px-4 md:px-10 py-12 max-w-screen-xl mx-auto">
        <div class="md:col-span-3">
          <div class="flex items-center mb-4">
            <img src="/src/assets/img/logo/logo.png" alt="Logo" class="w-7 h-7" />
            <span class="text-lg font-bold text-blue-600">Newsletter Builder</span>
          </div>
          <p class="text-base text-gray-400 leading-relaxed break-keep">
            모듈 기반 HTML 뉴스레터 빌더. Vue 3, TypeScript, PrimeVue로 제작되었습니다.
          </p>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-base font-bold text-gray-800 mb-1">Navigation</span>
          <a
            v-for="link in navLinks"
            :key="link.href"
            :href="link.href"
            class="text-base text-gray-400 hover:text-blue-600 transition-colors"
          >
            {{ link.label }}
          </a>
        </div>
      </div>
      <div class="px-4 md:px-10 py-5 border-t border-gray-100 flex justify-between items-center mx-auto">
        <span class="text-base text-gray-400">&copy; 2026 Newsletter Builder</span>
      </div>
    </footer>

  </div>
</template>

<style scoped>
.landing-page {
  overflow-x: hidden;
}
</style>
