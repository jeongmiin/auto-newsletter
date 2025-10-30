<template>
  <div class="h-full flex flex-col">
    <!-- 패널 헤더 -->
    <div class="p-3 border-b">
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
        <div v-for="prop in editableProps" :key="prop.key" :class="getFieldVisibility(prop)">
          <label
            v-show="prop.type !== 'boolean'"
            class="block text-sm font-medium text-gray-700 mb-1"
          >
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

          <!-- Quill 에디터 -->
          <QuillEditor
            v-else-if="prop.type === 'textarea'"
            :model-value="String(selectedModule.properties[prop.key] || '')"
            @update:model-value="updateProperty(prop.key, $event)"
            :placeholder="prop.placeholder"
          />

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
          <label v-else-if="prop.type === 'boolean'" class="flex items-baseline space-x-2">
            <input
              type="checkbox"
              :checked="Boolean(selectedModule.properties[prop.key])"
              @change="updateProperty(prop.key, ($event.target as HTMLInputElement).checked)"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="text-sm">{{ prop.label }}</span>
          </label>

          <!-- 동적 테이블 행 편집 -->
          <div v-else-if="prop.type === 'table-rows'" class="space-y-3">
            <!-- 행 추가 버튼 -->
            <button
              @click="addNewTableRow"
              class="w-full py-2 px-3 bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors flex items-center justify-center space-x-2"
            >
              <span>+</span>
              <span>테이블 행 추가</span>
            </button>

            <!-- 기존 행들 -->
            <div v-if="tableRows.length > 0" class="space-y-3">
              <div
                v-for="(row, index) in tableRows"
                :key="row.id"
                class="p-3 border border-gray-200 rounded-md bg-gray-50 space-y-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700">행 {{ index + 1 }}</span>
                  <button
                    @click="removeRow(row.id)"
                    class="text-red-500 hover:text-red-700 text-sm"
                  >
                    삭제
                  </button>
                </div>

                <div class="space-y-2">
                  <div>
                    <label class="block text-xs text-gray-600 mb-1">헤더(th)</label>
                    <input
                      :value="row.header"
                      @input="
                        updateRowField(row.id, 'header', ($event.target as HTMLInputElement).value)
                      "
                      placeholder="항목명"
                      class="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-600 mb-1">데이터(td)</label>
                    <input
                      :value="row.data"
                      @input="
                        updateRowField(row.id, 'data', ($event.target as HTMLInputElement).value)
                      "
                      placeholder="내용"
                      class="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- 행이 없을 때 안내 -->
            <div v-else class="text-center py-4 text-gray-500 text-sm">
              추가된 테이블 행이 없습니다.<br />
              "테이블 행 추가" 버튼을 클릭해서 행을 추가해보세요.
            </div>
          </div>

          <!-- 동적 콘텐츠 타이틀 편집 -->
          <div v-else-if="prop.type === 'content-titles'" class="space-y-3">
            <!-- 타이틀 추가 버튼 -->
            <button
              @click="addNewContentTitle"
              class="w-full py-2 px-3 bg-green-50 text-green-600 border border-green-200 rounded-md hover:bg-green-100 transition-colors flex items-center justify-center space-x-2"
            >
              <span>+</span>
              <span>콘텐츠 타이틀 추가</span>
            </button>

            <!-- 기존 타이틀들 -->
            <div v-if="contentTitles.length > 0" class="space-y-3">
              <div
                v-for="(title, index) in contentTitles"
                :key="title.id"
                class="p-3 border border-gray-200 rounded-md bg-gray-50 space-y-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700">타이틀 {{ index + 1 }}</span>
                  <button
                    @click="removeContentTitle(title.id)"
                    class="text-red-500 hover:text-red-700 text-sm"
                  >
                    삭제
                  </button>
                </div>

                <div>
                  <label class="block text-xs text-gray-600 mb-1">타이틀 텍스트</label>
                  <input
                    :value="title.text"
                    @input="
                      updateContentTitleField(title.id, ($event.target as HTMLInputElement).value)
                    "
                    placeholder="콘텐츠 타이틀을 입력하세요"
                    class="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <!-- 타이틀이 없을 때 안내 -->
            <div v-else class="text-center py-4 text-gray-500 text-sm">
              추가된 콘텐츠 타이틀이 없습니다.<br />
              "콘텐츠 타이틀 추가" 버튼을 클릭해서 타이틀을 추가해보세요.
            </div>
          </div>

          <!-- 동적 콘텐츠 텍스트 편집 -->
          <div v-else-if="prop.type === 'content-texts'" class="space-y-3">
            <!-- 텍스트 추가 버튼 -->
            <button
              @click="addNewContentText"
              class="w-full py-2 px-3 bg-purple-50 text-purple-600 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors flex items-center justify-center space-x-2"
            >
              <span>+</span>
              <span>콘텐츠 텍스트 추가</span>
            </button>

            <!-- 기존 텍스트들 -->
            <div v-if="contentTexts.length > 0" class="space-y-3">
              <div
                v-for="(text, index) in contentTexts"
                :key="text.id"
                class="p-3 border border-gray-200 rounded-md bg-gray-50 space-y-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700">텍스트 {{ index + 1 }}</span>
                  <button
                    @click="removeContentText(text.id)"
                    class="text-red-500 hover:text-red-700 text-sm"
                  >
                    삭제
                  </button>
                </div>

                <div>
                  <label class="block text-xs text-gray-600 mb-1">콘텐츠 내용</label>
                  <QuillEditor
                    :model-value="text.content"
                    @update:model-value="updateContentTextField(text.id, $event)"
                    placeholder="콘텐츠 내용을 입력하세요"
                  />
                </div>
              </div>
            </div>

            <!-- 텍스트가 없을 때 안내 -->
            <div v-else class="text-center py-4 text-gray-500 text-sm">
              추가된 콘텐츠 텍스트가 없습니다.<br />
              "콘텐츠 텍스트 추가" 버튼을 클릭해서 텍스트를 추가해보세요.
            </div>
          </div>

          <!-- 추가 콘텐츠 관리 (서브 모듈 시스템) -->
          <div v-else-if="prop.type === 'additional-contents'" class="space-y-3">
            <!-- 콘텐츠 추가 버튼들 -->
            <div class="flex space-x-2">
              <button
                @click="addNewAdditionalContent('title', prop.key)"
                class="flex-1 py-2 px-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors flex items-center justify-center space-x-1"
              >
                <span>타이틀 추가</span>
              </button>
              <button
                @click="addNewAdditionalContent('text', prop.key)"
                class="flex-1 py-2 px-3 bg-teal-50 text-teal-700 border border-teal-200 rounded-md hover:bg-teal-100 transition-colors flex items-center justify-center space-x-1"
              >
                <span>텍스트 추가</span>
              </button>
            </div>

            <!-- 추가된 콘텐츠 목록 -->
            <div v-if="getAdditionalContents(prop.key).length > 0" class="space-y-2">
              <div
                v-for="(content, index) in getAdditionalContents(prop.key)"
                :key="content.id"
                class="p-3 border border-gray-200 rounded-md bg-gray-50"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center space-x-2">
                    <span v-if="content.type === 'title'" class="text-amber-600">📋</span>
                    <span v-else class="text-teal-600">📝</span>
                    <span class="text-sm font-medium text-gray-700">
                      {{ content.type === 'title' ? '타이틀' : '텍스트' }} {{ index + 1 }}
                    </span>
                  </div>
                  <div class="flex items-center space-x-1">
                    <button
                      @click="moveAdditionalContentUp(content.id, prop.key)"
                      :disabled="index === 0"
                      class="p-1 text-xs hover:bg-gray-200 disabled:text-gray-300 rounded"
                      title="위로 이동"
                    >
                      ↑
                    </button>
                    <button
                      @click="moveAdditionalContentDown(content.id, prop.key)"
                      :disabled="index === getAdditionalContents(prop.key).length - 1"
                      class="p-1 text-xs hover:bg-gray-200 disabled:text-gray-300 rounded"
                      title="아래로 이동"
                    >
                      ↓
                    </button>
                    <button
                      @click="removeAdditionalContent(content.id, prop.key)"
                      class="p-1 text-xs text-red-500 hover:bg-red-100 rounded"
                      title="삭제"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <!-- 콘텐츠 편집 영역 -->
                <div v-if="content.type === 'title'">
                  <label class="block text-xs text-gray-600 mb-1">타이틀 텍스트</label>
                  <input
                    :value="content.data.title_text || ''"
                    @input="
                      updateAdditionalContentData(
                        content.id,
                        'title_text',
                        ($event.target as HTMLInputElement).value,
                        prop.key,
                      )
                    "
                    placeholder="타이틀을 입력하세요"
                    class="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div v-else>
                  <label class="block text-xs text-gray-600 mb-1">텍스트 내용</label>
                  <QuillEditor
                    :model-value="content.data.text_content || ''"
                    @update:model-value="
                      updateAdditionalContentData(content.id, 'text_content', $event, prop.key)
                    "
                    placeholder="텍스트 내용을 입력하세요"
                  />
                </div>
              </div>
            </div>

            <!-- 콘텐츠가 없을 때 안내 -->
            <div v-else class="text-center py-4 text-gray-500 text-sm">
              추가된 콘텐츠가 없습니다.<br />
              "타이틀 추가" 또는 "텍스트 추가" 버튼을 클릭해서 콘텐츠를 추가해보세요.
            </div>
          </div>
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
import type { TableRow, EditableProp, ContentTitle, ContentText, AdditionalContent } from '@/types'
import QuillEditor from '@/components/QuillEditor.vue'

