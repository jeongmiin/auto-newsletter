<template>
  <!-- ModuleForm: PropertiesPanel.vue에서 추출한 "선택된 모듈 있음" 전용 폼.
       selectedModule가 없으면 아무것도 그리지 않는다(호출부가 보통 이미 selectedModule 존재를 보고 렌더하지만,
       v-if로 한 번 더 방어해 selectedModule 타입도 non-null로 좁힌다). -->
  <!-- .module-form = assets/module-form.css의 적용 범위(옛 scoped 경계를 대신한다) -->
  <div v-if="selectedModule" class="module-form">
        <!-- 패널 상단 타이틀 (선택한 모듈 이름) — 스크롤 시 상단 고정(sticky) (Figma Frame 80) -->
        <div class="gg-panel-title-bar p-4 pb-3 flex items-center justify-between gap-2">
          <p class="gg-panel-title truncate">{{ panelTitle }}</p>
        </div>

        <!-- 영역 컬럼 분할 (Figma Frame 80 · 745:3908) — 1단/2단 세그먼트 + 너비 조정.
             나눌 수 없는 모듈(config의 maxColumns=1, 예: 구분선·여백)은 컬럼 컨트롤 자체를 숨긴다.
             2단이 다 채워지면 섹션째 사라진다(showLayoutSection 주석 참고).
             좌우 자리 바꾸기는 캔버스 행 가운데의 ⇄ 버튼이 담당한다. -->
        <div
          v-if="showLayoutSection || moduleColumnInfo.columns > 1"
          class="px-[25px] pt-4 pb-4 border-b"
        >
          <template v-if="showLayoutSection && maxColumns > 1">
            <p class="gg-field-label !mb-2.5">레이아웃</p>
            <div class="col-seg">
              <button
                v-for="n in maxColumns"
                :key="`colseg-${n}`"
                type="button"
                class="col-seg-btn"
                :class="{ 'is-active': moduleColumnInfo.columns === n }"
                @click="setColumnsTo(n)"
                v-tooltip.top="`이 모듈이 있는 행을 ${n}단으로 (모바일은 세로로 쌓임)`"
              >{{ n }}단</button>
            </div>
          </template>
          <!-- 너비 조정 (Figma 926-8769 · 977-7717) — 기준은 항상 '첫 번째 열'이고 두 번째 열은
               100-첫번째로 자동 계산된다. 추천 비율(프리셋)과 직접 조정(슬라이더)은 같은 값을 쓰므로
               어느 쪽으로 바꿔도 나머지 한쪽과 아래 프리뷰 막대가 함께 따라온다.
               데스크톱 기준이고, 모바일에서는 아래 '가로 유지'가 꺼져 있으면 세로로 쌓인다. -->
          <div v-if="showLayoutSection && moduleColumnInfo.columns > 1" class="mt-6">
            <p class="gg-field-label !mb-4">너비 조정</p>
            <div class="wadj-tabs">
              <button
                type="button"
                class="wadj-tab"
                :class="{ 'is-active': widthTab === 'preset' }"
                @click="widthTab = 'preset'"
              >
                <span class="material-symbols-outlined">fit_width</span>추천 비율
              </button>
              <button
                type="button"
                class="wadj-tab"
                :class="{ 'is-active': widthTab === 'custom' }"
                @click="widthTab = 'custom'"
              >
                <span class="material-symbols-outlined">edit</span>직접 조정
              </button>
            </div>

            <!-- 추천 비율 -->
            <div v-if="widthTab === 'preset'" class="wadj-presets">
              <button
                v-for="p in WIDTH_PRESETS"
                :key="`wpreset-${p}`"
                type="button"
                class="wadj-preset"
                :class="{ 'is-active': firstColumnWidth === p }"
                @click="setFirstColumnWidth(p)"
              >{{ p }} : {{ 100 - p }}</button>
            </div>

            <!-- 직접 조정 -->
            <div v-else class="wadj-custom">
              <p class="gg-field-label !mb-2.5">첫 번째 열 너비</p>
              <div class="gg-margin-slider-row">
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="1"
                  :value="firstColumnWidth"
                  @input="onFirstColumnWidthInput($event)"
                  class="gg-margin-slider"
                />
                <div class="gg-margin-value-field">
                  <input
                    type="number"
                    min="10"
                    max="90"
                    :value="firstColumnWidth"
                    @change="onFirstColumnWidthInput($event)"
                    @keydown.enter="blurTarget"
                    class="gg-margin-value-input"
                  />
                  <span class="gg-margin-value-unit">%</span>
                </div>
              </div>
              <p class="hint-text">*두 번째 열 너비는 자동으로 계산돼요</p>
            </div>

            <!-- 비율 프리뷰 — 막대 폭이 실제 비율이라 값과 모양을 함께 확인할 수 있다 -->
            <div class="wadj-preview">
              <div class="wadj-preview-bar is-first" :style="{ flexGrow: firstColumnWidth }">
                {{ firstColumnWidth }}%
              </div>
              <div class="wadj-preview-bar" :style="{ flexGrow: 100 - firstColumnWidth }">
                {{ 100 - firstColumnWidth }}%
              </div>
            </div>
          </div>
          <!-- 모바일에서도 가로 유지 — 켜면 좁은 폭에서도 세로로 쌓지 않고 컬럼 비율 그대로 나란히 둔다.
               (뉴스 헤드라인 헤더의 '제목 | 웹으로 보기'처럼 한 줄로 읽혀야 하는 행에 쓴다)
               레이아웃 조작과 달리 '다 채워진 2단'에서 오히려 필요한 설정이라 계속 노출한다. -->
          <div v-if="showKeepInlineToggle" class="flex items-center gap-2">
            <span class="gg-field-label !mb-0 flex-1">모바일에서도 가로 유지</span>
            <ToggleSwitch :modelValue="rowKeepInlineOn" @update:modelValue="onRowKeepInlineToggle" />
          </div>
          <p v-if="showKeepInlineToggle" class="hint-text">
            끄면 모바일 폭에서 컬럼이 세로로 쌓입니다
          </p>
        </div>

        <!-- 테이블: 내용 / 스타일 탭 (Figma 686-4239) -->
        <div v-if="isTableModule && !isColumnSetupMode" class="tbl-tabs">
          <button
            type="button"
            class="tbl-tab"
            :class="{ 'is-active': activeTableTab === 'content' }"
            @click="activeTableTab = 'content'"
          >테이블 내용</button>
          <button
            type="button"
            class="tbl-tab"
            :class="{ 'is-active': activeTableTab === 'style' }"
            @click="activeTableTab = 'style'"
          >테이블 스타일</button>
        </div>

        <!-- 속성 편집 폼 — 컬럼을 나눈 직후(빈 컬럼이 남은 상태)에는 감춘다.
             '직접 구성' 패널처럼 지금 정할 것(단·너비)만 남겨 두는 편이 헷갈리지 않는다. -->
      <div v-if="!isColumnSetupMode" class="px-[25px] pb-7">
        <!-- 테이블 스타일 탭 상단: 행 열 관리 + 열 너비 직접 설정 (Figma 715-2843 / 717-3366) -->
        <template v-if="isTableModule && activeTableTab === 'style'">
          <!-- 행 열 관리 -->
          <div class="tbl-rowcol">
            <label class="tbl-sec-label">행 열 관리</label>
            <div class="tbl-rc-row">
              <span class="tbl-rc-name"><span class="material-symbols-outlined">table_rows</span>행</span>
              <div class="tbl-rc-btns">
                <div class="tbl-rc-add">
                  <button type="button" class="tbl-rc-btn tbl-rc-btn--add" @click.stop="toggleInsertMenu('row')">
                    <span class="material-symbols-outlined">add</span>추가
                    <span class="material-symbols-outlined tbl-rc-caret">expand_more</span>
                  </button>
                  <div v-if="insertMenu === 'row'" class="tbl-insert-menu">
                    <button type="button" :disabled="!firstSelCoord" @click="insertRow('above')">선택 행 위에 삽입</button>
                    <button type="button" :disabled="!firstSelCoord" @click="insertRow('below')">선택 행 아래에 삽입</button>
                    <button type="button" @click="insertRow('end')">맨 아래에 추가</button>
                    <p v-if="!firstSelCoord" class="tbl-insert-hint">셀을 선택하면 사이에 삽입할 수 있어요</p>
                  </div>
                </div>
                <button type="button" class="tbl-rc-btn" @click="deleteTableRow"><span class="material-symbols-outlined">remove</span>삭제</button>
              </div>
            </div>
            <div class="tbl-rc-row">
              <span class="tbl-rc-name"><span class="material-symbols-outlined">view_column</span>열</span>
              <div class="tbl-rc-btns">
                <div class="tbl-rc-add">
                  <button type="button" class="tbl-rc-btn tbl-rc-btn--add" @click.stop="toggleInsertMenu('col')">
                    <span class="material-symbols-outlined">add</span>추가
                    <span class="material-symbols-outlined tbl-rc-caret">expand_more</span>
                  </button>
                  <div v-if="insertMenu === 'col'" class="tbl-insert-menu">
                    <button type="button" :disabled="!firstSelCoord" @click="insertCol('left')">선택 열 왼쪽에 삽입</button>
                    <button type="button" :disabled="!firstSelCoord" @click="insertCol('right')">선택 열 오른쪽에 삽입</button>
                    <button type="button" @click="insertCol('end')">맨 오른쪽에 추가</button>
                    <p v-if="!firstSelCoord" class="tbl-insert-hint">셀을 선택하면 사이에 삽입할 수 있어요</p>
                  </div>
                </div>
                <button type="button" class="tbl-rc-btn" @click="deleteTableColumn"><span class="material-symbols-outlined">remove</span>삭제</button>
              </div>
            </div>

            <!-- 삽입 메뉴 바깥 클릭 닫기 -->
            <div v-if="insertMenu" class="tbl-menu-backdrop" @click="insertMenu = null"></div>
            <div class="tbl-rc-row">
              <span class="tbl-rc-name"><span class="material-symbols-outlined">table_chart</span>셀</span>
              <!-- 합쳐진 셀 하나를 고르면 같은 자리에서 '나누기'로 바뀐다 —
                   병합/해제는 한 버튼의 앞뒤 동작이라 자리를 옮기면 되돌리는 길을 못 찾는다.
                   나누고 나면 선택이 그 셀 하나만 남아 다시 '합치기'(비활성)로 돌아온다. -->
              <button
                v-if="canUnmergeSelection"
                type="button"
                class="tbl-rc-merge"
                @click="unmergeSelection"
              >나누기</button>
              <button
                v-else
                type="button"
                class="tbl-rc-merge"
                :disabled="!canMergeSelection"
                @click="mergeSelection"
              >합치기</button>
            </div>
            <p class="hint-text">
              {{ canUnmergeSelection
                ? '*합쳐진 셀이에요. 나누기를 누르면 원래 칸으로 돌아가요.'
                : '*2개 이상 셀 합칠 시, SHIFT + 셀 선택하세요.' }}
            </p>
          </div>

          <div class="tbl-divider tbl-divider--wide"></div>

          <!-- 열 너비 직접 설정 (gg-acc-section 토글 아코디언) -->
          <div class="gg-acc-section">
            <div class="gg-acc-header is-static">
              <span><span class="gg-acc-label">열 너비 직접 설정</span></span>
              <span class="gg-acc-spacer"></span>
              <ToggleSwitch :modelValue="colWidthOn" @update:modelValue="onColWidthToggle" />
            </div>
            <div v-if="colWidthOn" class="gg-acc-body gg-acc-body--card">
              <div class="gg-acc-fields">
                <div v-for="(w, ci) in colWidthValues" :key="ci" class="tbl-colw">
                  <div class="tbl-colw-head">
                    <label class="gg-field-label">{{ ci + 1 }}열 너비</label>
                    <!-- 자동 열: '자동' 표시 / 수동 열: '자동으로' 되돌리기 -->
                    <span v-if="!colWidthManual[ci]" class="tbl-colw-auto">자동</span>
                    <button
                      v-else
                      type="button"
                      class="tbl-colw-reset"
                      @click="resetColWidth(ci)"
                      v-tooltip.top="'자동으로 되돌리기'"
                    >자동으로</button>
                  </div>
                  <div class="gg-margin-slider-row">
                    <input
                      type="range"
                      min="5"
                      max="95"
                      step="0.5"
                      :value="w"
                      @input="onColWidthInput(ci, $event)"
                      class="gg-margin-slider"
                    />
                    <div class="gg-margin-value-field">
                      <input
                        type="number"
                        min="5"
                        max="95"
                        :value="w"
                        @change="onColWidthInput(ci, $event)"
                        @keydown.enter="blurTarget"
                        class="gg-margin-value-input"
                      />
                      <span class="gg-margin-value-unit">%</span>
                    </div>
                  </div>
                </div>
                <!-- 100% 초과 경고 -->
                <p v-if="colWidthOverflow" class="tbl-colw-warn">
                  <span class="material-symbols-outlined">error</span>
                  열 너비 합이 100%를 초과했어요 (현재 {{ colWidthTotal }}%)
                </p>
              </div>
            </div>
            <p class="hint-text">*OFF시, 각 열의 너비가 동일하게 자동 설정돼요</p>
          </div>

          <div class="tbl-divider tbl-divider--wide"></div>
        </template>

        <!-- 작은 버튼 '버튼 내용' 칩 (Figma 1227-42350) — 버튼 2~4 노출 스위치를 대신한다.
             칩 = 지금 있는 버튼(클릭해서 편집 대상 전환), '+ 추가' = 다음 버튼 켜기,
             활성 칩의 ✕ = 그 버튼 삭제. 아래 '버튼 N' 속성 그룹은 고른 칩 하나만 펼쳐 보여준다. -->
        <div v-if="isSmallButtonModule" class="sbtn-block">
          <div class="sbtn-head">
            <span class="gg-acc-label">버튼 내용</span>
            <span class="sbtn-max">(최대 {{ SMALL_BTN_MAX }}개)</span>
          </div>
          <div class="sbtn-chips">
            <!-- 칩 하나에 '선택'과 '삭제' 두 동작이 있어 컨테이너는 div, 안에 버튼 둘을 둔다 -->
            <div
              v-for="slot in smallBtnSlots"
              :key="`sbtn-${slot}`"
              class="sbtn-chip"
              :class="{ 'is-active': slot === activeSmallBtn }"
            >
              <button type="button" class="sbtn-chip-main" @click="activeSmallBtn = slot">
                {{ smallBtnLabel(slot) }}
              </button>
              <!-- 활성 칩에만 ✕ (버튼이 하나만 남으면 지울 수 없다) -->
              <button
                v-if="slot === activeSmallBtn && smallBtnSlots.length > 1"
                type="button"
                class="sbtn-chip-x"
                :aria-label="`${smallBtnLabel(slot)} 삭제`"
                v-tooltip.top="'이 버튼 삭제'"
                @click="removeSmallBtn(slot)"
              >
                <span class="material-symbols-outlined">close_small</span>
              </button>
            </div>
            <button
              v-if="smallBtnSlots.length < SMALL_BTN_MAX"
              type="button"
              class="sbtn-chip sbtn-chip--add"
              @click="addSmallBtn"
            >+ 추가</button>
          </div>
        </div>

        <div
          v-for="(group, gIdx) in propGroups"
          v-show="isGroupInActiveTab(group) && isSmallBtnGroupVisible(group)"
          :key="`grp-${gIdx}-${group.name || 'flat'}`"
          class="gg-acc-section"
          :class="{
            'gg-acc-section--flat': !group.name,
            'gg-acc-section--quad': isQuadSelfLabeledGroup(group) && !isStyleSection(group),
            'gg-acc-section--btn': isSmallBtnGroup(group),
            'gg-acc-section--divider': gIdx === smallBtnCommonStart,
          }"
        >
        <!-- 이름 있는 prop 그룹(레거시 모듈의 로고/타이틀 등 섹션) — Figma 352-1138의 접이식 헤더 패턴.
             그룹 전체를 켜고 끄는 토글(예: showLogo)이 있으면 헤더로 끌어올려 판넬을 열기 전에도 제어 가능하게 한다. -->
        <!-- 헤더 = [chevron + 라벨](열기/닫기) + [스위치](속성 on/off).
             · 스위치 off→on: 속성을 켜면서 섹션도 자동으로 펼친다
             · 스위치 on→off: 펼침 상태는 그대로 두고 내용만 흐리게(조작 불가)
             · chevron/라벨 클릭: 스위치와 무관하게 열고 닫는다 (기본 닫힘) -->
        <div
          v-if="hasSectionHeader(group) || (gIdx === 0 && !isTableModule && !isSmallBtnGroup(group))"
          class="gg-acc-header"
          :class="{ 'is-static': !isCollapsibleSection(group) }"
        >
          <span
            :class="{ 'gg-acc-title': isCollapsibleSection(group) }"
            @click="isCollapsibleSection(group) && toggleGroupPanel(group, gIdx)"
          >
            <!-- 타이틀 왼쪽 화살표 아이콘: 열림 ⌄ / 닫힘 › (Figma 608-2624) -->
            <i
              v-if="isCollapsibleSection(group)"
              class="pi gg-acc-chevron"
              :class="isSectionOpen(group, gIdx) ? 'pi-chevron-down' : 'pi-chevron-right'"
            ></i>
            <span class="gg-acc-label">{{ sectionHeaderLabel(group, gIdx) }}</span>
          </span>
          <span class="gg-acc-spacer"></span>
          <ToggleSwitch
            v-if="groupHeaderToggle(group)"
            :modelValue="Boolean(selectedModule.properties[groupHeaderToggle(group)!.key])"
            @update:modelValue="onSectionSwitch(group, gIdx, $event)"
            @click.stop
          />
          <!-- 테두리 블록만 있는 섹션(예: 이미지 '테두리')은 블록의 on/off를 헤더 토글로 노출 -->
          <ToggleSwitch
            v-else-if="groupBorderToggleProp(group)"
            :modelValue="borderIsOn(groupBorderToggleProp(group)!)"
            @update:modelValue="onSectionSwitch(group, gIdx, $event)"
            @click.stop
          />
          <!-- 그 외 스타일 섹션(이미지 크기 조정·모서리 둥글기·여백)은 켜고 끌 속성이 없다.
               스위치를 두면 아코디언 상태와 뒤엉키므로 chevron/라벨만으로 열고 닫는다. -->
        </div>
        <div
          class="gg-acc-body"
          :class="{ 'gg-acc-body--card': isCollapsibleSection(group) && isSectionOpen(group, gIdx) }"
          v-show="isSectionOpen(group, gIdx)"
        >
        <!-- 섹션 필드 래퍼: 접이식 카드 섹션에서는 이 래퍼가 하나의 회색 카드가 되어
             한 섹션의 여러 속성(예: 이미지 크기 조정의 최대 너비+정렬)을 한 카드에 담는다.
             4방향 여백(quad)은 블록마다 자기 카드를 갖는다 — 텍스트 '여백' 섹션의 안쪽/바깥 여백이 각각 한 카드.
             카드가 아닌 섹션에서는 display:contents 로 레이아웃에 영향 없음. -->
        <div
          v-for="(chunk, cIdx) in fieldChunks(group)"
          :key="`fields-${cIdx}`"
          class="gg-acc-fields"
          :class="{ 'is-disabled': !isSectionEnabled(group) }"
        >
        <div
          v-for="{ prop, index } in chunk"
          :key="prop.key"
          :class="{ 'mf-toggle-divider': !group.name && index > 0 && isTogglePropStart(prop, group.props) }"
          v-show="isFieldVisible(group, prop) && !isQuadMember(prop, group.props, index) && !isBorderMember(prop, group.props) && groupHeaderToggle(group) !== prop"
        >
          <!-- 리치텍스트(textarea)는 위에 '폰트 크기'와 서식 툴바가 바로 붙으므로 별도 라벨을 두지 않는다(Figma 640-3689) -->
          <label
            v-show="prop.type !== 'boolean' && prop.type !== 'checkbox' && prop.type !== 'textarea' && prop.type !== 'table-editor' && !isColorBlock(prop) && !isQuadStart(prop, group.props, index) && !isSingleSpacingField(prop) && !isBorderWidthField(prop) && !isPxWidthField(prop) && !isBtnWidthField(prop) && !isBorderStyleStart(prop)"
            class="gg-field-label"
            :class="{ 'fs-label-row': isFontSizeField(prop) }"
          >
            <span>
              {{ prop.label }}
              <!-- 폰트 크기: 지금 이 컨트롤이 무엇을 바꾸는지(모듈 전체 / 드래그한 부분) 배지로 표시 -->
              <span v-if="isFontSizeField(prop) && isFontSizeSelectionTarget(prop)" class="fs-target-badge">
                선택 영역
              </span>
            </span>
            <!-- 개별(인라인) 크기가 걸려 있으면 '전체 값이 안 먹는' 이유를 그 자리에서 풀 수 있게 한다 -->
            <button
              v-if="isFontSizeField(prop) && fontSizeHasInline(prop)"
              type="button"
              class="fs-reset-btn"
              @click.prevent="resetFontSizeToBase(prop)"
            >
              <span class="material-symbols-outlined">restart_alt</span>
              {{ isFontSizeSelectionTarget(prop) ? '선택 영역을 기본 크기로' : '개별 크기 모두 지우기' }}
            </button>
          </label>

          <!-- 여백/패딩 등 4방향(Top/Right/Bottom/Left) 세트 — 잠금 슬라이더 UI (Figma 365-2691) -->
          <div v-if="isQuadStart(prop, group.props, index)" class="gg-margin-quad">
            <div class="gg-margin-quad-head">
              <!-- 여백 라벨은 항상 quad-head(잠금 버튼과 한 줄)에 노출. 그룹이 이 quad로만 자기 이름을
                   가지면(예: 그룹"바깥 여백") 섹션 헤더는 생략되고 이 라벨이 그 이름을 대신한다. -->
              <span class="gg-field-label !mb-0">{{ (isStyleSection(group) && quadLabel(prop) === group.name) ? '전체 적용' : quadLabel(prop) }}</span>
              <button
                type="button"
                class="gg-lock-btn"
                :class="{ 'is-locked': isQuadLocked(quadPrefixFor(prop)) }"
                @click="toggleQuadLock(quadPrefixFor(prop))"
                v-tooltip.top="isQuadLocked(quadPrefixFor(prop)) ? '잠금 해제하면 방향별로 따로 조정할 수 있어요' : '잠그면 4방향이 함께 움직여요'"
              >
                <span class="material-symbols-outlined gg-lock-icon">{{ isQuadLocked(quadPrefixFor(prop)) ? 'lock' : 'lock_open_right' }}</span>
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

            <!-- 잠금 해제: 방향별(상단/하단/좌측/우측) 슬라이더 + 값 필드 (GroupPropertiesPanel과 동일 레이아웃) -->
            <div v-else class="gg-margin-dir-list">
              <div class="gg-margin-dir-row">
                <span class="gg-margin-dir-label">상단</span>
                <div class="gg-margin-slider-row">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    :value="quadPxNumber(prop)"
                    @input="onQuadDirInput(prop, $event)"
                    class="gg-margin-slider"
                  />
                  <div class="gg-margin-value-field">
                    <input
                      type="number"
                      min="0"
                      :value="quadPxNumber(prop)"
                      @input="onQuadDirInput(prop, $event)"
                      class="gg-margin-value-input"
                    />
                    <span class="gg-margin-value-unit">px</span>
                  </div>
                </div>
              </div>
              <div class="gg-margin-dir-row">
                <span class="gg-margin-dir-label">하단</span>
                <div class="gg-margin-slider-row">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    :value="quadPxNumber(quadBottom(group.props, index))"
                    @input="onQuadDirInput(quadBottom(group.props, index), $event)"
                    class="gg-margin-slider"
                  />
                  <div class="gg-margin-value-field">
                    <input
                      type="number"
                      min="0"
                      :value="quadPxNumber(quadBottom(group.props, index))"
                      @input="onQuadDirInput(quadBottom(group.props, index), $event)"
                      class="gg-margin-value-input"
                    />
                    <span class="gg-margin-value-unit">px</span>
                  </div>
                </div>
              </div>
              <div class="gg-margin-dir-row">
                <span class="gg-margin-dir-label">좌측</span>
                <div class="gg-margin-slider-row">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    :value="quadPxNumber(quadLeft(group.props, index))"
                    @input="onQuadDirInput(quadLeft(group.props, index), $event)"
                    class="gg-margin-slider"
                  />
                  <div class="gg-margin-value-field">
                    <input
                      type="number"
                      min="0"
                      :value="quadPxNumber(quadLeft(group.props, index))"
                      @input="onQuadDirInput(quadLeft(group.props, index), $event)"
                      class="gg-margin-value-input"
                    />
                    <span class="gg-margin-value-unit">px</span>
                  </div>
                </div>
              </div>
              <div class="gg-margin-dir-row">
                <span class="gg-margin-dir-label">우측</span>
                <div class="gg-margin-slider-row">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    :value="quadPxNumber(quadRight(group.props, index))"
                    @input="onQuadDirInput(quadRight(group.props, index), $event)"
                    class="gg-margin-slider"
                  />
                  <div class="gg-margin-value-field">
                    <input
                      type="number"
                      min="0"
                      :value="quadPxNumber(quadRight(group.props, index))"
                      @input="onQuadDirInput(quadRight(group.props, index), $event)"
                      class="gg-margin-value-input"
                    />
                    <span class="gg-margin-value-unit">px</span>
                  </div>
                </div>
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

          <!-- 폰트 크기 필드 (Figma 640-3689) — 모듈 기본값과 선택 영역 크기를 컨트롤 하나로 통합.
               드래그로 텍스트를 선택하면 그 부분의 크기를 보여주고 그 부분만 바꾼다(배지 '선택 영역').
               선택 영역에 크기가 섞여 있으면 값 자리에 '--'를 보여준다. -->
          <div v-else-if="isFontSizeField(prop)" class="space-y-1">
            <div class="gg-margin-slider-row">
              <input
                type="range"
                :min="FONT_SIZE_MIN"
                :max="FONT_SIZE_MAX"
                step="1"
                :value="fontSizeNumber(prop)"
                @input="onFontSizeInput(prop, $event)"
                class="gg-margin-slider"
              />
              <div class="gg-margin-value-field">
                <!-- 혼합 상태는 숫자 입력이 '--'를 표현할 수 없어 텍스트 입력으로 렌더 -->
                <input
                  v-if="isFontSizeMixed(prop)"
                  type="text"
                  value="--"
                  @focus="($event.target as HTMLInputElement).select()"
                  @change="onFontSizeInput(prop, $event)"
                  @keydown.enter="blurTarget"
                  class="gg-margin-value-input"
                />
                <input
                  v-else
                  type="number"
                  :min="FONT_SIZE_MIN"
                  :max="FONT_SIZE_MAX"
                  :value="fontSizeNumber(prop)"
                  @change="onFontSizeInput(prop, $event)"
                  @keydown.enter="blurTarget"
                  class="gg-margin-value-input"
                />
                <span class="gg-margin-value-unit">px</span>
              </div>
            </div>
            <p v-if="prop.hint" class="hint-text" v-html="prop.hint"></p>
          </div>

          <!-- 테두리 위치 — 그룹 스타일과 같은 아이콘 다중 선택 (전체/상단/하단/좌측/우측) -->
          <div v-else-if="isBorderPositionField(prop)">
            <BorderSideSelector
              :modelValue="borderSidesOf(prop)"
              @update:modelValue="onBorderSidesChange(prop, $event)"
            />
          </div>

          <!-- 4방향 세트가 아닌 단일 여백 값(예: 버튼 안쪽 상하 여백) —
               4방향 여백(quad)의 '잠금' 상태와 완전히 같은 UI(헤드 라벨 + gg-margin-slider-row).
               잠글 대상이 하나뿐이라 잠금 버튼만 없다. -->
          <div v-else-if="isSingleSpacingField(prop)" class="gg-margin-quad">
            <div class="gg-margin-quad-head">
              <span class="gg-field-label !mb-0">{{ prop.label }}</span>
            </div>
            <div class="gg-margin-slider-row">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                :value="quadPxNumber(prop)"
                @input="onSingleSpacingInput(prop, $event)"
                class="gg-margin-slider"
              />
              <div class="gg-margin-value-field">
                <input
                  type="number"
                  min="0"
                  :value="quadPxNumber(prop)"
                  @input="onSingleSpacingInput(prop, $event)"
                  class="gg-margin-value-input"
                />
                <span class="gg-margin-value-unit">px</span>
              </div>
            </div>
            <p v-if="prop.hint" class="hint-text" v-html="prop.hint"></p>
          </div>

          <!-- 독립 테두리 두께(예: 섹션 타이틀 상단 테두리 두께) — 여백 슬라이더와 동일한 헤드 라벨 + 슬라이더(px) UI -->
          <div v-else-if="isBorderWidthField(prop)" class="gg-margin-quad">
            <div class="gg-margin-quad-head">
              <span class="gg-field-label !mb-0">{{ prop.label }}</span>
            </div>
            <div class="gg-margin-slider-row">
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                :value="quadPxNumber(prop)"
                @input="onSingleSpacingInput(prop, $event)"
                class="gg-margin-slider"
              />
              <div class="gg-margin-value-field">
                <input
                  type="number"
                  min="0"
                  :value="quadPxNumber(prop)"
                  @input="onSingleSpacingInput(prop, $event)"
                  class="gg-margin-value-input"
                />
                <span class="gg-margin-value-unit">px</span>
              </div>
            </div>
            <p v-if="prop.hint" class="hint-text" v-html="prop.hint"></p>
          </div>

          <!-- px 고정 너비(예: 언어 선택 버튼의 버튼 너비) — 여백·테두리 두께와 같은 슬라이더 UI -->
          <div v-else-if="isPxWidthField(prop)" class="gg-margin-quad">
            <div class="gg-margin-quad-head">
              <span class="gg-field-label !mb-0">{{ prop.label }}</span>
            </div>
            <div class="gg-margin-slider-row">
              <input
                type="range"
                min="0"
                :max="PX_WIDTH_MAX"
                step="1"
                :value="quadPxNumber(prop)"
                @input="onSingleSpacingInput(prop, $event)"
                class="gg-margin-slider"
              />
              <div class="gg-margin-value-field">
                <input
                  type="number"
                  min="0"
                  :value="quadPxNumber(prop)"
                  @input="onSingleSpacingInput(prop, $event)"
                  class="gg-margin-value-input"
                />
                <span class="gg-margin-value-unit">px</span>
              </div>
            </div>
            <p v-if="prop.hint" class="hint-text" v-html="prop.hint"></p>
          </div>

          <!-- 이미지 최대 너비: 슬라이더 + % 값 (Figma 686-3949) -->
          <div v-else-if="isMaxWidthField(prop)" class="space-y-1">
            <div class="gg-margin-slider-row">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                :value="pctNumber(prop)"
                @input="onPctInput(prop, $event)"
                class="gg-margin-slider"
              />
              <div class="gg-margin-value-field">
                <input
                  type="number"
                  min="0"
                  max="100"
                  :value="pctNumber(prop)"
                  @change="onPctInput(prop, $event)"
                  @keydown.enter="blurTarget"
                  class="gg-margin-value-input"
                />
                <span class="gg-margin-value-unit">%</span>
              </div>
            </div>
            <p v-if="prop.hint" class="hint-text" v-html="prop.hint"></p>
          </div>

          <!-- 모서리 둥글기: 슬라이더 + 값(px) — 여백 슬라이더와 동일 UI -->
          <div v-else-if="isBorderRadiusField(prop)" class="space-y-1">
            <div class="gg-margin-slider-row">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                :value="radiusNumber(prop)"
                @input="onRadiusInput(prop, $event)"
                class="gg-margin-slider"
              />
              <div class="gg-margin-value-field">
                <input
                  type="number"
                  min="0"
                  max="100"
                  :value="radiusNumber(prop)"
                  @input="onRadiusInput(prop, $event)"
                  class="gg-margin-value-input"
                />
                <span class="gg-margin-value-unit">px</span>
              </div>
            </div>
            <p v-if="prop.hint" class="hint-text" v-html="prop.hint"></p>
          </div>

          <!-- 작은 버튼 '버튼 너비' (Figma 1245-45052) — 여백과 같은 슬라이더 + 값 필드.
               기본값이 'auto'라 px 슬라이더 판별(isPxWidthField)에 걸리지 않아 따로 그린다.
               저장돼 있던 단위(%·px)는 그대로 유지한다(옛 템플릿의 '100%'가 px로 바뀌지 않도록). -->
          <div v-else-if="isBtnWidthField(prop)" class="gg-margin-quad">
            <div class="gg-margin-quad-head">
              <span class="gg-field-label !mb-0">{{ prop.label }}</span>
            </div>
            <div class="gg-margin-slider-row">
              <input
                type="range"
                min="0"
                :max="btnWidthMax"
                step="1"
                :value="btnWidthNumber"
                @input="onBtnWidthInput($event)"
                class="gg-margin-slider"
              />
              <div class="gg-margin-value-field">
                <input
                  type="number"
                  min="0"
                  :max="btnWidthMax"
                  :value="btnWidthNumber"
                  @input="onBtnWidthInput($event)"
                  class="gg-margin-value-input"
                />
                <span class="gg-margin-value-unit">{{ btnWidthUnit }}</span>
              </div>
            </div>
            <p v-if="prop.hint" class="hint-text" v-html="prop.hint"></p>
          </div>

          <!-- 텍스트 입력 (일반) -->
          <div v-else-if="prop.type === 'text'" class="space-y-2 gg-text-input">
            <InputText
              :modelValue="String(selectedModule.properties[prop.key] || '')"
              @update:modelValue="updateProperty(prop.key, $event ?? '')"
              @focus="normalizePxField(prop)"
              @blur="normalizePxField(prop)"
              :placeholder="prop.placeholder"
              class="w-full"
            />
            <!-- 힌트: 정적 설정(modules-config) 문자열이라 <br> 등 간단한 줄바꿈 허용 -->
            <p v-if="prop.hint" class="hint-text" v-html="prop.hint"></p>
          </div>

          <!-- 리치 텍스트 에디터 (Figma 640-3235) — 툴바는 두 줄 그룹 + 세로 구분선 구성.
               행간/자간은 툴바 밖 드롭다운이 아니라 1줄 오른쪽 끝의 format_line_spacing 팝오버로 통합했다.
               내부적으로는 기존과 동일하게 quillByKey/format('lineHeight'|'letterSpacing', ...)를 사용한다. -->
          <div
            v-else-if="prop.type === 'textarea'"
            class="rte-field"
            :style="{ '--rte-base-size': editorBaseFontSize(prop, group) }"
          >
            <!-- 높이는 CSS(min-height 169px + resize:vertical)가 담당한다 —
                 editorStyle로 인라인 고정 높이를 주면 그립을 끌어도 회색 박스가 따라 커지지 않는다 -->
            <Editor
              :model-value="String(selectedModule.properties[prop.key] || '')"
              @update:model-value="handleEditorUpdate(prop.key, $event)"
              @load="(e) => onEditorLoad(e, prop.key)"
              :placeholder="prop.placeholder"
            >
              <template #toolbar>
                <!-- 1줄: 굵게·기울임·밑줄·취소선 │ 정렬·목록·행간/자간 -->
                <div class="rte-tb-row">
                  <span class="ql-formats rte-tb-grp">
                    <button class="ql-bold" title="굵게"></button>
                    <button class="ql-italic" title="기울임"></button>
                    <button class="ql-underline" title="밑줄"></button>
                    <button class="ql-strike" title="취소선"></button>
                  </span>
                  <span class="rte-tb-div"></span>
                  <span class="ql-formats rte-tb-grp">
                    <select class="ql-align" title="정렬"></select>
                    <!-- 목록: 버튼 2개 → 드롭다운 1개 (Figma 640-3235의 목록 드롭다운) -->
                    <select class="ql-list" title="목록">
                      <option value="ordered">번호 목록</option>
                      <option value="bullet">글머리 기호</option>
                      <option selected>목록 없음</option>
                    </select>
                    <!-- 행간·자간 팝오버 (ql- 클래스가 없으므로 Quill이 건드리지 않는 일반 버튼).
                         mousedown 기본동작을 막아 에디터 선택 영역이 유지되도록 한다. -->
                    <button
                      type="button"
                      class="rte-tb-btn"
                      :class="{ 'is-active': spacingPopover.visible && spacingPopover.key === prop.key }"
                      title="행간 · 자간"
                      @mousedown.prevent
                      @click="toggleSpacingPopover(prop.key, $event)"
                    >
                      <span class="material-symbols-outlined">format_line_spacing</span>
                    </button>
                  </span>
                </div>
                <!-- 2줄: 글자색·배경색·형광펜 │ 링크·서식 제거 -->
                <div class="rte-tb-row">
                  <span class="ql-formats rte-tb-grp">
                    <!-- 글자색·배경색: Quill 기본 스와치 드롭다운 대신 공용 color-popover(포인트 색상·기본 팔레트·HEX·불투명도)를 연다.
                         트리거는 아이콘 버튼(#trigger 슬롯), 선택 색상은 그 에디터의 선택 영역(Quill)에 적용한다.
                         @mousedown.prevent로 에디터 선택 영역을 유지한다. -->
                    <ColorPopoverPicker
                      title="글자 색상"
                      :modelValue="editorColorModel(prop.key, 'color')"
                      :pointColors="wrapPointColors"
                      pointFollow
                      :activeIndex="editorColorActiveIndex(prop.key, 'color')"
                      @open="onEditorColorOpen(prop.key, 'color')"
                      @update:modelValue="onEditorColorInput(prop.key, 'color', $event)"
                      @select-point="onEditorColorSelectPoint(prop.key, 'color', $event)"
                      @add-point-color="editorStore.addPointColor($event)"
                      @remove-point-color="editorStore.removePointColor($event)"
                    >
                      <template #trigger>
                        <button type="button" class="rte-tb-btn" title="글자 색상" @mousedown.prevent>
                          <span class="material-symbols-outlined">format_color_text</span>
                        </button>
                      </template>
                    </ColorPopoverPicker>
                    <ColorPopoverPicker
                      title="배경 색상"
                      :modelValue="editorColorModel(prop.key, 'background')"
                      :pointColors="wrapPointColors"
                      pointFollow
                      :activeIndex="editorColorActiveIndex(prop.key, 'background')"
                      @open="onEditorColorOpen(prop.key, 'background')"
                      @update:modelValue="onEditorColorInput(prop.key, 'background', $event)"
                      @select-point="onEditorColorSelectPoint(prop.key, 'background', $event)"
                      @add-point-color="editorStore.addPointColor($event)"
                      @remove-point-color="editorStore.removePointColor($event)"
                    >
                      <template #trigger>
                        <button type="button" class="rte-tb-btn" title="배경 색상" @mousedown.prevent>
                          <span class="material-symbols-outlined">format_color_fill</span>
                        </button>
                      </template>
                    </ColorPopoverPicker>
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
                  <span class="rte-tb-div"></span>
                  <span class="ql-formats rte-tb-grp">
                    <button class="ql-link" title="링크"></button>
                    <button class="ql-clean" title="서식 제거"></button>
                  </span>
                </div>
              </template>
            </Editor>
          </div>

          <!-- URL 입력 -->
          <div v-else-if="prop.type === 'url'" class="space-y-2 gg-text-input">
            <InputText
              :modelValue="String(selectedModule.properties[prop.key] || '')"
              @update:modelValue="updateProperty(prop.key, $event ?? '')"
              :placeholder="prop.placeholder || 'https://example.com'"
              class="w-full"
            />
            <p v-if="prop.hint" class="hint-text" v-html="prop.hint"></p>
          </div>

          <!-- 테두리 스타일 — 전체 스타일(GlobalStylePanel)과 동일한 통합 블록(토글/라디오/색상/두께) -->
          <div v-else-if="isBorderStyleStart(prop)" class="gg-border-block">
            <!-- 헤더: 'none' 옵션이 있으면 on/off 토글, 없으면 라벨만.
                 단, 섹션 헤더로 토글을 끌어올린 경우(groupBorderToggleProp)는 블록 내부 토글 행을 생략한다. -->
            <div
              v-if="borderHasNone(prop) && groupBorderToggleProp(group) !== prop"
              class="gg-color-row"
            >
              <!-- 그룹명과 같으면 이름을 한 번만 — 빈 span으로 자리만 유지해 토글은 우측 정렬 -->
              <span class="gg-field-label !mb-0">{{ isDupLabelProp(group, prop) ? '' : prop.label }}</span>
              <ToggleSwitch :modelValue="borderIsOn(prop)" @update:modelValue="toggleBorderOn(prop, $event)" />
            </div>
            <span v-else-if="!isDupLabelProp(group, prop) && prop.label" class="gg-field-label">{{ prop.label }}</span>

            <!-- 섹션 헤더 스위치가 이 블록의 on/off를 담당하면, 꺼져 있어도 내용은 그대로 보여준다
                 (아코디언을 열었을 때 빈 카드가 되지 않도록. 조작은 .gg-acc-fields.is-disabled가 막는다) -->
            <template v-if="borderIsOn(prop) || groupBorderToggleProp(group) === prop">
              <!-- 스타일 라디오 -->
              <div class="flex flex-col gap-[10px]">
                <span class="gg-sub-label">스타일</span>
                <div class="flex flex-col gap-[14px]">
                  <label v-for="opt in borderStyleOptionsFor(prop)" :key="opt.value" class="ui-radio-row">
                    <span
                      class="ui-radio-dot"
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

          <!-- 정렬: 좌측/중앙/우측 세그먼트 (Figma 686-3949) — left/center/right 옵션 select 대체.
               최대 너비가 100%(전체 폭)면 정렬이 의미 없으므로 비활성화하고, 100% 미만이면 활성화한다. -->
          <div v-else-if="isAlignSegment(prop)">
            <div class="align-seg" :class="{ 'is-disabled': alignDisabledByFullWidth }">
              <button
                v-for="opt in ALIGN_SEG"
                :key="opt.value"
                type="button"
                class="align-seg-btn"
                :class="{ 'is-active': alignValueOf(prop) === opt.value }"
                :disabled="alignDisabledByFullWidth"
                @click="onAlignSegmentPick(prop, opt.value)"
              >
                <span class="material-symbols-outlined">{{ opt.icon }}</span>
                {{ opt.label }}
              </button>
            </div>
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

          <!-- 체크박스(ToggleSwitch) — 토글 온/오프로 하위 필드(showWhen)를 바로 노출/숨김
               (아코디언 화살표 없이 토글이 곧바로 하위 속성을 제어한다) -->
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
          <!-- 연락처(H·T·E·F) — 구성 요소 리스트와 같은 방식: 체크로 넣고 빼고, 손잡이를 끌어 순서 변경 -->
          <div v-else-if="prop.type === 'contact-items'" class="cmp-list">
            <draggable
              :model-value="getContactItems(prop.key)"
              item-key="key"
              handle=".cmp-drag"
              ghost-class="cmp-row--ghost"
              animation="180"
              class="cmp-list"
              @update:model-value="setContactItems(prop.key, $event)"
            >
              <template #item="{ element: item, index }">
                <div class="cmp-row ct-row">
                  <span
                    class="cmp-drag material-symbols-outlined"
                    title="마우스로 끌어서 순서를 변경하세요"
                    >drag_indicator</span
                  >
                  <label class="ct-check">
                    <Checkbox
                      :modelValue="item.show"
                      :binary="true"
                      @update:modelValue="setContactShow(prop.key, index, $event)"
                    />
                    <span class="cmp-label">{{ contactMeta[item.key]?.prefix }} {{ contactMeta[item.key]?.label }}</span>
                  </label>
                  <InputText
                    :modelValue="item.value"
                    @update:modelValue="setContactValue(prop.key, index, $event ?? '')"
                    :placeholder="contactMeta[item.key]?.placeholder"
                    class="ct-input"
                    size="small"
                  />
                </div>
              </template>
            </draggable>
            <p v-if="prop.hint" class="hint-text" v-html="prop.hint"></p>
          </div>

          <!-- SNS 아이콘 — 연락처와 같은 리스트(체크로 노출, 손잡이를 끌어 순서 변경, 옆에 링크 입력) -->
          <div v-else-if="prop.type === 'sns-icons'" class="cmp-list">
            <draggable
              :model-value="getSnsIcons(prop.key)"
              item-key="key"
              handle=".cmp-drag"
              ghost-class="cmp-row--ghost"
              animation="180"
              class="cmp-list"
              @update:model-value="setSnsIcons(prop.key, $event)"
            >
              <template #item="{ element: icon, index }">
                <div class="cmp-row ct-row">
                  <span
                    class="cmp-drag material-symbols-outlined"
                    title="마우스로 끌어서 순서를 변경하세요"
                    >drag_indicator</span
                  >
                  <label class="ct-check sns-check">
                    <Checkbox
                      :modelValue="icon.show"
                      :binary="true"
                      @update:modelValue="setSnsIconShow(prop.key, index, $event)"
                    />
                    <img
                      :src="snsIconMeta[icon.key]?.img"
                      :alt="snsIconMeta[icon.key]?.label"
                      class="sns-thumb"
                    />
                    <span class="cmp-label sns-label" :title="snsIconMeta[icon.key]?.label || icon.key">
                      {{ snsIconMeta[icon.key]?.label || icon.key }}
                    </span>
                  </label>
                  <InputText
                    :modelValue="icon.url"
                    @update:modelValue="setSnsIconUrl(prop.key, index, $event ?? '')"
                    placeholder="https://"
                    class="ct-input"
                    size="small"
                  />
                </div>
              </template>
            </draggable>
            <p v-if="prop.hint" class="hint-text" v-html="prop.hint"></p>
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

          <!-- 커스텀 테이블 편집기 (Figma 686-4239): 캔버스 셀 선택 → 내용 편집 -->
          <div v-else-if="prop.type === 'table-editor'" class="tbl-content">
            <template v-if="tableCells.length > 0">
              <!-- 행/열 툴바 -->
              <!-- 선택 없음: 빈 안내 -->
              <div v-if="tableSelectedCells.length === 0" class="tbl-empty">
                <span class="material-symbols-outlined tbl-empty-icon">border_all</span>
                <p class="tbl-empty-text">셀을 클릭하면<br />내용을 편집하실 수 있어요</p>
              </div>

              <!-- 선택 있음: 셀 편집 -->
              <div v-else class="tbl-cell-edit">
                <!-- 선택 셀 라벨 pill -->
                <div class="tbl-cellbar">
                  <span class="tbl-cellchip">
                    {{ tableSelectedCells.length === 1
                      ? `${(firstSelCoord?.row ?? 0) + 1}행 ${(firstSelCoord?.col ?? 0) + 1}열`
                      : `${tableSelectedCells.length}개 셀 선택됨` }}
                  </span>
                  <div class="tbl-cellbar-actions">
                    <!-- 개별 스타일(셀 배경색·정렬)은 내용 툴바에서 지정한다 → 되돌리기만 여기 남긴다 -->
                    <button
                      v-if="hasSelOwnStyle"
                      type="button"
                      class="tbl-colw-reset"
                      @click="resetSelOwnStyle"
                      v-tooltip.top="'셀 배경색·정렬을 테이블 공통값으로 되돌리기'"
                    >공통값으로</button>
                    <button
                      v-if="canUnmergeSelection"
                      type="button"
                      class="tbl-icbtn"
                      @click="unmergeSelection"
                      v-tooltip.top="'병합 해제'"
                    >
                      <span class="material-symbols-outlined">splitscreen</span>
                    </button>
                  </div>
                </div>

                <!-- 콘텐츠 타입 (텍스트 / 이미지) -->
                <div class="gg-field">
                  <label class="tbl-sec-label">콘텐츠 타입</label>
                  <div class="tbl-ctype">
                    <button type="button" class="tbl-ctype-btn" :class="{ 'is-active': selContentType === 'text' }" @click="setSelContentType('text')">
                      <span class="material-symbols-outlined">match_case</span>텍스트
                    </button>
                    <button type="button" class="tbl-ctype-btn" :class="{ 'is-active': selContentType === 'image' }" @click="setSelContentType('image')">
                      <span class="material-symbols-outlined">image</span>이미지
                    </button>
                  </div>
                </div>

                <!-- ── 텍스트 타입 ── -->
                <template v-if="selContentType === 'text'">
                  <div class="tbl-divider"></div>
                  <!-- 제목 지정 (th/td) -->
                  <div class="gg-field">
                    <div class="tbl-toggle-row">
                      <label class="tbl-sec-label">제목 지정</label>
                      <ToggleSwitch :modelValue="selCommonType === 'th'" @update:modelValue="onHeaderToggle($event)" />
                    </div>
                    <p class="hint-text">*OFF시, 내용으로 전환돼요</p>
                  </div>

                  <div class="tbl-divider"></div>
                  <!-- 내용 (단일 선택만 편집) — 텍스트 모듈과 동일한 Quill 리치 에디터 -->
                  <div class="gg-field">
                    <label class="tbl-sec-label">내용</label>
                    <div v-if="tableSelectedCells.length === 1 && firstSelCell" class="rte-field">
                      <Editor
                        :model-value="firstSelCell.content"
                        @update:model-value="updateSelCellContent($event)"
                        @load="(e) => onEditorLoad(e, TABLE_CELL_KEY)"
                        placeholder="내용을 입력하세요"
                      >
                        <template #toolbar>
                          <!-- 테이블 셀 에디터는 목록·행간/자간 제외 (텍스트 모듈 에디터와 다름).
                               정렬·배경색은 Quill 서식이 아니라 '셀' 속성에 적용한다 —
                               td의 text-align/background 로 나가야 이메일에서 셀 전체가 채워진다. -->
                          <!-- 1줄: 굵게·기울임·밑줄·취소선 │ 셀 정렬 -->
                          <div class="rte-tb-row">
                            <span class="ql-formats rte-tb-grp">
                              <button class="ql-bold" title="굵게"></button>
                              <button class="ql-italic" title="기울임"></button>
                              <button class="ql-underline" title="밑줄"></button>
                              <button class="ql-strike" title="취소선"></button>
                            </span>
                            <span class="rte-tb-div"></span>
                            <span class="rte-tb-grp">
                              <!-- 정렬 드롭다운 (텍스트 모듈 툴바의 정렬 픽커와 같은 모양) -->
                              <button
                                type="button"
                                class="rte-tb-btn rte-tb-btn--caret"
                                :class="{ 'is-active': cellAlignMenu.visible }"
                                title="셀 정렬"
                                @mousedown.prevent
                                @click="toggleCellAlignMenu($event)"
                              >
                                <span class="material-symbols-outlined">{{ ALIGN_ICON[selCommonAlign || 'left'] }}</span>
                                <span class="material-symbols-outlined rte-tb-caret">expand_more</span>
                              </button>
                            </span>
                          </div>
                          <!-- 2줄: 글자색·배경색·형광펜 │ 링크·서식 제거 -->
                          <div class="rte-tb-row">
                            <span class="ql-formats rte-tb-grp">
                              <ColorPopoverPicker
                                title="글자 색상"
                                :modelValue="editorColorModel(TABLE_CELL_KEY, 'color')"
                                :pointColors="wrapPointColors"
                                pointFollow
                                :activeIndex="editorColorActiveIndex(TABLE_CELL_KEY, 'color')"
                                @open="onEditorColorOpen(TABLE_CELL_KEY, 'color')"
                                @update:modelValue="onEditorColorInput(TABLE_CELL_KEY, 'color', $event)"
                                @select-point="onEditorColorSelectPoint(TABLE_CELL_KEY, 'color', $event)"
                                @add-point-color="editorStore.addPointColor($event)"
                                @remove-point-color="editorStore.removePointColor($event)"
                              >
                                <template #trigger>
                                  <button type="button" class="rte-tb-btn" title="글자 색상" @mousedown.prevent>
                                    <span class="material-symbols-outlined">format_color_text</span>
                                  </button>
                                </template>
                              </ColorPopoverPicker>
                              <!-- 배경색은 글자 뒤가 아니라 '셀'을 채운다 — 글자 뒤만 칠하려면 형광펜을 쓴다.
                                   포인트 색상은 '추종'(pointFollow)이 아니라 색을 그대로 찍는다 —
                                   셀에는 어느 포인트를 따르는지 저장할 자리가 없어, 추종 모드면 스와치를 눌러도
                                   부모가 받아 처리할 게 없어 아무 일도 일어나지 않는다. -->
                              <ColorPopoverPicker
                                title="셀 배경색"
                                :modelValue="selEffectiveBg"
                                :pointColors="wrapPointColors"
                                @update:modelValue="setSelBgColor($event)"
                                @add-point-color="editorStore.addPointColor($event)"
                                @remove-point-color="editorStore.removePointColor($event)"
                              >
                                <template #trigger>
                                  <button type="button" class="rte-tb-btn" title="셀 배경색" @mousedown.prevent>
                                    <span class="material-symbols-outlined">format_color_fill</span>
                                  </button>
                                </template>
                              </ColorPopoverPicker>
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
                            <span class="rte-tb-div"></span>
                            <span class="ql-formats rte-tb-grp">
                              <button class="ql-link" title="링크"></button>
                              <button class="ql-clean" title="서식 제거"></button>
                            </span>
                          </div>
                        </template>
                      </Editor>
                    </div>
                    <p v-else class="tbl-multi-hint">여러 셀이 선택됐어요. 내용은 셀 하나만 선택해 편집하세요.</p>
                    <p class="hint-text">*셀 배경색·정렬은 지정하기 전까지 테이블 공통값을 따라요.</p>
                  </div>
                </template>

                <!-- ── 이미지 타입 ── -->
                <template v-else>
                  <div class="tbl-divider"></div>
                  <div class="gg-field">
                    <label class="tbl-sec-label">이미지 파일</label>
                    <div class="gg-text-input space-y-2">
                      <label class="gg-field-label">이미지 파일 URL</label>
                      <InputText
                        :modelValue="selImageUrl"
                        @update:modelValue="setSelImageUrl"
                        placeholder="https://..."
                      />
                    </div>
                    <div class="gg-text-input space-y-2 !mt-3">
                      <label class="gg-field-label">이미지 설명</label>
                      <InputText
                        :modelValue="selImageAlt"
                        @update:modelValue="setSelImageAlt"
                        placeholder="이미지를 설명하는 문구"
                      />
                    </div>
                    <p class="hint-text">*검색 엔진과 스크린 리더를 위한 한 줄 설명이에요.</p>
                  </div>

                  <!-- 링크 추가 (이미지 모듈의 링크 섹션과 동일) -->
                  <div class="tbl-divider"></div>
                  <div class="gg-field">
                    <div class="tbl-toggle-row">
                      <label class="tbl-sec-label">링크 추가</label>
                      <ToggleSwitch :modelValue="selImageLinkOn" @update:modelValue="onImageLinkToggle" />
                    </div>
                    <div v-if="selImageLinkOn" class="gg-text-input space-y-2">
                      <label class="gg-field-label">링크 URL</label>
                      <InputText
                        :modelValue="selImageLink"
                        @update:modelValue="setSelImageLink"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </template>
              </div>
            </template>

            <!-- 테이블이 비어있을 때 -->
            <div v-else class="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <i class="pi pi-table text-3xl text-gray-300 mb-3 block"></i>
              <div class="text-gray-500 mb-4">테이블이 비어있습니다</div>
              <Button @click="initializeDefaultTable" label="기본 2열 표 생성" icon="pi pi-plus" severity="primary" size="small" />
            </div>
          </div>
        </div>
        </div>
        </div>
        </div>
      </div>
      </div>

  <!-- 셀 정렬 드롭다운 (테이블 셀 툴바) — 텍스트 모듈 정렬 픽커와 같은 가로 아이콘 메뉴.
       패널이 스크롤되므로 위치는 버튼 기준 fixed 좌표로 잡는다(행간·자간 팝오버와 동일). -->
  <Teleport to="body">
    <div
      v-if="cellAlignMenu.visible"
      ref="cellAlignMenuEl"
      class="rte-align-menu"
      :style="{ top: `${cellAlignMenu.top}px`, left: `${cellAlignMenu.left}px` }"
    >
      <button
        v-for="a in ALIGN_KEYS"
        :key="a"
        type="button"
        class="rte-align-item"
        :class="{ 'is-selected': selCommonAlign === a }"
        :title="ALIGN_LABEL[a]"
        @mousedown.prevent
        @click="pickSelAlign(a)"
      >
        <span class="material-symbols-outlined">{{ ALIGN_ICON[a] }}</span>
      </button>
    </div>
  </Teleport>

  <!-- 행간 · 자간 팝오버 (Figma 640-3235: 툴바의 format_line_spacing) -->
  <Teleport to="body">
    <div
      v-if="spacingPopover.visible"
      ref="spacingPopoverEl"
      class="rte-spacing-popover"
      :style="{ top: `${spacingPopover.top}px`, left: `${spacingPopover.left}px` }"
    >
      <!-- 행간 (문단 단위) -->
      <div class="rte-sp-section">
        <div class="rte-sp-head">
          <span class="material-symbols-outlined rte-sp-icon">format_line_spacing</span>
          <span class="rte-sp-label">행간</span>
        </div>
        <div class="rte-sp-row">
          <input
            type="range"
            class="gg-margin-slider"
            :min="LINE_HEIGHT_MIN"
            :max="LINE_HEIGHT_MAX"
            :step="LINE_HEIGHT_STEP"
            :value="lineHeightNumber"
            @input="onLineHeightSlide($event)"
          />
          <div class="rte-sp-value" :class="{ 'is-unset': !isLineHeightSet }">
            <input
              type="number"
              :min="LINE_HEIGHT_MIN"
              :max="LINE_HEIGHT_MAX"
              :step="LINE_HEIGHT_STEP"
              :value="lineHeightNumber"
              @change="onLineHeightSlide($event)"
              @keydown.enter="blurTarget"
            />
          </div>
        </div>
      </div>

      <!-- 자간 (선택 범위 단위) -->
      <div class="rte-sp-section">
        <div class="rte-sp-head">
          <span class="material-symbols-outlined rte-sp-icon">format_letter_spacing_2</span>
          <span class="rte-sp-label">자간</span>
        </div>
        <div class="rte-sp-row">
          <input
            type="range"
            class="gg-margin-slider"
            :min="LETTER_SPACING_MIN"
            :max="LETTER_SPACING_MAX"
            :step="LETTER_SPACING_STEP"
            :value="letterSpacingNumber"
            @input="onLetterSpacingSlide($event)"
          />
          <div class="rte-sp-value" :class="{ 'is-unset': !isLetterSpacingSet }">
            <input
              type="number"
              :min="LETTER_SPACING_MIN"
              :max="LETTER_SPACING_MAX"
              :step="LETTER_SPACING_STEP"
              :value="letterSpacingNumber"
              @change="onLetterSpacingSlide($event)"
              @keydown.enter="blurTarget"
            />
          </div>
        </div>
      </div>

      <!-- 줄바꿈 규칙 (문단 단위) — 툴바에 홀로 남던 드롭다운을 같은 '텍스트 흐름' 팝오버로 합침 -->
      <div class="rte-sp-section">
        <div class="rte-sp-head">
          <span class="material-symbols-outlined rte-sp-icon">wrap_text</span>
          <span class="rte-sp-label">줄바꿈</span>
        </div>
        <div class="rte-sp-seg">
          <button
            v-for="opt in WORD_BREAK_SEG"
            :key="opt.value ?? 'default'"
            type="button"
            class="rte-sp-seg-btn"
            :class="{ 'is-active': currentWordBreak === opt.value }"
            @click="applyWordBreak(spacingPopover.key, opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

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
import { resolveGroupRows, MAX_COLUMNS } from '@/utils/groupLayout'
import { SNS_ICON_META, defaultSnsIcons, type SnsIconItem } from '@/constants/snsIcons'
import {
  CONTACT_ITEM_META,
  readContactItems,
  type ContactItem,
  type ContactItemKey,
} from '@/constants/contactItems'
import { useEditorStore } from '@/stores/editorStore'
import type { TableRow, ContentTitle, ContentText, AdditionalContent, TableCell, TableCellAlign, EditableProp, BorderSide } from '@/types'
import { normalizeColorInput, isValidHexColor } from '@/utils/colorHelper'
import { normalizePxLength } from '@/utils/cssUnit'
import {
  LINE_HEIGHT_MIN,
  LINE_HEIGHT_MAX,
  LINE_HEIGHT_STEP,
  LINE_HEIGHT_FALLBACK,
  toLineHeightValue,
  parseLineHeight,
} from '@/utils/quillLineHeight'
import {
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
  toFontSizeValue,
  parseFontSize,
} from '@/utils/quillFontSize'
import {
  LETTER_SPACING_MIN,
  LETTER_SPACING_MAX,
  LETTER_SPACING_STEP,
  LETTER_SPACING_FALLBACK,
  toLetterSpacingValue,
  parseLetterSpacing,
} from '@/utils/quillLetterSpacing'
import { POINT_COLOR_SUFFIX, POINT_COLOR_INDEX_SUFFIX, POINT_COLOR_CSS_VAR, pointColorCssVar, getPointColorIndex, pointColorAt } from '@/utils/pointColor'
import { processQuillHtml } from '@/utils/quillHtmlProcessor'
import TableCellEditor from './TableCellEditor.vue'
import ColorAlphaPicker from '@/components/ColorAlphaPicker.vue'
import HexColorInput from '@/components/HexColorInput.vue'
import PointColorSwatchRow from '@/components/PointColorSwatchRow.vue'
import ColorPopoverPicker from './ColorPopoverPicker.vue'
import BorderSideSelector from './BorderSideSelector.vue'
import draggable from 'vuedraggable'
import { parseBorderSides, serializeBorderSides } from '@/utils/borderSides'
import type Quill from 'quill'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()

const selectedModule = computed(() => moduleStore.selectedModule)
const selectedModuleMetadata = computed(() => moduleStore.selectedModuleMetadata)
const editableProps = computed(() => selectedModuleMetadata.value?.editableProps || [])

// 모듈 '종류' 라벨 — 첫 gg-acc-section 헤더에 노출한다(예: 텍스트/이미지/구분선/버튼).
// 대부분 카테고리 기준이지만, 카테고리가 'common'인 모듈(구분선·SNS)은 개별 지정한다.
const CATEGORY_TYPE_LABELS: Record<string, string> = {
  image: '이미지',
  text: '텍스트',
  button: '버튼',
  table: '테이블',
  header: '헤더',
  divider: '구분선',
  social: 'SNS',
  common: '모듈',
}
const TYPE_LABEL_BY_ID: Record<string, string> = {
  ModuleDivider: '구분선',
  ModuleSnsIcons: 'SNS',
}
// 선택 모듈의 종류 라벨(첫 섹션 헤더용)
const typeLabel = computed<string | null>(() => {
  const meta = selectedModuleMetadata.value
  if (!meta) return null
  return TYPE_LABEL_BY_ID[meta.id] ?? CATEGORY_TYPE_LABELS[meta.category] ?? '모듈'
})

// 패널 상단 제목 — 항상 '선택한 모듈'의 이름.
// 그룹 안에 있어도 그룹 이름으로 덮지 않는다. 이 패널이 편집하는 대상은 모듈이고,
// 그룹 이름은 캔버스 그룹 툴바와 그룹 스타일 패널에서 따로 보인다.
// 인스턴스에 붙은 표시 라벨(__moduleLabel)이 있으면 그걸, 없으면 모듈 카드 이름을 쓴다.
const panelTitle = computed(() => {
  // 컬럼을 나눈 직후에는 이 패널이 다루는 대상이 모듈이 아니라 '행의 컬럼'이다 (Figma 926-8769)
  if (isColumnSetupMode.value) return `${moduleColumnInfo.value.columns}단 컬럼`
  const meta = selectedModuleMetadata.value
  if (!meta) return ''
  // 테이블은 Figma 686-4239대로 '테이블'로 표기
  if (meta.id === 'ModuleTable') return '테이블'
  const custom = selectedModule.value?.properties?.__moduleLabel
  return (typeof custom === 'string' ? custom : '') || meta.name
})

// 섹션 헤더 라벨 — 첫 섹션(gIdx 0)은 모듈 종류 라벨로 대체한다.
// 단, 첫 섹션이 자체 on/off 토글을 가진 이름 섹션(예: 라벨·링크)이면 그 이름을 그대로 쓴다
// (핵심 '내용' 섹션만 종류 라벨로 바꾸고, 의미 있는 토글 섹션 이름은 보존).
const sectionHeaderLabel = (group: PropGroup, gIdx: number): string =>
  gIdx === 0 && !groupHasHeaderToggle(group)
    ? (typeLabel.value ?? group.name ?? '')
    : (group.name ?? '')

// ===== 영역 컬럼 분할 =====
// 선택 모듈이 속한 그룹의 컬럼 수와, 그 안에서의 컬럼 위치(0-based)
const moduleColumnInfo = computed(() => {
  const mod = selectedModule.value
  const fallback = { columns: 1, columnIndex: 0, rowIndex: 0, rowCount: 1, hasEmptyColumn: false }
  if (!mod?.groupId) return fallback
  const group = moduleStore.groups.find((g) => g.id === mod.groupId)
  if (!group) return fallback
  const members = moduleStore.modules
    .filter((m) => m.groupId === group.id)
    .sort((a, b) => a.order - b.order)
  const res = resolveGroupRows(group, members)
  const r = res.rowIndexById[mod.id] ?? 0
  const columns = res.rowCols[r] ?? 1
  // 이 행에서 실제로 콘텐츠가 들어간 컬럼들 — 하나라도 비어 있으면 '나누는 중'인 상태
  const usedColumns = new Set<number>()
  members.forEach((m) => {
    if ((res.rowIndexById[m.id] ?? 0) === r) usedColumns.add(res.colIndexById[m.id] ?? 0)
  })
  return {
    columns,
    columnIndex: res.colIndexById[mod.id] ?? 0,
    rowIndex: r,
    rowCount: res.rowCols.length,
    hasEmptyColumn: usedColumns.size < columns,
  }
})

/**
 * 레이아웃(단 나누기 · 너비 조정) 섹션 노출 규칙 — Figma 926-8769 vs 977-10559.
 * · 1단 모듈: 나눌 수 있도록 세그먼트를 보여준다.
 * · 2단인데 아직 빈 컬럼이 있음: 나눈 직후 조정 단계 → 세그먼트 + 너비 조정을 보여준다.
 * · 2단이 다 채워짐: 레이아웃 조작을 감추고 그 모듈의 내용 편집만 남긴다.
 */
const showLayoutSection = computed(() =>
  moduleColumnInfo.value.columns > 1
    ? moduleColumnInfo.value.hasEmptyColumn
    : maxColumns.value > 1,
)

/**
 * 컬럼을 나눈 직후(빈 컬럼이 남은 2단) — 이때 패널은 '직접 구성' 패널처럼
 * 단·너비만 남기고 그 모듈의 속성 편집은 감춘다(Figma 926-8769: 패널에 레이아웃·너비만 있음).
 * 빈 컬럼이 채워지면 곧바로 평소의 속성 폼으로 돌아온다.
 */
const isColumnSetupMode = computed(
  () => moduleColumnInfo.value.columns > 1 && moduleColumnInfo.value.hasEmptyColumn,
)

// '모바일에서도 가로 유지'는 두 컬럼이 다 채워진 뒤에야 의미가 있다 —
// 나누는 중에는 레이아웃·너비만 남기고(위 주석), 채워진 뒤 속성 폼과 함께 노출한다.
const showKeepInlineToggle = computed(
  () => moduleColumnInfo.value.columns > 1 && !isColumnSetupMode.value,
)

// 이 모듈이 나눌 수 있는 최대 컬럼 수 — config의 maxColumns, 없으면 전역 MAX_COLUMNS.
// config 값이 전역 상한을 넘지 않도록 함께 클램프한다.
// 테이블은 컬럼 분할 대상이 아니므로 1(디자인 686-4239에 컬럼 세그먼트 없음).
const maxColumns = computed(() => {
  if (selectedModuleMetadata.value?.id === 'ModuleTable') return 1
  return Math.min(selectedModuleMetadata.value?.maxColumns ?? MAX_COLUMNS, MAX_COLUMNS)
})

// 빈 컬럼 채우기는 '직접 구성' 패널(ColumnComposePanel)의 모듈 목록이 담당한다 —
// 거기서 고른 모듈이 그 컬럼에 들어오면 여기(ModuleForm)에는 그 모듈의 속성만 보인다.

// 1단/2단/3단 세그먼트: 현재 컬럼 수에서 목표 n단까지 split(+1)/unsplit(-1) 반복.
// (split/unsplit이 적용된 컬럼 수를 반환하므로 반응성 타이밍과 무관하게 반복 판단)
const setColumnsTo = (n: number) => {
  if (!selectedModule.value) return
  const id = selectedModule.value.id
  n = Math.min(n, maxColumns.value)
  let cur = moduleColumnInfo.value.columns
  let guard = 0
  while (cur < n && guard++ < 6) {
    const r = moduleStore.splitModuleColumns(id)
    if (r == null || r === cur) break
    cur = r
  }
  while (cur > n && guard++ < 6) {
    const r = moduleStore.unsplitModuleColumns(id)
    if (r == null || r === cur) break
    cur = r
  }
}
// ===== 너비 조정 — 기준은 '첫 번째 열'(두 번째 열은 100-첫번째로 자동) =====
// 추천 비율 프리셋(Figma 977-7684): 왼쪽 열이 가질 %만 담는다.
const WIDTH_PRESETS = [50, 60, 40, 80, 20] as const
const widthTab = ref<'preset' | 'custom'>('preset')

const firstColumnWidth = computed<number>(() => {
  const gid = selectedModule.value?.groupId
  if (!gid) return Math.round(100 / Math.max(moduleColumnInfo.value.columns, 1))
  return moduleStore.columnWidthOf(gid, moduleColumnInfo.value.rowIndex, 0)
})
const setFirstColumnWidth = (pct: number) => {
  const gid = selectedModule.value?.groupId
  if (!gid) return
  // setColumnWidth가 나머지 폭을 다른 컬럼에 분배한다(2단이면 정확히 100-pct)
  moduleStore.setColumnWidth(gid, moduleColumnInfo.value.rowIndex, 0, pct)
}
const onFirstColumnWidthInput = (event: Event) => {
  const n = Number.parseInt((event.target as HTMLInputElement).value, 10)
  if (Number.isFinite(n)) setFirstColumnWidth(n)
}

// ===== 모바일에서도 가로 유지 — 이 모듈이 속한 '행' 단위 설정 =====
const rowKeepInlineOn = computed<boolean>(() => {
  const gid = selectedModule.value?.groupId
  if (!gid) return false
  return moduleStore.rowKeepsInline(gid, moduleColumnInfo.value.rowIndex)
})
const onRowKeepInlineToggle = (on: boolean) => {
  const gid = selectedModule.value?.groupId
  if (!gid) return
  moduleStore.setRowKeepInline(gid, moduleColumnInfo.value.rowIndex, on)
}

// 아코디언 그룹화:
// - group이 하나도 없으면 단일 평면 그룹(기존 flat 모듈 그대로).
// - 일부라도 group이 있으면 group 없는 prop은 null 그룹(상단 상시 노출용)으로, 나머지는 이름별 섹션으로 묶는다.
//   (예: 이미지 모듈 = 이미지 URL/설명은 상단 상시, 크기/링크/모서리/테두리/여백은 접이식 섹션)
// 리치텍스트(textarea) 바로 앞에 그 텍스트의 '폰트 크기' 필드를 올린다 — Figma 640-3235:
// 폰트 크기 슬라이더 → 서식 툴바 → 텍스트 입력 순서. (설정 파일은 그대로 두고 표시 순서만 바꾼다)
// 짝짓기: `${textareaKey}FontSize` 키 우선, 없으면 그룹에 textarea·폰트크기가 하나씩일 때만 그 둘을 짝으로 본다.
const hoistFontSizeBeforeTextarea = (props: EditableProp[]): EditableProp[] => {
  const textareas = props.filter((p) => p.type === 'textarea')
  if (!textareas.length) return props
  const fontSizes = props.filter(isFontSizeField)
  if (!fontSizes.length) return props

  const result = [...props]
  for (const ta of textareas) {
    const exact = fontSizes.find((p) => p.key.toLowerCase() === `${ta.key}fontsize`.toLowerCase())
    const partner =
      exact ?? (textareas.length === 1 && fontSizes.length === 1 ? fontSizes[0] : undefined)
    if (!partner) continue
    const from = result.indexOf(partner)
    const to = result.indexOf(ta)
    if (from === -1 || to === -1 || from < to) continue // 이미 앞에 있으면 그대로
    result.splice(from, 1)
    result.splice(result.indexOf(ta), 0, partner)
  }
  return result
}

const propGroups = computed(() => {
  const props = editableProps.value
  if (!props.length) return [{ name: null as string | null, props: [] as typeof props }]
  const anyGrouped = props.some((p) => !!p.group)
  if (!anyGrouped) {
    return [{ name: null as string | null, props: hoistFontSizeBeforeTextarea(props) }]
  }
  const order: (string | null)[] = []
  const map = new Map<string | null, typeof props>()
  for (const p of props) {
    const g = (p.group ?? null) as string | null
    if (!map.has(g)) {
      map.set(g, [])
      order.push(g)
    }
    map.get(g)!.push(p)
  }
  return order.map((name) => ({ name, props: hoistFontSizeBeforeTextarea(map.get(name)!) }))
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

// showWhen이 가리키는 트리거 key를 문자열/객체 두 형태 모두에서 추출
const showWhenKey = (prop: EditableProp): string | null => {
  const sw = prop.showWhen
  if (!sw) return null
  if (typeof sw === 'string') return sw
  if (typeof sw === 'object' && sw !== null && 'key' in sw) return (sw as { key: string }).key
  return null
}

/**
 * 필드 노출 여부.
 * 섹션 스위치(헤더로 끌어올린 on/off 속성)가 가리는 필드는 **숨기지 않고** 그대로 보여준다 —
 * 아코디언을 열면 꺼져 있어도 어떤 옵션이 있는지 보이고, 조작만 `.gg-acc-fields.is-disabled`가 막는다.
 */
const isFieldVisible = (group: PropGroup, prop: EditableProp): boolean => {
  const t = groupHeaderToggle(group)
  if (t && showWhenKey(prop) === t.key) return true
  return evalShowWhen(prop.showWhen)
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

// 그룹 판넬 펼침 상태 — 그룹명(또는 인덱스)별로 관리
const groupPanelExpanded = reactive<Record<string, boolean>>({})
const groupPanelKey = (group: PropGroup, index: number): string => group.name ?? `_flat_${index}`

/**
 * 모듈별로 '기본 펼침'인 섹션. 여기 없는 접이식 섹션은 닫힌 채로 시작한다.
 * (언어 선택 버튼은 버튼 1이 사실상 필수 입력이라 열어 둔다)
 */
const DEFAULT_OPEN_SECTIONS: Record<string, string[]> = {
  TopLanguageButton: ['버튼 1'],
}

// 사용자가 한 번이라도 열고/접었으면 그 상태를, 아니면 위 기본값을 따른다.
const isGroupPanelExpanded = (group: PropGroup, index: number): boolean => {
  const remembered = groupPanelExpanded[groupPanelKey(group, index)]
  if (remembered !== undefined) return remembered
  const moduleId = selectedModuleMetadata.value?.id
  return !!(moduleId && group.name && DEFAULT_OPEN_SECTIONS[moduleId]?.includes(group.name))
}

const setGroupPanelExpanded = (group: PropGroup, index: number, open: boolean): void => {
  groupPanelExpanded[groupPanelKey(group, index)] = open
}

const toggleGroupPanel = (group: PropGroup, index: number): void => {
  setGroupPanelExpanded(group, index, !isGroupPanelExpanded(group, index))
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

// ===== 테이블 패널: 내용/스타일 탭 + 캔버스 셀 선택 편집 (Figma 686-4239) =====
const isTableModule = computed(() => selectedModule.value?.moduleId === 'ModuleTable')
const activeTableTab = ref<'content' | 'style'>('content')
// 테이블 셀 내용 Quill 에디터의 고정 키(한 번에 셀 하나만 편집하므로 단일 키 사용)
const TABLE_CELL_KEY = '__tblCellContent'
// 모듈이 바뀌면 탭을 '내용'으로 초기화 (셀 선택은 스토어 watcher가 해제)
watch(() => selectedModule.value?.id, () => { activeTableTab.value = 'content' })

// 탭에 따라 어떤 prop 그룹을 노출할지 — 내용 탭=테이블 편집기 그룹, 스타일 탭=나머지 스타일 그룹
const isGroupInActiveTab = (group: PropGroup): boolean => {
  if (!isTableModule.value) return true
  const isContentGroup = group.props.some((p) => p.type === 'table-editor')
  return activeTableTab.value === 'content' ? isContentGroup : !isContentGroup
}

// ── 행 열 관리 (스타일 탭) ──
// 행/열 [추가] 드롭다운 — 선택 셀 기준 위/아래(왼쪽/오른쪽) '사이 삽입' 또는 맨 끝 추가
const insertMenu = ref<'row' | 'col' | null>(null)
const toggleInsertMenu = (axis: 'row' | 'col') => {
  insertMenu.value = insertMenu.value === axis ? null : axis
}
const insertRow = (where: 'above' | 'below' | 'end') => {
  const id = selectedModule.value?.id
  if (!id) return
  const sel = firstSelCoord.value
  if (where === 'end' || !sel) moduleStore.addTableCellRow(id)
  else moduleStore.insertTableCellRow(id, where === 'above' ? sel.row : sel.row + 1)
  moduleStore.clearTableCellSelection() // 인덱스가 밀리므로 선택 해제
  insertMenu.value = null
}
const insertCol = (where: 'left' | 'right' | 'end') => {
  const id = selectedModule.value?.id
  if (!id) return
  const sel = firstSelCoord.value
  if (where === 'end' || !sel) moduleStore.addTableCellColumn(id)
  else moduleStore.insertTableCellColumn(id, where === 'left' ? sel.col : sel.col + 1)
  moduleStore.clearTableCellSelection()
  insertMenu.value = null
}
const deleteTableRow = () => {
  const id = selectedModule.value?.id
  if (!id) return
  if (tableSelectedCells.value.length) removeSelectedTableRows()
  else moduleStore.removeTableCellRow(id, tableCells.value.length - 1)
}
const deleteTableColumn = () => {
  const id = selectedModule.value?.id
  if (!id) return
  if (tableSelectedCells.value.length) removeSelectedTableCols()
  else moduleStore.removeTableCellColumn(id, (tableCells.value[0]?.length ?? 1) - 1)
}

// ── 열 너비 직접 설정 (토글 아코디언) ──
const tableColCount = computed(() => tableCells.value[0]?.length ?? 0)
// 열별 '수동 지정' 여부 — tableColWidths[i]가 비어있지 않으면 수동, 비면 자동
const colWidthManual = computed<boolean[]>(() => {
  const n = tableColCount.value
  const w = (selectedModule.value?.properties.tableColWidths as string[] | undefined) || []
  return Array.from({ length: n }, (_, i) => String(w[i] ?? '').trim() !== '')
})
// '직접 설정' ON — 명시적 토글 플래그 또는 수동 지정된 열이 하나라도 있으면(레거시 호환) ON
const colWidthOn = computed(
  () =>
    !!selectedModule.value?.properties.tableColWidthOn || colWidthManual.value.some(Boolean),
)
// 각 열의 표시 너비(%) — 수동 지정 열은 그 값, 자동 열은 (100 - 수동 합) / 자동 열 수
const colWidthValues = computed<number[]>(() => {
  const n = tableColCount.value
  if (n === 0) return []
  const w = (selectedModule.value?.properties.tableColWidths as string[] | undefined) || []
  const parsed = Array.from({ length: n }, (_, i) => {
    const num = parseFloat(String(w[i] ?? '').replace('%', ''))
    return Number.isFinite(num) && num > 0 ? num : null // null = 자동
  })
  const manualSum = parsed.reduce<number>((s, v) => s + (v ?? 0), 0)
  const autoCount = parsed.filter((v) => v === null).length
  const autoVal = autoCount > 0 ? Math.max(0, Math.round(((100 - manualSum) / autoCount) * 10) / 10) : 0
  return parsed.map((v) => (v === null ? autoVal : v))
})
// 전체 합(%) 및 100% 초과 여부
const colWidthTotal = computed(
  () => Math.round(colWidthValues.value.reduce((s, v) => s + v, 0) * 10) / 10,
)
const colWidthOverflow = computed(() => colWidthTotal.value > 100.05)

const onColWidthToggle = (on: boolean) => {
  updateProperty('tableColWidthOn', on)
  // OFF: 지정값 모두 지워 균등 자동으로 되돌린다
  if (!on) {
    const n = tableColCount.value
    for (let i = 0; i < n; i++) updateColWidth(i, '')
  }
}
// 특정 열을 편집 = 그 열만 '수동'으로 고정(나머지 자동 열은 콜그룹에서 남은 폭을 브라우저가 배분)
const onColWidthInput = (colIndex: number, e: Event) => {
  const raw = parseFloat((e.target as HTMLInputElement).value)
  if (!Number.isFinite(raw)) return
  const v = Math.min(95, Math.max(5, Math.round(raw * 10) / 10))
  updateColWidth(colIndex, `${v}%`)
}
// 열을 다시 '자동'으로
const resetColWidth = (colIndex: number) => updateColWidth(colIndex, '')

// 이 테이블에서 현재 선택된 셀 좌표들 (moduleId 일치 시)
const tableSelectedCells = computed<{ row: number; col: number }[]>(() => {
  const sel = moduleStore.tableCellSelection
  const id = selectedModule.value?.id
  return sel && id && sel.moduleId === id ? sel.cells : []
})
const firstSelCoord = computed(() => tableSelectedCells.value[0] ?? null)
const firstSelCell = computed<TableCell | null>(() => {
  const s = firstSelCoord.value
  return s ? (tableCells.value[s.row]?.[s.col] ?? null) : null
})
// 선택 셀들의 공통 유형/정렬 (섞여 있으면 빈 문자열 = 활성 표시 없음)
const selCommonType = computed<'th' | 'td' | ''>(() => {
  const cells = tableSelectedCells.value
  if (!cells.length) return ''
  const types = cells.map(({ row, col }) => tableCells.value[row]?.[col]?.type)
  return types.every((t) => t && t === types[0]) ? (types[0] as 'th' | 'td') : ''
})
const selCommonAlign = computed<TableCellAlign | ''>(() => {
  const cells = tableSelectedCells.value
  if (!cells.length) return ''
  const aligns = cells.map(({ row, col }) => {
    const c = tableCells.value[row]?.[col]
    return c ? getCellAlign(c, col) : undefined
  })
  return aligns.every((a) => a && a === aligns[0]) ? (aligns[0] as TableCellAlign) : ''
})
// 색상 피커 표시값 = 첫 선택 셀의 실제 적용 색상
const selEffectiveBg = computed(() => (firstSelCell.value ? getCellEffectiveBg(firstSelCell.value) : '#ffffff'))
const selEffectiveText = computed(() => (firstSelCell.value ? getCellEffectiveText(firstSelCell.value) : '#333333'))

// 선택 전체에 일괄 적용
const applyToSelected = (updates: Partial<TableCell>) => {
  const id = selectedModule.value?.id
  if (id) moduleStore.applyToTableCells(id, tableSelectedCells.value, updates)
}
const setSelType = (type: 'th' | 'td') => applyToSelected({ type })
const setSelAlign = (align: TableCellAlign) => applyToSelected({ align })
const setSelBgColor = (value: string) => applyToSelected({ bgColor: value.startsWith('#') ? value : `#${value}` })

// 셀 배경색·정렬을 하나라도 지정한 셀이 있으면 '공통값으로' 되돌리기를 노출한다.
// (지정 전에는 공통값을 따르므로 되돌릴 것이 없다)
const hasSelOwnStyle = computed(() =>
  tableSelectedCells.value.some(({ row, col }) => {
    const c = tableCells.value[row]?.[col]
    return !!c && (c.bgColor !== undefined || c.align !== undefined)
  }),
)
// undefined로 지우면 렌더러가 다시 공통값으로 폴백한다
const resetSelOwnStyle = () => applyToSelected({ bgColor: undefined, align: undefined })

// 병합 / 병합 해제
const canMergeSelection = computed(() => {
  const cells = tableSelectedCells.value
  if (cells.length < 2) return false
  const rows = cells.map((c) => c.row)
  const cols = cells.map((c) => c.col)
  const r0 = Math.min(...rows), r1 = Math.max(...rows)
  const c0 = Math.min(...cols), c1 = Math.max(...cols)
  return cells.length === (r1 - r0 + 1) * (c1 - c0 + 1)
})
const canUnmergeSelection = computed(() => {
  const cells = tableSelectedCells.value
  if (cells.length !== 1) return false
  const c = tableCells.value[cells[0].row]?.[cells[0].col]
  return !!c && (c.colspan > 1 || c.rowspan > 1)
})
const mergeSelection = () => {
  const id = selectedModule.value?.id
  if (id) moduleStore.mergeSelectedTableCells(id)
}
const unmergeSelection = () => {
  const id = selectedModule.value?.id
  if (id) moduleStore.unmergeSelectedTableCell(id)
}
// 선택된 셀이 걸친 행/열 삭제 (인덱스 큰 것부터 — 삭제 시 시프트 방지)
const removeSelectedTableRows = () => {
  const id = selectedModule.value?.id
  if (!id) return
  ;[...new Set(tableSelectedCells.value.map((c) => c.row))]
    .sort((a, b) => b - a)
    .forEach((r) => moduleStore.removeTableCellRow(id, r))
  moduleStore.clearTableCellSelection()
}
const removeSelectedTableCols = () => {
  const id = selectedModule.value?.id
  if (!id) return
  ;[...new Set(tableSelectedCells.value.map((c) => c.col))]
    .sort((a, b) => b - a)
    .forEach((c) => moduleStore.removeTableCellColumn(id, c))
  moduleStore.clearTableCellSelection()
}
// 정렬 아이콘(Material Symbols)
const ALIGN_KEYS: readonly TableCellAlign[] = ['left', 'center', 'right', 'justify']
const ALIGN_ICON: Record<string, string> = {
  left: 'format_align_left',
  center: 'format_align_center',
  right: 'format_align_right',
  justify: 'format_align_justify',
}
const ALIGN_LABEL: Record<string, string> = {
  left: '왼쪽 정렬',
  center: '가운데 정렬',
  right: '오른쪽 정렬',
  justify: '양쪽 정렬',
}

// ===== 셀 정렬 드롭다운 (내용 툴바) =====
// 정렬은 Quill 서식이 아니라 셀 속성이라 ql-align 픽커를 쓸 수 없다 → 같은 모양의 메뉴를 직접 띄운다.
const cellAlignMenu = ref<{ visible: boolean; top: number; left: number }>({
  visible: false,
  top: 0,
  left: 0,
})
const cellAlignMenuEl = ref<HTMLElement | null>(null)
const ALIGN_MENU_WIDTH = 52 * 4 // .rte-align-item(52px) × 4칸

const closeCellAlignMenu = () => {
  cellAlignMenu.value = { ...cellAlignMenu.value, visible: false }
}
const toggleCellAlignMenu = (event: MouseEvent) => {
  if (cellAlignMenu.value.visible) {
    closeCellAlignMenu()
    return
  }
  const btn = (event.currentTarget as HTMLElement).getBoundingClientRect()
  // 메뉴(208px)를 버튼 왼쪽에 걸되 화면 밖으로 나가지 않게 민다
  const left = Math.max(8, Math.min(btn.left, window.innerWidth - ALIGN_MENU_WIDTH - 8))
  cellAlignMenu.value = { visible: true, top: btn.bottom + 6, left }
}
const pickSelAlign = (align: TableCellAlign) => {
  setSelAlign(align)
  closeCellAlignMenu()
}
// 단일 선택 셀 내용 편집(템플릿 null 내로우잉 회피용 래퍼)
const registerSelCellEditor = (el: unknown) => {
  const c = firstSelCell.value
  if (c) setCellEditorRef(c.id, el)
}
const updateSelCellContent = (content: string) => {
  const s = firstSelCoord.value
  if (s) updateCellContent(s.row, s.col, content)
}
const applySelBold = () => {
  const c = firstSelCell.value
  if (c) applyCellBold(c)
}
// 콘텐츠 타입(텍스트/이미지) — 선택 셀 공통값(섞이면 text)
const selContentType = computed<'text' | 'image'>(() => {
  const cells = tableSelectedCells.value
  if (!cells.length) return 'text'
  const types = cells.map(({ row, col }) => tableCells.value[row]?.[col]?.contentType ?? 'text')
  return types.every((t) => t === types[0]) ? (types[0] as 'text' | 'image') : 'text'
})
const setSelContentType = (t: 'text' | 'image') => {
  // 이미지 셀은 제목(th) 개념이 없으므로 내용(td)으로 고정
  if (t === 'image') applyToSelected({ contentType: 'image', type: 'td' })
  else applyToSelected({ contentType: 'text' })
}
// 제목 지정 토글: ON=th(제목), OFF=td(내용)
const onHeaderToggle = (val: boolean) => setSelType(val ? 'th' : 'td')
// 이미지 셀 URL/설명 — 첫 선택 셀 기준, 편집은 선택 전체에 적용
const selImageUrl = computed(() => firstSelCell.value?.imageUrl ?? '')
const selImageAlt = computed(() => firstSelCell.value?.imageAlt ?? '')
const setSelImageUrl = (v: string | undefined) => applyToSelected({ imageUrl: v ?? '' })
const setSelImageAlt = (v: string | undefined) => applyToSelected({ imageAlt: v ?? '' })
// 이미지 링크(이미지 모듈의 '링크 추가' 섹션과 동일) — imageLink undefined=OFF
const selImageLink = computed(() => firstSelCell.value?.imageLink ?? '')
const selImageLinkOn = computed(() => firstSelCell.value?.imageLink !== undefined)
const onImageLinkToggle = (val: boolean) =>
  applyToSelected({ imageLink: val ? (firstSelCell.value?.imageLink ?? '') : undefined })
const setSelImageLink = (v: string | undefined) => applyToSelected({ imageLink: v ?? '' })

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
// ===== 푸터 연락처(H·T·E·F) — 체크로 노출, 드래그로 순서 변경 =====
// 값은 배열(contactItems)에 저장하되, 구버전 키(websiteUrl/phone/email/fax + show*)에도 함께 기록해
// 영문 안내문구의 {{phone}} 같은 기존 참조가 그대로 동작하게 한다.
// 템플릿에서 item.key(any)로 조회하므로 인덱스 시그니처를 느슨하게 둔다
const contactMeta: Record<string, (typeof CONTACT_ITEM_META)[ContactItemKey]> = CONTACT_ITEM_META

const getContactItems = (key: string): ContactItem[] =>
  readContactItems({ ...(selectedModule.value?.properties ?? {}), contactItems: selectedModule.value?.properties[key] })

const saveContactItems = (key: string, items: ContactItem[]) => {
  updateProperty(key, items.map((i) => ({ ...i })))
  items.forEach((i) => {
    const meta = CONTACT_ITEM_META[i.key]
    if (!meta) return
    updateProperty(meta.legacyKey, i.value)
    updateProperty(meta.legacyShowKey, i.show)
  })
}

const setContactItems = (key: string, items: ContactItem[]) => saveContactItems(key, items)
const setContactShow = (key: string, index: number, show: boolean) =>
  saveContactItems(key, getContactItems(key).map((i, idx) => (idx === index ? { ...i, show } : i)))
const setContactValue = (key: string, index: number, value: string) =>
  saveContactItems(key, getContactItems(key).map((i, idx) => (idx === index ? { ...i, value } : i)))

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
// 드래그로 순서 변경
const setSnsIcons = (key: string, icons: SnsIconItem[]) =>
  updateProperty(key, icons.map((i) => ({ ...i })))

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

// ===== 이미지 크기 조정 (Figma 686-3949) =====
// 최대 너비: 슬라이더 + % 값 필드. (*MaxWidth 키의 text 필드)
// 테두리 위치 — 그룹 스타일과 동일한 아이콘 다중 선택으로 렌더한다.
// 값은 properties에 문자열 하나로만 저장할 수 있어 'top,bottom'처럼 이어 붙인다(구버전 'both'도 해석).
const isBorderPositionField = (prop: EditableProp): boolean => /borderposition$/i.test(prop.key)
const borderSidesOf = (prop: EditableProp): BorderSide[] =>
  parseBorderSides(selectedModule.value?.properties[prop.key] ?? prop.default)
const onBorderSidesChange = (prop: EditableProp, sides: BorderSide[]): void =>
  updateProperty(prop.key, serializeBorderSides(sides))

// 퍼센트 너비 필드(이미지 최대 너비 · 구분선 선 너비 등) — 슬라이더 + % 값 필드로 렌더한다.
// (키가 ...Width 로 끝나면서 기본값이 %인 필드. px 두께 필드(borderWidth 등)는 해당 없음)
const isMaxWidthField = (prop: EditableProp): boolean =>
  prop.type === 'text' &&
  /width$/i.test(prop.key) &&
  (/maxwidth$/i.test(prop.key) || String(prop.default ?? '').includes('%'))
const pctNumber = (prop: EditableProp): number => {
  const raw = String(selectedModule.value?.properties[prop.key] ?? prop.default ?? '100%')
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), 100) : 100
}
const onPctInput = (prop: EditableProp, event: Event) => {
  const n = Math.min(Math.max(parseInt((event.target as HTMLInputElement).value, 10) || 0, 0), 100)
  updateProperty(prop.key, `${n}%`)
}
// 모서리 둥글기: 슬라이더 + px 값 필드. (*BorderRadius 키의 text 필드)
const RADIUS_MAX = 100
const isBorderRadiusField = (prop: EditableProp): boolean =>
  prop.type === 'text' && /borderradius$/i.test(prop.key)
const radiusNumber = (prop: EditableProp): number => {
  const raw = String(selectedModule.value?.properties[prop.key] ?? prop.default ?? '0')
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), RADIUS_MAX) : 0
}
const onRadiusInput = (prop: EditableProp, event: Event) => {
  const n = Math.min(Math.max(parseInt((event.target as HTMLInputElement).value, 10) || 0, 0), RADIUS_MAX)
  updateProperty(prop.key, `${n}px`)
}
// 정렬: 좌측/중앙/우측 세그먼트 — left/center/right 옵션을 가진 select 필드.
const ALIGN_SEG = [
  { value: 'left', label: '좌측', icon: 'align_justify_flex_start' },
  { value: 'center', label: '중앙', icon: 'align_justify_center' },
  { value: 'right', label: '우측', icon: 'align_justify_flex_end' },
] as const
// 같은 모듈에 최대 너비(*MaxWidth) 속성이 있고 그 값이 100%(전체 폭)면 정렬 세그먼트를 비활성화한다.
// (전체 폭에서는 좌/중/우 정렬이 시각적으로 동일하므로 불필요) — 100% 미만이면 활성화.
const alignDisabledByFullWidth = computed(() => {
  const maxProp = editableProps.value.find((p) => isMaxWidthField(p))
  if (!maxProp) return false
  return pctNumber(maxProp) >= 100
})
const isAlignSegment = (prop: EditableProp): boolean => {
  if (prop.type !== 'select' || !prop.options) return false
  const vals = prop.options.map((o) => o.value)
  return vals.includes('left') && vals.includes('center') && vals.includes('right')
}
/** 세그먼트에서 활성으로 보일 값 — 저장값이 없으면 그 속성의 기본값(제목 center / 내용 left 등) */
const alignValueOf = (prop: EditableProp): string =>
  String(selectedModule.value?.properties[prop.key] || prop.default || 'center')

/**
 * 표의 '텍스트 정렬'(headerAlign/cellAlign)은 타입 공통값이라, 셀에 남아 있는 개별 정렬을
 * 함께 지워야 말 그대로 공통으로 적용된다 → 전용 액션으로 처리. 그 외 정렬은 종전대로.
 */
const TABLE_TYPE_ALIGN_KEYS: Record<string, 'th' | 'td'> = { headerAlign: 'th', cellAlign: 'td' }
const onAlignSegmentPick = (prop: EditableProp, value: string) => {
  const cellType = TABLE_TYPE_ALIGN_KEYS[prop.key]
  const id = selectedModule.value?.id
  if (cellType && id && selectedModule.value?.moduleId === 'ModuleTable') {
    moduleStore.setTableTypeAlign(id, cellType, value as 'left' | 'center' | 'right')
    return
  }
  updateProperty(prop.key, value)
}

// ===== 작은 버튼 '버튼 내용' 칩 (Figma 1209-40180 / 1227-42350) =====
// 버튼 2~4의 노출 스위치(showBtn2/3/4)를 칩 목록으로 바꾼 UI. 데이터 모델은 그대로라
// 렌더·내보내기 경로(removeSmallButtonsProcessor)는 손대지 않는다.
//  · 칩 = 지금 있는 버튼 (클릭 = 편집 대상 전환)
//  · '+ 추가' = 다음 슬롯을 켠다 (최대 4개)
//  · 활성 칩의 ✕ = 그 버튼 삭제 (뒤 버튼 내용을 한 칸씩 당기고 마지막 슬롯을 끈다)
const SMALL_BTN_MAX = 4
/** 토글을 켤 때 넣어 줄 기본 버튼 너비 — 'auto'인 채로 켜면 토글이 아무 일도 안 한 것처럼 보인다 */
const SMALL_BTN_DEFAULT_WIDTH = '120px'
const isSmallButtonModule = computed(() => selectedModule.value?.moduleId === 'ModuleSmallButton')
const activeSmallBtn = ref(1)
watch(() => selectedModule.value?.id, () => { activeSmallBtn.value = 1 })

/** 지금 있는 버튼 슬롯 — 1번은 항상, 2~4는 showBtnN이 켜진 것만 (캔버스 렌더 순서와 동일) */
const smallBtnSlots = computed<number[]>(() => {
  const props = selectedModule.value?.properties ?? {}
  const slots = [1]
  for (let n = 2; n <= SMALL_BTN_MAX; n++) if (props[`showBtn${n}`] === true) slots.push(n)
  return slots
})
// 활성 칩이 사라졌으면(삭제 등) 마지막 칩으로 되돌린다
watch(smallBtnSlots, (slots) => {
  if (!slots.includes(activeSmallBtn.value)) activeSmallBtn.value = slots[slots.length - 1] ?? 1
})

/** 칩 라벨 = 그 버튼의 텍스트(끝의 화살표는 떼고), 비어 있으면 '버튼 N' */
const smallBtnLabel = (slot: number): string => {
  const raw = String(selectedModule.value?.properties[`btn${slot}Text`] ?? '')
    .replace(/[→>\s]+$/, '')
    .trim()
  return raw || `버튼 ${slot}`
}

const SMALL_BTN_FIELDS = ['Text', 'Url', 'BgColor', 'TextColor'] as const
const readSmallBtn = (slot: number): unknown[] =>
  SMALL_BTN_FIELDS.map((f) => selectedModule.value?.properties[`btn${slot}${f}`])
const writeSmallBtn = (slot: number, values: unknown[]): void => {
  SMALL_BTN_FIELDS.forEach((f, i) => {
    const key = `btn${slot}${f}`
    if (selectedModule.value?.properties[key] !== values[i]) updateProperty(key, values[i])
  })
}
/** 그 슬롯을 설정 기본값으로 되돌린다 — 다시 추가했을 때 앞 버튼 내용이 남아 있지 않도록 */
const resetSmallBtn = (slot: number): void =>
  writeSmallBtn(
    slot,
    SMALL_BTN_FIELDS.map((f) => editableProps.value.find((p) => p.key === `btn${slot}${f}`)?.default ?? ''),
  )

const addSmallBtn = (): void => {
  const next = [2, 3, 4].find((n) => !smallBtnSlots.value.includes(n))
  if (!next) return
  resetSmallBtn(next)
  updateProperty(`showBtn${next}`, true)
  activeSmallBtn.value = next
}

const removeSmallBtn = (slot: number): void => {
  const slots = smallBtnSlots.value
  const idx = slots.indexOf(slot)
  if (slots.length <= 1 || idx === -1) return
  const data = slots.map(readSmallBtn)
  data.splice(idx, 1)
  data.forEach((values, i) => writeSmallBtn(slots[i], values))
  updateProperty(`showBtn${slots[slots.length - 1]}`, false)
  activeSmallBtn.value = slots[Math.max(0, idx - 1)]
}

/** '버튼 1'~'버튼 4' 그룹(작은 버튼 전용) — 헤더 없이, 고른 칩 하나만 펼쳐서 보여준다 */
const smallBtnGroupSlot = (group: PropGroup): number | null => {
  if (!isSmallButtonModule.value || !group.name) return null
  const m = /^버튼 ([1-4])$/.exec(group.name)
  return m ? Number(m[1]) : null
}
const isSmallBtnGroup = (group: PropGroup): boolean => smallBtnGroupSlot(group) !== null
const isSmallBtnGroupVisible = (group: PropGroup): boolean => {
  const slot = smallBtnGroupSlot(group)
  return slot === null || slot === activeSmallBtn.value
}
/** 버튼 칩 묶음과 공통 옵션(정렬·여백…) 사이의 구분선 위치 = 첫 '버튼 N' 아닌 섹션 */
const smallBtnCommonStart = computed(() =>
  isSmallButtonModule.value ? propGroups.value.findIndex((g) => !isSmallBtnGroup(g)) : -1,
)

// '버튼 너비' — 기본값이 'auto'라 px 슬라이더 판별(isPxWidthField)에 안 걸려 따로 그린다.
const isBtnWidthField = (prop: EditableProp): boolean =>
  isSmallButtonModule.value && prop.key === 'btnWidth'
const btnWidthRaw = computed(() => String(selectedModule.value?.properties.btnWidth ?? '').trim())
/** 저장된 단위를 그대로 유지한다 — 옛 템플릿의 '100%'를 px로 바꿔 버리지 않도록 */
const btnWidthUnit = computed(() => (btnWidthRaw.value.endsWith('%') ? '%' : 'px'))
const btnWidthMax = computed(() => (btnWidthUnit.value === '%' ? 100 : PX_WIDTH_MAX))
const btnWidthNumber = computed(() => {
  const n = Number.parseInt(btnWidthRaw.value, 10)
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), btnWidthMax.value) : 0
})
const onBtnWidthInput = (event: Event): void => {
  const raw = Number.parseInt((event.target as HTMLInputElement).value, 10) || 0
  updateProperty('btnWidth', `${Math.min(Math.max(raw, 0), btnWidthMax.value)}${btnWidthUnit.value}`)
}

