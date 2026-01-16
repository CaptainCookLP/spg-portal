// ============================================================================
// APP.JS - FIXED & COMPLETE
// ============================================================================

// PWA Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

// ============================================================================
// CORE UTILITIES
// ============================================================================

const $ = (id) => document.getElementById(id);
const $$ = (selector) => document.querySelectorAll(selector);

const toast = (() => {
  let timeout = null;
  return (msg, duration = 2500) => {
    const t = $("toast");
    if (!t) return;
    
    clearTimeout(timeout);
    t.textContent = msg;
    t.style.display = "block";
    
    timeout = setTimeout(() => {
      t.style.display = "none";
    }, duration);
  };
})();

function debounce(fn, ms = 300) {
  let timeout = null;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}

function fmtDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString("de-DE");
}

function yearsSince(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
    years--;
  }
  
  return years < 0 ? "0 Jahre" : `${years} Jahr${years === 1 ? "" : "e"}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function fullName(member) {
  return [member.Vorname, member.Nachname]
    .filter(Boolean)
    .join(" ")
    .trim() || "(Ohne Namen)";
}

// ============================================================================
// API CLIENT
// ============================================================================

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function api(url, options = {}) {
  const opts = {
    credentials: "include",
    headers: {
      ...(options.headers || {})
    },
    ...options
  };
  
  if (opts.body && typeof opts.body === "object" && !(opts.body instanceof FormData)) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(opts.body);
  }
  
  try {
    const response = await fetch(url, opts);
    
    const contentType = response.headers.get("content-type");
    let data = null;
    
    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    if (!response.ok) {
      const message = data?.error || `HTTP ${response.status}`;
      throw new ApiError(message, response.status, data);
    }
    
    return data;
    
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(
      error.message || "Netzwerkfehler",
      0,
      { originalError: error }
    );
  }
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
  settings: null,
  user: null,
  members: [],
  activeMember: null,
  lastUnreadCount: 0,
  
  isLoggedIn: false,
  isAdmin: false,
  editing: false,
  editSnapshot: null,
  
  pollTimer: null,
  installPrompt: null,
  notifEnabled: localStorage.getItem("notif_enabled") === "true"
};

// ============================================================================
// VIEW ROUTER
// ============================================================================

const views = {
  login: { title: "Login", requireAuth: false },
  profile: { title: "Profil", requireAuth: true },
  notifications: { title: "Benachrichtigungen", requireAuth: true },
  password: { title: "Passwort ändern", requireAuth: true },
  admin: { title: "Admin", requireAuth: true, requireAdmin: true }
};

function setView(viewName) {
  const view = views[viewName];
  
  if (!view) {
    console.error(`View '${viewName}' nicht gefunden`);
    return;
  }
  
  if (view.requireAuth && !state.isLoggedIn) {
    return setView("login");
  }
  
  if (view.requireAdmin && !state.isAdmin) {
    toast("Keine Berechtigung");
    return setView("profile");
  }
  
  $("viewTitle").textContent = view.title;
  
  ["login", "profile", "notifications", "password", "admin"].forEach(v => {
    const el = $(`view${v.charAt(0).toUpperCase() + v.slice(1)}`);
    if (el) el.style.display = "none";
  });
  
  const activeView = $(`view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
  if (activeView) activeView.style.display = "block";
  
  $$(".nav .item, .bbtn").forEach(item => {
    item.classList.toggle("active", item.dataset.view === viewName);
  });
  
  onViewActivated(viewName);
}

async function onViewActivated(viewName) {
  if (!state.isLoggedIn && viewName !== "login") return;
  
  switch (viewName) {
    case "notifications":
      await loadNotifications();
      break;
    case "admin":
      await loadAdminSettings();
      break;
    case "profile":
      if (state.members.length === 0) {
        await loadFamily();
      }
      break;
  }
}

$$(".nav .item, .bbtn").forEach(item => {
  item.addEventListener("click", () => {
    const view = item.dataset.view;
    if (view) setView(view);
  });
});

// ============================================================================
// SETTINGS & THEMING
// ============================================================================

