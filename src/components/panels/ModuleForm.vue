<template>
  <!-- ModuleForm: PropertiesPanel.vue에서 추출한 "선택된 모듈 있음" 전용 폼.
       selectedModule가 없으면 아무것도 그리지 않는다(호출부가 보통 이미 selectedModule 존재를 보고 렌더하지만,
       v-if로 한 번 더 방어해 selectedModule 타입도 non-null로 좁힌다). -->
  <div v-if="selectedModule">
        <!-- 영역 컬럼 분할 -->
        <div class="px-4 py-3 border-b bg-white">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-1.5">
              <i class="pi pi-th-large text-gray-500 text-sm"></i>
              <span class="text-sm font-medium text-gray-700">이 행 컬럼 분할</span>
            </div>
            <span
              v-if="moduleColumnInfo.columns > 1"
              class="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full"
            >이 행 {{ moduleColumnInfo.columns }}단 중 {{ moduleColumnInfo.columnIndex + 1 }}번</span>
            <span v-else class="text-xs text-gray-400">이 행 1단 (분할 안 됨)</span>
          </div>

          <div class="flex flex-wrap items-center gap-1.5">
            <div class="gg-segment">
              <button
                type="button"
                class="gg-segment-btn"
                :disabled="moduleColumnInfo.columns >= 4"
                @click="splitSelectedModule"
                v-tooltip.top="'이 모듈이 있는 행만 컬럼으로 분할 (+1단, 최대 4단 · 모바일은 세로로 쌓임)'"
              >
                <i class="pi pi-plus"></i>
                컬럼 추가
              </button>
              <button
                type="button"
                class="gg-segment-btn gg-segment-btn--ghost"
                :disabled="moduleColumnInfo.columns <= 1"
                @click="unsplitSelectedModule"
                v-tooltip.top="'이 행의 컬럼 분할 되돌리기 (-1단)'"
              >
                <i class="pi pi-replay"></i>
                되돌리기
              </button>
            </div>
            <template v-if="moduleColumnInfo.columns > 1">
              <span class="w-px h-5 bg-gray-200 mx-0.5"></span>
              <Button
                @click="moveSelectedModuleColumn('left')"
                :disabled="moduleColumnInfo.columnIndex === 0"
                icon="pi pi-arrow-left"
                severity="secondary"
                size="small"
                text
                v-tooltip.top="'이 모듈을 왼쪽 컬럼으로 이동'"
              />
              <Button
                @click="moveSelectedModuleColumn('right')"
                :disabled="moduleColumnInfo.columnIndex >= moduleColumnInfo.columns - 1"
                icon="pi pi-arrow-right"
                severity="secondary"
                size="small"
                text
                v-tooltip.top="'이 모듈을 오른쪽 컬럼으로 이동'"
              />
            </template>
          </div>
          <p class="text-xs text-gray-400 mt-2">
            선택한 모듈이 있는 <b>행</b>만 컬럼으로 나뉩니다(행마다 독립). 데스크톱은 가로, 모바일은 세로로 쌓입니다.
          </p>
        </div>

        <!-- 속성 편집 폼 -->
      <div class="p-4 space-y-3 bg-gray-50">
        <div
          v-for="(group, gIdx) in propGroups"
          :key="`grp-${gIdx}-${group.name || 'flat'}`"
          class="gg-acc-section"
          :class="{ 'gg-acc-section--flat': !group.name }"
        >
        <!-- 이름 있는 prop 그룹(레거시 모듈의 로고/타이틀 등 섹션) — Figma 352-1138의 접이식 헤더 패턴.
             그룹 전체를 켜고 끄는 토글(예: showLogo)이 있으면 헤더로 끌어올려 판넬을 열기 전에도 제어 가능하게 한다. -->
        <div
          v-if="group.name"
          class="gg-acc-header"
          :class="{ 'is-static': isGroupSelfLabeled(group) }"
          @click="isGroupSelfLabeled(group) || toggleGroupPanel(group, gIdx)"
        >
          <i
            v-if="!isGroupSelfLabeled(group)"
            class="pi gg-acc-chevron"
            :class="isGroupPanelExpanded(group, gIdx) ? 'pi-chevron-down' : 'pi-chevron-right'"
          ></i>
          <span class="gg-acc-label">{{ group.name }}</span>
          <span class="gg-acc-spacer"></span>
          <ToggleSwitch
            v-if="groupHeaderToggle(group)"
            :modelValue="Boolean(selectedModule.properties[groupHeaderToggle(group)!.key])"
            @update:modelValue="updateProperty(groupHeaderToggle(group)!.key, $event)"
            @click.stop
          />
        </div>
        <div
          class="space-y-5"
          :class="{ 'gg-acc-body': !!group.name }"
          v-show="!group.name || isGroupSelfLabeled(group) || isGroupPanelExpanded(group, gIdx)"
        >
        <div
          v-for="(prop, index) in group.props"
          :key="prop.key"
          v-show="evalShowWhen(prop.showWhen) && !isQuadMember(prop, group.props, index) && !isBorderMember(prop, group.props) && isGatedFieldVisible(prop, group.props) && groupHeaderToggle(group) !== prop"
          :class="{ 'pt-4 border-t border-gray-100': index > 0 && !prop.showWhen }"
        >
          <label
            v-show="prop.type !== 'boolean' && prop.type !== 'checkbox' && !isColorBlock(prop) && !isQuadStart(prop, group.props, index) && !isBorderStyleStart(prop)"
            class="gg-field-label"
          >
            {{ prop.label }}
          </label>

          <!-- 여백/패딩 등 4방향(Top/Right/Bottom/Left) 세트 — 잠금 슬라이더 UI (Figma 365-2691) -->
          <div v-if="isQuadStart(prop, group.props, index)" class="gg-margin-quad">
            <div class="gg-margin-quad-head">
              <!-- 그룹명과 같으면(예: 그룹"여백" 안의 여백) 이름을 한 번만 — 빈 span으로 자리만 유지해 잠금 버튼은 우측 정렬 -->
              <span class="gg-field-label !mb-0">{{ isDupLabelProp(group, prop) ? '' : quadLabel(prop) }}</span>
              <button
                type="button"
                class="gg-lock-btn"
                :class="{ 'is-locked': isQuadLocked(quadPrefixFor(prop)) }"
                @click="toggleQuadLock(quadPrefixFor(prop))"
                v-tooltip.top="isQuadLocked(quadPrefixFor(prop)) ? '잠금 해제하면 방향별로 따로 조정할 수 있어요' : '잠그면 4방향이 함께 움직여요'"
              >
                <i :class="isQuadLocked(quadPrefixFor(prop)) ? 'pi pi-lock' : 'pi pi-lock-open'"></i>
              </button>
            </div>

            <div v-if="isQuadLocked(quadPrefixFor(prop))" class="gg-margin-slider-row">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                :value="quadPxNumber(prop)"
                @input="onQuadValueInput(prop, group.props, index, $event)"
                class="gg-margin-slider"
              />
              <div class="gg-margin-value-field">
                <input
                  type="number"
                  min="0"
                  :value="quadPxNumber(prop)"
                  @input="onQuadValueInput(prop, group.props, index, $event)"
                  class="gg-margin-value-input"
                />
                <span class="gg-margin-value-unit">px</span>
              </div>
            </div>

            <div v-else class="gg-margin-grid">
              <div class="gg-margin-cell">
                <span class="gg-margin-cell-label">상</span>
                <input
                  type="number"
                  min="0"
                  :value="quadPxNumber(prop)"
                  @input="onQuadDirInput(prop, $event)"
                  class="gg-margin-cell-input"
                />
              </div>
              <div class="gg-margin-cell">
                <span class="gg-margin-cell-label">우</span>
                <input
                  type="number"
                  min="0"
                  :value="quadPxNumber(quadRight(group.props, index))"
                  @input="onQuadDirInput(quadRight(group.props, index), $event)"
                  class="gg-margin-cell-input"
                />
              </div>
              <div class="gg-margin-cell">
                <span class="gg-margin-cell-label">하</span>
                <input
                  type="number"
                  min="0"
                  :value="quadPxNumber(quadBottom(group.props, index))"
                  @input="onQuadDirInput(quadBottom(group.props, index), $event)"
                  class="gg-margin-cell-input"
                />
              </div>
              <div class="gg-margin-cell">
                <span class="gg-margin-cell-label">좌</span>
                <input
                  type="number"
                  min="0"
                  :value="quadPxNumber(quadLeft(group.props, index))"
                  @input="onQuadDirInput(quadLeft(group.props, index), $event)"
                  class="gg-margin-cell-input"
                />
              </div>
            </div>
          </div>

          <!-- 컬러 필드 — 전체 스타일과 동일한 팝오버 방식. 포인트 색상 "추종"(__usePoint/__pointIndex) 보존 -->
          <div
            v-else-if="isColorBlock(prop)"
            class="gg-color-row"
          >
            <span class="gg-field-label !mb-0">{{ prop.label }}</span>
            <ColorPopoverPicker
              :title="prop.label"
              :modelValue="isUsingPoint(prop.key) ? pointColorForKey(prop.key) : String(selectedModule.properties[prop.key] || '')"
              :pointColors="wrapPointColors"
              pointFollow
              :activeIndex="isUsingPoint(prop.key) ? pointIndexFor(prop.key) : null"
              @update:modelValue="handleColorInput(prop.key, $event)"
              @select-point="onSelectPointColor(prop.key, $event)"
              @add-point-color="editorStore.addPointColor($event)"
              @remove-point-color="editorStore.removePointColor($event)"
            />
          </div>

          <!-- 폰트 크기 필드: 스테퍼(−/값/+) UI (Figma 378-1704 "TextField/Small/Default") -->
          <div v-else-if="isFontSizeField(prop)" class="space-y-1">
            <div class="gg-stepper">
              <button type="button" class="gg-stepper-btn" @click="adjustFontSize(prop, -1)" v-tooltip.top="'작게'">
                <i class="pi pi-minus"></i>
              </button>
              <input
                type="number"
                class="gg-stepper-value"
                :value="fontSizeNumber(prop)"
                :min="FONT_SIZE_MIN"
                :max="FONT_SIZE_MAX"
                @change="onFontSizeInput(prop, $event)"
                @keydown.enter="blurTarget"
              />
              <button type="button" class="gg-stepper-btn" @click="adjustFontSize(prop, 1)" v-tooltip.top="'크게'">
                <i class="pi pi-plus"></i>
              </button>
            </div>
            <p v-if="prop.hint" class="gg-field-hint" v-html="prop.hint"></p>
          </div>

          <!-- 텍스트 입력 (일반) -->
          <div v-else-if="prop.type === 'text'" class="space-y-1 gg-text-input">
            <InputText
              :modelValue="String(selectedModule.properties[prop.key] || '')"
              @update:modelValue="updateProperty(prop.key, $event ?? '')"
              @focus="normalizePxField(prop)"
              @blur="normalizePxField(prop)"
              :placeholder="prop.placeholder"
              class="w-full"
            />
            <!-- 힌트: 정적 설정(modules-config) 문자열이라 <br> 등 간단한 줄바꿈 허용 -->
            <p v-if="prop.hint" class="gg-field-hint" v-html="prop.hint"></p>
          </div>

          <!-- 리치 텍스트 에디터: 행간/자간은 툴바 밖 전용 드롭다운(Figma 378-1704)으로 분리.
               내부적으로는 기존과 동일하게 activeQuill(=quillByKey)/format('lineHeight'|'letterSpacing', ...)를 사용한다. -->
          <div v-else-if="prop.type === 'textarea'" class="rte-field">
            <div class="rte-ext-row">
              <div class="rte-ext-field">
                <span class="rte-ext-label">
                  <i class="pi pi-arrows-v text-xs"></i>
                  행간
                </span>
                <Select
                  :modelValue="editorFormatState[prop.key]?.lineHeight || null"
                  @update:modelValue="applyLineHeight(prop.key, $event)"
                  :options="LINE_HEIGHT_FIELD_OPTIONS"
                  optionLabel="label"
                  optionValue="value"
                  showClear
                  placeholder="보통"
                  class="rte-ext-select"
                />
              </div>
              <div class="rte-ext-field">
                <span class="rte-ext-label">
                  <i class="pi pi-arrows-h text-xs"></i>
                  자간
                </span>
                <Select
                  :modelValue="editorFormatState[prop.key]?.letterSpacing || null"
                  @update:modelValue="applyLetterSpacing(prop.key, $event)"
                  :options="LETTER_SPACING_FIELD_OPTIONS"
                  optionLabel="label"
                  optionValue="value"
                  showClear
                  placeholder="보통"
                  class="rte-ext-select"
                />
              </div>
            </div>
            <Editor
              :model-value="String(selectedModule.properties[prop.key] || '')"
              @update:model-value="handleEditorUpdate(prop.key, $event)"
              @load="(e) => onEditorLoad(e, prop.key)"
              :placeholder="prop.placeholder"
              editorStyle="height: 200px"
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
                    <option value="14px">14px</option>
                    <option value="12px">12px</option>
                    <option selected>본문</option>
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
                    <option value="#13ecff"></option>
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
          </div>

          <!-- URL 입력 -->
          <div v-else-if="prop.type === 'url'" class="space-y-1 gg-text-input">
            <InputText
              :modelValue="String(selectedModule.properties[prop.key] || '')"
              @update:modelValue="updateProperty(prop.key, $event ?? '')"
              :placeholder="prop.placeholder || 'https://example.com'"
              class="w-full"
            />
            <p class="gg-field-hint">https:// 로 시작하는 전체 주소를 입력하세요</p>
          </div>

          <!-- 테두리 스타일 — 전체 스타일(GlobalStylePanel)과 동일한 통합 블록(토글/라디오/색상/두께) -->
          <div v-else-if="isBorderStyleStart(prop)" class="gg-border-block">
            <!-- 헤더: 'none' 옵션이 있으면 on/off 토글, 없으면 라벨만 -->
            <div v-if="borderHasNone(prop)" class="gg-color-row">
              <!-- 그룹명과 같으면 이름을 한 번만 — 빈 span으로 자리만 유지해 토글은 우측 정렬 -->
              <span class="gg-field-label !mb-0">{{ isDupLabelProp(group, prop) ? '' : prop.label }}</span>
              <ToggleSwitch :modelValue="borderIsOn(prop)" @update:modelValue="toggleBorderOn(prop, $event)" />
            </div>
            <span v-else-if="!isDupLabelProp(group, prop)" class="gg-field-label">{{ prop.label }}</span>

            <template v-if="borderIsOn(prop)">
              <!-- 스타일 라디오 -->
              <div class="flex flex-col gap-[10px]">
                <span class="gg-sub-label">스타일</span>
                <div class="flex flex-col gap-[14px]">
                  <label v-for="opt in borderStyleOptionsFor(prop)" :key="opt.value" class="gg-brd-radio-row">
                    <span
                      class="gg-brd-radio-dot"
                      :class="{ 'is-checked': String(selectedModule.properties[prop.key] || '') === opt.value }"
                      @click="updateProperty(prop.key, opt.value)"
                    ></span>
                    <span class="gg-brd-radio-label" @click="updateProperty(prop.key, opt.value)">{{ opt.label }}</span>
                    <span class="gg-brd-radio-preview" :style="{ borderTop: `4px ${opt.value} #333d4b` }"></span>
                  </label>
                </div>
              </div>

              <!-- 색상 (전체 스타일과 동일한 팝오버 + 포인트색 추종) -->
              <div class="gg-color-row">
                <span class="gg-sub-label">색상</span>
                <ColorPopoverPicker
                  title="테두리 색상"
                  :modelValue="isUsingPoint(borderColorKey(prop)) ? pointColorForKey(borderColorKey(prop)) : String(selectedModule.properties[borderColorKey(prop)] || '')"
                  :pointColors="wrapPointColors"
                  pointFollow
                  :activeIndex="isUsingPoint(borderColorKey(prop)) ? pointIndexFor(borderColorKey(prop)) : null"
                  @update:modelValue="handleColorInput(borderColorKey(prop), $event)"
                  @select-point="onSelectPointColor(borderColorKey(prop), $event)"
                  @add-point-color="editorStore.addPointColor($event)"
                  @remove-point-color="editorStore.removePointColor($event)"
                />
              </div>

              <!-- 두께 (전체 스타일과 동일한 슬라이더 + px 필드) -->
              <div class="flex flex-col gap-[10px]">
                <span class="gg-sub-label">두께</span>
                <div class="gg-margin-slider-row">
                  <input
                    type="range"
                    min="0"
                    max="20"
                    :value="borderWidthNum(prop)"
                    @input="onBorderWidthInput(prop, $event)"
                    class="gg-margin-slider"
                  />
                  <div class="gg-margin-value-field">
                    <input
                      type="number"
                      min="0"
                      :value="borderWidthNum(prop)"
                      @input="onBorderWidthInput(prop, $event)"
                      class="gg-margin-value-input"
                    />
                    <span class="gg-margin-value-unit">px</span>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- 셀렉트 -->
          <Select
            v-else-if="prop.type === 'select'"
            :modelValue="String(selectedModule.properties[prop.key] || '')"
            @update:modelValue="updateProperty(prop.key, $event ?? '')"
            :options="prop.options"
            optionLabel="label"
            optionValue="value"
            class="w-full gg-select"
            placeholder="선택하세요"
          />

          <!-- 체크박스(ToggleSwitch) — 하위 필드를 갖는 토글은 챙겨서 아코디언 헤더로 (Figma 378-1704/408-1758) -->
          <div
            v-else-if="(prop.type === 'boolean' || prop.type === 'checkbox') && isGatingToggle(prop, group.props)"
            class="gg-acc-header"
            @click="toggleAccordionOpen(prop.key)"
          >
            <i
              class="pi gg-acc-chevron"
              :class="isToggleAccordionExpanded(prop.key) ? 'pi-chevron-down' : 'pi-chevron-right'"
            ></i>
            <span class="gg-acc-label">{{ prop.label }}</span>
            <span class="gg-acc-spacer"></span>
            <ToggleSwitch
              :modelValue="Boolean(selectedModule.properties[prop.key])"
              @update:modelValue="updateProperty(prop.key, $event)"
              @click.stop
            />
          </div>

          <!-- 체크박스(ToggleSwitch) — 하위 필드가 없는 단순 토글 -->
          <div
            v-else-if="prop.type === 'boolean' || prop.type === 'checkbox'"
            class="gg-toggle-row"
          >
            <span class="gg-toggle-label">{{ prop.label }}</span>
            <ToggleSwitch
              :modelValue="Boolean(selectedModule.properties[prop.key])"
              @update:modelValue="updateProperty(prop.key, $event)"
            />
          </div>

          <!-- SNS 아이콘 (노출 토글 · 링크 · 순서 변경) -->
          <div v-else-if="prop.type === 'sns-icons'" class="space-y-2">
            <div
              v-for="(icon, index) in getSnsIcons(prop.key)"
              :key="icon.key"
              class="p-2.5 border border-gray-200 rounded-md bg-gray-50"
            >
              <div class="flex items-center gap-2">
                <img
                  :src="snsIconMeta[icon.key]?.img"
                  :alt="snsIconMeta[icon.key]?.label"
                  class="w-6 h-6 object-contain rounded-full bg-gray-700 p-1 shrink-0"
                />
                <span class="text-sm font-medium text-gray-700 flex-1 truncate">
                  {{ snsIconMeta[icon.key]?.label || icon.key }}
                </span>
                <Button
                  @click="moveSnsIcon(prop.key, index, 'up')"
                  :disabled="index === 0"
                  icon="pi pi-arrow-up"
                  severity="secondary"
                  text
                  size="small"
                  class="!w-6 !h-6 !p-0"
                  v-tooltip.top="'위로 이동'"
                />
                <Button
                  @click="moveSnsIcon(prop.key, index, 'down')"
                  :disabled="index === getSnsIcons(prop.key).length - 1"
                  icon="pi pi-arrow-down"
                  severity="secondary"
                  text
                  size="small"
                  class="!w-6 !h-6 !p-0"
                  v-tooltip.top="'아래로 이동'"
                />
                <ToggleSwitch
                  :modelValue="icon.show"
                  @update:modelValue="setSnsIconShow(prop.key, index, $event)"
                />
              </div>
              <div v-if="icon.show" class="mt-2 flex items-center gap-1.5">
                <label class="text-xs text-gray-500 w-8 shrink-0">링크</label>
                <InputText
                  :modelValue="icon.url"
                  @update:modelValue="setSnsIconUrl(prop.key, index, $event ?? '')"
                  placeholder="링크 URL"
                  class="flex-1 !text-sm"
                  size="small"
                />
              </div>
            </div>
            <p class="text-xs text-gray-400">스위치로 노출을 켜고 끄고, 화살표로 순서를 바꿉니다.</p>
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
                    @load="(e) => onEditorLoad(e, text.id)"
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
                    @load="(e) => onEditorLoad(e, content.id)"
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
                    <!-- 상단: 열 삽입 + 열 번호 + 삭제 -->
                    <div class="flex items-center justify-center gap-1 py-1.5">
                      <button
                        @click="insertTableColumn(colIndex)"
                        class="tbl-insert-btn"
                        v-tooltip.top="'이 열 왼쪽에 열 삽입'"
                      >
                        <i class="pi pi-plus" style="font-size: 0.6rem"></i>
                      </button>
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
                    <!-- 중단: 너비 라벨 + 입력 -->
                    <div class="flex items-center gap-1.5 pt-1.5">
                      <label
                        :for="`col-width-${colIndex}`"
                        class="text-xs font-medium text-gray-500 shrink-0 w-7"
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
                    <!-- 하단: 열 공통 정렬 (셀별 정렬이 없으면 이 값 사용) -->
                    <div class="flex items-center gap-1.5 py-1.5">
                      <label
                        :for="`col-align-${colIndex}`"
                        class="text-xs font-medium text-gray-500 shrink-0 w-7"
                      >정렬</label>
                      <Select
                        :inputId="`col-align-${colIndex}`"
                        :modelValue="getColAlign(colIndex)"
                        @update:modelValue="updateColAlign(colIndex, $event ?? 'left')"
                        :options="colAlignOptions"
                        optionLabel="label"
                        optionValue="value"
                        class="flex-1 min-w-0 col-align-select"
                        v-tooltip.top="'열 공통 정렬 — 셀별 정렬이 더 우선합니다'"
                      />
                    </div>
                  </div>
                </div>

                <!-- 테이블 본문 (행들) -->
                <div
                  v-for="(row, rowIndex) in tableCells"
                  :key="`row-${rowIndex}`"
                  class="flex min-w-full border-b border-gray-200 last:border-b-0"
                >
                  <!-- 행 컨트롤 (행 삽입 + 행 번호 + 삭제) -->
                  <div class="w-8 flex-shrink-0 flex flex-col items-center justify-center gap-0.5 bg-gray-50 border-r border-gray-200 py-1">
                    <button
                      @click="insertTableRow(rowIndex)"
                      class="tbl-insert-btn"
                      v-tooltip.right="'이 행 위에 행 삽입'"
                    >
                      <i class="pi pi-plus" style="font-size: 0.6rem"></i>
                    </button>
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
                    class="p-2 border-r border-gray-200 last:border-r-0 min-w-0 overflow-hidden"
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

                        <!-- 셀 색상 스와치 (클릭 시 색상 편집기 펼침) -->
                        <button
                          @click="toggleCellColorEditor(rowIndex, colIndex)"
                          class="flex items-center justify-center w-6 h-6 rounded border text-xs font-bold leading-none transition-colors"
                          :class="isCellColorOpen(rowIndex, colIndex)
                            ? 'border-blue-500 ring-1 ring-blue-200'
                            : 'border-gray-300 hover:border-gray-400'"
                          :style="{ backgroundColor: getCellEffectiveBg(cell), color: getCellEffectiveText(cell) }"
                          v-tooltip.top="'셀 정렬·배경색·글자색·굵게'"
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
                      <!-- 셀 정렬 (지정 시 열 공통 정렬보다 우선) -->
                      <div class="flex flex-wrap items-center gap-1.5">
                        <label class="text-xs text-gray-500 w-7 shrink-0">정렬</label>
                        <div class="flex items-center border border-gray-300 rounded overflow-hidden">
                          <button
                            @click="updateCellAlign(rowIndex, colIndex, 'left')"
                            class="p-1 transition-colors"
                            :class="getCellAlign(cell, colIndex) === 'left'
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-gray-500 hover:bg-gray-100'"
                            v-tooltip.top="'왼쪽 정렬'"
                          >
                            <i class="pi pi-align-left text-xs"></i>
                          </button>
                          <button
                            @click="updateCellAlign(rowIndex, colIndex, 'center')"
                            class="p-1 border-x border-gray-300 transition-colors"
                            :class="getCellAlign(cell, colIndex) === 'center'
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-gray-500 hover:bg-gray-100'"
                            v-tooltip.top="'가운데 정렬'"
                          >
                            <i class="pi pi-align-center text-xs"></i>
                          </button>
                          <button
                            @click="updateCellAlign(rowIndex, colIndex, 'right')"
                            class="p-1 transition-colors"
                            :class="getCellAlign(cell, colIndex) === 'right'
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-gray-500 hover:bg-gray-100'"
                            v-tooltip.top="'오른쪽 정렬'"
                          >
                            <i class="pi pi-align-right text-xs"></i>
                          </button>
                        </div>
                        <button
                          v-if="cell.align"
                          @click="resetCellAlign(rowIndex, colIndex)"
                          class="text-xs text-gray-500 hover:text-blue-600 underline shrink-0"
                          v-tooltip.top="'이 셀의 정렬을 지우고 열 공통 정렬을 사용'"
                        >공통 정렬 적용하기</button>
                        <span v-else class="text-xs text-gray-400 shrink-0">공통 정렬 적용 중</span>
                      </div>
                      <!-- 배경색 -->
                      <div class="flex flex-wrap items-center gap-1.5">
                        <label class="text-xs text-gray-500 w-7 shrink-0">배경</label>
                        <ColorAlphaPicker
                          :modelValue="getCellEffectiveBg(cell)"
                          @update:modelValue="updateCellBgColor(rowIndex, colIndex, $event)"
                        />
                        <HexColorInput
                          :modelValue="cell.bgColor || ''"
                          @update:modelValue="updateCellBgColorInput(rowIndex, colIndex, $event ?? '')"
                          :placeholder="getCellEffectiveBg(cell)"
                          class="flex-1 min-w-[5rem] font-mono !text-xs"
                          size="small"
                          spellcheck="false"
                        />
                      </div>
                      <!-- 글자색 -->
                      <div class="flex flex-wrap items-center gap-1.5">
                        <label class="text-xs text-gray-500 w-7 shrink-0">글자</label>
                        <ColorAlphaPicker
                          :modelValue="getCellEffectiveText(cell)"
                          @update:modelValue="updateCellTextColor(rowIndex, colIndex, $event)"
                        />
                        <HexColorInput
                          :modelValue="cell.textColor || ''"
                          @update:modelValue="updateCellTextColorInput(rowIndex, colIndex, $event ?? '')"
                          :placeholder="getCellEffectiveText(cell)"
                          class="flex-1 min-w-[5rem] font-mono !text-xs"
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

  <!-- Quill 색상 "직접 선택" 팝오버 (팔레트 · 헥사코드 · 포인트 색상) -->
  <Teleport to="body">
    <div
      v-if="colorPopover.visible"
      ref="colorPopoverEl"
      class="quill-color-popover"
      :style="{ top: `${colorPopover.top}px`, left: `${colorPopover.left}px` }"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-gray-700">
          {{ colorPopover.format === 'background' ? '배경 색상' : '글자 색상' }}
        </span>
        <button
          type="button"
          class="text-gray-400 hover:text-gray-600"
          title="닫기"
          @click="closeColorPopover"
        >
          <i class="pi pi-times text-xs"></i>
        </button>
      </div>

      <!-- 색상 + 투명도 / HEX 입력 -->
      <div class="flex items-center gap-2">
        <ColorAlphaPicker
          :modelValue="displayPopoverColor"
          @update:modelValue="popoverColor = $event"
          :disabled="popoverPointIndex !== null"
        />
        <HexColorInput
          :modelValue="displayPopoverColor"
          @update:modelValue="popoverColor = $event ?? ''"
          :disabled="popoverPointIndex !== null"
          placeholder="#111111"
          class="flex-1 min-w-0 font-mono text-xs"
          spellcheck="false"
        />
      </div>

      <!-- 포인트 색상으로 사용 (최대 3개 중 선택 — 다른 색상 필드와 동일한 스와치 UI) -->
      <PointColorSwatchRow
        class="mt-2"
        :pointColors="wrapPointColors"
        :activeIndex="popoverPointIndex"
        @select="onSelectPopoverPointColor"
      />

      <div class="flex items-center justify-between mt-3">
        <button
          type="button"
          class="text-xs text-gray-500 hover:text-gray-700"
          @click="removeQuillColor"
        >
          색 제거
        </button>
        <button
          type="button"
          class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          @click="closeColorPopover"
        >
          확인
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import { resolveGroupRows } from '@/utils/groupLayout'
import { SNS_ICON_META, defaultSnsIcons, type SnsIconItem } from '@/constants/snsIcons'
import { useEditorStore } from '@/stores/editorStore'
import type { TableRow, ContentTitle, ContentText, AdditionalContent, TableCell, EditableProp } from '@/types'
import { normalizeColorInput, isValidHexColor } from '@/utils/colorHelper'
import { normalizePxLength } from '@/utils/cssUnit'
import { LINE_HEIGHT_OPTIONS } from '@/utils/quillLineHeight'
import { LETTER_SPACING_OPTIONS } from '@/utils/quillLetterSpacing'
import { POINT_COLOR_SUFFIX, POINT_COLOR_INDEX_SUFFIX, POINT_COLOR_CSS_VAR, pointColorCssVar, getPointColorIndex, pointColorAt } from '@/utils/pointColor'
import { processQuillHtml } from '@/utils/quillHtmlProcessor'
import TableCellEditor from './TableCellEditor.vue'
import ColorAlphaPicker from '@/components/ColorAlphaPicker.vue'
import HexColorInput from '@/components/HexColorInput.vue'
import PointColorSwatchRow from '@/components/PointColorSwatchRow.vue'
import ColorPopoverPicker from './ColorPopoverPicker.vue'
import type Quill from 'quill'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()

