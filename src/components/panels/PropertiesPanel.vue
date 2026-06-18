<template>
  <!-- min-w-0: 고정폭 래퍼(flex-1 자식) 안에서 내용이 패널을 밀어내지 못하도록 (기본 min-width:auto 무력화) -->
  <div class="h-full flex flex-col min-w-0">
    <!-- 패널 헤더 -->
    <div class="p-3 border-b">
      <h2 class="text-lg font-semibold text-gray-800">속성</h2>
    </div>

    <!-- 스크롤 영역 (가로는 패널 폭으로 클리핑 — 넘치는 편집기는 자체 가로 스크롤을 가진다) -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden">
      <!-- 공통 속성 섹션 (항상 표시, 접을 수 있음) -->
      <div class="border-b">
        <!-- 공통 속성 헤더 (클릭하여 토글) -->
        <button
          @click="isGlobalSettingsOpen = !isGlobalSettingsOpen"
          class="w-full p-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gray-200 text-gray-600 rounded-lg flex items-center justify-center">
              <i class="pi pi-cog text-sm"></i>
            </div>
            <div class="text-left">
              <div class="text-base font-semibold text-gray-700">공통 속성</div>
              <div class="text-sm text-gray-500">전체 배경색, 포인트 색상, 테두리</div>
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
              <ColorAlphaPicker
                :modelValue="getWrapColorValue('backgroundColor')"
                @update:modelValue="handleWrapColorPickerUpdate('backgroundColor', $event)"
              />
              <HexColorInput
                :modelValue="wrapSettings.backgroundColor"
                @update:modelValue="handleWrapColorInput('backgroundColor', $event ?? '')"
                placeholder="#f9f9f9"
                class="flex-1 font-mono text-xs"
                spellcheck="false"
              />
            </div>
          </div>

          <!-- 포인트 색상 -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">포인트 색상</label>
            <div class="flex items-center gap-2">
              <ColorAlphaPicker
                :modelValue="getWrapColorValue('pointColor')"
                @update:modelValue="handleWrapColorPickerUpdate('pointColor', $event)"
              />
              <HexColorInput
                :modelValue="wrapSettings.pointColor"
                @update:modelValue="handleWrapColorInput('pointColor', $event ?? '')"
                placeholder="#2563eb"
                class="flex-1 font-mono text-xs"
                spellcheck="false"
              />
            </div>
            <p class="text-xs text-gray-400 mt-1">각 색상에서 '포인트 색상 사용'을 켜면 이 색을 따릅니다</p>
          </div>

          <!-- 다국어 폰트 -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">폰트 (언어)</label>
            <Select
              :modelValue="wrapSettings.fontLanguage ?? 'default'"
              @update:modelValue="updateWrapProperty('fontLanguage', $event ?? 'default')"
              :options="fontLanguageOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full text-sm"
            />
            <p class="text-xs text-gray-400 mt-1">선택한 언어에 맞는 폰트로 모든 모듈을 일괄 적용합니다</p>
          </div>

          <!-- 테두리 설정 (가로 배치) -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">테두리</label>
            <div class="flex flex-wrap items-center gap-2 border-settings">
              <!-- 두께 -->
              <InputText
                :modelValue="wrapSettings.borderWidth"
                @update:modelValue="updateWrapProperty('borderWidth', $event ?? '')"
                @focus="normalizeWrapBorderWidth"
                @blur="normalizeWrapBorderWidth"
                placeholder="0px"
                class="w-16 font-mono text-xs"
                v-tooltip.bottom="'두께'"
              />
              <!-- 스타일 -->
              <Select
                :modelValue="wrapSettings.borderStyle"
                @update:modelValue="updateWrapProperty('borderStyle', $event ?? '')"
                :options="borderStyleOptions"
                optionLabel="label"
                optionValue="value"
                class="w-30 text-sm"
                v-tooltip.bottom="'스타일'"
              />
              <!-- 색상 -->
              <div class="flex items-center gap-1 flex-1">
                <ColorAlphaPicker
                  :modelValue="getWrapColorValue('borderColor')"
                  @update:modelValue="handleWrapColorPickerUpdate('borderColor', $event)"
                  class="border-color-picker"
                />
                <InputText
                  :modelValue="wrapSettings.borderColor"
                  @update:modelValue="handleWrapColorInput('borderColor', $event ?? '')"
                  placeholder="#ddd"
                  class="flex-1 font-mono text-xs"
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
          <div class="text-sm/5 text-gray-400">
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
      <div class="p-4 space-y-3">
        <component
          v-for="(group, gIdx) in propGroups"
          :key="`grp-${gIdx}-${group.name || 'flat'}`"
          :is="group.name ? 'Panel' : 'div'"
          :header="group.name || undefined"
          :toggleable="!!group.name"
          :collapsed="group.name ? gIdx > 0 : false"
          :pt="group.name ? panelHeaderPt : undefined"
        >
        <template v-if="group.name" #togglericon="{ collapsed }">
          <i :class="collapsed ? 'pi pi-angle-down' : 'pi pi-angle-up'"></i>
        </template>
        <div class="space-y-5">
        <div
          v-for="(prop, index) in group.props"
          :key="prop.key"
          v-show="evalShowWhen(prop.showWhen)"
          :class="{ 'pt-4 border-t border-gray-100': index > 0 && !prop.showWhen }"
        >
          <label
            v-show="prop.type !== 'boolean' && !isColorBlock(prop)"
            class="block text-sm font-medium text-gray-500 mb-2"
          >
            {{ prop.label }}
          </label>

          <!-- 텍스트 입력 (컬러 필드) 또는 color 타입 -->
          <div
            v-if="isColorBlock(prop)"
            class="space-y-2"
          >
            <!-- 라벨 줄: 좌측 라벨 + 우측 포인트 색상 사용 토글 -->
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-500">{{ prop.label }}</span>
              <label class="flex items-center gap-1.5 cursor-pointer select-none">
                <Checkbox
                  :modelValue="isUsingPoint(prop.key)"
                  @update:modelValue="togglePointColor(prop.key, $event)"
                  :binary="true"
                />
                <span class="text-sm text-gray-600">포인트 색상으로 사용</span>
                <span
                  class="w-3 h-3 rounded-sm border border-gray-300"
                  :style="{ backgroundColor: pointColorValue }"
                ></span>
              </label>
            </div>

            <div class="flex items-center gap-2">
              <!-- 색상 + 투명도 -->
              <ColorAlphaPicker
                :modelValue="isUsingPoint(prop.key) ? pointColorValue : getColorValue(prop.key)"
                @update:modelValue="handleColorPickerUpdate(prop.key, $event)"
                :disabled="isUsingPoint(prop.key)"
              />
              <!-- PrimeVue InputText -->
              <InputText
                :modelValue="isUsingPoint(prop.key) ? pointColorValue : String(selectedModule.properties[prop.key] || '')"
                @update:modelValue="handleColorInput(prop.key, $event ?? '')"
                :disabled="isUsingPoint(prop.key)"
                :placeholder="prop.placeholder || '#000000'"
                class="flex-1 font-mono text-sm"
                spellcheck="false"
              />
            </div>

            <p class="text-xs text-gray-400">
              {{ isUsingPoint(prop.key)
                ? '공통 속성의 포인트 색상을 따릅니다 (체크 해제 시 수동 색상 복원)'
                : '색상 박스를 클릭하거나 #000000 형식으로 입력하세요' }}
            </p>
          </div>

          <!-- 텍스트 입력 (일반) -->
          <div v-else-if="prop.type === 'text'" class="space-y-1">
            <InputText
              :modelValue="String(selectedModule.properties[prop.key] || '')"
              @update:modelValue="updateProperty(prop.key, $event ?? '')"
              @focus="normalizePxField(prop)"
              @blur="normalizePxField(prop)"
              :placeholder="prop.placeholder"
              class="w-full"
            />
            <p v-if="prop.hint" class="text-xs text-gray-400">{{ prop.hint }}</p>
          </div>

          <!-- 리치 텍스트 에디터 -->
          <Editor
            v-else-if="prop.type === 'textarea'"
            :model-value="String(selectedModule.properties[prop.key] || '')"
            @update:model-value="handleEditorUpdate(prop.key, $event)"
            @load="onEditorLoad"
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
                <select class="ql-fontSize" title="글자 크기">
                  <option value="28px">28px</option>
                  <option value="26px">26px</option>
                  <option value="24px">24px</option>
                  <option value="22px">22px</option>
                  <option value="20px">20px</option>
                  <option value="18px">18px</option>
                  <option value="16px">16px</option>
                  <option selected>본문</option>
                </select>
                <select class="ql-lineHeight" title="행간(줄 간격)">
                  <option value="1.0">1.0</option>
                  <option value="1.2">1.2</option>
                  <option value="1.5">1.5</option>
                  <option value="1.7">1.7</option>
                  <option value="2.0">2.0</option>
                  <option selected>행간</option>
                </select>
                <select class="ql-letterSpacing" title="자간(글자 간격)">
                  <option value="-1px">-1px</option>
                  <option value="-0.7px">-0.7px</option>
                  <option value="-0.5px">-0.5px</option>
                  <option value="-0.3px">-0.3px</option>
                  <option selected>자간</option>
                </select>
              </span>
              <span class="ql-formats">
                <button class="ql-list" value="ordered" title="번호 목록"></button>
                <button class="ql-list" value="bullet" title="글머리 기호"></button>
              </span>
              <span class="ql-formats">
                <select class="ql-align" title="정렬"></select>
                <select class="ql-wordBreak" title="줄바꿈 규칙(문단 단위)">
                  <option value="keep-all">단어기준</option>
                  <option value="break-all">글자기준</option>
                  <option selected>줄바꿈</option>
                </select>
              </span>
              <span class="ql-formats">
                <select class="ql-color" title="글자 색상"></select>
                <select class="ql-background" title="배경 색상"></select>
                <select class="ql-highlightMarker" title="형광펜">
                  <option selected></option>
                  <option value="#fff555"></option>
                  <option value="#ffd1d1"></option>
                  <option value="#c7f0c7"></option>
                  <option value="#cce4ff"></option>
                  <option value="#ffd9b3"></option>
                  <option value="#e0c7ff"></option>
                </select>
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
                    @load="onEditorLoad"
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
                    @load="onEditorLoad"
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
                    icon="pi pi-plus"
                    label="열 추가"
                    severity="contrast"
                    text
                    size="small"
                  />
                  <Button
                    @click="addTableRow"
                    icon="pi pi-plus"
                    label="행 추가"
                    severity="contrast"
                    text
                    size="small"
                  />
                </div>
              </div>

              <!-- 테이블 그리드 형태 편집기 (열이 많아지면 페이지가 아니라 이 영역 안에서 가로 스크롤) -->
              <div class="table-editor-grid border border-gray-300 rounded-lg overflow-x-auto">
                <!-- 열 헤더 (열 번호/삭제 + 열 너비 입력) -->
                <div class="flex min-w-full bg-gray-50 border-b border-gray-300">
                  <!-- 왼쪽 상단 빈 셀 (행 컨트롤 공간) -->
                  <div class="w-8 flex-shrink-0 bg-gray-50 border-r border-gray-200"></div>
                  <!-- 열 헤더들 (열이 적으면 grow로 채우고, 많으면 기준 너비로 고정되어 스크롤) -->
                  <div
                    v-for="(_, colIndex) in tableCells[0]"
                    :key="`col-header-${colIndex}`"
                    class="flex flex-col px-2 bg-gray-50 border-r border-r-gray-200 border-b border-b-gray-300 last:border-r-0"
                    :style="{ flexGrow: 1, flexShrink: 0, flexBasis: tableColWidth + 'px' }"
                  >
                    <!-- 상단: 열 번호 + 삭제 -->
                    <div class="flex items-center justify-center gap-1 py-1.5">
                      <span class="text-xs font-semibold text-gray-700">{{ colIndex + 1 }}열</span>
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
                    <!-- 구분선 -->
                    <div class="border-t border-gray-200"></div>
                    <!-- 하단: 너비 라벨 + 입력 -->
                    <div class="flex items-center gap-1.5 py-1.5">
                      <label
                        :for="`col-width-${colIndex}`"
                        class="text-xs font-medium text-gray-500 shrink-0"
                      >넓이</label>
                      <div
                        class="col-width-field flex-1 min-w-0 flex items-center bg-white border border-gray-300 rounded focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-200 transition-colors"
                        v-tooltip.top="'예: 30%, 120px — 비우면 자동'"
                      >
                        <InputText
                          :id="`col-width-${colIndex}`"
                          :modelValue="getColWidth(colIndex)"
                          @update:modelValue="updateColWidth(colIndex, $event ?? '')"
                          placeholder="자동"
                          class="flex-1 min-w-0 !border-0 !shadow-none !bg-transparent !text-xs !py-1 !px-1.5"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 테이블 본문 (행들) -->
                <div
                  v-for="(row, rowIndex) in tableCells"
                  :key="`row-${rowIndex}`"
                  class="flex min-w-full border-b border-gray-200 last:border-b-0"
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
                    class="p-2 border-r border-gray-200 last:border-r-0"
                    :class="cell.type === 'th' ? 'bg-blue-50' : 'bg-white'"
                    :style="{
                      flexGrow: cell.colspan,
                      flexShrink: 0,
                      flexBasis: (cell.colspan > 1 ? cell.colspan * tableColWidth : tableColWidth) + 'px',
                    }"
                  >
                    <!-- 셀 컨트롤 (타입 + 정렬 + 병합) -->
                    <div class="flex flex-wrap items-center justify-between mb-1.5 gap-1">
                      <!-- 왼쪽: 타입 토글 + 정렬 -->
                      <div class="flex flex-wrap items-center gap-1">
                        <!-- 셀 타입 토글 -->
                        <button
                          @click="toggleCellType(rowIndex, colIndex)"
                          class="text-xs px-2 py-0.5 rounded-full transition-colors font-medium"
                          :class="cell.type === 'th'
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'"
                          v-tooltip.top="'클릭하여 제목/내용 전환'"
                        >
                          {{ cell.type === 'th' ? '제목' : '내용' }}
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

                        <!-- 셀 색상 스와치 (클릭 시 색상 편집기 펼침) -->
                        <button
                          @click="toggleCellColorEditor(rowIndex, colIndex)"
                          class="flex items-center justify-center w-6 h-6 rounded border text-xs font-bold leading-none transition-colors"
                          :class="isCellColorOpen(rowIndex, colIndex)
                            ? 'border-blue-500 ring-1 ring-blue-200'
                            : 'border-gray-300 hover:border-gray-400'"
                          :style="{ backgroundColor: getCellEffectiveBg(cell), color: getCellEffectiveText(cell) }"
                          v-tooltip.top="'셀 배경색·글자색·굵게'"
                        >가</button>
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

                    <!-- 셀 색상 편집기 (펼침) -->
                    <div
                      v-if="isCellColorOpen(rowIndex, colIndex)"
                      class="cell-color-editor mb-1.5 p-2 bg-gray-50 border border-gray-200 rounded space-y-1.5"
                    >
                      <!-- 배경색 -->
                      <div class="flex items-center gap-1.5">
                        <label class="text-xs text-gray-500 w-7 shrink-0">배경</label>
                        <ColorAlphaPicker
                          :modelValue="getCellEffectiveBg(cell)"
                          @update:modelValue="updateCellBgColor(rowIndex, colIndex, $event)"
                        />
                        <InputText
                          :modelValue="cell.bgColor || ''"
                          @update:modelValue="updateCellBgColorInput(rowIndex, colIndex, $event ?? '')"
                          :placeholder="getCellEffectiveBg(cell)"
                          class="flex-1 min-w-0 font-mono !text-xs"
                          size="small"
                          spellcheck="false"
                        />
                      </div>
                      <!-- 글자색 -->
                      <div class="flex items-center gap-1.5">
                        <label class="text-xs text-gray-500 w-7 shrink-0">글자</label>
                        <ColorAlphaPicker
                          :modelValue="getCellEffectiveText(cell)"
                          @update:modelValue="updateCellTextColor(rowIndex, colIndex, $event)"
                        />
                        <InputText
                          :modelValue="cell.textColor || ''"
                          @update:modelValue="updateCellTextColorInput(rowIndex, colIndex, $event ?? '')"
                          :placeholder="getCellEffectiveText(cell)"
                          class="flex-1 min-w-0 font-mono !text-xs"
                          size="small"
                          spellcheck="false"
                        />
                      </div>
                      <!-- 굵게 (아래 내용에서 드래그 선택한 부분만) -->
                      <div class="flex items-center gap-1.5 pt-1.5 border-t border-gray-200">
                        <label class="text-xs text-gray-500 w-7 shrink-0">굵게</label>
                        <button
                          @mousedown.prevent="applyCellBold(cell)"
                          class="flex items-center justify-center w-6 h-6 rounded border border-gray-300 hover:border-gray-400 text-xs font-bold leading-none transition-colors bg-white text-gray-700"
                          v-tooltip.top="'드래그한 부분을 굵게 (다시 누르면 해제)'"
                        >B</button>
                        <span class="text-xs text-gray-400">아래 내용에서 드래그 후 클릭</span>
                      </div>
                      <!-- 기본값으로 초기화 -->
                      <button
                        @click="resetCellColors(rowIndex, colIndex)"
                        class="text-xs text-gray-500 hover:text-blue-600 underline"
                      >기본값으로</button>
                    </div>

                    <!-- 셀 내용 입력 (굵게는 화면에 실제 굵게로 표시, ** 마커는 숨김) -->
                    <TableCellEditor
                      :ref="(el) => setCellEditorRef(cell.id, el)"
                      :el-id="`tcell-${cell.id}`"
                      :modelValue="cell.content"
                      @update:modelValue="updateCellContent(rowIndex, colIndex, $event ?? '')"
                      :placeholder="cell.type === 'th' ? '제목' : '내용'"
                      :is-header="cell.type === 'th'"
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
        </component>
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
import type { TableRow, ContentTitle, ContentText, AdditionalContent, TableCell, WrapSettings, EditableProp } from '@/types'
import { normalizeColorInput, isValidHexColor } from '@/utils/colorHelper'
import { normalizePxLength } from '@/utils/cssUnit'
import { POINT_COLOR_SUFFIX } from '@/utils/pointColor'
import { FONT_LANGUAGE_OPTIONS } from '@/utils/fontFamily'
import { processQuillHtml } from '@/utils/quillHtmlProcessor'
import TableCellEditor from './TableCellEditor.vue'
import ColorAlphaPicker from '@/components/ColorAlphaPicker.vue'
import HexColorInput from '@/components/HexColorInput.vue'
import type Quill from 'quill'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()

