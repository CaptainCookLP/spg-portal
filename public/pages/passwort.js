/**
 * Passwort Page Logic
 * Handles password change functionality
 */

// DOM Elements
const $el = {
  currentPassword: $("currentPassword"),
  newPassword: $("newPassword"),
  confirmPassword: $("confirmPassword"),
  changeBtn: $("btnChangePassword"),
  error: $("passwordError"),
  success: $("passwordSuccess")
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  if (!appState.isLoggedIn) {
    window.location.href = "/";
    return;
  }
  
  $el.changeBtn.addEventListener("click", changePassword);
  
  // Allow Enter key
  [$el.currentPassword, $el.newPassword, $el.confirmPassword].forEach(input => {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") changePassword();
    });
  });
});

async function changePassword() {
  try {
    // Clear messages
    $el.error.textContent = "";
    $el.success.textContent = "";
    
    const current = $el.currentPassword.value.trim();
    const newPwd = $el.newPassword.value.trim();
    const confirm = $el.confirmPassword.value.trim();
    
    // Validation
    if (!current) {
      throw new Error("Aktuelles Passwort erforderlich");
    }
    
    if (!newPwd) {
      throw new Error("Neues Passwort erforderlich");
    }
    
    if (newPwd.length < 8) {
      throw new Error("Passwort muss mindestens 8 Zeichen lang sein");
    }
    
    if (newPwd !== confirm) {
      throw new Error("Passwörter stimmen nicht überein");
    }
    
    if (newPwd === current) {
      throw new Error("Neues Passwort darf nicht gleich dem alten sein");
    }
    
    // Submit
    $el.changeBtn.disabled = true;
    
    await api("/api/auth/password/change", {
      method: "POST",
      body: { oldPassword: current, newPassword: newPwd }
    });
    
    // Success
    $el.success.textContent = "Passwort erfolgreich geändert";
    $el.currentPassword.value = "";
    $el.newPassword.value = "";
    $el.confirmPassword.value = "";
    
    toast("Passwort geändert");
  } catch (error) {
    $el.error.textContent = error.message || "Fehler beim Ändern des Passworts";
    console.error(error);
  } finally {
    $el.changeBtn.disabled = false;
  }
}
