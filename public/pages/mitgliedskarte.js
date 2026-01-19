/**
 * Mitgliedskarte Page Logic
 * Displays digital member card with QR code
 */

let memberData = null;

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const isLoggedIn = await checkAuth();
    if (!isLoggedIn) return;

    await loadMemberCard();

    $("btnDownload").addEventListener("click", downloadCard);
  } catch (error) {
    $("cardError").textContent = "Fehler: " + error.message;
    console.error(error);
  }
});

async function loadMemberCard() {
  try {
    const data = await api("/api/profile/family");
    memberData = data;

    // Get the first (main) member
    const member = data.members?.[0];
    if (!member) {
      $("memberCardContainer").innerHTML = `
        <p class="muted" style="text-align:center">Keine Mitgliedsdaten gefunden.</p>
      `;
      return;
    }

    await renderMemberCard(member);
  } catch (error) {
    throw error;
  }
}

async function renderMemberCard(member) {
  const container = $("memberCardContainer");
  const orgName = appState.settings?.orgName || "Mitgliederportal";
  const orgShort = orgName.substring(0, 2).toUpperCase();

  // Use lowercase field names (from memberService mapping)
  const vorname = member.vorname || "";
  const nachname = member.nachname || "";
  const memberId = member.id || "";
  const abteilung = member.abteilung || "";
  const eintritt = member.eintritt;
  const geburtsdatum = member.geburtsdatum;

  // Create member token for verification (base64 encoded JSON)
  const tokenData = {
    id: memberId,
    name: `${vorname} ${nachname}`,
    geburtsdatum: geburtsdatum ? new Date(geburtsdatum).toISOString().split('T')[0] : null,
    abteilung: abteilung,
    valid: new Date().getFullYear()
  };

  const token = btoa(JSON.stringify(tokenData));
  const verifyUrl = `${window.location.origin}/verify?token=${token}`;

  // Create QR code data with verify URL
  const qrData = verifyUrl;

  container.innerHTML = `
    <div class="member-card" id="memberCard">
      <div class="member-card-header">
        <div>
          <div class="member-card-org">${escapeHtml(orgName)}</div>
          <div class="member-card-title">Mitgliedsausweis</div>
        </div>
        <div class="member-card-logo">${escapeHtml(orgShort)}</div>
      </div>

      <div class="member-card-body">
        <div class="member-card-qr" id="qrContainer"></div>
        <div class="member-card-info">
          <div class="member-card-name">${escapeHtml(vorname)} ${escapeHtml(nachname)}</div>
          <div class="member-card-id">Mitglieds-Nr: ${escapeHtml(memberId)}</div>
          ${geburtsdatum ? `<div class="member-card-dept">Geboren: ${fmtDate(geburtsdatum)}</div>` : ""}
          ${abteilung ? `<div class="member-card-dept">${escapeHtml(abteilung)}</div>` : ""}
        </div>
      </div>

      <div class="member-card-footer">
        <span>Mitglied seit: ${fmtDate(eintritt)}</span>
        <span>Gültig: ${new Date().getFullYear()}</span>
      </div>
    </div>

    <div style="margin-top:20px;padding:15px;background:var(--card);border-radius:12px;border:1px solid var(--border)">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">Verifikations-Link</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px">Verwende diesen Link zur digitalen Verifikation deiner Mitgliedschaft:</div>
      <input type="text" readonly value="${escapeHtml(verifyUrl)}" style="width:100%;padding:8px;font-size:11px;border:1px solid var(--border);border-radius:8px;background:var(--bg)" onclick="this.select()" />
      <button class="btn small" style="margin-top:8px" onclick="navigator.clipboard.writeText('${escapeHtml(verifyUrl)}').then(() => toast('Link kopiert'))">Link kopieren</button>
    </div>
  `;

  // Generate QR Code using qrcode-generator library
  if (typeof qrcode !== "undefined") {
    try {
      const qr = qrcode(0, "M");
      qr.addData(qrData);
      qr.make();
      $("qrContainer").innerHTML = qr.createSvgTag({ cellSize: 2, margin: 0 });
    } catch (err) {
      console.error("QR Code generation failed:", err);
      $("qrContainer").innerHTML = `<div style="font-size:10px;color:#999">QR nicht verfügbar</div>`;
    }
  } else {
    // Fallback if QRCode library not loaded
    $("qrContainer").innerHTML = `<div style="font-size:10px;color:#999">ID: ${escapeHtml(memberId)}</div>`;
  }
}

async function downloadCard() {
  const card = $("memberCard");
  if (!card) {
    toast("Keine Karte zum Herunterladen");
    return;
  }

  try {
    // Use html2canvas if available, otherwise show instructions
    if (typeof html2canvas !== "undefined") {
      const canvas = await html2canvas(card, {
        scale: 2,
        backgroundColor: null
      });

      const link = document.createElement("a");
      link.download = "mitgliedskarte.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast("Karte heruntergeladen");
    } else {
      // Fallback: Screenshot instructions
      toast("Bitte mache einen Screenshot der Karte", 3000);
    }
  } catch (error) {
    console.error("Download error:", error);
    toast("Bitte mache einen Screenshot der Karte", 3000);
  }
}