const selectedModule = computed(() => moduleStore.selectedModule)
const selectedModuleMetadata = computed(() => moduleStore.selectedModuleMetadata)
const editableProps = computed(() => selectedModuleMetadata.value?.editableProps || [])

// 아코디언 그룹: 모든 prop에 group이 지정되면 그룹별 묶기, 그렇지 않으면 단일 평면 그룹
const propGroups = computed(() => {
  const props = editableProps.value
  if (!props.length) return [{ name: null as string | null, props: [] as typeof props }]
  const allGrouped = props.every((p) => !!p.group)
  if (!allGrouped) {
    return [{ name: null as string | null, props }]
  }
  const order: string[] = []
  const map = new Map<string, typeof props>()
  for (const p of props) {
    const g = p.group as string
    if (!map.has(g)) {
      map.set(g, [])
      order.push(g)
    }
    map.get(g)!.push(p)
  }
  return order.map((name) => ({ name: name as string | null, props: map.get(name)! }))
})

// 조건부 표시 평가
const evalShowWhen = (showWhen: unknown): boolean => {
  if (!showWhen) return true
  if (!selectedModule.value) return true
  const props = selectedModule.value.properties
  if (typeof showWhen === 'string') {
    return props[showWhen] === true
  }
  if (typeof showWhen === 'object' && showWhen !== null && 'key' in showWhen) {
    const cond = showWhen as { key: string; equals?: unknown; notEquals?: unknown }
    const value = props[cond.key]
    if ('equals' in cond) return value === cond.equals
    if ('notEquals' in cond) return value !== cond.notEquals
    return value === true
  }
  return true
}

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

