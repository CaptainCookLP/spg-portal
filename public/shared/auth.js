// ============================================================================
// SHARED AUTH & NAVIGATION
// ============================================================================

const appState = {
  settings: null,
  user: null,
  isLoggedIn: false,
  isAdmin: false,
  unreadCount: 0,
  darkMode: localStorage.getItem("darkMode") === "true"
};

// Check if user is logged in
async function checkAuth() {
  try {
    const data = await api("/api/profile/family");
    appState.isLoggedIn = true;
    appState.user = { email: data.email };
    appState.isAdmin = data.isAdmin || false;

    // Show user info
    const pillUser = $("pillUser");
    const userEmail = $("userEmail");
    const btnLogout = $("btnLogout");

    if (pillUser) pillUser.style.display = "flex";
    if (userEmail) userEmail.textContent = data.email;
    if (btnLogout) btnLogout.style.display = "inline-flex";

    // Show admin nav if admin
    if (data.isAdmin) {
      const navAdmin = $("navAdmin");
      if (navAdmin) navAdmin.style.display = "inline-block";
    }

    // Load notification count
    await updateNotificationBadge();

    return true;

  } catch (error) {
    appState.isLoggedIn = false;
    // Not logged in - redirect to login
    if (!window.location.pathname.includes("/index.html") && window.location.pathname !== "/") {
      window.location.href = "/";
    }
    return false;
  }
}

// Update notification badge
async function updateNotificationBadge() {
  try {
    const data = await api("/api/notifications");
    appState.unreadCount = data.unreadCount || 0;

    const badge = $("notifBadge");
    if (badge) {
      if (appState.unreadCount > 0) {
        badge.textContent = appState.unreadCount > 99 ? "99+" : appState.unreadCount;
        badge.style.display = "inline-flex";
        badge.classList.add("pulse");
      } else {
        badge.style.display = "none";
        badge.classList.remove("pulse");
      }
    }
  } catch (error) {
    console.error("Fehler beim Laden der Benachrichtigungen:", error);
  }
}

// Poll for new notifications every 60 seconds
let notificationPollInterval = null;

function startNotificationPolling() {
  if (notificationPollInterval) return;

  notificationPollInterval = setInterval(async () => {
    if (appState.isLoggedIn) {
      await updateNotificationBadge();
    }
  }, 60000);
}

function stopNotificationPolling() {
  if (notificationPollInterval) {
    clearInterval(notificationPollInterval);
    notificationPollInterval = null;
  }
}

// Load public settings
async function loadPublicSettings() {
  try {
    const settings = await api("/api/public/settings");
    appState.settings = settings;

    // Apply dark mode if saved
    if (appState.darkMode) {
      document.documentElement.classList.add("dark");
    }

    const root = document.documentElement.style;
    if (!appState.darkMode) {
      if (settings.theme?.accent) root.setProperty("--accent", settings.theme.accent);
      if (settings.theme?.bg) root.setProperty("--bg", settings.theme.bg);
      if (settings.theme?.card) root.setProperty("--card", settings.theme.card);
      if (settings.theme?.text) root.setProperty("--text", settings.theme.text);
      if (settings.theme?.muted) root.setProperty("--muted", settings.theme.muted);
    }

    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", settings.theme?.accent || "#b91c1c");

    const siteTitle = $("siteTitle");
    if (siteTitle) siteTitle.textContent = settings.siteTitle || "Mitgliederportal";

    if (settings.logoUrl) {
      const logo = $("logoBox");
      if (logo) {
        logo.textContent = "";
        const img = document.createElement("img");
        img.src = settings.logoUrl;
        img.style.maxWidth = "40px";
        img.style.maxHeight = "40px";
        logo.appendChild(img);
      }
    }
  } catch (error) {
    console.error("Fehler beim Laden der Einstellungen:", error);
  }
}

