---
name: figma-builder
description: >-
  뉴스레터 빌더(auto-newsletter)의 Figma 디자인을 코드로 반영할 때 사용. 사용자가 Figma 링크(figma.com/design/... node-id=...)를
  주며 "이 디자인대로 반영/수정", "스타일 맞춰줘", "이 화면 구현" 등을 요청하면 이 스킬을 따른다. Figma를 MCP로 읽는 절차,
  이 코드베이스의 화면/스토어/모듈 매핑, 진행 중인 UI 개편(편집 패널 좌측 이동·전체 스타일/포인트 색상 분리[완료]·카테고리별 레일 메뉴·
  모듈 선택 속성 좌측 이전·캔버스 플로팅 툴바[진행 중])의 목표 상태를 담고 있다.
---

# figma-builder — Figma 디자인 → 뉴스레터 빌더 코드 반영

이 프로젝트(`d:\Projects\auto-newsletter`, Vue 3 + Pinia + PrimeVue + Tailwind)의 Figma 디자인을
코드로 옮길 때 쓰는 워크플로우. Figma 파일: **`뉴스레터 빌더`** (fileKey `dVrv1JssciJad7e9cREUIf`).

## 언제 사용하나
- 사용자가 `figma.com/design/...?node-id=...` 링크를 주며 디자인 반영/스타일 수정/화면 구현을 요청할 때.
- "속성 패널", "전체 스타일", "포인트 색상", "편집 패널 위치" 등 UI 개편 관련 요청.

## 1) Figma를 MCP로 읽는 절차 (컨텍스트·rate limit 절약)
1. URL에서 `fileKey`와 `nodeId` 추출 — `.../design/<fileKey>/...?node-id=<a-b>` → nodeId는 `a:b` 또는 `a-b`.
2. **구조 훑기**: `get_metadata`(가벼움)로 페이지/노드 트리 파악. node-id 없으면 top-level 페이지 목록만 반환.
3. **필요한 노드만** `get_screenshot`(비주얼) 또는 `get_design_context`(정확한 토큰/코드). 스크린샷은 URL 반환 → `curl -sL -o` 로 받아 Read로 확인.
4. 한 번에 여러 화면을 읽어야 하면 스크린샷 여러 개를 병렬 호출 후 순차 확인. 큰 화면 연속 `get_design_context`는 컨텍스트를 많이 먹으니 자제.
5. 색/간격 토큰이 필요하면 `get_variable_defs` 또는 design_context의 `data-node-id`·스타일값 사용.

## 2) 이 코드베이스 지도 (Figma 요소 → 코드)
| Figma / UI 영역 | 코드 위치 |
|---|---|
| 앱 셸(헤더+패널+캔버스) | `src/components/layout/AppLayout.vue` |
| 상단 헤더(로고·다운로드 버튼) | `src/components/layout/AppHeader.vue` (`showActions` prop, 로고=홈) |
| 좌측 모듈 팔레트(추가·검색·카테고리·썸네일) | `src/components/panels/ModulePanel.vue` (호버 프리뷰 iframe scale 기법) |
| 우측 속성 편집 패널 | `src/components/panels/PropertiesPanel.vue` (prop 타입별 렌더) |
| 모듈 순서/아웃라인·그룹 묶기 | `src/components/editor/ModuleOutlinePanel.vue` |
| 캔버스(모듈 렌더·호버 툴바·행별 컬럼) | `src/components/editor/CanvasArea.vue` |
| 전역 설정(배경·테두리·포인트색·폰트) | `src/stores/editorStore.ts` → `wrapSettings` |
| 모듈 데이터/조작/조립형 | `src/stores/moduleStore.ts` |
| 모듈 렌더 파이프라인(2경로) | `src/composables/useModuleRenderer.ts`(캔버스), `moduleStore.generateHtml()`(내보내기) — **둘 다 고쳐야 함** |
| 모듈 정의 | `public/modules/*.html` + `public/modules/modules-config.json`(editableProps) + `src/utils/moduleConfigs.ts`(렌더 폴백/프로세서) |
| 포인트 색상 적용 | `src/App.vue`(`--point-color` CSS 변수), `src/utils/pointColor.ts`(`resolvePointColors`) |
| 라우팅/화면 | `src/router/index.ts` (`/`, `/templates`, `/editor`), `src/views/*` |
| 커스텀 속성 UI 패턴 | PropertiesPanel의 prop 타입: `table-editor`, `additional-contents`, `sns-icons` 참고 |

핵심 개념(이미 구현됨): **행별 독립 컬럼 그룹 모델**(`ModuleGroup.rows[]` + `ModuleInstance.rowIndex`, `src/utils/groupLayout.ts`),
**조립형(v2) 모듈**(`buildComposedGroup`, 좌측 "모듈 v2" 탭).

## 3) 진행 중인 UI 개편의 목표 상태 (Figma 기준)
현재는 **좌=모듈추가 / 우=속성편집** 분리 구조. 신규 디자인은 **좌측 아이콘 레일 + 컨텍스트 패널**로 통합:

- **편집 패널이 오른쪽 → 왼쪽으로 이동.** 오른쪽 `PropertiesPanel` 제거, 좌측 패널이 컨텍스트에 따라 전환.
- **좌측 아이콘 레일** 메뉴(위→아래): 전체 스타일 · 포인트 색상 · 모듈 · 텍스트 · 이미지 · 버튼 · 테이블 · 구분선/여백 · AI 도구 · 모듈 순서.
- **"전체 스타일"**(구 "공통 속성") = 배경 색상 + **테두리 전체 설정**(실선/점선/파선/이중선 라디오 · 색상 · 두께 슬라이더) + 뉴스레터 요약. → `wrapSettings.backgroundColor/borderWidth/borderStyle/borderColor`.
- **"포인트 색상"이 별도 메뉴로 분리**, **최대 3개**. `+` 추가 버튼 + 스와치. 색상 피커 상단에 포인트 색상 퀵 스와치로 노출.
  - **데이터 모델 변경 필요**: `wrapSettings.pointColor`(단일) → **`pointColors: string[]`(≤3)**. `App.vue`의 `--point-color`를 `--point-color-1/2/3`로 확장(하위호환: 1번을 `--point-color`로도). `resolvePointColors`·색상 피커·`ColorAlphaPicker` 연동.
- **모듈 선택 시** 좌측 패널에 그 모듈의 **접이식 속성 섹션**(이미지/상단정보/구분선/타이틀/텍스트/버튼, 각 chevron+노출토글) 표시. → 기존 `PropertiesPanel` 내용을 좌측 패널로.
- **캔버스 우측 플로팅 툴바**: 선택 모듈 옆에 ↑/↓/복제/삭제 세로 아이콘 툴바. → 현재 `ModuleRenderer` 호버 버튼을 캔버스 고정 플로팅으로 이전.
- 상단바: 브레드크럼(`템플릿명 › 빌더`) · 실행취소/재실행 · PC/모바일 토글 · 저장상태/시각 · 다운로드 버튼들.

## 4) 참고 노드 인덱스 (fileKey `dVrv1JssciJad7e9cREUIf`)
| nodeId | 내용 |
|---|---|
| 316-2071 | 신규 에디터 전체 — 좌측 레일 + "전체 스타일"(배경/테두리/요약) |
| 328-2674 | 전체 스타일 — 테두리 펼침(스타일 라디오·색상·두께 슬라이더) |
| 334-2080 | 색상 피커 팝업 — 상단 포인트 색상 퀵 스와치 + 팔레트 + hex + 투명도 |
| 334-2492 | **포인트색상 메뉴** — `+` 추가 + 스와치 3개(최대 3) |
| 334-2630 | "모듈" 메뉴 — 검색·카테고리 탭(전체/공통/이미지형/텍스트형/1단/2단)·썸네일 목록 |
| 352-1138 | 모듈 선택 시 좌측 속성(접이식+노출토글) + 캔버스 우측 플로팅 툴바 |
| 365-2691 | 위와 동일, "이미지" 섹션 펼침(URL·alt·링크·여백 슬라이더) |
| 372-3000 | **"텍스트" 레일 메뉴** — 상단 빠른추가(타이틀/서브타이틀/텍스트, `+` 카드) + 텍스트형 모듈 **카드 내 상시 썸네일** 갤러리 |
| 378-1704 | 텍스트 모듈("섹션 타이틀") 선택 속성 — 1단/2단 세그먼트, 폰트크기 스테퍼(−/+), 행간·자간 드롭다운, 리치텍스트 툴바(B/I/U/S·정렬·리스트·글자색/형광펜/잉크마커·링크), 텍스트에어리어, 여백/배경색/상단테두리 토글 |
| 412-2139 | **"이미지" 레일 메뉴** — 단일/2단 이미지 빠른추가 카드 + 이미지형 모듈 상시 썸네일 갤러리 |
| 408-1758 | 단일 이미지 모듈 선택 속성 — 이미지 URL·이미지 설명(접근성 힌트) 상시 노출 + 링크추가/모서리둥글기/테두리/여백 각각 chevron+토글 행 |
| 415-2553 | **"버튼" 레일 메뉴** — 단일 버튼 추가·2단 버튼 추가 빠른추가 카드만(갤러리 없음). ⚠️ 패널 제목 레이어가 "텍스트"로 잘못 남아있음(복붙 흔적) — 구현 시 "버튼"으로 |

**아직 링크 못 받음** (요청 시 이어서 확인): "테이블" · "구분선·여백" 레일 메뉴, "버튼"/"테이블" 모듈 선택 속성 패턴, 우측 플로팅 툴바 단독 노드.

**모듈 카드 상시 썸네일**(372/412/334-2630): 카드에 렌더 썸네일을 처음부터 표시(호버 X). → **구현됨**:
`ModulePanel.vue`에서 호버 floating 프리뷰 제거, 카드 안 `iframe`(680px 렌더 → `scale(0.385)` 크롭) + IntersectionObserver 지연 렌더로 교체.

## 6) 카테고리별 좌측 레일 메뉴 (텍스트/이미지/버튼/테이블/구분선·여백)

**핵심 인지 사항 (사용자 명시)**: 지금 코드에서 텍스트·이미지·버튼·테이블·구분선/여백은 `ModulePanel.vue` **안의 카테고리 탭**(전체/공통/이미지형/텍스트형/1단/2단)일 뿐이다. 신규 디자인에서는 이 카테고리들이 **좌측 아이콘 레일의 독립된 메뉴 항목**(이미 `EditorSidebar.vue`에 자리는 있음: 텍스트·이미지·버튼·테이블·구분선·여백)이 되어, 클릭하면 "모듈" 메뉴 전체가 아니라 **그 카테고리 전용 좌측 패널**이 뜬다. `activeMenu`가 이미 이 값들을 갖고 있으나 아직 각 메뉴에 실제 콘텐츠가 연결되어 있지 않다(전체 스타일/포인트 색상만 연결됨, `AppLayout.vue`).

패널 공통 구조:
1. **상단 타이틀** (해당 카테고리명, 20px medium)
2. **빠른추가 카드 목록**: 흰 배경 + 테두리 rounded-8 카드, 좌측 텍스트(추가할 요소명, 예: "타이틀 추가"/"단일 이미지 추가"/"단일 버튼 추가") + 우측 `add_2` "+" 아이콘. 클릭하면 해당 요소(모듈 또는 모듈 안의 서브 콘텐츠)를 캔버스에 즉시 추가. 이미지/버튼처럼 시각 미리보기가 있는 카드는 위쪽에 목업 썸네일이 붙는다(372/412/415 참고).
3. **(텍스트·이미지만 확인됨) 카테고리 갤러리**: "OO형 모듈" 라벨 + 그 카테고리에 속하는 완성형 모듈들을 상시 썸네일 카드로 나열(기존 `ModulePanel.vue`의 카드/썸네일 로직 재사용 가능 — 카테고리로 이미 필터링된 상태로 렌더하면 됨). **버튼 메뉴(415-2553)에는 이 갤러리가 없음** — 빠른추가 카드 2개뿐. 테이블/구분선·여백은 미확인이라 갤러리 유무 불명.