// 다국어 폰트 옵션 (공통 속성)
const fontLanguageOptions = FONT_LANGUAGE_OPTIONS

// 커스텀 테이블 편집기 열 기준 너비(px) — flex-basis로 사용.
// 열이 적으면 grow로 늘어나 패널을 꽉 채우고, 많아지면 이 너비로 고정되어 가로 스크롤된다.
// 헤더·본문이 동일 컨테이너 폭에서 같은 flex 설정을 쓰므로 두 상태 모두 정렬이 맞는다.
// 병합(colspan) 셀은 이 값의 배수로 grow/basis를 잡아 헤더 열들과 정렬된다.
const tableColWidth = 220

// 속성 그룹 패널: 헤더 전체를 클릭 영역으로 만든다.
// 토글 버튼(아이콘) 외 영역을 클릭하면 헤더 안의 토글 버튼을 대신 클릭해 아코디언을 연다.
// (PrimeVue 기본은 아이콘 버튼만 클릭 가능 — 클래스명에 의존하지 않도록 <button>을 직접 찾는다)
const onPanelHeaderClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  // 토글 버튼 자체 클릭은 PrimeVue 기본 동작에 맡겨 더블 토글을 방지
  if (target.closest('button')) return
  const header = event.currentTarget as HTMLElement
  header.querySelector('button')?.click()
}

