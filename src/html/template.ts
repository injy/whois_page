export function getHtml(): string {
  return `<!doctype html>
<html lang="en-US">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>WHOIS Lookup</title>
<style>
${getCSS()}
</style>
<script>
(function(){
  var t=localStorage.getItem("theme");
  if(t==="dark"||(t==null&&matchMedia("(prefers-color-scheme:dark)").matches))
    document.documentElement.setAttribute("data-theme","dark");
})();
</script>
</head>
<body>
<div class="safari-26-app-bar-color" aria-hidden="true"></div>
<div class="root">
  <header>
    <div class="header-actions">
      <button class="theme-switcher" id="settings-btn" aria-label="Settings">
        <svg width="1em" height="1em" viewBox="0 -960 960 960" fill="currentColor"><path d="m388-80-20-126q-19-7-40-19t-37-25l-118 54-93-164 108-79q-2-9-2.5-20.5T185-480q0-9 .5-20.5T188-521L80-600l93-164 118 54q16-13 37-25t40-18l20-127h184l20 126q19 7 40.5 18.5T669-710l118-54 93 164-108 77q2 10 2.5 21.5t.5 21.5q0 10-.5 21t-2.5 21l108 78-93 164-118-54q-16 13-36.5 25.5T592-206L572-80H388Zm92-270q54 0 92-38t38-92q0-54-38-92t-92-38q-54 0-92 38t-38 92q0 54 38 92t92 38Zm0-60q-29 0-49.5-20.5T410-480q0-29 20.5-49.5T480-550q29 0 49.5 20.5T550-480q0 29-20.5 49.5T480-410Z"/></svg>
      </button>
      <button class="theme-switcher" id="theme-switcher" aria-label="Switch theme">
        <svg width="1em" height="1em" viewBox="0 -960 960 960" fill="currentColor"><path d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 32.5-156t88-127Q256-817 330-848.5T488-880q80 0 151 27.5t124.5 76q53.5 48.5 85 115T880-518q0 115-70 176.5T640-280h-74q-9 0-12.5 5t-3.5 11q0 12 15 34.5t15 51.5q0 50-27.5 74T480-80Zm0-400Zm-220 40q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm120-160q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm200 0q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm120 160q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17ZM480-160q9 0 14.5-5t5.5-13q0-14-15-33t-15-57q0-42 29-67t71-25h70q66 0 113-38.5T800-518q0-121-92.5-201.5T488-800q-136 0-232 93t-96 227q0 133 93.5 226.5T480-160Z"/></svg>
      </button>
    </div>
    <h1><a href="/">WHOIS Lookup</a></h1>
    <form id="form">
      <div class="input-box">
        <input autocapitalize="off" autocomplete="domain" autocorrect="off" autofocus class="input" id="domain" inputmode="url" name="domain" placeholder="Enter a domain" required spellcheck="false" type="text">
        <button class="input-clear" id="domain-clear" type="button" aria-label="Clear">
          <svg width="1em" height="1em" viewBox="0 -960 960 960" fill="currentColor"><path d="M480-424 284-228q-11 11-28 11t-28-11q-11-11-11-28t11-28l196-196-196-196q-11-11-11-28t11-28q11-11 28-11t28 11l196 196 196-196q11-11 28-11t28 11q11 11 11 28t-11 28L536-480l196 196q11 11 11 28t-11 28q-11 11-28 11t-28-11L480-424Z"/></svg>
        </button>
      </div>
      <button class="primary-button" id="search-button" type="submit" data-loading="false">
        <span class="primary-button-label">Search</span>
        <span class="loader primary-button-loader" aria-hidden="true"></span>
      </button>
    </form>
  </header>
  <main id="results"></main>
  <footer>&copy;${new Date().getFullYear()} &middot; hosted on ab.cd</footer>
</div>
<button class="back-to-top" id="back-to-top" aria-label="Back to top">
  <svg width="1em" height="1em" viewBox="0 -960 960 960" fill="currentColor"><path d="M200-760q-17 0-28.5-11.5T160-800q0-17 11.5-28.5T200-840h560q17 0 28.5 11.5T800-800q0 17-11.5 28.5T760-760H200Zm280 640q-17 0-28.5-11.5T440-160v-368l-76 76q-11 11-28 11t-28-11q-11-11-11-28t11-28l144-144q6-6 13-8.5t15-2.5q8 0 15 2.5t13 8.5l144 144q11 11 11 28t-11 28q-11 11-28 11t-28-11l-76-76v368q0 17-11.5 28.5T480-120Z"/></svg>
</button>
<dialog class="dialog" id="settings-dialog">
  <div class="dialog-body">
    <div class="dialog-head">
      <h2 class="dialog-title">Settings</h2>
      <button class="icon-button" id="settings-close" type="button" aria-label="Close">
        <svg width="1em" height="1em" viewBox="0 -960 960 960" fill="currentColor"><path d="M480-429 316-265q-11 11-25 10.5T266-266q-11-11-11-25.5t11-25.5l163-163-164-164q-11-11-10.5-25.5T266-695q11-11 25.5-11t25.5 11l163 164 164-164q11-11 25.5-11t25.5 11q11 11 11 25.5T695-644L531-480l164 164q11 11 11 25t-11 25q-11 11-25.5 11T644-266L480-429Z"/></svg>
      </button>
    </div>
    <label class="field">
      <span class="field-label">WHOIS proxy pool URL</span>
      <input class="input dialog-input" id="proxy-pool-input" type="url" autocomplete="off" placeholder="https://example.com/pool.json" spellcheck="false">
    </label>
    <p class="dialog-hint">Leave empty to use the server default. Stored in this browser only.</p>
    <div class="dialog-actions">
      <button class="ghost-button" id="settings-clear" type="button">Clear</button>
      <button class="primary-button" id="settings-save" type="button"><span class="primary-button-label">Save</span></button>
    </div>
  </div>
</dialog>
<script>
${getJS()}
</script>
</body>
</html>`;
}

