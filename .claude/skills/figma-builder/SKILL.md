---
name: figma-builder
description: >-
  뉴스레터 빌더(auto-newsletter)의 Figma 디자인을 코드로 반영할 때 사용. 사용자가 Figma 링크(figma.com/design/... node-id=...)를
  주며 "이 디자인대로 반영/수정", "스타일 맞춰줘", "이 화면 구현" 등을 요청하면 이 스킬을 따른다. Figma를 MCP로 읽는 절차,
  이 코드베이스의 화면/스토어/모듈 매핑, 진행 중인 UI 개편(편집 패널 좌측 이동·전체 스타일·포인트 색상 3개)의 목표 상태를 담고 있다.
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
| 372-3000 | "텍스트" 메뉴 — 상단 빠른추가(타이틀/서브타이틀/텍스트) + 텍스트형 모듈 **카드 내 상시 썸네일** |
| 378-1704 | 텍스트 모듈 선택 속성(1단/2단·폰트·행간/자간·리치텍스트 툴바·여백/배경/테두리) |
| 412-2139 | "이미지" 메뉴 — 단일/2단 이미지 빠른추가 + 이미지형 모듈 상시 썸네일 |
| 408-1758 | 단일 이미지 모듈 선택 속성(URL·alt·링크/모서리/테두리/여백 토글) |

**모듈 카드 상시 썸네일**(372/412/334-2630): 카드에 렌더 썸네일을 처음부터 표시(호버 X). → **구현됨**:
`ModulePanel.vue`에서 호버 floating 프리뷰 제거, 카드 안 `iframe`(680px 렌더 → `scale(0.385)` 크롭) + IntersectionObserver 지연 렌더로 교체.

## 구현 현황 (개편 진행)
- **Phase 1 완료**: Material Symbols 폰트 추가(`index.html`), **헤더 재디자인**(`AppHeader.vue` — 브레드크럼·**undo/redo 아이콘 버튼**(Material `undo`/`redo`, `getHistoryInstance`)·PC/모바일 토글(`desktop_windows`/`smartphone`)·저장상태·다운로드, 에디터에서만 `showActions`), **좌측 아이콘 레일**(`EditorSidebar.vue`, `editorStore.activeMenu`) `AppLayout`에 추가.
- **아직**: 우측 `PropertiesPanel` 제거 후 좌측 패널로 병합, 레일 메뉴별 패널 콘텐츠 스위칭(전체스타일/포인트색상 패널 신설), 포인트 색상 3개 모델, 캔버스 우측 플로팅 툴바, `EditorToolbar`의 PC/모바일 중복 제거.

## 향후 방향 (사용자 명시, 아직 미구현)
- **조립형(v2) 모듈의 노출/비노출**: 지금은 원본 모듈의 `show*` **스위치 토글**로 제어하지만, 앞으로는 **"그룹 안 원소 모듈을 삭제"** 하는 방식으로 전환 예정. (v2 = 원소 모듈 그룹이므로, 요소 삭제 = 비노출.) SNS 아이콘 등 토글 UI는 이 방향과 함께 재검토.

## 5) 반영 규칙
- **최소 변경**: 해당 노드가 바꾸는 것만. 렌더 관련은 **캔버스·내보내기 두 경로 모두** 반영했는지 확인.
- **검증**: `npx vue-tsc --noEmit -p tsconfig.app.json` + `npx vitest run` 통과 확인. 필요시 dev 서버 기동해 스크린샷.
- **하위호환**: 기존 인스턴스/템플릿이 깨지지 않게 기본값·마이그레이션 유지(예: pointColor→pointColors 시 단일값 폴백).
- **커밋**: `feat:`/`fix:` 한글 컨벤션. (사용자가 Claude 트레일러 제외를 요청한 이력 있음 — 커밋 전 확인.)
- 큰 개편은 단계로 쪼개 진행(데이터 모델 → 스토어 → 렌더 → UI 순).