const panelHeaderPt = {
  header: {
    onClick: onPanelHeaderClick,
    style: 'cursor: pointer',
  },
}

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

// px 전용 길이 필드 판별: placeholder가 px 예시를 담고 %를 포함하지 않을 때.
// (%·px 혼용 필드 — 커스텀 테이블 열 너비, 이미지 너비 등 — 은 자동 보정 제외)
const isPxAutoField = (prop: EditableProp): boolean =>
  prop.type === 'text' &&
  !!prop.placeholder &&
  /px/i.test(prop.placeholder) &&
  !prop.placeholder.includes('%')

// px 전용 필드의 단위 보정 (포커스·블러 시 모두 호출).
// 단위 없는 숫자엔 'px'를 붙이고, 빈 값은 '0px' 기본값으로 채운다.
const normalizePxField = (prop: EditableProp) => {
  if (!isPxAutoField(prop) || !selectedModule.value) return
  const raw = String(selectedModule.value.properties[prop.key] ?? '')
  const fixed = normalizePxLength(raw)
  if (fixed !== raw) updateProperty(prop.key, fixed)
}

// 공통 속성 테두리 두께(px)도 동일하게 단위 보정
const normalizeWrapBorderWidth = () => {
  const fixed = normalizePxLength(wrapSettings.value.borderWidth)
  if (fixed !== wrapSettings.value.borderWidth) updateWrapProperty('borderWidth', fixed)
}

