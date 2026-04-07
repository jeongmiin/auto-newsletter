# Newsletter Builder — Design System

> Auto-newsletter 프로젝트의 실제 UI를 분석하여 정리한 디자인 시스템입니다.
> Vue 3 + PrimeVue (Aura Blue) + Tailwind CSS 기반.

---

## 1. Overview & Creative North Star

**"The Digital Curator"** — 뉴스레터 빌더를 단순한 드래그앤드롭 도구가 아닌,
정교한 에디토리얼 워크숍으로 다룹니다.

인터페이스는 무거운 파티션 소프트웨어가 아닌,
**가볍게 떠 있는 모듈들의 시리즈**처럼 느껴져야 합니다.

### 핵심 원칙

- **Breathing Room** — 여백은 빈 공간이 아니라, 복잡한 로직 블록을 분리하는 기능적 도구
- **Tonal Depth** — 선(border)보다 면(surface) 색상 변화로 깊이를 표현
- **Intentional Asymmetry** — 랜딩 페이지에서 비대칭 그리드로 시각적 긴장감 부여

### 3패널 모듈 빌더 구조

- **Left Panel** — 모듈 라이브러리 (26+ 템플릿)
- **Center Canvas** — 모듈이 배치되는 메인 편집 영역 (680px 이메일 표준)
- **Right Panel** — 선택된 모듈의 속성 편집기 (리사이즈 가능)

---

## 2. Colors: Tonal Logic

### Primary Palette

PrimeVue Aura 테마를 Blue 프리셋으로 커스터마이즈하여 사용합니다.

| 역할 | 값 | Tailwind | 사용처 |
|------|----|----------|--------|
| **Primary** | `#3b82f6` | `blue-500` | CTA, 선택 상태, 링크, 활성 탭 |
| **Primary Dark** | `#2563eb` | `blue-600` | 버튼 호버, 그래디언트 끝점 |
| **Primary Light** | `#dbeafe` | `blue-100` | 배지 배경, 드래그 핸들 |
| **Primary Subtle** | `#eff6ff` | `blue-50` | 선택 배경, 카테고리 태그 |
| **Violet Accent** | `#8b5cf6` | `violet-500` | 그래디언트 포인트 (랜딩 전용) |

### Gray Scale (Neutral)

| 역할 | 값 | Tailwind | 사용처 |
|------|----|----------|--------|
| **Text Primary** | `#111827` | `gray-900` | 제목, 본문 강조 |
| **Text Secondary** | `#4b5563` | `gray-600` | 레이블, 보조 텍스트 |
| **Text Tertiary** | `#9ca3af` | `gray-400` | 플레이스홀더, 캡션 |
| **Border Default** | `#e5e7eb` | `gray-200` | 패널 구분, 카드 테두리 |
| **Border Light** | `#f3f4f6` | `gray-100` | 섹션 내부 구분선 |

### Surface Hierarchy (깊이 표현)

선(border)이 아닌 면(surface) 색상 단계로 UI 레이어를 구분합니다.

```
surface-lowest     → #ffffff  (white)    — 모듈 블록, 카드 본문 (가장 앞)
surface            → #f9fafb  (gray-50)  — 앱 배경, 캔버스 영역
surface-container  → #f3f4f6  (gray-100) — 캔버스 배경, 인풋 배경
surface-high       → #e5e7eb  (gray-200) — 호버 상태, 비활성 요소
```

> **"No-Line" 원칙:** 장식용 `1px solid` 보더를 최소화합니다.
> 패널 구분은 `border-r`/`border-l`로 하되, 내부 섹션은 배경색 변화로 구분합니다.

### Semantic Colors

| 역할 | 값 | 사용처 |
|------|----|--------|
| **Error** | `#ef4444` (red-500) | 에러 상태, 삭제 확인 |
| **Success** | `#22c55e` (green-500) | 성공 토스트 |
| **Warning** | `#f59e0b` (amber-500) | 경고 토스트 |
| **Info** | `#3b82f6` (blue-500) | 정보 토스트 (= Primary) |

### Gradient & Glass

