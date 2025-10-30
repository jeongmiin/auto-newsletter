# Module05-2 테스트 가이드

## 1. 기본 테스트

### 1.1 Module05-2 추가하기
1. 왼쪽 패널에서 "05-2" 모듈 클릭
2. 캔버스에 모듈이 추가되었는지 확인
3. 오른쪽 속성 패널에서 다음 항목 확인:
   - 이미지 URL
   - 이미지 설명 (Alt)
   - 텍스트
   - ☐ 버튼 1 표시 (체크 안 됨)
   - ☐ 버튼 2 표시 (체크 안 됨)
   - ☐ 버튼 3 표시 (체크 안 됨)
   - ☐ 버튼 4 표시 (체크 안 됨)

### 1.2 초기 상태 확인
- 미리보기: 이미지와 텍스트만 표시, 버튼 없음
- Console 로그 확인:
  ```
  [Module05-2] 🔧 플레이스홀더 교체 시작
  [Module05-2] ❌ 버튼 1 숨김
  [Module05-2] ❌ 버튼 2 숨김
  [Module05-2] ❌ 버튼 3 숨김
  [Module05-2] ❌ 버튼 4 숨김
  [Module05-2] ✅ 플레이스홀더 교체 완료
  ```

## 2. 버튼 1 테스트

### 2.1 버튼 1 활성화
1. "버튼 1 표시" 체크박스를 체크
2. 속성 패널에 다음 필드가 나타나는지 확인:
   - 버튼 1 텍스트
   - 버튼 1 링크
   - 버튼 1 배경색
   - 버튼 1 글자색