// 붙여넣기 시 모든 서식 제거 — 텍스트만 입력되도록 한다.
// (복사 원본의 텍스트 색상/배경 등은 가져오지 않고, 스타일은 속성 패널에서 적용)
// PrimeVue Editor가 내부 Quill 인스턴스를 @load로 전달한다.
const onEditorLoad = (event: { instance: Quill }) => {
  const quill = event.instance
  if (!quill) return

  quill.clipboard.addMatcher(Node.ELEMENT_NODE, (_node, delta) => {
    delta.ops = delta.ops
      .filter((op) => typeof op.insert === 'string') // 이미지 등 임베드 제외, 텍스트만
      .map((op) => ({ insert: op.insert as string })) // 색상/배경/굵기 등 모든 속성 제거
    return delta
  })
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
  return [...contents].sort((a, b) => a.order - b.order)
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

// 셀별 내용 에디터 인스턴스 참조 (굵게 버튼이 해당 셀 에디터의 선택에 작용)
const cellEditorRefs = new Map<string, { toggleBold: () => void }>()
const setCellEditorRef = (id: string, el: unknown) => {
  if (el) cellEditorRefs.set(id, el as { toggleBold: () => void })
  else cellEditorRefs.delete(id)
}

// 내용에서 드래그 선택한 구간을 굵게 토글 (에디터가 ** 마커로 저장, 화면엔 굵게로 표시)
const applyCellBold = (cell: TableCell) => {
  cellEditorRefs.get(cell.id)?.toggleBold()
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

// ===== 셀별 배경색/글자색 =====
// 펼쳐진 색상 편집기의 대상 셀 (rowIndex-colIndex 키)
const openColorCellKey = ref<string | null>(null)
const isCellColorOpen = (rowIndex: number, colIndex: number) =>
  openColorCellKey.value === `${rowIndex}-${colIndex}`
const toggleCellColorEditor = (rowIndex: number, colIndex: number) => {
  const key = `${rowIndex}-${colIndex}`
  openColorCellKey.value = openColorCellKey.value === key ? null : key
}

// 타입별(th/td) 일괄 색상 기본값 (렌더러 폴백과 동일)
const tableDefaultColors = computed(() => {
  const p = selectedModule.value?.properties ?? {}
  return {
    headerBg: String(p.headerBgColor || '#f6f6f6'),
    cellBg: String(p.cellBgColor || '#ffffff'),
    headerText: String(p.headerTextColor || '#333333'),
    cellText: String(p.cellTextColor || '#333333'),
  }
})

// 셀에 실제 적용되는 색상 (셀 지정값 > 타입별 일괄 색상)
const getCellEffectiveBg = (cell: TableCell): string => {
  if (cell.bgColor) return cell.bgColor
  return cell.type === 'th' ? tableDefaultColors.value.headerBg : tableDefaultColors.value.cellBg
}
const getCellEffectiveText = (cell: TableCell): string => {
  if (cell.textColor) return cell.textColor
  return cell.type === 'th' ? tableDefaultColors.value.headerText : tableDefaultColors.value.cellText
}

// ColorPicker(#없이 반환) 업데이트
const updateCellBgColor = (rowIndex: number, colIndex: number, value: string) => {
  if (!selectedModule.value) return
  const hex = value.startsWith('#') ? value : `#${value}`
  moduleStore.updateTableCell(selectedModule.value.id, rowIndex, colIndex, { bgColor: hex })
}
const updateCellTextColor = (rowIndex: number, colIndex: number, value: string) => {
  if (!selectedModule.value) return
  const hex = value.startsWith('#') ? value : `#${value}`
  moduleStore.updateTableCell(selectedModule.value.id, rowIndex, colIndex, { textColor: hex })
}

// HEX 텍스트 입력 업데이트 (비우면 일괄 색상으로 복귀)
const updateCellBgColorInput = (rowIndex: number, colIndex: number, value: string) => {
  if (!selectedModule.value) return
  const normalized = normalizeColorInput(value)
  moduleStore.updateTableCell(selectedModule.value.id, rowIndex, colIndex, {
    bgColor: normalized || undefined,
  })
}
const updateCellTextColorInput = (rowIndex: number, colIndex: number, value: string) => {
  if (!selectedModule.value) return
  const normalized = normalizeColorInput(value)
  moduleStore.updateTableCell(selectedModule.value.id, rowIndex, colIndex, {
    textColor: normalized || undefined,
  })
}

// 셀 색상을 일괄 색상(기본값)으로 초기화
const resetCellColors = (rowIndex: number, colIndex: number) => {
  if (!selectedModule.value) return
  moduleStore.updateTableCell(selectedModule.value.id, rowIndex, colIndex, {
    bgColor: undefined,
    textColor: undefined,
  })
}

// 커스텀 테이블 열 너비 (colgroup>col에 적용)
const getColWidth = (colIndex: number): string => {
  const widths = (selectedModule.value?.properties.tableColWidths as string[] | undefined) || []
  return widths[colIndex] ?? ''
}

const updateColWidth = (colIndex: number, width: string) => {
  if (selectedModule.value) {
    moduleStore.updateTableColWidth(selectedModule.value.id, colIndex, width)
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

// 컬러피커 입력 블록으로 렌더되는 속성인지 (color 타입 또는 컬러 텍스트 필드)
const isColorBlock = (prop: { type: string; key: string }) => {
  return prop.type === 'color' || (prop.type === 'text' && isColorField(prop.key))
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

// ===== 포인트 색상 사용 =====
// 전역 포인트 색상 (유효한 HEX면 그대로)
const pointColorValue = computed(() => {
  const value = wrapSettings.value.pointColor
  return isValidHexColor(value) ? value : '#2563eb'
})

// 해당 색상 속성이 '포인트 색상 사용' 상태인지
const isUsingPoint = (key: string): boolean => {
  return selectedModule.value?.properties[`${key}${POINT_COLOR_SUFFIX}`] === true
}

// 포인트 색상 사용 토글 — 수동 색상값(properties[key])은 보존하므로 해제 시 자동 원복
const togglePointColor = (key: string, value: boolean): void => {
  updateProperty(`${key}${POINT_COLOR_SUFFIX}`, value === true)
}
</script>

<style scoped>
/* Quill 에디터를 이메일 기본 폰트로 통일 (입력 시 결과물과 동일하게 보이도록) */
:deep(.ql-editor) {
  font-family: AppleSDGothic, 'malgun gothic', 'nanum gothic', 'Noto Sans KR', sans-serif;
}

/*
  리스트 마커 단일화 — 글머리(bullet)=•, 번호(ordered)=1.
  네이티브 <ol> 숫자 등 다른 마커를 모두 끄고, Quill이 각 항목에 넣는
  <span class="ql-ui">의 ::before로만 마커를 그려 이중 표기를 방지한다.
*/
:deep(.ql-editor ol),
:deep(.ql-editor ul) {
  margin: 0;
  padding-left: 1.5em;
  list-style: none !important;
  counter-reset: ql-list-0;
}
:deep(.ql-editor li[data-list]) {
  list-style: none !important;
}
/* 혹시 남아있는 네이티브 ::marker(숫자)도 강제로 숨김 */
:deep(.ql-editor li[data-list]::marker) {
  content: '' !important;
}
:deep(.ql-editor li[data-list] > .ql-ui) {
  display: inline-block;
  margin-left: -1.5em;
  margin-right: 0.3em;
  text-align: right;
  white-space: nowrap;
  width: 1.2em;
}
:deep(.ql-editor li[data-list='bullet'] > .ql-ui::before) {
  content: '\2022'; /* • */
}
:deep(.ql-editor li[data-list='ordered']) {
  counter-increment: ql-list-0;
}
:deep(.ql-editor li[data-list='ordered'] > .ql-ui::before) {
  content: counter(ql-list-0, decimal) '. ';
}

/* 행간(line-height) 드롭다운 픽커 */
:deep(.ql-snow .ql-picker.ql-lineHeight) {
  width: 58px;
}
/* snow 테마는 header/font/size 픽커에만 data-label 텍스트를 표시하므로,
   커스텀 lineHeight 픽커에도 동일하게 항목/라벨 텍스트(1.0~2.0, 행간)를 노출 */
:deep(.ql-snow .ql-picker.ql-lineHeight .ql-picker-label[data-label]:not([data-label=''])::before),
:deep(.ql-snow .ql-picker.ql-lineHeight .ql-picker-item[data-label]:not([data-label=''])::before) {
  content: attr(data-label);
}

/* 글자 크기(font-size) 드롭다운 픽커 — 선택 영역에 부분 적용(인라인) */
:deep(.ql-snow .ql-picker.ql-fontSize) {
  width: 64px;
}
:deep(.ql-snow .ql-picker.ql-fontSize .ql-picker-label[data-label]:not([data-label=''])::before),
:deep(.ql-snow .ql-picker.ql-fontSize .ql-picker-item[data-label]:not([data-label=''])::before) {
  content: attr(data-label);
}

/* 자간(letter-spacing) 드롭다운 픽커 — 선택 영역에 부분 적용(인라인) */
:deep(.ql-snow .ql-picker.ql-letterSpacing) {
  width: 64px;
}
:deep(.ql-snow .ql-picker.ql-letterSpacing .ql-picker-label[data-label]:not([data-label=''])::before),
:deep(.ql-snow .ql-picker.ql-letterSpacing .ql-picker-item[data-label]:not([data-label=''])::before) {
  content: attr(data-label);
}

/* 줄바꿈 규칙(word-break) 드롭다운 픽커 — lineHeight와 동일하게 data-label 텍스트 노출 */
:deep(.ql-snow .ql-picker.ql-wordBreak) {
  width: 76px;
}
:deep(.ql-snow .ql-picker.ql-wordBreak .ql-picker-label[data-label]:not([data-label=''])::before),
:deep(.ql-snow .ql-picker.ql-wordBreak .ql-picker-item[data-label]:not([data-label=''])::before) {
  content: attr(data-label);
}
/* 옵션 라벨이 길어 줄바꿈/잘림되지 않도록 옵션 목록 폭 자동 확장 */
:deep(.ql-snow .ql-picker.ql-wordBreak .ql-picker-options) {
  width: max-content;
  white-space: nowrap;
}

/* 형광펜(반투명 마커) 드롭다운 픽커 */
:deep(.ql-snow .ql-picker.ql-highlightMarker) {
  width: 32px;
}
:deep(.ql-snow .ql-picker.ql-highlightMarker .ql-picker-label) {
  padding-left: 2px;
  padding-right: 12px;
}
/* 라벨(툴바 버튼)에 형광펜 식별 아이콘 표시 */
:deep(.ql-snow .ql-picker.ql-highlightMarker .ql-picker-label::before) {
  content: 'ab';
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  background: linear-gradient(transparent 50%, #fff555 50%);
  padding: 0 2px;
}
:deep(.ql-snow .ql-picker.ql-highlightMarker .ql-picker-options) {
  padding: 4px;
  width: 130px;
}
/* 색상 스와치 */
:deep(.ql-snow .ql-picker.ql-highlightMarker .ql-picker-item) {
  width: 18px;
  height: 18px;
  float: left;
  margin: 2px;
  padding: 0;
  border: 1px solid #ccc;
}
:deep(.ql-snow .ql-picker.ql-highlightMarker .ql-picker-item:hover),
:deep(.ql-snow .ql-picker.ql-highlightMarker .ql-picker-item.ql-selected) {
  border-color: #06c;
}
/* 첫 옵션(값 없음) = 형광펜 해제 */
:deep(.ql-snow .ql-picker.ql-highlightMarker .ql-picker-item:not([data-value])) {
  position: relative;
  background: #fff;
}
:deep(.ql-snow .ql-picker.ql-highlightMarker .ql-picker-item:not([data-value])::after) {
  content: '✕';
  position: absolute;
  inset: 0;
  font-size: 11px;
  line-height: 16px;
  text-align: center;
  color: #999;
}
:deep(.ql-snow .ql-picker.ql-highlightMarker .ql-picker-item[data-value='#fff555']) {
  background: linear-gradient(transparent 50%, #fff555 50%);
}
:deep(.ql-snow .ql-picker.ql-highlightMarker .ql-picker-item[data-value='#ffd1d1']) {
  background: linear-gradient(transparent 50%, #ffd1d1 50%);
}
:deep(.ql-snow .ql-picker.ql-highlightMarker .ql-picker-item[data-value='#c7f0c7']) {
  background: linear-gradient(transparent 50%, #c7f0c7 50%);
}
:deep(.ql-snow .ql-picker.ql-highlightMarker .ql-picker-item[data-value='#cce4ff']) {
  background: linear-gradient(transparent 50%, #cce4ff 50%);
}
:deep(.ql-snow .ql-picker.ql-highlightMarker .ql-picker-item[data-value='#ffd9b3']) {
  background: linear-gradient(transparent 50%, #ffd9b3 50%);
}
:deep(.ql-snow .ql-picker.ql-highlightMarker .ql-picker-item[data-value='#e0c7ff']) {
  background: linear-gradient(transparent 50%, #e0c7ff 50%);
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

/* 열 너비 입력 — 래퍼가 테두리/포커스 링을 담당하므로 내부 InputText는 평평하게 */
.col-width-field :deep(.p-inputtext) {
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  background: transparent !important;
  height: 1.5rem;
}
.col-width-field :deep(.p-inputtext:focus) {
  box-shadow: none !important;
  outline: none !important;
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
