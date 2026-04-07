# HTML을 뉴스레터 모듈로 변환

사용자가 제공한 HTML 파일을 이 프로젝트의 뉴스레터 모듈로 변환합니다.

## 입력

$ARGUMENTS

(HTML 파일 경로 또는 모듈 이름. 예: `public/modules/MyNewModule.html` 또는 `MyNewModule`)

## 변환 작업 순서

아래 순서를 **반드시** 따라 진행합니다. 각 단계를 완료한 후 다음 단계로 넘어가세요.

---

### Step 1: HTML 분석

대상 HTML 파일을 읽고 다음을 식별합니다:

- **텍스트 콘텐츠**: 사용자가 편집할 텍스트 (제목, 본문, 버튼 텍스트 등)
- **색상 값**: 인라인 스타일의 color, background-color, border-color 등 (`#xxxxxx` 형태)
- **이미지 URL**: `<img src="...">` 의 src 값
- **링크 URL**: `<a href="...">` 의 href 값
- **조건부 요소**: 사용자가 on/off할 수 있는 영역 (버튼, 서브타이틀 등)

### Step 2: 플레이스홀더 변환

식별된 값들을 `{{camelCase}}` 플레이스홀더로 교체합니다.

**네이밍 규칙:**
- 텍스트: `{{titleText}}`, `{{descriptionText}}`, `{{buttonText}}` 등
- 색상: `{{titleColor}}`, `{{bgColor}}`, `{{buttonBgColor}}`, `{{buttonTextColor}}` 등
- 이미지: `{{imageUrl}}`, `{{imageAlt}}`, `{{logoImageUrl}}` 등
- 링크: `{{buttonUrl}}`, `{{imageLinkUrl}}` 등
- 테두리: `{{borderWidth}}`, `{{borderColor}}`, `{{borderTopColor}}` 등

**조건부 영역에는 HTML 주석 마커를 추가:**
```html
<!-- 버튼 -->
<a href="{{buttonUrl}}">{{buttonText}}</a>
<!-- //버튼 -->
```

### Step 3: modules-config.json에 모듈 등록

`public/modules/modules-config.json` 파일의 `modules` 배열에 새 모듈을 추가합니다.

```json
{
  "id": "ModuleName",
  "name": "모듈 한글 이름",
  "htmlFile": "ModuleName.html",
  "category": "적절한 카테고리",
  "editableProps": [
    // Step 2에서 만든 플레이스홀더에 대응하는 속성들
  ]
}
```

**editableProps 타입 규칙:**
| 플레이스홀더 성격 | type | 비고 |
|---|---|---|
| 짧은 텍스트 | `"text"` | 제목, 버튼 텍스트 등 |
| 긴 텍스트 / HTML 서식 | `"textarea"` | 본문, 설명 등 |
| 색상 | `"color"` | `#000000` 기본값 |
| URL | `"url"` | `#` 기본값 |
| 이미지 URL | `"image"` | 기본 이미지 URL |
| 토글 | `"boolean"` | 조건부 영역 on/off |
| 선택 | `"select"` | options 배열 필요 |

**반드시 `default` 값을 지정합니다.** 원본 HTML에 있던 값을 기본값으로 사용하세요.

### Step 4: moduleConfigs.ts에 설정 추가

`src/utils/moduleConfigs.ts`에 모듈 설정 객체를 추가합니다.

```typescript
export const moduleNewNameConfig: ModuleConfig = {
  // HTML 서식이 필요한 필드 (Quill 에디터)
  quillFields: ['descriptionText'],
  // 기본값
  defaults: {
    titleText: '기본 제목',
    bgColor: '#ffffff',
    // ...
  },
  // 필요시 커스텀 프로세서
  processors: [processors.imageLinkProcessor],
}
```

그리고 같은 파일의 `MODULE_CONFIG_REGISTRY`에 등록:
```typescript
ModuleName: moduleNewNameConfig,
```

### Step 5: moduleContentReplacer.ts에 교체 함수 추가

`src/utils/moduleContentReplacer.ts`에 export 함수를 추가합니다.

**동기 (대부분의 경우):**
```typescript
export function replaceModuleNameContent(
  html: string,
  properties: Record<string, unknown>,
): string {
  return replaceModuleContentSync(html, properties, MODULE_CONFIG_REGISTRY.ModuleName)
}
```

**비동기 (추가 콘텐츠 삽입이 필요한 경우):**
```typescript
export async function replaceModuleNameContent(
  html: string,
  properties: Record<string, unknown>,
  insertAdditionalContents?: ProcessorContext['insertAdditionalContents'],
): Promise<string> {
  return replaceModuleContent(html, properties, MODULE_CONFIG_REGISTRY.ModuleName, {
    insertAdditionalContents,
  })
}
```

### Step 6: moduleStore.ts & useModuleRenderer.ts에 switch case 추가

`src/stores/moduleStore.ts`의 `replaceModuleContent` switch문에 추가:
```typescript
case 'ModuleName':
  return replaceModuleNameContent(html, properties)
```

`src/composables/useModuleRenderer.ts`의 `replaceModuleContent` switch문에도 동일하게 추가.

둘 다 상단의 import문에 새 함수를 추가하는 것을 잊지 마세요.

### Step 7: 검증

- `npx vitest run`으로 기존 테스트가 깨지지 않는지 확인
- 변환된 HTML 파일에 `{{` 플레이스홀더가 올바르게 들어갔는지 확인
- modules-config.json의 editableProps 키와 HTML의 플레이스홀더가 1:1 매칭되는지 확인

---

## 참고: 기존 모듈 파일 위치

- HTML 템플릿: `public/modules/`
- 모듈 설정: `public/modules/modules-config.json`
- 설정 레지스트리: `src/utils/moduleConfigs.ts`
- 교체 함수: `src/utils/moduleContentReplacer.ts`
- 커스텀 프로세서: `src/utils/processors/index.ts`
- Store switch: `src/stores/moduleStore.ts` → `replaceModuleContent()`
- Renderer switch: `src/composables/useModuleRenderer.ts` → `replaceModuleContent()`
