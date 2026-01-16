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

export const profileRouter = express.Router();

// Family/Members laden
profileRouter.get("/family", requireSession, async (req, res, next) => {
  try {
    const members = await getMembersByEmail(req.user.email);
    const isAdmin = await isAdminEmail(req.user.email);
    const needsDsgvo = members.some(m => !m.DSGVOZugestimmt);
    
    res.json({
      email: req.user.email,
      isAdmin,
      needsDsgvo,
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