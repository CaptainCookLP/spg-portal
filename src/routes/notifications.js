import express from "express";
import { requireSession, requireAdmin } from "../middleware/auth.js";
import { validateNotification, validateId } from "../middleware/validation.js";
import multer from "multer";
import path from "path";
import {
  getNotificationsForUser,
  markAsRead,
  createNotification,
  deleteNotification
} from "../services/notificationService.js";

export const notificationRouter = express.Router();

// Multer Setup für Datei-Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${Math.random().toString(16).slice(2)}_${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 15) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif"
    ];
    
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Nur PDF und Bilder erlaubt"));
    }
  }
});

// Liste laden
notificationRouter.get("/", requireSession, async (req, res, next) => {
  try {
    const result = await getNotificationsForUser(req.user.email);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Als gelesen markieren
notificationRouter.post("/:id/read", requireSession, validateId, async (req, res, next) => {
  try {
    await markAsRead(req.params.id, req.user.email);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Erstellen (Admin)
notificationRouter.post(
  "/",
  requireAdmin,
  upload.array("files", 10),
  async (req, res, next) => {
    try {
      const { title, bodyText, bodyHtml, sendEmail, targetsJson } = req.body;
      
      const targets = JSON.parse(targetsJson || "[]");
      
      const attachments = (req.files || []).map(f => ({
        name: f.originalname,
        mime: f.mimetype,
        size: f.size,
        url: `/uploads/${path.basename(f.path)}`
      }));
      
      const id = await createNotification({
        title,
        bodyText: bodyText || "",
        bodyHtml: bodyHtml || "",
        sendEmail: sendEmail === "true",
        targets,
        attachments,
        createdBy: req.user.email
      });
      
      res.json({ ok: true, id });
    } catch (error) {
      next(error);
    }
  }
);

// Löschen (Admin)
notificationRouter.delete("/:id", requireAdmin, validateId, async (req, res, next) => {
  try {
    await deleteNotification(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});