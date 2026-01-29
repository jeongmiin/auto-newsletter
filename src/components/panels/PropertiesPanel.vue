<template>
  <div class="h-full flex flex-col">
    <!-- 패널 헤더 -->
    <div class="p-3 border-b">
      <h2 class="text-lg font-semibold text-gray-800">속성</h2>
    </div>

    <!-- 선택된 모듈이 없을 때 -->
    <div v-if="!selectedModule" class="flex-1 flex items-center justify-center text-gray-500 px-4">
      <div class="text-center">
        <div class="text-3xl mb-3"><i class="pi pi-pencil text-gray-400"></i></div>
        <div class="font-medium text-gray-600 mb-1">모듈을 선택하세요</div>
        <div class="text-xs text-gray-400">
          중앙의 편집 영역에서 모듈을 클릭하면<br />
          여기서 텍스트와 이미지를 편집할 수 있습니다
        </div>
      </div>
    </div>

    <!-- 선택된 모듈이 있을 때 -->
    <div v-else class="flex-1 overflow-y-auto">
      <!-- 모듈 정보 -->
      <div class="p-4 border-b bg-blue-50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
            <i :class="selectedModuleMetadata?.icon" class="text-lg"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-gray-800 truncate">{{ selectedModuleMetadata?.name }}</div>
            <div class="text-sm text-gray-600 truncate">{{ selectedModuleMetadata?.description }}</div>
          </div>
        </div>
      </div>

      <!-- 속성 편집 폼 -->
      <div class="p-4 space-y-5">
        <div
          v-for="(prop, index) in editableProps"
          :key="prop.key"
          v-show="!prop.showWhen || selectedModule.properties[prop.showWhen] === true"
          :class="{ 'pt-4 border-t border-gray-100': index > 0 && !prop.showWhen }"
        >
          <label
            v-show="prop.type !== 'boolean'"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            {{ prop.label }}
          </label>

          <!-- 텍스트 입력 (컬러 필드) -->
          <div
            v-if="prop.type === 'text' && isColorField(prop.key)"
            class="space-y-2"
          >
            <div class="flex items-center gap-2">
              <!-- PrimeVue ColorPicker -->
              <ColorPicker
                :modelValue="getColorValue(prop.key)"
                @update:modelValue="handleColorPickerUpdate(prop.key, $event)"
                format="hex"
              />
              <!-- PrimeVue InputText -->
              <InputText
                :modelValue="String(selectedModule.properties[prop.key] || '')"
                @update:modelValue="handleColorInput(prop.key, $event ?? '')"
                :placeholder="prop.placeholder || '#000000'"
                class="flex-1 font-mono text-sm"
                spellcheck="false"
              />
            </div>
            <p class="text-xs text-gray-400">색상 박스를 클릭하거나 #000000 형식으로 입력하세요</p>
          </div>

          <!-- 텍스트 입력 (일반) -->
          <InputText
            v-else-if="prop.type === 'text'"
            :modelValue="String(selectedModule.properties[prop.key] || '')"
            @update:modelValue="updateProperty(prop.key, $event ?? '')"
            :placeholder="prop.placeholder"
            class="w-full"
          />

          <!-- 리치 텍스트 에디터 -->
          <Editor
            v-else-if="prop.type === 'textarea'"
            :model-value="String(selectedModule.properties[prop.key] || '')"
            @update:model-value="handleEditorUpdate(prop.key, $event)"
            :placeholder="prop.placeholder"
            editorStyle="height: 150px"
          >
            <template #toolbar>
              <span class="ql-formats">
                <button class="ql-bold" title="굵게"></button>
                <button class="ql-italic" title="기울임"></button>
                <button class="ql-underline" title="밑줄"></button>
                <button class="ql-strike" title="취소선"></button>
              </span>
              <span class="ql-formats">
                <select class="ql-header" title="제목 크기">
                  <option value="1">제목 1</option>
                  <option value="2">제목 2</option>
                  <option value="3">제목 3</option>
                  <option selected>본문</option>
                </select>
              </span>
              <span class="ql-formats">
                <button class="ql-list" value="ordered" title="번호 목록"></button>
                <button class="ql-list" value="bullet" title="글머리 기호"></button>
              </span>
              <span class="ql-formats">
                <select class="ql-align" title="정렬"></select>
              </span>
              <span class="ql-formats">
                <select class="ql-color" title="글자 색상"></select>
                <select class="ql-background" title="배경 색상"></select>
              </span>
              <span class="ql-formats">
                <button class="ql-link" title="링크"></button>
              </span>
              <span class="ql-formats">
                <button class="ql-clean" title="서식 제거"></button>
              </span>
            </template>
          </Editor>

          <!-- URL 입력 -->
          <div v-else-if="prop.type === 'url'" class="space-y-1">
            <InputText
              :modelValue="String(selectedModule.properties[prop.key] || '')"
              @update:modelValue="updateProperty(prop.key, $event ?? '')"
              :placeholder="prop.placeholder || 'https://example.com'"
              class="w-full"
            />
            <p class="text-xs text-gray-400">https:// 로 시작하는 전체 주소를 입력하세요</p>
          </div>

          <!-- 셀렉트 -->
          <Select
            v-else-if="prop.type === 'select'"
            :modelValue="String(selectedModule.properties[prop.key] || '')"
            @update:modelValue="updateProperty(prop.key, $event ?? '')"
            :options="prop.options"
            class="w-full"
            placeholder="선택하세요"
          />

          <!-- 체크박스 (ToggleSwitch) -->
          <div
            v-else-if="prop.type === 'boolean' || prop.type === 'checkbox'"
            class="flex items-center gap-3"
          >
            <ToggleSwitch
              :modelValue="Boolean(selectedModule.properties[prop.key])"
              @update:modelValue="updateProperty(prop.key, $event)"
            />
            <span class="text-sm text-gray-700">{{ prop.label }}</span>
          </div>

          <!-- 동적 테이블 행 편집 -->
          <div v-else-if="prop.type === 'table-rows'" class="space-y-3">
            <!-- 행 추가 버튼 -->
            <Button
              @click="addNewTableRow"
              label="테이블 행 추가"
              icon="pi pi-plus"
              severity="success"
              outlined
              class="w-full"
            />

            <!-- 기존 행들 -->
            <div v-if="tableRows.length > 0" class="space-y-3">
              <div
                v-for="(row, index) in tableRows"
                :key="row.id"
                class="p-3 border border-gray-200 rounded-md bg-gray-50 space-y-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700">행 {{ index + 1 }}</span>
                  <Button
                    @click="removeRow(row.id)"
                    label="삭제"
                    severity="danger"
                    text
                    size="small"
                  />
                </div>

                <div class="space-y-2">
                  <div>
                    <label class="block text-xs text-gray-600 mb-1">열 제목 (왼쪽)</label>
                    <InputText
                      :modelValue="row.header"
                      @update:modelValue="updateRowField(row.id, 'header', $event ?? '')"
                      placeholder="예: 일시, 장소, 참가비"
                      class="w-full text-sm"
                      size="small"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-600 mb-1">열 내용 (오른쪽)</label>
                    <InputText
                      :modelValue="row.data"
                      @update:modelValue="updateRowField(row.id, 'data', $event ?? '')"
                      placeholder="예: 2024년 1월 1일, 서울, 무료"
                      class="w-full text-sm"
                      size="small"
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
            <Button
              @click="addNewContentTitle"
              label="콘텐츠 타이틀 추가"
              icon="pi pi-plus"
              severity="success"
              outlined
              class="w-full"
            />

            <!-- 기존 타이틀들 -->
            <div v-if="contentTitles.length > 0" class="space-y-3">
              <div
                v-for="(title, index) in contentTitles"
                :key="title.id"
                class="p-3 border border-gray-200 rounded-md bg-gray-50 space-y-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700">타이틀 {{ index + 1 }}</span>
                  <Button
                    @click="removeContentTitle(title.id)"
                    label="삭제"
                    severity="danger"
                    text
                    size="small"
                  />
                </div>

                <div>
                  <label class="block text-xs text-gray-600 mb-1">타이틀 텍스트</label>
                  <InputText
                    :modelValue="title.text"
                    @update:modelValue="updateContentTitleField(title.id, $event ?? '')"
                    placeholder="콘텐츠 타이틀을 입력하세요"
                    class="w-full text-sm"
                    size="small"
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
            <Button
              @click="addNewContentText"
              label="콘텐츠 텍스트 추가"
              icon="pi pi-plus"
              severity="success"
              outlined
              class="w-full"
            />

            <!-- 기존 텍스트들 -->
            <div v-if="contentTexts.length > 0" class="space-y-3">
              <div
                v-for="(text, index) in contentTexts"
                :key="text.id"
                class="p-3 border border-gray-200 rounded-md bg-gray-50 space-y-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700">텍스트 {{ index + 1 }}</span>
                  <Button
                    @click="removeContentText(text.id)"
                    label="삭제"
                    severity="danger"
                    text
                    size="small"
                  />
                </div>

                <div>
                  <label class="block text-xs text-gray-600 mb-1">콘텐츠 내용</label>
                  <Editor
                    :model-value="text.content"
                    @update:model-value="handleContentTextUpdate(text.id, $event)"
                    placeholder="콘텐츠 내용을 입력하세요"
                    editorStyle="height: 120px"
                  >
                    <template #toolbar>
                      <span class="ql-formats">
                        <button class="ql-bold"></button>
                        <button class="ql-italic"></button>
                        <button class="ql-underline"></button>
                      </span>
                      <span class="ql-formats">
                        <select class="ql-color"></select>
                      </span>
                      <span class="ql-formats">
                        <button class="ql-link"></button>
                        <button class="ql-clean"></button>
                      </span>
                    </template>
                  </Editor>
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
            <div class="flex gap-2">
              <Button
                @click="addNewAdditionalContent('title', prop.key)"
                label="타이틀 추가"
                icon="pi pi-plus"
                severity="success"
                outlined
                class="flex-1"
                size="small"
              />
              <Button
                @click="addNewAdditionalContent('text', prop.key)"
                label="텍스트 추가"
                icon="pi pi-plus"
                severity="success"
                outlined
                class="flex-1"
                size="small"
              />
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
                    <i v-if="content.type === 'title'" class="pi pi-file text-amber-600"></i>
                    <i v-else class="pi pi-align-left text-teal-600"></i>
                    <span class="text-sm font-medium text-gray-700">
                      {{ content.type === 'title' ? '타이틀' : '텍스트' }} {{ index + 1 }}
                    </span>
                  </div>
                  <div class="flex items-center gap-1">
                    <Button
                      @click="moveAdditionalContentUp(content.id, prop.key)"
                      :disabled="index === 0"
                      icon="pi pi-arrow-up"
                      severity="secondary"
                      text
                      size="small"
                      v-tooltip.top="'위로 이동'"
                    />
                    <Button
                      @click="moveAdditionalContentDown(content.id, prop.key)"
                      :disabled="index === getAdditionalContents(prop.key).length - 1"
                      icon="pi pi-arrow-down"
                      severity="secondary"
                      text
                      size="small"
                      v-tooltip.top="'아래로 이동'"
                    />
                    <Button
                      @click="removeAdditionalContent(content.id, prop.key)"
                      icon="pi pi-trash"
                      severity="danger"
                      text
                      size="small"
                      v-tooltip.top="'삭제'"
                    />
                  </div>
                </div>

                <!-- 콘텐츠 편집 영역 -->
                <div v-if="content.type === 'title'">
                  <label class="block text-xs text-gray-600 mb-1">타이틀 텍스트</label>
                  <InputText
                    :modelValue="content.data.title_text || ''"
                    @update:modelValue="updateAdditionalContentData(content.id, 'title_text', $event ?? '', prop.key)"
                    placeholder="타이틀을 입력하세요"
                    class="w-full text-sm"
                    size="small"
                  />
                </div>
                <div v-else>
                  <label class="block text-xs text-gray-600 mb-1">텍스트 내용</label>
                  <Editor
                    :model-value="content.data.text_content || ''"
                    @update:model-value="handleAdditionalContentUpdate(content.id, $event, prop.key)"
                    placeholder="텍스트 내용을 입력하세요"
                    editorStyle="height: 120px"
                  >
                    <template #toolbar>
                      <span class="ql-formats">
                        <button class="ql-bold"></button>
                        <button class="ql-italic"></button>
                        <button class="ql-underline"></button>
                      </span>
                      <span class="ql-formats">
                        <select class="ql-color"></select>
                      </span>
                      <span class="ql-formats">
                        <button class="ql-link"></button>
                        <button class="ql-clean"></button>
                      </span>
                    </template>
                  </Editor>
                </div>
              </div>
            </div>

            <!-- 콘텐츠가 없을 때 안내 -->
            <div v-else class="text-center py-4 text-gray-500 text-sm">
              추가된 콘텐츠가 없습니다.<br />
              "타이틀 추가" 또는 "텍스트 추가" 버튼을 클릭해서 콘텐츠를 추가해보세요.
            </div>
          </div>

          <!-- 커스텀 테이블 편집기 -->
          <div v-else-if="prop.type === 'table-editor'" class="space-y-4">
            <!-- 테이블 내용 편집 -->
            <div v-if="tableCells.length > 0" class="space-y-3">
              <!-- 행/열 추가 버튼 -->
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500">
                  {{ tableCells.length }}행 × {{ tableCells[0]?.length || 0 }}열
                </span>
                <div class="flex gap-1">
                  <Button
                    @click="addTableColumn"
                    label="열 추가"
                    icon="pi pi-plus"
                    severity="secondary"
                    text
                    size="small"
                  />
                  <Button
                    @click="addTableRow"
                    label="행 추가"
                    icon="pi pi-plus"
                    severity="secondary"
                    text
                    size="small"
                  />
                </div>
              </div>

              <!-- 열 삭제 버튼 (열이 2개 이상일 때만) -->
              <div v-if="tableCells[0]?.length > 1" class="flex gap-2 px-1">
                <div
                  v-for="(_, colIndex) in tableCells[0]"
                  :key="`col-header-${colIndex}`"
                  class="flex-1 text-center"
                >
                  <Button
                    @click="removeTableColumn(colIndex)"
                    :disabled="tableCells[0].length <= 1"
                    icon="pi pi-times"
                    severity="secondary"
                    text
                    size="small"
                    class="!p-1"
                    v-tooltip.top="`${colIndex + 1}열 삭제`"
                  />
                </div>
              </div>

              <!-- 각 행 편집 -->
              <div
                v-for="(row, rowIndex) in tableCells"
                :key="`row-${rowIndex}`"
                class="p-3 border border-gray-200 rounded-lg bg-white"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-medium text-gray-500">{{ rowIndex + 1 }}행</span>
                  <Button
                    @click="removeTableRow(rowIndex)"
                    :disabled="tableCells.length <= 1"
                    icon="pi pi-times"
                    severity="secondary"
                    text
                    size="small"
                    v-tooltip.top="'행 삭제'"
                  />
                </div>

                <!-- 셀들을 가로로 나열 -->
                <div class="flex gap-2">
                  <div
                    v-for="(cell, colIndex) in row"
                    :key="cell.id"
                    v-show="!cell.hidden"
                    class="flex-1 space-y-1"
                    :style="{ flex: cell.colspan > 1 ? cell.colspan : 1 }"
                  >
                    <!-- 셀 컨트롤 (타입 토글 + 병합) -->
                    <div class="flex items-center justify-between gap-1">
                      <button
                        @click="toggleCellType(rowIndex, colIndex)"
                        class="text-xs px-2 py-0.5 rounded transition-colors"
                        :class="cell.type === 'th'
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                        v-tooltip.top="'클릭하여 제목/내용 전환'"
                      >
                        {{ cell.type === 'th' ? '제목' : '내용' }}
                      </button>

                      <!-- 병합 컨트롤 -->
                      <div class="flex items-center gap-1">
                        <!-- 열 병합 -->
                        <div class="flex items-center text-xs text-gray-500">
                          <span class="mr-1">열</span>
                          <select
                            :value="cell.colspan"
                            @change="updateCellColspan(rowIndex, colIndex, ($event.target as HTMLSelectElement).value)"
                            class="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white"
                            :disabled="colIndex + cell.colspan > row.length"
                          >
                            <option
                              v-for="n in getMaxColspan(rowIndex, colIndex)"
                              :key="n"
                              :value="n"
                            >{{ n }}</option>
                          </select>
                        </div>
                        <!-- 행 병합 -->
                        <div class="flex items-center text-xs text-gray-500">
                          <span class="mr-1">행</span>
                          <select
                            :value="cell.rowspan"
                            @change="updateCellRowspan(rowIndex, colIndex, ($event.target as HTMLSelectElement).value)"
                            class="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white"
                          >
                            <option
                              v-for="n in getMaxRowspan(rowIndex)"
                              :key="n"
                              :value="n"
                            >{{ n }}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <!-- 셀 내용 입력 -->
                    <InputText
                      :modelValue="cell.content"
                      @update:modelValue="updateCellContent(rowIndex, colIndex, $event ?? '')"
                      :placeholder="cell.type === 'th' ? '제목' : '내용'"
                      class="w-full text-sm"
                      size="small"
                    />

                    <!-- 병합 표시 -->
                    <div
                      v-if="cell.colspan > 1 || cell.rowspan > 1"
                      class="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded"
                    >
                      {{ cell.colspan > 1 ? `${cell.colspan}열 병합` : '' }}
                      {{ cell.colspan > 1 && cell.rowspan > 1 ? ' + ' : '' }}
                      {{ cell.rowspan > 1 ? `${cell.rowspan}행 병합` : '' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 테이블이 비어있을 때 -->
            <div v-else class="text-center py-6 text-gray-500 text-sm bg-gray-50 rounded-lg">
              <i class="pi pi-table text-2xl text-gray-300 mb-2 block"></i>
              <div class="mb-3">테이블이 비어있습니다</div>
              <Button
                @click="initializeDefaultTable"
                label="기본 2열 표 생성"
                icon="pi pi-plus"
                severity="primary"
                size="small"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 모듈 제거 버튼 -->
      <div class="p-4 border-t">
        <Button
          @click="removeModule"
          label="모듈 삭제"
          icon="pi pi-trash"
          severity="danger"
          outlined
          class="w-full"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import type { TableRow, ContentTitle, ContentText, AdditionalContent, TableCell } from '@/types'
import { normalizeColorInput, isValidHexColor } from '@/utils/colorHelper'
import { processQuillHtml } from '@/utils/quillHtmlProcessor'

const moduleStore = useModuleStore()

const selectedModule = computed(() => moduleStore.selectedModule)
const selectedModuleMetadata = computed(() => moduleStore.selectedModuleMetadata)
const editableProps = computed(() => selectedModuleMetadata.value?.editableProps || [])

// 동적 테이블 행 데이터
const tableRows = computed(() => {
  if (!selectedModule.value) return []
  if (!selectedModule.value.properties.tableRows) return []

  const rows = selectedModule.value.properties.tableRows as TableRow[]
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

// 커스텀 테이블 셀 데이터
const tableCells = computed(() => {
  if (!selectedModule.value?.properties.tableCells) return []
  return selectedModule.value.properties.tableCells as TableCell[][]
})

// 테이블 프리셋 정의
interface TablePreset {
  id: string
  name: string
  description: string
  rows: number
  cols: number
  structure: ('th' | 'td')[][] // 각 셀의 타입
}

// 기본 2열 표 프리셋
const defaultTablePreset: TablePreset = {
  id: '2col-simple',
  name: '2열 표',
  description: '항목 - 내용',
  rows: 3,
  cols: 2,
  structure: [
    ['th', 'td'],
    ['th', 'td'],
    ['th', 'td'],
  ],
}

const updateProperty = (key: string, value: unknown) => {
  moduleStore.updateModuleProperty(key, value)
}

// PrimeVue Editor 핸들러 함수들 (HTML 후처리 적용)
const handleEditorUpdate = (key: string, value: string) => {
  const processedHtml = processQuillHtml(value)
  updateProperty(key, processedHtml)
}

const handleContentTextUpdate = (textId: string, value: string) => {
  const processedHtml = processQuillHtml(value)
  updateContentTextField(textId, processedHtml)
}

const handleAdditionalContentUpdate = (contentId: string, value: string, propertyKey: string) => {
  const processedHtml = processQuillHtml(value)
  updateAdditionalContentData(contentId, 'text_content', processedHtml, propertyKey)
}

const removeModule = () => {
  if (selectedModule.value) {
    moduleStore.removeModule(selectedModule.value.id)
  }
}

// 동적 테이블 행 관리 함수들
const addNewTableRow = () => {

  if (selectedModule.value) {
    moduleStore.addTableRow(selectedModule.value.id)

    // 추가 후 확인
  } else {
    console.error('selectedModule이 null입니다!')
  }
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

// ============= 커스텀 테이블 셀 관리 함수들 =============
const addTableRow = () => {
  if (selectedModule.value) {
    moduleStore.addTableCellRow(selectedModule.value.id)
  }
}

const addTableColumn = () => {
  if (selectedModule.value) {
    moduleStore.addTableCellColumn(selectedModule.value.id)
  }
}

const removeTableRow = (rowIndex: number) => {
  if (selectedModule.value) {
    moduleStore.removeTableCellRow(selectedModule.value.id, rowIndex)
  }
}

const removeTableColumn = (colIndex: number) => {
  if (selectedModule.value) {
    moduleStore.removeTableCellColumn(selectedModule.value.id, colIndex)
  }
}

const updateCellContent = (rowIndex: number, colIndex: number, content: string) => {
  if (selectedModule.value) {
    moduleStore.updateTableCell(selectedModule.value.id, rowIndex, colIndex, { content })
  }
}

const updateCellColspan = (rowIndex: number, colIndex: number, value: string) => {
  if (selectedModule.value) {
    const colspan = Math.max(1, parseInt(value || '1', 10) || 1)
    moduleStore.updateTableCell(selectedModule.value.id, rowIndex, colIndex, { colspan })
  }
}

const updateCellRowspan = (rowIndex: number, colIndex: number, value: string) => {
  if (selectedModule.value) {
    const rowspan = Math.max(1, parseInt(value || '1', 10) || 1)
    moduleStore.updateTableCell(selectedModule.value.id, rowIndex, colIndex, { rowspan })
  }
}

const updateCellAlign = (rowIndex: number, colIndex: number, align: 'left' | 'center' | 'right') => {
  if (selectedModule.value) {
    moduleStore.updateTableCell(selectedModule.value.id, rowIndex, colIndex, { align })
  }
}

const updateCellWidth = (rowIndex: number, colIndex: number, width: string) => {
  if (selectedModule.value) {
    moduleStore.updateTableCell(selectedModule.value.id, rowIndex, colIndex, { width: width || undefined })
  }
}

const toggleCellType = (rowIndex: number, colIndex: number) => {
  if (selectedModule.value) {
    moduleStore.toggleCellType(selectedModule.value.id, rowIndex, colIndex)
  }
}

// 최대 열 병합 가능 수 계산
const getMaxColspan = (rowIndex: number, colIndex: number): number => {
  if (!tableCells.value[rowIndex]) return 1
  const row = tableCells.value[rowIndex]
  // 현재 열부터 행 끝까지 병합 가능
  return row.length - colIndex
}

// 최대 행 병합 가능 수 계산
const getMaxRowspan = (rowIndex: number): number => {
  if (!tableCells.value) return 1
  // 현재 행부터 테이블 끝까지 병합 가능
  return tableCells.value.length - rowIndex
}

// 기본 2열 표 초기화
const initializeDefaultTable = () => {
  if (!selectedModule.value) return

  moduleStore.applyTablePreset(
    selectedModule.value.id,
    defaultTablePreset.id,
    defaultTablePreset.rows,
    defaultTablePreset.cols,
    defaultTablePreset.structure
  )
}

// 컬러 필드 감지
const isColorField = (key: string) => {
  return key.toLowerCase().includes('color') || key.toLowerCase().includes('colour')
}

// 컬러 입력 핸들러
const handleColorInput = (key: string, value: string) => {
  const normalized = normalizeColorInput(value)

  // 유효성 검사 (경고만, 입력은 허용)
  if (normalized && !isValidHexColor(normalized)) {
    console.warn(`⚠️ [ColorInput] 유효하지 않은 HEX 컬러: ${normalized}`)
  }

  updateProperty(key, normalized)
}

// PrimeVue ColorPicker 핸들러
const handleColorPickerUpdate = (key: string, value: string) => {
  // ColorPicker는 '#' 없이 값을 반환하므로 추가
  const hexValue = value.startsWith('#') ? value : `#${value}`
  updateProperty(key, hexValue)
}

// 컬러 값 가져오기 (미리보기용)
const getColorValue = (key: string) => {
  const value = String(selectedModule.value?.properties[key] || '')
  // 유효한 HEX 컬러면 그대로, 아니면 기본 회색
  return isValidHexColor(value) ? value : '#cccccc'
}
</script>
