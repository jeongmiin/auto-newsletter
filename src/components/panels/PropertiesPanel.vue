<template>
  <div class="h-full flex flex-col">
    <!-- 패널 헤더 -->
    <div class="p-3 border-b">
      <h2 class="text-lg font-semibold text-gray-800">속성</h2>
    </div>

    <!-- 스크롤 영역 -->
    <div class="flex-1 overflow-y-auto">
      <!-- 공통 속성 섹션 (항상 표시, 접을 수 있음) -->
      <div class="border-b">
        <!-- 공통 속성 헤더 (클릭하여 토글) -->
        <button
          @click="isGlobalSettingsOpen = !isGlobalSettingsOpen"
          class="w-full p-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 bg-gray-200 text-gray-600 rounded flex items-center justify-center">
              <i class="pi pi-cog text-sm"></i>
            </div>
            <div class="text-left">
              <div class="text-sm font-medium text-gray-700">공통 속성</div>
              <div class="text-xs text-gray-500">전체 배경색, 테두리</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <!-- 현재 배경색 미리보기 -->
            <div
              class="w-5 h-5 rounded border border-gray-300"
              :style="{ backgroundColor: wrapSettings.backgroundColor }"
              v-tooltip.left="wrapSettings.backgroundColor"
            ></div>
            <i
              class="pi text-gray-400 transition-transform duration-200"
              :class="isGlobalSettingsOpen ? 'pi-chevron-up' : 'pi-chevron-down'"
            ></i>
          </div>
        </button>

        <!-- 공통 속성 내용 (접을 수 있음) -->
        <div
          v-show="isGlobalSettingsOpen"
          class="p-3 space-y-3 bg-gray-50/50"
        >
          <!-- 배경색 -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">배경색</label>
            <div class="flex items-center gap-2">
              <ColorPicker
                :modelValue="getWrapColorValue('backgroundColor')"
                @update:modelValue="handleWrapColorPickerUpdate('backgroundColor', $event)"
                format="hex"
              />
              <InputText
                :modelValue="wrapSettings.backgroundColor"
                @update:modelValue="handleWrapColorInput('backgroundColor', $event ?? '')"
                placeholder="#f9f9f9"
                class="flex-1 font-mono text-xs"
                size="small"
                spellcheck="false"
              />
            </div>
          </div>

          <!-- 테두리 설정 (가로 배치) -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">테두리</label>
            <div class="flex items-center gap-2 border-settings">
              <!-- 두께 -->
              <InputText
                :modelValue="wrapSettings.borderWidth"
                @update:modelValue="updateWrapProperty('borderWidth', $event ?? '')"
                placeholder="0px"
                class="w-16 font-mono text-xs !h-8"
                size="small"
                v-tooltip.bottom="'두께'"
              />
              <!-- 스타일 -->
              <Select
                :modelValue="wrapSettings.borderStyle"
                @update:modelValue="updateWrapProperty('borderStyle', $event ?? '')"
                :options="borderStyleOptions"
                optionLabel="label"
                optionValue="value"
                class="w-20 !h-8"
                size="small"
                v-tooltip.bottom="'스타일'"
              />
              <!-- 색상 -->
              <div class="flex items-center gap-1 flex-1">
                <ColorPicker
                  :modelValue="getWrapColorValue('borderColor')"
                  @update:modelValue="handleWrapColorPickerUpdate('borderColor', $event)"
                  format="hex"
                  class="border-color-picker"
                />
                <InputText
                  :modelValue="wrapSettings.borderColor"
                  @update:modelValue="handleWrapColorInput('borderColor', $event ?? '')"
                  placeholder="#ddd"
                  class="flex-1 font-mono text-xs !h-8"
                  size="small"
                  spellcheck="false"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 모듈이 선택되지 않았을 때 안내 -->
      <div v-if="!selectedModule" class="flex-1 flex items-center justify-center text-gray-500 px-4 py-12">
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
      <div v-else>
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

          <!-- 텍스트 입력 (컬러 필드) 또는 color 타입 -->
          <div
            v-if="prop.type === 'color' || (prop.type === 'text' && isColorField(prop.key))"
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
            optionLabel="label"
            optionValue="value"
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
          <div v-else-if="prop.type === 'table-editor'" class="space-y-3">
            <!-- 테이블 내용 편집 -->
            <div v-if="tableCells.length > 0" class="space-y-3">
              <!-- 상단 컨트롤 바 -->
              <div class="flex items-center justify-between bg-gray-100 rounded-lg px-3 py-2">
                <div class="flex items-center gap-2">
                  <i class="pi pi-table text-gray-500"></i>
                  <span class="text-sm font-medium text-gray-700">
                    {{ tableCells.length }}행 × {{ tableCells[0]?.length || 0 }}열
                  </span>
                </div>
                <div class="flex gap-1">
                  <Button
                    @click="addTableColumn"
                    icon="pi pi-arrows-h"
                    severity="contrast"
                    text
                    size="small"
                    v-tooltip.top="'열 추가'"
                  />
                  <Button
                    @click="addTableRow"
                    icon="pi pi-arrows-v"
                    severity="contrast"
                    text
                    size="small"
                    v-tooltip.top="'행 추가'"
                  />
                </div>
              </div>

              <!-- 테이블 그리드 형태 편집기 -->
              <div class="table-editor-grid border border-gray-300 rounded-lg overflow-hidden">
                <!-- 열 헤더 (삭제 버튼) -->
                <div class="flex bg-gray-50 border-b border-gray-300">
                  <!-- 왼쪽 상단 빈 셀 (행 컨트롤 공간) -->
                  <div class="w-8 flex-shrink-0 border-r border-gray-200"></div>
                  <!-- 열 헤더들 -->
                  <div
                    v-for="(_, colIndex) in tableCells[0]"
                    :key="`col-header-${colIndex}`"
                    class="flex-1 flex items-center justify-center py-1 border-r border-gray-200 last:border-r-0"
                  >
                    <span class="text-xs text-gray-500 mr-1">{{ colIndex + 1 }}열</span>
                    <Button
                      v-if="tableCells[0].length > 1"
                      @click="removeTableColumn(colIndex)"
                      icon="pi pi-times"
                      severity="secondary"
                      text
                      size="small"
                      class="!p-0 !w-5 !h-5"
                      v-tooltip.top="'열 삭제'"
                    />
                  </div>
                </div>

                <!-- 테이블 본문 (행들) -->
                <div
                  v-for="(row, rowIndex) in tableCells"
                  :key="`row-${rowIndex}`"
                  class="flex border-b border-gray-200 last:border-b-0"
                >
                  <!-- 행 컨트롤 (행 번호 + 삭제) -->
                  <div class="w-8 flex-shrink-0 flex flex-col items-center justify-center bg-gray-50 border-r border-gray-200 py-1">
                    <span class="text-xs text-gray-500">{{ rowIndex + 1 }}</span>
                    <Button
                      v-if="tableCells.length > 1"
                      @click="removeTableRow(rowIndex)"
                      icon="pi pi-times"
                      severity="secondary"
                      text
                      size="small"
                      class="!p-0 !w-5 !h-5"
                      v-tooltip.right="'행 삭제'"
                    />
                  </div>

                  <!-- 셀들 -->
                  <div
                    v-for="(cell, colIndex) in row"
                    :key="cell.id"
                    v-show="!cell.hidden"
                    class="flex-1 p-2 border-r border-gray-200 last:border-r-0"
                    :class="cell.type === 'th' ? 'bg-blue-50' : 'bg-white'"
                    :style="{ flex: cell.colspan > 1 ? cell.colspan : 1 }"
                  >
                    <!-- 셀 컨트롤 (타입 + 정렬 + 병합) -->
                    <div class="flex items-center justify-between mb-1.5 gap-1">
                      <!-- 왼쪽: 타입 토글 + 정렬 -->
                      <div class="flex items-center gap-1">
                        <!-- 셀 타입 토글 -->
                        <button
                          @click="toggleCellType(rowIndex, colIndex)"
                          class="text-xs px-2 py-0.5 rounded-full transition-colors font-medium"
                          :class="cell.type === 'th'
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'"
                          v-tooltip.top="'클릭하여 제목/내용 전환'"
                        >
                          {{ cell.type === 'th' ? 'TH' : 'TD' }}
                        </button>

                        <!-- 정렬 버튼 그룹 -->
                        <div class="flex items-center border border-gray-200 rounded overflow-hidden">
                          <button
                            @click="updateCellAlign(rowIndex, colIndex, 'left')"
                            class="p-1 transition-colors"
                            :class="getCellAlign(cell) === 'left'
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-gray-500 hover:bg-gray-100'"
                            v-tooltip.top="'왼쪽 정렬'"
                          >
                            <i class="pi pi-align-left text-xs"></i>
                          </button>
                          <button
                            @click="updateCellAlign(rowIndex, colIndex, 'center')"
                            class="p-1 border-x border-gray-200 transition-colors"
                            :class="getCellAlign(cell) === 'center'
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-gray-500 hover:bg-gray-100'"
                            v-tooltip.top="'가운데 정렬'"
                          >
                            <i class="pi pi-align-center text-xs"></i>
                          </button>
                          <button
                            @click="updateCellAlign(rowIndex, colIndex, 'right')"
                            class="p-1 transition-colors"
                            :class="getCellAlign(cell) === 'right'
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-gray-500 hover:bg-gray-100'"
                            v-tooltip.top="'오른쪽 정렬'"
                          >
                            <i class="pi pi-align-right text-xs"></i>
                          </button>
                        </div>
                      </div>

                      <!-- 오른쪽: 병합 컨트롤 -->
                      <div class="flex items-center gap-0.5">
                        <div class="flex items-center">
                          <i class="pi pi-arrows-h text-xs text-gray-400 mr-0.5"></i>
                          <select
                            :value="cell.colspan"
                            @change="updateCellColspan(rowIndex, colIndex, ($event.target as HTMLSelectElement).value)"
                            class="text-xs border border-gray-200 rounded w-8 py-0.5 bg-white cursor-pointer"
                            v-tooltip.top="'열 병합'"
                          >
                            <option
                              v-for="n in getMaxColspan(rowIndex, colIndex)"
                              :key="n"
                              :value="n"
                            >{{ n }}</option>
                          </select>
                        </div>
                        <div class="flex items-center">
                          <i class="pi pi-arrows-v text-xs text-gray-400 mr-0.5"></i>
                          <select
                            :value="cell.rowspan"
                            @change="updateCellRowspan(rowIndex, colIndex, ($event.target as HTMLSelectElement).value)"
                            class="text-xs border border-gray-200 rounded w-8 py-0.5 bg-white cursor-pointer"
                            v-tooltip.top="'행 병합'"
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
                      :class="cell.type === 'th' ? 'font-medium' : ''"
                      size="small"
                    />

                    <!-- 병합 표시 배지 -->
                    <div
                      v-if="cell.colspan > 1 || cell.rowspan > 1"
                      class="mt-1 flex gap-1"
                    >
                      <span
                        v-if="cell.colspan > 1"
                        class="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full"
                      >
                        ↔{{ cell.colspan }}
                      </span>
                      <span
                        v-if="cell.rowspan > 1"
                        class="text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full"
                      >
                        ↕{{ cell.rowspan }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 테이블 미리보기 힌트 -->
              <div class="text-xs text-red-400 flex items-center gap-1 font-bold">
                <i class="pi pi-info-circle mr-1"></i>
                TH는 제목 셀, TD는 내용 셀입니다
              </div>
            </div>

            <!-- 테이블이 비어있을 때 -->
            <div v-else class="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <i class="pi pi-table text-3xl text-gray-300 mb-3 block"></i>
              <div class="text-gray-500 mb-4">테이블이 비어있습니다</div>
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
        <div class="p-4 border-t pb-10">
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import type { TableRow, ContentTitle, ContentText, AdditionalContent, TableCell, WrapSettings } from '@/types'
import { normalizeColorInput, isValidHexColor } from '@/utils/colorHelper'
import { processQuillHtml } from '@/utils/quillHtmlProcessor'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()

const selectedModule = computed(() => moduleStore.selectedModule)
const selectedModuleMetadata = computed(() => moduleStore.selectedModuleMetadata)
const editableProps = computed(() => selectedModuleMetadata.value?.editableProps || [])

// 공통 속성 패널 열림 상태
const isGlobalSettingsOpen = ref(false)

// 공통 속성 (wrap 설정)
const wrapSettings = computed(() => editorStore.wrapSettings)

// 테두리 스타일 옵션
const borderStyleOptions = [
  { label: '실선', value: 'solid' },
  { label: '점선', value: 'dotted' },
  { label: '파선', value: 'dashed' },
  { label: '이중선', value: 'double' },
  { label: '없음', value: 'none' },
]

// Wrap 속성 업데이트 함수
const updateWrapProperty = (key: keyof WrapSettings, value: string) => {
  editorStore.updateWrapSettings({ [key]: value })
}

// Wrap 컬러 입력 핸들러
const handleWrapColorInput = (key: keyof WrapSettings, value: string) => {
  const normalized = normalizeColorInput(value)
  updateWrapProperty(key, normalized)
}

// Wrap ColorPicker 핸들러
const handleWrapColorPickerUpdate = (key: keyof WrapSettings, value: string) => {
  const hexValue = value.startsWith('#') ? value : `#${value}`
  updateWrapProperty(key, hexValue)
}

// Wrap 컬러 값 가져오기
const getWrapColorValue = (key: keyof WrapSettings) => {
  const value = wrapSettings.value[key] as string
  return isValidHexColor(value) ? value : '#cccccc'
}

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

// 셀의 현재 정렬 상태 가져오기 (TH 기본: center, TD 기본: left)
const getCellAlign = (cell: TableCell): 'left' | 'center' | 'right' => {
  if (cell.align) return cell.align
  return cell.type === 'th' ? 'center' : 'left'
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

<style scoped>
/* 테두리 설정 input 높이 통일 */
.border-settings :deep(.p-inputtext) {
  height: 2rem !important;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}

.border-settings :deep(.p-select) {
  height: 2rem !important;
}

.border-settings :deep(.p-select-label) {
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  line-height: 1.5rem;
}

/* ColorPicker 크기 조정 */
.border-color-picker :deep(.p-colorpicker-preview) {
  width: 2rem;
  height: 2rem;
}

/* 테이블 에디터 그리드 스타일 */
.table-editor-grid {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-editor-grid :deep(.p-inputtext) {
  font-size: 0.8125rem;
}

.table-editor-grid :deep(.p-inputtext::placeholder) {
  font-size: 0.75rem;
  color: #9ca3af;
}

/* 셀 타입 토글 버튼 호버 효과 */
.table-editor-grid button {
  transition: all 0.15s ease;
}

/* 병합 셀렉트 스타일 */
.table-editor-grid select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 2px center;
  background-repeat: no-repeat;
  background-size: 14px;
  padding-right: 16px;
  text-align: center;
}
</style>