~~**모듈순서 레일 메뉴 = 신규 디자인 아님.**~~ **(2026-08-11 폐기 — Figma 969-7308/969-7165으로 신규 디자인을 받았다. 아래 Phase 18 참고.)**
모듈 순서는 **좌측 컨텍스트 패널이 아니라 캔버스 오른쪽의 접이식 패널**이다. `activeMenu`에서 `'order'`는 제거됐고, 레일의 '모듈 순서' 버튼은 `editorStore.toggleOrderPanel()`만 호출한다(좌측 패널은 그대로 둔다).

### 6-1) ⭐ 새 UI는 레거시 모듈이 아니라 **모듈 v2(조립형)를 기본으로 적용한다** (사용자 명시, 중요)

지금까지 프로덕션에서 쓰던 건 레거시 단일 모듈(`public/modules/*.html`)이고, `ModulePanel.vue`의 "모듈 v2" 탭은 "[임시] 조립형 모듈 v2 (POC)"로 표시된 실험 기능이었다. **이 방향이 바뀐다**: 새 카테고리 레일 메뉴(6번 섹션)의 빠른추가 카드·갤러리는 **v2 조립형 모듈을 기본값으로 노출**한다. 나중에 저장된 템플릿들도 v2 기반으로 재구성될 예정(아직 미착수).

- **좋은 신호**: `moduleStore.ts`에 이미 v2 조립형 템플릿 13개가 구현돼 있다 — `addComposedModule02/04/011/05/051/06/07(+Reverse)/NewsHeader/BasicHeader/ImageHeader/MultiImage/Footer/TwoButton`. Figma 텍스트·이미지형 갤러리(372-3000/412-2139)에 나온 카드 이름("모듈 02", "모듈 04", "모듈 05", "모듈 06" 등)이 이 목록과 거의 겹친다 — **완전히 새로 만드는 게 아니라 지금 "실험용 임시 탭"에 숨겨둔 걸 정식 UI로 승격**하는 작업에 가깝다. (단, "모듈 01"/"모듈 01-2"/"모듈 11" 등 정확히 안 맞는 번호도 있어 1:1 매핑을 맹신하지 말고 스크린샷으로 재확인할 것.)
- **v2 템플릿이 아직 없는 카테고리(예: 테이블형) 처리 방침(사용자 확정)**: **레거시 모듈을 당분간 그대로 유지**한다. 새 카테고리 갤러리에서 v2 템플릿이 있으면 그걸, 없으면 레거시 모듈을 보여주는 식으로 **카테고리별로 점진적 전환**. v2 쪽이 채워지는 대로 하나씩 레거시를 교체 — 한 번에 전체를 갈아엎지 않는다. 기능 손실 없이 진행하는 게 최우선.
- **원소 모듈(element module)**: v2의 조립 단위인 "단일 이미지·타이틀·텍스트·단일 버튼" 등 개별 원소 모듈이, 새 UI의 "빠른추가" 카드(예: "타이틀 추가"/"단일 이미지 추가")가 캔버스에 넣는 대상과 사실상 같은 것으로 보인다 — 카테고리 메뉴의 빠른추가 = 원소 모듈 단독 추가, 카테고리 갤러리 = 완성된 조립(`buildComposedGroup`) 템플릿, 으로 매핑해서 구현할 것.
- **연결된 향후 과제**(기존 "향후 방향" 섹션 참고): v2 그룹의 원소 모듈 노출/비노출을 지금은 `show*` 스위치 토글로 하지만, 앞으로 "그룹 안 원소 모듈을 삭제"하는 방식으로 바꿀 예정 — 이것도 v2를 메인으로 승격하는 이번 방향과 같은 축의 작업이다.

## 7) 모듈 선택 시 좌측 속성 패턴 (우측 `PropertiesPanel` → 좌측 이전)

`352-1138`/`365-2691`/`378-1704`/`408-1758`를 종합하면 모듈 타입에 따라 두 가지 표현 방식이 있다:

- **복합형 모듈**(헤더처럼 여러 서브요소로 구성): 서브요소별로 그룹 카드 하나씩 — **좌측 chevron(펼침/접힘) + 우측 노출 토글**을 가진 행(예: 이미지/상단정보/구분선/타이틀/텍스트/버튼). 펼치면 그 서브요소의 세부 필드가 나온다(365-2691: "이미지" 펼침 → URL·설명·링크·여백).
- **단일 목적 모듈**(단일 이미지, 텍스트 섹션처럼 모듈 전체가 하나의 콘텐츠): 핵심 필드(URL/텍스트 등)는 **항상 펼쳐진 상태로 상단에 노출**, 부가 옵션(링크/모서리둥글기/테두리/여백, 또는 여백/배경색/상단테두리)만 **chevron+토글 행**으로 접혀 있다(408-1758, 378-1704 하단).

공통 규칙: 토글 OFF = 해당 스타일/요소 미적용(예: 테두리 없음), 토글 ON + chevron 펼침 = 세부값 편집 가능. 이 토글+chevron 행 패턴은 이미 이번 세션에서 만든 `GlobalStylePanel.vue`의 테두리 토글과 컨셉이 같으므로 재사용/일반화를 고려할 것(공용 아코디언+토글 행 컴포넌트로 뽑는 것도 방법).

**캔버스 쪽 변화(선택된 모듈에 부착)**:
- **우측 세로 플로팅 툴바**: 흰 카드(border+그림자, rounded-12) 안에 위→아래로 **삭제(delete) · 복제(content_copy) · 위로이동 · 아래로이동** 4개 아이콘. 위/아래 이동은 같은 `arrow_downward` 아이콘을 위쪽 것만 180도 뒤집어 재사용(별도 아이콘 에셋 아님).
- **좌측 드래그 핸들**(신규 확인, 이전에 미기록): 모듈 왼쪽 바깥에 작은 흰 카드(rounded-left) + `drag_indicator`(⣿) 아이콘. 지금의 캔버스 호버 버튼(위치 `ModuleRenderer.vue`쪽)을 이 좌우 분리된 고정 UI로 교체하는 것으로 보임.

## 구현 현황 (개편 진행)
- **Phase 1 완료**: Material Symbols 폰트 추가(`index.html`), **헤더 재디자인**(`AppHeader.vue` — 브레드크럼·**undo/redo 아이콘 버튼**(Material `undo`/`redo`, `getHistoryInstance`)·PC/모바일 토글(`desktop_windows`/`smartphone`)·저장상태·다운로드, 에디터에서만 `showActions`), **좌측 아이콘 레일**(`EditorSidebar.vue`, `editorStore.activeMenu`) `AppLayout`에 추가.
- **Phase 2 완료(이번 세션)**: `activeMenu==='style'/'point'` 배선 — **`GlobalStylePanel.vue`**(배경색·폰트·테두리 토글+라디오+슬라이더·뉴스레터 요약)와 **`PointColorPanel.vue`**(포인트 색상 최대 3개, `+`추가/삭제/활성전환) 신설, `AppLayout.vue`에서 `ModulePanel`과 스위칭. 공용 색상 팝오버 **`ColorPopoverPicker.vue`**(퀵스와치+기본팔레트+hex+투명도+inline 그라디언트/휴 피커) 신설. 우측 `PropertiesPanel`의 옛 "공통 속성" 아코디언은 제거함.
  - **포인트 색상 데이터 모델 전환 완료**: `wrapSettings.pointColors: string[]`(≤3) 추가, `pointColor`(단일)는 `pointColors[0]`과 항상 동기화되어 렌더/내보내기 파이프라인은 그대로 유지(`editorStore.ts`의 `updateWrapSettings`/`addPointColor`/`setActivePointColor`/`removePointColor`).
  - **"포인트 색상으로 사용" 개편 완료**: 체크박스 → **`PointColorSwatchRow.vue`**(필드 아래 한 줄, 최대 3개 중 클릭해 선택/해제)로 교체. `properties[key]__usePoint`(bool) + 신규 `properties[key]__pointIndex`(0~2) 저장. `resolvePointColors`/`resolveGroupStyles`가 배열+인덱스 기반으로 해소(`src/utils/pointColor.ts`, `src/utils/groupStyle.ts`). `PropertiesPanel.vue`(모듈 색상 필드)·`GroupPropertiesPanel.vue`(그룹 배경/테두리) 양쪽 적용. **Quill 리치텍스트 안의 "포인트 색상으로 사용"은 미포함**(여전히 단일 `--point-color` CSS 변수, index 0 고정) — 확장하려면 `--point-color-1/2/3` CSS 변수 인프라가 별도로 필요.
- **Phase 3 완료(2026-07-18)**: 텍스트/이미지/버튼 레일 메뉴 + 모듈 선택 좌측 속성 + 캔버스 툴바/드래그 핸들.
  - **`CategoryModulePanel.vue`**(신규, `category: 'text'|'image'|'button'` 공통): 빠른추가 카드(원소 모듈, 항상 `moduleStore.addModule()`) + 카테고리 갤러리(`moduleStore.composedBuilderMap`에 있으면 v2 조립형, 없으면 `addModule` 폴백). 썸네일은 `useModuleThumbnails.ts`(신규 컴포저블, `ModulePanel.vue`와 공유)로 추출.
  - **`SelectedItemPanel.vue`**(신규): 모듈/그룹 선택 시 좌측에 표시. 그룹 선택 시 멤버 목록(chevron+**삭제 아이콘** — 토글 아님, 삭제=비노출)을 보여주고, 멤버를 펼치면 그 자리에 `ModuleForm.vue`가 인라인 렌더(전역 `selectedModuleId`를 "펼침 상태"로 재사용). 그룹 스타일은 `GroupPropertiesPanel.vue`를 그대로 재배치. 단독 모듈은 `ModuleForm.vue`를 그대로 표시.
  - **`ModuleForm.vue`**(신규, `PropertiesPanel.vue`에서 로직 변경 없이 추출): 우측 `PropertiesPanel.vue`(당분간 유지)와 좌측 `SelectedItemPanel.vue`가 동일 컴포넌트를 공유 — 두 곳에서 항상 동일하게 동작함을 확인.
  - **`AppLayout.vue` 좌측 패널 우선순위**: 캔버스 선택(`hasSelection`) > 레일 메뉴. 단 `editorStore.forceRailPanel` 플래그로 예외 처리 — 레일 메뉴를 명시적으로 클릭하면(`setActiveMenu`가 켬) 선택이 남아있어도 그 메뉴 패널을 보여주고(그래야 레일 클릭이 무반응처럼 안 보임), `moduleStore`의 `selectedModuleId`/`selectedGroupId` watcher가 **새 선택**이 생기면(캔버스 클릭이든 `addModule`의 자동 선택이든) 자동으로 꺼서 속성 패널로 되돌린다. → "그룹 멤버 선택 후 카테고리 메뉴에서 원소 모듈 추가 → 그 그룹에 삽입" 흐름이 이 플래그 덕에 끊기지 않음.
  - **캔버스 툴바/핸들**: `ModuleRenderer.vue`의 상단 가로 pill → 우측 세로 카드(삭제·복제·위·아래, `isSelected || hover` 노출)로 교체. `CanvasArea.vue`의 좌측 `dh-top` 바 → Figma 스펙의 흰 카드+`drag_indicator` 아이콘으로 교체(클래스명 `dh-top`은 유지 — vuedraggable `handle` 옵션 의존). 그룹 헤더 바는 라운드/그림자만 가볍게 다듬음(구조 불변).
  - **미구현**: 테이블/구분선·여백 레일 메뉴 콘텐츠(Figma 스펙 없음), `EditorToolbar`의 PC/모바일 중복 제거, 모듈순서 메뉴 ↔ `ModuleOutlinePanel` 배선(지금도 항상 별도 렌더되지만 레일의 `order` 메뉴와는 아직 안 이어짐).