// ===== 폰트 크기: 모듈 기본값 ↔ 선택 영역 크기 통합 컨트롤 (Figma 640-3689) =====
// 드래그 선택이 있으면 그 범위의 인라인 크기를, 없으면 모듈 기본값(prop)을 대상으로 한다.
// 어느 쪽을 바꾸는지는 라벨 옆 '선택 영역' 배지로 드러낸다.

/** 이 폰트 크기 필드가 조작할 리치텍스트 에디터 키(같은 그룹의 짝 textarea) */
const fontSizeEditorKey = (prop: EditableProp): string | null => {
  const group = propGroups.value.find((g) => g.props.includes(prop))
  if (!group) return null
  const textareas = group.props.filter((p) => p.type === 'textarea')
  if (!textareas.length) return null
  // 'mainTitle' + 'mainTitleFontSize' 처럼 키 접두사가 맞는 짝을 먼저 찾고,
  // 없으면 그룹에 textarea·폰트크기가 하나씩일 때만 그 둘을 짝으로 본다.
  const exact = textareas.find((t) => `${t.key}fontsize`.toLowerCase() === prop.key.toLowerCase())
  if (exact) return exact.key
  const fontSizes = group.props.filter(isFontSizeField)
  return textareas.length === 1 && fontSizes.length === 1 ? textareas[0].key : null
}