const moduleStore = useModuleStore()

const selectedModule = computed(() => moduleStore.selectedModule)
const selectedModuleMetadata = computed(() => moduleStore.selectedModuleMetadata)
const editableProps = computed(() => selectedModuleMetadata.value?.editableProps || [])

// 동적 테이블 행 데이터
const tableRows = computed(() => {
  if (!selectedModule.value) return []
  if (!selectedModule.value.properties.tableRows) return []

  const rows = selectedModule.value.properties.tableRows as TableRow[]
  console.log('[tableRows computed] 현재 행 수:', rows.length, rows)
  return rows
})

// 동적 콘텐츠 타이틀 데이터
const contentTitles = computed(() => {
  if (!selectedModule.value?.properties.contentTitles) return []
  return selectedModule.value.properties.contentTitles as ContentTitle[]
})

// 동적 콘텐츠 텍스트 데이터
const contentTexts = computed(() => {
  if (!selectedModule.value?.properties.contentTexts) return []
  return selectedModule.value.properties.contentTexts as ContentText[]
})

const updateProperty = (key: string, value: unknown) => {
  moduleStore.updateModuleProperty(key, value)
}

const removeModule = () => {
  if (selectedModule.value) {
    moduleStore.removeModule(selectedModule.value.id)
  }
}

