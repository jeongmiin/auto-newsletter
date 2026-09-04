<script setup lang="ts">
/**
 * 템플릿 미리보기 모달 (Figma 1468-9405).
 *
 * 카드의 '미리보기'를 누르면 뜬다. 위에 PC/모바일 전환과 '이 템플릿 선택하기', 아래에 메일 본문.
 * 본문은 헤더 '미리보기'와 같은 문서(emailPreviewDoc)를 iframe 에 넣는다 — 스토어를
 * 건드리지 않고 그 템플릿만 렌더한다(renderTemplateHtml).
 */
import { ref, watch } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import { processQuillHtml } from '@/utils/quillHtmlProcessor'
import { buildEmailPreviewDocument } from '@/utils/emailPreviewDoc'
import type { NewsletterTemplate } from '@/types'

const props = defineProps<{
  /** 보여줄 템플릿. null 이면 닫힌 상태 */
  template: NewsletterTemplate | null
}>()

const emit = defineEmits<{
  close: []
  /** '이 템플릿 선택하기' */
  select: [NewsletterTemplate]
}>()

const moduleStore = useModuleStore()

const mode = ref<'pc' | 'mobile'>('pc')
const srcdoc = ref('')
const loading = ref(false)
const errorText = ref('')

/** 템플릿이 바뀔 때마다 새로 렌더 — 닫히면(null) 비운다 */
watch(
  () => props.template,
  async (template) => {
    srcdoc.value = ''
    errorText.value = ''
    mode.value = 'pc'
    if (!template) return
    loading.value = true
    try {
      const html = await moduleStore.renderTemplateHtml(template)
      // 같은 템플릿을 보는 동안만 결과를 쓴다(빨리 닫고 다른 걸 열었을 때 뒤늦게 덮지 않게)
      if (props.template?.id !== template.id) return
      srcdoc.value = buildEmailPreviewDocument(processQuillHtml(html))
    } catch (err) {
      console.warn('[TemplatePreview] 렌더 실패:', template.id, err)
      errorText.value = '미리보기를 만들지 못했어요. 다시 시도해 주세요.'
    } finally {
      loading.value = false
    }
  },
)

const select = () => {
  if (props.template) emit('select', props.template)
}
</script>

<template>
  <Dialog
    :visible="template !== null"
    modal
    :show-header="false"
    :draggable="false"
    :dismissable-mask="true"
    class="tp-dialog"
    :style="{ width: '680px', maxWidth: '96vw' }"
    :pt="{ content: { class: 'tp-dialog-content' } }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <div class="tp-head">
      <!-- PC/모바일 — 헤더의 캔버스 폭 전환과 같은 아이콘 -->
      <div class="tp-seg" role="group" aria-label="미리보기 기기">
        <button
          type="button"
          class="tp-seg-btn"
          :class="{ 'is-active': mode === 'pc' }"
          title="PC 화면"
          @click="mode = 'pc'"
        >
          <span class="material-symbols-outlined">desktop_windows</span>
        </button>
        <button
          type="button"
          class="tp-seg-btn"
          :class="{ 'is-active': mode === 'mobile' }"
          title="모바일 화면"
          @click="mode = 'mobile'"
        >
          <span class="material-symbols-outlined">smartphone</span>
        </button>
      </div>

      <div class="tp-head-right">
        <button type="button" class="tp-select-btn" @click="select">이 템플릿 선택하기</button>
        <button type="button" class="tp-close" title="닫기" @click="emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>

    <div class="tp-body" :class="{ 'tp-body--mobile': mode === 'mobile' }">
      <iframe
        v-if="srcdoc"
        :srcdoc="srcdoc"
        class="tp-frame"
        :title="template ? `${template.name} 미리보기` : '미리보기'"
        sandbox="allow-same-origin"
      ></iframe>
      <p v-else-if="errorText" class="tp-state tp-state--error">{{ errorText }}</p>
      <p v-else-if="loading" class="tp-state">
        <i class="pi pi-spin pi-spinner"></i>
        미리보기를 만드는 중…
      </p>
    </div>
  </Dialog>
</template>

<style scoped>
/* 모달 전체 750px — 위 80px 머리 + 아래 본문 */
.tp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 80px;
  padding: 20px;
  background: var(--gray-50);
  border-bottom: 1px solid var(--gray-200);
}

/* PC/모바일 — 회색 알약 트랙 위에 검은 활성 칸 */
.tp-seg {
  display: inline-flex;
  padding: 0;
  border-radius: 1000px;
  background: var(--gray-100);
}
.tp-seg-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 33px;
  border: 0;
  border-radius: 1000px;
  background: transparent;
  color: var(--gray-600);
  cursor: pointer;
}
.tp-seg-btn:hover {
  color: var(--gray-800);
}
.tp-seg-btn.is-active {
  /* Figma gray/900(#191f28) = 이 프로젝트의 --gray-800 */
  background: var(--gray-800);
  color: var(--white);
}
.tp-seg-btn .material-symbols-outlined {
  font-size: 22px;
}

.tp-head-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tp-select-btn {
  height: 40px;
  padding: 0 16px;
  border: 0;
  border-radius: 8px;
  background: var(--blue-400);
  color: var(--white);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}
.tp-select-btn:hover {
  background: var(--blue-500);
}
.tp-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--gray-600);
  cursor: pointer;
}
.tp-close:hover {
  background: var(--gray-100);
  color: var(--gray-800);
}

/* 본문 — 흰 바탕에 20px 여백, 메일은 iframe 이 스스로 스크롤한다 */
.tp-body {
  display: flex;
  justify-content: center;
  height: 670px;
  max-height: calc(92vh - 80px);
  padding: 20px;
  background: var(--white);
}
.tp-frame {
  width: 100%;
  height: 100%;
  border: 0;
  background: var(--white);
  transition: width 0.2s ease;
}
/* 모바일 — 메일 클라이언트 폭(375px)으로 좁혀 반응형이 실제로 동작하는지 본다 */
.tp-body--mobile .tp-frame {
  width: 375px;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
}
.tp-state {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: auto;
  font-size: 15px;
  color: var(--gray-600);
}
.tp-state--error {
  color: var(--red-700);
}
</style>

<style>
/* Dialog 본문은 body 로 텔레포트되어 scoped 가 닿지 않는다 — 기본 패딩·둥글기만 걷어낸다 */
.tp-dialog .tp-dialog-content {
  padding: 0;
  overflow: hidden;
  border-radius: 8px;
}
</style>