function applySettings(settings) {
  state.settings = settings;
  
  document.title = settings.siteTitle || "Mitgliederportal";
  $("siteTitle").textContent = settings.siteTitle || "Mitgliederportal";
  $("siteSub").textContent = settings.orgName || "";
  
  const root = document.documentElement.style;
  const theme = settings.theme || {};
  
  if (theme.accent) root.setProperty("--accent", theme.accent);
  if (theme.bg) root.setProperty("--bg", theme.bg);
  if (theme.card) root.setProperty("--card", theme.card);
  if (theme.text) root.setProperty("--text", theme.text);
  if (theme.muted) root.setProperty("--muted", theme.muted);
  
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme.accent || "#b91c1c");
  
  const logo = $("logoBox");
  if (settings.logoUrl) {
    logo.style.background = "transparent";
    logo.innerHTML = `<img src="${escapeHtml(settings.logoUrl)}" alt="Logo" style="width:100%;height:100%;object-fit:cover">`;
  } else {
    logo.textContent = "W";
    logo.style.background = "linear-gradient(135deg, var(--accent), #f59e0b)";
  }
}

async function loadPublicSettings() {
  try {
    const settings = await api("/api/public/settings");
    applySettings(settings);
  } catch (error) {
    console.error("Fehler beim Laden der Einstellungen:", error);
  }
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function login() {
  const email = $("email")?.value?.trim();
  const password = $("password")?.value;
  
  if (!email || !password) {
    $("loginError").textContent = "Bitte Email und Passwort eingeben";
    return;
  }
  
  try {
    $("loginError").textContent = "";
    $("btnLogin").disabled = true;
    $("btnLogin").textContent = "Anmelden...";
    
    await api("/api/auth/login", {
      method: "POST",
      body: { email, password }
    });
    
    await afterLogin();
    
  } catch (error) {
    $("loginError").textContent = error.message;
    console.error("Login Error:", error);
  } finally {
    $("btnLogin").disabled = false;
    $("btnLogin").textContent = "Anmelden";
  }
}

async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch (error) {
    console.error("Logout Error:", error);
  }
  
  state.isLoggedIn = false;
  state.isAdmin = false;
  state.user = null;
  state.members = [];
  
  stopPolling();
  setBadge(0);
  
  $("pillUser").style.display = "none";
  $("btnLogout").style.display = "none";
  $("navAdmin").style.display = "none";
  
  setView("login");
  toast("Abgemeldet");
}

async function afterLogin() {
  state.isLoggedIn = true;
  
  $("pillUser").style.display = "flex";
  $("btnLogout").style.display = "inline-flex";
  $("userEmail").textContent = "...";
  
  await loadFamily();
  await loadNotifications(true);
  
  setView("profile");
  startPolling();
  updateNotifUIButtons();
}

$("btnLogin")?.addEventListener("click", (e) => {
  e.preventDefault();
  login();
});

$("email")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") login();
});

$("password")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") login();
});

$("btnLogout")?.addEventListener("click", logout);

// ============================================================================
// PASSWORD CHANGE
// ============================================================================

async function changePassword() {
  const oldPassword = $("pOld").value;
  const newPassword = $("pNew").value;
  
  if (newPassword.length < 8) {
    $("pwErr").textContent = "Neues Passwort muss mindestens 8 Zeichen haben";
    return;
  }
  
  try {
    $("pwErr").textContent = "";
    $("pwMsg").textContent = "";
    
    await api("/api/auth/password/change", {
      method: "POST",
      body: { oldPassword, newPassword }
    });
    
    $("pOld").value = "";
    $("pNew").value = "";
    $("pwMsg").textContent = "Passwort erfolgreich geändert";
    toast("Passwort geändert");
    
  } catch (error) {
    $("pwErr").textContent = error.message;
  }
}

$("btnChangePw")?.addEventListener("click", changePassword);

// ============================================================================
// PROFILE & FAMILY
// ============================================================================

async function loadFamily() {
  try {
    $("profileError").textContent = "";
    
    const data = await api("/api/profile/family");
    
    state.user = { email: data.email };
    state.isAdmin = data.isAdmin;
    state.members = data.members || [];
    
    $("userEmail").textContent = data.email;
    $("navAdmin").style.display = data.isAdmin ? "flex" : "none";
    
    renderMemberTabs(data.members);
    
    if (data.members.length > 0) {
      setActiveMember(data.members[0]);
    }
    
    if (data.needsDsgvo) {
      showDsgvoModal();
    }
    
  } catch (error) {
    $("profileError").textContent = error.message;
    console.error("Load Family Error:", error);
  }
}