// 동적 테이블 행 관리 함수들
const addNewTableRow = () => {
  console.log('=== [PropertiesPanel] 테이블 행 추가 시작 ===')
  console.log('selectedModule:', selectedModule.value)
  console.log('selectedModule.id:', selectedModule.value?.id)
  console.log('현재 tableRows:', selectedModule.value?.properties.tableRows)

  if (selectedModule.value) {
    console.log('moduleStore.addTableRow 호출:', selectedModule.value.id)
    moduleStore.addTableRow(selectedModule.value.id)

    // 추가 후 확인
    console.log('추가 후 tableRows:', selectedModule.value?.properties.tableRows)
  } else {
    console.error('selectedModule이 null입니다!')
  }
  console.log('=== [PropertiesPanel] 테이블 행 추가 완료 ===')
}

const updateRowField = (rowId: string, field: 'header' | 'data', value: string) => {
  if (selectedModule.value) {
    moduleStore.updateTableRow(selectedModule.value.id, rowId, field, value)
  }
}

const removeRow = (rowId: string) => {
  if (selectedModule.value) {
    moduleStore.removeTableRow(selectedModule.value.id, rowId)
  }
}

// 동적 콘텐츠 타이틀 관리 함수들
const addNewContentTitle = () => {
  if (selectedModule.value) {
    moduleStore.addContentTitle(selectedModule.value.id)
  }
}

const updateContentTitleField = (titleId: string, text: string) => {
  if (selectedModule.value) {
    moduleStore.updateContentTitle(selectedModule.value.id, titleId, text)
  }
}

const removeContentTitle = (titleId: string) => {
  if (selectedModule.value) {
    moduleStore.removeContentTitle(selectedModule.value.id, titleId)
  }
}

// 동적 콘텐츠 텍스트 관리 함수들
const addNewContentText = () => {
  if (selectedModule.value) {
    moduleStore.addContentText(selectedModule.value.id)
  }
}