```css
/* 랜딩 Hero 타이틀 — "lit from within" 효과 */
background: linear-gradient(135deg, #3b82f6, #8b5cf6);
-webkit-background-clip: text;

/* 랜딩 CTA 버튼 — Blue Glow */
box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);

/* 랜딩 네비게이션 — Glassmorphism */
background: rgba(255, 255, 255, 0.8);
backdrop-filter: blur(24px);

/* 피처 카드 아이콘 배경 */
background: linear-gradient(to bottom right, #dbeafe, #ede9fe); /* blue-100 → violet-100 */

/* 배경 데코레이션 — Ambient Glow */
background: radial-gradient(circle, rgba(59, 130, 246, 0.05), transparent 70%);
filter: blur(64px); /* blur-3xl */
```

### Color Don'ts

- 순수 `#000000` 사용 금지 — 항상 `gray-900` (#111827) 사용
- 색상만으로 상태 구분 금지 — 아이콘 또는 레이블 병행
- 100% 불투명 보더로 장식적 구분 금지 — surface 색상 변화 우선

---

## 3. Typography: Editorial Authority

모든 텍스트에 **Pretendard Variable** 단일 폰트 패밀리 사용.
웨이트 변화만으로 위계를 구성합니다.

```css
font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif;
```

### Scale

| 레벨 | Size | Weight | Tailwind | 용도 |
|------|------|--------|----------|------|
| **Display** | 36-60px | 800 | `text-4xl~6xl font-extrabold` | 랜딩 Hero 타이틀 |
| **Heading L** | 24-30px | 800 | `text-3xl~4xl font-extrabold` | 섹션 타이틀 |
| **Heading M** | 18-20px | 700 | `text-lg~xl font-bold` | 카드 타이틀 |
| **Heading S** | 16px | 600 | `text-base font-semibold` | 헤더 로고, 패널 제목 |
| **Body** | 14-16px | 400 | `text-sm~base` | 일반 본문 |
| **Label** | 12px | 500-600 | `text-xs font-medium` | 폼 레이블, 속성명 |
| **Caption** | 10px | 400-600 | `text-2xs` | 배지, 미니 텍스트 |
| **Micro** | 8px | 400 | `text-3xs` | 목업 내 아이콘 텍스트 |

### 커스텀 Font Size (tailwind.config.js)

```js
extend: {
  fontSize: {
    '2xs': '0.625rem',  // 10px
    '3xs': '0.5rem',    // 8px
  },
}
```

### Typography Don'ts

- 한 화면에 3종 이상 웨이트 혼용 금지 — 400/600 또는 400/700 조합
- `font-extrabold`(800)은 랜딩 전용 — 에디터 내부에서 사용 금지
- `letter-spacing` 커스텀은 `tracking-tight`(제목) / `tracking-widest`(배지 uppercase)만 허용

---

## 4. Elevation & Depth: Tonal Layering

**기본 원칙:** Surface 색상 변화로 깊이를 표현하고, 그림자는 보조 수단으로만 사용합니다.

### Layering Principle

```
[Level 0] surface-container (gray-100)  — 캔버스 배경
  └─ [Level 1] surface-lowest (white)   — 모듈 블록 (자연스러운 lift)
       └─ [Level 2] Primary border      — 선택된 모듈 (blue-500 border)
```

### Shadow Scale (보조 수단)

| 레벨 | Tailwind | 용도 |
|------|----------|------|
| **Ambient** | `shadow-sm` | 캔버스 내 모듈 블록 |
| **Raised** | `shadow-md` | 선택된 모듈, 드롭다운 |
| **Floating** | `shadow-lg` | 캔버스 컨테이너 |
| **Overlay** | `shadow-2xl` | 히어로 목업, 모달 |
| **Blue Glow** | `shadow-lg shadow-blue-500/25` | Primary CTA 전용 |

### Drag 상태 (특수)

```css
/* 드래그 중 — chosen */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

/* 드래그 고스트 */
opacity: 0.5;
background: #e5e7eb; /* gray-200 */
```

### Ghost Border (접근성 대비)

Surface만으로 구분이 어려울 때 사용하는 최소한의 보더:

```css
border: 1px solid rgba(229, 231, 235, 0.6); /* gray-200/60 */
```

---

## 5. Layout

### 3 Panel Structure

```
┌──────────────────────────────────────────────────────┐
│  Header  (px-4 py-2, bg-white, border-b)             │
├──────────┬───────────────────────────┬───────────────┤
│  Left    │   Center Canvas           │  Right Detail │
│  Panel   │   (bg-gray-50)            │  Panel        │
│          │                           │               │
│  w-72    │   flex: 1                 │  w-96         │
│  ~xl:w-80│                           │  min: 280px   │
│          │   ┌─────────────────┐     │  max: 700px   │
│  모듈목록  │   │ max-w-[680px]   │     │  (리사이즈)    │
│  카테고리  │   │ 이메일 캔버스     │     │               │
│  검색     │   │ 모듈 블록들       │     │  속성 편집기    │
│          │   └─────────────────┘     │               │
├──────────┴───────────────────────────┴───────────────┤
│  패널 구분: border-r, border-l  /  리사이즈 핸들: w-2    │
└──────────────────────────────────────────────────────┘
```

### 주요 치수

| 요소 | 값 | 비고 |
|------|----|------|
| 헤더 | auto (py-2) | flex items-center |
| 왼쪽 패널 | 288px / 320px | `w-72 xl:w-80` |
| 오른쪽 패널 | 384px (기본) | 280-700px 리사이즈 |
| 리사이즈 핸들 | 8px | `w-2`, 호버 시 blue 하이라이트 |
| 캔버스 최대 너비 | 680px | 이메일 표준 |
| 캔버스 모바일 | 320px | `w-80` |
| 캔버스 최소 높이 | 600px | 스크롤 영역 |
| 랜딩 max-width | 1280px | `max-w-7xl` |

### Spacing Scale (8px 기반)

| 용도 | 값 | Tailwind |
|------|----|----------|
| 요소 내부 (아이콘-텍스트) | 4-8px | `gap-1`, `gap-2` |
| 컴포넌트 내부 패딩 | 12px | `p-3` |
| 모듈 블록 간격 | 16-24px | `gap-4`, `gap-6` |
| 섹션 간 여백 | 32px+ | `p-8`, `mb-8` |
| 랜딩 섹션 패딩 | 96-128px | `py-24 lg:py-32` |
| 랜딩 좌우 패딩 | 24px | `px-6` |

---

## 6. Components

### Buttons (PrimeVue Button)

전역 등록된 `<Button>` 컴포넌트를 사용합니다.

| 유형 | 사용 | 코드 |
|------|------|------|
| **Primary** | 화면당 1개, 가장 중요한 액션 | `<Button label="시작" />` |
| **Secondary Outlined** | 보조 액션 | `<Button severity="secondary" outlined />` |
| **Ghost/Text** | 최소 강조 (삭제, 접기) | `<Button severity="danger" text size="small" />` |
| **Contrast** | 컬러 배경 위 CTA | `<Button severity="contrast" />` |

```html
<!-- Primary — 그래디언트 느낌을 shadow로 표현 -->
<Button label="에디터 시작하기" icon="pi pi-arrow-right" iconPos="right"
  class="!rounded-xl !shadow-lg !shadow-blue-500/25" />

<!-- Small Outlined — 헤더 버튼들 -->
<Button label="코드 복사" icon="pi pi-copy" severity="secondary"
  outlined size="small" v-tooltip.bottom="'코드를 복사합니다'" />
```

**규칙:**
- 최소 높이 44px (터치 타겟)
- 아이콘은 PrimeIcons (`pi pi-*`)
- CTA에만 `!shadow-lg !shadow-blue-500/25` 적용
- 에디터 내부 버튼은 `size="small"` 통일

### Newsletter Block (모듈 블록)

캔버스에 배치되는 모듈의 상태별 스타일:

```html
<!-- 기본 상태 — surface-lowest on surface-container -->
<div class="bg-white border-2 border-transparent rounded transition-all">
  <!-- v-html 콘텐츠 -->
</div>

<!-- 호버 — Ghost Border 등장 -->
<div class="bg-white border-2 border-gray-300 rounded transition-all">
</div>

<!-- 선택 — Primary border + 서피스 틴트 -->
<div class="bg-white border-2 border-blue-500 bg-blue-50/50 rounded">
</div>

<!-- 드래그 핸들 — 블록과 분리된 인터랙션 영역 -->
<div class="bg-blue-100/90 hover:bg-blue-200/90 rounded-full p-1">
  <i class="pi pi-arrows-alt text-blue-600"></i>
</div>
```

### Input Fields (PrimeVue)

미니멀 스타일. `surface-container` 배경, 보더 최소화.

```html
<InputText v-model="value" class="w-full" placeholder="입력하세요" />
<ColorPicker v-model="color" />
<Select v-model="selected" :options="options" optionLabel="label" />
<ToggleSwitch v-model="checked" />
```

**Focus 상태:** PrimeVue 기본 focus ring (Primary 색상)

### Cards & Containers

```html
<!-- 왼쪽 패널: 모듈 선택 카드 -->
<div class="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors group">
  <div class="text-sm font-medium text-gray-700">모듈 이름</div>
  <div class="text-xs text-gray-400 mt-1">설명</div>
</div>

<!-- 랜딩: 피처 카드 — hover로 shadow 부여 -->
<div class="bg-gray-50 p-7 rounded-2xl border border-gray-100
            group hover:shadow-xl transition-all duration-500">
  <div class="w-12 h-12 bg-gradient-to-br from-blue-100 to-violet-100
              rounded-xl flex items-center justify-center
              group-hover:scale-110 transition-transform">
    <i class="pi pi-th-large text-lg text-blue-600"></i>
  </div>
  <h3 class="text-lg font-bold mt-5 mb-2">기능 이름</h3>
  <p class="text-sm text-gray-500 leading-relaxed">설명 텍스트</p>
</div>
```

### Badges

```html
<!-- 카테고리 뱃지 -->
<span class="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">헤더</span>

<!-- 순번 뱃지 -->
<span class="w-5 h-5 bg-blue-100 text-blue-600 rounded-full
             flex items-center justify-center text-xs font-bold">1</span>

<!-- 랜딩 상태 뱃지 — uppercase tracking -->
<span class="inline-block px-4 py-1.5 bg-blue-500/10 text-blue-600
             font-semibold text-2xs tracking-widest uppercase rounded-full">
  Newsletter Builder
</span>
```

### Collapsible Sections (속성 패널)

```html
<div class="border-b">
  <button class="w-full flex items-center justify-between p-3
                 hover:bg-gray-50 transition-colors">
    <span class="text-sm font-semibold text-gray-700">섹션 이름</span>
    <i class="pi pi-chevron-down text-xs text-gray-400"></i>
  </button>
  <div class="p-3 space-y-3">
    <!-- 속성 필드들 -->
  </div>
</div>
```

### Form Labels

```html
<label class="block text-xs font-medium text-gray-600 mb-1">속성 이름</label>
```

### Toast (PrimeVue)

```html
<Toast position="top-right" />
```

| severity | 용도 | life |
|----------|------|------|
| `success` | 완료, 저장 | 3000ms |
| `error` | 실패, 에러 | 5000ms |
| `warn` | 경고, 주의 | 4000ms |
| `info` | 정보, 상태 변경 | 2000ms |

### Loading Spinner

```html
<div class="w-8 h-8 border-3 border-blue-500 border-t-transparent
            rounded-full animate-spin"></div>
```

---

## 7. Interactive States

### Hover

| 대상 | 효과 | 클래스 |
|------|------|--------|
| 텍스트 버튼 | 색상 진해짐 | `hover:text-gray-800` |
| 카드 | 배경색 변화 | `hover:bg-gray-50` |
| 모듈 블록 | Ghost Border 등장 | `hover:border-gray-300` |
| 랜딩 카드 | Shadow 부여 + 아이콘 확대 | `hover:shadow-xl` + `group-hover:scale-110` |
| 리사이즈 핸들 | Blue 하이라이트 | `group-hover:bg-blue-100` |

### Selected / Active

| 대상 | 스타일 |
|------|--------|
| 모듈 선택 | `border-blue-500 bg-blue-50/50` |
| 탭 활성 | `bg-blue-50 text-blue-600 border-b-2 border-blue-600` |
| 드래그 중 | `box-shadow: 0 4px 12px rgba(0,0,0,0.15)` |

### Transitions

```
transition-all duration-200    — 빠른 상태 (색상, 보더)
transition-all duration-300    — 기본 전환
transition-all duration-500    — 느린 전환 (랜딩 카드)
transition-colors              — 색상만
transition-transform           — 스케일/이동만
```

---

## 8. Responsive

Tailwind 기본 브레이크포인트:

| 브레이크포인트 | 값 | 용도 |
|-------------|-----|------|
| `sm` | 640px | 모바일 → 태블릿 |
| `md` | 768px | 그리드 2열 전환 |
| `lg` | 1024px | 3패널 레이아웃, 2열 Hero |
| `xl` | 1280px | 왼쪽 패널 확장 (w-72 → w-80) |

### 패턴

```html
<!-- 그리드 반응형 -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-16">     <!-- Hero -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> <!-- 피처 -->
<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">      <!-- 스텝 -->

<!-- 폰트 반응형 -->
<h1 class="text-4xl lg:text-6xl">
<h2 class="text-3xl lg:text-4xl">

<!-- 패딩 반응형 -->
<section class="py-24 lg:py-32 px-6">
```

---

## 9. Icons (PrimeIcons v7)

`pi pi-*` 클래스 형태로 사용합니다.

| 카테고리 | 아이콘 | 용도 |
|----------|--------|------|
| **네비게이션** | `arrow-right`, `chevron-down`, `chevron-up` | CTA, 접기/펼치기 |
| **액션** | `copy`, `download`, `folder-open`, `eye`, `trash`, `clone` | 헤더 버튼, 모듈 조작 |
| **모듈** | `image`, `align-left`, `table`, `th-large`, `list` | 모듈 타입 아이콘 |
| **상태** | `check`, `times`, `exclamation-triangle`, `info-circle` | 토스트, 검증 |
| **편집** | `pencil`, `palette`, `link`, `sort-alt`, `arrows-alt` | 속성 편집, 드래그 |

---

## 10. Z-Index Layers

| 레이어 | 값 | 용도 |
|--------|-----|------|
| 기본 콘텐츠 | `auto` | 일반 UI |
| 드래그 오버레이 | `z-10` | 드래그 중 요소 |
| 리사이즈/네비게이션 | `z-50` | 패널 리사이즈, 랜딩 헤더 |
| 미리보기 팝업 | `z-[1000]` | 이메일 미리보기 헤더 |

---

## 11. Do's and Don'ts

### Do

- 여백(`gap`, `space-y`)을 구조적 요소로 활용 — 답답하면 보더 대신 간격을 늘릴 것
- 플로팅 속성 패널에 `backdrop-blur`를 활용하여 캔버스가 비치도록
- 코드 관련 요소(HTML 미리보기)에 `font-mono` 적용하여 "high-tech" 느낌
- PrimeVue 컴포넌트 우선 사용, `v-tooltip`으로 도움말 제공
- `transition-all duration-300` 일관 적용

### Don't

- 순수 `#000000` 사용 금지 — 항상 `gray-900` (#111827)
- `1px solid` 보더로 사이드바-캔버스 사이 장식 금지 — `surface` 색상 변화 사용
- 큰 컨테이너에 `rounded`(4px) 사용 금지 — `rounded-xl`(12px) 이상
- 에디터 내부에서 `font-extrabold`(800) 사용 금지 — 랜딩 전용
- 한 화면에 Primary 버튼 여러 개 배치 금지
- 네이티브 HTML 폼 요소 직접 사용 금지 — PrimeVue 컴포넌트 사용

---

## 12. File References

| 파일 | 역할 |
|------|------|
| `tailwind.config.js` | 폰트, 커스텀 fontSize |
| `src/main.ts` | PrimeVue BluePreset 테마, 전역 컴포넌트 |
| `src/assets/main.css` | Pretendard CDN, Tailwind directives |
| `src/components/layout/AppLayout.vue` | 3패널 구조, 리사이즈 로직 |
| `src/components/layout/AppHeader.vue` | 헤더 레이아웃 |
| `src/views/LandingView.vue` | 랜딩 페이지 디자인 |