- **Phase 4 완료(2026-07-18)**: `ModuleForm.vue` 필드 레벨 스타일링 (Figma 372-3000/378-1704/412-2139/408-1758 기준) — 인풋 필드·셀렉트·텍스트 에디터·컬럼분할 버튼·행간·자간·폰트크기·여백 필드.
  - **공통 필드 토큰**(`.gg-*` 클래스): 라벨 15px `#4e5968`, 힌트 14px `#6b7684`, 텍스트/URL 필드는 filled `#f2f4f6` 배경 h-40 rounded-8, 셀렉트는 흰 배경+`#e5e8eb` 테두리 h-40, 토글 행은 `justify-between` + 16px `#333d4b` 라벨 + 36×20 ToggleSwitch.
  - **컬럼분할**: "컬럼 추가"/"되돌리기" 버튼을 세그먼트 필(`.gg-segment` — 좌: 진한 `#4e5968` 채움, 우: 흰 배경+테두리)로 교체. 클릭 핸들러(`splitSelectedModule`/`unsplitSelectedModule`)는 완전히 그대로.
  - **폰트 크기 필드**: `prop.key`가 `FontSize`로 끝나는 텍스트 필드(`isFontSizeField`)를 스테퍼(−/값/+, `.gg-stepper`)로 렌더. 값 포맷(`"22px"` 문자열)은 기존과 동일하게 유지(`adjustFontSize`가 파싱 후 다시 `${n}px`로 저장).
  - **행간/자간 외부 분리(핵심 회귀 리스크 항목)**: Quill 툴바 안의 `<select class="ql-lineHeight/ql-letterSpacing">`를 제거하고, 에디터 바로 위에 별도 PrimeVue `Select` 2개(`.rte-ext-row`)로 이전. 내부적으로 색상 팝오버와 동일한 "필드별 Quill 인스턴스 추적" 패턴(`quillByKey`/`quillRangeByKey`, `onEditorLoad(event, key)`)을 재사용 — `applyLineHeight`는 `quill.format('lineHeight', value, 'user')`(블록 스코프), `applyLetterSpacing`은 선택범위 있으면 `formatText`, 없으면 `setSelection`+`format`(인라인 스코프). 드롭다운 표시값은 `selection-change`/`text-change` 리스너로 `editorFormatState[key]`에 동기화. Playwright로 실제 `line-height`/`letter-spacing` 인라인 스타일이 적용되는 것까지 검증 완료(동일 기능 유지 확인).
  - **검증**: `npx vue-tsc --noEmit` 클린, `npx vitest run` 362개 전부 통과, Playwright로 텍스트/이미지 모듈 좌·우 양쪽 패널에서 필드 스타일 및 행간·자간·폰트크기 스테퍼·세그먼트 버튼 동작 확인.
  - **미구현/보류**: 여백(padding/margin) 필드는 4방향 개별 `text` px 필드 그대로 유지하고 공통 필드 토큰만 적용 — Figma에서 "여백" 행이 펼쳤을 때의 lock 아이콘+슬라이더 레이아웃이 캡처되지 않아 재설계는 보류. 리치텍스트 툴바의 나머지 버튼(B/I/U/S/정렬 등)은 Quill 기본 아이콘을 유지한 채 여백/테두리만 다듬음(Figma 아이콘 글리프로 전량 교체는 안 함).
- **Phase 5 완료(2026-07-18)**: 여백 잠금 슬라이더(Figma 365-2691) · 필드 오버플로우 수정 · 그룹 헤더 바 플로팅 툴바화.
  - **여백/패딩 4방향 잠금 슬라이더**: `ModuleForm.vue`에 `isQuadStart`/`isQuadMember`(modules-config의 `...Top/Right/Bottom/Left` 4연속 키 패턴을 감지, 모든 `padding*`/`margin*`/`buttonPadding*`/`logoPadding*` 등 접두사에 범용 적용) + `.gg-margin-quad`(잠금 아이콘 토글, 잠금 시 슬라이더+필드 하나로 4방향 동시 조정, 해제 시 상/우/하/좌 2×2 그리드로 개별 조정). 기존 `paddingTop` 등 개별 prop 저장 방식은 그대로(`updateProperty`를 4번 호출)라 하위호환 문제 없음. Playwright로 슬라이더 드래그 → 4방향 모두 반영 → 잠금 해제 시 그리드 값 유지까지 확인.
  - **좌측 패널 필드 오버플로우 수정**: 360px 패널(Figma 스펙 그대로 유지, 패널 자체는 넓히지 않음) 안에서 컬러 필드 행(`ColorAlphaPicker`+`HexColorInput`)이 `scrollWidth > clientWidth`로 잘리던 문제 — 원인은 `HexColorInput`(내부 `<input>`)이 `flex-1`만 있고 `min-width:0`이 없어 flexbox가 content 폭 밑으로 못 줄인 것. `min-w-0` 추가(`ModuleForm.vue` 색상 필드 2곳 + Quill 팝오버, `GroupPropertiesPanel.vue` 배경/테두리 색상 2곳) + `ColorAlphaPicker`의 투명도 `InputNumber` 폭을 4.5rem→3.5rem로 축소. Playwright로 `scrollWidth === clientWidth` 확인.
  - **그룹 헤더 바 리스킨**: `CanvasArea.vue`의 `.group-header`(그룹 상단 바, 드래그 핸들 겸용) — 보라색 PrimeIcons 팔레트 → 흰 배경+`#e5e8eb` 테두리+그림자(모듈 우측 플로팅 툴바와 동일 톤) + Material Symbols 아이콘(`content_copy`/`link_off`/`tune`/`delete`)로 교체. 선택 상태는 `#ebf3ff`+`#4083f3` 테두리(파란 액센트로 통일). 클릭 핸들러는 전부 그대로(복제/해제/스타일편집/삭제 동작 불변) — Playwright로 복제·삭제 확인 다이얼로그까지 확인.
  - **검증**: `npx vue-tsc --noEmit` 클린, `npx vitest run` 362개 통과, Playwright로 여백 슬라이더/오버플로우/그룹 헤더 액션 모두 확인.

- **Phase 6 완료(2026-07-18)**: `ModuleForm.vue`의 PrimeVue `Panel`(named prop group) → Figma 352-1138 접이식 헤더로 교체 + `ModulePanel.vue` v2 스왑.
  - **named prop 그룹 헤더 리스킨**: `<component :is="group.name ? 'Panel' : 'div'">` 방식을 걷어내고, 항상 `<div>`로 감싼 뒤 `group.name`이 있을 때만 `.gg-acc-header`(Phase 4/5에서 이미 만든 클래스 재사용) 커스텀 헤더를 그 위에 얹는 방식으로 변경 — 거대한 prop-type 렌더 블록(900줄+)은 단 한 번도 중복 없이 그대로 재사용(추가 조건 하나만 v-show에 덧붙임). PrimeVue Panel의 `togglericon`/`pt`/`onPanelHeaderClick` 관련 코드는 전부 제거.
  - **그룹 전체를 켜고 끄는 토글을 판넬 헤더로 승격**: `groupHeaderToggle(group)` — 그룹의 첫 prop이 boolean이고 나머지 전부가 그 prop을 참조하는 showWhen이면(예: "로고" 그룹의 `showLogo`), 그 토글을 본문에서 빼서 헤더의 chevron 옆에 배치. 판넬을 열지 않아도 켜고 끌 수 있음(Figma 352-1138의 "구분선/타이틀/텍스트/버튼" 토글 행과 동일 패턴). 조건에 안 맞는 그룹(예: "헤더 타이틀")은 chevron만 있는 헤더로 표시.
  - **`ModulePanel.vue` "모듈" 탭 v2 스왑**: 기존엔 `addModule()`이 항상 레거시 단일 모듈만 추가했음 — `CategoryModulePanel.vue`의 `onGalleryAdd`와 동일하게 `moduleStore.composedBuilderMap[module.id]`를 먼저 확인해 v2 조립 빌더가 있으면 그걸 쓰고 없으면 폴백하도록 수정. `composedBuilderMap`에 있는 14개(Module02/04/011/05/051/06/07(+Reverse)/NewsHeader/BasicHeader/ImageHeader/MultiImage/Footer/TwoButton)는 이제 "모듈" 탭에서 클릭해도 v2 그룹으로 추가된다.
  - **확인된 기존 동작(버그 아님)**: `buildComposedGroup()`은 그룹 생성 후 `selectedModuleId`만 설정하고 `selectedGroupId`는 null로 둔다(첫 멤버 선택) — 좌측 `SelectedItemPanel`은 `selectedModule.groupId`로 그룹을 역으로 찾아내 정상적으로 "그룹 구성"을 보여주지만, 우측 `PropertiesPanel`은 `moduleStore.selectedGroup`(= `selectedGroupId` 전용)에만 의존해 그룹 대신 첫 멤버의 `ModuleForm`을 보여준다. 좌/우 패널의 "그룹 인식" 방식이 다른 기존 동작이며 이번 스왑과 무관 — 필요시 향후 별도로 통일 고려.
  - **검증**: `npx vue-tsc --noEmit` 클린, `npx vitest run` 362개 통과, Playwright로 (1) "로고" 그룹 헤더 토글이 판넬 열기 전에 상태를 보여주고 클릭 시 정상 on/off, (2) "헤더 타이틀" 등 토글 없는 그룹은 chevron만 노출, (3) "모듈" 탭에서 "뉴스 헤드라인 헤더" 클릭 시 5개 멤버짜리 v2 그룹(`member-row` 5개, 좌측 패널 "그룹 구성")으로 추가되는 것까지 확인.

- **Phase 7 완료(2026-07-18)**: 그룹 상단 띠(그룹 헤더 바) 제거 → 좌측 드래그 핸들 왼쪽에 세로 액션 툴바로 이전.
  - `CanvasArea.vue`의 `.group-header`(그룹 · N개 모듈 라벨 + 복제/해제/스타일/삭제 아이콘이 있던 상단 가로 띠)를 완전히 제거. 대신 `.group-action-toolbar`(모듈 우측 플로팅 툴바와 동일 톤의 흰 카드, `left: -81px`)를 새로 만들어 좌측 드래그 핸들(`left: -32px`) 바로 왼쪽에 배치 — 같은 4개 아이콘(복제·해제·그룹 스타일·삭제)을 그대로 이전.
  - **레이아웃 여유 확보**: 좌측 목차 레일(`ModuleOutlinePanel`, 약 40px)과 캔버스 사이 여백이 기존 `p-8`(32px)뿐이라 드래그 핸들(-32px)은 딱 맞았지만 새 액션 툴바(-81px)는 목차 레일과 겹쳐 클릭이 막혔다(Playwright로 실제 클릭 실패 확인 — 목차 레일 엘리먼트가 pointer-event를 가로챔). `CanvasArea.vue` 캔버스 스크롤 컨테이너의 좌측 패딩을 `p-8`→`pl-28`(112px)로 넓혀 해결(다른 변은 그대로: 상/우 32px, 하 128px).
  - 그룹 선택/클릭은 `.group-box`의 `@click.self="selectGroupBox"`로 계속 동작(헤더 바 제거로 없어진 "헤더 클릭 시 선택" 기능 대체). 액션 버튼 클릭 핸들러(`duplicateGroup`/`ungroup`/`selectGroupBox`/`confirmDeleteGroup`)는 전부 그대로.
  - **검증**: `npx vue-tsc --noEmit` 클린, `npx vitest run` 362개 통과, Playwright로 헤더 바 소멸(`group-header` count 0) + 새 툴바 클릭 성공(그룹 복제 시 `.group-wrap` 개수 1→2) + 개별 모듈 우측 툴바 영향 없음(기존처럼 클릭 성공) 확인.
  - **추가 수정(같은 날)**: `.group-action-toolbar`가 호버 시에만 보이면 클릭하려고 마우스를 옮기는 순간 사라져 조작이 어렵다는 피드백 — `opacity:0/pointer-events:none` 기본값과 `.group-wrap:hover`/`.is-visible` 노출 조건을 제거하고 **항상 노출**로 변경(개별 모듈의 우측 툴바·좌측 드래그 핸들은 호버 조건 그대로 유지 — 그룹 액션만 예외).

