<template>
  <div class="h-full flex flex-col">
    <!-- 패널 헤더 -->
    <div class="p-4 border-b">
      <h2 class="text-lg font-semibold text-gray-800">속성</h2>
    </div>

    <!-- 선택된 모듈이 없을 때 -->
    <div v-if="!selectedModule" class="flex-1 flex items-center justify-center text-gray-500">
      <div class="text-center">
        <div class="text-2xl mb-2">📝</div>
        <div>모듈을 선택해주세요</div>
      </div>
    </div>

    <!-- 선택된 모듈이 있을 때 -->
    <div v-else class="flex-1 overflow-y-auto">
      <!-- 모듈 정보 -->
      <div class="p-4 border-b bg-gray-50">
        <div class="font-medium">{{ selectedModuleMetadata?.name }}</div>
        <div class="text-sm text-gray-600">{{ selectedModuleMetadata?.description }}</div>
      </div>

      <!-- 속성 편집 폼 -->
      <div class="p-4 space-y-4">
        <div v-for="prop in editableProps" :key="prop.key">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            {{ prop.label }}
          </label>

          <!-- 텍스트 입력 -->
          <input
            v-if="prop.type === 'text'"
:value="String(selectedModule.properties[prop.key] || '')"
            @input="updateProperty(prop.key, ($event.target as HTMLInputElement).value)"
            :placeholder="prop.placeholder"
            class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          <!-- 텍스트에어리어 -->
          <textarea
            v-else-if="prop.type === 'textarea'"
            :value="String(selectedModule.properties[prop.key] || '')"
            @input="updateProperty(prop.key, ($event.target as HTMLInputElement).value)"
            :placeholder="prop.placeholder"
            rows="3"
            class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          ></textarea>

          <!-- 컬러 선택 -->
          <input
            v-else-if="prop.type === 'color'"
:value="String(selectedModule.properties[prop.key] || '')"
            @input="updateProperty(prop.key, ($event.target as HTMLInputElement).value)"
            type="color"
            class="w-full h-10 border border-gray-300 rounded-md"
          />

          <!-- URL 입력 -->
          <input
            v-else-if="prop.type === 'url'"
:value="String(selectedModule.properties[prop.key] || '')"
            @input="updateProperty(prop.key, ($event.target as HTMLInputElement).value)"
            type="url"
            :placeholder="prop.placeholder"
            class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          <!-- 셀렉트 -->
          <select
            v-else-if="prop.type === 'select'"
:value="String(selectedModule.properties[prop.key] || '')"
            @change="updateProperty(prop.key, ($event.target as HTMLSelectElement).value)"
            class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option v-for="option in prop.options" :key="option" :value="option">
              {{ option }}
            </option>
          </select>

          <!-- 체크박스 -->
          <label
            v-else-if="prop.type === 'boolean'"
            class="flex items-center space-x-2"
          >
            <input
              type="checkbox"
              :checked="Boolean(selectedModule.properties[prop.key])"
              @change="updateProperty(prop.key, ($event.target as HTMLInputElement).checked)"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="text-sm">{{ prop.label }}</span>
          </label>
        </div>
      </div>


      <!-- 모듈 제거 버튼 -->
      <div class="p-4 border-t">
        <button
          @click="removeModule"
          class="w-full py-2 px-4 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
        >
          모듈 삭제
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'

const moduleStore = useModuleStore()

const selectedModule = computed(() => moduleStore.selectedModule)
const selectedModuleMetadata = computed(() => moduleStore.selectedModuleMetadata)
const editableProps = computed(() => selectedModuleMetadata.value?.editableProps || [])

const updateProperty = (key: string, value: unknown) => {
  moduleStore.updateModuleProperty(key, value)
}

const updateStyle = (key: string, value: unknown) => {
  moduleStore.updateModuleStyle(key, value)
}

const removeModule = () => {
  if (selectedModule.value) {
    moduleStore.removeModule(selectedModule.value.id)
  }
}
</script>