const selectedModule = computed(() => moduleStore.selectedModule)
const selectedModuleMetadata = computed(() => moduleStore.selectedModuleMetadata)
const editableProps = computed(() => selectedModuleMetadata.value?.editableProps || [])

// ===== 영역 컬럼 분할 =====
// 선택 모듈이 속한 그룹의 컬럼 수와, 그 안에서의 컬럼 위치(0-based)
const moduleColumnInfo = computed(() => {
  const mod = selectedModule.value
  const fallback = { columns: 1, columnIndex: 0, rowIndex: 0, rowCount: 1 }
  if (!mod?.groupId) return fallback
  const group = moduleStore.groups.find((g) => g.id === mod.groupId)
  if (!group) return fallback
  const members = moduleStore.modules
    .filter((m) => m.groupId === group.id)
    .sort((a, b) => a.order - b.order)
  const res = resolveGroupRows(group, members)
  const r = res.rowIndexById[mod.id] ?? 0
  return {
    columns: res.rowCols[r] ?? 1,
    columnIndex: res.colIndexById[mod.id] ?? 0,
    rowIndex: r,
    rowCount: res.rowCols.length,
  }
})

const splitSelectedModule = () => {
  if (selectedModule.value) moduleStore.splitModuleColumns(selectedModule.value.id)
}
const unsplitSelectedModule = () => {
  if (selectedModule.value) moduleStore.unsplitModuleColumns(selectedModule.value.id)
}
const moveSelectedModuleColumn = (direction: 'left' | 'right') => {
  if (selectedModule.value) moduleStore.moveModuleColumn(selectedModule.value.id, direction)
}

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

