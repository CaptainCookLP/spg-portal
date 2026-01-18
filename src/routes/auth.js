import express from "express";
import { login, logout, changePassword, createPasswordResetToken, validatePasswordResetToken, completePasswordReset } from "../services/authService.js";
import { requireSession } from "../middleware/auth.js";
import { validateLogin, validatePasswordChange } from "../middleware/validation.js";
// import { loginRateLimiter } from "../middleware/rateLimiter.js"; // Currently disabled
import { sendPasswordResetEmail } from "../services/emailService.js";

export const authRouter = express.Router();

// Login
authRouter.post("/login", validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { token, expiresAt } = await login(email, password);
    
    const isHttps = process.env.BASE_URL?.startsWith("https://");
    const sessionDays = Number(process.env.SESSION_DAYS || 30);
    
    res.cookie("spg_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
      maxAge: sessionDays * 24 * 60 * 60 * 1000,
      path: "/"
    });
    
    res.json({ 
      ok: true,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Logout
authRouter.post("/logout", async (req, res, next) => {
  try {
    const token = req.cookies?.spg_session;
    
    if (token) {
      await logout(token);
    }
    
    res.clearCookie("spg_session");
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Password Change
authRouter.post(
  "/password/change",
  requireSession,
  validatePasswordChange,
  async (req, res, next) => {
    try {
      const { oldPassword, newPassword } = req.body;
      await changePassword(req.user.email, oldPassword, newPassword);
      
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }
);

// Session Info
authRouter.get("/session", requireSession, (req, res) => {
  res.json({
    email: req.user.email,
    memberId: req.user.memberId,
    abteilungId: req.user.abteilungId
  });
});

// Password Reset - Request
authRouter.post("/password/forgot", async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email erforderlich" });
    }
    
    try {
      const token = await createPasswordResetToken(email.trim().toLowerCase());
      
      // Send reset email
      const resetUrl = `${process.env.BASE_URL}/reset-password?token=${token}`;
      await sendPasswordResetEmail(email, resetUrl);
      
      res.json({ ok: true, message: "Passwort-Reset-Link wurde gesendet" });
    } catch (error) {
      // Security: Don't reveal if email exists or not
      res.json({ ok: true, message: "Passwort-Reset-Link wurde gesendet" });
    }
    
  } catch (error) {
    next(error);
  }
});

// Password Reset - Validate Token
authRouter.get("/password/reset/:token", async (req, res, next) => {
  try {
    const { token } = req.params;
    
    try {
      const email = await validatePasswordResetToken(token);
      res.json({ ok: true, email });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
    
  } catch (error) {
    next(error);
  }
});

// Password Reset - Complete
authRouter.post("/password/reset/:token", async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Passwort muss mindestens 8 Zeichen haben" });
    }
    
    const email = await completePasswordReset(token, password);
    
    res.json({ 
      ok: true,
      message: "Passwort erfolgreich geändert. Bitte melden Sie sich an.",
      email
    });
    
  } catch (error) {
    next(error);
  }
});