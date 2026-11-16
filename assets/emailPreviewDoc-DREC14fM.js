import{l as g,u as T,r as E}from"./index-CS7R-jiX.js";import{u as y,ad as k,p as P,b as D}from"./useHistory-DmUkL2vw.js";function N(){const e=y(),t=g(),r=async i=>{const s=P(await e.generateHtml(!1,void 0,{strict:!0}));return l(s,i)},l=(i,s,o)=>{let a="";if(s){const n={modules:(o?.modules??e.modules).map(k),groups:o?.groups??e.groups,wrapSettings:o?.wrapSettings??t.wrapSettings,teamId:o?o.teamId:t.currentTeamId},c="\\";a=`
<!-- AUTO_NEWSLETTER_METADATA_START -->
<!-- ${JSON.stringify(n).replace(/</g,c+"u003c").replace(/>/g,c+"u003e")} -->
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
${i}${a}
</body>
</html>`};return{buildDocument:r,wrapDocument:l}}function b(e,t){window.umami?.track(e,t)}const _=4e3,A=8e3,I=5e3,x=1e3;class m extends Error{constructor(t){super(t),this.name=t}}const h=e=>e instanceof DOMException&&e.name==="AbortError";function L(e){return new Promise((t,r)=>{const l=Date.now();let i=!1,s;const o=setTimeout(()=>{!i&&document.hasFocus()&&r(new m("PickerNotShown"))},I),a=()=>{clearTimeout(s),s=setTimeout(()=>r(new m("PickerStalled")),_)},n=()=>{i=!0,clearTimeout(s)};window.addEventListener("focus",a),window.addEventListener("blur",n),Promise.resolve().then(e).then(t,c=>{const d=h(c)&&!i&&Date.now()-l<x;r(d?new m("PickerBlocked"):c)}).finally(()=>{clearTimeout(s),clearTimeout(o),window.removeEventListener("focus",a),window.removeEventListener("blur",n)})})}const v="auto-newsletter:download-skip-picker",R=10080*60*1e3,O=new Set(["PickerStalled","PickerNotShown","PickerBlocked","WriteStalled","WriteAborted"]);function U(){try{const e=Number(localStorage.getItem(v));return Number.isFinite(e)&&e>Date.now()}catch{return!1}}function F(e){if(O.has(e))try{localStorage.setItem(v,String(Date.now()+R))}catch{}}function B(e){return new Promise((t,r)=>{const l=setTimeout(()=>r(new m("WriteStalled")),A);e.then(t,r).finally(()=>clearTimeout(l))})}async function S(e,t){const r=new Blob([e],{type:"text/html; charset=utf-8"}),l=window.showSaveFilePicker;let i;if(typeof l=="function"&&!U())try{let a;try{a=await L(()=>l({suggestedName:t,types:[{description:"HTML 파일",accept:{"text/html":[".html"]}}]}))}catch(n){if(h(n))return{result:"cancelled",savedName:t};throw n}try{await B((async()=>{const n=await a.createWritable();await n.write(r),await n.close()})())}catch(n){throw h(n)?new m("WriteAborted"):n}return{result:"saved",savedName:a.name||t}}catch(a){i=a instanceof Error?a.name||"Error":"Unknown",F(i),console.warn("[download] 저장 창으로 저장하지 못해 일반 다운로드로 받습니다",a)}const s=URL.createObjectURL(r),o=document.createElement("a");return o.href=s,o.download=t,document.body.appendChild(o),o.click(),o.remove(),setTimeout(()=>URL.revokeObjectURL(s),6e4),{result:"triggered",savedName:t,fallbackReason:i}}const u=E(!1),C=2e4;function H(e){return new Promise((t,r)=>{const l=setTimeout(()=>{const i=new Error("파일을 만드는 데 너무 오래 걸려 멈췄어요. 네트워크를 확인하고 다시 시도해 주세요.");i.name="BuildTimeout",r(i)},C);e.then(t,r).finally(()=>clearTimeout(l))})}function K(){const e=T(),t=y(),r=g(),{buildDocument:l}=N();return{downloadHtml:async o=>{if(!t.modules?.length)return e.add({severity:"warn",summary:"내보내기 불가",detail:"먼저 모듈을 추가해주세요",life:4e3}),"empty";if(u.value)return"busy";u.value=!0;let a="build";try{const n=await H(l(o));a="save";const c=D(r.currentTemplateId??r.blankFolder,r.wrapSettings.volume,o?"edit":"send"),{result:d,savedName:p,fallbackReason:w}=await S(n,c);if(d==="cancelled")return"cancelled";o&&t.markAsSaved();const f=o?`${p} (저장용 · 다시 불러와 편집 가능)`:`${p} (발송용 · 메타데이터 제거됨)`;return d==="saved"?e.add({severity:"success",summary:"저장 완료",detail:f,life:3e3}):w?(b("download_fallback",{kind:o?"edit":"send",reason:w}),e.add({severity:"warn",summary:"다운로드 폴더에 받았어요",detail:`저장 창으로 저장하지 못해 ${f} 을(를) 다운로드 폴더에 받았어요. 브라우저 다운로드 목록을 확인하세요. (사유: ${w})`,life:8e3})):e.add({severity:"success",summary:"다운로드 시작됨",detail:`${f} · 브라우저 다운로드 표시줄을 확인하세요`,life:3e3}),d}catch(n){return console.error("[download] 내려받지 못했습니다",n),b("download_failed",{kind:o?"edit":"send",stage:a,reason:n instanceof Error?n.name||"Error":"Unknown"}),e.add({severity:"error",summary:"저장 실패",detail:n instanceof Error?n.message:"디스크 공간 부족·권한 등으로 저장하지 못했습니다",life:8e3}),"failed"}finally{u.value=!1}},saveHtmlFile:async(o,a)=>(await S(o,a)).result,isDownloading:u}}function $(e){return`<!DOCTYPE html>
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
</html>`}export{K as a,$ as b,b as t,N as u};
//# sourceMappingURL=emailPreviewDoc-DREC14fM.js.map
