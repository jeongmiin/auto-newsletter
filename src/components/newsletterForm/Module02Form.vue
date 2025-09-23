<script setup lang="ts">
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'

interface TableRow {
  header: string
  content: string
}

const moduleTwoTitle = defineModel<string>('moduleTwoTitle', { required: true })
const moduleTwoImageUrl = defineModel<string>('moduleTwoImageUrl', { required: true })
const moduleTwoImageAlt = defineModel<string>('moduleTwoImageAlt', { required: true })
const moduleTwoMainTitle = defineModel<string>('moduleTwoMainTitle', { required: true })
const moduleTwoDescription = defineModel<string>('moduleTwoDescription', { required: true })
const moduleTwoTableRows = defineModel<TableRow[]>('moduleTwoTableRows', { required: true })
const moduleTwoButtonText = defineModel<string>('moduleTwoButtonText', { required: true })
const moduleTwoButtonUrl = defineModel<string>('moduleTwoButtonUrl', { required: true })
const moduleTwoShowTable = defineModel<boolean>('moduleTwoShowTable', { required: true })
const moduleTwoShowButton = defineModel<boolean>('moduleTwoShowButton', { required: true })

const addTableRow = () => {
  moduleTwoTableRows.value?.push({ header: '', content: '' })
}

const removeTableRow = () => {
  if (moduleTwoTableRows.value && moduleTwoTableRows.value.length > 1) {
    moduleTwoTableRows.value.pop()
  }
}
</script>

<template>
  <article>
    <h2 class="text-md font-semibold mb-1">모듈 02</h2>
    <div class="grid gap-3">
      <!-- 섹션 타이틀 -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700">섹션 타이틀</label>
        <InputText
          v-model="moduleTwoTitle"
          type="text"
          size="small"
          placeholder="모듈02 타이틀 영역"
          class="w-full"
        />
      </div>

      <!-- 이미지 정보 -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700">이미지 정보</label>
        <div class="grid gap-2">
          <InputText
            v-model="moduleTwoImageUrl"
            type="text"
            size="small"
            placeholder="이미지 URL"
            class="w-full"
          />
          <InputText
            v-model="moduleTwoImageAlt"
            type="text"
            size="small"
            placeholder="이미지 대체 텍스트"
            class="w-full"
          />
        </div>
      </div>

      <!-- 메인 타이틀 -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700">메인 타이틀</label>
        <Textarea
          v-model="moduleTwoMainTitle"
          placeholder="메인 타이틀 (줄바꿈은 엔터로 구분)"
          rows="3"
          class="w-full"
          size="small"
        />
      </div>

      <!-- 설명 -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700">설명</label>
        <Textarea
          v-model="moduleTwoDescription"
          placeholder="상세 설명"
          rows="4"
          class="w-full"
          size="small"
        />
      </div>

      <!-- 테이블 정보 -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <Checkbox v-model="moduleTwoShowTable" :binary="true" />
          <label class="text-sm font-medium text-gray-700">테이블 사용</label>
        </div>

        <div v-if="moduleTwoShowTable" class="bg-gray-100 p-3 grid gap-2">
          <div
            v-for="(row, index) in moduleTwoTableRows"
            :key="index"
            class="grid grid-cols-1 gap-2 p-2 bg-white rounded border"
          >
            <InputText
              v-model="row.header"
              type="text"
              size="small"
              :placeholder="`헤더 ${index + 1}`"
              class="w-full"
            />
            <Textarea
              v-model="row.content"
              :placeholder="`내용 ${index + 1} (줄바꿈은 엔터로 구분)`"
              rows="2"
              class="w-full"
              size="small"
            />
          </div>

          <div class="flex gap-2 mt-2">
            <Button type="button" size="small" @click="addTableRow"> 행 추가 </Button>
            <Button
              type="button"
              size="small"
              severity="secondary"
              variant="outlined"
              :disabled="!moduleTwoTableRows || moduleTwoTableRows.length === 1"
              @click="removeTableRow"
            >
              행 삭제
            </Button>
          </div>
        </div>
      </div>

      <!-- 버튼 정보 -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <Checkbox v-model="moduleTwoShowButton" :binary="true" />
          <label class="text-sm font-medium text-gray-700">버튼 사용</label>
        </div>

        <div v-if="moduleTwoShowButton" class="grid gap-2">
          <InputText
            v-model="moduleTwoButtonText"
            type="text"
            size="small"
            placeholder="버튼 텍스트"
            class="w-full"
          />
          <InputText
            v-model="moduleTwoButtonUrl"
            type="text"
            size="small"
            placeholder="버튼 링크 URL"
            class="w-full"
          />
        </div>
      </div>
    </div>
  </article>
</template>