/**
 * 에디터 본문에 적용할 기본 글자 크기 — 같은 그룹의 짝 '폰트 크기' prop 값.
 * (에디터가 고정 크기로 그려지면 캔버스와 크기가 달라 보여 '연동이 안 된다'고 느껴진다)
 */
const editorBaseFontSize = (textareaProp: EditableProp, group: PropGroup): string | undefined => {
  const fontSizes = group.props.filter(isFontSizeField)
  if (!fontSizes.length) return undefined
  const exact = fontSizes.find(
    (f) => f.key.toLowerCase() === `${textareaProp.key}fontsize`.toLowerCase(),
  )
  const textareas = group.props.filter((p) => p.type === 'textarea')
  const partner =
    exact ?? (textareas.length === 1 && fontSizes.length === 1 ? fontSizes[0] : undefined)
  if (!partner) return undefined
  const n = parseFontSize(selectedModule.value?.properties[partner.key] ?? partner.default)
  return n ? `${n}px` : undefined
}

/** 지금 이 필드가 '선택 영역'을 대상으로 하는지 (드래그 선택이 살아 있는지) */
const isFontSizeSelectionTarget = (prop: EditableProp): boolean => {
  const key = fontSizeEditorKey(prop)
  return !!key && !!editorFormatState[key]?.hasSelection
}