function renderMemberTabs(members) {
  const tabs = $("memberTabs");
  
  if (!members || members.length <= 1) {
    tabs.style.display = "none";
    tabs.innerHTML = "";
    return;
  }
  
  tabs.style.display = "flex";
  tabs.innerHTML = "";
  
  members.forEach((member, index) => {
    const tab = document.createElement("div");
    tab.className = "tab" + (index === 0 ? " active" : "");
    tab.textContent = fullName(member);
    
    tab.addEventListener("click", () => {
      if (state.editing) {
        toast("Bitte Speichern oder Abbrechen");
        return;
      }
      
      $$(".tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      setActiveMember(member);
    });
    
    tabs.appendChild(tab);
  });
}

function setActiveMember(member) {
  state.activeMember = member;
  
  $("memberTitle").textContent = fullName(member);
  $("fMitgliedSeit").textContent = yearsSince(member.Eintritt_Datum);
  $("fAbteilung").value = member.Abteilung || member.AbteilungBezeichnung || member.Gruppen_Nr || "-";
  
  $("fVorname").value = member.Vorname || "";
  $("fNachname").value = member.Nachname || "";
  $("fStrasse").value = member.Adresse || "";
  $("fPLZ").value = member.PLZ || "";
  $("fOrt").value = member.Ort || "";
  $("fEmail").value = member.Email || "";
  $("fHandy1").value = member.Handy_1 || "";
  $("fTelPriv").value = member.Telefon_Privat || "";
  $("fTelDienst").value = member.Telefon_Dienstlich || "";
  
  $("fMitgliedId").textContent = member.MitgliedID || "-";
  $("fMandatRef").value = member.Sepa_Mandats_Ref || "-";
  
  const beitrag = member.Einmalbetrag_1;
  $("fBeitrag").value = beitrag == null ? "-" : `${String(beitrag).replace(".", ",")} €`;
  
  $("fIbanMasked").value = member.IBAN_masked || "-";
  $("fBicMasked").value = member.BIC_masked || "-";
  
  $("fEintritt").textContent = fmtDate(member.Eintritt_Datum);
  $("fAustritt").textContent = fmtDate(member.Austritt_Datum);
  $("fDsgvo").textContent = member.DSGVOZugestimmt 
    ? `Zugestimmt (${fmtDate(member.DSGVOZugestimmtAm)})`
    : "Keine Zustimmung";
}

// ============================================================================
// DSGVO MODAL
// ============================================================================

function showDsgvoModal() {
  const back = $("dsgvoBack");
  if (!back) return;
  
  back.style.display = "flex";
  
  const link = $("dsgvoLink");
  if (link && state.settings?.dsgvoUrl) {
    link.href = state.settings.dsgvoUrl;
    link.style.pointerEvents = "auto";
    link.style.opacity = "1";
  }
  
  const missing = state.members.filter(m => !m.DSGVOZugestimmt);
  const list = $("dsgvoList");
  
  if (list) {
    list.innerHTML = missing.map(m => `
      <div style="display:flex;gap:10px;padding:8px;border:1px solid rgba(0,0,0,0.1);border-radius:12px;margin:8px 0">
        <input type="checkbox" checked data-mid="${escapeHtml(m.MitgliedID)}">
        <div>
          <div style="font-weight:900">${escapeHtml(fullName(m))}</div>
          <div style="font-size:12px;color:var(--muted)">MitgliedID: ${escapeHtml(m.MitgliedID)}</div>
        </div>
      </div>
    `).join("");
  }
  
  $("dsgvoErr").textContent = "";
}

$("btnDsgvoAccept")?.addEventListener("click", async () => {
  try {
    $("dsgvoErr").textContent = "";
    
    const ids = [...$("dsgvoList").querySelectorAll("input[type=checkbox]:checked")]
      .map(x => x.getAttribute("data-mid"))
      .filter(Boolean);
    
    if (!ids.length) throw new Error("Bitte mindestens ein Mitglied auswählen");
    
    await api("/api/profile/dsgvo/consent", {
      method: "POST",
      body: { memberIds: ids }
    });
    
    await loadFamily();
    
    if (!state.members.some(m => !m.DSGVOZugestimmt)) {
      $("dsgvoBack").style.display = "none";
      toast("DSGVO gespeichert");
    } else {
      showDsgvoModal();
      toast("Teilweise gespeichert");
    }
  } catch (error) {
    $("dsgvoErr").textContent = error.message;
  }
});

// ============================================================================
// EDIT MODE
// ============================================================================

const editableFields = ["fVorname", "fNachname", "fStrasse", "fPLZ", "fOrt", "fEmail", "fHandy1", "fTelPriv", "fTelDienst"];

function setEditMode(enabled) {
  state.editing = enabled;
  
  $("btnSave").disabled = !enabled;
  $("btnCancel").disabled = !enabled;
  
  editableFields.forEach(id => {
    $(id).disabled = !enabled;
  });
}

function snapshotFields() {
  const snapshot = {};
  editableFields.forEach(id => {
    snapshot[id] = $(id).value;
  });
  return snapshot;
}

function restoreSnapshot() {
  if (!state.editSnapshot) return;
  
  editableFields.forEach(id => {
    $(id).value = state.editSnapshot[id] || "";
  });
}

$("btnEdit")?.addEventListener("click", () => {
  state.editSnapshot = snapshotFields();
  setEditMode(true);
  toast("Bearbeiten (Test-Modus)");
});

$("btnCancel")?.addEventListener("click", () => {
  restoreSnapshot();
  setEditMode(false);
  toast("Abgebrochen");
});

$("btnSave")?.addEventListener("click", () => {
  toast("Gespeichert (nur lokal - Test-Modus)");
  setEditMode(false);
});

// ============================================================================
// NOTIFICATIONS
// ============================================================================

function setBadge(count) {
  const badge = $("notifBadge");
  if (!badge) return;
  
  if (!count || count <= 0) {
    badge.style.display = "none";
    return;
  }
  
  badge.style.display = "inline-flex";
  badge.textContent = count;
}

async function loadNotifications(initial = false) {
  try {
    $("notifError").textContent = "";
    
    const data = await api("/api/notifications");
    
    setBadge(data.unreadCount || 0);
    renderNotifications(data.items || []);
    
    if (!initial && data.unreadCount > state.lastUnreadCount) {
      toast("Neue Benachrichtigung");
      showWebNotification(data.items);
    }
    
    state.lastUnreadCount = data.unreadCount || 0;
    
  } catch (error) {
    $("notifError").textContent = error.message;
    console.error("Load Notifications Error:", error);
  }
}

function renderNotifications(items) {
  const list = $("notifList");
  
  if (!items || items.length === 0) {
    list.innerHTML = '<div class="hint">Keine Benachrichtigungen</div>';
    return;
  }
  
  list.innerHTML = items.map(notif => {
    const read = !!notif.readAt;
    const body = notif.bodyHtml || `<pre>${escapeHtml(notif.bodyText)}</pre>`;
    const date = new Date(notif.createdAt).toLocaleString("de-DE");
    
    return `
      <div class="card subcard">
        <div class="hd">
          <div>
            <div style="font-weight:900">${escapeHtml(notif.title)}</div>
            <div class="muted" style="font-size:12px">${date} • ${read ? "gelesen" : "neu"}</div>
          </div>
          <div class="row">
            <button class="btn" data-read="${notif.id}" ${read ? "disabled" : ""}>Als gelesen</button>
            ${state.isAdmin ? `<button class="btn danger" data-delete="${notif.id}">Löschen</button>` : ""}
          </div>
        </div>
        <div class="bd">
          ${body}
        </div>
      </div>
    `;
  }).join("");
  
  list.querySelectorAll("[data-read]").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await api(`/api/notifications/${btn.dataset.read}/read`, { method: "POST" });
        await loadNotifications();
        toast("Als gelesen markiert");
      } catch (error) {
        toast(error.message);
      }
    });
  });
  
  list.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Wirklich löschen?")) return;
      
      try {
        await api(`/api/admin/notifications/${btn.dataset.delete}`, { method: "DELETE" });
        await loadNotifications();
        toast("Gelöscht");
      } catch (error) {
        toast(error.message);
      }
    });
  });
}