const updateContentTextField = (textId: string, content: string) => {
  if (selectedModule.value) {
    moduleStore.updateContentText(selectedModule.value.id, textId, content)
  }
}

const removeContentText = (textId: string) => {
  if (selectedModule.value) {
    moduleStore.removeContentText(selectedModule.value.id, textId)
  }
}

// 추가 콘텐츠 데이터 및 관리 함수들
const getAdditionalContents = (propertyKey: string) => {
  if (!selectedModule.value?.properties[propertyKey]) return []
  const contents = selectedModule.value.properties[propertyKey] as AdditionalContent[]
  return contents.sort((a, b) => a.order - b.order)
}

const addNewAdditionalContent = async (type: 'title' | 'text', propertyKey: string) => {
  if (selectedModule.value) {
    await moduleStore.addAdditionalContent(selectedModule.value.id, type, propertyKey)
  }
}

const updateAdditionalContentData = (
  contentId: string,
  dataKey: string,
  value: string,
  propertyKey: string,
) => {
  if (selectedModule.value) {
    moduleStore.updateAdditionalContent(
      selectedModule.value.id,
      contentId,
      { [dataKey]: value },
      propertyKey,
    )
  }
}

const removeAdditionalContent = (contentId: string, propertyKey: string) => {
  if (selectedModule.value) {
    moduleStore.removeAdditionalContent(selectedModule.value.id, contentId, propertyKey)
  }
}

const moveAdditionalContentUp = (contentId: string, propertyKey: string) => {
  if (selectedModule.value) {
    moduleStore.moveAdditionalContentUp(selectedModule.value.id, contentId, propertyKey)
  }
}

const moveAdditionalContentDown = (contentId: string, propertyKey: string) => {
  if (selectedModule.value) {
    moduleStore.moveAdditionalContentDown(selectedModule.value.id, contentId, propertyKey)
  }
}

// 조건부 필드 표시 로직
const getFieldVisibility = (prop: EditableProp) => {
  if (!selectedModule.value) return ''

  const properties = selectedModule.value.properties

  // 테이블 관련 필드들의 조건부 표시
  if (isTableRelatedField(prop.key)) {
    return properties.showTable === true ? '' : 'hidden'
  }

  // 버튼 관련 필드들의 조건부 표시
  // ModuleOneButton과 ModuleTwoButton은 단독 버튼 모듈이므로 조건부 표시를 하지 않음
  if (isButtonRelatedField(prop.key)) {
    const moduleMetadata = selectedModuleMetadata.value
    if (moduleMetadata?.id === 'ModuleOneButton' || moduleMetadata?.id === 'ModuleTwoButton') {
      return '' // 항상 표시
    }
    return properties.showButton === true ? '' : 'hidden'
  }

  // Module04 버튼 관련 필드들
  if (isModule04ButtonField(prop.key)) {
    return getModule04ButtonVisibility(prop.key, properties)
  }

  // Module05 버튼 관련 필드들
  if (isModule05ButtonField(prop.key)) {
    return getModule05ButtonVisibility(prop.key, properties)
  }

  // Module05-3 버튼 관련 필드들
  if (isModule053ButtonField(prop.key)) {
    return getModule053ButtonVisibility(prop.key, properties)
  }

  return ''
}

const isTableRelatedField = (key: string) => {
  return ['tableTitle', 'tableContent', 'tableRows'].includes(key)
}

const isButtonRelatedField = (key: string) => {
  return ['buttonText', 'buttonUrl', 'buttonBgColor', 'buttonTextColor'].includes(key)
}

const isModule04ButtonField = (key: string) => {
  const buttonFields = [
    'leftSmallBtnText',
    'leftSmallBtnUrl',
    'leftSmallBtnBgColor',
    'leftSmallBtnTextColor',
    'leftBigBtnText',
    'leftBigBtnUrl',
    'leftBigBtnBgColor',
    'leftBigBtnTextColor',
    'rightSmallBtnText',
    'rightSmallBtnUrl',
    'rightSmallBtnBgColor',
    'rightSmallBtnTextColor',
    'rightBigBtnText',
    'rightBigBtnUrl',
    'rightBigBtnBgColor',
    'rightBigBtnTextColor',
  ]
  return buttonFields.includes(key)
}

