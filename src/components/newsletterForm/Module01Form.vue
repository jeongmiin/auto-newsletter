<script setup lang="ts">
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
// import type { ModuleOneData } from '@/views/HomeView.vue'
// import type { Module } from '@/views/HomeView.vue'

interface ModuleOneItem {
  redtitle: string
  desc: string
}

const moduleOneTitle = defineModel<string>('moduleOneTitle', { required: true })
const moduleOneSubtitle = defineModel<string>('moduleOneSubtitle', { required: true })
const moduleOneItems = defineModel<ModuleOneItem[]>('moduleOneItems', { required: true })

const addModuleOneItem = () => {
  moduleOneItems.value?.push({ redtitle: '', desc: '' })
}

const removeModuleOneItem = () => {
  if (moduleOneItems.value && moduleOneItems.value.length > 1) {
    moduleOneItems.value.pop()
  }
}
</script>

<template>
  <article>
    <h2 class="text-md font-semibold mb-1">모듈 01</h2>
    <div class="grid gap-2">
      <InputText
        v-model="moduleOneTitle"
        type="text"
        size="small"
        placeholder="모듈01 타이틀"
        class="w-full"
      />
      <InputText
        v-model="moduleOneSubtitle"
        type="text"
        size="small"
        placeholder="모듈 01 서브 타이틀"
        class="w-full"
      />
      <div class="bg-gray-100 p-3 grid gap-2">
        <div v-for="(item, index) in moduleOneItems" :key="index" class="grid gap-2">
          <InputText
            v-model="item.redtitle"
            type="text"
            size="small"
            :placeholder="`아이템 타이틀 ${index + 1}`"
            class="w-full"
          />
          <InputText
            v-model="item.desc"
            :placeholder="`아이템 설명 ${index + 1}`"
            size="small"
            class="w-full"
          />
        </div>
        <div class="flex gap-2 mt-4">
          <Button type="button" size="small" @click="addModuleOneItem"> 추가하기 </Button>
          <Button
            type="button"
            size="small"
            severity="secondary"
            variant="outlined"
            :disabled="!moduleOneItems || moduleOneItems.length === 1"
            @click="removeModuleOneItem"
          >
            삭제하기
          </Button>
        </div>
      </div>
    </div>
  </article>
</template>
