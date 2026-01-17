import express from "express";
import { getPublicSettings } from "../config/settings.js";
import { getPool } from "../db/mssql.js";
import { sqliteGet } from "../db/sqlite.js";

export const publicRouter = express.Router();

publicRouter.get("/settings", (req, res) => {
  res.json(getPublicSettings());
});

publicRouter.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0"
  });
});

// DEBUG ENDPOINTS
publicRouter.get("/debug/env", (req, res) => {
  res.json({
    TEST_EMAIL: process.env.TEST_EMAIL || "NOT SET",
    TEST_EMAIL_NORMALIZED: (process.env.TEST_EMAIL || "").toLowerCase().trim(),
    REQUIRE_PASSWORD: process.env.REQUIRE_PASSWORD,
    DB_SERVER: process.env.DB_SERVER,
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV
  });
});

publicRouter.post("/debug/validate-email", async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    if (!email) return res.status(400).json({ error: "Email required" });

    const pool = await getPool();
    const result = await pool
      .request()
      .input("email", email)
      .query(`
        SELECT MitgliedID, Vorname, Nachname, Email, Geloescht
        FROM dbo.tbl_Mitglied
        WHERE Email = @email
      `);

    const exists = result.recordset.length > 0;
    res.json({
      email,
      exists,
      details: exists ? result.recordset[0] : null
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

publicRouter.post("/debug/credentials", async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    if (!email) return res.status(400).json({ error: "Email required" });

    const credential = await sqliteGet(
      `SELECT email, passwordHash FROM credentials WHERE email = ?`,
      [email]
    );

    res.json({
      email,
      found: !!credential,
      hash: credential?.passwordHash ? credential.passwordHash.substring(0, 50) : null
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});