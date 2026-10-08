import{i as u,u as p}from"./index-CAh3fexo.js";import{u as f,ad as w,p as h,b as g}from"./useHistory-BYXXvuvr.js";function b(){const t=f(),n=u(),r=async s=>{const a=h(await t.generateHtml());return l(a,s)},l=(s,a,e)=>{let o="";if(a){const i={modules:(e?.modules??t.modules).map(w),groups:e?.groups??t.groups,wrapSettings:e?.wrapSettings??n.wrapSettings,teamId:e?e.teamId:n.currentTeamId},c="\\";o=`
<!-- AUTO_NEWSLETTER_METADATA_START -->
<!-- ${JSON.stringify(i).replace(/</g,c+"u003c").replace(/>/g,c+"u003e")} -->
<!-- AUTO_NEWSLETTER_METADATA_END -->`}return`<!DOCTYPE html>
<html lang="ko" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no">
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <title>Newsletter</title>
  <style>
    /* 아웃룩(Word 엔진) 보정: 테이블 간격 제거, 이미지 보간/테두리 정리 */
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; }
  </style>
</head>
<body style="margin:0; padding:0; background-color: #f2f2f2;">
${s}${o}
</body>
</html>`};return{buildDocument:r,wrapDocument:l}}async function d(t,n){const r=new Blob([t],{type:"text/html; charset=utf-8"}),l=window.showSaveFilePicker;if(typeof l=="function"){let e;try{e=await l({suggestedName:n,types:[{description:"HTML 파일",accept:{"text/html":[".html"]}}]})}catch(i){if(i instanceof DOMException&&i.name==="AbortError")return"cancelled";throw i}const o=await e.createWritable();return await o.write(r),await o.close(),"saved"}const s=URL.createObjectURL(r),a=document.createElement("a");return a.href=s,a.download=n,document.body.appendChild(a),a.click(),a.remove(),setTimeout(()=>URL.revokeObjectURL(s),1e3),"triggered"}function S(){const t=p(),n=f(),r=u(),{buildDocument:l}=b();return{downloadHtml:async e=>{if(!n.modules?.length)return t.add({severity:"warn",summary:"내보내기 불가",detail:"먼저 모듈을 추가해주세요",life:4e3}),"empty";try{const o=await l(e),i=g(r.currentTemplateId??r.blankFolder,r.wrapSettings.volume,e?"edit":"send"),c=await d(o,i);if(c==="cancelled")return"cancelled";e&&n.markAsSaved();const m=e?`${i} (저장용 · 다시 불러와 편집 가능)`:`${i} (발송용 · 메타데이터 제거됨)`;return c==="saved"?t.add({severity:"success",summary:"저장 완료",detail:m,life:3e3}):t.add({severity:"success",summary:"다운로드 시작됨",detail:`${m} · 브라우저 다운로드 표시줄을 확인하세요`,life:3e3}),c}catch(o){return t.add({severity:"error",summary:"저장 실패",detail:o instanceof Error?o.message:"디스크 공간 부족·권한 등으로 저장하지 못했습니다",life:5e3}),"failed"}},saveHtmlFile:(e,o)=>d(e,o)}}function T(t){return`<!DOCTYPE html>
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
    <div class="email-content">${t}</div>
  </div>
</body>
</html>`}function x(t,n){window.umami?.track(t,n)}export{S as a,T as b,x as t,b as u};
//# sourceMappingURL=umami-DDWMnQP1.js.map