// ===== 노출 여부 토글(boolean) + showWhen 하위 필드 — 아코디언 헤더 UI (Figma 378-1704/408-1758) =====
// showWhen이 가리키는 트리거 key를 문자열/객체 두 형태 모두에서 추출
const showWhenKey = (prop: EditableProp): string | null => {
  const sw = prop.showWhen
  if (!sw) return null
  if (typeof sw === 'string') return sw
  if (typeof sw === 'object' && sw !== null && 'key' in sw) return (sw as { key: string }).key
  return null
}

// prop이 boolean 토글이며, 같은 그룹 안에 자신의 key를 참조하는 showWhen 필드가 하나 이상 있는지
// (= 켜고 끄는 것 외에 딸린 하위 필드가 있어 아코디언 헤더로 그려야 하는 토글인지)
const isGatingToggle = (prop: EditableProp, props: EditableProp[]): boolean =>
  prop.type === 'boolean' && props.some((p) => showWhenKey(p) === prop.key)

// 아코디언 펼침 상태 — prop.key(트리거)별로 관리. 기본값은 "토글이 이미 켜져 있으면 펼침"
// (기존에 이미 설정해둔 하위 필드값을 바로 볼 수 있도록 — 꺼져 있으면 evalShowWhen에서 이미 숨겨지므로 무관)
const toggleAccordionExpanded = reactive<Record<string, boolean>>({})
const isToggleAccordionExpanded = (key: string): boolean => {
  if (!(key in toggleAccordionExpanded)) {
    toggleAccordionExpanded[key] = Boolean(selectedModule.value?.properties[key])
  }
  return toggleAccordionExpanded[key]
}
const toggleAccordionOpen = (key: string): void => {
  toggleAccordionExpanded[key] = !isToggleAccordionExpanded(key)
}

