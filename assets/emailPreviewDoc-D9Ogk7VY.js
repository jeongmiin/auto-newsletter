import{l as f,u as b}from"./index-D7kCxyfH.js";import{u as p,ad as g,p as v,b as y}from"./useHistory-DSaLv5RM.js";function S(){const e=p(),t=f(),a=async r=>{const l=v(await e.generateHtml());return i(l,r)},i=(r,l,o)=>{let n="";if(l){const s={modules:(o?.modules??e.modules).map(g),groups:o?.groups??e.groups,wrapSettings:o?.wrapSettings??t.wrapSettings,teamId:o?o.teamId:t.currentTeamId},c="\\";n=`
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
${r}${n}
</body>
</html>`};return{buildDocument:a,wrapDocument:i}}function T(e,t){window.umami?.track(e,t)}const E=4e3,k=8e3;class h extends Error{constructor(t){super(t),this.name=t}}function x(e){return new Promise((t,a)=>{let i;const r=()=>{clearTimeout(i),i=setTimeout(()=>a(new h("PickerStalled")),E)},l=()=>clearTimeout(i);window.addEventListener("focus",r),window.addEventListener("blur",l),e().then(t,a).finally(()=>{clearTimeout(i),window.removeEventListener("focus",r),window.removeEventListener("blur",l)})})}function A(e){return new Promise((t,a)=>{const i=setTimeout(()=>a(new h("WriteStalled")),k);e.then(t,a).finally(()=>clearTimeout(i))})}async function w(e,t){const a=new Blob([e],{type:"text/html; charset=utf-8"}),i=window.showSaveFilePicker;let r;if(typeof i=="function")try{const n=await x(()=>i({suggestedName:t,types:[{description:"HTML 파일",accept:{"text/html":[".html"]}}]}));return await A((async()=>{const s=await n.createWritable();await s.write(a),await s.close()})()),{result:"saved",savedName:n.name||t}}catch(n){if(n instanceof DOMException&&n.name==="AbortError")return{result:"cancelled",savedName:t};r=n instanceof Error?n.name||"Error":"Unknown",console.warn("[download] 저장 창으로 저장하지 못해 일반 다운로드로 받습니다",n)}const l=URL.createObjectURL(a),o=document.createElement("a");return o.href=l,o.download=t,document.body.appendChild(o),o.click(),o.remove(),setTimeout(()=>URL.revokeObjectURL(l),1e3),{result:"triggered",savedName:t,fallbackReason:r}}function N(){const e=b(),t=p(),a=f(),{buildDocument:i}=S();return{downloadHtml:async o=>{if(!t.modules?.length)return e.add({severity:"warn",summary:"내보내기 불가",detail:"먼저 모듈을 추가해주세요",life:4e3}),"empty";try{const n=await i(o),s=y(a.currentTemplateId??a.blankFolder,a.wrapSettings.volume,o?"edit":"send"),{result:c,savedName:d,fallbackReason:m}=await w(n,s);if(c==="cancelled")return"cancelled";o&&t.markAsSaved();const u=o?`${d} (저장용 · 다시 불러와 편집 가능)`:`${d} (발송용 · 메타데이터 제거됨)`;return c==="saved"?e.add({severity:"success",summary:"저장 완료",detail:u,life:3e3}):m?(T("download_fallback",{kind:o?"edit":"send",reason:m}),e.add({severity:"warn",summary:"다운로드 폴더에 받았어요",detail:`저장 창으로 저장하지 못해 ${u} 을(를) 다운로드 폴더에 받았어요. 브라우저 다운로드 목록을 확인하세요. (사유: ${m})`,life:8e3})):e.add({severity:"success",summary:"다운로드 시작됨",detail:`${u} · 브라우저 다운로드 표시줄을 확인하세요`,life:3e3}),c}catch(n){return e.add({severity:"error",summary:"저장 실패",detail:n instanceof Error?n.message:"디스크 공간 부족·권한 등으로 저장하지 못했습니다",life:5e3}),"failed"}},saveHtmlFile:async(o,n)=>(await w(o,n)).result}}function P(e){return`<!DOCTYPE html>
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
    <div class="email-content">${e}</div>
  </div>
</body>
</html>`}export{N as a,P as b,T as t,S as u};
//# sourceMappingURL=emailPreviewDoc-D9Ogk7VY.js.map
