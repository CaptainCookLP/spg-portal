// ============================================================================
// SHARED UTILITIES
// ============================================================================

// DOM Helpers
const $ = (id) => document.getElementById(id);
const $$ = (selector) => document.querySelectorAll(selector);

// Toast Notifications
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

// Debounce
function debounce(fn, ms = 300) {
  let timeout = null;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}

// Formatters
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
  // Unterstützt sowohl lowercase (vorname) als auch uppercase (Vorname) Feldnamen
  const vorname = member.vorname || member.Vorname || "";
  const nachname = member.nachname || member.Nachname || "";
  return [vorname, nachname]
    .filter(Boolean)
    .join(" ")
    .trim() || "(Ohne Namen)";
}

// PWA Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