- **Phase 8 완료(2026-07-18)**: 그룹 구성 패널 chevron 방향 통일 · 중복 타이틀 제거 · 그룹 실제 이름 표시.
  - **chevron 방향 통일**: `SelectedItemPanel.vue`의 그룹 멤버 행이 `pi-chevron-up`(펼침)/`pi-chevron-down`(접힘)을 쓰던 걸 `GroupPropertiesPanel.vue`의 `.gg-acc-header`와 동일한 `pi-chevron-down`(펼침)/`pi-chevron-right`(접힘)로 통일.
  - **`ModuleForm.vue`의 자체 상단 타이틀(`gg-panel-title`) 완전 제거**: 그룹 멤버를 펼쳤을 때 "멤버 행 라벨"과 "ModuleForm 내부 타이틀"이 같은 이름을 두 번 보여주는 중복이 있었음 — `ModuleForm.vue`에서 그 타이틀 블록과 전용 CSS를 삭제(다른 곳에 이미 있는 타이틀들: 멤버 행 라벨, `SelectedItemPanel`/`PropertiesPanel`의 헤더로 충분).
  - **그룹에 실제 이름 부여**: `ModuleGroup` 타입에 `name?: string` 추가. v2 조립형 템플릿으로 그룹을 만들 때(`CategoryModulePanel.onGalleryAdd`, `ModulePanel.addModule`, "모듈 v2" POC 탭의 14개 핸들러) 클릭한 모듈의 실제 이름(`module.name`, 예: "모듈 02번")을 새 `moduleStore.setGroupName(groupId, name)`으로 그룹에 저장. `duplicateGroup`도 이름을 승계. `SelectedItemPanel.vue`의 "그룹 구성" 타이틀을 `{{ activeGroup?.name || '그룹 구성' }}`로 변경 — 이름이 있으면 그걸(예: "모듈 02번"), 없으면(컬럼 분할 등으로 만든 임의 그룹) 기존처럼 "그룹 구성"을 보여준다.
  - **검증**: `npx vue-tsc --noEmit` 클린, `npx vitest run` 362개 통과, Playwright로 그룹 생성 직후 좌측 타이틀이 실제 모듈명("모듈 02번")으로 뜨는 것 + 멤버 확장 시 중복 타이틀 없이 바로 필드가 나오는 것 + 모든 chevron이 collapsed 상태에서 `>`로 통일된 것 확인.

- **Phase 9 완료(2026-07-18)**: Quill 리치텍스트 "포인트 색상으로 사용"을 3개 인덱스 지원으로 확장(Phase 2에서 미룬 항목).
  - **CSS 변수 인프라**: `--point-color`(레거시 단일) → `--point-color-0/1/2`(인덱스별)로 확장. `App.vue`가 `wrapSettings.pointColors` 배열 전체를 watch해 세 변수를 모두 `:root`에 주입(`--point-color`는 0번 별칭으로 계속 유지 — 하위호환).
  - **`src/utils/pointColor.ts`**: `pointColorCssVar(index)` 헬퍼 + `resolvePointColorVars(html, pointColors)` 추가 — `var(--point-color-N, ...)`과 인덱스 없는 레거시 `var(--point-color, ...)`(0번으로 간주) 둘 다 치환. 기존 단일용 `resolvePointColorVar`는 테스트 호환을 위해 그대로 남겨둠(신규 코드는 안 씀).
  - **내보내기 연결**: `moduleStore.ts`의 `generateHtml`/`renderModulePreview` 두 곳에서 `resolvePointColorVar(html, wrapSettings.pointColor)` → `resolvePointColorVars(html, wrapSettings.pointColors)`로 교체.
  - **`ModuleForm.vue`의 Quill 커스텀 색상 팝오버**: "포인트 색상으로 사용" 체크박스+스와치 1개 → `popoverPointIndex: number|null` 상태 + `PointColorSwatchRow`(다른 색상 필드와 동일한 컴포넌트)로 교체, 최대 3개 중 클릭 선택/재클릭 해제. 팝오버를 열 때 현재 서식 값에서 `--point-color-(\d)` 정규식으로 인덱스를 역추출(레거시 인덱스 없는 값은 0번으로 해석)해 스와치 활성 상태를 복원.
  - **검증**: `pointColor.test.ts`에 `resolvePointColorVars` 테스트 8개 추가(총 370개 통과), `npx vue-tsc --noEmit` 클린, Playwright로 포인트 색상 3개 등록 → Quill 텍스트 선택 → 팝오버에 스와치 3개 노출 → 3번째 클릭 시 실제로 `var(--point-color-2, ...)`가 본문에 적용되는 것까지 확인.

- **Phase 10 완료(2026-07-18)**: 폰트 크기 스테퍼 적용 범위 버그 수정 + 값 직접 타이핑 지원.
  - **감지 정규식 버그**: `isFontSizeField`가 `/FontSize$/`(대문자 F로 시작하는 접미사만) 검사해 `ModuleDescText`의 단독 키 `fontSize`(소문자 f로 시작 — 접두사 없음)를 놓치고 있었음 — 실제 modules-config.json 전수 조사로 발견. `/fontsize$/i`(대소문자 무관)로 수정해 58개 접두사형 + 1개 단독형 모두 스테퍼로 렌더.
  - **값 직접 입력**: `.gg-stepper-value`를 `<span>`(읽기 전용) → `<input type="number">`로 교체. 타이핑 중엔 스토어를 건드리지 않고 `@change`(blur/Enter)에서만 `onFontSizeInput`으로 확정 반영 — +/- 버튼(`adjustFontSize`)과 동일하게 8~72px로 클램프.
  - **검증**: `npx vue-tsc --noEmit` 클린, `npx vitest run` 370개 통과, Playwright로 이전엔 스테퍼가 안 뜨던 "설명 텍스트" 모듈의 "기본 글자 크기" 필드가 이제 스테퍼로 뜨는 것 + 값 타이핑("42"+Enter) 후 +/- 버튼이 그 값 기준으로 이어서 동작하는 것까지 확인.

- **Phase 11 완료(2026-07-18)**: 그룹 좌측 드래그 핸들 + 액션 툴바를 한 장의 카드로 병합, 항상 노출.
  - **병합 배경**: Phase 7에서 그룹 액션 툴바(복제·해제·스타일·삭제)를 드래그 핸들 왼쪽에 별도 카드로 추가했는데(호버 조건), 이후 액션 툴바만 항상 노출로 바꿨고(직전 턴) 드래그 핸들은 여전히 호버/그룹-선택 시에만 보여 두 카드가 따로 놀았음 — 사용자가 스크린샷으로 "두 카드를 하나로 합치고 핸들도 계속 보이게" 요청.
  - **`CanvasArea.vue`**: `.module-drag-handle`(그룹용 사용 제거, 표준 모듈은 계속 사용) + `.group-action-toolbar` 두 카드를 `.group-side-toolbar` 한 장으로 병합 — 위에서부터 드래그 핸들(`.dh-top.group-side-handle`, drag_indicator 아이콘) → 얇은 구분선(`.group-side-divider`) → 액션 버튼 4개(`.group-action-btn`, 전부 `no-drag`로 드래그 오예외 처리). 위치는 그룹 왼쪽(`left: -49px`, 카드 하나로 줄어 기존 두 카드 합산 폭보다 좁아짐), `opacity`/`pointer-events` 조건 없이 항상 노출.
  - **드래그 동작 보존**: `handle=".dh-top"`는 이제 병합 카드 안의 핸들 세그먼트에만 있고, 액션 버튼들은 `no-drag`로 SortableJS의 드래그 시작을 막아 클릭과 드래그가 충돌하지 않음.
  - **검증**: `npx vue-tsc --noEmit` 클린, `npx vitest run` 370개 통과, Playwright로 `.group-side-toolbar` 카드 1개로 병합된 것(구 `.group-action-toolbar`/`.module-drag-handle` 잔존 0개) + 호버 없이도 `opacity:1`로 항상 보이는 것 + 복제 버튼이 여전히 정상 동작하는 것까지 확인.

