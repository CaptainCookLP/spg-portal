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
  success: $("passwordSuccess"),
  strengthBar: $("strengthBar"),
  strengthText: $("strengthText")
};

// Password strength checker
function checkPasswordStrength(password) {
  let score = 0;
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    longLength: password.length >= 12
  };

  if (checks.length) score++;
  if (checks.uppercase) score++;
  if (checks.lowercase) score++;
  if (checks.numbers) score++;
  if (checks.special) score++;
  if (checks.longLength) score++;

  if (score <= 2) return { level: "weak", text: "Schwach", class: "weak" };
  if (score <= 3) return { level: "fair", text: "Ausreichend", class: "fair" };
  if (score <= 4) return { level: "good", text: "Gut", class: "good" };
  return { level: "strong", text: "Stark", class: "strong" };
}

function updateStrengthIndicator(password) {
  if (!password) {
    $el.strengthBar.className = "password-strength-bar";
    $el.strengthText.textContent = "";
    return;
  }

  const strength = checkPasswordStrength(password);
  $el.strengthBar.className = `password-strength-bar ${strength.class}`;
  $el.strengthText.textContent = `Passwortstärke: ${strength.text}`;
}

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  const isLoggedIn = await checkAuth();
  if (!isLoggedIn) {
    return;
  }

  $el.changeBtn.addEventListener("click", changePassword);

  // Password strength indicator
  $el.newPassword.addEventListener("input", () => {
    updateStrengthIndicator($el.newPassword.value);
  });

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
