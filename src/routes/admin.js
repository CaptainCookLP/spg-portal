import express from "express";
import { requireAdmin } from "../middleware/auth.js";
import { getAllSettings, updateEnvFile } from "../config/settings.js";
import { sendTestEmail } from "../services/emailService.js";
import { searchMembers } from "../services/memberService.js";
import { AppError } from "../middleware/errorHandler.js";

export const adminRouter = express.Router();

// Settings laden
adminRouter.get("/settings", requireAdmin, async (req, res, next) => {
  try {
    const settings = getAllSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// Settings speichern
adminRouter.post("/settings", requireAdmin, async (req, res, next) => {
  try {
    const updates = {};
    const body = req.body;
    
    // Branding
    if (body.siteTitle !== undefined) updates.SITE_TITLE = body.siteTitle;
    if (body.orgName !== undefined) updates.ORG_NAME = body.orgName;
    if (body.logoUrl !== undefined) updates.LOGO_URL = body.logoUrl;
    if (body.dsgvoUrl !== undefined) updates.DSGVO_URL = body.dsgvoUrl;
    
    // Theme
    if (body.theme) {
      if (body.theme.accent) updates.ACCENT_COLOR = body.theme.accent;
      if (body.theme.bg) updates.BG_COLOR = body.theme.bg;
      if (body.theme.card) updates.CARD_COLOR = body.theme.card;
      if (body.theme.text) updates.TEXT_COLOR = body.theme.text;
      if (body.theme.muted) updates.MUTED_COLOR = body.theme.muted;
    }
    
    // Admin Menu
    if (Array.isArray(body.adminMenu)) {
      updates.ADMIN_MENU = body.adminMenu.join(",");
    }
    
    // SMTP
    if (body.smtp) {
      if (body.smtp.host !== undefined) updates.SMTP_HOST = body.smtp.host;
      if (body.smtp.port !== undefined) updates.SMTP_PORT = String(body.smtp.port);
      if (body.smtp.secure !== undefined) updates.SMTP_SECURE = String(body.smtp.secure);
      if (body.smtp.user !== undefined) updates.SMTP_USER = body.smtp.user;
      if (body.smtp.pass && body.smtp.pass.trim() !== "") {
        updates.SMTP_PASS = body.smtp.pass;
      }
      if (body.smtp.fromName !== undefined) updates.SMTP_FROM_NAME = body.smtp.fromName;
      if (body.smtp.fromEmail !== undefined) updates.SMTP_FROM_EMAIL = body.smtp.fromEmail;
    }
    
    // Mail Layout
    if (body.mailLayout) {
      if (body.mailLayout.headerHtml !== undefined) {
        updates.EMAIL_HEADER_HTML = body.mailLayout.headerHtml;
      }
      if (body.mailLayout.footerHtml !== undefined) {
        updates.EMAIL_FOOTER_HTML = body.mailLayout.footerHtml;
      }
    }
    
    updateEnvFile(updates);
    
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// SMTP Test
adminRouter.post("/smtp/test", requireAdmin, async (req, res, next) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      throw new AppError("Empfänger-Adresse fehlt", 400);
    }
    
    await sendTestEmail(to);
    
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Member Search
adminRouter.get("/members", requireAdmin, async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ items: [] });
    }
    
    const members = await searchMembers(q);
    res.json({ items: members });
  } catch (error) {
    next(error);
  }
});