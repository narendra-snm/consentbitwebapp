(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,18851,e=>{e.v("/_next/static/media/loading.51f2a7db.png")},82576,e=>{"use strict";var t=e.i(43476);let r={src:e.i(18851).default,width:131,height:112,blurWidth:8,blurHeight:7,blurDataURL:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAHCAYAAAA1WQxeAAAAWUlEQVR42n3KSw5AMBRG4f9KPSpERDCwiZpJRIhN2IKBmQ0YW3VzO+1tv+k5ACMiqFRBxHE+N1zvI09VU+P+P5hjdbOnHTqYfZEjK0qNfhrDA8t1BkoiQ4QFgPsFsvjX41MAAAAASUVORK5CYII="};function s({show:e,title:s="Scanning...",subtitle:o="Please wait while we load data"}){return e?(0,t.jsxs)("div",{className:"fixed inset-0 z-50 flex items-center justify-center",children:[(0,t.jsx)("div",{className:"absolute inset-0 bg-black/30 backdrop-blur-sm"}),(0,t.jsx)("div",{className:"relative w-[320px] h-[200px]",children:(0,t.jsxs)("div",{className:"absolute bg-white h-full w-full rounded-[16px] shadow-lg flex flex-col items-center justify-center gap-3",children:[(0,t.jsx)("div",{className:"relative w-[72px] h-[62px] rounded-[12px] overflow-hidden animate-pulse",children:(0,t.jsx)("img",{alt:"Loading animation",className:"absolute max-w-none animate-spin",src:r.src,style:{animationDuration:"2s",width:"72px",height:"72px"}})}),(0,t.jsxs)("div",{className:"text-center",children:[(0,t.jsx)("p",{className:"font-semibold text-[14px] leading-[18px] text-black mb-1",children:s}),(0,t.jsx)("p",{className:"font-normal text-[13px] leading-normal text-[#4b5563]",children:o})]})]})})]}):null}e.s(["default",()=>s],82576)},8183,e=>{"use strict";var t=e.i(43476),r=e.i(71645),s=e.i(18566),o=e.i(46687),a=e.i(67297),n=e.i(82576);let i={fontVariationSettings:"'opsz' 14"};function l(e,t){try{sessionStorage.setItem(`cbConsent_${e}`,JSON.stringify(t))}catch{}}function c(e){if(!e||"object"!=typeof e)return e;let t=e.categories;return"object"==typeof t&&null!==t?t:e}function d(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function p(e){let t=c(e);if(!t)return[];if(t.ccpa&&"boolean"==typeof t.ccpa.doNotSell)return t.ccpa.doNotSell?[]:["All (CCPA accepted)"];let r=[];return!0===t.essential&&r.push("Essential"),!0===t.analytics&&r.push("Analytics"),!0===t.marketing&&r.push("Marketing"),!0===t.preferences&&r.push("Preferences"),r}function x(e){if(!e)return"—";let t=e.toLowerCase();return"given"===t?"Accepted":"rejected"===t?"Rejected":e.charAt(0).toUpperCase()+e.slice(1)}function f({method:e}){let r={GDPR:{bg:"#e6f1fd",text:"#1d4ed8"},CCPA:{bg:"#fde8cc",text:"#9a5000"},"IAB/GDPR":{bg:"#ede9fe",text:"#6d28d9"}}[e]??{bg:"#f3f4f6",text:"#374151"};return(0,t.jsx)("span",{style:{background:r.bg,color:r.text,fontFamily:"DM Sans, sans-serif"},className:"inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap",children:e})}function h({current:e,total:r,onChange:s}){return r<=1?null:(0,t.jsxs)("div",{className:"flex items-center justify-center gap-1 mt-3",children:[(0,t.jsx)("button",{type:"button",disabled:1===e,onClick:()=>s(e-1),className:"px-3 py-1 rounded-md text-xs font-medium border border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors",children:"‹"}),Array.from({length:r},(e,t)=>t+1).map(r=>(0,t.jsx)("button",{type:"button",onClick:()=>s(r),className:`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${r===e?"bg-[#2563eb] border-[#2563eb] text-white":"border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f3f4f6]"}`,children:r},r)),(0,t.jsx)("button",{type:"button",disabled:e===r,onClick:()=>s(e+1),className:"px-3 py-1 rounded-md text-xs font-medium border border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors",children:"›"})]})}function m(){return(0,t.jsx)("div",{className:"size-[24px] shrink-0",children:(0,t.jsx)("svg",{className:"block size-full",fill:"none",preserveAspectRatio:"none",viewBox:"0 0 24 24",children:(0,t.jsxs)("g",{children:[(0,t.jsx)("path",{d:"M9.32 11.68L11.88 14.24L14.44 11.68",stroke:"var(--stroke-0, #007AFF)",strokeLinecap:"round",strokeLinejoin:"round",strokeMiterlimit:"10",strokeWidth:"1.5"}),(0,t.jsx)("path",{d:"M11.88 4V14.17",stroke:"var(--stroke-0, #007AFF)",strokeLinecap:"round",strokeLinejoin:"round",strokeMiterlimit:"10",strokeWidth:"1.5"}),(0,t.jsx)("path",{d:"M20 12.18C20 16.6 17 20.18 12 20.18C7 20.18 4 16.6 4 12.18",stroke:"var(--stroke-0, #007AFF)",strokeLinecap:"round",strokeLinejoin:"round",strokeMiterlimit:"10",strokeWidth:"1.5"})]})})})}function b({onClick:e,disabled:r=!1}){return(0,t.jsxs)("button",{type:"button",onClick:e,disabled:r,className:"bg-[#e6f1fd] flex items-center gap-[5px] h-[33px] justify-center px-[8px] py-[8px] rounded-[8px] min-w-[126px] hover:bg-[#d7eafb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed",children:[(0,t.jsx)(m,{}),(0,t.jsx)("p",{className:"font-['DM_Sans'] font-light text-[#0a091f] text-[14px] tracking-[-0.7px] whitespace-nowrap",style:i,children:"Download PDF"})]})}function u({spinning:e}){return(0,t.jsx)("div",{className:`flex-none h-[14px] w-[12px] ${e?"animate-spin":""}`,children:(0,t.jsx)("svg",{className:"block size-full -scale-y-100 rotate-180",fill:"none",preserveAspectRatio:"none",viewBox:"0 0 12 14",children:(0,t.jsx)("path",{d:"M12 8.10511C12.0024 7.33074 11.8482 6.56362 11.5464 5.84827C11.2447 5.13291 10.8013 4.48358 10.242 3.93797C9.30238 3.01009 8.07248 2.41963 6.75005 2.26153V0L3.0001 2.94758L6.75005 5.89516V3.75006C7.67166 3.8996 8.52218 4.32981 9.18151 4.97994C9.60087 5.38933 9.93335 5.87644 10.1597 6.41303C10.386 6.94962 10.5017 7.52501 10.5 8.10585V8.10732C10.5 8.35049 10.4752 8.58999 10.4355 8.82727C10.4302 8.85895 10.4272 8.89211 10.4212 8.9238C10.2881 9.60334 9.99594 10.2431 9.56776 10.7926C9.44776 10.9466 9.31951 11.0962 9.18076 11.2325C9.01132 11.3971 8.82874 11.5482 8.63477 11.6842C8.12618 12.0501 7.54397 12.3051 6.92704 12.4322C6.82054 12.4543 6.7133 12.469 6.60455 12.483C6.55805 12.4896 6.51305 12.4985 6.46655 12.5029C5.99093 12.5508 5.51062 12.5252 5.04307 12.427L4.72507 13.8676C5.34925 13.9991 5.99064 14.0329 6.62555 13.9678C6.6773 13.9627 6.72905 13.9524 6.7808 13.9457C6.93454 13.9266 7.08754 13.9045 7.23829 13.8735L7.27804 13.8669L7.27729 13.8632C7.83736 13.7453 8.377 13.5479 8.87927 13.2774L8.90102 13.2641C9.166 13.1188 9.41924 12.9538 9.65851 12.7704C9.861 12.6164 10.0575 12.4535 10.2412 12.273C10.4272 12.091 10.5937 11.895 10.752 11.6945C10.7677 11.6739 10.7887 11.6555 10.8045 11.6348L10.8 11.6319C11.1441 11.1828 11.4202 10.6872 11.6197 10.1603L11.6257 10.1625C11.6475 10.105 11.6632 10.0461 11.6827 9.98788C11.7105 9.90682 11.739 9.82502 11.763 9.74249C11.793 9.63932 11.8177 9.53542 11.8417 9.43078C11.8582 9.35783 11.8777 9.28709 11.8912 9.2134C11.9152 9.08739 11.9332 8.95991 11.9482 8.83316C11.9557 8.77716 11.9655 8.72263 11.9707 8.66589C11.988 8.4824 11.9985 8.29744 11.9985 8.111C11.9985 8.111 12 8.10806 12 8.10511ZM2.39786 10.7565L1.19787 11.6415C1.71396 12.3166 2.37085 12.8756 3.1246 13.2811L3.84534 11.9885C3.2787 11.6843 2.78509 11.2642 2.39786 10.7565ZM1.50012 8.10585C1.50012 7.999 1.50387 7.89436 1.51137 7.78972L0.0158911 7.68434C-0.0468591 8.52858 0.0767061 9.37617 0.378136 10.1692L1.78287 9.65259C1.59498 9.15784 1.4992 8.63391 1.50012 8.10585Z",fill:"#007AFF"})})})}function g({siteId:e,siteDomain:s}){let[o,m]=(0,r.useState)(!1),[g,y]=(0,r.useState)(null),[w,j]=(0,r.useState)(!0),[k,C]=(0,r.useState)(!1),[N,v]=(0,r.useState)(null),[S,A]=(0,r.useState)(1),[D,M]=(0,r.useState)(1);(0,r.useEffect)(()=>{m(!0)},[]);let $=(0,r.useCallback)(async t=>{t?j(!0):C(!0),v(null);try{let t=await (0,a.getConsentHistory)(e,200,0);y(t),l(e,t)}catch(e){v(e instanceof Error?e.message:"Failed to load")}finally{j(!1),C(!1)}},[e]);(0,r.useEffect)(()=>{let t=!0;return(async()=>{let r=function(e){try{let t="u">typeof sessionStorage?sessionStorage.getItem(`cbConsent_${e}`):null;return t?JSON.parse(t):null}catch{return null}}(e);if(r&&t){y(r),j(!1);try{let r=await (0,a.getConsentHistory)(e,200,0);if(!t)return;y(r),l(e,r)}catch(e){if(!t)return;v(e instanceof Error?e.message:"Failed to load")}finally{t&&C(!1)}return}t&&j(!0);try{let r=await (0,a.getConsentHistory)(e,200,0);if(!t)return;y(r),l(e,r)}catch(e){if(!t)return;v(e instanceof Error?e.message:"Failed to load")}finally{t&&(j(!1),C(!1))}})(),()=>{t=!1}},[e]);let P=(0,r.useMemo)(()=>[...g?.consents??[]].sort((e,t)=>new Date(t.createdAt).getTime()-new Date(e.createdAt).getTime()),[g]),L=Math.max(1,Math.ceil(P.length/10)),_=P.slice((S-1)*10,10*S),R=g?.cookies??[],F=Math.max(1,Math.ceil(R.length/10)),T=R.slice((D-1)*10,10*D),U=g?.customCookieRules??[],z=g?.total??g?.consents?.length??0,E=R.length,I=o&&s?.trim()||"—",B=(0,r.useCallback)(e=>{let t=`${window.location.origin}/images/ConsentBit-logo-Dark.png`,r=e.map((r,s)=>{let o,a,n=p(r.categories),i=n.length?n.join(", "):"None",l=function(e,t){let r=p(t);if(0===r.length)return e;let s=new Set(r.map(e=>e.toLowerCase()));return e.filter(e=>s.has((e.category||"").toLowerCase()))}(R,r.categories),f=(o=c(r.categories))?o.ccpa&&!1===o.ccpa.doNotSell?U:o.ccpa?[]:U.filter(e=>{let t,r="necessary"===(t=(e.category||"").toLowerCase())?"essential":"advertisement"===t?"marketing":"functional"===t||"performance"===t?"preferences":t;return"essential"===r||("analytics"===r?!!o.analytics:"marketing"===r?!!o.marketing:"preferences"===r&&!!o.preferences)}):[],h=0===(a=[...l.map(e=>`
              <tr>
                <td class="proof-td">${d(e.name||"—")}</td>
                <td class="proof-td">${d(function(e){if(!e||"session"===e.toLowerCase())return"session";try{let t=new Date(e);if(Number.isNaN(t.getTime()))return e;let r=new Date;if(t.getTime()<r.getTime())return"expired";let s=Math.round((t.getTime()-r.getTime())/864e5);if(s<=1)return"1 day";if(s<365)return`${s} days`;return`${(s/365).toFixed(1)} years`}catch{return e??"session"}}(e.expires))}</td>
                <td class="proof-td">${d(e.description||"—")}</td>
              </tr>
            `),...f.map(e=>`
              <tr>
                <td class="proof-td">${d(e.name||"—")} <span style="font-size:10px;color:#6b7280">(custom)</span></td>
                <td class="proof-td">${d(e.duration||"—")}</td>
                <td class="proof-td">${d(e.description||"—")}</td>
              </tr>
            `)]).length?'<tr><td class="proof-td" colspan="3">No cookies recorded for accepted categories.</td></tr>':a.join("");return`
          <div class="proof-page">
            <header class="proof-header">
              <h1 class="proof-title">Proof of consent</h1>
              <div class="proof-brand">
                <img class="proof-logo" src="${d(t)}" alt="Consentbit" width="170" height="22" />
              </div>
            </header>

            <table class="proof-meta" role="presentation">
              <tr><td class="proof-label">Consented domain</td><td class="proof-value">${d(I)}</td></tr>
              <tr><td class="proof-label">Consent date</td><td class="proof-value">${d(function(e){if(!e)return"—";try{let t=new Date(e),r=t.toLocaleString("en-US",{month:"long"}),s=t.getDate(),o=t.getFullYear(),a=t.toLocaleTimeString("en-US",{hour12:!0,hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:"UTC"});return`${r} ${s}, ${o} at ${a} UTC`}catch{return e}}(r.createdAt))}</td></tr>
              <tr><td class="proof-label">Consent ID</td><td class="proof-value">${d(r.id)}</td></tr>
              <tr><td class="proof-label">Country</td><td class="proof-value">${d(r.country||"—")}</td></tr>
              <tr><td class="proof-label">Anonymized IP address</td><td class="proof-value">${d(function(e){if(!e||!e.trim())return"—";let t=e.trim();if(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(t)){let e=t.split(".");return e[3]="0",e.join(".")}return t.includes(":")?t.split(":").slice(0,4).join(":")+"::":t}(r.ipAddress))}</td></tr>
              <tr><td class="proof-label">Consent status</td><td class="proof-value">${d(x(r.status))}</td></tr>
            </table>

            <div class="proof-categories-wrap">
              <p class="proof-categories-title">Accepted Categories</p>
              <p class="proof-categories-line">${d(i)}</p>
            </div>

            <table class="proof-cookie-table">
              <thead>
                <tr>
                  <th class="proof-th">Cookie Name</th>
                  <th class="proof-th">Duration</th>
                  <th class="proof-th">Description</th>
                </tr>
              </thead>
              <tbody>${h}</tbody>
            </table>

            <p class="proof-footer">Page ${s+1} of ${e.length}</p>
          </div>
        `});return`
        <style>
          @page { margin: 16mm 14mm; }
          body {
            margin: 0;
            padding: 24px 28px 32px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #111827;
            font-size: 12px;
            line-height: 1.45;
            background: #fff;
          }
          .proof-page { break-after: page; margin-bottom: 32px; }
          .proof-page:last-child { break-after: auto; margin-bottom: 0; }

          .proof-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 20px;
            padding-bottom: 14px;
            border-bottom: 1px solid #dbe5f3;
          }
          .proof-title {
            margin: 0;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: #007aff;
          }
          .proof-brand { flex-shrink: 0; padding-top: 2px; }
          .proof-logo { display: block; height: 22px; width: auto; max-width: 170px; }

          .proof-meta {
            width: 100%;
            max-width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
          }
          .proof-label {
            padding: 6px 12px 6px 0;
            vertical-align: top;
            font-weight: 600;
            color: #374151;
            width: 200px;
          }
          .proof-value {
            padding: 6px 0;
            color: #111827;
            word-break: break-word;
          }

          .proof-categories-wrap {
            border: 1px solid #93c5fd;
            border-radius: 8px;
            background: linear-gradient(180deg, #f0f7ff 0%, #ffffff 48%);
            padding: 12px 14px 14px;
            margin: 0 0 14px;
          }
          .proof-categories-title {
            margin: 0 0 6px;
            font-size: 14px;
            font-weight: 700;
            color: #007aff;
          }
          .proof-categories-line {
            margin: 0;
            color: #374151;
            font-size: 12px;
          }

          .proof-cookie-table {
            border-collapse: collapse;
            width: 100%;
            border: 1px solid #93c5fd;
            border-radius: 8px;
            overflow: hidden;
          }
          .proof-th, .proof-td {
            border: 1px solid #bfdbfe;
            padding: 10px 12px;
            text-align: left;
            vertical-align: top;
          }
          .proof-th {
            background: #e6f1fd;
            color: #1e3a5f;
            font-weight: 600;
            font-size: 12px;
          }
          .proof-td {
            color: #111827;
            font-size: 11.5px;
          }
          .proof-footer {
            margin-top: 20px;
            font-size: 11px;
            color: #6b7280;
          }
        </style>
        ${r.length?r.join(""):`<div class="proof-page"><header class="proof-header"><h1 class="proof-title">Proof of consent</h1><div class="proof-brand"><img class="proof-logo" src="${d(t)}" alt="Consentbit" width="170" height="22" /></div></header><p>No consent records for this site.</p></div>`}
      `},[R,U,I]),V=(0,r.useCallback)((e,t)=>{let r=document.title;document.title=t;let s=window.open("","_blank");if(!s){document.title=r,alert("Please allow pop-ups to generate the PDF.");return}s.document.write(`<!DOCTYPE html><html><head><title>${d(t)}</title></head><body>${e}<script>window.onload=function(){window.print();window.close();}</script></body></html>`),s.document.close(),document.title=r},[]),O=(0,r.useCallback)(e=>{V(B([e]),`Proof of Consent - ${I}`)},[B,I,V]),H=(0,r.useCallback)(()=>{$(!1)},[$]);return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(n.default,{show:w&&!g,title:"Loading…",subtitle:`Fetching consent logs for "${I}"`}),N?(0,t.jsx)("div",{className:"mx-auto mb-3 max-w-[1259px] rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800",children:N}):null,(0,t.jsx)("div",{className:"w-full min-h-screen bg-white p-8 pt-5",children:(0,t.jsxs)("div",{className:"max-w-[1259px] mx-auto",children:[(0,t.jsxs)("div",{className:"bg-[#fbfbfb] border border-[#ebebeb] rounded-[10px]  pt-[20px] pb-[20px]",children:[(0,t.jsxs)("div",{className:"flex items-start justify-between gap-6 flex-wrap mb-[31px] pl-[21px] pr-7.5",children:[(0,t.jsxs)("div",{className:"flex flex-wrap items-center gap-[60px]",children:[(0,t.jsx)("div",{children:(0,t.jsxs)("h1",{className:"font-['DM_Sans'] font-semibold text-[14px] text-black mb-[11px]",style:i,children:["Site: ",I]})}),(0,t.jsxs)("div",{className:"flex flex-wrap items-start gap-[107px]",children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("p",{className:"font-['DM_Sans'] font-medium text-[#007aff] text-[26px] mb-[5px]",style:i,children:w?"...":z}),(0,t.jsx)("p",{className:"font-['DM_Sans'] font-normal text-[16px] text-black",style:i,children:"Total consent events"})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("p",{className:"font-['DM_Sans'] font-medium text-[#007aff] text-[26px] mb-[5px]",style:i,children:w?"...":E}),(0,t.jsx)("p",{className:"font-['DM_Sans'] font-normal text-[16px] text-black",style:i,children:"Cookie Inventory"})]})]})]}),(0,t.jsxs)("button",{type:"button",onClick:H,disabled:k||w,className:"flex items-center gap-1 mt-[18px] disabled:opacity-50",children:[(0,t.jsx)("p",{className:"font-['DM_Sans'] font-medium text-[#007aff] text-[15px] tracking-[-0.3px]",style:i,children:k?"Refreshing…":"Refresh"}),(0,t.jsx)(u,{spinning:k})]})]}),(0,t.jsx)("div",{className:"w-full h-px bg-black/10 mb-[4px]"}),(0,t.jsx)("div",{className:"overflow-x-auto px-2",children:(0,t.jsxs)("table",{className:"w-full border-separate border-spacing-0",children:[(0,t.jsx)("thead",{children:(0,t.jsxs)("tr",{className:"bg-[#f2f7ff]",children:[(0,t.jsx)("th",{className:"h-[46px] px-[16px] text-left font-['DM_Sans'] font-medium text-[#0a091f] text-[14px] tracking-[-0.7px] border-b border-[#9fbce4] rounded-l-[5px] whitespace-nowrap",style:i,children:"Time (UTC)"}),(0,t.jsx)("th",{className:"h-[46px] px-[16px] text-left font-['DM_Sans'] font-medium text-[#0a091f] text-[14px] tracking-[-0.7px] whitespace-nowrap border-b border-[#9fbce4]",style:i,children:"Status"}),(0,t.jsx)("th",{className:"h-[46px] px-[16px] text-left font-['DM_Sans'] font-medium text-[#0a091f] text-[14px] tracking-[-0.7px] whitespace-nowrap border-b border-[#9fbce4]",style:i,children:"Method"}),(0,t.jsx)("th",{className:"h-[46px] px-[16px] text-left font-['DM_Sans'] font-medium text-[#0a091f] text-[14px] tracking-[-0.7px] border-b border-[#9fbce4] min-w-[420px]",style:i,children:"Analytics / Marketing / Preferences"}),(0,t.jsx)("th",{className:"h-[46px] px-[16px] text-left font-['DM_Sans'] font-medium text-[#0a091f] text-[14px] tracking-[-0.7px] border-b border-[#9fbce4] rounded-r-[5px] whitespace-nowrap",style:i,children:"Download"})]})}),(0,t.jsx)("tbody",{children:w||0!==P.length?_.map(e=>(0,t.jsxs)("tr",{className:"border-b border-black/10",children:[(0,t.jsx)("td",{className:"px-[16px] py-[9px] font-['DM_Sans'] font-light text-[#0a091f] text-[14px] tracking-[-0.7px] whitespace-nowrap border-b border-black/10",style:i,children:function(e){if(!e)return"—";try{return new Date(e).toLocaleString("en-US",{timeZone:"UTC",year:"numeric",month:"numeric",day:"numeric",hour:"numeric",minute:"2-digit",second:"2-digit",hour12:!0})}catch{return e}}(e.createdAt)}),(0,t.jsx)("td",{className:"px-[16px] py-[9px] font-['DM_Sans'] font-light text-[#0a091f] text-[14px] tracking-[-0.7px] whitespace-nowrap border-b border-black/10",style:i,children:x(e.status)}),(0,t.jsx)("td",{className:"px-[16px] py-[9px] whitespace-nowrap border-b border-black/10",children:(0,t.jsx)(f,{method:function(e){let t=(e.consentMethod??"").toLowerCase();if(t.includes("iab")||t.includes("tcf"))return"IAB/GDPR";if(t.includes("ccpa")||t.includes("usp"))return"CCPA";if(t.includes("gdpr"))return"GDPR";let r=c(e.categories);return r&&r.ccpa?"CCPA":"GDPR"}(e)})}),(0,t.jsx)("td",{className:"px-[16px] py-[9px] font-['DM_Sans'] font-light text-[#0a091f] text-[14px] tracking-[-0.7px] border-b border-black/10",style:i,children:(0,t.jsx)("div",{className:"min-w-[420px] whitespace-normal break-words",children:function(e){let t=c(e);if(!t)return"—";if(t.ccpa&&"boolean"==typeof t.ccpa.doNotSell)return t.ccpa.doNotSell?"Do Not Sell: Yes":"Do Not Sell: No";let r=[];return r.push(!0===t.essential?"Essential: Accepted":!1===t.essential?"Essential: Rejected":"Essential: —"),r.push(!0===t.analytics?"Analytics: Accepted":!1===t.analytics?"Analytics: Rejected":"Analytics: —"),r.push(!0===t.marketing?"Marketing: Accepted":!1===t.marketing?"Marketing: Rejected":"Marketing: —"),r.push(!0===t.preferences?"Preferences: Accepted":!1===t.preferences?"Preferences: Rejected":"Preferences: —"),r.join(", ")}(e.categories)})}),(0,t.jsx)("td",{className:"px-[16px] py-[9px] border-b border-black/10",children:(0,t.jsx)(b,{onClick:()=>O(e)})})]},e.id)):(0,t.jsx)("tr",{children:(0,t.jsx)("td",{colSpan:5,className:"px-[16px] py-[24px] text-center font-['DM_Sans'] text-[14px] text-[#4b5563]",style:i,children:"No consent logs yet. Consent events will appear here once visitors interact with your banner."})})})]})}),(0,t.jsx)(h,{current:S,total:L,onChange:e=>A(e)})]}),(0,t.jsxs)("div",{className:"mt-[59px]",children:[(0,t.jsx)("h2",{className:"font-['DM_Sans'] font-semibold text-[20px] text-black mb-[11px]",style:i,children:"Cookie inventory (set by whom, for what)"}),(0,t.jsx)("p",{className:"font-['DM_Sans'] font-normal text-[#4b5563] text-[16px] mb-[18px]",style:i,children:"These are cookies detected for this site. Consent above shows whether the user accepted or rejected analytics/marketing."}),(0,t.jsx)("div",{className:"overflow-x-auto",children:(0,t.jsxs)("table",{className:"w-full border-separate border-spacing-0",children:[(0,t.jsx)("thead",{children:(0,t.jsxs)("tr",{className:"bg-[#f2f7ff]",children:[(0,t.jsx)("th",{className:"min-h-[46px] px-[16px] py-4.5 text-left font-['DM_Sans'] font-medium text-[#0a091f] text-[14px] tracking-[-0.7px] border-b border-[#9fbce4] rounded-l-[5px] whitespace-nowrap",style:i,children:"Cookie"}),(0,t.jsx)("th",{className:"min-h-[46px] px-[16px] py-4.5 text-left font-['DM_Sans'] font-medium text-[#0a091f] text-[14px] tracking-[-0.7px] whitespace-nowrap border-b border-[#9fbce4]",style:i,children:"Category"}),(0,t.jsx)("th",{className:"min-h-[46px] px-[16px] py-4.5 text-left font-['DM_Sans'] font-medium text-[#0a091f] text-[14px] tracking-[-0.7px] whitespace-nowrap border-b border-[#9fbce4]",style:i,children:"Provider"}),(0,t.jsx)("th",{className:"min-h-[46px] px-[16px] py-4.5  text-left font-['DM_Sans'] font-medium text-[#0a091f] text-[14px] tracking-[-0.7px] border-b border-[#9fbce4] min-w-[420px]",style:i,children:"Purpose / Description"})]})}),(0,t.jsx)("tbody",{children:0===R.length?(0,t.jsx)("tr",{children:(0,t.jsx)("td",{colSpan:5,className:"px-[16px] py-[24px] font-['DM_Sans'] text-[14px] text-[#4b5563]",style:i,children:"No cookies recorded yet. Run a scan to populate."})}):T.map(e=>(0,t.jsxs)("tr",{children:[(0,t.jsx)("td",{className:"px-[16px] py-4.5 font-['DM_Sans'] font-light text-[#0a091f] text-[14px] tracking-[-0.7px] whitespace-nowrap border-b border-black/10",style:i,children:e.name||"—"}),(0,t.jsx)("td",{className:"px-[16px] py-4.5 font-['DM_Sans'] font-light text-[#0a091f] text-[14px] tracking-[-0.7px] whitespace-nowrap border-b border-black/10",style:i,children:e.category||"—"}),(0,t.jsx)("td",{className:"px-[16px] py-4.5 font-['DM_Sans'] font-light text-[#0a091f] text-[14px] tracking-[-0.7px] whitespace-nowrap border-b border-black/10",style:i,children:e.provider?.trim()||"Not available"}),(0,t.jsx)("td",{className:"px-[16px] py-4.5 font-['DM_Sans'] font-light text-[#0a091f] text-[14px] tracking-[-0.7px] border-b border-black/10",style:i,children:(0,t.jsx)("div",{className:"min-w-[420px] whitespace-normal break-words",children:e.description?.trim()||"Not available"})})]},e.id))})]})}),(0,t.jsx)(h,{current:D,total:F,onChange:e=>M(e)})]})]})})]})}function y(){let e=(0,s.useParams)(),a=e?.id,{sites:n,loading:i}=(0,o.useDashboardSession)(),l=(0,r.useMemo)(()=>n.find(e=>String(e?.id)===String(a)),[n,a]),c=(0,r.useMemo)(()=>i?"…":function(e){if(!e)return"";let t="string"==typeof e.name?e.name.trim():"",r="string"==typeof e.domain?e.domain.trim():"";return t||r||""}(l)||"—",[i,l]);return a?(0,t.jsx)(g,{siteId:String(a),siteDomain:c}):null}e.s(["default",()=>y],8183)}]);