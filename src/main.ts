import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// CSS를 먼저 import
import './assets/main.css'

// Quill 에디터 스타일
import 'quill/dist/quill.snow.css'

// ============= 전역 에러 핸들러 =============
// Unhandled Promise Rejection 감지
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global] Unhandled promise rejection:', event.reason)
  console.error('[Global] Promise:', event.promise)
})

// 전역 에러 핸들러
window.addEventListener('error', (event) => {
  console.error('[Global] Error:', event.error)
  console.error('[Global] Message:', event.message)
})

// Fetch 요청 로깅 (디버깅용)
const originalFetch = window.fetch
window.fetch = async (...args: Parameters<typeof fetch>) => {
  const firstArg = args[0]
  const url =
    typeof firstArg === 'string'
      ? firstArg
      : firstArg instanceof Request
        ? firstArg.url
        : String(firstArg)
  console.log('[Fetch] Request:', url)

  try {
    const response = await originalFetch(...args)
    if (!response.ok) {
      console.error('[Fetch] Failed:', url, 'Status:', response.status, response.statusText)
    } else {
      console.log('[Fetch] Success:', url, 'Status:', response.status)
    }
    return response
  } catch (error) {
    console.error('[Fetch] Error:', url, error)
    throw error
  }
}

// 환경 정보 로깅
console.log('[App] Base URL:', import.meta.env.BASE_URL)
console.log('[App] Mode:', import.meta.env.MODE)
console.log('[App] Production:', import.meta.env.PROD)

// PrimeVue 관련 import
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Aura from '@primevue/themes/aura'

// PrimeVue 컴포넌트
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'

const app = createApp(App)

// Pinia 상태 관리
const pinia = createPinia()
app.use(pinia)

// Router 사용
app.use(router)

// PrimeVue 설정
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: 'system',
      cssLayer: false,
    },
  },
})

// PrimeVue 서비스들
app.use(ToastService)
app.use(ConfirmationService)

// 전역 컴포넌트 등록
app.component('Button', Button)
app.component('InputText', InputText)
app.component('Textarea', Textarea)
app.component('Checkbox', Checkbox)
app.component('Toast', Toast)
app.component('ConfirmDialog', ConfirmDialog)

app.mount('#app')