function showWebNotification(items) {
  if (!state.notifEnabled || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  
  const newest = items.find(i => !i.readAt) || items[0];
  if (!newest) return;
  
  const notification = new Notification(newest.title, {
    body: (newest.bodyText || "").slice(0, 120),
    tag: "portal-notif",
    requireInteraction: false
  });
  
  notification.onclick = () => {
    window.focus();
    setView("notifications");
    notification.close();
  };
}

// ============================================================================
// ADMIN SETTINGS
// ============================================================================

async function loadAdminSettings() {
  try {
    const s = await api("/api/admin/settings");
    buildAdminTabs(state.settings?.adminMenu || ["settings", "smtp", "system"]);
    
    $("aSiteTitle").value = s.siteTitle || "";
    $("aOrgName").value = s.orgName || "";
    $("aLogoUrl").value = s.logoUrl || "";
    $("aDsgvoUrl").value = s.dsgvoUrl || "";
    
    $("aAccent").value = s.theme?.accent || "";
    $("aBg").value = s.theme?.bg || "";
    $("aCard").value = s.theme?.card || "";
    $("aText").value = s.theme?.text || "";
    $("aMuted").value = s.theme?.muted || "";
    
    $("sHost").value = s.smtp?.host || "";
    $("sPort").value = s.smtp?.port ?? 587;
    $("sSecure").value = String(!!s.smtp?.secure);
    $("sUser").value = s.smtp?.user || "";
    $("sPass").value = "";
    $("sFromName").value = s.smtp?.fromName || "";
    $("sFromEmail").value = s.smtp?.fromEmail || "";
    
    if (!window.wHeader) window.wHeader = createWysiwyg("wHeader");
    if (!window.wFooter) window.wFooter = createWysiwyg("wFooter");
    if (!window.wNotif) window.wNotif = createWysiwyg("wNotif");
    
    window.wHeader.setHtml(s.mailLayout?.headerHtml || "");
    window.wFooter.setHtml(s.mailLayout?.footerHtml || "");
    window.wNotif.setHtml("");
  } catch (error) {
    console.error("Load Admin Settings Error:", error);
    $("adminErr").textContent = error.message;
  }
});

