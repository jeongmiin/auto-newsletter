# 블록 요소 Spacing 테스트 가이드

## ✅ 구현 완료

HTML 복사 시 Quill 에디터에서 생성된 `<p>`, `<h1>`, `<h2>`, `<h3>` 태그에 `margin: 0; padding: 0;` 인라인 스타일이 자동으로 추가됩니다.

## 🔧 구현 내용

### 1. **quillHtmlProcessor.ts 유틸리티**
- 위치: `src/utils/quillHtmlProcessor.ts`
- 기능:
  - `convertRgbToHex()` - RGB → HEX 색상 변환
  - `addZeroSpacingToBlocks()` - 블록 요소에 margin: 0, padding: 0 추가
  - `processQuillHtml()` - 통합 처리 함수
  - `testBlockSpacing()` - 테스트 함수
  - `verifyBlockSpacing()` - HTML 검증 함수

### 2. **QuillEditor.vue 업데이트**
- `processQuillHtml` import 및 사용
- `text-change` 이벤트 핸들러에서 자동 처리
- CSS: 에디터 내부 블록 요소 margin/padding 제거

### 3. **ModuleRenderer.vue 업데이트**
- CSS: 미리보기 영역 블록 요소 margin/padding 제거
- 헤더 크기는 유지하되 spacing만 제거

## 🧪 테스트 방법

### 브라우저 개발자 도구에서 테스트:

```javascript
// 1. 테스트 함수 import
import { testBlockSpacing } from '@/utils/quillHtmlProcessor'

// 2. 테스트 실행
testBlockSpacing()

// 예상 출력:
// === 블록 요소 spacing 테스트 ===
//
// 테스트 1:
// 입력: <p>일반 문단</p>
// 출력: <p style="margin: 0; padding: 0;">일반 문단</p>
// 검증: ✅ PASS
//
// 테스트 2:
// 입력: <h1>헤더 1</h1>
// 출력: <h1 style="margin: 0; padding: 0;">헤더 1</h1>
// 검증: ✅ PASS
// ...
```

### 실제 사용 테스트:

1. **Quill 에디터에서 텍스트 입력**
   - 일반 문단 입력
   - H1, H2, H3 헤더 입력
   - 색상 적용
   - 서식 적용 (볼드, 이탤릭 등)

2. **미리보기 확인**
   - 캔버스에서 입력한 내용 확인
   - 간격이 0으로 표시되는지 확인

3. **HTML 복사**
   - "HTML 복사" 버튼 클릭
   - 개발자 도구 Console 열기

4. **복사된 HTML 확인**
   ```javascript
   // 클립보드에서 읽기
   const html = await navigator.clipboard.readText()
   console.log(html)

   // 블록 태그 검증
   import { verifyBlockSpacing } from '@/utils/quillHtmlProcessor'
   const stats = verifyBlockSpacing(html)

   // 결과 예시:
   // 📊 <p> 태그: 5/5 처리됨
   // 📊 <h1> 태그: 2/2 처리됨
   // 📊 <h2> 태그: 3/3 처리됨
   // 📊 <h3> 태그: 1/1 처리됨
   ```

## 📋 예시 출력

### 입력 (Quill 에디터):
```
제목입니다 (H1 적용)
부제목입니다 (H2 적용)
일반 문단입니다.
다른 문단입니다.
```

### 출력 (HTML 복사):
```html
<h1 style="margin: 0; padding: 0;">제목입니다</h1>
<h2 style="margin: 0; padding: 0;">부제목입니다</h2>
<p style="margin: 0; padding: 0;">일반 문단입니다.</p>
<p style="margin: 0; padding: 0;">다른 문단입니다.</p>
```

### 색상 적용 시:
```html
<p style="color: #ff0000; margin: 0; padding: 0;">빨간 텍스트</p>
<h1 style="font-size: 32px; margin: 0; padding: 0;">큰 헤더</h1>
```

## ✅ 처리되는 태그

- `<p>` - 문단
- `<h1>` - 헤더 1
- `<h2>` - 헤더 2
- `<h3>` - 헤더 3

## 🎯 적용되는 스타일

모든 블록 요소에 자동으로 추가:
```css
margin: 0;
padding: 0;
```

## 🔍 검증 체크리스트

- [✅] Quill 에디터에서 텍스트 입력
- [✅] 색상 및 서식 적용
- [✅] 미리보기에서 확인
- [✅] HTML 복사
- [✅] 개발자 도구에서 HTML 확인
- [✅] 모든 `<p>`, `<h1>`, `<h2>`, `<h3>` 태그에 `margin: 0; padding: 0;` 포함
- [✅] 기존 style 속성이 있는 경우에도 margin/padding 추가
- [✅] RGB → HEX 변환도 함께 동작

## 💡 추가 정보

### 처리 순서:
1. 사용자가 Quill 에디터에서 텍스트 입력
2. `text-change` 이벤트 발생
3. `processQuillHtml()` 실행:
   - RGB → HEX 변환
   - 블록 요소에 margin: 0, padding: 0 추가
4. 처리된 HTML이 모델에 저장
5. HTML 복사 시 이미 처리된 HTML이 복사됨

### 장점:
- ✅ 자동 처리 - 사용자 개입 불필요
- ✅ 일관성 - 모든 블록 요소에 동일한 spacing 적용
- ✅ 이메일 호환성 - 인라인 스타일로 이메일 클라이언트 지원
- ✅ 미리보기 정확도 - CSS와 인라인 스타일 모두 일치

## 🚀 사용 시작

프로젝트 실행 후 바로 사용 가능:
```bash
npm run dev
```

모든 Quill 에디터에서 자동으로 적용됩니다!
