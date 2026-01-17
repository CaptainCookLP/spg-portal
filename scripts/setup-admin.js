/**
 * Setup Script - Setzt Initial-Admin Passwort
 * Nutzen: node scripts/setup-admin.js
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { initDatabase } from "../src/db/index.js";
import { hashPassword } from "../src/utils/crypto.js";
import { getPool } from "../src/db/mssql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function setupAdmin() {
  try {
    console.log("🔧 Initialisiere Admin-Setup...\n");
    
    // Datenbankverbindung herstellen
    const db = await initDatabase();
    console.log("✓ SQLite Datenbank initialisiert");
    
    // MSSQL-Verbindung herstellen
    const mssqlPool = await getPool();
    console.log("✓ MSSQL Verbindung hergestellt");
    
    const email = "fabian.koch1998@gmail.com";
    const password = "Start1234!";
    
    // 1. Prüfen ob Benutzer in MSSQL existiert
    const { sql } = await import("../src/db/mssql.js");
    const memberResult = await mssqlPool
      .request()
      .input("email", sql.VarChar, email)
      .query(`SELECT TOP 1 MitgliedID, Vorname, Nachname FROM dbo.tbl_Mitglied WHERE Email = @email AND Geloescht = 0`);
    
    if (memberResult.recordset.length === 0) {
      console.log("❌ Benutzer mit dieser Email nicht in MSSQL gefunden");
      process.exit(1);
    }
    
    const member = memberResult.recordset[0];
    console.log(`✓ Benutzer gefunden: ${member.Vorname} ${member.Nachname} (ID: ${member.MitgliedID})`);
    
    // 2. Passwort hashen
    const hashedPassword = await hashPassword(password);
    console.log("✓ Passwort gehasht");
    
    // 3. Credential in SQLite speichern oder updaten
    const { sqliteRun, sqliteGet } = await import("../src/db/sqlite.js");
    
    const existing = await sqliteGet(
      `SELECT * FROM credentials WHERE email = ?`,
      [email]
    );
    
    if (existing) {
      await sqliteRun(
        `UPDATE credentials SET passwordHash = ?, salt = ?, iterations = ?, updatedAt = ? WHERE email = ?`,
        [
          hashedPassword.hash,
          hashedPassword.salt,
          hashedPassword.iterations,
          new Date().toISOString(),
          email
        ]
      );
      console.log("✓ Passwort aktualisiert");
    } else {
      await sqliteRun(
        `INSERT INTO credentials (email, passwordHash, salt, iterations, updatedAt)
         VALUES (?, ?, ?, ?, ?)`,
        [
          email,
          hashedPassword.hash,
          hashedPassword.salt,
          hashedPassword.iterations,
          new Date().toISOString()
        ]
      );
      console.log("✓ Passwort erstellt");
    }
    
    console.log("\n✅ Setup abgeschlossen!\n");
    console.log("📊 Login-Daten:");
    console.log(`   📧 Email: ${email}`);
    console.log(`   🔑 Passwort: ${password}`);
    console.log("\n🌐 Jetzt kannst du dich anmelden unter: http://localhost:3000");
    
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Fehler:", error.message);
    console.error(error);
    process.exit(1);
  }
}

setupAdmin();
