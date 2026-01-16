/**
 * Benachrichtigungen Page Logic
 * Loads and displays notifications
 */

let state = {
  notifications: [],
  pollInterval: null
};

// DOM Elements
const $el = {
  list: $("notificationList"),
  empty: $("notifEmpty"),
  error: $("notificationError"),
  markAllRead: $("btnMarkAllRead"),
  clearAll: $("btnClearAll")
};

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (!appState.isLoggedIn) {
      window.location.href = "/";
      return;
    }
    
    await loadNotifications();
    setupEventListeners();
    
    // Poll for new notifications every 30 seconds
    state.pollInterval = setInterval(loadNotifications, 30000);
  } catch (error) {
    $el.error.textContent = "Fehler beim Laden der Benachrichtigungen: " + error.message;
    console.error(error);
  }
});

// Clean up polling on unload
window.addEventListener("beforeunload", () => {
  if (state.pollInterval) clearInterval(state.pollInterval);
});

async function loadNotifications() {
  try {
    const data = await api("/api/notifications");
    state.notifications = data.notifications || [];
    renderNotifications();
  } catch (error) {
    if (error.status === 401) {
      window.location.href = "/";
      return;
    }
    $el.error.textContent = error.message;
    console.error(error);
  }
}

function renderNotifications() {
  const unreadCount = state.notifications.filter(n => !n.read).length;
  
  if (state.notifications.length === 0) {
    $el.list.innerHTML = "";
    $el.empty.style.display = "block";
    return;
  }
  
  $el.empty.style.display = "none";
  
  $el.list.innerHTML = state.notifications.map(notif => `
    <div class="notification-item ${notif.read ? "" : "unread"}">
      <div class="notif-header">
        <h4>${escapeHtml(notif.title)}</h4>
        <span class="muted">${fmtDate(new Date(notif.createdAt))}</span>
      </div>
      <p>${escapeHtml(notif.message)}</p>
      <div class="notif-actions">
        <button class="btn small" data-notif-id="${notif.id}" data-action="toggle-read">
          ${notif.read ? "Ungelesen" : "Gelesen"}
        </button>
        <button class="btn small danger" data-notif-id="${notif.id}" data-action="delete">
          Löschen
        </button>
      </div>
    </div>
  `).join("");
  
  // Add event listeners for notification actions
  $$("[data-action]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const notifId = btn.dataset.notifId;
      const action = btn.dataset.action;
      
      try {
        if (action === "toggle-read") {
          const notif = state.notifications.find(n => n.id === notifId);
          await api(`/api/notifications/${notifId}`, {
            method: "PATCH",
            body: { read: !notif.read }
          });
        } else if (action === "delete") {
          await api(`/api/notifications/${notifId}`, {
            method: "DELETE"
          });
        }
        
        await loadNotifications();
        toast("Benachrichtigung aktualisiert");
      } catch (error) {
        toast("Fehler: " + error.message, 3000);
      }
    });
  });
}

function setupEventListeners() {
  $el.markAllRead.addEventListener("click", async () => {
    try {
      const unread = state.notifications.filter(n => !n.read);
      if (unread.length === 0) {
        toast("Alle Benachrichtigungen bereits gelesen");
        return;
      }
      
      await Promise.all(
        unread.map(n => 
          api(`/api/notifications/${n.id}`, {
            method: "PATCH",
            body: { read: true }
          })
        )
      );
      
      await loadNotifications();
      toast("Alle als gelesen markiert");
    } catch (error) {
      toast("Fehler: " + error.message, 3000);
    }
  });
  
  $el.clearAll.addEventListener("click", async () => {
    if (!confirm("Alle Benachrichtigungen löschen?")) return;
    
    try {
      await Promise.all(
        state.notifications.map(n => 
          api(`/api/notifications/${n.id}`, {
            method: "DELETE"
          })
        )
      );
      
      await loadNotifications();
      toast("Alle Benachrichtigungen gelöscht");
    } catch (error) {
      toast("Fehler: " + error.message, 3000);
    }
  });
}