$("btnSaveSmtp")?.addEventListener("click", async () => {
  try {
    $("smtpMsg").textContent = "";
    $("smtpErr").textContent = "";
    
    await api("/api/admin/settings", {
      method: "POST",
      body: {
        smtp: {
          host: $("sHost").value.trim(),
          port: Number($("sPort").value || 587),
          secure: $("sSecure").value === "true",
          user: $("sUser").value.trim(),
          pass: $("sPass").value,
          fromName: $("sFromName").value.trim(),
          fromEmail: $("sFromEmail").value.trim()
        }
      }
    });
    
    $("smtpMsg").textContent = "SMTP gespeichert";
    toast("SMTP gespeichert");
  } catch (error) {
    $("smtpErr").textContent = error.message;
  }
});

$("btnTestSmtp")?.addEventListener("click", async () => {
  try {
    $("smtpMsg").textContent = "";
    $("smtpErr").textContent = "";
    
    await api("/api/admin/smtp/test", {
      method: "POST",
      body: { to: $("sTestTo").value.trim() }
    });
    
    $("smtpMsg").textContent = "Testmail gesendet";
    toast("Testmail gesendet");
  } catch (error) {
    $("smtpErr").textContent = error.message;
  }
});

// Member Search
$("mSearch")?.addEventListener("input", debounce(async () => {
  const q = $("mSearch").value.trim();
  if (q.length < 2) {
    $("mResults").innerHTML = "";
    return;
  }
  
  try {
    const r = await api(`/api/admin/members?q=${encodeURIComponent(q)}`);
    $("mResults").innerHTML = (r.items || []).map(m => {
      const label = `${m.MitgliedID} — ${m.Vorname || ""} ${m.Nachname || ""} (${m.Email || "-"})`;
      return `<option value="${escapeHtml(m.MitgliedID)}" data-email="${escapeHtml(m.Email || "")}">${escapeHtml(label)}</option>`;
    }).join("");
  } catch (error) {
    console.error("Search error:", error);
  }
}, 300));

// Targets Management
const targets = [];

function renderTargets() {
  const box = $("targetsBox");
  if (!targets.length) {
    box.innerHTML = `<div class="muted">Noch keine Ziele</div>`;
    return;
  }
  
  box.innerHTML = targets.map((t, idx) => `
    <div style="display:flex;justify-content:space-between;gap:10px;padding:10px;border:1px solid rgba(0,0,0,0.1);border-radius:12px;margin:8px 0">
      <div><strong>${escapeHtml(t.type)}</strong>: ${escapeHtml(t.value)}</div>
      <button class="btn" data-rm="${idx}">Entfernen</button>
    </div>
  `).join("");
  
  box.querySelectorAll("button[data-rm]").forEach(b => {
    b.addEventListener("click", () => {
      targets.splice(Number(b.getAttribute("data-rm")), 1);
      renderTargets();
    });
  });
}