const isModule05ButtonField = (key: string) => {
  const buttonFields = [
    'topRightSmallBtnText',
    'topRightSmallBtnUrl',
    'bottomRightSmallBtnText',
    'bottomRightSmallBtnUrl',
    'bigButtonText',
    'bigButtonUrl',
    'smallBtnBgColor',
    'smallBtnTextColor',
    'bigBtnBgColor',
    'bigBtnTextColor',
  ]
  return buttonFields.includes(key)
}

const isModule053ButtonField = (key: string) => {
  const buttonFields = [
    'topSmallBtnText',
    'topSmallBtnUrl',
    'topSmallBtnBgColor',
    'topSmallBtnTextColor',
    'bottomSmallBtnText',
    'bottomSmallBtnUrl',
    'bottomSmallBtnBgColor',
    'bottomSmallBtnTextColor',
    'bigBtnText',
    'bigBtnUrl',
    'bigBtnBgColor',
    'bigBtnTextColor',
  ]
  return buttonFields.includes(key)
}

const getModule04ButtonVisibility = (key: string, properties: Record<string, unknown>) => {
  // Left Small Button 관련
  if (
    [
      'leftSmallBtnText',
      'leftSmallBtnUrl',
      'leftSmallBtnBgColor',
      'leftSmallBtnTextColor',
    ].includes(key)
  ) {
    return properties.showLeftSmallBtn === true ? '' : 'hidden'
  }

  // Left Big Button 관련
  if (
    ['leftBigBtnText', 'leftBigBtnUrl', 'leftBigBtnBgColor', 'leftBigBtnTextColor'].includes(key)
  ) {
    return properties.showLeftBigBtn === true ? '' : 'hidden'
  }

  // Right Small Button 관련
  if (
    [
      'rightSmallBtnText',
      'rightSmallBtnUrl',
      'rightSmallBtnBgColor',
      'rightSmallBtnTextColor',
    ].includes(key)
  ) {
    return properties.showRightSmallBtn === true ? '' : 'hidden'
  }

  // Right Big Button 관련
  if (
    ['rightBigBtnText', 'rightBigBtnUrl', 'rightBigBtnBgColor', 'rightBigBtnTextColor'].includes(
      key,
    )
  ) {
    return properties.showRightBigBtn === true ? '' : 'hidden'
  }

  return ''
}

const getModule05ButtonVisibility = (key: string, properties: Record<string, unknown>) => {
  // Top Small Button 관련
  if (['topRightSmallBtnText', 'topRightSmallBtnUrl'].includes(key)) {
    return properties.showTopSmallBtn === true ? '' : 'hidden'
  }

  // Bottom Small Button 관련
  if (['bottomRightSmallBtnText', 'bottomRightSmallBtnUrl'].includes(key)) {
    return properties.showBottomSmallBtn === true ? '' : 'hidden'
  }

  // Big Button 관련
  if (['bigButtonText', 'bigButtonUrl'].includes(key)) {
    return properties.showBigBtn === true ? '' : 'hidden'
  }

  // Small Button Style (둘 다 표시된 경우에만)
  if (['smallBtnBgColor', 'smallBtnTextColor'].includes(key)) {
    return properties.showTopSmallBtn === true || properties.showBottomSmallBtn === true
      ? ''
      : 'hidden'
  }

  // Big Button Style
  if (['bigBtnBgColor', 'bigBtnTextColor'].includes(key)) {
    return properties.showBigBtn === true ? '' : 'hidden'
  }

  return ''
}

const getModule053ButtonVisibility = (key: string, properties: Record<string, unknown>) => {
  // Top Small Button 관련
  if (
    ['topSmallBtnText', 'topSmallBtnUrl', 'topSmallBtnBgColor', 'topSmallBtnTextColor'].includes(
      key,
    )
  ) {
    return properties.showTopSmallBtn === true ? '' : 'hidden'
  }

  // Bottom Small Button 관련
  if (
    [
      'bottomSmallBtnText',
      'bottomSmallBtnUrl',
      'bottomSmallBtnBgColor',
      'bottomSmallBtnTextColor',
    ].includes(key)
  ) {
    return properties.showBottomSmallBtn === true ? '' : 'hidden'
  }

  // Big Button 관련
  if (['bigBtnText', 'bigBtnUrl', 'bigBtnBgColor', 'bigBtnTextColor'].includes(key)) {
    return properties.showBigBtn === true ? '' : 'hidden'
  }

  return ''
}
</script>