### 2.2 미리보기 확인
- 미리보기에 검은색(#111111) 버튼이 표시되는지 확인
- 버튼 텍스트: "버튼 1 →"
- Console 로그:
  ```
  [useModuleRenderer] Module05-2 렌더링 시작
  [useModuleRenderer] showButton1: true
  [Module05-2] ✅ 버튼 1 표시
  ```

### 2.3 버튼 1 커스터마이징
1. 버튼 1 텍스트: "자세히 보기 →" 입력
2. 버튼 1 링크: "https://example.com" 입력
3. 버튼 1 배경색: 빨간색(#FF0000) 선택
4. 버튼 1 글자색: 흰색(#FFFFFF) 선택
5. 미리보기에서 빨간 버튼으로 변경되는지 확인

## 3. 여러 버튼 동시 테스트

### 3.1 버튼 1, 3 활성화
1. "버튼 1 표시" 체크
2. "버튼 3 표시" 체크
3. 미리보기에서 버튼 1(검정)과 버튼 3(녹색 #4CAF50)만 표시되는지 확인
4. Console 로그:
   ```
   [Module05-2] ✅ 버튼 1 표시
   [Module05-2] ❌ 버튼 2 숨김
   [Module05-2] ✅ 버튼 3 표시
   [Module05-2] ❌ 버튼 4 숨김
   ```

### 3.2 모든 버튼 활성화
1. 4개 버튼 모두 체크
2. 미리보기에서 4개 버튼 모두 표시되는지 확인:
   - 버튼 1: 검정 (#111111)
   - 버튼 2: 파란색 (#2196F3)
   - 버튼 3: 녹색 (#4CAF50)
   - 버튼 4: 주황색 (#FF5722)

### 3.3 버튼 비활성화
1. "버튼 2 표시" 체크 해제
2. 미리보기에서 버튼 2가 사라지는지 확인
3. 속성 패널에서 버튼 2 관련 필드(텍스트, 링크, 색상)가 숨겨지는지 확인

## 4. HTML 복사 테스트

### 4.1 버튼 1, 3만 활성화 상태
1. 버튼 1, 3만 체크
2. 상단 "HTML 복사" 버튼 클릭
3. 복사된 HTML을 텍스트 에디터에 붙여넣기
4. HTML 확인:
   - `<!-- 버튼 1 -->` 코드 포함됨
   - `<!-- 버튼 2 -->` 코드 **없음**
   - `<!-- 버튼 3 -->` 코드 포함됨
   - `<!-- 버튼 4 -->` 코드 **없음**

### 4.2 모든 버튼 활성화 상태
1. 4개 버튼 모두 체크
2. "HTML 복사" 클릭
3. HTML 확인: 4개 버튼 코드 모두 포함

### 4.3 모든 버튼 비활성화 상태
1. 4개 버튼 모두 체크 해제
2. "HTML 복사" 클릭
3. HTML 확인: 버튼 코드 전혀 없음

## 5. 미리보기 새 창 테스트

### 5.1 미리보기 새 창 열기
1. 버튼 1, 2 체크
2. 상단 "미리보기" 버튼 클릭
3. 새 창에서 버튼 1, 2만 표시되는지 확인
4. 창 닫기

### 5.2 다른 조합 테스트
1. 버튼 3, 4만 체크
2. "미리보기" 클릭
3. 새 창에서 버튼 3, 4만 표시되는지 확인

## 6. Console 디버깅 테스트

### 6.1 개발자 도구 열기
- F12 또는 Ctrl+Shift+I (Windows)
- Cmd+Option+I (Mac)

### 6.2 Console에서 진단 실행
```javascript
// Module05-2 상태 확인
const moduleStore = window.__VUE_DEVTOOLS_GLOBAL_HOOK__.apps[0]._instance.appContext.config.globalProperties.$moduleStore

// 또는 간단하게
console.log('현재 모듈들:', moduleStore?.modules)

// Module05-2 찾기
const module052 = moduleStore?.modules.find(m => m.moduleId === 'Module05-2')
console.log('Module05-2:', module052)

// 버튼 상태 확인
if (module052) {
  console.log('버튼 체크 상태:', {
    button1: module052.properties.showButton1,
    button2: module052.properties.showButton2,
    button3: module052.properties.showButton3,
    button4: module052.properties.showButton4
  })
}
```

### 6.3 렌더링 테스트
```javascript
// 수동으로 렌더링 함수 호출 (콘솔에서 실행 가능)
import { replaceModule052Content } from '@/utils/moduleContentReplacer'

const testHtml = `
<!-- 버튼 1 -->
<div>버튼 1</div>
<!-- //버튼 1 -->

<!-- 버튼 2 -->
<div>버튼 2</div>
<!-- //버튼 2 -->
`

const testProps = {
  showButton1: true,
  showButton2: false
}

const result = replaceModule052Content(testHtml, testProps)
console.log('결과:', result)
// 예상: 버튼 1만 포함, 버튼 2는 제거됨
```

## 7. 예상되는 문제 및 해결

### 7.1 미리보기에 버튼이 표시 안 됨
**원인:** useModuleRenderer.ts에 Module05-2 케이스가 없음
**해결:** 이미 수정됨 (93-99번째 줄)

### 7.2 체크박스를 눌러도 미리보기가 업데이트 안 됨
**원인:** Vue 반응성 문제
**해결:**
1. F12 → Console 확인
2. 로그에 `[useModuleRenderer watch] currentModule 변경 감지` 있는지 확인
3. 없으면 새로고침 (Ctrl+F5)

### 7.3 HTML 복사 시 버튼이 모두 포함됨
**원인:** moduleStore.generateHtml()이 properties를 제대로 읽지 못함
**해결:**
1. Console에서 `moduleStore.modules` 확인
2. properties에 showButton1~4가 있는지 확인
3. 없으면 모듈 삭제 후 재추가

### 7.4 버튼 색상이 적용 안 됨
**원인:** 플레이스홀더 교체 문제
**해결:**
1. Console에서 `[Module05-2] ✅ 버튼 X 표시` 로그 확인
2. HTML 소스에서 `{{button1BgColor}}` 같은 플레이스홀더가 남아있는지 확인
3. 남아있으면 moduleContentReplacer.ts의 정규식 확인

## 8. 성공 기준

✅ **모든 테스트 통과 조건:**

1. ☑ 버튼 체크 시 속성 패널에 관련 필드 표시
2. ☑ 버튼 체크 해제 시 속성 패널에서 관련 필드 숨김
3. ☑ 버튼 체크 시 미리보기에 버튼 표시
4. ☑ 버튼 체크 해제 시 미리보기에서 버튼 숨김
5. ☑ HTML 복사 시 체크된 버튼만 포함
6. ☑ HTML 복사 시 체크 해제된 버튼은 제외
7. ☑ 미리보기 새 창에서 체크된 버튼만 표시
8. ☑ Console에 올바른 로그 출력
9. ☑ 버튼 색상 커스터마이징 정상 작동
10. ☑ 4개 버튼을 독립적으로 제어 가능

## 9. 추가 테스트 케이스

### 9.1 엣지 케이스
- [ ] 모든 버튼 체크 해제 후 HTML 복사: 버튼 코드 없어야 함
- [ ] 버튼 1, 4만 체크: 버튼 1, 4만 표시
- [ ] 버튼 2, 3만 체크: 버튼 2, 3만 표시
- [ ] 버튼 텍스트를 빈 문자열로 설정: 버튼은 표시되지만 텍스트 없음

### 9.2 성능 테스트
- [ ] 버튼 체크/해제를 빠르게 반복: 미리보기가 버벅거리지 않아야 함
- [ ] 여러 개의 Module05-2 추가: 각각 독립적으로 동작해야 함

## 10. 문제 보고 형식

문제 발생 시 다음 정보 제공:
1. 단계별 재현 방법
2. Console 로그 (F12)
3. Network 탭 에러 (F12)
4. 예상 동작 vs 실제 동작
5. 스크린샷

---

**마지막 업데이트:** 2025-10-30
**버전:** 1.0.0