renderTargets();

$("btnAddMember")?.addEventListener("click", () => {
  const opt = $("mResults").options[$("mResults").selectedIndex];
  if (!opt) return;
  targets.push({ type: "mitglied_id", value: opt.value });
  renderTargets();
});

$("btnAddEmail")?.addEventListener("click", () => {
  const opt = $("mResults").options[$("mResults").selectedIndex];
  if (!opt) return;
  const em = opt.getAttribute("data-email") || "";
  if (!em) return toast("Kein Email-Feld");
  targets.push({ type: "email", value: em });
  renderTargets();
});

$("btnAddAll")?.addEventListener("click", () => {
  targets.push({ type: "all", value: "all" });
  renderTargets();
});

$("btnCreateNotif")?.addEventListener("click", async () => {
  try {
    $("sysMsg").textContent = "";
    $("sysErr").textContent = "";
    
    if (!targets.length) throw new Error("Bitte mindestens ein Ziel auswählen");
    
    const fd = new FormData();
    fd.append("title", $("nTitle").value.trim());
    fd.append("bodyText", window.wNotif.getText());
    fd.append("bodyHtml", window.wNotif.getHtml());
    fd.append("sendEmail", $("nSendMail").value);
    fd.append("targetsJson", JSON.stringify(targets));
    
    for (const f of $("nFiles").files) {
      fd.append("files", f);
    }
    
    const r = await api("/api/admin/notifications", { method: "POST", body: fd });
    
    $("sysMsg").textContent = `Erstellt (ID: ${r.id})`;
    targets.splice(0, targets.length);
    renderTargets();
    $("nTitle").value = "";
    window.wNotif.setHtml("");
    $("nFiles").value = "";
    toast("Benachrichtigung erstellt");
    await loadNotifications();
  } catch (error) {
    $("sysErr").textContent = error.message;
  }
});

// ============================================================================
// POLLING
// ============================================================================

function startPolling() {
  if (state.pollTimer) return;
  
  state.pollTimer = setInterval(async () => {
    if (!state.isLoggedIn) {
      stopPolling();
      return;
    }
    
    try {
      await loadNotifications();
    } catch (error) {
      console.error("Polling Error:", error);
    }
  }, 30000);
}

function stopPolling() {
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
  }
}

// ============================================================================
// PWA
// ============================================================================

function updateNotifUIButtons() {
  const btn = $("btnEnableNotif");
  if (!btn || !("Notification" in window)) {
    if (btn) btn.style.display = "none";
    return;
  }
  
  btn.style.display = "inline-flex";
  btn.textContent = Notification.permission === "granted"
    ? "Benachrichtigungen aktiv"
    : "Benachrichtigungen aktivieren";
}

$("btnEnableNotif")?.addEventListener("click", async () => {
  if (!("Notification" in window)) return;
  
  const permission = await Notification.requestPermission();
  
  state.notifEnabled = permission === "granted";
  localStorage.setItem("notif_enabled", permission === "granted");
  
  toast(permission === "granted" 
    ? "Benachrichtigungen aktiviert"
    : "Benachrichtigungen nicht erlaubt"
  );
  
  updateNotifUIButtons();
});

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  state.installPrompt = e;
  $("btnInstall").style.display = "inline-flex";
});

$("btnInstall")?.addEventListener("click", async () => {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  
  if (isIOS && !isStandalone) {
    toast('iPhone: Teilen → "Zum Home-Bildschirm"', 4000);
    return;
  }
  
  if (!state.installPrompt) {
    toast("Install-Option erscheint über HTTPS", 3000);
    return;
  }
  
  state.installPrompt.prompt();
  await state.installPrompt.userChoice;
  
  state.installPrompt = null;
  $("btnInstall").style.display = "none";
});

// ============================================================================
// INITIALIZATION
// ============================================================================

