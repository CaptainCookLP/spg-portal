import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Module imports
import { initDatabase } from "./src/db/index.js";
import { authRouter } from "./src/routes/auth.js";
import { profileRouter } from "./src/routes/profile.js";
import { notificationRouter } from "./src/routes/notifications.js";
import { adminRouter } from "./src/routes/admin.js";
import { eventRouter } from "./src/routes/events.js";
import { publicRouter } from "./src/routes/public.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
import { rateLimiter } from "./src/middleware/rateLimiter.js";
import { setupUploadDir } from "./src/utils/fileSystem.js";
import { startSessionCleanup } from "./src/services/authService.js";
import { validateSession } from "./src/services/authService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();

// Trust proxy (für NGINX)
app.set("trust proxy", 1);

// Middleware
app.use(cookieParser());
app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true, limit: "4mb" }));

// Rate Limiting (disabled for testing)
// app.use("/api/", rateLimiter);

// Static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api/public", publicRouter);
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/admin", adminRouter);
app.use("/api/events", eventRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============================================================================
// PAGE ROUTES mit Template-System
// ============================================================================

// Template-System Helper
function renderTemplate(templatePath, data = {}) {
  let html = fs.readFileSync(templatePath, "utf-8");
  
  // Einfacher Template-Replace ({{VARIABLE}})
  Object.keys(data).forEach(key => {
    html = html.replace(new RegExp(`{{${key}}}`, "g"), data[key] || "");
  });
  
  return html;
}

// Login Page (Public)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "login.html"));
});

// Protected Pages - Require Session
const requireAuthPage = async (req, res, next) => {
  const token = req.cookies?.spg_session;
  const user = await validateSession(token);
  
  if (!user) {
    return res.redirect("/");
  }
  
  req.user = user;
  next();
};

// Profil Page
app.get("/profil", requireAuthPage, (req, res) => {
  const html = renderTemplate(path.join(__dirname, "public", "pages", "profil.html"), {
    USER_EMAIL: req.user.email
  });
  res.send(html);
});

// Benachrichtigungen Page
app.get("/benachrichtigungen", requireAuthPage, (req, res) => {
  const html = renderTemplate(path.join(__dirname, "public", "pages", "benachrichtigungen.html"), {
    USER_EMAIL: req.user.email
  });
  res.send(html);
});

// Passwort Page
app.get("/passwort", requireAuthPage, (req, res) => {
  const html = renderTemplate(path.join(__dirname, "public", "pages", "passwort.html"), {
    USER_EMAIL: req.user.email
  });
  res.send(html);
});

// Admin Page
app.get("/admin", requireAuthPage, async (req, res) => {
  // Check if admin
  const { isAdminEmail } = await import("./src/services/authService.js");
  const isAdmin = await isAdminEmail(req.user.email);
  
  if (!isAdmin) {
    return res.status(403).send("Keine Berechtigung");
  }
  
  const html = renderTemplate(path.join(__dirname, "public", "pages", "admin.html"), {
    USER_EMAIL: req.user.email
  });
  res.send(html);
});

// Events Page
app.get("/events", requireAuthPage, (req, res) => {
  const html = renderTemplate(path.join(__dirname, "public", "pages", "events.html"), {
    USER_EMAIL: req.user.email
  });
  res.send(html);
});

// Mitgliedskarte Page
app.get("/mitgliedskarte", requireAuthPage, (req, res) => {
  const html = renderTemplate(path.join(__dirname, "public", "pages", "mitgliedskarte.html"), {
    USER_EMAIL: req.user.email
  });
  res.send(html);
});

// Reset Password Page (Public)
app.get("/reset-password", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "reset-password.html"));
});

// Verify Page (Public)
app.get("/verify", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "verify.html"));
});

// Error Handler (muss am Ende sein)
app.use(errorHandler);

// Server starten
const PORT = Number(process.env.PORT || 3000);

(async () => {
  try {
    console.log("🚀 Starte Server...");
    
    // Ordner erstellen
    await setupUploadDir();
    console.log("✓ Upload-Verzeichnis bereit");
    
    // Datenbank initialisieren
    await initDatabase();
    console.log("✓ Datenbank initialisiert");
    
    // Session Cleanup starten
    startSessionCleanup();
    console.log("✓ Session Cleanup aktiv");
    
    // Server starten
    app.listen(PORT, () => {
      console.log(`✓ Server läuft auf Port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`✓ Base URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
      console.log("\n🎉 Portal bereit!\n");
    });
  } catch (error) {
    console.error("❌ Fehler beim Starten:", error);
    process.exit(1);
  }
})();

// Graceful Shutdown
const shutdown = async (signal) => {
  console.log(`\n${signal} empfangen, fahre herunter...`);
  
  try {
    const { closeDatabases } = await import("./src/db/index.js");
    const { stopSessionCleanup } = await import("./src/services/authService.js");
    
    stopSessionCleanup();
    await closeDatabases();
    
    console.log("✓ Sauberes Herunterfahren abgeschlossen");
    process.exit(0);
  } catch (error) {
    console.error("Fehler beim Herunterfahren:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));