function getCSS(): string {
  return `
html{color-scheme:light;--border-back-to-top:#86b8f0;--border-card:#007fff26;--border-input:#007fff33;--border-table:#cce5ff;--brand-primary:#007fff;--elevation-back-to-top:0 10px 24px #b5cde8;--elevation-card:0 12px 30px #1d3b6b1a;--feedback-error-bg:#ff5c7a1f;--feedback-error-border:#ff5c7a45;--feedback-error-fg:#b4234d;--feedback-info-bg:#007fff1c;--feedback-info-fg:#005fcc;--feedback-neutral-bg:#5f7fa31f;--feedback-neutral-border:#5f7fa345;--feedback-neutral-fg:#4f6c8d;--feedback-success-bg:#00b8941f;--feedback-success-border:#00b89445;--feedback-success-fg:#007a63;--feedback-success-solid:#00a985;--feedback-warning-bg:#f7a60024;--feedback-warning-border:#f7a60045;--feedback-warning-fg:#8a5a00;--focus-ring:#007fffb8;--scrollbar-thumb:#173a66a6;--surface-back-to-top:#f3f8ff;--surface-back-to-top-active:#c5defd;--surface-back-to-top-hover:#dcecff;--surface-card:#ffffff;--surface-chip:#007fff12;--surface-chip-hover:#007fff2b;--surface-input:#f9fbff;--surface-link-hover:#007fff14;--surface-page-end:#fdf4ea;--surface-page-start:#eef6ff;--surface-primary-button:linear-gradient(135deg,var(--brand-primary),#4db2ff);--surface-primary-button-active:linear-gradient(135deg,#0079f2,#49a9f2);--surface-primary-button-disabled:linear-gradient(135deg,#60afff,#90cfff);--surface-primary-button-hover:linear-gradient(135deg,#0086ff,#50bbff);--surface-raw-data-button:#cfe6ff;--surface-raw-data-button-active:#a9cdff;--surface-raw-data-button-hover:#bddbff;--surface-raw-data-head:var(--surface-page-start);--surface-toggle-active:#007fff2e;--surface-toggle-hover:#007fff1a;--surface-toggle-indicator:#007fff26;--surface-toggle-indicator-active:#007fff40;--surface-tooltip:#173a66;--text-link:#005fcc;--text-link-hover:#00469e;--text-link-underline:#007fff7a;--text-link-underline-hover:#00469eb3;--text-muted:#506f95;--text-primary:#0c1f3f;--text-primary-button:#f8fbff;--text-secondary:#2b466f;--text-toggle-active:#005fcc;--text-tooltip:#f8fbff}
html[data-theme="dark"]{color-scheme:dark;--border-back-to-top:#5f89c1;--border-card:#7fb0ff42;--border-input:#7fb0ff59;--border-table:#344b78;--brand-primary:#007fff;--elevation-back-to-top:0 10px 24px #020918;--elevation-card:0 14px 36px #00000052;--feedback-error-bg:#ff6f912b;--feedback-error-border:#ff6f9150;--feedback-error-fg:#ff9bb2;--feedback-info-bg:#66b2ff2b;--feedback-info-fg:#9dd0ff;--feedback-neutral-bg:#9ab4d82b;--feedback-neutral-border:#9ab4d852;--feedback-neutral-fg:#b7cae5;--feedback-success-bg:#3dd7b02b;--feedback-success-border:#3dd7b052;--feedback-success-fg:#7cf0d0;--feedback-success-solid:#48dcb6;--feedback-warning-bg:#ffc14a2b;--feedback-warning-border:#ffc14a52;--feedback-warning-fg:#ffd98d;--focus-ring:#79bfffe0;--scrollbar-thumb:#dce9ff94;--surface-back-to-top:#15264a;--surface-back-to-top-active:#24508f;--surface-back-to-top-hover:#1c3768;--surface-card:#0c1530;--surface-chip:#66b2ff1a;--surface-chip-hover:#66b2ff36;--surface-input:#070d21;--surface-link-hover:#66b2ff1a;--surface-page-end:#0b1230;--surface-page-start:#050a1a;--surface-primary-button:linear-gradient(135deg,var(--brand-primary),#66b2ff);--surface-primary-button-active:linear-gradient(135deg,#0079f2,#61a9f2);--surface-primary-button-disabled:linear-gradient(135deg,#004f9f,#406f9f);--surface-primary-button-hover:linear-gradient(135deg,#0086ff,#6bbcff);--surface-raw-data-button:#13244a;--surface-raw-data-button-active:#24508a;--surface-raw-data-button-hover:#1a3765;--surface-raw-data-head:var(--surface-page-start);--surface-toggle-active:#66b2ff36;--surface-toggle-hover:#66b2ff24;--surface-toggle-indicator:#66b2ff38;--surface-toggle-indicator-active:#66b2ff52;--surface-tooltip:#dce9ff;--text-link:#79bfff;--text-link-hover:#d8ecff;--text-link-underline:#66b2ff8c;--text-link-underline-hover:#d7ecffd1;--text-muted:#9ab4d8;--text-primary:#f2f7ff;--text-primary-button:#f8fbff;--text-secondary:#ccdaf3;--text-toggle-active:#79bfff;--text-tooltip:#0c1530}
*{box-sizing:border-box;outline:3px solid transparent;outline-offset:3px}
*:focus{outline-color:var(--focus-ring)}
*:focus:not(:focus-visible){outline-color:transparent}
*:focus-visible{outline-color:var(--focus-ring)}
html{scroll-behavior:smooth;text-size-adjust:100%;-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%}
body{background-color:var(--surface-page-end);color:var(--text-primary);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif;line-height:1.5;margin:0}
body::before{background:linear-gradient(to bottom,var(--surface-page-start),var(--surface-page-end));bottom:0;content:"";left:0;position:fixed;right:0;top:0;z-index:-1}
.safari-26-app-bar-color{background-color:var(--surface-page-start);height:16px;mask-image:linear-gradient(transparent,transparent);pointer-events:none;position:fixed;width:100%;z-index:99999;-webkit-mask-image:linear-gradient(transparent,transparent)}
.root{display:flex;flex-direction:column;gap:1.5rem;margin:0 auto;max-width:67rem;padding:calc(1rem + env(safe-area-inset-top)) calc(1.5rem + env(safe-area-inset-right)) calc(3rem + env(safe-area-inset-bottom)) calc(1.5rem + env(safe-area-inset-left))}
.header-actions{align-self:flex-end}
.theme-switcher{border-radius:50%;color:var(--brand-primary);font-size:1.5rem;outline-offset:0;padding:.5rem}
.theme-switcher:hover{background-color:var(--surface-toggle-hover)}
h1{font-size:clamp(1.75rem,5vw,4rem);line-height:1;margin:0;text-wrap:balance}
h1 a{color:inherit;text-decoration:none}
h1 a:hover{background-color:transparent}
a{color:var(--text-link);text-decoration:underline;text-decoration-color:var(--text-link-underline);text-underline-offset:.25rem;transition:background-color 233ms ease,color 233ms ease,text-decoration-color 233ms ease}
a:hover{background-color:var(--surface-link-hover);color:var(--text-link-hover);text-decoration-color:var(--text-link-underline-hover)}
button{align-items:center;background-color:transparent;border:none;color:inherit;cursor:pointer;display:inline-flex;font:inherit;justify-content:center;margin:0;padding:0;transition:background-color 233ms ease,color 233ms ease,opacity 233ms ease}
footer{color:var(--text-muted);font-size:.875rem;margin-top:1.5rem;text-align:center}
form{display:grid;gap:.75rem;grid-template-columns:auto min-content}
.input-box{grid-column:1/-1;position:relative}
.input{background-color:var(--surface-input);border:1px solid var(--border-input);border-radius:999px;color:inherit;font:inherit;margin:0;padding:.75rem 2.5rem .75rem 1.5rem;width:100%}
.input::placeholder{color:var(--text-muted)}
.input-clear{border-radius:50%;color:var(--text-secondary);font-size:1.5rem;opacity:0;position:absolute;right:1rem;top:50%;transform:translateY(-50%);visibility:hidden}
.primary-button{background:var(--surface-primary-button);border-radius:999px;color:var(--text-primary-button);font-weight:700;padding:.75rem 1.5rem;position:relative}
.primary-button:hover{background:var(--surface-primary-button-hover)}
.primary-button:active{background:var(--surface-primary-button-active)}
.primary-button:disabled{background:var(--surface-primary-button-disabled);cursor:not-allowed}
.loader{animation:loader-rotation 1s linear infinite;border:2.5px solid var(--brand-primary);border-bottom-color:transparent!important;border-radius:50%;height:1.25em;width:1.25em}
@keyframes loader-rotation{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
.primary-button-loader{border-color:var(--text-primary-button);position:absolute;visibility:hidden}
.primary-button[data-loading="true"] .primary-button-label{visibility:hidden}
.primary-button[data-loading="true"] .primary-button-loader{visibility:visible}
.visible{opacity:1!important;visibility:visible!important}
.break-all{word-break:break-all}
main{display:flex;flex-direction:column;gap:1rem}
.message{align-items:center;background-color:var(--surface-card);border:1px solid var(--border-card);border-radius:1rem;box-shadow:var(--elevation-card);color:var(--text-secondary);display:grid;gap:.625rem;grid-template-columns:min-content auto;padding:1rem;word-break:break-word}
.message-icon{border-radius:50%;display:inline-flex;font-size:1.25rem;padding:.125rem}
.message-icon-error{background-color:var(--feedback-error-bg);color:var(--feedback-error-fg)}
.message-icon-unknown{background-color:var(--feedback-neutral-bg);color:var(--feedback-neutral-fg)}
.message-icon-reserved{background-color:var(--feedback-warning-bg);color:var(--feedback-warning-fg)}
.message-icon-registered{background-color:var(--feedback-info-bg);color:var(--feedback-info-fg)}
.message-icon-unregistered{background-color:var(--feedback-success-bg);color:var(--feedback-success-fg)}
.message a{font-weight:600}
.message-tags{display:flex;flex-wrap:wrap;gap:.5rem;grid-column:2}
.tag{border:1px solid transparent;border-radius:.5rem;font-size:.75rem;font-weight:600;padding:.25rem .5rem}
.tag-green{background-color:var(--feedback-success-bg);border-color:var(--feedback-success-border);color:var(--feedback-success-fg)}
.tag-red{background-color:var(--feedback-error-bg);border-color:var(--feedback-error-border);color:var(--feedback-error-fg)}
.tag-yellow{background-color:var(--feedback-warning-bg);border-color:var(--feedback-warning-border);color:var(--feedback-warning-fg)}
.tag-gray{background-color:var(--feedback-neutral-bg);border-color:var(--feedback-neutral-border);color:var(--feedback-neutral-fg)}
.card{background-color:var(--surface-card);border:1px solid var(--border-card);border-radius:1rem;box-shadow:var(--elevation-card);min-width:0;padding:1rem}
.card-title{font-size:.875rem;font-weight:700;margin:0 0 1rem}
.card-items{display:grid;gap:1.5rem;grid-template-columns:1fr 1fr}
.card-item:nth-child(odd):last-child{grid-column:1/-1}
.card-item-label{color:var(--text-muted);font-size:.75rem;font-weight:700;letter-spacing:.08em;margin-bottom:.5rem;text-transform:uppercase}
.card-item-value{color:var(--text-secondary)}
.card-item-values{display:flex;flex-wrap:wrap;gap:.5rem}
.card-item-value-tertiary{color:var(--text-muted);font-size:.75rem;margin-top:.25rem}
.chip{background-color:var(--surface-chip);border-radius:999px;font-size:.875rem;padding:.5rem 1rem}
.chip-link:hover{background-color:var(--surface-chip-hover)}
pre{color:var(--text-secondary);font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;font-size:.875rem;margin:0;overflow:auto}
code{display:inline-block;font-family:inherit;margin:1rem}
.raw-data-head{align-items:center;background-color:var(--surface-raw-data-head);border-radius:calc(1rem - 1px) calc(1rem - 1px) 0 0;display:flex;justify-content:space-between;gap:.5rem;padding:.5rem}
.raw-data-buttons{display:flex;gap:.25rem;margin-right:.625rem}
.raw-data-buttons button{border-radius:.5rem;color:var(--text-secondary);font-size:1.25rem;padding:.25rem}
.raw-data-buttons button:hover{background-color:var(--surface-raw-data-button-hover);color:var(--text-primary)}
.copy-button{position:relative}
.copy-button-icon-copy{opacity:1;transform:scale(1);transition:opacity 233ms ease,transform 233ms ease,visibility 233ms ease;visibility:visible}
.copy-button-icon-check{color:var(--feedback-success-solid);opacity:0;position:absolute;transform:scale(.8);transition:opacity 233ms ease,transform 233ms ease,visibility 233ms ease;visibility:hidden}
.copy-button[data-copied="true"] .copy-button-icon-copy{opacity:0;transform:scale(.8);visibility:hidden}
.copy-button[data-copied="true"] .copy-button-icon-check{opacity:1;transform:scale(1);visibility:visible}
.raw-data-tabs{display:flex;gap:0}
.raw-data-tab{color:var(--text-muted);font-size:.875rem;font-weight:600;padding:.5rem 1rem;cursor:pointer;border:none;background:none;transition:color 233ms ease}
.raw-data-tab:hover{color:var(--text-secondary)}
.raw-data-tab.active{color:var(--text-primary);background-color:var(--surface-card);border-radius:calc(1rem - 1px) calc(1rem - 1px) 0 0}
.raw-data-panel{display:none}
.raw-data-panel.active{display:block}
.back-to-top{background-color:var(--surface-back-to-top);border:1px solid var(--border-back-to-top);border-radius:50%;bottom:calc(3rem + env(safe-area-inset-bottom));box-shadow:var(--elevation-back-to-top);color:var(--text-secondary);font-size:1.5rem;opacity:0;padding:.5rem;position:fixed;right:calc(1.5rem + env(safe-area-inset-right));visibility:hidden;z-index:999}
.back-to-top:hover{background-color:var(--surface-back-to-top-hover);color:var(--text-primary)}
.dialog{background-color:var(--surface-card);border:1px solid var(--border-card);border-radius:1rem;box-shadow:var(--elevation-card);color:var(--text-primary);max-width:min(28rem,calc(100vw - 3rem));padding:0;width:100%}
.dialog::backdrop{background-color:#0c1f3f66;backdrop-filter:blur(2px)}
.dialog-body{display:grid;gap:1rem;padding:1rem}
.dialog-head{align-items:center;display:flex;gap:.5rem;justify-content:space-between}
.dialog-title{font-size:1rem;margin:0}
.icon-button{border-radius:50%;color:var(--text-secondary);font-size:1.25rem;padding:.25rem}
.icon-button:hover{background-color:var(--surface-toggle-hover);color:var(--text-primary)}
.field{display:grid;gap:.375rem}
.field-label{color:var(--text-muted);font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.dialog-input{border-radius:.75rem;padding-left:1rem;padding-right:1rem;width:100%}
.dialog-hint{color:var(--text-muted);font-size:.75rem;margin:0}
.dialog-actions{display:flex;gap:.5rem;justify-content:flex-end}
.ghost-button{border:1px solid var(--border-input);border-radius:999px;color:var(--text-secondary);font-weight:600;padding:.75rem 1.5rem}
.ghost-button:hover{background-color:var(--surface-toggle-hover)}
@media(max-width:36rem){h1{text-align:center}form,.card-items{grid-template-columns:1fr}.input-box{grid-column:auto}}
`;
}

