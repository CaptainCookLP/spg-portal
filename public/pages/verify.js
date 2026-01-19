/**
 * Verify Page Logic
 * Displays and verifies member information from token
 */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadPublicSettings();
    verifyToken();
  } catch (error) {
    showError("Fehler beim Laden: " + error.message);
    console.error(error);
  }
});

async function loadPublicSettings() {
  try {
    const settings = await api("/api/public/settings");

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

function verifyToken() {
  const container = $("verifyContent");

  // Get token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  if (!token) {
    showError("Kein Token gefunden");
    return;
  }

  try {
    // Decode base64 token
    const decoded = atob(token);
    const data = JSON.parse(decoded);

    // Validate required fields
    if (!data.id || !data.name) {
      showError("Ungültiger Token");
      return;
    }

    // Check if valid for current year
    const currentYear = new Date().getFullYear();
    if (data.valid && data.valid < currentYear) {
      showWarning(data);
      return;
    }

    // Display member info
    displayMemberInfo(data);

  } catch (error) {
    console.error("Token decode error:", error);
    showError("Ungültiger oder beschädigter Token");
  }
}

function displayMemberInfo(data) {
  const container = $("verifyContent");

  container.innerHTML = `
    <div style="text-align:center;padding:20px">
      <div style="width:80px;height:80px;margin:0 auto 20px;background:linear-gradient(135deg,var(--accent),#f59e0b);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:36px;font-weight:900">
        ✓
      </div>

      <h3 style="margin:0 0 8px;font-size:24px;color:var(--text)">Gültige Mitgliedschaft</h3>
      <p style="color:var(--muted);margin:0 0 30px">Diese Person ist ein verifiziertes Mitglied</p>

      <div style="background:var(--bg);border-radius:12px;padding:20px;text-align:left;margin-bottom:20px">
        <div style="margin-bottom:15px">
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Name</div>
          <div style="font-size:16px;font-weight:600">${escapeHtml(data.name)}</div>
        </div>

        <div style="margin-bottom:15px">
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Mitglieds-Nr</div>
          <div style="font-size:16px;font-weight:600">${escapeHtml(data.id)}</div>
        </div>

        ${data.geburtsdatum ? `
          <div style="margin-bottom:15px">
            <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Geburtsdatum</div>
            <div style="font-size:16px;font-weight:600">${escapeHtml(data.geburtsdatum)}</div>
          </div>
        ` : ''}

        ${data.abteilung ? `
          <div style="margin-bottom:15px">
            <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Abteilung</div>
            <div style="font-size:16px;font-weight:600">${escapeHtml(data.abteilung)}</div>
          </div>
        ` : ''}

        <div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Gültig für</div>
          <div style="font-size:16px;font-weight:600">${data.valid || new Date().getFullYear()}</div>
        </div>
      </div>

      <div style="padding:15px;background:#10b98120;border:1px solid #10b981;border-radius:10px;margin-bottom:20px">
        <div style="font-size:13px;color:#065f46;font-weight:600">
          ✓ Verifiziert am ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} Uhr
        </div>
      </div>

      <p style="font-size:12px;color:var(--muted);margin:20px 0 0">
        Diese Verifikation bestätigt nur die Mitgliedschaft für das angegebene Jahr.<br>
        Bei Fragen wenden Sie sich bitte an die Verwaltung.
      </p>
    </div>
  `;
}

function showWarning(data) {
  const container = $("verifyContent");

  container.innerHTML = `
    <div style="text-align:center;padding:20px">
      <div style="width:80px;height:80px;margin:0 auto 20px;background:#f59e0b;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:36px;font-weight:900">
        ⚠
      </div>

      <h3 style="margin:0 0 8px;font-size:24px;color:var(--text)">Mitgliedschaft abgelaufen</h3>
      <p style="color:var(--muted);margin:0 0 30px">Diese Mitgliedschaft ist nicht mehr gültig</p>

      <div style="background:var(--bg);border-radius:12px;padding:20px;text-align:left;margin-bottom:20px">
        <div style="margin-bottom:15px">
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Name</div>
          <div style="font-size:16px;font-weight:600">${escapeHtml(data.name)}</div>
        </div>

        <div style="margin-bottom:15px">
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Mitglieds-Nr</div>
          <div style="font-size:16px;font-weight:600">${escapeHtml(data.id)}</div>
        </div>

        <div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px">War gültig für</div>
          <div style="font-size:16px;font-weight:600">${data.valid || '-'}</div>
        </div>
      </div>

      <div style="padding:15px;background:#fef3c7;border:1px solid #f59e0b;border-radius:10px">
        <div style="font-size:13px;color:#92400e;font-weight:600">
          ⚠ Diese Mitgliedschaft ist für das aktuelle Jahr ${new Date().getFullYear()} nicht mehr gültig
        </div>
      </div>

      <p style="font-size:12px;color:var(--muted);margin:20px 0 0">
        Bitte wenden Sie sich an die Verwaltung für weitere Informationen.
      </p>
    </div>
  `;
}

function showError(message) {
  const container = $("verifyContent");

  container.innerHTML = `
    <div style="text-align:center;padding:20px">
      <div style="width:80px;height:80px;margin:0 auto 20px;background:#ef4444;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:36px;font-weight:900">
        ✗
      </div>

      <h3 style="margin:0 0 8px;font-size:24px;color:var(--text)">Verifizierung fehlgeschlagen</h3>
      <p style="color:var(--muted);margin:0 0 30px">${escapeHtml(message)}</p>

      <div style="padding:15px;background:#fee2e2;border:1px solid #ef4444;border-radius:10px">
        <div style="font-size:13px;color:#991b1b;font-weight:600">
          ✗ Der QR-Code oder Link ist ungültig oder beschädigt
        </div>
      </div>

      <p style="font-size:12px;color:var(--muted);margin:20px 0 0">
        Bitte kontaktieren Sie das Mitglied oder die Verwaltung.
      </p>
    </div>
  `;
}
