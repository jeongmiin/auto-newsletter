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
  <div class="landing-page bg-gray-50 text-gray-800 overflow-x-hidden">

    <!-- ===== TopNavBar ===== -->
    <nav class="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
      <div class="flex justify-between items-center w-full max-w-screen-xl mx-auto p-4">
        <div class="flex items-center gap-2">
          <img src="/src/assets/img/logo/logo.png" alt="Logo" class="w-7 h-7" />
          <span class="font-semibold text-gray-800">Newsletter Builder</span>
        </div>
        <div class="hidden md:flex gap-8 items-center">
          <a href="#process" class="text-blue-600 border-b-2 border-blue-600 pb-0.5 font-semibold text-sm">Process</a>
          <a href="#engine" class="text-gray-400 hover:text-gray-800 transition-colors font-semibold text-sm">Engine</a>
          <a href="#features" class="text-gray-400 hover:text-gray-800 transition-colors font-semibold text-sm">Features</a>
        </div>
        <Button
          label="에디터 시작하기"
          icon="pi pi-arrow-right"
          iconPos="right"
          iconClass="!text-xs"
          @click="goToEditor"
          class="!font-semibold !text-sm !gap-3"
        />
      </div>
    </nav>

    <main class="pt-24">

      <!-- ===== Hero Section ===== -->
      <section class="px-8 md:px-12 max-w-screen-xl mx-auto mb-24 lg:mb-32">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-0 items-start">
          <div class="lg:col-span-7 z-10">
            <h2 class="text-6xl leading-tight font-extrabold  mb-8 text-gray-900">
              코딩 없이 만드는<br />
              <span class="text-blue-500">HTML 뉴스레터</span>
            </h2>
          </div>
          <div class="lg:col-span-5 lg:pt-8">
            <p class="text-base text-gray-500 leading-relaxed mb-4 break-keep">
              드래그 앤 드롭으로 모듈을 조합하고, 실시간으로 편집하세요.
              이메일 클라이언트에 최적화된 HTML을 바로 내보낼 수 있습니다.
            </p>
            <div class="flex flex-col gap-4">
              <div class="w-full h-px bg-gray-200"></div>
              <div class="flex justify-between items-center py-1">
                <span class="text-xs tracking-widest uppercase text-gray-400">System</span>
                <span class="text-xs tracking-widest uppercase text-blue-600 font-semibold">V 1.0 Builder</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Hero Visual: Builder Mockup -->
        <div class="mt-12 w-full bg-gray-100 overflow-hidden relative border border-gray-200" style="aspect-ratio: 21/9;">
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-4/5 h-4/5 bg-white border border-gray-200 flex shadow-lg">
              <!-- Sidebar -->
              <div class="w-1/4 border-r border-gray-100 p-4 flex flex-col gap-3">
                <div class="h-6 bg-gray-100 rounded"></div>
                <div class="h-6 bg-blue-500 rounded"></div>
                <div class="h-6 bg-gray-100 rounded"></div>
                <div class="h-6 bg-gray-100 rounded"></div>
              </div>
              <!-- Canvas -->
              <div class="flex-1 bg-gray-50 p-6 flex flex-col gap-4">
                <div class="h-8 bg-blue-500 w-3/4 rounded"></div>
                <div class="h-24 bg-white border-2 border-blue-400 rounded relative shadow-sm">
                  <div class="absolute -top-2 -right-2 bg-blue-500 text-white w-4 h-4 rounded-full flex items-center justify-center">
                    <i class="pi pi-arrows-alt text-3xs"></i>
                  </div>
                </div>
                <div class="flex gap-4">
                  <div class="h-4 flex-1 bg-gray-200 rounded"></div>
                  <div class="h-4 flex-1 bg-gray-200 rounded"></div>
                </div>
                <div class="h-4 w-2/3 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== 3 Steps Section ===== -->
      <section id="process" class="bg-white py-24 lg:py-32 px-8 md:px-12 border-t border-gray-200/50">
        <div class="max-w-screen-xl mx-auto">
          <div class="mb-20">
            <span class="text-sm tracking-widest uppercase text-gray-400 block mb-3">Methodology</span>
            <h2 class="text-6xl leading-tight font-extrabold  text-gray-900">
              3단계로 완성하는 뉴스레터
            </h2>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-16">
            <!-- Step 1 -->
            <div class="group">
              <div class="mb-6 font-extrabold text-5xl text-gray-100 group-hover:text-blue-500 transition-colors">01</div>
              <h3 class="text-lg font-semibold  mb-3 text-gray-800">모듈 선택</h3>
              <p class="text-gray-500 text-sm leading-relaxed mb-8">
                26개 이상의 모듈 라이브러리에서 헤더, 본문, 이미지, 버튼, 테이블 등을 선택하여 캔버스에 추가합니다.
              </p>
              <div class="aspect-square bg-gray-50 border border-gray-100 rounded-lg p-6 flex flex-col gap-3">
                <div class="w-1/2 h-6 bg-gray-200 rounded"></div>
                <div class="w-full h-20 bg-gray-100 rounded"></div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="h-16 bg-gray-200 rounded"></div>
                  <div class="h-16 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
            <!-- Step 2 -->
            <div class="group">
              <div class="mb-6 font-extrabold text-5xl text-gray-100 group-hover:text-blue-500 transition-colors">02</div>
              <h3 class="text-lg font-semibold  mb-3 text-gray-800">속성 편집</h3>
              <p class="text-gray-500 text-sm leading-relaxed mb-8">
                오른쪽 속성 패널에서 텍스트, 색상, 이미지, 링크를 자유롭게 수정하고 캔버스에서 실시간으로 확인합니다.
              </p>
              <div class="aspect-square bg-gray-50 border border-gray-100 rounded-lg p-6 flex flex-col gap-5">
                <div class="space-y-2">
                  <div class="h-2 w-16 bg-gray-300 rounded"></div>
                  <div class="h-1 w-full bg-blue-500 rounded"></div>
                </div>
                <div class="space-y-2">
                  <div class="h-2 w-24 bg-gray-300 rounded"></div>
                  <div class="h-1 w-3/4 bg-gray-300 rounded"></div>
                </div>
                <div class="mt-auto flex gap-2">
                  <div class="w-8 h-8 bg-blue-500 rounded"></div>
                  <div class="w-8 h-8 bg-gray-200 border border-gray-300 rounded"></div>
                </div>
              </div>
            </div>
            <!-- Step 3 -->
            <div class="group">
              <div class="mb-6 font-extrabold text-5xl text-gray-100 group-hover:text-blue-500 transition-colors">03</div>
              <h3 class="text-lg font-semibold  mb-3 text-gray-800">내보내기</h3>
              <p class="text-gray-500 text-sm leading-relaxed mb-8">
                완성된 뉴스레터를 HTML 코드로 복사하거나 파일로 내려받습니다. 모든 이메일 클라이언트와 호환됩니다.
              </p>
              <div class="aspect-square bg-blue-500 rounded-lg flex flex-col items-center justify-center p-12 text-center">
                <i class="pi pi-check-circle text-white text-5xl mb-4"></i>
                <div class="text-white text-xs tracking-widest uppercase font-medium">Export Complete</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== Feature Highlight ===== -->
      <section id="engine" class="py-24 lg:py-32 px-8 md:px-12 max-w-screen-xl mx-auto">
        <div class="flex flex-col lg:flex-row gap-4 lg:gap-20 items-center">
          <!-- Left: Text -->
          <div class="w-full lg:w-1/2">
            <span class="text-sm tracking-widest uppercase text-gray-400 block mb-3">Core Engine</span>
            <h2 class="text-6xl leading-tight font-extrabold  text-gray-900">
              이메일 제작에<br />최적화된 도구
            </h2>
            <div class="space-y-8 mt-10">
              <div v-for="af in advancedFeatures" :key="af.title" class="flex gap-4">
                <div class="shrink-0 w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                  <i :class="af.icon" class="text-blue-600 text-base"></i>
                </div>
                <div>
                  <h4 class="font-semibold text-gray-800  mb-1">{{ af.title }}</h4>
                  <p class="text-sm text-gray-500 leading-relaxed break-keep">{{ af.desc }}</p>
                </div>
              </div>
            </div>
          </div>
          <!-- Right: Live Interface Mockup -->
          <div class="w-full lg:w-1/2 bg-gray-100 relative p-6 rounded-lg">
            <div class="absolute -top-3 -left-3 bg-blue-500 text-white px-3 py-1.5 text-2xs tracking-widest uppercase z-20 font-semibold rounded">
              Live Interface
            </div>
            <div class="bg-white min-h-80 border border-gray-200 rounded-lg relative overflow-hidden shadow-sm">
              <!-- Toolbar -->
              <div class="h-10 border-b border-gray-100 flex items-center px-4 justify-between">
                <div class="flex gap-1.5">
                  <div class="w-2.5 h-2.5 rounded-full bg-red-300"></div>
                  <div class="w-2.5 h-2.5 rounded-full bg-amber-300"></div>
                  <div class="w-2.5 h-2.5 rounded-full bg-green-300"></div>
                </div>
                <div class="text-2xs text-gray-400 ">newsletter_v1.html</div>
                <div class="flex gap-3">
                  <i class="pi pi-desktop text-xs text-gray-400"></i>
                  <i class="pi pi-mobile text-xs text-gray-400"></i>
                </div>
              </div>
              <!-- Builder Content -->
              <div class="p-6 space-y-5">
                <div class="text-2xl font-extrabold leading-none  text-gray-900">
                  NEWSLETTER<br /><span class="text-blue-500">VOL.1</span>
                </div>
                <div class="w-full h-24 bg-gray-50 rounded border border-gray-100"></div>
                <div class="space-y-2.5">
                  <div class="h-3 w-full bg-gray-100 rounded"></div>
                  <div class="h-3 w-full bg-gray-100 rounded"></div>
                  <div class="h-3 w-2/3 bg-gray-100 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== Features Grid ===== -->
      <section id="features" class="bg-white py-24 lg:py-32 px-8 md:px-12 border-t border-gray-200/50">
        <div class="max-w-screen-xl mx-auto">
          <div class="mb-16">
            <span class="text-sm tracking-widest uppercase text-gray-400 block mb-3">Capabilities</span>
            <h2 class="text-6xl leading-tight font-extrabold  text-gray-900">주요 기능</h2>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-200 rounded-lg overflow-hidden">
            <div class="bg-gray-50 p-8 group hover:bg-white transition-colors">
              <i class="pi pi-th-large text-lg text-blue-500 mb-4 block"></i>
              <h3 class="text-sm font-semibold  mb-2 text-gray-800">26+ 모듈 템플릿</h3>
              <p class="text-sm text-gray-500 leading-relaxed">헤더, 본문, 이미지, 버튼, 테이블 등 다양한 모듈을 조합하여 나만의 뉴스레터를 만들 수 있습니다.</p>
            </div>
            <div class="bg-gray-50 p-8 group hover:bg-white transition-colors">
              <i class="pi pi-arrows-alt text-lg text-blue-500 mb-4 block"></i>
              <h3 class="text-sm font-semibold  mb-2 text-gray-800">드래그 앤 드롭</h3>
              <p class="text-sm text-gray-500 leading-relaxed">모듈을 끌어다 놓기만 하면 순서를 자유롭게 변경할 수 있습니다.</p>
            </div>
            <div class="bg-gray-50 p-8 group hover:bg-white transition-colors">
              <i class="pi pi-pencil text-lg text-blue-500 mb-4 block"></i>
              <h3 class="text-sm font-semibold  mb-2 text-gray-800">실시간 편집</h3>
              <p class="text-sm text-gray-500 leading-relaxed">텍스트, 색상, 이미지, 링크를 속성 패널에서 바로 수정하고 캔버스에서 확인하세요.</p>
            </div>
            <div class="bg-gray-50 p-8 group hover:bg-white transition-colors">
              <i class="pi pi-desktop text-lg text-blue-500 mb-4 block"></i>
              <h3 class="text-sm font-semibold  mb-2 text-gray-800">이메일 호환 HTML</h3>
              <p class="text-sm text-gray-500 leading-relaxed">생성된 HTML은 주요 이메일 클라이언트와 호환되는 인라인 스타일로 출력됩니다.</p>
            </div>
            <div class="bg-gray-50 p-8 group hover:bg-white transition-colors">
              <i class="pi pi-copy text-lg text-blue-500 mb-4 block"></i>
              <h3 class="text-sm font-semibold  mb-2 text-gray-800">코드 복사 & 내보내기</h3>
              <p class="text-sm text-gray-500 leading-relaxed">HTML 코드를 클립보드에 복사하거나 파일로 저장하여 어디서든 활용할 수 있습니다.</p>
            </div>
            <div class="bg-gray-50 p-8 group hover:bg-white transition-colors">
              <i class="pi pi-history text-lg text-blue-500 mb-4 block"></i>
              <h3 class="text-sm font-semibold  mb-2 text-gray-800">실행 취소 / 다시 실행</h3>
              <p class="text-sm text-gray-500 leading-relaxed">Ctrl+Z / Ctrl+Y로 편집 히스토리를 자유롭게 오갈 수 있습니다.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== CTA Section ===== -->
      <section class="py-24 lg:py-32 px-8 md:px-12 text-center bg-blue-200">
        <div class="max-w-3xl mx-auto">
          <h2 class="text-3xl md:text-5xl font-extrabold  mb-6">
            지금 바로 시작하세요
          </h2>
          <p class=" text-base mb-10 max-w-lg mx-auto">
            별도의 설치나 회원가입 없이 바로 사용할 수 있습니다.
          </p>
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
      </section>

    </main>

    <!-- ===== Footer ===== -->
    <footer class="bg-white w-full border-t border-gray-200/50">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8 w-full px-8 md:px-12 py-12 max-w-screen-xl mx-auto">
        <div class="md:col-span-3">
          <div class="flex items-center gap-2 mb-4">
            <img src="/src/assets/img/logo/logo.png" alt="Logo" class="w-6 h-6" />
            <span class="font-semibold text-gray-800 ">Newsletter Builder</span>
          </div>
          <p class="text-xs text-gray-400 leading-relaxed">
            모듈 기반 HTML 뉴스레터 빌더. Vue 3, TypeScript, PrimeVue로 제작되었습니다.
          </p>
        </div>
        <div class="flex gap-4">
          <span class="font-semibold text-gray-800 text-sm mb-2">Navigation</span>
          <a href="#process" class="text-sm text-gray-400 hover:text-blue-600 transition-colors">Process</a>
          <a href="#engine" class="text-sm text-gray-400 hover:text-blue-600 transition-colors">Engine</a>
          <a href="#features" class="text-sm text-gray-400 hover:text-blue-600 transition-colors">Features</a>
        </div>
      </div>
      <div class="px-8 md:px-12 py-5 border-t border-gray-100 flex justify-between items-center max-w-screen-xl mx-auto">
        <span class="text-xs text-gray-400">&copy; 2025 Newsletter Builder</span>
      </div>
    </footer>

  </div>
</template>

<style scoped>
.landing-page {
  overflow-x: hidden;
}
</style>