// 하위 필드 표시 여부 — 트리거가 "아코디언이 있는 boolean 토글"일 때만 챙겨서 판단(챙기지 않으면
// select 등 다른 종류의 showWhen 조건은 기존 동작 그대로 유지)
const isGatedFieldVisible = (prop: EditableProp, props: EditableProp[]): boolean => {
  const key = showWhenKey(prop)
  if (!key) return true
  const trigger = props.find((p) => p.key === key)
  if (!trigger || !isGatingToggle(trigger, props)) return true
  return isToggleAccordionExpanded(key)
}

// ===== 이름 있는 prop 그룹(레거시 모듈의 로고/타이틀 등 섹션) 헤더 — Figma 352-1138 패턴 =====
// 그룹의 첫 prop이 boolean이고 나머지 전부가 그 prop을 참조하는 showWhen이면
// "그룹 전체를 켜고 끄는 토글"로 보고 판넬 헤더로 끌어올린다(판넬을 열기 전에도 제어 가능하도록).
type PropGroup = { name: string | null; props: EditableProp[] }
const groupHeaderToggle = (group: PropGroup): EditableProp | null => {
  const [first, ...rest] = group.props
  if (!first || first.type !== 'boolean' || rest.length === 0) return null
  return rest.every((p) => showWhenKey(p) === first.key) ? first : null
}

// 그룹 판넬 펼침 상태 — 그룹명(또는 인덱스)별로 관리. 기본값: 첫 그룹만 펼침(기존 Panel 동작과 동일)
const groupPanelExpanded = reactive<Record<string, boolean>>({})
const groupPanelKey = (group: PropGroup, index: number): string => group.name ?? `_flat_${index}`
const isGroupPanelExpanded = (group: PropGroup, index: number): boolean => {
  const key = groupPanelKey(group, index)
  if (!(key in groupPanelExpanded)) groupPanelExpanded[key] = index === 0
  return groupPanelExpanded[key]
}
const toggleGroupPanel = (group: PropGroup, index: number): void => {
  const key = groupPanelKey(group, index)
  groupPanelExpanded[key] = !isGroupPanelExpanded(group, index)
}

// wrap 설정 (전체 스타일 패널의 "포인트 색상으로 사용" 기본값 계산용으로만 참조)
const wrapSettings = computed(() => editorStore.wrapSettings)

// 커스텀 테이블 열 공통 정렬 옵션
const colAlignOptions = [
  { label: '왼쪽', value: 'left' },
  { label: '가운데', value: 'center' },
  { label: '오른쪽', value: 'right' },
]

// 커스텀 테이블 편집기 열 기준 너비(px) — flex-basis로 사용.
// 열이 적으면 grow로 늘어나 패널을 꽉 채우고, 많아지면 이 너비로 고정되어 가로 스크롤된다.
// 헤더·본문이 동일 컨테이너 폭에서 같은 flex 설정을 쓰므로 두 상태 모두 정렬이 맞는다.
// 병합(colspan) 셀은 이 값의 배수로 grow/basis를 잡아 헤더 열들과 정렬된다.
const tableColWidth = 250

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

// ===== SNS 아이콘 (노출/링크/순서) =====
const snsIconMeta = SNS_ICON_META
const getSnsIcons = (key: string): SnsIconItem[] => {
  const v = selectedModule.value?.properties[key]
  return Array.isArray(v) ? (v as SnsIconItem[]) : defaultSnsIcons()
}
const setSnsIconShow = (key: string, index: number, show: boolean) => {
  const icons = getSnsIcons(key).map((i, idx) => (idx === index ? { ...i, show } : { ...i }))
  updateProperty(key, icons)
}
const setSnsIconUrl = (key: string, index: number, url: string) => {
  const icons = getSnsIcons(key).map((i, idx) => (idx === index ? { ...i, url } : { ...i }))
  updateProperty(key, icons)
}
const moveSnsIcon = (key: string, index: number, dir: 'up' | 'down') => {
  const icons = getSnsIcons(key).map((i) => ({ ...i }))
  const target = dir === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= icons.length) return
  const tmp = icons[index]
  icons[index] = icons[target]
  icons[target] = tmp
  updateProperty(key, icons)
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

// 폰트 크기 필드 판별: key가 "...fontSize"로 끝나는 px 텍스트 필드 → 스테퍼(−/값/+) UI로 표시
// (대소문자 무관 — "fontSize" 단독 키(ModuleDescText 등)와 "titleFontSize" 같은 접두사 케이스 모두 포함)
const isFontSizeField = (prop: EditableProp): boolean =>
  prop.type === 'text' && /fontsize$/i.test(prop.key)

const FONT_SIZE_MIN = 8
const FONT_SIZE_MAX = 72

const fontSizeNumber = (prop: EditableProp): number => {
  const raw = String(selectedModule.value?.properties[prop.key] ?? prop.default ?? '16px')
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : 16
}

