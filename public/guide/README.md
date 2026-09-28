# 뉴스레터 가이드 PDF

에디터 왼쪽 아래 `?` 버튼과 랜딩의 '가이드 내려받기'가 주는 파일을 이 폴더에 둔다.

- 파일 이름: **`newsletter-guide.pdf`** (이 이름 그대로여야 한다)
- 가이드를 새로 만들면 **같은 이름으로 덮어쓰면** 된다 — 코드는 고칠 필요 없다.
- `public/`은 빌드가 손대지 않고 그대로 복사하는 자리라, 주소는 배포 경로를 따라
  `/{base}/guide/newsletter-guide.pdf`가 된다.

이름·경로를 바꾸려면 `src/constants/guide.ts`의 `GUIDE_FILE`을 함께 고친다.
가이드 버튼(`GuideButton.vue`)과 랜딩(`LandingView.vue`)이 이 한 곳을 같이 본다.