(async function init() {
  console.log("🚀 Initialisiere Portal...");
  
  try {
    await loadPublicSettings();
    updateNotifUIButtons();
    
    // Session Check - versuchen einzuloggen
    try {
      await loadFamily();
      // Wenn erfolgreich, dann sind wir eingeloggt
      state.isLoggedIn = true;
      await afterLogin();
    } catch (error) {
      // Nicht eingeloggt - normal
      state.isLoggedIn = false;
      setView("login");
    }
    
    console.log("✓ Portal bereit");
    
  } catch (error) {
    console.error("Init Error:", error);
    setView("login");
  }
})();
  }
}

function buildAdminTabs(keys) {
  const map = { settings: "Einstellungen", smtp: "SMTP", system: "Systembenachrichtigungen" };
  const host = $("adminTabs");
  host.innerHTML = "";
  
  keys.forEach((k, idx) => {
    const t = document.createElement("div");
    t.className = "tab" + (idx === 0 ? " active" : "");
    t.dataset.admintab = k;
    t.textContent = map[k] || k;
    t.addEventListener("click", () => setAdminTab(k));
    host.appendChild(t);
  });
  
  setAdminTab(keys[0] || "settings");
}

function setAdminTab(k) {
  [...$("adminTabs").children].forEach(x => x.classList.toggle("active", x.dataset.admintab === k));
  ["settings", "smtp", "system"].forEach(x => {
    const pane = $(`adminTab_${x}`);
    if (pane) pane.style.display = (x === k) ? "block" : "none";
  });
}

// WYSIWYG Editor
function createWysiwyg(containerId) {
  const host = $(containerId);
  host.innerHTML = `
    <div class="w-toolbar">
      <button type="button" data-cmd="bold"><b>B</b></button>
      <button type="button" data-cmd="italic"><i>I</i></button>
      <button type="button" data-cmd="underline"><u>U</u></button>
      <button type="button" data-cmd="insertUnorderedList">• Liste</button>
      <button type="button" data-cmd="insertOrderedList">1. Liste</button>
      <button type="button" data-action="link">Link</button>
      <button type="button" data-action="html">HTML</button>
    </div>
    <div class="w-body">
      <div class="w-editor" contenteditable="true"></div>
      <textarea class="w-html" style="display:none;width:100%;min-height:140px;font-family:monospace;padding:8px"></textarea>
    </div>
  `;
  
  const editor = host.querySelector(".w-editor");
  const htmlArea = host.querySelector(".w-html");
  let showHtml = false;
  
  host.querySelectorAll("button[data-cmd]").forEach(b => {
    b.addEventListener("click", (e) => {
      e.preventDefault();
      document.execCommand(b.getAttribute("data-cmd"), false, null);
      editor.focus();
    });
  });
  
  host.querySelector('button[data-action="link"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    const url = prompt("Link URL:");
    if (!url) return;
    document.execCommand("createLink", false, url);
    editor.focus();
  });
  
  host.querySelector('button[data-action="html"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    showHtml = !showHtml;
    if (showHtml) {
      htmlArea.value = editor.innerHTML;
      htmlArea.style.display = "block";
      editor.style.display = "none";
    } else {
      editor.innerHTML = htmlArea.value;
      htmlArea.style.display = "none";
      editor.style.display = "block";
    }
  });
  
  return {
    setHtml: (html) => { editor.innerHTML = html || ""; htmlArea.value = html || ""; },
    getHtml: () => (showHtml ? htmlArea.value : editor.innerHTML),
    getText: () => editor.innerText || ""
  };
}

// Admin Save Handlers
$("btnSaveSettings")?.addEventListener("click", async () => {
  try {
    $("adminMsg").textContent = "";
    $("adminErr").textContent = "";
    
    await api("/api/admin/settings", {
      method: "POST",
      body: {
        siteTitle: $("aSiteTitle").value.trim(),
        orgName: $("aOrgName").value.trim(),
        logoUrl: $("aLogoUrl").value.trim(),
        dsgvoUrl: $("aDsgvoUrl").value.trim(),
        theme: {
          accent: $("aAccent").value.trim(),
          bg: $("aBg").value.trim(),
          card: $("aCard").value.trim(),
          text: $("aText").value.trim(),
          muted: $("aMuted").value.trim()
        },
        mailLayout: {
          headerHtml: window.wHeader.getHtml(),
          footerHtml: window.wFooter.getHtml()
        }
      }
    });
    
    await loadPublicSettings();
    $("adminMsg").textContent = "Gespeichert";
    toast("Gespeichert");
  } catch (error) {
    $("adminErr").textContent = error.message;