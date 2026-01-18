/**
 * Events Page Logic
 * Loads and displays events with list and calendar views
 */

let state = {
  events: [],
  isAdmin: false,
  view: "list",
  calendarDate: new Date(),
  editingEventId: null
};

// DOM Elements
const $el = {
  list: $("eventList"),
  empty: $("eventsEmpty"),
  error: $("eventsError"),
  newEventBtn: $("btnNewEvent"),
  listView: $("listView"),
  calendarView: $("calendarView"),
  viewList: $("viewList"),
  viewCalendar: $("viewCalendar"),
  calendarGrid: $("calendarGrid"),
  calendarTitle: $("calendarTitle"),
  modal: $("eventModal"),
  modalTitle: $("eventModalTitle"),
  modalError: $("eventModalError")
};

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const isLoggedIn = await checkAuth();
    if (!isLoggedIn) return;

    state.isAdmin = appState.isAdmin || false;

    // Show new event button only for admins
    if (state.isAdmin) {
      $el.newEventBtn.style.display = "inline-block";
      $el.newEventBtn.addEventListener("click", () => openEventModal());
    }

    // View toggle
    $el.viewList.addEventListener("click", () => switchView("list"));
    $el.viewCalendar.addEventListener("click", () => switchView("calendar"));

    // Calendar navigation
    $("calPrev").addEventListener("click", () => navigateCalendar(-1));
    $("calNext").addEventListener("click", () => navigateCalendar(1));
    $("calToday").addEventListener("click", () => {
      state.calendarDate = new Date();
      renderCalendar();
    });

    // Modal events
    $("closeEventModal").addEventListener("click", closeEventModal);
    $("cancelEventModal").addEventListener("click", closeEventModal);
    $("saveEvent").addEventListener("click", saveEvent);
    $el.modal.addEventListener("click", (e) => {
      if (e.target === $el.modal) closeEventModal();
    });

    await loadEvents();
  } catch (error) {
    $el.error.textContent = "Fehler beim Laden der Events: " + error.message;
    console.error(error);
  }
});

function switchView(view) {
  state.view = view;
  $el.viewList.classList.toggle("active", view === "list");
  $el.viewCalendar.classList.toggle("active", view === "calendar");
  $el.listView.style.display = view === "list" ? "block" : "none";
  $el.calendarView.style.display = view === "calendar" ? "block" : "none";

  if (view === "calendar") {
    renderCalendar();
  }
}

function navigateCalendar(delta) {
  state.calendarDate.setMonth(state.calendarDate.getMonth() + delta);
  renderCalendar();
}

async function loadEvents() {
  try {
    const data = await api("/api/events");
    state.events = data.events || [];
    renderEvents();
    if (state.view === "calendar") {
      renderCalendar();
    }
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

  // Sort by date (upcoming first)
  const now = new Date();
  const sorted = [...state.events].sort((a, b) =>
    new Date(a.startsAt) - new Date(b.startsAt)
  );

  $el.list.innerHTML = sorted.map(event => {
    const eventDate = new Date(event.startsAt);
    const isPast = eventDate < now;

    return `
    <div class="event-card ${isPast ? "muted" : ""}" data-event-id="${event.id}">
      <div class="event-date">
        <div class="event-day">${eventDate.getDate()}</div>
        <div class="event-month">${eventDate.toLocaleString("de-DE", { month: "short" })}</div>
      </div>
      <div class="event-content">
        <h3>${escapeHtml(event.title)}</h3>
        <p class="muted">${fmtDate(event.startsAt)} ${eventDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr</p>
        ${event.location ? `<p>📍 ${escapeHtml(event.location)}</p>` : ""}
        ${event.price && event.price !== "0,00" ? `<p>💰 ${event.price} €</p>` : ""}
        ${state.isAdmin ? `
          <div class="event-actions">
            <button class="btn small" data-event-id="${event.id}" data-action="edit">Bearbeiten</button>
            <button class="btn small danger" data-event-id="${event.id}" data-action="delete">Löschen</button>
          </div>
        ` : ""}
      </div>
    </div>
  `;
  }).join("");

  // Add event listeners
  if (state.isAdmin) {
    $$("[data-action]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const eventId = btn.dataset.eventId;
        const action = btn.dataset.action;

        try {
          if (action === "delete") {
            if (!confirm("Event wirklich löschen?")) return;

            await api(`/api/events/${eventId}`, { method: "DELETE" });
            toast("Event gelöscht");
            await loadEvents();
          } else if (action === "edit") {
            openEventModal(eventId);
          }
        } catch (error) {
          toast("Fehler: " + error.message, 3000);
        }
      });
    });
  }
}