- **Phase 12 완료(2026-07-19)**: 모듈 속성(`ModuleForm.vue`) 필드를 "전체 스타일"(`GlobalStylePanel.vue`) 패턴에 맞춰 테두리·색상·여백 3영역 통일. 사용자 확정: 색상="팝오버+추종 유지", 테두리="전체 블록 통일". 순수 렌더 계층만 수정(modules-config.json 불변, 저장 포맷 불변).
  - **여백(quad) 감지 순서 무관화**: `isQuadStart`/`quadRight·Bottom·Left`를 위치(`props[topIndex+1..+3]`) 기반 → **키 조회**(`props.find(p=>p.key===prefix+'Right')`) 기반으로 전환. `ModuleDivider "구분선, 여백"`의 `padding*`가 Top/**Bottom/Left/Right** 순서라 quad 감지가 안 돼 개별 4필드로 새던 문제 해결 → 단일 잠금 슬라이더로 묶임(config 전수 조사상 유일한 순서 불일치 케이스, 나머지 25개 정상 유지).
  - **색상 필드 팝오버 통일 + 포인트색 추종 보존**: `ColorPopoverPicker.vue`에 `pointFollow?:boolean` + `activeIndex?:number|null` prop, `select-point` emit 추가(하위호환: 기본 off → 전체 스타일 기존 리터럴 픽 동작 불변). 추종 중이면 포인트 스와치 클릭이 `pick()` 대신 `emit('select-point', i)`, 수동 영역(팔레트/HEX/투명도)은 `.manual-locked`(opacity 0.4 + pointer-events:none)로 잠금. `ModuleForm.vue`의 `isColorBlock` 인라인 3단(`ColorAlphaPicker`+`HexColorInput`+`PointColorSwatchRow`) → 단일 `ColorPopoverPicker`로 교체하되 기존 핸들러(`isUsingPoint`/`onSelectPointColor`/`handleColorInput`/`pointColorForKey`/`pointIndexFor`) 전원 재사용 → `__usePoint`/`__pointIndex` 저장·추종 시맨틱 무변. `GroupPropertiesPanel.vue`의 배경/테두리 색상 2곳도 동일 교체(라디오/슬라이더는 이미 GlobalStyle과 동일했음). **범위 밖(유지)**: `TableCellEditor.vue` 셀 색상 칩, Quill 리치텍스트 색상 팝오버(별도 `popoverColor` 기반).
  - **테두리 "전체 블록" 통일**: `ModuleForm.vue`에 통합 테두리 블록 렌더러 추가 — `isBorderStyleStart`(`prop.type==='select' && (/borderStyle$/i.test(key) || key==='dividerStyle')`, **대소문자 무관 필수**: `ModuleDivider`의 라인스타일 키는 소문자 `borderStyle`)로 감지, `base=key.replace(/Style$/,'')`로 형제 키(`${base}Width`/`${base}Color`) 도출, `isBorderMember`로 그 형제 개별 렌더 억제. 블록=전체 스타일 마크업 이식(스타일 라디오+미리보기선 · 색상=추종 팝오버 · 두께 슬라이더). `없음(none)` 옵션 있으면 헤더 토글(off=none), 없으면(`borderStyle`/`dividerStyle`) 항상 노출. **모서리 둥글기(`*BorderRadius`)는 블록에 넣지 않고 개별 필드 유지**. 저장은 개별 prop 그대로(`updateProperty(styleKey/widthKey/colorKey)`) → 내보내기·하위호환 무영향. 대상 15개(11개 distinct: `border/button/button1/button2/bigBtn/leftBigBtn/rightBigBtn/image/leftImage/rightImage BorderStyle` + `dividerStyle`) 전부 형제 규칙 성립 확인. **부수 수정**: `src/types/module.ts`의 `EditableProp.options` 타입을 실제(`string[]`) → `{label;value}[]`로 교정(소비처는 ModuleForm 뿐).
  - **검증**: `npx vue-tsc --noEmit` 클린, `npx vitest run` 370개 통과, Playwright로 (1)단일 버튼 → 테두리 블록 토글/라디오(점선)/두께(6px) 적용 후 캔버스 실제 반영, (2)버튼 배경색 팝오버 → 포인트 스와치 클릭 시 캔버스가 파랑으로 추종 + 수동영역 잠금, (3)구분선 모듈 선 스타일이 드롭다운→라디오(실선/점선/파선/이중선), 여백이 4개 개별→단일 잠금 슬라이더로 통합됨을 좌·우 패널 모두 확인.

- **Phase 13 완료(2026-07-19)**: 그룹 모듈 UX 개선 — 그룹을 "보이게·잡히게"(A) + 선택 모델 정합성(C). 사용자 증상은 "그룹 아래에 모듈을 추가하고 싶은데 자꾸 그룹 안으로 들어간다" + "그룹이 뭔가 불편한데 뭔지 모르겠다"였고, 조사로 밝힌 근본 원인은 아래 ⓐ~ⓒ.
  - **ⓐ 선택 모델 불일치(핵심 개념)**: `selectedModuleId`/`selectedGroupId`는 **모든 setter가 상대를 null로 지우는 배타적 2슬롯**이다. 즉 "그룹 멤버 선택 = `selectedGroupId`는 null"이 **정상 상태**인데, UI(좌측 그룹 뷰·캔버스 하이라이트)는 "그룹 안에 멤버가 있다"는 계층 모델로 그린다. 이 간극이 여러 증상의 공통 뿌리.
  - **ⓑ 삽입 위치가 선택 슬롯으로 갈린다**(`moduleStore.addModule`): 멤버 선택→그룹 **안**, 그룹 선택→그룹 **아래 바깥**, 미선택→맨 끝. 규칙 자체는 합리적이나 **화면에 표시가 전혀 없었다**.
  - **ⓒ 그런데 "그룹 자체 선택"이 사실상 불가능했다**: `.group-box`는 `@click.self`인데 `DEFAULT_GROUP_STYLES.padding='0px'`라 **클릭할 빈 픽셀이 없음**(실측 확인). 호버 표시 없음, `.group-wrap--selected`는 **CSS 없는 죽은 클래스**. 남은 경로는 툴팁이 "그룹 스타일 편집"이라 선택으로 안 읽히는 `tune` 버튼과 **기본 접힘**인 목차 패널뿐. → ⓑ+ⓒ = 그룹 아래에 추가할 수단이 없었다.
  - **해결 1 — 캔버스 그룹 이름 칩(`.group-chip`, `CanvasArea.vue`)**: 그룹 좌상단에 `▦ {group.name || '그룹'} · N개` 보라 칩을 항상 노출. **클릭 = `selectGroupBox` = 그룹 자체 선택** → 신뢰 가능한 히트 타깃이 처음 생김. 선택 시 filled(보라 채움)로 "지금 추가하면 그룹 아래로 간다"를 표현. 캔버스에 그룹 이름을 문자로 보여주는 유일한 수단이기도 함(Phase 7에서 상단 헤더 바 제거 후 소실됐던 것).
  - **해결 2 — 시각 구분**: `.group-box:hover` 신설, 죽은 `.group-wrap--selected` CSS 구현, 그룹 outline을 `1.5px dashed rgba(147,51,234,.5)`로 강화하고 컬럼 경계는 `1px dotted rgba(37,99,235,.18)`로 약화(둘이 비슷해 혼동됐음), `.group-side-toolbar`에 보라 테두리(우측 모듈 툴바와 픽셀 단위로 동일해 생기던 혼동 제거), `tune` 툴팁 → `'그룹 선택 · 스타일 편집'`.
  - **해결 3 — `moduleStore.activeGroup` 파생 getter 신설**: `selectedGroup ?? (selectedModule.groupId로 역추적)`. `GroupPropertiesPanel`(`selectedGroup`→`activeGroup`)과 `CanvasArea`의 박스 하이라이트가 이를 사용 → **멤버 선택 시 좌측 "그룹 구성" 안에서 그룹 스타일이 통째로 사라지던 버그**와 **캔버스 그룹 표시가 꺼지던 문제**가 동시 해결. `SelectedItemPanel`의 중복 `activeGroup` 로직도 이 getter로 통합.
    - ⚠️ **`addModule`의 삽입 규칙은 raw ref(`selectedGroupId`)에 의존하므로 `activeGroup`으로 대체 금지** — 바꾸면 "그룹 자체 선택(→아래)"과 "멤버 드릴다운(→안)"의 구분이 사라진다. 칩의 filled 표시도 같은 이유로 `selectedGroupId` 기준 유지.
  - **해결 4·5 — 맥락 표시**: `PropertiesPanel`(우측)에 멤버 편집 중이면 `〈그룹명〉` 배지 + `[그룹 선택]` 버튼(좌=그룹 뷰/우=개별 모듈 불일치 해소). `SelectedItemPanel` 안내문을 상태별 분기 — 그룹 자체 선택 시 "모듈을 추가하면 이 그룹 **아래**에 추가됩니다", 멤버 선택 시 "이 그룹 **안**에 추가됩니다(그룹 아래에 넣으려면 캔버스의 그룹 이름 칩을 누르세요)".
  - **해결 6 — `duplicateGroup` rows 누락 버그**: 새 그룹 정의에 `rows`(행별 컬럼 수)를 복사하지 않아 **다단 그룹 복제 시 레이아웃이 깨졌다**(`createGroup`/`mergeModulesIntoGroup`은 명시함). `rows: group.rows ? [...group.rows] : undefined` 추가.
  - **검증**: `vue-tsc` 클린, `vitest` 370개 통과, Playwright로 (1)칩 `뉴스 헤드라인 헤더 · 5개` 노출, (2)멤버 드릴다운 시 그룹 스타일 유지 + 캔버스 활성 표시, (3)**칩 클릭 후 모듈 추가 → 그룹 멤버가 안 늘고 그룹 점선 바깥 아래에 추가됨**(원래 불편 직접 해소), (4)다단 그룹 복제 시 col-row/col-cell이 정확히 2배(레이아웃 보존) 확인.
  - **미해결(사용자에게 B/D로 제안했으나 이번 범위 밖)**: 삽입 위치 토글 UI, 조립형 갤러리가 선택 무시하고 항상 맨 끝에 추가되는 것, 멤버를 드래그로 그룹 안팎 이동(구조상 `displayItems`가 그룹을 이미 접은 배열이라 중첩 draggable 필요), 멤버 개별 "그룹에서 빼내기", 그룹 이름 편집 UI 부재(직접 묶은 그룹은 `createGroup`이 name을 안 넣어 영영 "그룹 구성").

- **Phase 14 완료(2026-07-30)**: 캔버스 '직접 구성' → 좌측 '구성 요소' 패널 연결 (Figma **717-9607** "이미지 선택 - 2단 - 직접 구성").
  - **배경**: 직전 커밋(d16db5c)이 `ModuleForm.vue`에 구성 요소 체크박스를 넣었지만 **모듈이 선택돼 있어야만** 보였다. 빈 컬럼에서 '직접 구성'을 눌러도 선택이 없어(또는 다른 컬럼 모듈이 선택돼 있어) 그 패널로 갈 수 없었음 — 즉 진입점이 없었다.
  - **`ColumnElementsField.vue`**(신규): 구성 요소 체크박스 리스트(이미지/타이틀/텍스트/버튼)를 `{groupId,rowIndex,columnIndex}` prop 기반 공용 컴포넌트로 추출. `ModuleForm.vue`(모듈 선택 상태)와 아래 패널이 공유하며, 체크 상태는 저장값이 아니라 **셀에 그 종류 모듈이 존재하는지**로 판정(`hasColumnElement`).
  - **`ColumnComposePanel.vue`**(신규): `columnTarget`이 지정된 빈 컬럼용 좌측 패널 — 타이틀 "직접 구성" + 대상 위치 안내("2단 중 2번 컬럼") + 구성 요소 리스트 + '직접 구성 취소'. `AppLayout.vue` 좌측 패널 체인의 **최우선**(단 `forceRailPanel`이면 레일 메뉴 우선 — 거기서 추가하는 모듈도 이 컬럼으로 들어가는 기존 흐름 유지).
  - **`moduleStore.setColumnTarget` 확장**: 캔버스 '직접 구성'은 명시적 조작이므로 기존 선택(다른 컬럼 모듈 등)과 `forceRailPanel`을 함께 해제 → 좌측이 확실히 이 컬럼의 구성 요소 패널로 전환된다. 추가로 **대상 컬럼 밖의 모듈/그룹을 선택하면 `columnTarget`을 자동 해제**하는 watcher 신설(엉뚱한 컬럼에 추가되는 것 방지). 단 `setColumnElement`가 추가 직후 선택하는 모듈은 **같은 셀**이라 지정이 유지된다.
  - **동작 흐름(검증됨)**: 2단 분할 → 빈 컬럼 '직접 구성' → 좌측 "직접 구성" 패널 → 체크 → 그 컬럼에 원소 추가 + 자동 선택 → 좌측이 `ModuleForm`(컬럼 세그먼트 + 구성 요소 + 그 모듈 속성)으로 전환(=Figma 717-9607 화면). 전부 해제하면 컬럼이 다시 비고 2단은 유지되며 '직접 구성' 패널로 복귀.
  - **검증**: `npm run build`(vue-tsc --build 포함) 클린, `vitest` 370개 통과, Playwright로 위 흐름 + 4개 전부 체크(2번 컬럼 모듈 4개) + 해제 시 캔버스 제거 + 다른 컬럼 선택 시 대상 해제까지 확인.
  - **구성 요소 행 드래그 순서 변경(같은 세션 추가)**: Figma 행 왼쪽 `drag_indicator` 구현 — 리스트를 **추가된 요소(실제 배치 순서, `columnElements`)** + **미추가 요소(기본 순서, 핸들 비활성 `.cmp-drag--off`)** 두 구간으로 나눠 렌더하고, 앞 구간만 `vuedraggable`(handle `.cmp-drag`)로 감쌌다. 행 구조는 `div`(핸들) + `label`(체크박스+라벨)로 분리 — 핸들을 잡아도 체크가 토글되지 않게 하기 위함.
    - `moduleStore.reorderColumnElements(groupId,row,col,orderedIds)`: 대상 모듈들이 `modules` 배열에서 **이미 차지하던 슬롯들**에만 새 순서로 재배치 → 같은 셀의 구성 요소 아닌 모듈·다른 셀/그룹 순서는 불변. `columnElements`는 종류당 첫 모듈만(중복 이미지 등 방어) 반환.
    - Playwright 검증: 4개 체크 → 마지막 행(버튼)을 맨 위로 드래그 → 패널 순서와 캔버스 2번 컬럼 렌더 순서가 동일하게 `버튼·이미지·타이틀·텍스트`로 바뀜(한 칸 이동/여러 칸 이동 모두), 체크 해제 시 그 종류가 미추가 구간으로 내려가고 핸들이 비활성.
  - **구성 요소 종류(현재 5개)**: 이미지(`ModuleImg`) · 타이틀/텍스트(둘 다 `ModuleDescText`, `properties.__composedKind`로 구분) · 버튼(`ModuleOneButton`) · **작은 버튼(`ModuleSmallButton`, 사용자 요청으로 추가)**. 종류를 늘릴 땐 `ComposedKind` 유니온 + `COMPOSED_SPECS`(생성 스펙) + `moduleComposedKind`(모듈→종류 역판별) + `ColumnElementsField.COMPOSED_ELEMENTS`(라벨/기본 순서) **네 곳**을 함께 수정한다.
  - **미구현**: 같은 노드의 "컬럼 · 순서 변경 >" 링크.

- **Phase 15 완료(2026-07-31)**: 텍스트 모듈 속성 레이아웃 개편 (Figma **640-3235** "텍스트 선택"). 전부 `ModuleForm.vue` 렌더 계층만 수정 — modules-config·저장 포맷 불변.
  - **필드 순서**: Figma는 `폰트 크기 슬라이더 → 서식 툴바 → 텍스트 입력` 순인데 config는 textarea가 먼저였다. `hoistFontSizeBeforeTextarea()`를 `propGroups`에 추가해 **표시 순서만** 재배열 — 짝짓기는 `${textareaKey}FontSize` 키 우선, 없으면 그룹에 textarea·폰트크기가 하나씩일 때만 그 둘(예: `ModuleDescText`의 `descriptionText`↔`fontSize`). 이미 앞에 있으면 그대로(전수 조사: 13개 그룹이 이동 대상, 나머지는 이미 앞).
  - **툴바 2줄 그룹 + 세로 구분선**: `<template #toolbar>`를 `.rte-tb-row`(줄) / `.ql-formats.rte-tb-grp`(그룹) / `.rte-tb-div`(1px×21px 구분선) 구조로 재편. 1줄=B·I·U·S │ 정렬·목록·행간, 2줄=글자색·배경색·형광펜 │ 링크·서식제거, **3줄=글자 크기·줄바꿈 규칙**(Figma엔 없지만 사용자 확정으로 유지 — '기본 글자 크기' 힌트가 툴바의 '글자 크기'를 안내하고 있어 제거 시 기능·안내가 깨짐).
  - **목록 버튼 2개 → 드롭다운 1개**: Figma의 목록 드롭다운에 맞춰 `<select class="ql-list">`(번호 목록/글머리 기호/목록 없음)로 교체. Quill 일반 Picker라 라벨이 텍스트여서 CSS로 `font-size:0` + `::before`에 Material `format_list_bulleted` 글리프를 얹었다(드롭다운 항목은 한글 라벨 유지).
  - **행간·자간 → 툴바 팝오버**: Phase 4에서 에디터 위로 뺐던 `.rte-ext-row`(Select 2개)를 제거하고, 1줄 끝의 `format_line_spacing` 버튼(`.rte-tb-btn` — **`ql-` 클래스가 없어 Quill의 `attach()`가 건드리지 않는다**)이 여는 팝오버로 이전. `@mousedown.prevent`로 에디터 선택 유지, 저장된 `quillRangeByKey`가 없으면 본문 전체를 대상으로 삼는다(드롭다운 표시값과 동일 기준). 적용 함수(`applyLineHeight`/`applyLetterSpacing`)는 그대로 재사용.
  - **Esc 처리**: 팝오버가 열려 있을 때의 Esc는 `onDocKeydown`(캡처 단계)에서 소비(`stopPropagation`)한다 — 안 그러면 `useKeyboardShortcuts`의 전역 '선택 해제'까지 실행돼 편집 중이던 모듈이 통째로 선택 해제된다.
  - **치수**: 툴바 테두리 제거·줄 간격 20px·본문과 16px, 본문은 `#f2f4f6` 채움 + rounded-8 + `20px 12px` 패딩 + min-height 169px(`.ql-editor` 배경을 transparent로 내려야 컨테이너 회색이 보인다). **좌측 패널 실제 폭이 277px로 Figma(310px)보다 좁아** 버튼 30px·그룹 gap 6px·줄 gap 12px로 축소(그 결과 273px, 3줄 모두 한 줄에 들어감).
  - **정렬 드롭다운 메뉴(Figma 640-3977 / 640-4087)**: Quill 기본 세로 목록 → **가로 아이콘 메뉴 카드**로 리스킨. 흰 배경 + `#e5e8eb` 1px + rounded-8 + `0 0 10px rgba(0,0,0,.15)`, 항목 52×52(아이콘 24px), 현재 값은 `#ebf3ff` 배경(`.ql-selected`). 버튼 아래 `left:50%; translateX(-50%)`로 걸어 좁은 패널에서 오른쪽으로 넘치지 않게 한다. Figma는 3칸(좌·중앙·우)이지만 Quill 기본 4번째인 **양쪽 정렬을 유지**(기능 손실 방지).
    - ⚠️ **특이점 2가지**: (1) PrimeVue 테마의 `.p-editor .p-editor-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-options`(0,5,0)가 스코프 스타일(0,4,0)을 이겨서 카드 스타일이 안 먹는다 → 선택자를 `.rte-field :deep(.p-editor .p-editor-toolbar .ql-picker[.ql-align].ql-expanded .ql-picker-options)`로 더 길게 잡아야 한다. (2) 드롭다운을 열면 에디터가 blur → Quill이 서식을 빈 값으로 갱신해 **현재 값 하이라이트가 사라진다** → `onEditorLoad`에서 툴바의 `.ql-picker-label` mousedown 기본동작을 막아 선택을 유지(Quill Picker는 mousedown에서 여닫으므로 동작에는 영향 없음).
  - **행간·자간 팝오버 내용(Figma 640-3517 / Frame53 640-3623)**: 드롭다운 2개 → **슬라이더 + 값 필드 2섹션**으로 교체. 카드 318×208(`padding 25px 20px`, rounded-8, `0 0 5px rgba(0,0,0,.15)`, 섹션 gap 26px), 섹션마다 `24px 아이콘(format_line_spacing / format_letter_spacing_2) + 15px #4e5968 라벨` → `슬라이더 + 50×32 filled 값 필드(13px medium, 단위 없음)`. 위치는 버튼이 아니라 **텍스트 필드 열**에 맞춰 건다(버튼 기준이면 좁은 패널에서 왼쪽으로 밀린다).
    - **포맷 whitelist 제거(중요)**: 슬라이더는 연속값을 만드는데 `quillLineHeight`/`quillLetterSpacing`의 StyleAttributor에 whitelist(행간 5개 / 자간 음수 4개)가 걸려 있어 임의 값이 **조용히 무시**된다 → whitelist를 없애고 범위 상수(`LINE_HEIGHT_MIN/MAX/STEP/FALLBACK` 1.0~3.0·0.1·1.5, `LETTER_SPACING_*` -2~5px·0.1·0)와 변환 헬퍼(`toLineHeightValue`/`parseLineHeight` 등)를 대신 export. 예전 저장 값은 whitelist가 없어져 그대로 유효(하위호환 ↑), 자간은 **0·양수도 처음으로 지정 가능**해졌다. 두 유틸의 whitelist 테스트는 연속값·하위호환 테스트로 교체(370→374개).
    - **미지정 상태 표시**: 값이 없으면 슬라이더는 기본 위치(1.5 / 0)에 서고 값 글자만 `#8b95a1`로 흐리게 — 실제 적용은 사용자가 움직였을 때만 일어난다.
    - **자간이 "안 먹는" 문제(사용자 제보 → 수정)**: `letterSpacing`은 INLINE 스코프라 **커서만 있고 드래그 선택이 없으면** `quill.format()`이 커서 자리의 빈 span(`<span class="ql-cursor">`)에만 걸려 화면상 아무 변화가 없었다(행간은 BLOCK이라 문단에 걸려 정상 동작 → "자간만 안 된다"로 보인다). `applyLetterSpacing`에서 `r.length === 0`이면 `quill.getLine(r.index)`로 **커서가 있는 문단 전체**에 `formatText`하도록 수정. 드래그 선택이 있으면 종전대로 그 범위에만 적용.
  - **검증**: `npm run build` 클린, `vitest` 374개 통과, Playwright로 (1)섹션 타이틀·설명 텍스트 모두 `슬라이더<툴바<본문` 순서, (2)툴바 3줄이 각각 한 줄(높이 32), (3)굵게/기울임/밑줄/취소선·정렬·목록 드롭다운·글자색 팔레트+직접선택·글자 크기·줄바꿈·행간·자간이 전부 본문과 캔버스에 반영, (4)Esc가 팝오버만 닫고 선택은 유지, (5)정렬 메뉴가 가로 카드(210×54, 항목 52×52)로 뜨고 현재 정렬이 `#ebf3ff`로 표시되며 패널 밖으로 안 넘침, (6)행간·자간 팝오버가 318×208로 뜨고 슬라이더/직접입력이 `line-height:1.4`·`letter-spacing:-0.5px`·`2px`(양수)까지 본문·캔버스에 반영됨을 확인.

- **Phase 16 완료(2026-07-31)**: 텍스트 모듈(`ModuleDescText`) 스타일 섹션을 이미지 모듈과 같은 접이식 카드로 통일 (사용자 요청).
  - **modules-config 재그룹(ModuleDescText만)**: `배경 박스`(bgColor+borderRadius+padding4) / `바깥 여백`(margin4) → **`여백`(padding4+margin4) · `배경색`(bgColor) · `모서리 둥글기`(borderRadius)** 로 분리하고, 순서를 `내용 → 여백 → 배경색 → 모서리 둥글기 → 테두리`로 재배치. **키·기본값·라벨은 그대로**라 렌더/내보내기·저장 템플릿에 영향 없음(패널 표시용 그룹명·순서만 변경). 한 섹션에 quad 2개가 들어가도 `isQuadStart`가 접두사별로 각각 잡아 `안쪽 여백`/`바깥 여백` 두 블록으로 렌더된다.
  - **`isImageStyleSection` → `isStyleSection` 일반화**: `moduleId === 'ModuleImg'` 하드코딩을 모듈별 규칙으로 확장(이미지=‘이미지 파일’ 제외 전 섹션, 텍스트=`여백·배경색·모서리 둥글기·테두리`). 이 함수가 `gg-acc-header`(chevron+토글) · `gg-acc-body--card` · 헤더 토글=펼침상태 제어를 모두 좌우한다.
  - **기본 닫힘 섹션을 모듈별로 분리**: `DEFAULT_CLOSED_SECTIONS`를 `Record<moduleId, Set<name>>`으로 바꿔 이미지는 기존대로(이미지 크기 조정·모서리 둥글기), 텍스트는 여백·배경색·모서리 둥글기가 접힌 상태로 시작(Figma 640-3235와 동일).
  - **섹션명 중복 라벨 숨김**: `isSectionEchoLabel(group, prop)` 신설 — 스타일 섹션 안에서 필드 라벨이 섹션명과 같으면(섹션'배경색' 안의 '배경색' 필드) 라벨을 숨긴다. 컬러 행은 자리만 남겨(빈 span) 피커를 오른쪽에 유지.
  - **내용 섹션 정리(같은 세션 추가 요청)**: `전체 글자 크기 (본문)` · `전체 텍스트 색상`을 **에디터 위**로 올리고 라벨에 '전체'를 붙여 "모듈 전체 기본값"임을 드러냄(선택 영역별 값은 툴바에서 지정). **`textAlign` prop은 아예 제거** — 정렬은 에디터 툴바(문단 단위)에서만 한다. 안전한 이유: `moduleConfigs.ts`의 `moduleDescTextConfig.defaults.textAlign='left'` 폴백이 있어 신규 인스턴스는 `text-align:left`로 렌더되고, 기존 인스턴스는 저장된 값이 그대로 치환된다(문단 인라인 정렬이 컨테이너보다 우선).
    - ⚠️ **라벨 숨김은 하지 말 것**: 섹션명과 필드 라벨이 같아 보인다고 안쪽 `gg-field-label`을 숨겼다가 사용자 지적으로 되돌렸다(이미지 모듈과 마찬가지로 카드 안에는 항상 라벨이 있어야 한다).
    - **여백 섹션은 quad마다 카드 분리**: 한 `.gg-acc-body--card` 안에 카드가 하나였던 걸 `fieldChunks(group)`로 쪼개 `안쪽 여백`/`바깥 여백`이 각각 `.gg-acc-fields`(회색 카드)를 갖는다. 내부 `v-for`가 `{prop,index}` 쌍을 받아 **원래 인덱스를 그대로 넘기므로** `isQuadStart`/`isQuadMember`/`isBorderMember` 판별은 무변.
  - **툴바 아이콘 정렬 통일(Figma 753-9174, 사용자 지적)**: Quill 기본값은 버튼 24×28 `float:left`, 피커 라벨 좌우 비대칭 패딩, 캐럿 `position:absolute`라 아이콘 크기·세로 위치가 제각각이다 → 버튼·`.rte-tb-btn`·`.ql-picker`를 **모두 30×30 정사각 박스(캐럿 있는 정렬·목록만 38px)** 로 만들고 `display:inline-flex; align-items:center; justify-content:center; float:none`, svg 20px(캐럿 12px), 라벨 패딩 제거로 중앙 정렬. 형광펜 라벨의 `ab` 텍스트 → Material `ink_marker` 글리프, 정렬 픽커엔 `::after`로 캐럿 추가(목록과 모양 통일).
    - ⚠️ **부작용 3개(모두 수정함)**: (1) 픽커를 `justify-content:center` flex로 만들면 **절대배치된 드롭다운의 기준 위치까지 가운데로 밀려** 색상 팔레트가 패널 왼쪽(레일) 밖으로 튀어나간다 → 공통 `.ql-picker-options`에 `left:0; right:auto` 고정. (2) 정렬 메뉴(가로 210px)는 버튼 기준으로는 좁은 패널을 벗어나므로 `.ql-picker.ql-align { position: static }` + `.rte-tb-row { position: relative }`로 **줄 왼쪽 모서리 기준**으로 연다. (3) 그 결과 기준 박스가 '줄'이 되면서 Quill 기본 `min-width:100%` 때문에 **패널을 넓히면 정렬 메뉴도 같이 늘어난다** → `min-width:0; width:max-content`로 아이콘 칸 크기(52×N) 고정.
    - ⚠️ **커스텀 픽커의 항목 텍스트**: Quill은 `content: attr(data-label)`을 header/font/size 픽커에만 넣어준다. `<select class="ql-list">`처럼 직접 만든 픽커는 이 규칙이 없으면 **드롭다운이 빈 상자로 보인다**(항목은 있는데 글자만 안 나옴). `ql-fontSize`/`ql-wordBreak`처럼 `.ql-picker-item[data-label]::before { content: attr(data-label) }`를 반드시 같이 정의할 것.
  - **검증**: `npm run build` 클린, `vitest` 374개 통과, Playwright로 (1)섹션 5개(내용/여백/배경색/모서리 둥글기/테두리)가 chevron+토글+`gg-acc-body--card` 구조로 렌더, (2)기본 접힘 상태, (3)`여백` 카드 안에 `안쪽 여백`+`바깥 여백` 두 블록, (4)값 변경이 캔버스에 반영(`padding:24px 0px 0px 0px`·`padding:30px…`(바깥 래퍼)·`border-radius:12px`), (5)이미지 모듈 섹션 구성·기본 열림 상태는 그대로임을 확인.

- **Phase 17 완료(2026-07-31)**: 폰트 크기 컨트롤 통합 (Figma **640-3689**). "모듈 기본 크기(속성 슬라이더)"와 "선택 영역 크기(툴바 드롭다운)"가 따로 있어 **인라인이 기본값을 이기는 순간 슬라이더가 안 먹는 것처럼 보이는** 문제를 해결.
  - **컨트롤 하나로 통합**: 라벨 `폰트 크기`(config), 드래그 선택이 있으면 그 범위의 인라인 크기를, 없으면 모듈 prop을 대상으로 한다. 지금 무엇을 바꾸는지는 라벨 옆 **`선택 영역` 배지**(`.fs-target-badge`)로 드러내고, 개별 크기가 걸려 있으면 **`선택 영역을 기본 크기로` / `개별 크기 모두 지우기`** 액션(`.fs-reset-btn`)을 노출한다. **툴바의 `ql-fontSize` 드롭다운은 제거**(Figma 툴바가 2줄인 이유) — 줄바꿈 규칙만 3번째 줄에 남았다.
  - **혼합 표시**: 선택 안에 크기가 섞이면 값 자리에 `--`. ⚠️ `quill.getFormat()`은 '일부만 지정'이면 **키 자체를 지워버려** 혼합을 알 수 없다 → `getContents(range)`로 조각별 `attributes.fontSize`를 모아 판정한다(개행만 있는 조각은 제외). 값 필드는 `--`를 담을 수 없는 `type=number`라 혼합일 때만 `type=text`로 렌더.
  - **에디터 짝짓기**: 한 모듈에 에디터가 여러 개(예: SectionTitle 메인/서브)일 수 있어, 폰트 크기 prop → 짝 textarea 키를 `${textareaKey}FontSize` 우선, 없으면 그룹에 textarea·폰트크기가 하나씩일 때만 매칭(`fontSizeEditorKey`). `hoistFontSizeBeforeTextarea`와 동일한 규칙.
  - **whitelist 제거**: `quillFontSize`도 행간·자간과 같은 이유로 고정 9개 whitelist를 없애고 범위 상수(`FONT_SIZE_MIN/MAX` 8~48)와 `toFontSizeValue`/`parseFontSize`를 export. 슬라이더가 만드는 임의 px가 그대로 적용되고 예전 값도 유효.
  - **선택 상태 반응성**: `editorFormatState`에 `hasSelection`/`fontSize`/`fontSizeMixed`/`fontSizeInSelection`/`fontSizeAnywhere`를 추가해 `selection-change`마다 갱신 → 배지·값·되돌리기 노출이 자동으로 따라간다.
  - **에디터 본문 크기를 '폰트 크기'와 동기화(사용자 지적)**: `.ql-editor`가 15px 고정이라 기본 크기를 바꿔도 **에디터는 그대로, 캔버스만 바뀌어** "연동이 안 된다"고 보였다 → `.rte-field`에 `--rte-base-size`를 짝 폰트 크기 prop 값으로 바인딩하고 `.ql-editor { font-size: var(--rte-base-size, 15px) }`. 부분 지정된 텍스트의 인라인 크기는 그대로 우선한다. 짝 찾기는 `editorBaseFontSize()`(= `fontSizeEditorKey`의 역방향, 같은 규칙).
  - **에디터 위 `텍스트` 라벨 제거**: 리치텍스트(textarea)는 바로 위에 폰트 크기·툴바가 붙어 라벨이 중복이라 `v-show` 조건에 `prop.type !== 'textarea'` 추가(Figma에도 라벨 없음).
  - **되돌리기 버튼을 라벨 행으로**: 슬라이더 아래 우측 정렬이던 `.fs-reset-row`를 없애고, 라벨을 `.fs-label-row`(flex·space-between)로 만들어 **왼쪽=폰트 크기(+배지) / 오른쪽=되돌리기**로 한 줄에 둔다. 내용 섹션 순서도 `폰트 크기 → 에디터 → 전체 텍스트 색상`으로 조정(config 순서만).
  - **줄바꿈 규칙을 행간·자간 팝오버로 이동**: 툴바에 홀로 남던 3번째 줄을 없애고 같은 '텍스트 흐름' 팝오버에 세그먼트(`기본 / 단어 기준 / 글자 기준`, `.rte-sp-seg`)로 합쳤다. **툴바 한 줄에는 못 들어간다** — 패널 폭 277~309px에서 1줄이 이미 272~282px라 픽커(64px, 아이콘화해도 30~38px)를 더하면 반드시 줄바꿈된다. 적용은 `quill.format('wordBreak', …)`(BLOCK 스코프), 상태는 `editorFormatState.wordBreak`로 동기화. 결과적으로 툴바는 Figma 그대로 2줄.
  - **입력란 높이 조절(resize)**: `.ql-editor`에 `resize: vertical; overflow: auto`(+`min-height:169px`), `.ql-container`는 `height:auto`. ⚠️ PrimeVue `<Editor editorStyle="height: 200px">`의 **인라인 고정 높이를 제거해야** 그립을 끌 때 회색 박스가 함께 커진다(안 지우면 에디터만 커지고 박스는 200px에 머문다).
  - **검증**: `npm run build` 클린, `vitest` 376개 통과, Playwright로 (0)기본 크기 14→24→10px 변경 시 **에디터 렌더 크기와 캔버스 값이 항상 일치**, 부분 30px는 에디터에서도 30px로 보임, (1)커서만 → 배지 없음·기본값 조정이 캔버스 반영, (2)"섹션 타이틀"에서 `타이틀`만 선택 → 배지 노출·그 부분만 28px(`<span style="font-size:28px">타이틀</span>`), (3)전체 선택 시 값 `--`, (4)되돌리기로 인라인 제거 후 기본값 복귀, (5)에디터 2개 모듈에서 서브 타이틀 선택 시 그 필드만 배지·서브 에디터에만 적용됨을 확인.

- **Phase 18 완료(2026-08-11)**: '모듈 순서'를 좌측 패널 → **캔버스 오른쪽 접이식 패널**로 이전 + 그룹형 리스트 재설계 (Figma **969-7308**(패널 열림) / **969-7165**(닫힘) / 리스트 셸 **969-7309**).
  - **위치·개폐 모델 변경(핵심)**: `EditorMenu` 유니온에서 `'order'` 제거(`editorStore.ts`), `AppLayout.vue`의 좌측 `activeMenu==='order'` 분기 삭제, 대신 캔버스 오른쪽에 `<ModuleOutlinePanel />`을 상시 마운트. 새 상태 `isOrderPanelOpen`(**기본 false**) + `toggleOrderPanel`/`setOrderPanelOpen`. `EditorSidebar.vue`는 `RailKey = MenuKey | 'order'`로 나눠, `'order'`만 `toggleOrderPanel()`을 부르고 `setActiveMenu`를 **호출하지 않는다** → 좌측 패널(선택 속성/카테고리 메뉴)이 그대로 유지된다. 레일 활성 표시도 `isActive()`에서 `'order'`는 `isOrderPanelOpen` 기준으로 분기.
  - **도크 구조**: `.order-dock`(position:relative) > `.order-tab`(왼쪽 가장자리 탭, `left:-34px`, 34×64, 좌측 라운드) + `.order-panel`(320px ↔ 0, width 트랜지션). 내부 `.order-inner`는 **고정 320px**이어야 접히는 동안 리플로우가 안 생긴다. 닫히면 패널 폭이 0이라 탭이 자연히 화면 오른쪽 끝에 붙는다(Figma 969-7165와 동일). 탭 아이콘은 `arrow_back_ios` — 닫힘 `◀`(그대로), 열림 `▶`(rotate 180).
  - **행 스펙**: h45 · px5 · rounded-4 · gap8 → `drag_indicator`(24px) · **32px 슬롯**(그룹=chevron / 모듈=Checkbox 20px) · 종류 아이콘(22px) · 라벨(14px) · (그룹 한정) 우측 32px `link_off`. 호버 `#f2f4f6`(gray/100), 선택 `#ebf3ff`(blue/50), 그룹 라벨 `#b037ce`, 모듈 라벨 `#6b7684`, 그룹 아이콘/chevron `#333d4b`. 헤더는 `모듈 순서`(20px medium) + 개수(16px `#8b95a1`), 그 아래 `그룹 묶기 (n)` 버튼(`#4e5968`, h40, rounded-8).
  - **아코디언**: 그룹은 **기본 닫힘**, `expandedGroupIds: Set<string>`로 그룹마다 독립 — 다른 그룹을 열어도 기존 열림/닫힘 상태가 그대로 유지된다(배타적 아코디언 아님). chevron은 `arrow_back_ios` 하나를 회전해 씀: 접힘 `rotate(180deg)`(▶) / 펼침 `rotate(-90deg)`(▼).
  - **하위 모듈 행은 드래그 핸들 없이 32px 들여쓰기**. 최상위 드래그(`handle=".order-drag"`, 그룹은 한 덩어리로 이동)는 기존 `displayItems`/`setDisplayOrder` 그대로. 그룹 **안에서** 멤버를 재배치하는 중첩 draggable은 여전히 미구현(`rowIndex` 레이아웃이 깨질 수 있어 의도적으로 제외) — 그래서 멤버 행에 죽은 핸들을 두지 않았다. Figma에는 펼친 그룹 상태가 없어 충돌 없음.
  - **종류 아이콘**은 `ModuleMetadata.category` 기준 `CATEGORY_ICON` Record(이미지=`broken_image`, 텍스트=`match_case`, 버튼=`ads_click`, 테이블=`border_all`, 구분선=`vertical_distribute`, social=`share`, 그 외=`widgets`), 그룹은 `dashboard`. ⚠ **Record 맵으로 둔 이유**: `materialSymbols.test.ts`가 리터럴·삼항·`icon:`·`*_ICON Record`만 훑기 때문에 switch문으로 두면 subset 검사에 안 잡힌다. `index.html`의 `icon_names`에 `arrow_back_ios,broken_image,share,vertical_distribute,widgets` 추가함.
  - **텍스트형 모듈 라벨 = 실제 입력 문구**(Figma의 'NEWSLETTER #60' 등): `category==='text'`일 때 메타데이터의 첫 `textarea` prop 값을 태그·엔티티 제거 후 사용하고, 비면 모듈명으로 폴백. 라벨은 `text-overflow: ellipsis`로 잘린다.
  - **그룹 라벨**은 `group.name`(조립형 템플릿으로 만들면 모듈명이 들어감, Phase 8) → 없으면 `그룹 · N개`. **그룹 해제**는 캔버스 `.group-top-toolbar`와 같은 `moduleStore.ungroup` + `link_off` 아이콘이며, 그룹 행에 **호버하거나 그 그룹이 선택됐을 때만** opacity로 노출(Figma에서 선택행·호버행 둘 다 아이콘이 보인다).
  - **검증**: `vue-tsc --noEmit` 클린, `vitest` 628개 통과, Playwright로 (1)기본 닫힘(panel width 0, 탭이 화면 우측 끝 x=1566), (2)레일 클릭 시 320px로 열리고 **좌측 패널 폭 368px 불변**, (3)그룹 기본 접힘 → 1번 펼침(하위 6) → 2번도 펼침(12, 1번 유지) → 1번만 접음(6, 2번 유지), (4)선택 `rgb(235,243,255)`·호버 `rgb(242,244,246)`·그룹 라벨 `rgb(176,55,206)`, (5)그룹 해제 클릭 시 그룹 2→1, (6)핸들 드래그로 최상위 순서 변경, (7)라벨이 행 밖으로 넘치지 않음을 확인.

- **Phase 19 완료(2026-08-11)**: '모듈 순서' 패널 — 그룹 아코디언 **펼친 상태** 디자인 + 그룹 내부 드래그 + 체크박스 범위 축소 (Figma **969-8001**(밴드 있는 최종안) / **969-7618**(멤버 선택 상태)).
  - **펼친 그룹 = 한 덩어리 밴드**: 그룹 행 + 하위 모듈을 `.order-group.is-expanded`로 감싸고 배경 `rgba(235,243,255,0.55)`(**blue/50 @ 55%**, Figma 969-8045 실측값) + `border-radius:4px` + `gap:10px`. 그룹 행은 그 위에서 선택 시 `#ebf3ff`(불투명)로 한 단계 진해진다.
  - **하위 모듈 행**: `margin-left:37px` · 폭 233px(= 270 − 37, Figma와 픽셀 일치) · `drag_indicator`만 두고 **체크박스 제거**. 선택 시 배경 `#ebf3ff` + 라벨이 `#6b7684` → **`#333d4b`(gray/800)**, 드래그 핸들도 진해짐(Figma 969-7683).
  - **체크박스는 '그룹에 속하지 않은 모듈'에만** (사용자 규칙: 체크박스의 목적이 '그룹 묶기'이므로). `checkableModules` computed가 `!m.groupId && checked`로 걸러 개수·묶기 대상을 모두 이 기준으로 통일 → 체크 후 다른 경로로 그룹에 편입된 모듈이 카운트에 남지 않는다.
    - ⚠️ **부수 효과(의도됨)**: 기존 그룹을 체크해 합치던 `mergeModulesIntoGroup` 경로가 이 패널에서 도달 불가능해졌다(스토어 함수·테스트는 그대로 남아 있음). 그룹끼리 병합 UI가 다시 필요해지면 별도 진입점을 만들어야 한다.
  - **그룹 내부 드래그 — `moduleStore.reorderGroupMembers(groupId, orderedIds)` 신설**: 기존 멤버 순서대로 모아둔 **(배열 슬롯 + rowIndex/columnIndex) 좌표를 고정**해두고 그 자리에 새 순서의 멤버를 꽂는다. → 1단 그룹은 단순 재배열, 다단 그룹은 "어떤 모듈이 어느 칸에 놓이는지"만 바뀌어 `group.rows`(행별 컬럼 수)가 절대 깨지지 않는다. Phase 13에서 "구조상 어렵다"고 미뤘던 항목의 해법.
  - ⚠️ **중첩 draggable의 handle은 반드시 분리할 것**: 바깥 리스트 `handle=".order-drag--root"`, 그룹 내부 리스트 `handle=".order-drag--member"`. 같은 클래스를 쓰면 멤버 핸들을 잡았을 때 바깥 Sortable이 `closest('.order-item')`로 **그룹 전체를 끌어버린다**. 공통 시각 스타일은 `.order-drag`가 따로 담당(두 핸들 모두 이 클래스를 함께 가진다).
  - **Playwright 드래그 주의**: `mouse.move`를 한 번에 크게 옮기면 SortableJS가 반응하지 않는다 — 20스텝 정도로 쪼개고 스텝마다 25ms 정도 쉬어야 실제로 재정렬된다(이전 검증에서 "드래그가 안 먹는다"고 오판했던 원인).
  - **검증**: `vue-tsc` 클린, `vitest` **630개** 통과(`reorderGroupMembers` 테스트 2개 추가 — 그룹 경계 유지, 다단 골격 유지), Playwright로 (1)밴드 `rgba(235,243,255,0.55)`·radius 4px, (2)하위 들여쓰기 37px·폭 233px·체크박스 0개·핸들 6개, (3)멤버 선택 시 `rgb(235,243,255)` + 라벨 `rgb(51,61,75)`, (4)멤버 드래그로 패널·**캔버스 렌더 순서 동시 변경** + 그룹/최상위 개수 불변, (5)그룹 해제 → 단독 모듈 6개 전부 체크박스 노출 → 2개 체크 후 묶기 → 그룹 1개 + 남은 4개만 체크박스, (6)라벨이 행 밖으로 넘치지 않고 리스트 가로 스크롤 없음을 확인.

## 향후 방향 (사용자 명시, 아직 미구현)
- **모듈 v2를 메인 시스템으로 승격** (2026-07-18 확정): 새 카테고리 레일 UI는 v2 조립형 모듈을 기본으로 적용(6-1 섹션 참고). v2 템플릿이 없는 카테고리(예: 테이블형)는 **레거시 모듈을 당분간 유지**하고 점진적으로 교체 — 한 번에 전체 전환 금지, 기능 손실 없이 진행.
- **저장 템플릿도 v2로 재구성 예정** (아직 미착수, 사용자 예고): 지금 템플릿 저장/불러오기(`moduleStore.ts`의 템플릿 관련 함수, `src/views/*Template*`)는 레거시 모듈 기준. 위 모듈 v2 전환이 어느 정도 끝난 뒤 템플릿 쪽도 다시 작업할 계획 — 지금 당장 템플릿 구조를 손댈 필요는 없음.
- **조립형(v2) 모듈의 노출/비노출**: 지금은 원본 모듈의 `show*` **스위치 토글**로 제어하지만, 앞으로는 **"그룹 안 원소 모듈을 삭제"** 하는 방식으로 전환 예정. (v2 = 원소 모듈 그룹이므로, 요소 삭제 = 비노출.) SNS 아이콘 등 토글 UI는 이 방향과 함께 재검토.

## 8) 반영 규칙
- **최소 변경**: 해당 노드가 바꾸는 것만. 렌더 관련은 **캔버스·내보내기 두 경로 모두** 반영했는지 확인.
- **검증**: `npx vue-tsc --noEmit -p tsconfig.app.json` + `npx vitest run` 통과 확인. 필요시 dev 서버 기동해 스크린샷(Playwright: `NODE_PATH=<npx 캐시 경로>/node_modules node script.cjs` — 로컬에 playwright 브라우저 미설치 시 `npx playwright install chromium` 먼저).
- **하위호환**: 기존 인스턴스/템플릿이 깨지지 않게 기본값·마이그레이션 유지(예: pointColor→pointColors 시 단일값 폴백, `__pointIndex` 미지정 시 0번 폴백).
- **커밋**: `feat:`/`fix:` 한글 컨벤션. (사용자가 Claude 트레일러 제외를 요청한 이력 있음 — 커밋 전 확인.)
- 큰 개편은 단계로 쪼개 진행(데이터 모델 → 스토어 → 렌더 → UI 순).
- Figma 노드 안에 레이어명/텍스트가 복붙 흔적으로 실제 내용과 안 맞는 경우가 있다(예: 415-2553 버튼 메뉴의 제목 레이어가 "텍스트"로 남음) — 스크린샷/카드 내용으로 실제 의도를 판단하고 레이어 텍스트를 맹신하지 말 것.