/** 선택 영역에 크기가 섞여 있는지 (값 자리에 '--' 표시) */
const isFontSizeMixed = (prop: EditableProp): boolean => {
  const key = fontSizeEditorKey(prop)
  return isFontSizeSelectionTarget(prop) && !!key && !!editorFormatState[key]?.fontSizeMixed
}

/** 개별(인라인) 크기가 걸려 있는지 — 선택 중이면 그 범위, 아니면 본문 전체 기준 */
const fontSizeHasInline = (prop: EditableProp): boolean => {
  const key = fontSizeEditorKey(prop)
  if (!key) return false
  return isFontSizeSelectionTarget(prop)
    ? !!editorFormatState[key]?.fontSizeInSelection
    : !!editorFormatState[key]?.fontSizeAnywhere
}

/** 모듈 기본값(px) */
const baseFontSizeNumber = (prop: EditableProp): number =>
  parseFontSize(selectedModule.value?.properties[prop.key] ?? prop.default) ?? 16

/** 표시 값 — 선택 영역이 있으면 그 크기(없으면 기본값), 혼합이면 슬라이더는 기본값 위치 */
const fontSizeNumber = (prop: EditableProp): number => {
  const key = fontSizeEditorKey(prop)
  if (isFontSizeSelectionTarget(prop) && key) {
    const sel = parseFontSize(editorFormatState[key]?.fontSize)
    if (sel !== null) return sel
  }
  return baseFontSizeNumber(prop)
}