function getJS(): string {
  return `
(function(){
  var form=document.getElementById("form");
  var domainInput=document.getElementById("domain");
  var clearBtn=document.getElementById("domain-clear");
  var searchBtn=document.getElementById("search-button");
  var results=document.getElementById("results");
  var backToTop=document.getElementById("back-to-top");
  var themeSwitcher=document.getElementById("theme-switcher");

  // Proxy pool stored in this browser only
  var PROXY_POOL_KEY="whois_proxy_pool";
  function getProxyPoolUrl(){
    try{return localStorage.getItem(PROXY_POOL_KEY)||""}catch(err){return ""}
  }
  function setProxyPoolUrl(url){
    try{
      if(url)localStorage.setItem(PROXY_POOL_KEY,url);
      else localStorage.removeItem(PROXY_POOL_KEY);
    }catch(err){}
  }

  // Theme toggle
  themeSwitcher.addEventListener("click",function(){
    var current=document.documentElement.getAttribute("data-theme");
    var next=current==="dark"?"light":"dark";
    document.documentElement.setAttribute("data-theme",next);
    localStorage.setItem("theme",next);
  });

  // Clear button
  domainInput.addEventListener("input",function(){
    clearBtn.classList.toggle("visible",!!domainInput.value);
  });
  clearBtn.addEventListener("click",function(){
    domainInput.value="";
    domainInput.focus();
    clearBtn.classList.remove("visible");
  });

  // Paste handler - extract hostname from URL
  domainInput.addEventListener("paste",function(e){
    try{
      var text=e.clipboardData.getData("text");
      var hostname=new URL(text).hostname;
      e.preventDefault();
      domainInput.value=hostname;
      domainInput.dispatchEvent(new Event("input"));
    }catch(err){}
  });

  // Back to top
  window.addEventListener("scroll",function(){
    backToTop.classList.toggle("visible",window.scrollY>300);
  });
  backToTop.addEventListener("click",function(){
    window.scrollTo({behavior:"smooth",top:0});
  });

  // Settings dialog
  var settingsBtn=document.getElementById("settings-btn");
  var settingsDialog=document.getElementById("settings-dialog");
  var settingsClose=document.getElementById("settings-close");
  var proxyPoolInput=document.getElementById("proxy-pool-input");
  var settingsSave=document.getElementById("settings-save");
  var settingsClear=document.getElementById("settings-clear");

  if(settingsBtn&&settingsDialog){
    settingsBtn.addEventListener("click",function(){
      proxyPoolInput.value=getProxyPoolUrl();
      settingsDialog.showModal();
    });
    settingsClose.addEventListener("click",function(){settingsDialog.close()});
    settingsDialog.addEventListener("click",function(e){if(e.target===settingsDialog)settingsDialog.close()});
    settingsSave.addEventListener("click",function(){
      setProxyPoolUrl(proxyPoolInput.value.trim());
      settingsDialog.close();
    });
    settingsClear.addEventListener("click",function(){
      setProxyPoolUrl("");
      proxyPoolInput.value="";
      settingsDialog.close();
    });
  }

  // Form submit
  form.addEventListener("submit",function(e){
    e.preventDefault();
    var domain=domainInput.value.trim();
    if(!domain)return;
    doLookup(domain);
  });

  // Deep link: /?domain=example.com renders the result on load
  var initialDomain=new URLSearchParams(location.search).get("domain");
  if(initialDomain){
    domainInput.value=initialDomain;
    clearBtn.classList.add("visible");
    doLookup(initialDomain);
  }

  function doLookup(domain){
    searchBtn.disabled=true;
    searchBtn.dataset.loading="true";
    results.innerHTML='<div class="message"><span class="message-icon message-icon-unknown"><svg width="1em" height="1em" viewBox="0 -960 960 960" fill="currentColor"><path d="M576-653q0-38-27-62.5T480-740q-26 0-47.5 11.5T395-696q-14 19-35.5 24t-40.5-6q-20-12-24-30.5t10-38.5q29-44 75.5-68.5T480-840q89 0 145 51.5T681-656q0 42-18.5 76.5T596-500q-32 29-43 47t-15 41q-4 23-19.5 37.5T482-360q-22 0-37-14.5T430-409q0-37 17.5-69.5T503-543q43-38 58-60t15-50Zm-96 509q-30 0-51-21t-21-51q0-30 21-51t51-21q30 0 51 21t21 51q0 30-21 51t-51 21Z"/></svg></span><span>Looking up \\''+esc(domain)+'\\'...</span></div>';

    var params="domain="+encodeURIComponent(domain);
    var poolUrl=getProxyPoolUrl();
    if(poolUrl)params+="&proxy_pool="+encodeURIComponent(poolUrl);

    fetch("/api/lookup?"+params)
      .then(function(r){
        var ct=r.headers.get("content-type")||"";
        if(ct.indexOf("application/json")<0){
          throw new Error("The API did not return JSON (HTTP "+r.status+"). Check that the /api/lookup function is deployed.");
        }
        return r.json();
      })
      .then(function(resp){
        searchBtn.disabled=false;
        searchBtn.dataset.loading="false";
        renderResult(domain,resp);
      })
      .catch(function(err){
        searchBtn.disabled=false;
        searchBtn.dataset.loading="false";
        results.innerHTML='<div class="message"><span class="message-icon message-icon-error"><svg width="1em" height="1em" viewBox="0 -960 960 960" fill="currentColor"><path d="M480-429 316-265q-11 11-25 10.5T266-266q-11-11-11-25.5t11-25.5l163-163-164-164q-11-11-10.5-25.5T266-695q11-11 25.5-11t25.5 11l163 164 164-164q11-11 25.5-11t25.5 11q11 11 11 25.5T695-644L531-480l164 164q11 11 11 25t-11 25q-11 11-25.5 11T644-266L480-429Z"/></svg></span><span>'+esc(err.message||"Query failed")+'</span></div>';
      });
  }

  function renderResult(domain,resp){
    if(resp.code!==0){
      results.innerHTML='<div class="message"><span class="message-icon message-icon-error"><svg width="1em" height="1em" viewBox="0 -960 960 960" fill="currentColor"><path d="M480-429 316-265q-11 11-25 10.5T266-266q-11-11-11-25.5t11-25.5l163-163-164-164q-11-11-10.5-25.5T266-695q11-11 25.5-11t25.5 11l163 164 164-164q11-11 25.5-11t25.5 11q11 11 11 25.5T695-644L531-480l164 164q11 11 11 25t-11 25q-11 11-25.5 11T644-266L480-429Z"/></svg></span><span>'+esc(resp.msg)+'</span></div>';
      return;
    }
    var d=resp.data;
    var html="";

    // Status message
    if(d.unknown){
      html+='<div class="message"><span class="message-icon message-icon-unknown"><svg width="1em" height="1em" viewBox="0 -960 960 960" fill="currentColor"><path d="M576-653q0-38-27-62.5T480-740q-26 0-47.5 11.5T395-696q-14 19-35.5 24t-40.5-6q-20-12-24-30.5t10-38.5q29-44 75.5-68.5T480-840q89 0 145 51.5T681-656q0 42-18.5 76.5T596-500q-32 29-43 47t-15 41q-4 23-19.5 37.5T482-360q-22 0-37-14.5T430-409q0-37 17.5-69.5T503-543q43-38 58-60t15-50Zm-96 509q-30 0-51-21t-21-51q0-30 21-51t51-21q30 0 51 21t21 51q0 30-21 51t-51 21Z"/></svg></span><span>\\''+esc(domain)+'\\' is unknown.</span></div>';
    }else if(d.reserved){
      html+='<div class="message"><span class="message-icon message-icon-reserved"><svg width="1em" height="1em" viewBox="0 -960 960 960" fill="currentColor"><path d="M480-96q-79 0-149-30t-122.5-82.5Q156-261 126-331T96-480q0-80 30-149.5t82.5-122Q261-804 331-834t149-30q80 0 149.5 30t122 82.5Q804-699 834-629.5T864-480q0 79-30 149t-82.5 122.5Q699-156 629.5-126T480-96Zm0-72q55 0 104-18t89-50L236-673q-32 40-50 89t-18 104q0 130 91 221t221 91Zm244-119q32-40 50-89t18-104q0-130-91-221t-221-91q-55 0-104 18t-89 50l437 437Z"/></svg></span><span>\\''+esc(domain)+'\\' is reserved.</span></div>';
    }else if(d.registered){
      var tags="";
      if(d.createdAgoSeconds&&d.createdAgoSeconds<604800)tags+='<span class="tag tag-green">New</span>';
      if(d.expiresInSeconds!=null&&d.expiresInSeconds>=0&&d.expiresInSeconds<604800)tags+='<span class="tag tag-yellow">Expiring Soon</span>';
      if(d.pendingDelete)tags+='<span class="tag tag-red">Pending Delete</span>';
      else if(d.expiresInSeconds!=null&&d.expiresInSeconds<0)tags+='<span class="tag tag-red">Expired</span>';
      if(d.gracePeriod)tags+='<span class="tag tag-yellow">Grace Period</span>';
      else if(d.redemptionPeriod)tags+='<span class="tag tag-red">Redemption Period</span>';
      if(d.hold)tags+='<span class="tag tag-gray">Hold</span>';
      if(d.inactive)tags+='<span class="tag tag-gray">Inactive</span>';
      html+='<div class="message"><span class="message-icon message-icon-registered"><svg width="1em" height="1em" viewBox="0 -960 960 960" fill="currentColor"><path d="m389-369 299-299q10.91-11 25.45-11Q728-679 739-668t11 25.58q0 14.58-10.61 25.19L415-292q-10.91 11-25.45 11Q375-281 364-292L221-435q-11-11-11-25.5t11-25.5q11-11 25.67-11 14.66 0 25.33 11l117 117Z"/></svg></span><span><a href="http://'+esc(domain)+'" rel="nofollow noopener noreferrer" target="_blank">'+esc(domain)+'</a> is registered.</span>'+(tags?'<div class="message-tags">'+tags+'</div>':"")+'</div>';
    }else{
      html+='<div class="message"><span class="message-icon message-icon-unregistered"><svg width="1em" height="1em" viewBox="0 -960 960 960" fill="currentColor"><path d="M479.79-672Q450-672 429-693.21t-21-51Q408-774 429.21-795t51-21Q510-816 531-794.79t21 51Q552-714 530.79-693t-51 21Zm.21 528q-25 0-42.5-17.5T420-204v-312q0-25 17.5-42.5T480-576q25 0 42.5 17.5T540-516v312q0 25-17.5 42.5T480-144Z"/></svg></span><span>\\''+esc(domain)+'\\' is unregistered.</span></div>';
    }

    // Registry card
    if(d.registryWebsite||d.registryWHOISServer||d.registryRDAPServer){
      html+='<section class="card"><p class="card-title">Registry</p><div class="card-items">';
      if(d.registryWebsite)html+=cardItem("Website",'<a href="'+esc(d.registryWebsite)+'" rel="nofollow noopener noreferrer" target="_blank" class="break-all">'+esc(d.registryWebsite)+"</a>");
      if(d.registryWHOISServer)html+=cardItem("WHOIS Server",'<span class="break-all">'+esc(d.registryWHOISServer)+"</span>");
      if(d.registryRDAPServer)html+=cardItem("RDAP Server",'<span class="break-all">'+esc(d.registryRDAPServer)+"</span>");
      html+="</div></section>";
    }

    // Registrar card
    if(d.registrar||d.registrarIANAId||d.registrarWHOISServer||d.registrarRDAPServer){
      html+='<section class="card"><p class="card-title">Registrar</p><div class="card-items">';
      if(d.registrar){
        var regVal=d.registrarURL?'<a href="'+esc(d.registrarURL)+'" rel="nofollow noopener noreferrer" target="_blank">'+esc(d.registrar)+"</a>":esc(d.registrar);
        html+=cardItem("Name",regVal);
      }
      if(d.registrarIANAId)html+=cardItem("IANA ID",'<a href="https://client.rdap.org/?type=registrar&object='+esc(d.registrarIANAId)+'&follow-referral=0" rel="nofollow noopener noreferrer" target="_blank">'+esc(d.registrarIANAId)+"</a>");
      if(d.registrarWHOISServer)html+=cardItem("WHOIS Server",'<span class="break-all">'+esc(d.registrarWHOISServer)+"</span>");
      if(d.registrarRDAPServer)html+=cardItem("RDAP Server",'<span class="break-all">'+esc(d.registrarRDAPServer)+"</span>");
      html+="</div></section>";
    }

    // Dates card
    if(d.creationDate||d.expirationDate||d.updatedDate){
      html+='<section class="card"><p class="card-title">Dates</p><div class="card-items">';
      if(d.creationDate)html+=dateItem("Creation Date",d.creationDate,d.creationDateISO8601,d.createdAgo,"ago");
      if(d.expirationDate)html+=dateItem("Expiration Date",d.expirationDate,d.expirationDateISO8601,d.expiresIn,"remaining");
      if(d.updatedDate)html+=dateItem("Updated Date",d.updatedDate,d.updatedDateISO8601,d.updatedAgo,"ago");
      html+="</div></section>";
    }

    // Status and DNS card
    if(d.registered&&(d.status.length||d.nameServers.length||d.dnssecSigned!==null)){
      html+='<section class="card"><p class="card-title">Status and DNS</p><div class="card-items">';
      if(d.status.length){
        var statusHtml="";
        for(var i=0;i<d.status.length;i++){
          var s=d.status[i];
          if(s.url)statusHtml+='<a class="chip chip-link" href="'+esc(s.url)+'" rel="nofollow noopener noreferrer" target="_blank">'+esc(s.text)+"</a>";
          else statusHtml+='<span class="chip">'+esc(s.text)+"</span>";
        }
        html+=cardItem("Status",'<div class="card-item-values">'+statusHtml+"</div>");
      }
      if(d.nameServers.length){
        var nsHtml="";
        for(var j=0;j<d.nameServers.length;j++)nsHtml+='<span class="chip">'+esc(d.nameServers[j])+"</span>";
        html+=cardItem("Name Servers",'<div class="card-item-values">'+nsHtml+"</div>");
      }
      if(d.dnssecSigned!==null){
        var dnssecVal=d.dnssecSigned?'<a href="https://dnsviz.net/d/'+esc(domain)+'/dnssec/" rel="nofollow noopener noreferrer" target="_blank">Signed</a>':"<span>Unsigned</span>";
        html+=cardItem("DNSSEC",dnssecVal);
      }
      html+="</div></section>";
    }

    // Raw data section
    var hasWhois=!!resp.rawWhois;
    var hasRdap=!!resp.rawRdap;
    if(hasWhois||hasRdap){
      html+='<section class="card" style="padding:0">';
      html+='<div class="raw-data-head">';
      html+='<div class="raw-data-tabs">';
      if(hasWhois)html+='<button class="raw-data-tab'+(hasWhois?' active':'')+'" data-tab="whois">WHOIS</button>';
      if(hasRdap)html+='<button class="raw-data-tab'+(hasWhois?'':' active')+'" data-tab="rdap">RDAP</button>';
      html+='</div>';
      html+='<div class="raw-data-buttons">';
      html+='<button class="copy-button" data-copy-target="raw-data-content" aria-label="Copy"><span class="copy-button-icon-copy"><svg width="1em" height="1em" viewBox="0 -960 960 960" fill="currentColor"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg></span><span class="copy-button-icon-check"><svg width="1em" height="1em" viewBox="0 -960 960 960" fill="currentColor"><path d="m389-369 299-299q10.91-11 25.45-11Q728-679 739-668t11 25.58q0 14.58-10.61 25.19L415-292q-10.91 11-25.45 11Q375-281 364-292L221-435q-11-11-11-25.5t11-25.5q11-11 25.67-11 14.66 0 25.33 11l117 117Z"/></svg></span></button>';
      html+='</div></div>';
      if(hasWhois)html+='<div class="raw-data-panel'+(hasWhois?' active':'')+'" id="panel-whois"><pre><code id="raw-whois-content">'+esc(resp.rawWhois)+'</code></pre></div>';
      if(hasRdap)html+='<div class="raw-data-panel'+(hasWhois?'':' active')+'" id="panel-rdap"><pre><code id="raw-rdap-content">'+esc(formatJson(resp.rawRdap))+'</code></pre></div>';
      html+='</section>';
    }

    results.innerHTML=html;

    // Bind tab switching
    var tabs=results.querySelectorAll(".raw-data-tab");
    for(var t=0;t<tabs.length;t++){
      tabs[t].addEventListener("click",function(){
        var target=this.getAttribute("data-tab");
        var allTabs=results.querySelectorAll(".raw-data-tab");
        var allPanels=results.querySelectorAll(".raw-data-panel");
        for(var i=0;i<allTabs.length;i++)allTabs[i].classList.remove("active");
        for(var j=0;j<allPanels.length;j++)allPanels[j].classList.remove("active");
        this.classList.add("active");
        var panel=document.getElementById("panel-"+target);
        if(panel)panel.classList.add("active");
      });
    }

    // Bind copy buttons
    var copyBtns=results.querySelectorAll(".copy-button");
    for(var c=0;c<copyBtns.length;c++){
      copyBtns[c].addEventListener("click",function(){
        var activePanel=results.querySelector(".raw-data-panel.active code");
        if(!activePanel)return;
        navigator.clipboard.writeText(activePanel.textContent).then(function(){
          this.setAttribute("data-copied","true");
          setTimeout(function(){this.removeAttribute("data-copied")}.bind(this),2000);
        }.bind(this));
      });
    }
  }

  function cardItem(label,value){
    return '<div class="card-item"><div class="card-item-label">'+label+'</div><div class="card-item-value">'+value+"</div></div>";
  }

  // Dates are rendered the way the original PHP project renders them: shifted
  // to UTC+8 and printed as "YYYY-MM-DD HH:MM:SS UTC+8" (e.g. an ISO value of
  // 2027-06-05T06:22:40Z becomes "2027-06-05 14:22:40 UTC+8"). Values that
  // carry no time component keep their plain "YYYY-MM-DD" form, and anything
  // that is not a parseable ISO-8601 string is printed verbatim.
  var DISPLAY_UTC_OFFSET_HOURS=8;
  var DISPLAY_UTC_LABEL="UTC+8";

  function padNum(n,len){
    var str=String(n);
    while(str.length<len)str="0"+str;
    return str;
  }

  function formatDisplayDate(iso){
    var d=new Date(iso);
    if(isNaN(d.getTime()))return iso;
    if(!/[T ]\d{2}:\d{2}/.test(iso)){
      // The record carries no time. Render midnight instead of shifting the
      // day into UTC+8, which would turn a bare 2027-06-05 into 08:00:00.
      return padNum(d.getUTCFullYear(),4)+"-"+padNum(d.getUTCMonth()+1,2)+"-"+padNum(d.getUTCDate(),2)+" 00:00:00 "+DISPLAY_UTC_LABEL;
    }
    var shifted=new Date(d.getTime()+DISPLAY_UTC_OFFSET_HOURS*3600000);
    var ymd=padNum(shifted.getUTCFullYear(),4)+"-"+padNum(shifted.getUTCMonth()+1,2)+"-"+padNum(shifted.getUTCDate(),2);
    return ymd+" "+padNum(shifted.getUTCHours(),2)+":"+padNum(shifted.getUTCMinutes(),2)+":"+padNum(shifted.getUTCSeconds(),2)+" "+DISPLAY_UTC_LABEL;
  }

  function dateItem(label,date,iso8601,diff,suffix){
    var val='<span>'+esc(iso8601?formatDisplayDate(iso8601):date)+"</span>";
    var tertiary=diff?'<div class="card-item-value-tertiary"><span>'+esc(diff)+" "+suffix+"</span></div>":"";
    return '<div class="card-item"><div class="card-item-label">'+label+'</div><div class="card-item-value">'+val+"</div>"+tertiary+"</div>";
  }

  function esc(s){
    if(s==null)return"";
    var div=document.createElement("div");
    div.textContent=String(s);
    return div.innerHTML;
  }

  function formatJson(raw){
    try{return JSON.stringify(JSON.parse(raw),null,2)}catch(e){return raw||""}
  }
})();
`;
}
