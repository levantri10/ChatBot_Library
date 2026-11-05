import "./style.css";
const state = {
  books: [],
  documents: [],
  tab: "chat",
  messages: [],
  busy: false,
  search: "",
  password: "",
  editing: null,
  authenticated: false,
  loading: true,
  catalogError: "",
};
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const time = (s) =>
  new Date(s).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  });
async function api(path, options = {}) {
  let r;
  try { r = await fetch(`/api/${path}`, { signal: AbortSignal.timeout(55000), ...options }); }
  catch { throw new Error("Kết nối bị gián đoạn hoặc quá thời gian chờ. Vui lòng thử lại."); }
  let data;
  try { data = await r.json(); }
  catch { throw new Error("Máy chủ chưa phản hồi hợp lệ. Vui lòng thử lại sau."); }
  if (!r.ok) throw new Error(data.error || "Không thực hiện được yêu cầu.");
  return data;
}
function sourceLink(text) {
  const url = String(text || "").match(/https:\/\/www\.gutenberg\.org\/ebooks\/\d+/)?.[0];
  return url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">Đọc bản gốc ↗</a>' : "";
}
function shell() {
  $("#app").innerHTML =
    `<aside class="sidebar"><a class="brand" href="/" aria-label="Trang chủ"><img class="brand-icon" src="/library-ai.svg" alt="Logo Thư Viện AI" width="48" height="48"><span>thư viện<span class="brand-ai"> / AI</span><small>TRỢ LÝ TRI THỨC</small></span></a><div class="nav-label">KHÔNG GIAN THƯ VIỆN</div><nav>${[
      ["chat", "✧", "Trợ lý AI"],
      ["books", "▤", "Danh mục sách"],
      ["hours", "◷", "Giờ & quy định"],
    ]
      .map(
        ([id, i, t]) =>
          `<button data-tab="${id}" class="${state.tab === id ? "active" : ""}"><span>${i}</span>${t}${id === "chat" ? "<b>RAG</b>" : ""}</button>`,
      )
      .join(
        "",
      )}</nav><div class="side-note"><span class="note-symbol">✳</span><h3>Hỏi từ dữ liệu thư viện</h3><p>Tìm câu trả lời về sách, số lượng còn lại và thông tin nội bộ, kèm nguồn tham khảo.</p><div class="tech"><span>AI</span><span>PostgreSQL</span></div></div><button class="admin-link" data-tab="admin">⚙ <span>Quản trị dữ liệu</span><span>↗</span></button><div class="sidebar-foot">ĐỒ ÁN AI CHATBOT THƯ VIỆN <span>v1.0</span></div></aside><main><header><div><span class="breadcrumb">Không gian thư viện</span><span class="divider">/</span><strong>${{ chat: "Trợ lý AI", books: "Danh mục sách", hours: "Giờ & quy định", admin: "Quản trị" }[state.tab]}</strong></div><span class="data-badge"><i></i> Dữ liệu thư viện nội bộ</span></header><div class="demo-banner"><span>ⓘ</span> Dữ liệu minh họa cho đồ án. Số lượng sách và lịch làm việc chưa phải thông tin chính thức.</div><div id="catalog-status" role="status" aria-live="polite"></div><section id="content"></section><footer><span>Thư viện AI <span class="dot">·</span> Tra cứu có nguồn, học tập chủ động.</span><span>Powered by AI & Supabase</span></footer></main>`;
  document.querySelectorAll("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        state.tab = b.dataset.tab;
        state.editing = null;
        render();
      }),
  );
}
function render() {
  shell();
  const status = $("#catalog-status");
  if (state.loading) status.textContent = "Đang tải dữ liệu thư viện…";
  if (state.catalogError) {
    status.innerHTML = `<span>${esc(state.catalogError)}</span> <button id="retry-catalog">Tải lại dữ liệu</button>`;
    $("#retry-catalog").onclick = loadCatalog;
  }
  if (state.tab === "chat") chat();
  if (state.tab === "books") books();
  if (state.tab === "hours") hours();
  if (state.tab === "admin") admin();
}
function heading(eyebrow, title, description) {
  return `<div class="page-heading"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>`;
}
function chat() {
  $("#content").innerHTML =
    `<div class="chat-layout"><div class="conversation">${state.messages.length ? `<div class="messages">${state.messages.map((m) => `<article class="message ${m.role}"><div class="avatar">${m.role === "user" ? "B" : "✧"}</div><div class="message-body"><div class="message-name">${m.role === "user" ? "Bạn" : "Thư viện AI"} ${m.mode === "retrieval" ? '<span class="fallback-tag">Tra cứu dữ liệu</span>' : ""}</div><div class="message-text">${esc(m.text)}</div>${m.sources?.length ? `<details><summary>${m.sources.length} nguồn dữ liệu thư viện</summary>${m.sources.map((s, i) => `<div class="source"><b>[${i + 1}] ${esc(s.title)}</b><p>${esc(s.content)}</p></div>`).join("")}</details>` : ""}</div></article>`).join("")}${state.busy ? '<article class="message"><div class="avatar">✧</div><div class="message-body loading">Đang tra cứu dữ liệu thư viện…</div></article>' : ""}</div>` : `<div class="welcome"><img class="welcome-logo" src="/library-ai.svg" alt="Thư Viện AI — Tri thức đối thoại" width="82" height="82"><div class="eyebrow">NGƯỜI BẠN ĐỒNG HÀNH TRI THỨC</div><h1>Hôm nay bạn muốn<br>khám phá điều gì?</h1><p>Mình giúp bạn tìm sách, kiểm tra số lượng còn lại<br>và giải đáp thông tin từ dữ liệu của thư viện.</p><div class="prompts"><button data-prompt="Sách Cơ sở dữ liệu còn bao nhiêu cuốn?">▤<strong>Kiểm tra tồn kho</strong><span>Sách Cơ sở dữ liệu còn không?</span><b>↗</b></button><button data-prompt="Sách Nhập môn Trí tuệ nhân tạo có nội dung gì?">✧<strong>Khám phá nội dung</strong><span>Tìm hiểu một cuốn sách</span><b>↗</b></button><button data-prompt="Giờ hành chính thư viện là khi nào?">◷<strong>Lên lịch ghé thư viện</strong><span>Giờ mở cửa & quy định mượn</span><b>↗</b></button></div></div>`}${state.messages.length ? `<div class="chat-actions"><button id="clear-chat" ${state.busy ? "disabled" : ""}>Cuộc trò chuyện mới</button></div>` : ""}<form id="chat-form" class="composer"><label class="sr-only" for="question">Câu hỏi cho thư viện</label><textarea id="question" maxlength="1000" rows="2" placeholder="Hỏi về tên sách, số lượng còn lại, giờ mở cửa…" ${state.busy ? "disabled" : ""}></textarea><div class="composer-bottom"><span>✧ <b>RAG</b><span class="dot">·</span> Trả lời dựa trên dữ liệu thư viện</span><button class="send" type="submit" aria-label="Gửi câu hỏi" ${state.busy ? "disabled" : ""}>↑</button></div></form><p class="chat-disclaimer">Mỗi câu hỏi được xử lý độc lập; hãy nhắc lại tên sách. AI có thể sai, hãy kiểm tra nguồn.</p></div><aside class="context-panel"><div class="panel-heading">THƯ VIỆN TRONG TẦM TAY <span>↗</span></div><div class="mini-stat"><span class="stat-icon">▤</span><div><strong>${state.books.length}</strong><span>đầu sách trong danh mục</span></div></div><div class="mini-stat"><span class="stat-icon">◫</span><div><strong>${state.books.reduce((n, b) => n + b.available, 0)}</strong><span>cuốn hiện có thể mượn</span></div></div><div class="panel-rule"></div><div class="eyebrow">CÓ THỂ BẠN ĐANG TÌM</div>${state.books
      .slice(0, 3)
      .map(
        (b, i) =>
          `<button class="quick-book" data-prompt="Cho tôi thông tin và số lượng còn lại của sách ${esc(b.title)}"><span class="book-spine color-${i}">▤</span><span><strong>${esc(b.title)}</strong><small>${b.available ? "Còn " + b.available + " cuốn" : "Đã hết sách"}</small></span><span>↗</span></button>`,
      )
      .join(
        "",
      )}<div class="how-it-works"><span>✳</span><strong>Câu trả lời từ đâu?</strong><p>Thông tin được truy xuất từ danh mục sách và tài liệu nội bộ trên Supabase, rồi đưa vào ngữ cảnh cho AI.</p><a href="#" id="view-data">Khám phá dữ liệu thư viện ↗</a></div></aside></div>`;
  if ($("#clear-chat")) $("#clear-chat").onclick = () => { state.messages = []; chat(); };
  $("#chat-form").onsubmit = (e) => {
    e.preventDefault();
    send($("#question").value);
  };
  $("#question").onkeydown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      send(e.target.value);
    }
  };
  document
    .querySelectorAll("[data-prompt]")
    .forEach((b) => (b.onclick = () => send(b.dataset.prompt)));
  $("#view-data").onclick = (e) => {
    e.preventDefault();
    state.tab = "books";
    render();
  };
  $(".messages")?.scrollTo(0, 999999);
}
async function send(message) {
  if (state.busy || !message.trim()) return;
  state.messages.push({ role: "user", text: message.trim() });
  state.busy = true;
  chat();
  try {
    const r = await api("chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim() }),
    });
    state.messages.push({
      role: "assistant",
      text: r.answer,
      sources: r.sources,
      mode: r.mode,
    });
  } catch (e) {
    state.messages.push({ role: "assistant", text: e.message });
  } finally {
    state.busy = false;
    if (state.tab === "chat") {
      chat();
      $("#question").focus();
    }
  }
}
function books() {
  $("#content").innerHTML =
    heading(
      "DANH MỤC THƯ VIỆN",
      "Một cuốn sách, nhiều khám phá.",
      "Tra cứu nội dung, vị trí và số lượng sách hiện có trong thư viện.",
    ) +
    `<div class="catalog-toolbar"><label class="search-box">⌕ <input id="search" placeholder="Tìm tên sách, tác giả, thể loại…" value="${esc(state.search)}"></label><span>${state.books.length} đầu sách</span></div><div class="book-grid" id="book-grid"></div>`;
  $("#search").oninput = (e) => {
    state.search = e.target.value;
    drawBooks();
  };
  drawBooks();
}
function drawBooks() {
  const term = state.search
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
  const rows = state.books.filter((b) =>
    `${b.title} ${b.author} ${b.category}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .toLowerCase()
      .includes(term),
  );
  $("#book-grid").innerHTML = rows.length
    ? rows
        .map(
          (b, i) =>
            `<article class="book-card"><div class="book-card-top"><span class="book-illustration color-${i % 3}">▤</span><span class="stock ${b.available ? "" : "empty"}">${b.available ? "Còn " + b.available + " / " + b.total : "Hết sách"}</span></div><div class="eyebrow">${esc(b.category)}</div><h2>${esc(b.title)}</h2><p class="author">${esc(b.author)}</p><p class="summary">${esc(b.summary)}</p>${sourceLink(b.summary)}<div class="book-meta"><span>⌖ ${esc(b.location)}</span><button data-book="${esc(b.title)}">Hỏi AI ↗</button></div><small class="updated">Cập nhật ${time(b.updated_at)}</small></article>`,
        )
        .join("")
    : '<p class="empty-state">Không tìm thấy sách phù hợp.</p>';
  document.querySelectorAll("[data-book]").forEach(
    (b) =>
      (b.onclick = () => {
        state.tab = "chat";
        render();
        send(`Cho tôi thông tin sách ${b.dataset.book}`);
      }),
  );
}
function hours() {
  $("#content").innerHTML =
    heading(
      "THÔNG TIN THƯ VIỆN",
      "Sắp xếp một buổi ghé thăm.",
      "Giờ hành chính, hướng dẫn mượn sách và thông báo từ thư viện.",
    ) +
    `<div class="documents">${state.documents.map((d) => `<article class="document"><span class="document-icon">${d.kind === "hours" ? "◷" : d.kind === "policy" ? "▤" : "ⓘ"}</span><div><div class="eyebrow">${{ hours: "GIỜ HÀNH CHÍNH", policy: "QUY ĐỊNH", notice: "THÔNG BÁO" }[d.kind]}</div><h2>${esc(d.title)}</h2><p>${esc(d.content)}</p><small>Cập nhật ${time(d.updated_at)}</small></div></article>`).join("")}</div>`;
}
function admin() {
  $("#content").innerHTML =
    heading(
      "QUẢN TRỊ THƯ VIỆN",
      "Dữ liệu tốt, câu trả lời đúng.",
      "Cập nhật dữ liệu nội bộ để chatbot có thể trả lời các thông tin riêng của thư viện.",
    ) +
    `<form id="login" class="login"><label>Mật khẩu quản trị<input id="password" type="password" autocomplete="current-password" required value="${esc(state.password)}"></label><button class="primary">Mở quản trị →</button></form><p id="admin-status" role="status"></p><div id="admin-content"></div>`;
  if (state.authenticated) {
    $("#login").innerHTML = `<p>Phiên quản trị đang mở.</p><button type="button" id="logout">Đăng xuất</button>`;
    $("#logout").onclick = () => { state.password = ""; state.authenticated = false; state.editing = null; admin(); };
    adminContent();
    return;
  }
  $("#login").onsubmit = async (e) => {
    e.preventDefault();
    state.password = $("#password").value;
    try {
      const data = await api("admin", {
        headers: { Authorization: `Bearer ${state.password}` },
      });
      Object.assign(state, data);
      state.authenticated = true;
      if (state.tab !== "admin") return;
      admin();
      $("#admin-status").textContent =
        "Đã xác thực. Mật khẩu chỉ giữ trong bộ nhớ phiên này.";
    } catch (e) {
      state.password = "";
      if (state.tab === "admin") $("#admin-status").textContent = e.message;
    }
  };
}
function adminContent() {
  const b = state.editing?.type === "book" ? state.editing.data : null;
  const d = state.editing?.type === "document" ? state.editing.data : null;
  $("#admin-content").innerHTML =
    `${state.editing ? '<button id="cancel-edit" type="button">Hủy chỉnh sửa / Thêm mới</button>' : ""}<div class="admin-columns"><section class="edit-panel"><h2>${b ? "Sửa sách" : "Thêm sách"}</h2><form id="book-form">${[
      ["title", "Tên sách"],
      ["author", "Tác giả"],
      ["category", "Thể loại"],
      ["location", "Vị trí kệ"],
    ]
      .map(
        ([k, l]) =>
          `<label>${l}<input name="${k}" maxlength="200" value="${esc(b?.[k] || "")}" ${k === "title" ? "required" : ""}></label>`,
      )
      .join(
        "",
      )}<label>Nội dung cơ bản<textarea name="summary" maxlength="6000" rows="4">${esc(b?.summary || "")}</textarea></label><div class="input-row"><label>Tổng số<input name="total" type="number" min="0" max="100000" required value="${b?.total ?? 1}"></label><label>Còn lại<input name="available" type="number" min="0" max="100000" required value="${b?.available ?? 1}"></label></div><button class="primary">Lưu sách</button></form></section><section class="edit-panel"><h2>${d ? "Sửa tài liệu" : "Thêm thông tin nội bộ"}</h2><form id="doc-form"><label>Tiêu đề<input name="title" maxlength="200" required value="${esc(d?.title || "")}"></label><label>Loại<select name="kind">${[
      ["hours", "Giờ hành chính"],
      ["policy", "Quy định"],
      ["notice", "Thông báo"],
    ]
      .map(
        ([k, l]) =>
          `<option value="${k}" ${d?.kind === k ? "selected" : ""}>${l}</option>`,
      )
      .join(
        "",
      )}</select></label><label>Nội dung<textarea name="content" rows="9" required maxlength="6000">${esc(d?.content || "")}</textarea></label><button class="primary">Lưu thông tin</button></form></section></div><h2>Dữ liệu hiện tại</h2><div class="admin-list">${[...state.books.map((b) => ({ ...b, type: "book" })), ...state.documents.map((d) => ({ ...d, type: "document" }))].map((r) => `<button data-edit="${r.id}" data-type="${r.type}"><span>${r.type === "book" ? "▤" : "◷"} ${esc(r.title)}</span><span>Chỉnh sửa ↗</span></button>`).join("")}</div>`;
  if ($("#cancel-edit")) $("#cancel-edit").onclick = () => { state.editing = null; adminContent(); };
  $("#book-form").onsubmit = (e) => save(e, "book", b?.id);
  $("#doc-form").onsubmit = (e) => save(e, "document", d?.id);
  document.querySelectorAll("[data-edit]").forEach(
    (btn) =>
      (btn.onclick = () => {
        const type = btn.dataset.type;
        state.editing = {
          type,
          data: state[type === "book" ? "books" : "documents"].find(
            (r) => r.id === btn.dataset.edit,
          ),
        };
        adminContent();
        $("#admin-content").scrollIntoView({ behavior: "smooth" });
      }),
  );
}
async function save(e, type, id) {
  e.preventDefault();
  const button = e.target.querySelector("button");
  button.disabled = true;
  const data = Object.fromEntries(new FormData(e.target));
  if (type === "book") {
    data.total = Number(data.total);
    data.available = Number(data.available);
  }
  try {
    const r = await api("admin", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${state.password}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type, id, data }),
    });
    const c = await api("catalog");
    Object.assign(state, c);
    state.editing = null;
    if (state.tab !== "admin" || !state.authenticated) return;
    adminContent();
    $("#admin-status").textContent = r.indexed
      ? "Đã lưu và cập nhật chỉ mục vector."
      : "Đã lưu dữ liệu. Tra cứu từ khóa sẵn sàng; chưa tạo được embedding Gemini.";
  } catch (e) {
    if (state.tab === "admin") $("#admin-status").textContent = e.message;
  } finally {
    button.disabled = false;
  }
}
async function loadCatalog() {
  state.loading = true;
  state.catalogError = "";
  render();
  try { Object.assign(state, await api("catalog")); }
  catch (e) { state.catalogError = e.message; }
  finally { state.loading = false; render(); }
}
loadCatalog();
