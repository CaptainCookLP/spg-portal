import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
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

// Rate Limiting
app.use("/api/", rateLimiter);

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

// SPA Fallback für Frontend-Routing
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Endpoint nicht gefunden" });
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
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