// Dark Mode Toggle
function toggleDarkMode() {
  appState.darkMode = !appState.darkMode;
  document.documentElement.classList.toggle("dark", appState.darkMode);
  localStorage.setItem("darkMode", appState.darkMode);

  // Update toggle button icon
  const toggle = $("themeToggle");
  if (toggle) {
    toggle.textContent = appState.darkMode ? "☀️" : "🌙";
  }
}

function initDarkModeToggle() {
  // Apply saved preference
  if (appState.darkMode) {
    document.documentElement.classList.add("dark");
  }

  // Add toggle button to actions if it doesn't exist
  const actions = document.querySelector(".actions");
  if (actions && !$("themeToggle")) {
    const toggle = document.createElement("button");
    toggle.id = "themeToggle";
    toggle.className = "theme-toggle";
    toggle.textContent = appState.darkMode ? "☀️" : "🌙";
    toggle.title = "Dark Mode umschalten";
    toggle.addEventListener("click", toggleDarkMode);
    actions.insertBefore(toggle, actions.firstChild);
  }
}

// Logout
async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch (error) {
    console.error("Logout Error:", error);
  }

  stopNotificationPolling();
  appState.isLoggedIn = false;
  window.location.href = "/";
}

// Init logout button
const btnLogout = $("btnLogout");
if (btnLogout) {
  btnLogout.addEventListener("click", logout);
}

// Init on page load
document.addEventListener("DOMContentLoaded", async () => {
  await loadPublicSettings();
  initDarkModeToggle();

  // Check auth for protected pages
  const isPublicPage = window.location.pathname === "/" || window.location.pathname.includes("reset-password");
  if (!isPublicPage) {
    await checkAuth();
    startNotificationPolling();
  }
});

// Cleanup on page unload
window.addEventListener("beforeunload", stopNotificationPolling);

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

async function initPushNotifications() {
  const btnEnableNotif = $("btnEnableNotif");
  if (!btnEnableNotif) return;

  // Check if push notifications are supported
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    btnEnableNotif.style.display = "none";
    return;
  }

  // Check current permission status
  if (Notification.permission === "granted") {
    btnEnableNotif.style.display = "none";
    return;
  }

  if (Notification.permission === "denied") {
    btnEnableNotif.style.display = "none";
    return;
  }

  // Show the enable button for "default" permission state
  btnEnableNotif.style.display = "inline-flex";
  btnEnableNotif.addEventListener("click", requestPushPermission);
}

async function requestPushPermission() {
  const btnEnableNotif = $("btnEnableNotif");

  try {
    btnEnableNotif.disabled = true;
    btnEnableNotif.textContent = "Aktivieren...";

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      // Successfully granted
      btnEnableNotif.style.display = "none";

      // Show a test notification
      showLocalNotification(
        "Benachrichtigungen aktiviert",
        "Du erhältst jetzt Benachrichtigungen vom Portal."
      );

      toast("Benachrichtigungen aktiviert");
    } else if (permission === "denied") {
      toast("Benachrichtigungen wurden blockiert", 3000);
      btnEnableNotif.style.display = "none";
    } else {
      btnEnableNotif.disabled = false;
      btnEnableNotif.textContent = "Benachrichtigungen";
    }
  } catch (error) {
    console.error("Push notification error:", error);
    toast("Fehler beim Aktivieren der Benachrichtigungen", 3000);
    btnEnableNotif.disabled = false;
    btnEnableNotif.textContent = "Benachrichtigungen";
  }
}

function showLocalNotification(title, body, options = {}) {
  if (Notification.permission !== "granted") return;

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        body,
        icon: "/icon.svg",
        badge: "/icon.svg",
        tag: options.tag || "portal-notification",
        requireInteraction: false,
        ...options
      });
    });
  } else {
    // Fallback to regular notification
    new Notification(title, {
      body,
      icon: "/icon.svg",
      ...options
    });
  }
}

// Handle notification click from service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "OPEN_NOTIFICATIONS") {
      window.location.href = "/benachrichtigungen";
    }
  });
}

// Initialize push notifications when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initPushNotifications();
});
