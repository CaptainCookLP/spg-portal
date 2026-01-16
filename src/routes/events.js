import express from "express";
import { requireSession, requireAdmin } from "../middleware/auth.js";
import { validateEvent, validateId } from "../middleware/validation.js";
import {
  getVisibleEvents,
  getEventDetail,
  registerForEvent,
  voteInPoll,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventRegistrations
} from "../services/eventService.js";

export const eventRouter = express.Router();

// Liste (user)
eventRouter.get("/", requireSession, async (req, res, next) => {
  try {
    const events = await getVisibleEvents(req.user);
    res.json({ events });
  } catch (error) {
    next(error);
  }
});

// Detail
eventRouter.get("/:id", requireSession, validateId, async (req, res, next) => {
  try {
    const event = await getEventDetail(req.params.id, req.user);
    res.json(event);
  } catch (error) {
    next(error);
  }
});

// Registrierung
eventRouter.post("/:id/register", requireSession, validateId, async (req, res, next) => {
  try {
    const { name } = req.body;
    await registerForEvent(req.params.id, req.user, name);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Vote
eventRouter.post("/:id/vote", requireSession, validateId, async (req, res, next) => {
  try {
    const { optionId } = req.body;
    await voteInPoll(req.params.id, req.user.email, optionId);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Admin: Liste
eventRouter.get("/admin/all", requireAdmin, async (req, res, next) => {
  try {
    const events = await getAllEvents();
    res.json({ events });
  } catch (error) {
    next(error);
  }
});

// Admin: Erstellen
eventRouter.post("/", requireAdmin, validateEvent, async (req, res, next) => {
  try {
    const id = await createEvent(req.body, req.user.email);
    res.json({ ok: true, id });
  } catch (error) {
    next(error);
  }
});

// Admin: Aktualisieren
eventRouter.put("/:id", requireAdmin, validateId, validateEvent, async (req, res, next) => {
  try {
    await updateEvent(req.params.id, req.body);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Admin: Löschen
eventRouter.delete("/:id", requireAdmin, validateId, async (req, res, next) => {
  try {
    await deleteEvent(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Admin: Registrations
eventRouter.get("/:id/registrations", requireAdmin, validateId, async (req, res, next) => {
  try {
    const registrations = await getEventRegistrations(req.params.id);
    res.json({ registrations });
  } catch (error) {
    next(error);
  }
});

async function getAllEvents() {
  const { sqliteAll } = await import("../db/sqlite.js");
  const rows = await sqliteAll("SELECT * FROM events ORDER BY startsAt DESC");
  return rows.map(r => ({
    ...r,
    price: (r.priceCents / 100).toFixed(2).replace(".", ",")
  }));
}