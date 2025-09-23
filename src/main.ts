import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// CSS를 먼저 import
import './assets/main.css'

// PrimeVue 관련 import
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Aura from '@primevue/themes/aura'

// 컴포넌트
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/Textarea'
import Editor from 'primevue/Editor'
import Checkbox from 'primevue/checkbox'
import CheckboxGroup from 'primevue/checkboxgroup'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'

const app = createApp(App)

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
app.component('Editor', Editor)
app.component('Checkbox', Checkbox)
app.component('CheckboxGroup', CheckboxGroup)
app.component('Toast', Toast)
app.component('ConfirmDialog', ConfirmDialog)

app.mount('#app')
