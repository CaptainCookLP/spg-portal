/**
 * Events Page Logic
 * Loads and displays events
 */

let state = {
  events: [],
  isAdmin: false
};

// DOM Elements
const $el = {
  list: $("eventList"),
  empty: $("eventsEmpty"),
  error: $("eventsError"),
  newEventBtn: $("btnNewEvent")
};

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const isLoggedIn = await checkAuth();
    if (!isLoggedIn) {
      return;
    }
    
    state.isAdmin = appState.user?.isAdmin || false;
    
    // Show new event button only for admins
    if (state.isAdmin) {
      $el.newEventBtn.style.display = "inline-block";
      $el.newEventBtn.addEventListener("click", createNewEvent);
    }
    
    await loadEvents();
  } catch (error) {
    $el.error.textContent = "Fehler beim Laden der Events: " + error.message;
    console.error(error);
  }
});

async function loadEvents() {
  try {
    const data = await api("/api/events");
    state.events = data.events || [];
    renderEvents();
  } catch (error) {
    if (error.status === 401) {
      window.location.href = "/";
      return;
    }
    $el.error.textContent = error.message;
    console.error(error);
  }
}

function renderEvents() {
  if (state.events.length === 0) {
    $el.list.innerHTML = "";
    $el.empty.style.display = "block";
    return;
  }
  
  $el.empty.style.display = "none";
  
  // Sort by date
  const sorted = [...state.events].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );
  
  $el.list.innerHTML = sorted.map(event => `
    <div class="event-card">
      <div class="event-date">
        <div class="event-day">${new Date(event.date).getDate()}</div>
        <div class="event-month">${new Date(event.date).toLocaleString("de-DE", { month: "short" })}</div>
      </div>
      <div class="event-content">
        <h3>${escapeHtml(event.title)}</h3>
        <p class="muted">${fmtDate(new Date(event.date))}</p>
        ${event.description ? `<p>${escapeHtml(event.description)}</p>` : ""}
        ${event.location ? `<p>📍 ${escapeHtml(event.location)}</p>` : ""}
        ${state.isAdmin ? `
          <div class="event-actions">
            <button class="btn small" data-event-id="${event.id}" data-action="edit">Bearbeiten</button>
            <button class="btn small danger" data-event-id="${event.id}" data-action="delete">Löschen</button>
          </div>
        ` : ""}
      </div>
    </div>
  `).join("");
  
  if (state.isAdmin) {
    $$("[data-action]").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const eventId = btn.dataset.eventId;
        const action = btn.dataset.action;
        
        try {
          if (action === "delete") {
            if (!confirm("Event löschen?")) return;
            
            await api(`/api/events/${eventId}`, {
              method: "DELETE"
            });
            
            toast("Event gelöscht");
          }
          // Edit would open a modal or navigate
          
          await loadEvents();
        } catch (error) {
          toast("Fehler: " + error.message, 3000);
        }
      });
    });
  }
}

function createNewEvent() {
  toast("Event-Erstellung noch nicht implementiert", 3000);
  // TODO: Open modal to create new event
}
