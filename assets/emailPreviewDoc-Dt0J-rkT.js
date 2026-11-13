import{l as w,u as h}from"./index-xFe4uFjS.js";import{u as p,ad as g,p as b,b as y}from"./useHistory-C1L91NQW.js";function v(){const o=p(),n=w(),a=async r=>{const l=b(await o.generateHtml());return i(l,r)},i=(r,l,e)=>{let t="";if(l){const s={modules:(e?.modules??o.modules).map(g),groups:e?.groups??o.groups,wrapSettings:e?.wrapSettings??n.wrapSettings,teamId:e?e.teamId:n.currentTeamId},c="\\";t=`
<!-- AUTO_NEWSLETTER_METADATA_START -->
<!-- ${JSON.stringify(s).replace(/</g,c+"u003c").replace(/>/g,c+"u003e")} -->
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
${r}${t}
</body>
</html>`};return{buildDocument:a,wrapDocument:i}}function S(o,n){window.umami?.track(o,n)}async function f(o,n){const a=new Blob([o],{type:"text/html; charset=utf-8"}),i=window.showSaveFilePicker;let r;if(typeof i=="function")try{const t=await i({suggestedName:n,types:[{description:"HTML 파일",accept:{"text/html":[".html"]}}]}),s=await t.createWritable();return await s.write(a),await s.close(),{result:"saved",savedName:t.name||n}}catch(t){if(t instanceof DOMException&&t.name==="AbortError")return{result:"cancelled",savedName:n};r=t instanceof Error?t.name||"Error":"Unknown",console.warn("[download] 저장 창으로 저장하지 못해 일반 다운로드로 받습니다",t)}const l=URL.createObjectURL(a),e=document.createElement("a");return e.href=l,e.download=n,document.body.appendChild(e),e.click(),e.remove(),setTimeout(()=>URL.revokeObjectURL(l),1e3),{result:"triggered",savedName:n,fallbackReason:r}}function E(){const o=h(),n=p(),a=w(),{buildDocument:i}=v();return{downloadHtml:async e=>{if(!n.modules?.length)return o.add({severity:"warn",summary:"내보내기 불가",detail:"먼저 모듈을 추가해주세요",life:4e3}),"empty";try{const t=await i(e),s=y(a.currentTemplateId??a.blankFolder,a.wrapSettings.volume,e?"edit":"send"),{result:c,savedName:d,fallbackReason:m}=await f(t,s);if(c==="cancelled")return"cancelled";e&&n.markAsSaved();const u=e?`${d} (저장용 · 다시 불러와 편집 가능)`:`${d} (발송용 · 메타데이터 제거됨)`;return c==="saved"?o.add({severity:"success",summary:"저장 완료",detail:u,life:3e3}):m?(S("download_fallback",{kind:e?"edit":"send",reason:m}),o.add({severity:"warn",summary:"다운로드 폴더에 받았어요",detail:`저장 창으로 저장하지 못해 ${u} 을(를) 다운로드 폴더에 받았어요. 브라우저 다운로드 목록을 확인하세요. (사유: ${m})`,life:8e3})):o.add({severity:"success",summary:"다운로드 시작됨",detail:`${u} · 브라우저 다운로드 표시줄을 확인하세요`,life:3e3}),c}catch(t){return o.add({severity:"error",summary:"저장 실패",detail:t instanceof Error?t.message:"디스크 공간 부족·권한 등으로 저장하지 못했습니다",life:5e3}),"failed"}},saveHtmlFile:async(e,t)=>(await f(e,t)).result}}function x(o){return`<!DOCTYPE html>
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
    <div class="email-content">${o}</div>
  </div>
</body>
</html>`}export{E as a,x as b,S as t,v as u};
//# sourceMappingURL=emailPreviewDoc-Dt0J-rkT.js.map
