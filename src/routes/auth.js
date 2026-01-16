import express from "express";
import { login, logout, changePassword } from "../services/authService.js";
import { requireSession } from "../middleware/auth.js";
import { validateLogin, validatePasswordChange } from "../middleware/validation.js";
import { loginRateLimiter } from "../middleware/rateLimiter.js";

export const authRouter = express.Router();

// Login
authRouter.post("/login", loginRateLimiter, validateLogin, async (req, res, next) => {
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