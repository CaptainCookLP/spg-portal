import express from "express";
import { requireSession } from "../middleware/auth.js";
import {
  getMembersByEmail,
  updateDsgvoConsent,
  getBankDataMasked,
  getBankDataFull
} from "../services/memberService.js";
import { isAdminEmail } from "../services/authService.js";
import { AppError } from "../middleware/errorHandler.js";
import { sqliteGet, sqliteRun } from "../db/sqlite.js";

export const profileRouter = express.Router();

// Family/Members laden
profileRouter.get("/family", requireSession, async (req, res, next) => {
  try {
    const members = await getMembersByEmail(req.user.email);
    const isAdmin = await isAdminEmail(req.user.email);
    const needsDsgvo = members.some(m => !m.DSGVOZugestimmt);

    // Load user preferences
    const prefs = await sqliteGet(
      "SELECT darkMode FROM user_preferences WHERE email = ?",
      [req.user.email]
    );

    res.json({
      email: req.user.email,
      isAdmin,
      needsDsgvo,
      darkMode: prefs?.darkMode === 1,
      members
    });
  } catch (error) {
    next(error);
  }
});

// DSGVO Zustimmung
profileRouter.post("/dsgvo/consent", requireSession, async (req, res, next) => {
  try {
    const { memberIds } = req.body;
    
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      throw new AppError("Keine Mitglieder ausgewählt", 400);
    }
    
    await updateDsgvoConsent(req.user.email, memberIds);
    
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Bank-Daten (maskiert)
profileRouter.get("/bank/masked", requireSession, async (req, res, next) => {
  try {
    const data = await getBankDataMasked(req.user.email);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Bank-Daten (vollständig, mit Passwort)
profileRouter.post("/bank/reveal", requireSession, async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      throw new AppError("Passwort erforderlich", 400);
    }

    const data = await getBankDataFull(req.user.email, password);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// User Preferences - Update
profileRouter.put("/preferences", requireSession, async (req, res, next) => {
  try {
    const { darkMode } = req.body;

    await sqliteRun(
      `INSERT INTO user_preferences (email, darkMode, updatedAt)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(email) DO UPDATE SET
         darkMode = excluded.darkMode,
         updatedAt = excluded.updatedAt`,
      [req.user.email, darkMode ? 1 : 0]
    );

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Update Member Data
profileRouter.put("/member/:memberId", requireSession, async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const {
      vorname, nachname, strasse, plz, ort, email,
      abteilung, handy1, telPriv, telDienst, iban, bic
    } = req.body;

    // Verify member belongs to user
    const members = await getMembersByEmail(req.user.email);
    const member = members.find(m => m.id === memberId);

    if (!member) {
      throw new AppError("Mitglied nicht gefunden", 404);
    }

    // Update in MSSQL
    const { getPool } = await import("../db/mssql.js");
    const pool = await getPool();

    await pool
      .request()
      .input("memberId", memberId)
      .input("email", req.user.email)
      .input("vorname", vorname || "")
      .input("nachname", nachname || "")
      .input("strasse", strasse || "")
      .input("plz", plz || "")
      .input("ort", ort || "")
      .input("emailNew", email || "")
      .input("handy1", handy1 || "")
      .input("telPriv", telPriv || "")
      .input("telDienst", telDienst || "")
      .input("iban", iban || "")
      .input("bic", bic || "")
      .query(`
        UPDATE dbo.tbl_Mitglied
        SET
          Vorname = @vorname,
          Nachname = @nachname,
          Strasse = @strasse,
          PLZ = @plz,
          Ort = @ort,
          Email = @emailNew,
          Handy_1 = @handy1,
          Telefon_Privat = @telPriv,
          Telefon_Dienstlich = @telDienst,
          IBAN_Nr = @iban,
          BIC_Nr = @bic
        WHERE MitgliedID = @memberId
          AND Email = @email
          AND Geloescht = 0
      `);

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});