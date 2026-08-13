import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// CSS를 먼저 import (토큰 → 전역 → 패널 순서)
import './assets/tokens.css'
import './assets/main.css'
import './assets/panels.css'
import 'primeicons/primeicons.css'

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

// Fetch 요청 로깅 (개발 환경에서만 실행)
if (import.meta.env.DEV) {
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
import { definePreset } from '@primevue/themes'

// 디자인 시스템 팔레트를 PrimeVue 테마에 그대로 넣는다 —
// 버튼·토글·체크박스 같은 PrimeVue 컴포넌트가 우리 UI(assets/tokens.css)와 같은 색을 쓰도록.
// ⚠ 값을 바꿀 땐 assets/tokens.css도 함께 고칠 것 (두 곳이 같은 팔레트를 복제한다).
// 900·950은 팔레트에 없어 각 계열 끝(800)에서 한 단계씩 더 어둡게 이어 붙였다.
const BluePreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#ebf3ff',
      100: '#c2dcff',
      200: '#99c4ff',
      300: '#70acff',
      400: '#4083f3',
      500: '#2563d4',
      600: '#1a47b0',
      700: '#112f85',
      800: '#091c58',
      900: '#061340',
      950: '#030a22',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#f9fafb',
          100: '#f2f4f6',
          200: '#e5e8eb',
          300: '#d1d6db',
          400: '#b0b8c1',
          500: '#8b95a1',
          600: '#6b7684',
          700: '#4e5968',
          800: '#191f28',
          900: '#11161d',
          950: '#0a0d12',
        },
      },
    },
  },
})

// PrimeVue 컴포넌트
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import Editor from 'primevue/editor'
import ColorPicker from 'primevue/colorpicker'
import Dialog from 'primevue/dialog'

// Quill 커스텀 포맷 등록 (PrimeVue Editor가 Quill 인스턴스를 만들기 전에 실행)
import { registerHighlightMarker } from './utils/quillHighlightMarker'
import { registerLineHeight } from './utils/quillLineHeight'
import { registerWordBreak } from './utils/quillWordBreak'
import { registerFontSize } from './utils/quillFontSize'
import { registerLetterSpacing } from './utils/quillLetterSpacing'
import { disableNumericListAutofill } from './utils/quillListAutofill'
registerHighlightMarker()
registerLineHeight()
registerWordBreak()
registerFontSize()
registerLetterSpacing()
disableNumericListAutofill()
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import Panel from 'primevue/panel'
import Tooltip from 'primevue/tooltip'

const app = createApp(App)

// Pinia 상태 관리
const pinia = createPinia()
app.use(pinia)

// Router 사용
app.use(router)

// PrimeVue 설정 (블루 테마)
app.use(PrimeVue, {
  theme: {
    preset: BluePreset,
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
/* eslint-disable vue/multi-word-component-names */
/* eslint-disable vue/no-reserved-component-names */
app.component('Button', Button)
app.component('InputText', InputText)
app.component('Textarea', Textarea)
app.component('Checkbox', Checkbox)
app.component('Toast', Toast)
app.component('ConfirmDialog', ConfirmDialog)
app.component('Dialog', Dialog)
app.component('Editor', Editor)
app.component('ColorPicker', ColorPicker)
app.component('Select', Select)
app.component('ToggleSwitch', ToggleSwitch)
app.component('Panel', Panel)

// 전역 디렉티브 등록
app.directive('tooltip', Tooltip)
/* eslint-enable vue/no-reserved-component-names */
/* eslint-enable vue/multi-word-component-names */

app.mount('#app')