function renderCalendar() {
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();

  // Update title
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"];
  $el.calendarTitle.textContent = `${monthNames[month]} ${year}`;

  // Get first day of month and days in month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = (firstDay.getDay() + 6) % 7; // Monday = 0

  // Get events for this month
  const monthEvents = state.events.filter(e => {
    const d = new Date(e.startsAt);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  // Build calendar HTML
  let html = "";

  // Day headers
  const dayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  dayNames.forEach(day => {
    html += `<div class="calendar-day-header">${day}</div>`;
  });

  // Previous month days
  const prevMonth = new Date(year, month, 0);
  const prevDays = prevMonth.getDate();
  for (let i = startWeekday - 1; i >= 0; i--) {
    html += `<div class="calendar-day other-month">${prevDays - i}</div>`;
  }

  // Current month days
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = year === today.getFullYear() &&
      month === today.getMonth() &&
      day === today.getDate();

    const dayEvents = monthEvents.filter(e => {
      const d = new Date(e.startsAt);
      return d.getDate() === day;
    });

    const hasEvent = dayEvents.length > 0;

    html += `
      <div class="calendar-day ${isToday ? "today" : ""} ${hasEvent ? "has-event" : ""}" data-date="${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}">
        <span>${day}</span>
        ${dayEvents.length > 0 ? `
          <div class="calendar-event-dot"></div>
          <div class="calendar-event-preview">${escapeHtml(dayEvents[0].title)}</div>
        ` : ""}
      </div>
    `;
  }

  // Next month days
  const totalCells = startWeekday + daysInMonth;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="calendar-day other-month">${i}</div>`;
  }

  $el.calendarGrid.innerHTML = html;

  // Add click handlers for days with events
  $$(".calendar-day.has-event").forEach(day => {
    day.addEventListener("click", () => {
      const date = day.dataset.date;
      const dayEvents = state.events.filter(e => e.startsAt.startsWith(date));
      if (dayEvents.length === 1) {
        showEventDetails(dayEvents[0]);
      } else if (dayEvents.length > 1) {
        // Show list of events for that day
        toast(`${dayEvents.length} Events an diesem Tag`);
      }
    });
  });
}

function showEventDetails(event) {
  toast(event.title);
}

// Modal Functions
function openEventModal(eventId = null) {
  state.editingEventId = eventId;
  $el.modalError.textContent = "";

  if (eventId) {
    // Edit mode - load event data
    const event = state.events.find(e => e.id === eventId);
    if (event) {
      $el.modalTitle.textContent = "Event bearbeiten";
      $("eventTitle").value = event.title || "";
      $("eventLocation").value = event.location || "";
      $("eventPrice").value = event.price || "";
      $("eventDescription").value = event.description || "";
      $("eventVisibility").value = event.isPublic ? "public" : "all";

      // Format date for datetime-local input
      if (event.startsAt) {
        const d = new Date(event.startsAt);
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        $("eventDate").value = local.toISOString().slice(0, 16);
      }
    }
  } else {
    // Create mode
    $el.modalTitle.textContent = "Neuer Event";
    $("eventTitle").value = "";
    $("eventLocation").value = "";
    $("eventPrice").value = "";
    $("eventDescription").value = "";
    $("eventVisibility").value = "all";
    $("eventDate").value = "";
  }

  $el.modal.style.display = "flex";
  $("eventTitle").focus();
}

function closeEventModal() {
  $el.modal.style.display = "none";
  state.editingEventId = null;
}

async function saveEvent() {
  const title = $("eventTitle").value.trim();
  const startsAt = $("eventDate").value;
  const location = $("eventLocation").value.trim();
  const price = $("eventPrice").value.trim();
  const description = $("eventDescription").value.trim();
  const visibility = $("eventVisibility").value;

  // Validation
  if (!title) {
    $el.modalError.textContent = "Bitte Titel eingeben";
    return;
  }
  if (!startsAt) {
    $el.modalError.textContent = "Bitte Datum auswählen";
    return;
  }

  const eventData = {
    title,
    startsAt: new Date(startsAt).toISOString(),
    location,
    price,
    description,
    isPublic: visibility === "public" ? "1" : "0",
    targetAll: "1"
  };

  try {
    $("saveEvent").disabled = true;
    $("saveEvent").textContent = "Speichern...";

    if (state.editingEventId) {
      // Update
      await api(`/api/events/${state.editingEventId}`, {
        method: "PUT",
        body: eventData
      });
      toast("Event aktualisiert");
    } else {
      // Create
      await api("/api/events", {
        method: "POST",
        body: eventData
      });
      toast("Event erstellt");
    }

    closeEventModal();
    await loadEvents();
  } catch (error) {
    $el.modalError.textContent = error.message;
  } finally {
    $("saveEvent").disabled = false;
    $("saveEvent").textContent = "Event speichern";
  }
}