const adjustFontSize = (prop: EditableProp, delta: number) => {
  const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, fontSizeNumber(prop) + delta))
  updateProperty(prop.key, `${next}px`)
}

// Enter 입력 시 blur시켜 change 이벤트(값 확정)를 발생시킴
const blurTarget = (event: Event) => {
  ;(event.target as HTMLElement).blur()
}

// 가운데 숫자를 직접 타이핑해서 수정 (blur/Enter 시 확정 — 입력 중엔 스토어를 건드리지 않음)
const onFontSizeInput = (prop: EditableProp, event: Event) => {
  const raw = (event.target as HTMLInputElement).value
  const parsed = parseInt(raw, 10)
  const next = Math.min(
    FONT_SIZE_MAX,
    Math.max(FONT_SIZE_MIN, Number.isFinite(parsed) ? parsed : fontSizeNumber(prop)),
  )
  updateProperty(prop.key, `${next}px`)
}

// ===== 여백/패딩 4방향(...Top/Right/Bottom/Left) 세트 — 방향별 그리드 + 잠금 슬라이더 UI (Figma 365-2691) =====
// 같은 접두사의 Top/Right/Bottom/Left 4개를 하나의 컨트롤로 묶는다. 배치 순서는 모듈마다 달라서
// (예: ModuleDivider는 Top/Bottom/Left/Right) 위치가 아니라 '키 조회'로 형제를 찾는다.
// 기본은 방향별 개별 조정 그리드이고, 잠금 아이콘을 누르면 4방향 동시조정 슬라이더로 바뀐다.
const quadPrefixFor = (prop: EditableProp): string | null => {
  if (prop.type !== 'text' || !prop.key.endsWith('Top')) return null
  return prop.key.slice(0, -3)
}

// Top 프로퍼티가 quad-start인지 — Right/Bottom/Left 3형제가 배열 어디든(순서 무관) 존재하면 성립.
// (일부 모듈은 Top/Bottom/Left/Right 등 다른 순서로 정의돼 있어 연속 순서를 강제하지 않는다.)
const isQuadStart = (prop: EditableProp, props: EditableProp[], _index?: number): boolean => {
  const prefix = quadPrefixFor(prop)
  if (!prefix) return false
  return (
    props.some((p) => p.key === `${prefix}Right`) &&
    props.some((p) => p.key === `${prefix}Bottom`) &&
    props.some((p) => p.key === `${prefix}Left`)
  )
}

// prop이 어떤 4방향 세트의 Right/Bottom/Left(이미 Top 컨트롤에 흡수된 멤버)인지 판별 → 개별 렌더 생략
const isQuadMember = (prop: EditableProp, props: EditableProp[], _index?: number): boolean => {
  for (const suffix of ['Right', 'Bottom', 'Left']) {
    if (!prop.key.endsWith(suffix)) continue
    const prefix = prop.key.slice(0, -suffix.length)
    const topProp = props.find((p) => p.key === `${prefix}Top`)
    if (topProp && isQuadStart(topProp, props)) return true
  }
  return false
}

// Top 프로퍼티의 라벨(예: "상단 여백"/"안쪽 상단 여백")에서 방향 단어를 지워 통합 라벨을 만든다.
const quadLabel = (prop: EditableProp): string => prop.label.replace('상단', '').replace(/\s+/g, ' ').trim() || '여백'

// 순서 무관 — Top 프로퍼티(topIndex)의 prefix로 방향 형제를 키 조회한다. (없으면 Top으로 폴백)
const quadSibling = (props: EditableProp[], topIndex: number, suffix: 'Right' | 'Bottom' | 'Left'): EditableProp => {
  const prefix = quadPrefixFor(props[topIndex])
  return (prefix && props.find((p) => p.key === `${prefix}${suffix}`)) || props[topIndex]
}
const quadRight = (props: EditableProp[], topIndex: number): EditableProp => quadSibling(props, topIndex, 'Right')
const quadBottom = (props: EditableProp[], topIndex: number): EditableProp => quadSibling(props, topIndex, 'Bottom')
const quadLeft = (props: EditableProp[], topIndex: number): EditableProp => quadSibling(props, topIndex, 'Left')

// 잠금 상태. prefix별로 독립 관리.
// 기본값 = 잠금 해제(상/우/하/좌 개별 조정 그리드) — 잠금 아이콘을 눌러야 4방향 동시조정 슬라이더로 바뀐다.
const quadLockState = reactive<Record<string, boolean>>({})
const isQuadLocked = (prefix: string | null): boolean => !!prefix && quadLockState[prefix] === true
const toggleQuadLock = (prefix: string | null): void => {
  if (!prefix) return
  quadLockState[prefix] = !isQuadLocked(prefix)
}

const quadPxNumber = (prop: EditableProp): number => {
  const raw = String(selectedModule.value?.properties[prop.key] ?? prop.default ?? '0')
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : 0
}

const MARGIN_QUAD_MAX = 100

const onQuadValueInput = (topProp: EditableProp, props: EditableProp[], index: number, event: Event) => {
  const raw = (event.target as HTMLInputElement).value
  const n = Math.max(0, Math.min(MARGIN_QUAD_MAX, parseInt(raw, 10) || 0))
  const px = `${n}px`
  updateProperty(topProp.key, px)
  updateProperty(quadRight(props, index).key, px)
  updateProperty(quadBottom(props, index).key, px)
  updateProperty(quadLeft(props, index).key, px)
}

const onQuadDirInput = (prop: EditableProp, event: Event) => {
  const raw = (event.target as HTMLInputElement).value
  const n = Math.max(0, parseInt(raw, 10) || 0)
  updateProperty(prop.key, `${n}px`)
}

// ===== 그룹명 ↔ 내부 블록 라벨 중복 제거 =====
// 예: 그룹"여백" 안에 라벨이 "여백"인 4방향 quad, 그룹"선 스타일" 안에 라벨이 "선 스타일"인 테두리 블록.
// 이 경우 (1)접이식 아코디언이 한 겹 더 생기고 (2)같은 이름이 두 번 보인다.
// → 그룹을 '항상 펼쳐진 정적 헤더'로 두고, 내부 블록의 자체 라벨은 숨긴다.
const groupSelfLabeledProp = (group: { name?: string | null; props: EditableProp[] }): EditableProp | null => {
  if (!group.name) return null
  for (let i = 0; i < group.props.length; i++) {
    const p = group.props[i]
    if (isBorderStyleStart(p) && p.label === group.name) return p
    if (isQuadStart(p, group.props, i) && quadLabel(p) === group.name) return p
  }
  return null
}
const isGroupSelfLabeled = (group: { name?: string | null; props: EditableProp[] }): boolean =>
  !!groupSelfLabeledProp(group)
const isDupLabelProp = (group: { name?: string | null; props: EditableProp[] }, prop: EditableProp): boolean =>
  groupSelfLabeledProp(group) === prop

// ===== 테두리 "전체 블록" (전체 스타일 GlobalStylePanel과 동일 UI) =====
// '테두리 스타일' select( *BorderStyle / dividerStyle )를 스타일 라디오+색상+두께 슬라이더 블록으로 렌더한다.
const isBorderStyleStart = (prop: EditableProp): boolean =>
  prop.type === 'select' && (/borderStyle$/i.test(prop.key) || prop.key === 'dividerStyle')

// 형제 키: base = key에서 뒤의 'Style' 제거 (buttonBorderStyle→buttonBorder, dividerStyle→divider)
const borderBaseFor = (prop: EditableProp): string => prop.key.replace(/Style$/, '')
const borderWidthKey = (prop: EditableProp): string => `${borderBaseFor(prop)}Width`
const borderColorKey = (prop: EditableProp): string => `${borderBaseFor(prop)}Color`

// 이 prop이 어떤 테두리 블록에 흡수된 Width/Color 형제인지 → 개별 렌더 생략
const isBorderMember = (prop: EditableProp, props: EditableProp[]): boolean => {
  for (const s of props) {
    if (!isBorderStyleStart(s)) continue
    if (prop.key === borderWidthKey(s) || prop.key === borderColorKey(s)) return true
  }
  return false
}

// '없음(none)' 옵션 유무 — 있으면 토글(off=none)로, 없으면 항상 노출
const borderHasNone = (prop: EditableProp): boolean =>
  !!prop.options?.some((o) => o.value === 'none')

// 라디오에 노출할 옵션 (none 제외)
const borderStyleOptionsFor = (prop: EditableProp) =>
  (prop.options ?? []).filter((o) => o.value !== 'none')

const borderIsOn = (prop: EditableProp): boolean => {
  if (!borderHasNone(prop)) return true
  const v = String(selectedModule.value?.properties[prop.key] || 'none')
  return v !== 'none' && v !== ''
}

const toggleBorderOn = (prop: EditableProp, on: boolean): void => {
  if (on) {
    const cur = String(selectedModule.value?.properties[prop.key] || 'none')
    if (cur === 'none' || cur === '') {
      updateProperty(prop.key, borderStyleOptionsFor(prop)[0]?.value ?? 'solid')
    }
  } else {
    updateProperty(prop.key, 'none')
  }
}

const borderWidthNum = (prop: EditableProp): number => {
  const raw = String(selectedModule.value?.properties[borderWidthKey(prop)] ?? '0')
  return parseInt(raw, 10) || 0
}

const onBorderWidthInput = (prop: EditableProp, event: Event): void => {
  const v = (event.target as HTMLInputElement).valueAsNumber
  const n = Number.isNaN(v) ? 0 : Math.max(0, Math.min(99, v))
  updateProperty(borderWidthKey(prop), normalizePxLength(`${n}px`))
}

