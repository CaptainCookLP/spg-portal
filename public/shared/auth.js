// ============================================================================
// SHARED AUTH & NAVIGATION
// ============================================================================

const appState = {
  settings: null,
  user: null,
  isLoggedIn: false,
  isAdmin: false
};

// Check if user is logged in
async function checkAuth() {
  try {
    const data = await api("/api/profile/family");
    appState.isLoggedIn = true;
    appState.user = { email: data.email };
    appState.isAdmin = data.isAdmin || false;
    
    // Show user info
    $("pillUser").style.display = "flex";
    $("userEmail").textContent = data.email;
    $("btnLogout").style.display = "inline-flex";
    
    // Show navigation items (except login page)
    $("navProfile").style.display = "inline-block";
    $("navNotif").style.display = "inline-block";
    $("navPassword").style.display = "inline-block";
    
    if (data.isAdmin) {
      $("navAdmin").style.display = "inline-block";
    }
    
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

// Auto-check auth when DOM is ready (if not login page)
// Protected page scripts (profil.js, benachrichtigungen.js, etc.) will call checkAuth() themselves
// This is a fallback for other HTML pages
document.addEventListener("DOMContentLoaded", async () => {
  // Skip on login page
  if (window.location.pathname === "/" || window.location.pathname.endsWith("/login.html")) {
    return;
  }
  
  // Only check if appState.isLoggedIn is still false (meaning no script called checkAuth)
  if (!appState.isLoggedIn) {
    await checkAuth();
  }
});

// Load public settings
async function loadPublicSettings() {
  try {
    const settings = await api("/api/public/settings");
    appState.settings = settings;
    
    const root = document.documentElement.style;
    if (settings.theme?.accent) root.setProperty("--accent", settings.theme.accent);
    if (settings.theme?.bg) root.setProperty("--bg", settings.theme.bg);
    if (settings.theme?.card) root.setProperty("--card", settings.theme.card);
    if (settings.theme?.text) root.setProperty("--text", settings.theme.text);
    if (settings.theme?.muted) root.setProperty("--muted", settings.theme.muted);
    
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", settings.theme?.accent || "#b91c1c");
    
    $("siteTitle").textContent = settings.siteTitle || "Mitgliederportal";
    
    if (settings.logoUrl) {
      const logo = $("logoBox");
      if (logo) logo.textContent = "";
      const img = document.createElement("img");
      img.src = settings.logoUrl;
      img.style.maxWidth = "40px";
      img.style.maxHeight = "40px";
      logo?.appendChild(img);
    }
  } catch (error) {
    console.error("Fehler beim Laden der Einstellungen:", error);
  }
}

// Logout
async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch (error) {
    console.error("Logout Error:", error);
  }
  
  appState.isLoggedIn = false;
  window.location.href = "/";
}

$("btnLogout")?.addEventListener("click", logout);

// Init on page load
document.addEventListener("DOMContentLoaded", async () => {
  await loadPublicSettings();
  
  // Check auth for protected pages
  const isPublicPage = window.location.pathname === "/" || window.location.pathname.includes("reset-password");
  if (!isPublicPage) {
    await checkAuth();
  }
});
