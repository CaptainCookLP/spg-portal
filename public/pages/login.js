// ============================================================================
// LOGIN PAGE SCRIPT
// ============================================================================

async function loadPublicSettings() {
  try {
    const settings = await api("/api/public/settings");
    
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

async function login() {
  const email = $("email")?.value?.trim();
  const password = $("password")?.value?.trim();
  
  if (!email) {
    $("loginError").textContent = "Bitte Email eingeben";
    return;
  }
  
  try {
    $("loginError").textContent = "";
    $("btnLogin").disabled = true;
    $("btnLogin").textContent = "Anmelden...";
    
    console.log("Starting login...");
    const result = await api("/api/auth/login", {
      method: "POST",
      body: { email, password: password || "" }
    });
    
    console.log("Login successful, result:", result);
    
    // Erfolgreich eingeloggt - Redirect
    console.log("Redirecting to /profil...");
    window.location.href = "/profil";
    
  } catch (error) {
    console.error("Login Error:", error);
    $("loginError").textContent = error.message || "Login fehlgeschlagen";
  } finally {
    $("btnLogin").disabled = false;
    $("btnLogin").textContent = "Anmelden";
  }
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

// Password Reset UI
$("btnForgotPassword")?.addEventListener("click", () => {
  $("viewLogin").style.display = "none";
  $("viewForgotPassword").style.display = "block";
  $("forgotEmail").focus();
});

$("btnBackToLogin")?.addEventListener("click", () => {
  $("viewLogin").style.display = "block";
  $("viewForgotPassword").style.display = "none";
  $("forgotEmail").value = "";
  $("forgotErr").textContent = "";
  $("forgotMsg").textContent = "";
  $("forgotMsg").style.display = "none";
});

$("btnSendReset")?.addEventListener("click", async () => {
  try {
    const email = $("forgotEmail").value.trim();
    
    if (!email) {
      $("forgotErr").textContent = "Bitte E-Mail-Adresse eingeben";
      return;
    }
    
    $("forgotErr").textContent = "";
    $("forgotMsg").textContent = "";
    $("forgotMsg").style.display = "none";
    $("btnSendReset").disabled = true;
    $("btnSendReset").textContent = "Wird gesendet...";
    
    await api("/api/auth/password/forgot", {
      method: "POST",
      body: { email }
    });
    
    $("forgotMsg").textContent = "Passwort-Reset-Link wurde gesendet. Bitte prüfen Sie Ihr E-Mail-Postfach.";
    $("forgotMsg").style.display = "block";
    $("forgotEmail").value = "";
    
  } catch (error) {
    $("forgotErr").textContent = error.message;
  } finally {
    $("btnSendReset").disabled = false;
    $("btnSendReset").textContent = "Passwort-Link senden";
  }
});

// Password Reset Token Check
const urlParams = new URLSearchParams(window.location.search);
const resetToken = urlParams.get("token");

if (resetToken) {
  (async () => {
    try {
      await api(`/api/auth/password/reset/${resetToken}`);
      $("viewLogin").style.display = "none";
      $("viewForgotPassword").style.display = "none";
      $("viewResetPassword").style.display = "block";
    } catch (error) {
      toast("Ungültiger oder abgelaufener Reset-Link");
    }
  })();
}

$("btnCompleteReset")?.addEventListener("click", async () => {
  try {
    const password = $("resetPassword").value.trim();
    const confirm = $("resetPasswordConfirm").value.trim();
    
    if (!password || password.length < 8) {
      $("resetErr").textContent = "Passwort muss mindestens 8 Zeichen haben";
      return;
    }
    
    if (password !== confirm) {
      $("resetErr").textContent = "Passwörter stimmen nicht überein";
      return;
    }
    
    if (!resetToken) {
      $("resetErr").textContent = "Ungültiger Zustand - bitte laden Sie die Seite neu";
      return;
    }
    
    $("resetErr").textContent = "";
    $("resetMsg").textContent = "";
    $("resetMsg").style.display = "none";
    $("btnCompleteReset").disabled = true;
    $("btnCompleteReset").textContent = "Wird gespeichert...";
    
    const result = await api(`/api/auth/password/reset/${resetToken}`, {
      method: "POST",
      body: { password }
    });
    
    $("resetMsg").textContent = result.message;
    $("resetMsg").style.display = "block";
    
    setTimeout(() => {
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    $("resetErr").textContent = error.message;
    $("btnCompleteReset").disabled = false;
    $("btnCompleteReset").textContent = "Passwort setzen";
  }
});

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
  await loadPublicSettings();
});
