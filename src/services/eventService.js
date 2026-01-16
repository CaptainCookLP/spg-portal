import crypto from "crypto";
import { sqliteRun, sqliteGet, sqliteAll } from "../db/sqlite.js";
import { AppError } from "../middleware/errorHandler.js";

function centsFromPrice(priceStr) {
  const v = String(priceStr || "").replace(",", ".").trim();
  if (!v) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function priceFromCents(cents) {
  return ((cents || 0) / 100).toFixed(2).replace(".", ",");
}

async function canSeeEvent(event, user) {
  if (!event) return false;
  
  // Öffentlich
  if (Number(event.isPublic) === 1) return true;
  
  // Nicht eingeloggt
  if (!user) return false;
  
  // Für alle
  if (Number(event.targetAll) === 1) return true;
  
  // Abteilung
  if (event.targetAbteilungId && user.abteilungId) {
    if (String(event.targetAbteilungId) === String(user.abteilungId)) {
      return true;
    }
  }
  
  // Spezifische MemberIDs
  if (event.targetMemberIdsJson && user.memberId) {
    try {
      const ids = JSON.parse(event.targetMemberIdsJson);
      if (ids.map(String).includes(String(user.memberId))) {
        return true;
      }
    } catch {}
  }
  
  return false;
}

export async function getVisibleEvents(user) {
  const events = await sqliteAll("SELECT * FROM events ORDER BY startsAt DESC");
  
  const visible = [];
  for (const ev of events) {
    if (await canSeeEvent(ev, user)) {
      visible.push({
        id: ev.id,
        title: ev.title,
        location: ev.location,
        startsAt: ev.startsAt,
        price: priceFromCents(ev.priceCents),
        imageUrl: ev.imagePath ? `/uploads/${ev.imagePath}` : "",
        isPublic: !!Number(ev.isPublic)
      });
    }
  }
  
  return visible;
}

export async function getEventDetail(eventId, user) {
  const event = await sqliteGet("SELECT * FROM events WHERE id = ?", [eventId]);
  
  if (!event) {
    throw new AppError("Termin nicht gefunden", 404);
  }
  
  if (!(await canSeeEvent(event, user))) {
    throw new AppError("Kein Zugriff", 403);
  }
  
  // Poll laden
  const poll = await sqliteGet("SELECT * FROM polls WHERE eventId = ?", [eventId]);
  let pollData = null;
  
  if (poll) {
    const options = await sqliteAll("SELECT * FROM poll_options WHERE pollId = ?", [poll.id]);
    
    let vote = null;
    if (user?.email) {
      vote = await sqliteGet(
        "SELECT * FROM poll_votes WHERE pollId = ? AND email = ?",
        [poll.id, user.email.toLowerCase()]
      );
    }
    
    pollData = {
      id: poll.id,
      question: poll.question,
      options: options.map(o => ({ id: o.id, text: o.text })),
      votedOptionId: vote?.optionId || null
    };
  }
  
  // Registrierung
  let registration = null;
  if (user?.email) {
    registration = await sqliteGet(
      "SELECT * FROM event_registrations WHERE eventId = ? AND email = ?",
      [eventId, user.email.toLowerCase()]
    );
  }
  
  return {
    id: event.id,
    title: event.title,
    location: event.location,
    startsAt: event.startsAt,
    price: priceFromCents(event.priceCents),
    description: event.description,
    imageUrl: event.imagePath ? `/uploads/${event.imagePath}` : "",
    isPublic: !!Number(event.isPublic),
    targetAll: !!Number(event.targetAll),
    targetAbteilungId: event.targetAbteilungId || "",
    targetMemberIds: (() => {
      try {
        return JSON.parse(event.targetMemberIdsJson || "[]");
      } catch {
        return [];
      }
    })(),
    poll: pollData,
    registration: registration
      ? { name: registration.name, createdAt: registration.createdAt }
      : null
  };
}

export async function registerForEvent(eventId, user, name) {
  const event = await sqliteGet("SELECT * FROM events WHERE id = ?", [eventId]);
  
  if (!event) {
    throw new AppError("Termin nicht gefunden", 404);
  }
  
  if (!(await canSeeEvent(event, user))) {
    throw new AppError("Kein Zugriff", 403);
  }
  
  const displayName = (name || user.email || "").trim();
  
  await sqliteRun(
    `INSERT OR REPLACE INTO event_registrations 
     (eventId, email, memberId, name, createdAt)
     VALUES (?, ?, ?, ?, ?)`,
    [
      eventId,
      user.email.toLowerCase(),
      user.memberId,
      displayName,
      new Date().toISOString()
    ]
  );
}

export async function voteInPoll(eventId, email, optionId) {
  const poll = await sqliteGet("SELECT * FROM polls WHERE eventId = ?", [eventId]);
  
  if (!poll) {
    throw new AppError("Keine Abstimmung vorhanden", 404);
  }
  
  const option = await sqliteGet(
    "SELECT * FROM poll_options WHERE id = ? AND pollId = ?",
    [optionId, poll.id]
  );
  
  if (!option) {
    throw new AppError("Ungültige Option", 400);
  }
  
  await sqliteRun(
    `INSERT OR REPLACE INTO poll_votes (pollId, email, optionId, createdAt)
     VALUES (?, ?, ?, ?)`,
    [poll.id, email.toLowerCase(), optionId, new Date().toISOString()]
  );
}

export async function createEvent(data, createdBy) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const event = {
    id,
    title: String(data.title || "").trim(),
    location: String(data.location || "").trim(),
    startsAt: String(data.startsAt || "").trim(),
    priceCents: centsFromPrice(data.price),
    description: String(data.description || "").trim(),
    imagePath: null,
    isPublic: String(data.isPublic) === "1" ? 1 : 0,
    targetAll: String(data.targetAll) === "1" ? 1 : 0,
    targetAbteilungId: String(data.targetAbteilungId || "").trim() || null,
    targetMemberIdsJson: String(data.targetMemberIdsJson || "[]"),
    createdBy,
    createdAt: now,
    updatedAt: now
  };
  
  if (!event.title || !event.startsAt) {
    throw new AppError("Titel und Datum erforderlich", 400);
  }
  
  await sqliteRun(
    `INSERT INTO events 
     (id, title, location, startsAt, priceCents, description, imagePath, 
      isPublic, targetAll, targetAbteilungId, targetMemberIdsJson, 
      createdBy, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.id, event.title, event.location, event.startsAt,
      event.priceCents, event.description, event.imagePath,
      event.isPublic, event.targetAll, event.targetAbteilungId,
      event.targetMemberIdsJson, event.createdBy, event.createdAt, event.updatedAt
    ]
  );
  
  // Poll erstellen
  if (data.pollQuestion && data.pollOptions) {
    const pollId = crypto.randomUUID();
    await sqliteRun(
      "INSERT INTO polls (id, eventId, question, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
      [pollId, id, data.pollQuestion, now, now]
    );
    
    const options = String(data.pollOptions)
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 20);
    
    for (const text of options) {
      await sqliteRun(
        "INSERT INTO poll_options (id, pollId, text) VALUES (?, ?, ?)",
        [crypto.randomUUID(), pollId, text]
      );
    }
  }
  
  return id;
}

export async function updateEvent(eventId, data) {
  const existing = await sqliteGet("SELECT * FROM events WHERE id = ?", [eventId]);
  
  if (!existing) {
    throw new AppError("Termin nicht gefunden", 404);
  }
  
  await sqliteRun(
    `UPDATE events SET
      title = ?, location = ?, startsAt = ?, priceCents = ?,
      description = ?, isPublic = ?, targetAll = ?,
      targetAbteilungId = ?, targetMemberIdsJson = ?, updatedAt = ?
     WHERE id = ?`,
    [
      String(data.title || existing.title).trim(),
      String(data.location ?? existing.location).trim(),
      String(data.startsAt || existing.startsAt).trim(),
      centsFromPrice(data.price ?? priceFromCents(existing.priceCents)),
      String(data.description ?? existing.description).trim(),
      String(data.isPublic ?? existing.isPublic) === "1" ? 1 : 0,
      String(data.targetAll ?? existing.targetAll) === "1" ? 1 : 0,
      String((data.targetAbteilungId ?? existing.targetAbteilungId) || "").trim() || null,
      String((data.targetMemberIdsJson ?? existing.targetMemberIdsJson) || "[]"),
      new Date().toISOString(),
      eventId
    ]
  );
  
  // Poll aktualisieren wenn angegeben
  if (data.pollQuestion && data.pollOptions) {
    const poll = await sqliteGet("SELECT * FROM polls WHERE eventId = ?", [eventId]);
    
    if (poll) {
      await sqliteRun("DELETE FROM poll_options WHERE pollId = ?", [poll.id]);
      await sqliteRun("DELETE FROM poll_votes WHERE pollId = ?", [poll.id]);
      await sqliteRun("UPDATE polls SET question = ?, updatedAt = ? WHERE id = ?", [
        data.pollQuestion,
        new Date().toISOString(),
        poll.id
      ]);
    } else {
      const pollId = crypto.randomUUID();
      const now = new Date().toISOString();
      await sqliteRun(
        "INSERT INTO polls (id, eventId, question, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
        [pollId, eventId, data.pollQuestion, now, now]
      );
    }
    
    const pollId = poll?.id || (await sqliteGet("SELECT id FROM polls WHERE eventId = ?", [eventId]))?.id;
    
    const options = String(data.pollOptions)
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 20);
    
    for (const text of options) {
      await sqliteRun(
        "INSERT INTO poll_options (id, pollId, text) VALUES (?, ?, ?)",
        [crypto.randomUUID(), pollId, text]
      );
    }
  }
}

export async function deleteEvent(eventId) {
  const poll = await sqliteGet("SELECT * FROM polls WHERE eventId = ?", [eventId]);
  
  if (poll) {
    await sqliteRun("DELETE FROM poll_votes WHERE pollId = ?", [poll.id]);
    await sqliteRun("DELETE FROM poll_options WHERE pollId = ?", [poll.id]);
    await sqliteRun("DELETE FROM polls WHERE id = ?", [poll.id]);
  }
  
  await sqliteRun("DELETE FROM event_registrations WHERE eventId = ?", [eventId]);
  await sqliteRun("DELETE FROM events WHERE id = ?", [eventId]);
}

export async function getEventRegistrations(eventId) {
  const registrations = await sqliteAll(
    "SELECT * FROM event_registrations WHERE eventId = ? ORDER BY createdAt DESC",
    [eventId]
  );
  
  return registrations;
}