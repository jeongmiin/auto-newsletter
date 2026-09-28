/**
 * 메일 본문 미리보기 문서 — iframe 안에 들어갈 완전한 HTML.
 *
 * 헤더의 '미리보기'(새 창)와 템플릿 선택의 미리보기 모달이 같은 문서를 쓴다.
 * 반응형 미디어쿼리가 **iframe 폭**(고른 기기 해상도) 기준으로 동작하도록 별도 문서로 감싼다.
 * ⚠ iframe 안 문서라 앱의 CSS 변수(tokens.css)가 닿지 않는다 — 색은 리터럴로 둔다.
 */
export function buildEmailPreviewDocument(finalHtml: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .preview-container {
      max-width: 680px;
      margin: 0 auto;
      background-color: white;
    }
    .email-content { padding: 0; }
    @media (max-width: 768px) {
      .preview-container { max-width: 100%; }
    }
    .email-content p, .email-content h1, .email-content h2, .email-content h3 { margin: 0; padding: 0; }
    .email-content h1 { font-size: 2em; font-weight: bold; }
    .email-content h2 { font-size: 1.5em; font-weight: bold; }
    .email-content h3 { font-size: 1.17em; font-weight: bold; }
    .email-content strong { font-weight: 700; }
    .email-content em { font-style: italic; }
    .email-content a { color: #0066cc; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="preview-container">
    <div class="email-content">${finalHtml}</div>
  </div>
</body>
</html>`
}