// 붙여넣기 시 모든 서식 제거 — 텍스트만 입력되도록 한다.
// (복사 원본의 텍스트 색상/배경 등은 가져오지 않고, 스타일은 속성 패널에서 적용)
// ===== Quill 색상 "직접 선택(기타)" — 커스텀 색상 필드(팔레트 + 헥사 + 포인트 색상) =====
// 마지막으로 포커스됐던 에디터와 선택 영역을 추적한다.
// (드롭다운을 열면 에디터가 blur 되어 getSelection()이 null 이 되므로, 직전 range 를 보관)
let activeQuill: Quill | null = null
let activeRange: { index: number; length: number } | null = null

// ===== 행간/자간 — 에디터 툴바 밖 외부 드롭다운 (Figma 378-1704) =====
// 각 리치텍스트 필드(prop.key)별 Quill 인스턴스/선택영역을 별도로 추적해,
// 필드 옆 드롭다운이 그 필드의 에디터에만 적용되도록 한다(색상 팝오버와 동일한
// activeQuill/activeRange 원리를, 필드별로 나눠 재사용).
const LINE_HEIGHT_FIELD_OPTIONS = LINE_HEIGHT_OPTIONS.map((v) => ({ label: v, value: v }))
const LETTER_SPACING_FIELD_OPTIONS = LETTER_SPACING_OPTIONS.map((v: string) => ({ label: v, value: v }))

const quillByKey: Record<string, Quill> = {}
const quillRangeByKey: Record<string, { index: number; length: number } | null> = {}
const editorFormatState = reactive<Record<string, { lineHeight: string; letterSpacing: string }>>({})

const syncEditorFormatState = (
  key: string,
  quill: Quill,
  range: { index: number; length: number } | null,
) => {
  const r = range ?? { index: 0, length: quill.getLength() }
  const fmt = quill.getFormat(r.index, r.length) as Record<string, unknown>
  editorFormatState[key] = {
    lineHeight: typeof fmt.lineHeight === 'string' ? fmt.lineHeight : '',
    letterSpacing: typeof fmt.letterSpacing === 'string' ? fmt.letterSpacing : '',
  }
}

// 행간(블록 스코프) 적용 — Quill 기본 툴바 핸들러와 동일하게 format()으로 현재 문단에 적용
const applyLineHeight = (key: string, value: string | null) => {
  const q = quillByKey[key]
  const r = quillRangeByKey[key]
  if (!q || !r) return
  q.setSelection(r.index, r.length, 'silent')
  q.format('lineHeight', value || false, 'user')
  editorFormatState[key] = { ...editorFormatState[key], lineHeight: value || '' }
}

// 자간(인라인 스코프) 적용 — 선택 범위가 있으면 그 범위에, 없으면 커서 다음 입력에 적용
const applyLetterSpacing = (key: string, value: string | null) => {
  const q = quillByKey[key]
  const r = quillRangeByKey[key]
  if (!q || !r) return
  if (r.length > 0) {
    q.formatText(r.index, r.length, 'letterSpacing', value || false, 'user')
  } else {
    q.setSelection(r.index, 0, 'silent')
    q.format('letterSpacing', value || false, 'user')
  }
  editorFormatState[key] = { ...editorFormatState[key], letterSpacing: value || '' }
}

// 팝오버 상태
const colorPopover = ref<{
  visible: boolean
  format: 'color' | 'background'
  top: number
  left: number
}>({ visible: false, format: 'color', top: 0, left: 0 })
const colorPopoverEl = ref<HTMLElement | null>(null)
const popoverColor = ref('#111111')
// 포인트 색상(최대 3개) 중 이 필드가 따르는 인덱스. null이면 미사용(직접 지정)
const popoverPointIndex = ref<number | null>(null)

// 팝오버 대상 에디터/선택 영역 (반응형 불필요 → 일반 변수)
let popoverQuill: Quill | null = null
let popoverRange: { index: number; length: number } | null = null
let popoverEditorEl: HTMLElement | null = null // 위치 기준이 되는 에디터 컨테이너

// 표시용 색상 (입력 필드) — 포인트 색상 사용 시 선택된 인덱스의 포인트 색상을 보여줌
const displayPopoverColor = computed(() =>
  popoverPointIndex.value !== null
    ? pointColorAt(wrapPointColors.value, popoverPointIndex.value)
    : popoverColor.value,
)

// 선택 영역에 실제 적용할 값
// - 포인트 색상 사용: var(--point-color-N, <현재값>) → 에디터/미리보기는 :root 변수로 실시간 추종,
//   이메일 내보내기 시 실제 색상으로 치환된다.
// - 일반: 입력한 색상값 그대로
const appliedPopoverValue = computed(() =>
  popoverPointIndex.value !== null
    ? `var(${pointColorCssVar(popoverPointIndex.value)}, ${pointColorAt(wrapPointColors.value, popoverPointIndex.value)})`
    : popoverColor.value,
)

// 선택 영역에 색상 적용 (포커스를 뺏지 않도록 formatText 사용)
const applyQuillColor = (value: string | false) => {
  const q = popoverQuill
  const r = popoverRange
  if (!q || !r) return
  const fmt = colorPopover.value.format
  if (r.length > 0) {
    q.formatText(r.index, r.length, fmt, value, 'user')
  } else {
    // 선택 영역이 없으면 커서 위치의 다음 입력 서식으로 지정
    q.setSelection(r.index, 0, 'silent')
    q.format(fmt, value, 'user')
  }
}

// 팝오버를 여는 동안의 초기 색상 세팅이 선택 영역에 잘못 적용되지 않도록 억제
let suppressColorApply = false

// 팝오버가 열려 있는 동안 사용자가 바꾼 색상만 실시간 반영
watch(appliedPopoverValue, (val) => {
  if (colorPopover.value.visible && !suppressColorApply) applyQuillColor(val || false)
})

// ----- 팝오버 위치: 에디터 왼쪽에 배치 (공간 부족 시 오른쪽) -----
const POPOVER_WIDTH = 400 // .quill-color-popover 의 width 와 일치
const computePopoverPosition = () => {
  const el = popoverEditorEl
  if (!el) return
  const rect = el.getBoundingClientRect()
  const margin = 8
  // 에디터 왼쪽 바깥에 두되, 왼쪽 공간이 부족하면 오른쪽으로
  let left = rect.left - POPOVER_WIDTH - margin
  if (left < margin) left = rect.right + margin
  left = Math.max(margin, Math.min(left, window.innerWidth - POPOVER_WIDTH - margin))
  const top = Math.max(margin, Math.min(rect.top, window.innerHeight - 240))
  // 문서 스크롤 보정 (position: absolute 기준)
  colorPopover.value.left = left + window.scrollX
  colorPopover.value.top = top + window.scrollY
}
// 스크롤/리사이즈 시 에디터에 붙어 따라다니도록 재계산
const onPopoverReposition = () => {
  if (colorPopover.value.visible) computePopoverPosition()
}

const closeColorPopover = () => {
  colorPopover.value.visible = false
  popoverQuill = null
  popoverRange = null
  popoverEditorEl = null
  window.removeEventListener('scroll', onPopoverReposition, true)
  window.removeEventListener('resize', onPopoverReposition)
}

const removeQuillColor = () => {
  popoverPointIndex.value = null
  applyQuillColor(false)
  closeColorPopover()
}

// 스와치 클릭: 같은 인덱스를 다시 누르면 해제(직접 지정으로 복귀), 아니면 그 인덱스로 바인딩
const onSelectPopoverPointColor = (index: number): void => {
  popoverPointIndex.value = popoverPointIndex.value === index ? null : index
}

const openQuillColorPopover = (quill: Quill, format: 'color' | 'background') => {
  popoverQuill = quill
  popoverRange = activeQuill === quill ? activeRange : quill.getSelection()
  // 위치 기준 = 에디터 전체 컨테이너 (PrimeVue Editor 루트)
  popoverEditorEl = quill.container.closest<HTMLElement>('.p-editor') ?? quill.container

  // 현재 선택 영역에 적용된 색/포인트 사용 여부(및 인덱스)를 초기값으로 (열 때의 세팅은 적용 억제)
  suppressColorApply = true
  const range = popoverRange
  const current = range ? quill.getFormat(range.index, Math.max(range.length, 1))[format] : null
  const usingPoint = typeof current === 'string' && current.includes(POINT_COLOR_CSS_VAR)
  const indexMatch = typeof current === 'string' ? current.match(/--point-color-(\d)/) : null
  // 인덱스 표기가 없는 레거시 값(var(--point-color, ...))은 0번으로 간주
  popoverPointIndex.value = usingPoint ? (indexMatch ? parseInt(indexMatch[1], 10) : 0) : null
  popoverColor.value =
    typeof current === 'string' && current && !usingPoint ? current : '#111111'
  nextTick(() => {
    suppressColorApply = false
  })

  colorPopover.value = { visible: true, format, top: 0, left: 0 }
  nextTick(computePopoverPosition)
  window.addEventListener('scroll', onPopoverReposition, true)
  window.addEventListener('resize', onPopoverReposition)
}

const addCustomColorItem = (quill: Quill, format: 'color' | 'background') => {
  const toolbar = quill.getModule('toolbar') as { container?: HTMLElement } | null
  const container = toolbar?.container
  if (!container) return

  const picker = container.querySelector<HTMLElement>(`.ql-picker.ql-${format}`)
  const options = picker?.querySelector<HTMLElement>('.ql-picker-options')
  if (!picker || !options) return
  if (options.querySelector('.ql-custom-color')) return // 중복 추가 방지

  const item = document.createElement('span')
  item.className = 'ql-picker-item ql-custom-color'
  item.setAttribute('role', 'button')
  item.tabIndex = 0
  item.title = '직접 선택 (팔레트 · 헥사코드 · 포인트 색상)'
  item.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    picker.classList.remove('ql-expanded') // 드롭다운 닫기
    openQuillColorPopover(quill, format)
  })
  options.appendChild(item)
}

