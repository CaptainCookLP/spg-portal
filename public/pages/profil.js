/**
 * Profil Page Logic
 * Loads and displays member profile data
 */

let state = {
  isEditing: false,
  currentMemberId: null,
  members: [],
  originalData: {}
};

// DOM Elements
const $el = {
  edit: $("btnEdit"),
  save: $("btnSave"),
  cancel: $("btnCancel"),
  memberTabs: $("memberTabs"),
  memberTitle: $("memberTitle"),

  vorname: $("fVorname"),
  nachname: $("fNachname"),
  strasse: $("fStrasse"),
  plz: $("fPLZ"),
  ort: $("fOrt"),
  email: $("fEmail"),
  abteilung: $("fAbteilung"),
  mitgliedSeit: $("fMitgliedSeit"),
  handy1: $("fHandy1"),
  telPriv: $("fTelPriv"),
  telDienst: $("fTelDienst"),
  mandatRef: $("fMandatRef"),
  iban: $("fIban"),
  bic: $("fBic"),
  btnToggleIban: $("btnToggleIban"),
  btnToggleBic: $("btnToggleBic"),
  beitrag: $("fBeitrag"),
  mitgliedId: $("fMitgliedId"),
  eintritt: $("fEintritt"),
  austritt: $("fAustritt"),
  dsgvo: $("fDsgvo"),

  error: $("profileError")
};

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Check auth (from shared/auth.js)
    const isLoggedIn = await checkAuth();
    if (!isLoggedIn) {
      return;
    }
    
    // Load family data
    await loadFamily();
    
    // Set up event listeners
    setupEventListeners();
  } catch (error) {
    $el.error.textContent = "Fehler beim Laden des Profils: " + error.message;
    console.error(error);
  }
});

async function loadFamily() {
  try {
    const data = await api("/api/profile/family");
    state.members = data.members || [];
    
    if (state.members.length === 0) {
      $el.error.textContent = "Keine Mitgliederdaten gefunden";
      return;
    }
    
    // Show tabs if multiple members
    if (state.members.length > 1) {
      renderMemberTabs();
    }
    
    // Load first member by default
    setActiveMember(state.members[0].id);
  } catch (error) {
    if (error.status === 401) {
      window.location.href = "/";
      return;
    }
    throw error;
  }
}

function renderMemberTabs() {
  $el.memberTabs.innerHTML = state.members.map((member, idx) => `
    <button class="tab ${idx === 0 ? "active" : ""}" data-member-id="${member.id}">
      ${fullName(member)}
    </button>
  `).join("");
  
  $el.memberTabs.style.display = "flex";
  
  // Add click handlers
  $$(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      setActiveMember(btn.dataset.memberId);
    });
  });
}

function setActiveMember(memberId) {
  const member = state.members.find(m => m.id === memberId);
  if (!member) return;
  
  state.currentMemberId = memberId;
  state.isEditing = false;
  
  // Update title
  $el.memberTitle.textContent = `${fullName(member)}`;
  
  // Store original data for cancel
  state.originalData = { ...member };
  
  // Populate form
  $el.vorname.value = member.vorname || "";
  $el.nachname.value = member.nachname || "";
  $el.strasse.value = member.strasse || "";
  $el.plz.value = member.plz || "";
  $el.ort.value = member.ort || "";
  $el.email.value = member.email || "";
  $el.abteilung.value = member.abteilung || "";
  $el.mitgliedSeit.value = member.eintritt ? yearsSince(member.eintritt) : "-";
  $el.handy1.value = member.handy1 || "";
  $el.telPriv.value = member.telPriv || "";
  $el.telDienst.value = member.telDienst || "";
  $el.mandatRef.value = member.mandatRef || "";
  $el.iban.value = member.iban || "";
  $el.bic.value = member.bic || "";
  $el.iban.type = "password"; // Always start masked
  $el.bic.type = "password"; // Always start masked

  // Display annual fee
  const beitragJahr = member.beitrag ? `${parseFloat(member.beitrag).toFixed(2)} €/Jahr` : "";
  $el.beitrag.value = beitragJahr;

  $el.mitgliedId.textContent = member.id || "-";
  $el.eintritt.textContent = member.eintritt ? fmtDate(member.eintritt) : "-";
  $el.austritt.textContent = member.austritt ? fmtDate(member.austritt) : "-";
  $el.dsgvo.textContent = member.dsgvo ? "✓ Zugestimmt" : "✗ Nicht zugestimmt";
  
  // Reset edit mode
  setEditMode(false);
  $el.error.textContent = "";
}

function setupEventListeners() {
  $el.edit.addEventListener("click", () => setEditMode(true));
  $el.cancel.addEventListener("click", () => {
    setActiveMember(state.currentMemberId);
  });
  $el.save.addEventListener("click", saveMember);

  // Toggle IBAN/BIC visibility
  $el.btnToggleIban.addEventListener("click", () => toggleFieldVisibility($el.iban));
  $el.btnToggleBic.addEventListener("click", () => toggleFieldVisibility($el.bic));
}

function toggleFieldVisibility(field) {
  if (field.type === "password") {
    field.type = "text";
  } else {
    field.type = "password";
  }
}

function setEditMode(editing) {
  state.isEditing = editing;

  // Update disabled state
  const inputs = [
    $el.vorname, $el.nachname, $el.strasse, $el.plz, $el.ort,
    $el.email, $el.abteilung, $el.handy1, $el.telPriv,
    $el.telDienst, $el.iban, $el.bic
  ];

  inputs.forEach(input => {
    input.disabled = !editing;
  });

  // Enable/disable toggle buttons
  $el.btnToggleIban.disabled = !editing;
  $el.btnToggleBic.disabled = !editing;

  // Update button states
  $el.edit.disabled = editing;
  $el.save.disabled = !editing;
  $el.cancel.disabled = !editing;
}

async function saveMember() {
  try {
    $el.error.textContent = "";

    const memberData = {
      vorname: $el.vorname.value.trim(),
      nachname: $el.nachname.value.trim(),
      strasse: $el.strasse.value.trim(),
      plz: $el.plz.value.trim(),
      ort: $el.ort.value.trim(),
      email: $el.email.value.trim(),
      abteilung: $el.abteilung.value.trim(),
      handy1: $el.handy1.value.trim(),
      telPriv: $el.telPriv.value.trim(),
      telDienst: $el.telDienst.value.trim(),
      iban: $el.iban.value.trim(),
      bic: $el.bic.value.trim()
    };
    
    // Validate required fields
    if (!memberData.vorname || !memberData.nachname) {
      throw new Error("Vorname und Nachname sind erforderlich");
    }
    
    if (!memberData.email || !memberData.email.includes("@")) {
      throw new Error("Gültige E-Mail ist erforderlich");
    }
    
    // Save to server
    await api(`/api/profile/member/${state.currentMemberId}`, {
      method: "PUT",
      body: memberData
    });
    
    // Update local state
    const memberIdx = state.members.findIndex(m => m.id === state.currentMemberId);
    if (memberIdx >= 0) {
      state.members[memberIdx] = { ...state.members[memberIdx], ...memberData };
    }
    
    toast("Profil gespeichert");
    setEditMode(false);
  } catch (error) {
    $el.error.textContent = error.message || "Fehler beim Speichern";
    console.error(error);
  }
}