// Enter 입력 시 blur시켜 change 이벤트(값 확정)를 발생시킴
const blurTarget = (event: Event) => {
  ;(event.target as HTMLElement).blur()
}

// 슬라이더/숫자 입력 — 선택 영역이 있으면 그 범위에만, 없으면 모듈 기본값에 적용
const onFontSizeInput = (prop: EditableProp, event: Event) => {
  const raw = (event.target as HTMLInputElement).value
  const parsed = Number.parseInt(raw, 10)
  const next = Math.min(
    FONT_SIZE_MAX,
    Math.max(FONT_SIZE_MIN, Number.isFinite(parsed) ? parsed : fontSizeNumber(prop)),
  )
  const key = fontSizeEditorKey(prop)
  const quill = key ? quillByKey[key] : null
  const range = key ? quillRangeByKey[key] : null
  if (isFontSizeSelectionTarget(prop) && quill && range && range.length > 0) {
    quill.formatText(range.index, range.length, 'fontSize', toFontSizeValue(next), 'user')
    syncEditorFormatState(key!, quill, range)
    return
  }
  updateProperty(prop.key, toFontSizeValue(next))
}

/** 개별 크기 지우기 — 선택 중이면 그 범위만, 아니면 본문 전체의 인라인 크기를 제거해 기본값을 따르게 한다 */
const resetFontSizeToBase = (prop: EditableProp) => {
  const key = fontSizeEditorKey(prop)
  const quill = key ? quillByKey[key] : null
  if (!key || !quill) return
  const range = quillRangeByKey[key]
  if (isFontSizeSelectionTarget(prop) && range && range.length > 0) {
    quill.formatText(range.index, range.length, 'fontSize', false, 'user')
  } else {
    quill.formatText(0, quill.getLength(), 'fontSize', false, 'user')
  }
  syncEditorFormatState(key, quill, quillRangeByKey[key])
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

// 4방향(quad) 세트에 속하지 않는 단일 여백 값(예: 버튼 안쪽 상하 여백 buttonPaddingV) —
// 여백 슬라이더와 같은 UI로 그려 4방향 여백과 조작감을 맞춘다.
const isSingleSpacingField = (prop: EditableProp): boolean =>
  prop.type === 'text' &&
  /padding|margin/i.test(prop.key) &&
  !isQuadStart(prop, editableProps.value) &&
  !isQuadMember(prop, editableProps.value)

const onSingleSpacingInput = (prop: EditableProp, event: Event) => {
  const n = Math.max(0, Number.parseInt((event.target as HTMLInputElement).value, 10) || 0)
  updateProperty(prop.key, `${n}px`)
}

// 테두리 블록(borderStyle)에 흡수되지 않은 독립 테두리 두께 텍스트 필드(예: 섹션 타이틀 상단 테두리 두께 topBorderWidth) —
// 여백 슬라이더와 같은 UI(헤드 라벨 + gg-margin-slider-row)로 그린다. 값 파싱/입력은 단일 여백과 공용.
const isBorderWidthField = (prop: EditableProp): boolean =>
  prop.type === 'text' &&
  // borderWidth·topBorderWidth·borderTopWidth(테이블) 등 '...테두리 두께' 키를 모두 슬라이더로
  /border\w*width$/i.test(prop.key) &&
  !isBorderMember(prop, editableProps.value)

// px로 고정하는 너비 값(예: 언어 선택 버튼의 '버튼 너비' 70px) — 여백 슬라이더와 같은 UI로 그린다.
// 기본값으로 갈라낸다: '%'면 최대 너비 슬라이더, 'auto'(작은 버튼 등)면 그대로 텍스트 필드.
const PX_WIDTH_MAX = 200
const isPxWidthField = (prop: EditableProp): boolean =>
  prop.type === 'text' &&
  /width$/i.test(prop.key) &&
  !isMaxWidthField(prop) &&
  !isBorderWidthField(prop) &&
  /^\d+px$/.test(String(prop.default ?? '').trim())

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
// 이름 있는 속성 그룹은 모두 아코디언 없이 항상 정적 헤더로 노출한다(chevron·접기 제거).
// 헤더는 그룹 라벨(+그룹 토글)만 두고, 하위 속성은 토글/showWhen으로 노출된다.
// (내용·배경 박스: 속성 바로 노출 / 테두리 등 토글 그룹: 토글 ON일 때 하위 속성 노출)
const isDupLabelProp = (group: { name?: string | null; props: EditableProp[] }, prop: EditableProp): boolean =>
  groupSelfLabeledProp(group) === prop

// 그룹이 '여백 4방향(quad)'으로만 자기 이름을 가진 경우(예: 그룹"바깥 여백" 안의 marginTop 라벨이 "바깥 여백").
// 이때는 별도 섹션 헤더(gg-acc-header) 없이 quad-head 라벨 위치(잠금 버튼과 한 줄)에만 이름을 노출한다.
// (배경 박스처럼 quad 외 다른 속성도 있는 그룹은 해당 없음)
const isQuadSelfLabeledGroup = (group: { name?: string | null; props: EditableProp[] }): boolean => {
  const p = groupSelfLabeledProp(group)
  return !!p && isQuadStart(p, group.props, group.props.indexOf(p))
}

// ===== 접이식 섹션 (Figma 608-2624 / 640-2393) =====
// 타이틀 옆 화살표(chevron) + 열릴 때 본문에 배경 카드. 헤더(화살표+타이틀)를 클릭하면 열고/닫는다.
// 섹션 헤더(타이틀 행)를 갖는 그룹 — 이름 있고 quad-self-labeled(헤더 없음)가 아닌 그룹.
// 스타일 섹션 — '링크 추가'처럼 접이식 카드(화살표 + 헤더 토글 + 회색 본문 카드)로 통일한다(Figma 요청).
// 별도 on/off 속성이 없는 섹션(이미지 크기 조정·모서리 둥글기·여백·배경색)은 토글이 UI 펼침 상태를 제어하고,
// 실제 on/off 속성이 있는 섹션(링크 추가=showImageLink, 테두리=showBorder/borderStyle)은 그 속성이 토글을 담당한다.
// - 이미지 모듈: '이미지 파일'(핵심 필드)을 뺀 전 섹션
// - 텍스트 모듈: 여백 · 배경색 · 모서리 둥글기 · 테두리 (내용 섹션은 핵심 필드라 제외)
// 모듈별 스타일 섹션 규칙 — '*'는 이름 있는 전 섹션, Set은 그 이름들만, exclude는 그 섹션만 제외.
// (제외 대상은 '이미지 파일'·'내용'처럼 항상 펼쳐 두는 핵심 입력 섹션)
const STYLE_SECTION_RULES: Record<string, '*' | { exclude: string } | Set<string>> = {
  ModuleImg: { exclude: '이미지 파일' },
  ModuleDescText: new Set(['여백', '모서리 둥글기', '테두리']),
  ModuleInlineText: new Set(['텍스트 1', '텍스트 2', '텍스트 3', '텍스트 4', '바깥 여백', '모서리 둥글기']),
  'Module01-2': new Set(['카테고리', '여백', '모서리 둥글기', '테두리']),
  Module11: new Set(['여백', '모서리 둥글기', '테두리']),
  ModuleDivider: '*', // 여백 (선 스타일은 그룹 없이 상단 flat 노출)
  // 테이블 스타일 탭: 테두리/제목·내용 스타일/여백을 접이식 아코디언으로
  ModuleTable: new Set(['테두리', '제목 스타일', '내용 스타일', '여백']),
  // 버튼: 핵심 입력(텍스트·링크·폰트·배경색·글자색)은 항상 펼친 채 두고 스타일만 접이식 카드로
  ModuleOneButton: { exclude: '버튼' },
  ModuleTwoButton: new Set(['테두리', '모서리 둥글기', '여백']),
  // 작은 버튼: 버튼 1~4는 '버튼 내용' 칩이 대신 관리하므로(헤더·아코디언 없이 항상 펼침)
  // 4개 버튼에 공통으로 걸리는 옵션만 접이식 카드로 (Figma 1227-42350)
  ModuleSmallButton: new Set(['정렬', '여백', '글자 크기', '버튼 너비 직접 설정', '모서리 둥글기']),
  // 연락처: 핵심 입력('연락처')은 항상 펼친 채 두고 여백만 접이식 카드로
  ModuleContactInfo: new Set(['여백']),
  // SNS 아이콘: 핵심 입력(배경색·정렬·구성 요소)은 항상 펼친 채 두고 여백만 접이식 카드로
  ModuleSnsIcons: new Set(['여백']),
  // 언어 선택 버튼: 버튼 1~3은 자기 노출 토글이 있어 이미 접이식이다.
  // 첫 섹션('공통 버튼 스타일')은 다른 모듈의 '내용'처럼 항상 펼친 평면 섹션으로 두고,
  // 나머지 토글 없는 섹션만 접이식 카드로 맞춘다.
  TopLanguageButton: new Set(['활성(액티브) 버튼 색상', '여백']),
}
const isStyleSection = (group: PropGroup): boolean => {
  if (!group.name) return false
  const rule = STYLE_SECTION_RULES[selectedModule.value?.moduleId ?? '']
  if (!rule) return false
  if (rule === '*') return true
  if (rule instanceof Set) return rule.has(group.name)
  return group.name !== rule.exclude
}

// 섹션 본문을 카드(gg-acc-fields) 단위로 나눈다.
// 4방향 여백(quad)은 블록마다 자기 카드를 갖고(예: 텍스트 '여백' 섹션의 안쪽 여백 / 바깥 여백),
// 그 외 속성들은 종전처럼 한 카드에 모인다. (카드가 아닌 섹션은 display:contents 라 결과가 동일)
type FieldChunk = { prop: EditableProp; index: number }[]
const fieldChunks = (group: PropGroup): FieldChunk[] => {
  const chunks: FieldChunk[] = []
  let current: FieldChunk = []
  let currentIsQuad = false
  group.props.forEach((prop, index) => {
    const startsQuad = isQuadStart(prop, group.props, index)
    const inQuad = isQuadMember(prop, group.props, index)
    // quad가 새로 시작하거나, quad 카드가 끝나고 다른 속성이 오면 카드를 끊는다
    if (current.length > 0 && (startsQuad || (currentIsQuad && !inQuad))) {
      chunks.push(current)
      current = []
      currentIsQuad = false
    }
    if (startsQuad) currentIsQuad = true
    current.push({ prop, index })
  })
  if (current.length > 0) chunks.push(current)
  return chunks
}

// (작은 버튼의 '버튼 N' 그룹은 칩이 헤더 역할을 하므로 섹션 헤더를 두지 않는다 → 항상 펼침)
const hasSectionHeader = (group: PropGroup): boolean =>
  !!group.name && !isSmallBtnGroup(group) && (!isQuadSelfLabeledGroup(group) || isStyleSection(group))
// 헤더 우측에 on/off 토글이 있는 그룹인지 — boolean 토글 또는 테두리 블록(on/off) 토글.
const groupHasHeaderToggle = (group: PropGroup): boolean =>
  !!groupHeaderToggle(group) || !!groupBorderToggleProp(group)
// 접이식(화살표+배경카드+아코디언)으로 만들 섹션 — 헤더 토글이 있거나, 이미지 스타일 섹션.
// 그 외 토글 없는 섹션(예: '버튼')은 기존처럼 평면 나열(화살표·카드·접기 없음).
const isCollapsibleSection = (group: PropGroup): boolean =>
  hasSectionHeader(group) && (groupHasHeaderToggle(group) || isStyleSection(group))
// 섹션이 "열림"인지: 토글 그룹은 토글 값에, 그 외 이름 그룹은 펼침 상태에 따른다. flat/헤더없는 quad는 항상 열림.
// 펼침 여부는 스위치와 무관한 UI 상태다(기본 닫힘). chevron/라벨 클릭으로만 바뀐다.
const isSectionOpen = (group: PropGroup, index: number): boolean =>
  !isCollapsibleSection(group) || isGroupPanelExpanded(group, index)

/** 섹션 스위치 상태 — 별도 on/off 속성이 없는 섹션(여백·모서리 둥글기 등)은 항상 '켜짐'으로 본다 */
const isSectionEnabled = (group: PropGroup): boolean => {
  const t = groupHeaderToggle(group)
  if (t) return Boolean(selectedModule.value?.properties[t.key])
  const b = groupBorderToggleProp(group)
  if (b) return borderIsOn(b)
  return true
}

/**
 * 헤더 스위치 변경.
 * - 켤 때: 속성을 켜면서 섹션도 펼친다(바로 편집할 수 있게)
 * - 끌 때: 펼침 상태는 그대로 두고 내용만 흐리게(.gg-acc-fields.is-disabled) 만든다
 */
const onSectionSwitch = (group: PropGroup, index: number, on: boolean): void => {
  const t = groupHeaderToggle(group)
  if (t) updateProperty(t.key, on)
  // '버튼 너비 직접 설정'은 실제 너비 값과 짝이다 — 끄면 자동(auto)으로, 켜면 기본 너비로
  // 함께 맞춰야 토글 상태와 캔버스 결과가 어긋나지 않는다.
  if (t?.key === 'showBtnWidth') {
    if (!on) updateProperty('btnWidth', 'auto')
    else if (!btnWidthRaw.value || btnWidthRaw.value === 'auto')
      updateProperty('btnWidth', SMALL_BTN_DEFAULT_WIDTH)
  }
  else {
    const b = groupBorderToggleProp(group)
    if (b) toggleBorderOn(b, on)
  }
  if (on) setGroupPanelExpanded(group, index, true)
}

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

// 이 prop이 "토글이 달린 섹션의 시작"인지 → 위에 구분선(1px #f2f4f6)을 그린다.
// (flat 모듈 전용: 이름 있는 그룹은 gg-acc-section 구분선이 이미 섹션을 나눈다)
// (1) showWhen 하위 속성을 거느린 boolean 토글(예: 이미지 링크 사용)
// (2) on/off 토글이 달린 테두리 블록(none 옵션 보유)
const isTogglePropStart = (prop: EditableProp, props: EditableProp[]): boolean => {
  if (prop.type === 'boolean' && props.some((p) => showWhenKey(p) === prop.key)) return true
  if (isBorderStyleStart(prop) && borderHasNone(prop)) return true
  return false
}

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

// 섹션이 '테두리 블록(on/off none 토글)'만으로 자기 이름을 갖는 경우(예: 이미지 '테두리'),
// 그 블록의 on/off 토글을 섹션 헤더로 끌어올린다 → '링크 추가'처럼 헤더 우측에 토글이 위치.
// (블록 내부의 자체 토글 행은 렌더하지 않는다)
const groupBorderToggleProp = (group: PropGroup): EditableProp | null => {
  const p = groupSelfLabeledProp(group)
  return p && isBorderStyleStart(p) && borderHasNone(p) ? p : null
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

const quillByKey: Record<string, Quill> = {}
const quillRangeByKey: Record<string, { index: number; length: number } | null> = {}
type EditorFormatState = {
  lineHeight: string
  letterSpacing: string
  /** 줄바꿈 규칙(문단 단위) — '' | 'keep-all' | 'break-all' */
  wordBreak: string
  /** 드래그 선택(길이>0)이 살아 있는지 — 폰트 크기 컨트롤의 대상 판정 */
  hasSelection: boolean
  /** 선택 영역의 인라인 폰트 크기(균일할 때만, 없으면 '') */
  fontSize: string
  /** 선택 영역에 크기가 섞여 있는지 (지정+미지정 혼합 포함) */
  fontSizeMixed: boolean
  /** 선택 영역 안에 인라인 크기가 하나라도 있는지 */
  fontSizeInSelection: boolean
  /** 본문 전체에 인라인 크기가 하나라도 있는지 */
  fontSizeAnywhere: boolean
}
const editorFormatState = reactive<Record<string, EditorFormatState>>({})

/**
 * 범위 안의 인라인 폰트 크기 집합. 크기가 없는 텍스트는 null(=모듈 기본값)로 센다.
 * (Quill의 getFormat은 '일부만 지정'이면 키 자체를 지워버려 혼합 여부를 알 수 없다)
 */
const collectFontSizes = (
  quill: Quill,
  range: { index: number; length: number },
): Set<string | null> => {
  const sizes = new Set<string | null>()
  if (range.length <= 0) return sizes
  const delta = quill.getContents(range.index, range.length)
  delta.ops.forEach((op) => {
    if (typeof op.insert !== 'string') return
    if (!op.insert.replace(/\n/g, '')) return // 문단 구분용 개행만 있는 조각은 제외
    const size = (op.attributes?.fontSize as string | undefined) ?? null
    sizes.add(size)
  })
  return sizes
}

const syncEditorFormatState = (
  key: string,
  quill: Quill,
  range: { index: number; length: number } | null,
) => {
  const r = range ?? { index: 0, length: quill.getLength() }
  const fmt = quill.getFormat(r.index, r.length) as Record<string, unknown>
  const hasSelection = !!range && range.length > 0
  const selSizes = hasSelection ? collectFontSizes(quill, r) : new Set<string | null>()
  const allSizes = collectFontSizes(quill, { index: 0, length: quill.getLength() })
  const onlySize = selSizes.size === 1 ? [...selSizes][0] : null
  editorFormatState[key] = {
    lineHeight: typeof fmt.lineHeight === 'string' ? fmt.lineHeight : '',
    letterSpacing: typeof fmt.letterSpacing === 'string' ? fmt.letterSpacing : '',
    wordBreak: typeof fmt.wordBreak === 'string' ? fmt.wordBreak : '',
    hasSelection,
    fontSize: onlySize ?? '',
    fontSizeMixed: selSizes.size > 1,
    fontSizeInSelection: [...selSizes].some((s) => s !== null),
    fontSizeAnywhere: [...allSizes].some((s) => s !== null),
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

// 자간(인라인 스코프) 적용 — 선택 범위가 있으면 그 범위에 적용.
// 선택 없이 커서만 있으면 커서 자리(빈 span)에만 걸려 화면에 아무 변화가 없으므로,
// 행간과 같은 감각이 되도록 '커서가 있는 문단 전체'에 적용한다.
const applyLetterSpacing = (key: string, value: string | null) => {
  const q = quillByKey[key]
  const r = quillRangeByKey[key]
  if (!q || !r) return
  if (r.length > 0) {
    q.formatText(r.index, r.length, 'letterSpacing', value || false, 'user')
  } else {
    const [line] = q.getLine(r.index)
    if (line) {
      q.formatText(q.getIndex(line), line.length(), 'letterSpacing', value || false, 'user')
    } else {
      q.setSelection(r.index, 0, 'silent')
      q.format('letterSpacing', value || false, 'user')
    }
  }
  editorFormatState[key] = { ...editorFormatState[key], letterSpacing: value || '' }
}

// ===== 행간 · 자간 팝오버 (툴바의 format_line_spacing) =====
const spacingPopover = ref<{ visible: boolean; key: string; top: number; left: number }>({
  visible: false,
  key: '',
  top: 0,
  left: 0,
})
const spacingPopoverEl = ref<HTMLElement | null>(null)
const SPACING_POPOVER_WIDTH = 318 // .rte-spacing-popover 의 width 와 일치

const closeSpacingPopover = () => {
  spacingPopover.value = { ...spacingPopover.value, visible: false }
}

// 현재 선택 영역의 행간/자간 값 — 지정 전이면 슬라이더는 기본 위치에 서고 값은 흐리게 표시한다
// (실제 적용은 사용자가 슬라이더를 움직이거나 값을 입력했을 때만 일어난다)
const lineHeightNumber = computed(
  () =>
    parseLineHeight(editorFormatState[spacingPopover.value.key]?.lineHeight) ??
    LINE_HEIGHT_FALLBACK,
)
const isLineHeightSet = computed(
  () => parseLineHeight(editorFormatState[spacingPopover.value.key]?.lineHeight) !== null,
)
const letterSpacingNumber = computed(
  () =>
    parseLetterSpacing(editorFormatState[spacingPopover.value.key]?.letterSpacing) ??
    LETTER_SPACING_FALLBACK,
)
const isLetterSpacingSet = computed(
  () => parseLetterSpacing(editorFormatState[spacingPopover.value.key]?.letterSpacing) !== null,
)

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

// 줄바꿈 규칙(문단 단위) — 툴바 드롭다운을 이 팝오버로 옮겼다
const WORD_BREAK_SEG: { label: string; value: string | null }[] = [
  { label: '기본', value: null },
  { label: '단어 기준', value: 'keep-all' },
  { label: '글자 기준', value: 'break-all' },
]
const currentWordBreak = computed<string | null>(
  () => editorFormatState[spacingPopover.value.key]?.wordBreak || null,
)
const applyWordBreak = (key: string, value: string | null) => {
  const q = quillByKey[key]
  const r = quillRangeByKey[key]
  if (!q || !r) return
  q.setSelection(r.index, r.length, 'silent')
  q.format('wordBreak', value ?? false, 'user')
  editorFormatState[key] = { ...editorFormatState[key], wordBreak: value ?? '' }
}

const onLineHeightSlide = (event: Event) => {
  const raw = Number.parseFloat((event.target as HTMLInputElement).value)
  if (!Number.isFinite(raw)) return
  const n = clamp(raw, LINE_HEIGHT_MIN, LINE_HEIGHT_MAX)
  applyLineHeight(spacingPopover.value.key, toLineHeightValue(n))
}

const onLetterSpacingSlide = (event: Event) => {
  const raw = Number.parseFloat((event.target as HTMLInputElement).value)
  if (!Number.isFinite(raw)) return
  const n = clamp(raw, LETTER_SPACING_MIN, LETTER_SPACING_MAX)
  applyLetterSpacing(spacingPopover.value.key, toLetterSpacingValue(n))
}

const toggleSpacingPopover = (key: string, event: MouseEvent) => {
  if (spacingPopover.value.visible && spacingPopover.value.key === key) {
    closeSpacingPopover()
    return
  }
  const quill = quillByKey[key]
  if (!quill) return
  // 에디터를 한 번도 클릭하지 않았으면 본문 전체를 대상으로 삼는다
  // (드롭다운이 표시하는 값도 선택 영역이 없을 때 본문 전체 서식이므로 동작이 일치한다)
  if (!quillRangeByKey[key]) quillRangeByKey[key] = { index: 0, length: quill.getLength() }

  // Figma 640-3517처럼 카드를 텍스트 필드 열에 맞춰 건다(버튼 기준이면 패널 왼쪽으로 밀려난다).
  const btnEl = event.currentTarget as HTMLElement
  const btn = btnEl.getBoundingClientRect()
  const field = btnEl.closest('.rte-field')?.getBoundingClientRect()
  const anchorLeft = field ? field.left - 5 : btn.right - SPACING_POPOVER_WIDTH
  const left = Math.max(8, Math.min(anchorLeft, window.innerWidth - SPACING_POPOVER_WIDTH - 8))
  spacingPopover.value = { visible: true, key, top: btn.bottom + 6, left }
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

// ===== 에디터 툴바 색상(글자/배경) — 공용 ColorPopoverPicker로 선택, Quill 선택 영역에 적용 =====
// key = 에디터 prop.key, format = 'color' | 'background'. 픽 상태는 팝오버가 열려 있는 동안
// 표시값(스와치·팔레트 하이라이트)이 흔들리지 않도록 (key:format)별 맵에 따로 보관한다.
const editorColorPick = reactive<Record<string, { value: string; index: number | null }>>({})
const editorColorKey = (key: string, format: 'color' | 'background') => `${key}:${format}`
// 팝오버 대상 에디터/선택 영역 (열 때 캡처 — 이후 blur 돼도 이 범위에 적용)
let editorColorQuill: Quill | null = null
let editorColorRange: { index: number; length: number } | null = null

const editorColorModel = (key: string, format: 'color' | 'background'): string =>
  editorColorPick[editorColorKey(key, format)]?.value ?? (format === 'color' ? '#333333' : '#ffffff')
const editorColorActiveIndex = (key: string, format: 'color' | 'background'): number | null =>
  editorColorPick[editorColorKey(key, format)]?.index ?? null

// 팝오버가 열릴 때: 대상 Quill/선택 영역을 캡처하고, 그 영역의 현재 색을 초기 표시값으로 세팅
const onEditorColorOpen = (key: string, format: 'color' | 'background') => {
  const q = quillByKey[key]
  if (!q) return
  editorColorQuill = q
  editorColorRange = quillRangeByKey[key] ?? q.getSelection()
  const r = editorColorRange
  const cur = r
    ? (q.getFormat(r.index, Math.max(r.length, 1)) as Record<string, unknown>)[format]
    : null
  const usingPoint = typeof cur === 'string' && cur.includes(POINT_COLOR_CSS_VAR)
  const m = typeof cur === 'string' ? cur.match(/--point-color-(\d)/) : null
  const idx = usingPoint ? (m ? parseInt(m[1], 10) : 0) : null
  editorColorPick[editorColorKey(key, format)] = {
    value: usingPoint
      ? pointColorAt(wrapPointColors.value, idx ?? 0)
      : typeof cur === 'string' && cur
        ? cur
        : format === 'color'
          ? '#333333'
          : '#ffffff',
    index: idx,
  }
}

// 캡처한 선택 영역(또는 커서 이후 입력)에 색상 적용
const applyEditorColor = (format: 'color' | 'background', value: string | false) => {
  const q = editorColorQuill
  const r = editorColorRange
  if (!q || !r) return
  if (r.length > 0) q.formatText(r.index, r.length, format, value, 'user')
  else {
    q.setSelection(r.index, 0, 'silent')
    q.format(format, value, 'user')
  }
}

// 팔레트/HEX/불투명도로 직접 색상 지정 → 리터럴 적용(포인트 추종 해제)
const onEditorColorInput = (key: string, format: 'color' | 'background', value: string) => {
  applyEditorColor(format, value || false)
  editorColorPick[editorColorKey(key, format)] = { value, index: null }
}

// 포인트 색상 스와치 클릭 → 같은 인덱스면 리터럴로 고정(해제), 아니면 var(--point-color-N)로 추종
// (추종값은 :root 변수를 따라 실시간 반영되고 이메일 내보내기 때 실제 색으로 치환된다)
const onEditorColorSelectPoint = (key: string, format: 'color' | 'background', index: number) => {
  const resolved = pointColorAt(wrapPointColors.value, index)
  if (editorColorActiveIndex(key, format) === index) {
    applyEditorColor(format, resolved || false)
    editorColorPick[editorColorKey(key, format)] = { value: resolved, index: null }
  } else {
    applyEditorColor(format, `var(${pointColorCssVar(index)}, ${resolved})`)
    editorColorPick[editorColorKey(key, format)] = { value: resolved, index }
  }
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
  const target = e.target as HTMLElement
  // 셀 정렬 메뉴: 메뉴 안(항목 클릭)과 토글 버튼은 각자 닫으므로 그 밖이면 닫는다
  if (
    cellAlignMenu.value.visible &&
    !cellAlignMenuEl.value?.contains(target) &&
    !target.closest('.rte-tb-btn--caret')
  ) {
    closeCellAlignMenu()
  }
  if (spacingPopover.value.visible) {
    // 행간·자간 팝오버: 팝오버 내부·Select 오버레이·토글 버튼 클릭은 유지
    if (
      !spacingPopoverEl.value?.contains(target) &&
      !target.closest('.p-select-overlay') &&
      !target.closest('.rte-tb-btn')
    ) {
      closeSpacingPopover()
    }
  }
  if (!colorPopover.value.visible) return
  if (colorPopoverEl.value?.contains(target)) return
  if (target.closest('.p-colorpicker-panel')) return // 컬러피커 그라데이션 패널
  if (target.closest('.ql-custom-color')) return // 다시 여는 토글 항목
  closeColorPopover()
}
const onDocKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return
  const hadPopover =
    spacingPopover.value.visible || colorPopover.value.visible || cellAlignMenu.value.visible
  if (cellAlignMenu.value.visible) closeCellAlignMenu()
  if (spacingPopover.value.visible) closeSpacingPopover()
  if (colorPopover.value.visible) closeColorPopover()
  // 팝오버를 닫는 Esc는 여기서 소비한다 — 전역 단축키(useKeyboardShortcuts)의 '선택 해제'까지
  // 함께 실행돼 편집 중인 모듈이 선택 해제되는 것을 막는다.
  if (hadPopover) e.stopPropagation()
}
onMounted(() => {
  document.addEventListener('mousedown', onDocPointerDown, true)
  // 캡처 단계 — PrimeVue Select/ColorPicker 오버레이가 Esc를 소비해도 팝오버가 닫히도록
  document.addEventListener('keydown', onDocKeydown, true)
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

  // 드롭다운(정렬·목록·글자크기·줄바꿈)을 열 때 에디터 선택이 풀리지 않게 한다.
  // 선택이 풀리면 Quill이 서식을 빈 값으로 갱신해 '현재 값' 표시(.ql-selected 하이라이트)가 사라진다.
  // (Quill Picker는 mousedown에서 열고 닫으므로 기본동작만 막아도 여닫기는 그대로 동작한다)
  const toolbarEl = quill.container.parentElement?.querySelector('.ql-toolbar')
  toolbarEl?.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest('.ql-picker-label')) e.preventDefault()
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

// 열 공통 정렬(레거시) — 열별 정렬 UI가 있던 시절의 값. 값이 남아 있는 테이블에서만 쓰인다.
const getColAlign = (colIndex: number): 'left' | 'center' | 'right' | null => {
  const aligns = (selectedModule.value?.properties.tableColAligns as string[] | undefined) || []
  const v = aligns[colIndex]
  return v === 'left' || v === 'center' || v === 'right' ? v : null
}

// 타입(제목/내용) 공통 정렬 — '테이블 스타일' 탭 값
const getTypeAlign = (type: 'th' | 'td'): 'left' | 'center' | 'right' => {
  const key = type === 'th' ? 'headerAlign' : 'cellAlign'
  const v = selectedModule.value?.properties[key]
  return v === 'left' || v === 'center' || v === 'right' ? v : type === 'th' ? 'center' : 'left'
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

// 셀에 실제 적용되는 정렬 — 렌더러(moduleContentReplacer)와 같은 우선순위여야
// '개별 스타일'의 활성 표시가 캔버스와 어긋나지 않는다.
// 셀별 지정 > 타입 공통(직접 고른 경우) > 열 공통(레거시) > 타입 기본값
const isTypeAlignSet = (type: 'th' | 'td'): boolean => {
  const v = selectedModule.value?.properties[type === 'th' ? 'headerAlign' : 'cellAlign']
  return v === 'left' || v === 'center' || v === 'right'
}
const getCellAlign = (cell: TableCell, colIndex: number): TableCellAlign => {
  if (cell.align) return cell.align
  if (isTypeAlignSet(cell.type)) return getTypeAlign(cell.type)
  return getColAlign(colIndex) ?? getTypeAlign(cell.type)
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

  // 포인트 색상을 따르는 중에 팔레트·HEX·투명도로 색을 직접 고르면 추종을 푼다.
  // 풀지 않으면 값만 바뀌고 렌더는 계속 포인트 색상으로 해소되어(resolvePointColors)
  // "골라도 아무 일도 안 일어나는" 것처럼 보인다.
  if (isUsingPoint(key)) togglePointColor(key, false)

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

<!-- 스타일은 src/assets/module-form.css 로 분리했다(1,600줄+).
     루트의 .module-form 클래스가 그 파일의 적용 범위를 대신한다. -->
