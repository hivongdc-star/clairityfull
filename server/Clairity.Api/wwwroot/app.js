(() => {
  const STORAGE = {
    lang: "clairity_lang",
    mode: "clairity_mode",
    access: "clairity_access",
    refresh: "clairity_refresh",
    email: "clairity_email",
  };

  const dict = {
    en: {
      nav_analyze: "Analyze",
      nav_rewrite: "Rewrite",
      nav_openers: "Openers",
      nav_history: "History",
      nav_dashboard: "Dashboard",
      nav_settings: "Settings",
      login_title: "Login",
      register_title: "Create account",
      email: "Email",
      password: "Password",
      login: "Login",
      register: "Register",
      logout: "Logout",
      paste_chat: "Paste chat (one line per message). Prefix lines with “You:” / “Them:” if possible.",
      analyze: "Analyze",
      mode: "Mode",
      locale: "Language",
      save: "Save",
      copy: "Copy",
      title: "Title",
      tags: "Tags (comma-separated)",
      cancel: "Cancel",
      ok: "OK",
      rewrite_title: "Rewrite text",
      style: "Style",
      rewrite: "Rewrite",
      openers_title: "Openers",
      context: "Context",
      count: "Count",
      generate: "Generate",
      history_title: "Saved snippets",
      dashboard_title: "Dashboard",
      range: "Range",
      setup_title: "First-time setup",
      choose_lang: "Choose your main language",
      settings_title: "Settings",
      default_mode: "Default mode",
      language_saved: "Saved.",
      need_login: "Please login to continue.",
      server: "Server",
      api_base: "API base",
    },
    vi: {
      nav_analyze: "Phân tích",
      nav_rewrite: "Viết lại",
      nav_openers: "Mở đầu",
      nav_history: "Lưu",
      nav_dashboard: "Bảng điều khiển",
      nav_settings: "Cài đặt",
      login_title: "Đăng nhập",
      register_title: "Tạo tài khoản",
      email: "Email",
      password: "Mật khẩu",
      login: "Đăng nhập",
      register: "Đăng ký",
      logout: "Đăng xuất",
      paste_chat: "Dán đoạn chat (mỗi dòng 1 tin). Nếu được, thêm tiền tố “You:” / “Them:” để nhận diện.",
      analyze: "Phân tích",
      mode: "Chế độ",
      locale: "Ngôn ngữ",
      save: "Lưu",
      copy: "Copy",
      title: "Tiêu đề",
      tags: "Tag (ngăn cách dấu phẩy)",
      cancel: "Huỷ",
      ok: "OK",
      rewrite_title: "Viết lại văn bản",
      style: "Phong cách",
      rewrite: "Viết lại",
      openers_title: "Câu mở đầu",
      context: "Bối cảnh",
      count: "Số lượng",
      generate: "Tạo",
      history_title: "Đã lưu",
      dashboard_title: "Bảng điều khiển",
      range: "Khoảng",
      setup_title: "Thiết lập lần đầu",
      choose_lang: "Chọn ngôn ngữ chính",
      settings_title: "Cài đặt",
      default_mode: "Chế độ mặc định",
      language_saved: "Đã lưu.",
      need_login: "Vui lòng đăng nhập để tiếp tục.",
      server: "Máy chủ",
      api_base: "API base",
    },
    ja: {
      nav_analyze: "分析",
      nav_rewrite: "リライト",
      nav_openers: "オープナー",
      nav_history: "保存",
      nav_dashboard: "ダッシュボード",
      nav_settings: "設定",
      login_title: "ログイン",
      register_title: "アカウント作成",
      email: "メール",
      password: "パスワード",
      login: "ログイン",
      register: "登録",
      logout: "ログアウト",
      paste_chat: "チャットを貼り付け（1行=1メッセージ）。可能なら “You:” / “Them:” を付けてください。",
      analyze: "分析する",
      mode: "モード",
      locale: "言語",
      save: "保存",
      copy: "コピー",
      title: "タイトル",
      tags: "タグ（カンマ区切り）",
      cancel: "キャンセル",
      ok: "OK",
      rewrite_title: "文章リライト",
      style: "スタイル",
      rewrite: "リライト",
      openers_title: "オープナー",
      context: "文脈",
      count: "件数",
      generate: "生成",
      history_title: "保存済み",
      dashboard_title: "ダッシュボード",
      range: "期間",
      setup_title: "初回セットアップ",
      choose_lang: "メイン言語を選択",
      settings_title: "設定",
      default_mode: "デフォルトモード",
      language_saved: "保存しました。",
      need_login: "続行するにはログインしてください。",
      server: "サーバー",
      api_base: "API base",
    }
  };

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, props={}, children=[]) => {
    const n = document.createElement(tag);
    Object.entries(props).forEach(([k,v]) => {
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    });
    children.forEach(c => n.appendChild(c));
    return n;
  };


async function copyToClipboard(text){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  }catch(e){
    try{
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position="fixed";
      ta.style.left="-9999px";
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    }catch(e2){
      return false;
    }
  }
}

  const state = {
    lang: localStorage.getItem(STORAGE.lang) || "en",
    mode: localStorage.getItem(STORAGE.mode) || "Normal",
    access: localStorage.getItem(STORAGE.access) || "",
    refresh: localStorage.getItem(STORAGE.refresh) || "",
    email: localStorage.getItem(STORAGE.email) || "",
    me: null,
    lastAnalyze: null,
  };

  function t(key){
    const d = dict[state.lang] || dict.en;
    return d[key] || dict.en[key] || key;
  }

  function setFooter(){
    const apiBase = location.origin + "/api/v1";
    $("#footer").innerHTML = `${t("server")}: <code>${location.origin}</code> • ${t("api_base")}: <code>${apiBase}</code>`;
    $("#modeBadge").textContent = state.lang.toUpperCase();
  }

  function showModal(title, bodyNode, actions){
    $("#modalTitle").textContent = title;
    const body = $("#modalBody");
    body.innerHTML = "";
    body.appendChild(bodyNode);
    const act = $("#modalActions");
    act.innerHTML = "";
    actions.forEach(a => act.appendChild(a));
    $("#modalBack").style.display = "flex";
  }
  function closeModal(){ $("#modalBack").style.display = "none"; }

  async function apiFetch(path, opts={}){
    const url = "/api/v1" + path;
    const headers = Object.assign({"Content-Type":"application/json"}, opts.headers || {});
    if (state.access) headers["Authorization"] = `Bearer ${state.access}`;
    const res = await fetch(url, Object.assign({}, opts, {headers}));
    if (res.status !== 401) return res;

    // try refresh if token expired
    try{
      const data = await res.clone().json();
      if (data?.error?.code === "TOKEN_EXPIRED" && state.refresh){
        const ok = await refreshToken();
        if (ok){
          const headers2 = Object.assign({"Content-Type":"application/json"}, opts.headers || {});
          headers2["Authorization"] = `Bearer ${state.access}`;
          return await fetch(url, Object.assign({}, opts, {headers: headers2}));
        }
      }
    }catch(e){}
    return res;
  }

  async function refreshToken(){
    const r = await fetch("/api/v1/auth/refresh", {
      method:"POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({refreshToken: state.refresh})
    });
    if (!r.ok) return false;
    const data = await r.json();
    state.access = data.accessToken;
    state.refresh = data.refreshToken;
    localStorage.setItem(STORAGE.access, state.access);
    localStorage.setItem(STORAGE.refresh, state.refresh);
    return true;
  }

  function setAuth(data, email){
    state.access = data.accessToken;
    state.refresh = data.refreshToken;
    state.email = email;
    localStorage.setItem(STORAGE.access, state.access);
    localStorage.setItem(STORAGE.refresh, state.refresh);
    localStorage.setItem(STORAGE.email, state.email);
    $("#userPill").textContent = email;
    $("#logoutBtn").style.display = "inline-block";
  }

  function clearAuth(){
    state.access = "";
    state.refresh = "";
    state.email = "";
    localStorage.removeItem(STORAGE.access);
    localStorage.removeItem(STORAGE.refresh);
    localStorage.removeItem(STORAGE.email);
    $("#userPill").textContent = "Guest";
    $("#logoutBtn").style.display = "none";
  }

  $("#logoutBtn").addEventListener("click", async () => {
    if (state.refresh){
      await apiFetch("/auth/logout", {method:"POST", body: JSON.stringify({refreshToken: state.refresh})}).catch(()=>{});
    }
    clearAuth();
    routeTo("login");
  });

  function parseChat(text){
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const msgs = [];
    for (const line of lines){
      let role = null;
      let content = line;
      const m = line.match(/^(You|Me|Tôi|Mình|俺|私)\s*[:：]\s*(.+)$/i);
      const m2 = line.match(/^(Them|Other|Bạn|Anh|Chị|相手|彼|彼女)\s*[:：]\s*(.+)$/i);
      if (m){ role="you"; content=m[2]; }
      else if (m2){ role="them"; content=m2[2]; }
      msgs.push({role, content});
    }
    return msgs;
  }

  function navItems(){
    return [
      {id:"analyze", label:t("nav_analyze")},
      {id:"rewrite", label:t("nav_rewrite")},
      {id:"openers", label:t("nav_openers")},
      {id:"history", label:t("nav_history")},
      {id:"dashboard", label:t("nav_dashboard")},
      {id:"settings", label:t("nav_settings")},
    ];
  }

  function renderNav(active){
    const nav = $("#nav");
    nav.innerHTML = "";
    navItems().forEach(item => {
      const b = el("button", {text:item.label, class: item.id===active ? "active" : "", onclick: () => routeTo(item.id)});
      nav.appendChild(b);
    });
  }

  function cardTitle(title, rightNode){
    const row = el("div", {class:"row"});
    row.appendChild(el("h2", {text:title}));
    if (rightNode){
      row.style.justifyContent = "space-between";
      row.appendChild(rightNode);
    }
    return row;
  }

  function renderLogin(){
    renderNav("login");
    const app = $("#app");
    app.innerHTML = "";

    const left = el("div", {class:"card"});
    left.appendChild(el("h2", {text: t("login_title")}));

    const email = el("input", {class:"field", placeholder: t("email"), value: state.email || ""});
    const pass = el("input", {class:"field", placeholder: t("password"), type:"password"});
    const msg = el("div", {class:"muted small", text:""});

    const btnRow = el("div", {class:"row"});
    const loginBtn = el("button", {class:"btn", text:t("login"), onclick: async () => {
      msg.textContent="";
      const r = await fetch("/api/v1/auth/login", {
        method:"POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({email: email.value, password: pass.value})
      });
      const data = await r.json().catch(()=>null);
      if (!r.ok){
        msg.textContent = data?.error?.message || "Login failed";
        return;
      }
      setAuth(data, email.value.trim());
      routeTo("analyze");
    }});

    const regBtn = el("button", {class:"btn ghost", text:t("register_title"), onclick: async () => {
      msg.textContent="";
      const r = await fetch("/api/v1/auth/register", {
        method:"POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({email: email.value, password: pass.value})
      });
      const data = await r.json().catch(()=>null);
      if (!r.ok){
        msg.textContent = data?.error?.message || "Register failed";
        return;
      }
      setAuth(data, email.value.trim());
      routeTo("analyze");
    }});

    btnRow.appendChild(loginBtn);
    btnRow.appendChild(regBtn);

    left.appendChild(el("div",{class:"row"},[email, pass]));
    left.appendChild(btnRow);
    left.appendChild(el("div",{class:"hr"}));
    left.appendChild(msg);

    const right = el("div",{class:"card"});
    right.appendChild(el("h2",{text:"Clairity"}));
    right.appendChild(el("div",{class:"muted"},[
      el("div",{text:"• Login is required."}),
      el("div",{text:"• Default language is English."}),
      el("div",{text:"• Server runs on IPv4 and port 4000."}),
    ]));

    const grid = el("div",{class:"grid"});
    grid.appendChild(left);
    grid.appendChild(right);
    app.appendChild(grid);
  }

  function ensureLogin(){
    if (!state.access){
      const app = $("#app");
      app.innerHTML = "";
      app.appendChild(el("div",{class:"card", html:`<div class="muted">${t("need_login")}</div>`}));
      return false;
    }
    return true;
  }

  function renderAnalyze(){
    renderNav("analyze");
    if (!ensureLogin()) return;

    const app = $("#app");
    app.innerHTML = "";

    const left = el("div",{class:"card"});
    left.appendChild(cardTitle(t("nav_analyze")));
    const modeSel = el("select",{class:"field"});
    ["Normal","Business","Crush"].forEach(m => {
      modeSel.appendChild(el("option",{value:m, text:m, ...(m===state.mode?{selected:"selected"}:{})}));
    });
    const localeSel = el("select",{class:"field"});
    ["en","vi","ja"].forEach(l => localeSel.appendChild(el("option",{value:l, text:l.toUpperCase(), ...(l===state.lang?{selected:"selected"}:{})})));
    const chat = el("textarea",{class:"field", placeholder:t("paste_chat")});
    const btnRow = el("div",{class:"row"});
    const analyzeBtn = el("button",{class:"btn", text:t("analyze")});
    const saveBtn = el("button",{class:"btn ghost", text:t("save"), onclick: () => saveSnippetModal()});
    saveBtn.disabled = true;

    const status = el("div",{class:"muted small", text:""});

    analyzeBtn.onclick = async () => {
      status.textContent = "";
      saveBtn.disabled = true;
      const msgs = parseChat(chat.value);
      if (!msgs.length){ status.textContent = "No messages"; return; }

      const body = {messages: msgs, mode: modeSel.value, locale: localeSel.value, options:{maxMessages: 80}};
      const r = await apiFetch("/analyze", {method:"POST", body: JSON.stringify(body)});
      const data = await r.json().catch(()=>null);
      if (!r.ok){
        status.textContent = data?.error?.message || "Analyze failed";
        return;
      }
      state.lastAnalyze = {req: body, res: data, rawText: chat.value};
      renderAnalyzeResult(data);
      saveBtn.disabled = false;
    };

    btnRow.appendChild(analyzeBtn);
    btnRow.appendChild(saveBtn);

    left.appendChild(el("div",{class:"row"},[
      el("div",{style:"flex:1"},[el("div",{class:"muted small", text:t("mode")}), modeSel]),
      el("div",{style:"width:160px"},[el("div",{class:"muted small", text:t("locale")}), localeSel]),
    ]));
    left.appendChild(chat);
    left.appendChild(btnRow);
    left.appendChild(status);

    const right = el("div",{class:"card"});
    right.appendChild(cardTitle("Result"));
    right.appendChild(el("div",{class:"muted", text:"Run Analyze to see KPIs and suggested replies."}));

    const grid = el("div",{class:"grid"});
    grid.appendChild(left);
    grid.appendChild(right);
    app.appendChild(grid);

    function renderAnalyzeResult(data){
      right.innerHTML = "";
      right.appendChild(cardTitle("Result"));

      const kpi = el("div",{class:"kpi"});
      kpi.appendChild(kpiBox("Tone", data.analysis.tone));
      kpi.appendChild(kpiBox("Intent", data.analysis.intent));
      kpi.appendChild(kpiBox("Vibe", (data.analysis.vibeScore ?? 0).toFixed(2)));
      kpi.appendChild(kpiBox("Interest", (data.analysis.interestScore ?? 0).toFixed(2)));

      right.appendChild(kpi);

      right.appendChild(el("div",{class:"hr"}));
      right.appendChild(el("div",{class:"muted small", text:`Timing: ${data.timingAdvice.recommendedWindow} • ${data.timingAdvice.reason}`}));
      right.appendChild(el("div",{class:"muted small", text:`Meta: msgs=${data.meta.messageCount}, you=${data.meta.youCount}, them=${data.meta.themCount}, avgLen=${data.meta.avgMessageLength}, fallback=${data.meta.fallbackUsed}`}));

      const tabs = el("div",{class:"tabs"});
      const replies = [
        {id:"casual", label:"Casual", text:data.replySuggestions.casual},
        {id:"warm", label:"Warm", text:data.replySuggestions.warm},
        {id:"professional", label:"Professional", text:data.replySuggestions.professional},
        {id:"safe", label:"Safe", text:data.replySuggestions.safe},
      ];
      let active = "safe";
      const pre = el("pre",{class:"reply"});
      const copyBtn = el("button",{class:"btn ghost", text:t("copy"), onclick: async () => {
        await copyToClipboard(pre.textContent || "");
      }});

      replies.forEach(rp => {
        const b = el("button",{class:"tab"+(rp.id===active?" active":""), text:rp.label, onclick: () => {
          active = rp.id;
          [...tabs.children].forEach(x => x.classList.remove("active"));
          b.classList.add("active");
          pre.textContent = rp.text;
        }});
        tabs.appendChild(b);
      });

      pre.textContent = replies.find(x=>x.id===active).text;

      right.appendChild(tabs);
      right.appendChild(pre);
      right.appendChild(el("div",{class:"row"},[copyBtn]));
    }

    function kpiBox(label, value){
      const box = el("div",{class:"box"});
      box.appendChild(el("div",{class:"lab", text:label}));
      box.appendChild(el("div",{class:"val", text:value}));
      return box;
    }

    function saveSnippetModal(){
      if (!state.lastAnalyze) return;
      const body = el("div", {});
      const title = el("input",{class:"field", placeholder:t("title"), value:""});
      const tags = el("input",{class:"field", placeholder:t("tags"), value:""});
      body.appendChild(title);
      body.appendChild(el("div",{style:"height:10px"}));
      body.appendChild(tags);

      const cancel = el("button",{class:"btn ghost", text:t("cancel"), onclick: () => closeModal()});
      const ok = el("button",{class:"btn", text:t("ok"), onclick: async () => {
        const tagArr = tags.value.split(",").map(x=>x.trim()).filter(Boolean);
        const payload = {
          title: title.value.trim() || "Untitled",
          rawText: state.lastAnalyze.rawText,
          normalizedMessages: state.lastAnalyze.req.messages,
          analysis: state.lastAnalyze.res.analysis,
          suggestions: state.lastAnalyze.res.replySuggestions,
          tags: tagArr.length?tagArr:null
        };
        const r = await apiFetch("/snippets", {method:"POST", body: JSON.stringify(payload)});
        if (r.ok){
          closeModal();
          routeTo("history");
        }else{
          const d = await r.json().catch(()=>null);
          alert(d?.error?.message || "Save failed");
        }
      }});
      showModal(t("save"), body, [cancel, ok]);
    }
  }

  function renderRewrite(){
    renderNav("rewrite");
    if (!ensureLogin()) return;

    const app = $("#app");
    app.innerHTML = "";

    const card = el("div",{class:"card"});
    card.appendChild(cardTitle(t("rewrite_title")));

    const modeSel = el("select",{class:"field"});
    ["Normal","Business","Crush"].forEach(m => modeSel.appendChild(el("option",{value:m, text:m, ...(m===state.mode?{selected:"selected"}:{})})));
    const style = el("select",{class:"field"});
    ["neutral","short","polite","flirty","more_confident"].forEach(s => style.appendChild(el("option",{value:s, text:s})));
    const text = el("textarea",{class:"field", placeholder:"Text..."});
    const out = el("pre",{class:"reply"});
    const row = el("div",{class:"row"});
    const btn = el("button",{class:"btn", text:t("rewrite"), onclick: async () => {
      const payload = {text:text.value, mode: modeSel.value, locale: state.lang, style: style.value};
      const r = await apiFetch("/rewrite", {method:"POST", body: JSON.stringify(payload)});
      const d = await r.json().catch(()=>null);
      if (!r.ok){ out.textContent = d?.error?.message || "Rewrite failed"; return; }
      out.textContent = d.rewrittenText || "";
    }});
    const copyBtn = el("button",{class:"btn ghost", text:t("copy"), onclick: async () => {
      await copyToClipboard(out.textContent || "");
    }});
    row.appendChild(btn);
    row.appendChild(copyBtn);

    card.appendChild(el("div",{class:"row"},[
      el("div",{style:"flex:1"},[el("div",{class:"muted small", text:t("mode")}), modeSel]),
      el("div",{style:"flex:1"},[el("div",{class:"muted small", text:t("style")}), style]),
    ]));
    card.appendChild(text);
    card.appendChild(row);
    card.appendChild(out);

    app.appendChild(card);
  }

  function renderOpeners(){
    renderNav("openers");
    if (!ensureLogin()) return;

    const app = $("#app");
    app.innerHTML = "";

    const card = el("div",{class:"card"});
    card.appendChild(cardTitle(t("openers_title")));

    const modeSel = el("select",{class:"field"});
    ["Normal","Business","Crush"].forEach(m => modeSel.appendChild(el("option",{value:m, text:m, ...(m===state.mode?{selected:"selected"}:{})})));
    const count = el("input",{class:"field", type:"number", value:"5", min:"1", max:"12"});
    const ctx = el("textarea",{class:"field", placeholder:t("context")});
    const list = el("div",{class:"list"});

    const btn = el("button",{class:"btn", text:t("generate"), onclick: async () => {
      list.innerHTML="";
      const payload = {context: ctx.value, mode: modeSel.value, locale: state.lang, count: parseInt(count.value||"5",10)};
      const r = await apiFetch("/openers", {method:"POST", body: JSON.stringify(payload)});
      const d = await r.json().catch(()=>null);
      if (!r.ok){ list.appendChild(el("div",{class:"muted", text:d?.error?.message || "Failed"})); return; }
      (d.openers||[]).forEach((s,i) => {
        const item = el("div",{class:"item"});
        item.appendChild(el("div",{text:s}));
        const row = el("div",{class:"row"});
        row.appendChild(el("button",{class:"btn ghost", text:t("copy"), onclick: async (e)=>{ e.stopPropagation(); await copyToClipboard(s); }}));
        item.appendChild(row);
        list.appendChild(item);
      });
    }});

    card.appendChild(el("div",{class:"row"},[
      el("div",{style:"flex:1"},[el("div",{class:"muted small", text:t("mode")}), modeSel]),
      el("div",{style:"width:160px"},[el("div",{class:"muted small", text:t("count")}), count]),
      btn
    ]));
    card.appendChild(ctx);
    card.appendChild(el("div",{class:"hr"}));
    card.appendChild(list);

    app.appendChild(card);
  }

  function renderHistory(){
    renderNav("history");
    if (!ensureLogin()) return;

    const app = $("#app");
    app.innerHTML = "";

    const left = el("div",{class:"card"});
    left.appendChild(cardTitle(t("history_title")));

    const list = el("div",{class:"list"});
    left.appendChild(list);

    const right = el("div",{class:"card"});
    right.appendChild(cardTitle("Detail"));
    right.appendChild(el("div",{class:"muted", text:"Select a snippet."}));

    const grid = el("div",{class:"grid"});
    grid.appendChild(left);
    grid.appendChild(right);
    app.appendChild(grid);

    async function load(){
      list.innerHTML = "";
      const r = await apiFetch("/snippets");
      const d = await r.json().catch(()=>[]);
      if (!r.ok){ list.appendChild(el("div",{class:"muted", text:"Failed"})); return; }
      d.forEach(item => {
        const it = el("div",{class:"item", onclick: () => open(item.id)});
        it.appendChild(el("div",{text:item.title}));
        it.appendChild(el("div",{class:"muted small", text:new Date(item.createdAt).toLocaleString()}));
        if (item.tags?.length){
          it.appendChild(el("div",{class:"muted small", text:item.tags.join(", ")}));
        }
        list.appendChild(it);
      });
    }

    async function open(id){
      const r = await apiFetch(`/snippets/${id}`);
      const d = await r.json().catch(()=>null);
      if (!r.ok){ right.innerHTML=""; right.appendChild(el("div",{class:"muted", text:"Not found"})); return; }

      right.innerHTML="";
      right.appendChild(cardTitle(d.title, el("button",{class:"btn danger", text:"Delete", onclick: async ()=> {
        const r2 = await apiFetch(`/snippets/${id}`, {method:"DELETE"});
        if (r2.ok){ await load(); right.innerHTML=""; right.appendChild(el("div",{class:"muted", text:"Deleted"})); }
      }})));

      right.appendChild(el("div",{class:"muted small", text:new Date(d.createdAt).toLocaleString()}));
      right.appendChild(el("div",{class:"hr"}));

      const kpi = el("div",{class:"kpi"});
      const a = d.analysis;
      kpi.appendChild(kpiBox("Tone", a.tone));
      kpi.appendChild(kpiBox("Intent", a.intent));
      kpi.appendChild(kpiBox("Vibe", (a.vibeScore??0).toFixed(2)));
      kpi.appendChild(kpiBox("Interest", (a.interestScore??0).toFixed(2)));
      right.appendChild(kpi);

      right.appendChild(el("div",{class:"hr"}));
      right.appendChild(el("div",{class:"muted small", text:"Raw text"}));
      const raw = el("pre",{class:"reply", text:d.rawText});
      right.appendChild(raw);

      right.appendChild(el("div",{class:"row"},[
        el("button",{class:"btn ghost", text:t("copy"), onclick: async ()=>{ await copyToClipboard(d.rawText||""); }}),
      ]));

      function kpiBox(label, value){
        const box = el("div",{class:"box"});
        box.appendChild(el("div",{class:"lab", text:label}));
        box.appendChild(el("div",{class:"val", text:value}));
        return box;
      }
    }

    load();
  }

  function drawLineChart(canvas, points, getY, label){
    const ctx = canvas.getContext("2d");
    const w = canvas.width = canvas.clientWidth * devicePixelRatio;
    const h = canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.clearRect(0,0,w,h);

    // padding
    const pad = 20 * devicePixelRatio;
    const x0 = pad, y0 = pad, x1 = w - pad, y1 = h - pad;

    // axes
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1 * devicePixelRatio;
    ctx.beginPath();
    ctx.moveTo(x0, y1); ctx.lineTo(x1, y1);
    ctx.moveTo(x0, y0); ctx.lineTo(x0, y1);
    ctx.stroke();

    if (!points.length) return;

    const ys = points.map(getY);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const span = (maxY - minY) || 1;

    const xs = points.map((_,i)=> i);
    const minX = 0, maxX = points.length - 1 || 1;

    const toX = (i) => x0 + (x1-x0) * ((i - minX)/(maxX-minX || 1));
    const toY = (v) => y1 - (y1-y0) * ((v - minY)/span);

    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2 * devicePixelRatio;
    ctx.beginPath();
    points.forEach((p,i)=>{
      const x = toX(i);
      const y = toY(getY(p));
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();

    // label
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "white";
    ctx.font = `${12*devicePixelRatio}px system-ui`;
    ctx.fillText(label, x0, y0 - 6*devicePixelRatio);
  }

  function renderDashboard(){
    renderNav("dashboard");
    if (!ensureLogin()) return;

    const app = $("#app");
    app.innerHTML = "";

    const card = el("div",{class:"card"});
    card.appendChild(cardTitle(t("dashboard_title")));

    const rangeSel = el("select",{class:"field"});
    ["7d","30d","90d"].forEach(r => rangeSel.appendChild(el("option",{value:r, text:r, ...(r==="30d"?{selected:"selected"}:{})})));

    const refreshBtn = el("button",{class:"btn", text:"Refresh"});
    const row = el("div",{class:"row"});
    row.appendChild(el("div",{style:"width:160px"},[el("div",{class:"muted small", text:t("range")}), rangeSel]));
    row.appendChild(refreshBtn);

    const kpi = el("div",{class:"kpi"});
    const c1 = el("canvas",{class:"canvas"});
    const c2 = el("canvas",{class:"canvas"});

    const status = el("div",{class:"muted small", text:""});

    card.appendChild(row);
    card.appendChild(kpi);
    card.appendChild(el("div",{class:"hr"}));
    card.appendChild(c1);
    card.appendChild(el("div",{style:"height:10px"}));
    card.appendChild(c2);
    card.appendChild(el("div",{class:"hr"}));
    card.appendChild(status);

    app.appendChild(card);

    refreshBtn.onclick = load;
    load();

    async function load(){
      status.textContent = "";
      const r = await apiFetch(`/dashboard?range=${encodeURIComponent(rangeSel.value)}`);
      const d = await r.json().catch(()=>null);
      if (!r.ok){ status.textContent = d?.error?.message || "Failed"; return; }

      kpi.innerHTML = "";
      kpi.appendChild(kpiBox("Vibe avg", (d.summary.vibeAvg ?? 0).toFixed(2)));
      kpi.appendChild(kpiBox("Interest avg", (d.summary.interestAvg ?? 0).toFixed(2)));
      kpi.appendChild(kpiBox("Msg/day", (d.summary.msgCountAvg ?? 0).toFixed(1)));
      kpi.appendChild(kpiBox("Initiative", (d.summary.initiativeRatio ?? 0).toFixed(2)));

      const pts = d.trend || [];
      drawLineChart(c1, pts, p => p.vibeAvg ?? 0, "Vibe trend");
      drawLineChart(c2, pts, p => p.interestAvg ?? 0, "Interest trend");

      status.textContent = `Days: ${pts.length} • Updated: ${new Date().toLocaleString()}`;
    }

    function kpiBox(label, value){
      const box = el("div",{class:"box"});
      box.appendChild(el("div",{class:"lab", text:label}));
      box.appendChild(el("div",{class:"val", text:value}));
      return box;
    }
  }

  function renderSettings(){
    renderNav("settings");

    const app = $("#app");
    app.innerHTML = "";

    const card = el("div",{class:"card"});
    card.appendChild(cardTitle(t("settings_title")));

    const langSel = el("select",{class:"field"});
    ["en","vi","ja"].forEach(l => langSel.appendChild(el("option",{value:l, text:l.toUpperCase(), ...(l===state.lang?{selected:"selected"}:{})})));

    const modeSel = el("select",{class:"field"});
    ["Normal","Business","Crush"].forEach(m => modeSel.appendChild(el("option",{value:m, text:m, ...(m===state.mode?{selected:"selected"}:{})})));

    const msg = el("div",{class:"muted small", text:""});

    const saveBtn = el("button",{class:"btn", text:t("ok"), onclick: () => {
      state.lang = langSel.value;
      state.mode = modeSel.value;
      localStorage.setItem(STORAGE.lang, state.lang);
      localStorage.setItem(STORAGE.mode, state.mode);
      msg.textContent = t("language_saved");
      setFooter();
      // re-render current page text
      routeTo("settings");
    }});

    const apiBase = location.origin + "/api/v1";
    card.appendChild(el("div",{class:"row"},[
      el("div",{style:"flex:1"},[el("div",{class:"muted small", text:t("locale")}), langSel]),
      el("div",{style:"flex:1"},[el("div",{class:"muted small", text:t("default_mode")}), modeSel]),
      saveBtn
    ]));
    card.appendChild(el("div",{class:"hr"}));
    card.appendChild(el("div",{class:"muted small", html:`${t("api_base")}: <code>${apiBase}</code>`}));
    card.appendChild(msg);

    app.appendChild(card);
  }

  const routes = {
    login: renderLogin,
    analyze: renderAnalyze,
    rewrite: renderRewrite,
    openers: renderOpeners,
    history: renderHistory,
    dashboard: renderDashboard,
    settings: renderSettings,
  };

  function routeTo(id){
    // enforce login for protected pages
    if (!state.access && id !== "login" && id !== "settings"){
      id = "login";
    }
    location.hash = "#" + id;
  }

  function handleRoute(){
    const id = (location.hash || "#analyze").slice(1);
    const fn = routes[id] || routes.analyze;
    fn();
    setFooter();
  }

  function firstRunWizard(){
    if (localStorage.getItem(STORAGE.lang)) return;
    const body = el("div",{});
    body.appendChild(el("div",{class:"muted", text:t("choose_lang")}));
    body.appendChild(el("div",{style:"height:10px"}));
    const langSel = el("select",{class:"field"});
    ["en","vi","ja"].forEach(l => langSel.appendChild(el("option",{value:l, text:l.toUpperCase(), ...(l==="en"?{selected:"selected"}:{})})));
    body.appendChild(langSel);

    const ok = el("button",{class:"btn", text:t("ok"), onclick: () => {
      state.lang = langSel.value;
      localStorage.setItem(STORAGE.lang, state.lang);
      closeModal();
      handleRoute();
    }});
    showModal(t("setup_title"), body, [ok]);
  }

  // init
  if (state.email) $("#userPill").textContent = state.email;
  if (state.access) $("#logoutBtn").style.display = "inline-block";

  window.addEventListener("hashchange", handleRoute);
  handleRoute();
  firstRunWizard();
})();