// 팝오버 바깥 클릭 / Esc 시 닫기 (PrimeVue ColorPicker 오버레이 클릭은 예외)
const onDocPointerDown = (e: MouseEvent) => {
  if (!colorPopover.value.visible) return
  const target = e.target as HTMLElement
  if (colorPopoverEl.value?.contains(target)) return
  if (target.closest('.p-colorpicker-panel')) return // 컬러피커 그라데이션 패널
  if (target.closest('.ql-custom-color')) return // 다시 여는 토글 항목
  closeColorPopover()
}
const onDocKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && colorPopover.value.visible) closeColorPopover()
}
onMounted(() => {
  document.addEventListener('mousedown', onDocPointerDown, true)
  document.addEventListener('keydown', onDocKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocPointerDown, true)
  document.removeEventListener('keydown', onDocKeydown)
})

// PrimeVue Editor가 내부 Quill 인스턴스를 @load로 전달한다.
// key: 이 에디터가 속한 prop.key(또는 동적 콘텐츠 id) — 행간/자간 외부 드롭다운이 필드별로
// 올바른 Quill 인스턴스에 적용되도록 구분한다.
const onEditorLoad = (event: { instance: Quill }, key: string) => {
  const quill = event.instance
  if (!quill) return

  quillByKey[key] = quill
  quillRangeByKey[key] = null
  syncEditorFormatState(key, quill, null)

  // 붙여넣기(paste) 시에만 모든 서식을 제거한다.
  // clipboard.convert 는 renderValue(모델→에디터 동기화)에서도 호출되므로, 실제 paste 중에만
  // 매처가 동작하도록 플래그로 가드한다. (가드가 없으면 — 예: 팝오버로 색상을 적용해
  // 모델이 갱신되고 에디터가 blur 된 상태에서 동기화될 때 — 본문 서식이 통째로 사라진다)
  let isPasting = false
  quill.root.addEventListener(
    'paste',
    () => {
      isPasting = true
      setTimeout(() => {
        isPasting = false
      }, 0)
    },
    true,
  )
  quill.clipboard.addMatcher(Node.ELEMENT_NODE, (_node, delta) => {
    if (!isPasting) return delta // 프로그램적 변환(renderValue 등)은 서식 유지
    delta.ops = delta.ops
      .filter((op) => typeof op.insert === 'string') // 이미지 등 임베드 제외, 텍스트만
      .map((op) => ({ insert: op.insert as string })) // 색상/배경/굵기 등 모든 속성 제거
    return delta
  })

  // 직전 선택 영역 추적 (드롭다운 열림 시 blur 되어도 range 보존)
  quill.on('selection-change', (range) => {
    if (range) {
      activeQuill = quill
      activeRange = range
      quillRangeByKey[key] = range
      syncEditorFormatState(key, quill, range)
    }
  })
  // 타이핑으로 커서가 다른 서식 영역으로 이동하는 경우도 드롭다운 표시값에 반영
  quill.on('text-change', () => {
    syncEditorFormatState(key, quill, quill.getSelection())
  })

  // 글자 색상 · 배경 색상 피커에 직접 선택 항목 추가
  addCustomColorItem(quill, 'color')
  addCustomColorItem(quill, 'background')
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

// 지정한 위치(사이)에 행/열 삽입 — atIndex 앞에 새 행/열이 들어간다
const insertTableRow = (atIndex: number) => {
  if (selectedModule.value) {
    moduleStore.insertTableCellRow(selectedModule.value.id, atIndex)
  }
}

const insertTableColumn = (atIndex: number) => {
  if (selectedModule.value) {
    moduleStore.insertTableCellColumn(selectedModule.value.id, atIndex)
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

// 셀별 정렬을 지우고 열 공통 정렬을 사용하도록 복귀
const resetCellAlign = (rowIndex: number, colIndex: number) => {
  if (selectedModule.value) {
    moduleStore.updateTableCell(selectedModule.value.id, rowIndex, colIndex, { align: undefined })
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

// 커스텀 테이블 열 공통 정렬 (셀별 정렬이 없는 셀에 적용; 기본: 1열 가운데, 나머지 왼쪽)
const getColAlign = (colIndex: number): 'left' | 'center' | 'right' => {
  const aligns = (selectedModule.value?.properties.tableColAligns as string[] | undefined) || []
  const v = aligns[colIndex]
  if (v === 'left' || v === 'center' || v === 'right') return v
  return colIndex === 0 ? 'center' : 'left'
}

const updateColAlign = (colIndex: number, align: string) => {
  if (selectedModule.value && (align === 'left' || align === 'center' || align === 'right')) {
    moduleStore.updateTableColAlign(selectedModule.value.id, colIndex, align)
  }
}

const toggleCellType = (rowIndex: number, colIndex: number) => {
  if (selectedModule.value) {
    moduleStore.toggleCellType(selectedModule.value.id, rowIndex, colIndex)
  }
}

// 셀에 실제 적용되는 정렬 (셀별 지정 > 열 공통 > 타입 기본)
const getCellAlign = (cell: TableCell, colIndex: number): 'left' | 'center' | 'right' => {
  if (cell.align) return cell.align
  return getColAlign(colIndex)
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
// 해당 색상 속성이 '포인트 색상 사용' 상태인지
const isUsingPoint = (key: string): boolean => {
  return selectedModule.value?.properties[`${key}${POINT_COLOR_SUFFIX}`] === true
}

// 포인트 색상 사용 토글 — 수동 색상값(properties[key])은 보존하므로 해제 시 자동 원복
const togglePointColor = (key: string, value: boolean): void => {
  updateProperty(`${key}${POINT_COLOR_SUFFIX}`, value === true)
}

// ===== 포인트 색상 스와치(최대 3개) 선택 =====
// 좌측 "포인트 색상" 패널에 저장된 팔레트
const wrapPointColors = computed(() => wrapSettings.value.pointColors ?? [])

// 해당 색상 속성이 참조 중인 포인트 색상 인덱스(0~2)
const pointIndexFor = (key: string): number => {
  if (!selectedModule.value) return 0
  return getPointColorIndex(selectedModule.value.properties, key)
}

// 해당 색상 속성이 실제로 따를 포인트 색상값
const pointColorForKey = (key: string): string =>
  pointColorAt(wrapPointColors.value, pointIndexFor(key))

// 스와치 클릭: 같은 스와치를 다시 누르면 해제(직접 지정으로 복귀), 아니면 그 인덱스로 바인딩
const onSelectPointColor = (key: string, index: number): void => {
  if (isUsingPoint(key) && pointIndexFor(key) === index) {
    togglePointColor(key, false)
    return
  }
  updateProperty(`${key}${POINT_COLOR_INDEX_SUFFIX}`, index)
  togglePointColor(key, true)
}
</script>

<style scoped>
/* Quill 에디터를 이메일 기본 폰트로 통일 (입력 시 결과물과 동일하게 보이도록) */
:deep(.ql-editor) {
  font-family: AppleSDGothic, 'malgun gothic', 'nanum gothic', 'Noto Sans KR', sans-serif;
}

/*
  흰색(#ffffff) 글자 표시 보정 — 에디터 전용.
  에디터 배경이 흰색이라 흰 글자가 보이지 않으므로, 편집 화면에서만 회색으로 보여준다.
  실제 저장값·가운데 미리보기·미리보기 버튼 화면·내려받은 HTML 에는 #ffffff 가 그대로 유지된다.
  (브라우저는 인라인 color 를 rgb(255, 255, 255) 로 직렬화하므로 그 형태를 우선 매칭하고,
   '; color:' / 시작 위치로 한정해 background-color 의 흰색은 건드리지 않는다.)
*/
:deep(.ql-editor [style^='color: rgb(255, 255, 255)']),
:deep(.ql-editor [style*='; color: rgb(255, 255, 255)']),
:deep(.ql-editor [style^='color: rgba(255, 255, 255']),
:deep(.ql-editor [style*='; color: rgba(255, 255, 255']),
:deep(.ql-editor [style^='color: #ffffff']),
:deep(.ql-editor [style*='; color: #ffffff']) {
  color: #b0b0b0 !important;
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

/* 글자 크기(font-size) 드롭다운 픽커 — 선택 영역에 부분 적용(인라인) */
:deep(.ql-snow .ql-picker.ql-fontSize) {
  width: 64px;
}
:deep(.ql-snow .ql-picker.ql-fontSize .ql-picker-label[data-label]:not([data-label=''])::before),
:deep(.ql-snow .ql-picker.ql-fontSize .ql-picker-item[data-label]:not([data-label=''])::before) {
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
:deep(.ql-snow .ql-picker.ql-highlightMarker .ql-picker-item[data-value='#13ecff']) {
  background: linear-gradient(transparent 50%, #13ecff 50%);
}

/* 색상/배경 피커의 "직접 선택(기타)" 항목 — 무지개 스와치 + 스포이드 아이콘 */
:deep(.ql-snow .ql-picker.ql-color .ql-custom-color),
:deep(.ql-snow .ql-picker.ql-background .ql-custom-color) {
  position: relative;
  background: conic-gradient(
    #ff0000,
    #ff7f00,
    #ffff00,
    #00ff00,
    #00ffff,
    #0000ff,
    #ff00ff,
    #ff0000
  );
  border: 1px solid #ccc;
}
:deep(.ql-snow .ql-picker.ql-color .ql-custom-color:hover),
:deep(.ql-snow .ql-picker.ql-background .ql-custom-color:hover) {
  border-color: #06c;
}
:deep(.ql-snow .ql-picker.ql-color .ql-custom-color::after),
:deep(.ql-snow .ql-picker.ql-background .ql-custom-color::after) {
  content: '+';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.7);
}

/* 색상 직접 선택 팝오버 (body로 Teleport, 에디터 왼쪽에 부착) */
.quill-color-popover {
  position: absolute;
  /* PrimeVue ColorPicker 오버레이(overlay 티어 ≈1000+)보다 낮게 두어
     팝오버 위로 그라데이션 패널이 정상적으로 뜨도록 한다. */
  z-index: 900;
  width: 400px;
  padding: 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
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

/* 열 공통 정렬 Select — 좁은 열 헤더에 맞춰 작게 */
.col-align-select :deep(.p-select-label) {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}
.col-align-select :deep(.p-select-dropdown) {
  width: 1.5rem;
}

/* 셀 타입 토글 버튼 호버 효과 */
.table-editor-grid button {
  transition: all 0.15s ease;
}

/* 행/열 사이 삽입 버튼 (행 컨트롤·열 헤더에 표시) */
.tbl-insert-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  border: 1px solid #93c5fd;
  color: #3b82f6;
  background: #fff;
  line-height: 1;
  flex-shrink: 0;
}
.tbl-insert-btn:hover {
  background: #3b82f6;
  border-style: solid;
  border-color: #3b82f6;
  color: #fff;
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

/* ============================================================
   필드 레벨 스타일 토큰 (Figma 372-3000/378-1704/412-2139/408-1758)
   ============================================================ */

/* 라벨/힌트 */
.gg-field-label {
  display: block;
  font-size: 15px;
  line-height: 1.5;
  color: #4e5968;
  margin-bottom: 8px;
}
.gg-field-hint {
  font-size: 14px;
  line-height: 1.5;
  letter-spacing: -0.14px;
  color: #6b7684;
  margin-top: 6px;
}

/* 컬러 필드 행 — 전체 스타일과 동일하게 라벨 좌 / 스와치 우 */
.gg-color-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* 테두리 통합 블록 — 전체 스타일(GlobalStylePanel) 테두리 섹션과 동일 톤 */
.gg-border-block {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.gg-sub-label {
  font-size: 15px;
  color: #4e5968;
}
.gg-brd-radio-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.gg-brd-radio-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid #d1d6db;
  background: #fff;
  flex-shrink: 0;
  position: relative;
  cursor: pointer;
}
.gg-brd-radio-dot.is-checked {
  border-color: #4083f3;
}
.gg-brd-radio-dot.is-checked::after {
  content: '';
  position: absolute;
  inset: 3.5px;
  border-radius: 50%;
  background: #4083f3;
}
.gg-brd-radio-label {
  font-size: 13px;
  font-weight: 500;
  color: #333d4b;
  letter-spacing: -0.13px;
  width: 40px;
  cursor: pointer;
}
.gg-brd-radio-preview {
  width: 50px;
  height: 0;
}

/* 텍스트/URL 인풋 — TextField/Small/Filled */
.gg-text-input :deep(.p-inputtext) {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  background: #f2f4f6;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 15px;
  color: #191f28;
  box-shadow: none;
}
.gg-text-input :deep(.p-inputtext::placeholder) {
  color: #8b95a1;
}
.gg-text-input :deep(.p-inputtext:enabled:focus) {
  border-color: #4083f3;
  background: #fff;
  box-shadow: none;
}

/* 셀렉트 — Dropdown/Small */
.gg-select :deep(.p-select) {
  height: 40px;
  border: 1px solid #e5e8eb;
  border-radius: 8px;
  box-shadow: none;
}
.gg-select :deep(.p-select-label) {
  display: flex;
  align-items: center;
  font-size: 15px;
  color: #333d4b;
}
.gg-select :deep(.p-select:not(.p-disabled).p-focus) {
  border-color: #4083f3;
  box-shadow: none;
}

/* 여백/노출 등 아코디언 토글 행 */
.gg-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  width: 100%;
}
.gg-toggle-label {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: -0.16px;
  color: #333d4b;
}

/* 하위 필드를 가진 토글 — 아코디언 헤더 행 (챙긴 chevron + 우측 노출 토글, Figma 378-1704/408-1758) */
.gg-acc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 0;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}
/* 그룹명이 내부 블록 라벨과 같아 항상 펼쳐두는 헤더 — 접히지 않으므로 클릭 어포던스 제거 */
.gg-acc-header.is-static {
  cursor: default;
}
.gg-acc-chevron {
  font-size: 12px;
  color: #8b95a1;
  flex-shrink: 0;
}
.gg-acc-label {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: -0.16px;
  color: #333d4b;
}
.gg-acc-spacer {
  flex: 1;
}

/* 이름 있는 prop 그룹(로고/타이틀 등 섹션) 래퍼 — Figma 352-1138 접이식 패널 대체 */
.gg-acc-section {
  border-top: 1px solid #f2f4f6;
  padding-top: 4px;
}
.gg-acc-section:first-child {
  border-top: none;
  padding-top: 0;
}
.gg-acc-section--flat {
  border-top: none;
  padding-top: 0;
}
.gg-acc-body {
  padding: 4px 0 12px;
}

/* 컬럼 분할 세그먼트 필 버튼 (1단/2단 세그먼트, Figma 378-1706) */
.gg-segment {
  display: inline-flex;
  border-radius: 8px;
  overflow: hidden;
}
.gg-segment-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 500;
  background: #4e5968;
  color: #fff;
  border: 1px solid #4e5968;
  cursor: pointer;
}
.gg-segment-btn:disabled {
  background: #d1d6db;
  border-color: #d1d6db;
  color: #fff;
  cursor: not-allowed;
}
.gg-segment-btn--ghost {
  background: #fff;
  color: #4e5968;
  border-color: #d1d6db;
  border-left: none;
}
.gg-segment-btn--ghost:disabled {
  background: #fff;
  color: #d1d6db;
  border-color: #e5e8eb;
}

/* 폰트 크기 스테퍼 (−/값/+, Figma 378-1704 "TextField/Small/Default") */
.gg-stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 11px;
  background: #fff;
  border: 1px solid #e5e8eb;
  border-radius: 8px;
}
.gg-stepper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: #4e5968;
  cursor: pointer;
  border-radius: 6px;
}
.gg-stepper-btn:hover {
  background: #f2f4f6;
}
.gg-stepper-value {
  width: 100%;
  border: none;
  background: none;
  outline: none;
  text-align: center;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.15px;
  color: #191f28;
  appearance: textfield;
  -moz-appearance: textfield;
}
.gg-stepper-value::-webkit-outer-spin-button,
.gg-stepper-value::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* 리치텍스트 필드 — 행간/자간 외부 드롭다운 + 툴바 다듬기 (Figma 378-1704) */
.rte-field {
  width: 100%;
}
.rte-ext-row {
  display: flex;
  gap: 18px;
  margin-bottom: 12px;
}
.rte-ext-field {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.rte-ext-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 15px;
  color: #4e5968;
  letter-spacing: -0.15px;
}
.rte-ext-select :deep(.p-select) {
  height: 32px;
  border: 1px solid #e5e8eb;
  border-radius: 8px;
  box-shadow: none;
}
.rte-ext-select :deep(.p-select-label) {
  display: flex;
  align-items: center;
  padding: 0 10px;
  font-size: 15px;
  color: #333d4b;
}

/* Quill 툴바 — 아이콘 간격을 넓히고 테두리를 가볍게 (기존 기능/버튼 구성은 불변) */
.rte-field :deep(.ql-toolbar.ql-snow) {
  border: 1px solid #e5e8eb;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  padding: 10px 12px;
}
.rte-field :deep(.ql-container.ql-snow) {
  border: 1px solid #e5e8eb;
  border-radius: 0 0 8px 8px;
}
.rte-field :deep(.ql-toolbar.ql-snow .ql-formats) {
  margin-right: 12px;
}
.rte-field :deep(.ql-snow.ql-toolbar button) {
  width: 24px;
  height: 24px;
}

/* 여백/패딩 4방향 잠금 슬라이더 (Figma 365-2691 "여백") */
.gg-margin-quad {
  width: 100%;
}
.gg-margin-quad-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.gg-lock-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: #8b95a1;
  cursor: pointer;
  border-radius: 6px;
  flex-shrink: 0;
}
.gg-lock-btn:hover {
  background: #f2f4f6;
}
.gg-lock-btn.is-locked {
  color: #4083f3;
}
.gg-margin-slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 32px;
}
.gg-margin-slider {
  flex: 1;
  min-width: 0;
  accent-color: #4083f3;
}
.gg-margin-value-field {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 32px;
  padding: 0 12px;
  background: #f2f4f6;
  border-radius: 8px;
  flex-shrink: 0;
}
.gg-margin-value-input {
  width: 28px;
  border: none;
  background: none;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.15px;
  color: #191f28;
  text-align: right;
  appearance: textfield;
  -moz-appearance: textfield;
}
.gg-margin-value-input::-webkit-outer-spin-button,
.gg-margin-value-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.gg-margin-value-input:focus {
  outline: none;
}
.gg-margin-value-unit {
  font-size: 14px;
  color: #6b7684;
}
.gg-margin-grid {
  display: grid;
  /* 1fr만 쓰면 트랙 최소폭이 auto(=콘텐츠 min-content)로 잡혀 좁은 패널에서 넘친다 → 0으로 고정 */
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.gg-margin-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 10px;
  background: #f2f4f6;
  border-radius: 8px;
  min-width: 0;
}
.gg-margin-cell-label {
  font-size: 13px;
  color: #6b7684;
  flex-shrink: 0;
}
.gg-margin-cell-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  font-size: 14px;
  color: #191f28;
  appearance: textfield;
  -moz-appearance: textfield;
}
.gg-margin-cell-input::-webkit-outer-spin-button,
.gg-margin-cell-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.gg-margin-cell-input:focus {
  outline: none;
}
</style>
