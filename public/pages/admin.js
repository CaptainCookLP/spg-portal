/**
 * Admin Page Logic
 * Handles admin settings, SMTP configuration, and notifications
 */

let state = {
  currentTab: "settings"
};

// DOM Elements - General
const $el = {
  tabs: $$(".tab"),
  tabContents: $$(".tab-content")
};

// Settings
const $settings = {
  orgName: $("orgName"),
  logoUrl: $("logoUrl"),
  adminEmail: $("adminEmail"),
  dsgvoUrl: $("dsgvoUrl"),
  saveBtn: $("btnSaveSettings"),
  error: $("settingsError")
};

// SMTP
const $smtp = {
  host: $("smtpHost"),
  port: $("smtpPort"),
  user: $("smtpUser"),
  password: $("smtpPassword"),
  from: $("smtpFrom"),
  saveBtn: $("btnSaveSmtp"),
  testBtn: $("btnTestSmtp"),
  error: $("smtpError"),
  success: $("smtpSuccess")
};

// Notifications
const $notif = {
  title: $("notifTitle"),
  message: $("notifMessage"),
  target: $("notifTarget"),
  sendBtn: $("btnSendNotif"),
  error: $("notifError"),
  success: $("notifSuccess")
};

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (!appState.isLoggedIn || !appState.user?.isAdmin) {
      window.location.href = "/profil";
      return;
    }
    
    await loadAdminSettings();
    setupEventListeners();
  } catch (error) {
    console.error(error);
    toast("Fehler beim Laden der Admin-Einstellungen", 3000);
  }
});

async function loadAdminSettings() {
  try {
    const data = await api("/api/admin/settings");
    
    // Load settings
    if (data.settings) {
      $settings.orgName.value = data.settings.orgName || "";
      $settings.logoUrl.value = data.settings.logoUrl || "";
      $settings.adminEmail.value = data.settings.adminEmail || "";
      $settings.dsgvoUrl.value = data.settings.dsgvoUrl || "";
    }
    
    // Load SMTP
    if (data.smtp) {
      $smtp.host.value = data.smtp.host || "";
      $smtp.port.value = data.smtp.port || "";
      $smtp.user.value = data.smtp.user || "";
      $smtp.from.value = data.smtp.from || "";
      // Password not returned for security
    }
  } catch (error) {
    console.error("Error loading admin settings:", error);
  }
}

function setupEventListeners() {
  // Tab switching
  $el.tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });
  
  // Settings
  $settings.saveBtn.addEventListener("click", saveSettings);
  
  // SMTP
  $smtp.saveBtn.addEventListener("click", saveSmtp);
  $smtp.testBtn.addEventListener("click", testSmtp);
  
  // Notifications
  $notif.sendBtn.addEventListener("click", sendNotification);
}

function switchTab(tabName) {
  state.currentTab = tabName;
  
  // Update active tab button
  $el.tabs.forEach(tab => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });
  
  // Update visible content
  $el.tabContents.forEach(content => {
    const contentTabName = content.id.replace("tab", "").toLowerCase();
    content.style.display = contentTabName === tabName ? "block" : "none";
  });
}

async function saveSettings() {
  try {
    $settings.error.textContent = "";
    
    const data = {
      orgName: $settings.orgName.value.trim(),
      logoUrl: $settings.logoUrl.value.trim(),
      adminEmail: $settings.adminEmail.value.trim(),
      dsgvoUrl: $settings.dsgvoUrl.value.trim()
    };
    
    if (!data.orgName) {
      throw new Error("Organisationsname erforderlich");
    }
    
    await api("/api/admin/settings", {
      method: "PUT",
      body: data
    });
    
    toast("Einstellungen gespeichert");
  } catch (error) {
    $settings.error.textContent = error.message || "Fehler beim Speichern";
  }
}

async function saveSmtp() {
  try {
    $smtp.error.textContent = "";
    $smtp.success.textContent = "";
    
    const data = {
      host: $smtp.host.value.trim(),
      port: parseInt($smtp.port.value),
      user: $smtp.user.value.trim(),
      from: $smtp.from.value.trim()
    };
    
    if ($smtp.password.value.trim()) {
      data.password = $smtp.password.value.trim();
    }
    
    if (!data.host || !data.port || !data.user) {
      throw new Error("Host, Port und User erforderlich");
    }
    
    await api("/api/admin/smtp", {
      method: "PUT",
      body: data
    });
    
    $smtp.success.textContent = "SMTP Konfiguration gespeichert";
    $smtp.password.value = "";
    toast("SMTP konfiguriert");
  } catch (error) {
    $smtp.error.textContent = error.message || "Fehler beim Speichern";
  }
}

async function testSmtp() {
  try {
    $smtp.error.textContent = "";
    $smtp.success.textContent = "";
    $smtp.testBtn.disabled = true;
    
    const to = $settings.adminEmail.value.trim();
    if (!to) {
      throw new Error("Admin E-Mail erforderlich für Test");
    }
    
    await api("/api/admin/smtp/test", {
      method: "POST",
      body: { to }
    });
    
    $smtp.success.textContent = "Test-E-Mail versendet";
    toast("Test erfolgreich");
  } catch (error) {
    $smtp.error.textContent = error.message || "Fehler beim Test";
  } finally {
    $smtp.testBtn.disabled = false;
  }
}

async function sendNotification() {
  try {
    $notif.error.textContent = "";
    $notif.success.textContent = "";
    
    const data = {
      title: $notif.title.value.trim(),
      message: $notif.message.value.trim(),
      target: $notif.target.value
    };
    
    if (!data.title || !data.message) {
      throw new Error("Betreff und Nachricht erforderlich");
    }
    
    $notif.sendBtn.disabled = true;
    
    await api("/api/admin/notifications", {
      method: "POST",
      body: data
    });
    
    $notif.success.textContent = "Benachrichtigung versendet";
    $notif.title.value = "";
    $notif.message.value = "";
    toast("Benachrichtigung versendet");
  } catch (error) {
    $notif.error.textContent = error.message || "Fehler beim Versenden";
  } finally {
    $notif.sendBtn.disabled = false;
  }
}
