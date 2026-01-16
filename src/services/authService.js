// ============================================================================
// AUTH SERVICE - Komplette Authentication Logic
// ============================================================================

import crypto from "crypto";
import { getPool } from "../db/mssql.js";
import { sqliteGet, sqliteRun, sqliteAll } from "../db/sqlite.js";
import { hashPassword, verifyPassword } from "../utils/crypto.js";
import { AppError } from "../middleware/errorHandler.js";

const ADMIN_MEMBER_ID = process.env.ADMIN_MEMBER_ID || "0000000002";
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 30);

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(email, memberId, abteilungId) {
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  
  await sqliteRun(
    `INSERT INTO sessions (token, email, memberId, abteilungId, expiresAt, createdAt, lastSeenAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      token,
      email.toLowerCase(),
      memberId,
      abteilungId,
      expiresAt.toISOString(),
      now.toISOString(),
      now.toISOString()
    ]
  );
  
  return { token, expiresAt };
}

export async function extendSession(token) {
  const now = new Date();
  const newExpiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  
  await sqliteRun(
    `UPDATE sessions 
     SET lastSeenAt = ?, expiresAt = ? 
     WHERE token = ?`,
    [now.toISOString(), newExpiresAt.toISOString(), token]
  );
  
  return newExpiresAt;
}

export async function deleteSession(token) {
  await sqliteRun(`DELETE FROM sessions WHERE token = ?`, [token]);
}

export async function cleanupExpiredSessions() {
  const result = await sqliteRun(
    `DELETE FROM sessions WHERE datetime(expiresAt) <= datetime('now')`
  );
  return result.changes || 0;
}

// ============================================================================
// LOGIN / AUTHENTICATION
// ============================================================================

async function validateEmailInSPG(email) {
  const pool = await getPool();
  
  const result = await pool
    .request()
    .input("email", email)
    .query(`
      SELECT COUNT(*) AS cnt
      FROM dbo.tbl_Mitglied
      WHERE Email = @email AND Geloescht = 0
    `);
  
  return (result.recordset?.[0]?.cnt ?? 0) > 0;
}

async function getMemberMeta(email) {
  const pool = await getPool();
  
  const result = await pool
    .request()
    .input("email", email)
    .query(`
      SELECT TOP 1 MitgliedID, Gruppen_Nr
      FROM dbo.tbl_Mitglied
      WHERE Email = @email AND Geloescht = 0
      ORDER BY MitgliedID
    `);
  
  const row = result.recordset?.[0];
  
  return {
    memberId: row?.MitgliedID ? String(row.MitgliedID) : null,
    abteilungId: row?.Gruppen_Nr ? String(row.Gruppen_Nr) : null
  };
}

export async function login(email, password) {
  if (!email || !password) {
    throw new AppError("Email und Passwort erforderlich", 400);
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // 1. Check ob Email in SPG existiert
  const emailExists = await validateEmailInSPG(normalizedEmail);
  if (!emailExists) {
    throw new AppError("Ungültige Anmeldedaten", 401);
  }
  
  // 2. Check ob lokales Passwort gesetzt ist
  const credential = await sqliteGet(
    `SELECT * FROM credentials WHERE email = ?`,
    [normalizedEmail]
  );
  
  if (!credential) {
    throw new AppError("Kein Passwort gesetzt. Bitte Admin kontaktieren.", 403);
  }
  
  // 3. Passwort verifizieren
  const isValid = verifyPassword(password, {
    hash: credential.passwordHash,
    salt: credential.salt,
    iterations: credential.iterations
  });
  
  if (!isValid) {
    throw new AppError("Ungültige Anmeldedaten", 401);
  }
  
  // 4. Member Metadaten holen
  const { memberId, abteilungId } = await getMemberMeta(normalizedEmail);
  
  // 5. Session erstellen
  const session = await createSession(normalizedEmail, memberId, abteilungId);
  
  return session;
}

export async function logout(token) {
  if (!token) return;
  await deleteSession(token);
}

// ============================================================================
// PASSWORD MANAGEMENT
// ============================================================================

export async function changePassword(email, oldPassword, newPassword) {
  if (!newPassword || newPassword.length < 8) {
    throw new AppError("Passwort muss mindestens 8 Zeichen haben", 400);
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  const existing = await sqliteGet(
    `SELECT * FROM credentials WHERE email = ?`,
    [normalizedEmail]
  );
  
  if (existing) {
    if (!oldPassword) {
      throw new AppError("Altes Passwort erforderlich", 400);
    }
    
    const isValid = verifyPassword(oldPassword, {
      hash: existing.passwordHash,
      salt: existing.salt,
      iterations: existing.iterations
    });
    
    if (!isValid) {
      throw new AppError("Altes Passwort falsch", 401);
    }
  }
  
  const { hash, salt, iterations } = hashPassword(newPassword);
  
  await sqliteRun(
    `INSERT OR REPLACE INTO credentials (email, passwordHash, salt, iterations, updatedAt)
     VALUES (?, ?, ?, ?, ?)`,
    [normalizedEmail, hash, salt, iterations, new Date().toISOString()]
  );
}

export async function resetPassword(email, newPassword) {
  if (!newPassword || newPassword.length < 8) {
    throw new AppError("Passwort muss mindestens 8 Zeichen haben", 400);
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  const emailExists = await validateEmailInSPG(normalizedEmail);
  if (!emailExists) {
    throw new AppError("Email nicht im System gefunden", 404);
  }
  
  const { hash, salt, iterations } = hashPassword(newPassword);
  
  await sqliteRun(
    `INSERT OR REPLACE INTO credentials (email, passwordHash, salt, iterations, updatedAt)
     VALUES (?, ?, ?, ?, ?)`,
    [normalizedEmail, hash, salt, iterations, new Date().toISOString()]
  );
}

// ============================================================================
// AUTHORIZATION
// ============================================================================

export async function isAdminEmail(email) {
  if (!email) return false;
  
  try {
    const pool = await getPool();
    
    const result = await pool
      .request()
      .input("email", email)
      .input("adminId", ADMIN_MEMBER_ID)
      .query(`
        SELECT TOP 1 
          MitgliedID, 
          Gruppen_Nr, 
          Sonstiges_1
        FROM dbo.tbl_Mitglied
        WHERE Email = @email AND Geloescht = 0
        ORDER BY MitgliedID
      `);
    
    const row = result.recordset?.[0];
    if (!row) return false;
    
    const byEnv = String(row.MitgliedID) === String(ADMIN_MEMBER_ID);
    const byFlag = String(row.Sonstiges_1 || "")
      .toLowerCase()
      .includes("admin");
    const byDept = String(row.Gruppen_Nr || "").trim() === "2";
    
    return byEnv || byFlag || byDept;
    
  } catch (error) {
    console.error("isAdminEmail Error:", error);
    return false;
  }
}

export async function canAccessMember(userEmail, targetMemberId) {
  try {
    const pool = await getPool();
    
    if (await isAdminEmail(userEmail)) {
      return true;
    }
    
    const result = await pool
      .request()
      .input("email", userEmail)
      .input("memberId", targetMemberId)
      .query(`
        SELECT COUNT(*) AS cnt
        FROM dbo.tbl_Mitglied
        WHERE Email = @email 
          AND MitgliedID = @memberId 
          AND Geloescht = 0
      `);
    
    return (result.recordset?.[0]?.cnt ?? 0) > 0;
    
  } catch (error) {
    console.error("canAccessMember Error:", error);
    return false;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export async function validateSession(token) {
  if (!token) return null;
  
  const session = await sqliteGet(
    `SELECT * FROM sessions 
     WHERE token = ? 
     AND datetime(expiresAt) > datetime('now')`,
    [token]
  );
  
  if (!session) return null;
  
  await extendSession(token);
  
  return {
    email: session.email,
    memberId: session.memberId,
    abteilungId: session.abteilungId,
    token: session.token
  };
}

export async function getActiveSessions(email) {
  const sessions = await sqliteAll(
    `SELECT token, createdAt, lastSeenAt, expiresAt
     FROM sessions
     WHERE email = ?
     AND datetime(expiresAt) > datetime('now')
     ORDER BY lastSeenAt DESC`,
    [email.toLowerCase()]
  );
  
  return sessions;
}

export async function revokeAllSessions(email) {
  const result = await sqliteRun(
    `DELETE FROM sessions WHERE email = ?`,
    [email.toLowerCase()]
  );
  
  return result.changes || 0;
}

// ============================================================================
// INIT & CLEANUP
// ============================================================================

let cleanupInterval = null;

export function startSessionCleanup() {
  if (cleanupInterval) return;
  
  cleanupExpiredSessions().then(count => {
    if (count > 0) {
      console.log(`✓ ${count} abgelaufene Sessions entfernt`);
    }
  });
  
  cleanupInterval = setInterval(async () => {
    try {
      const count = await cleanupExpiredSessions();
      if (count > 0) {
        console.log(`✓ ${count} abgelaufene Sessions entfernt`);
      }
    } catch (error) {
      console.error("Session Cleanup Error:", error);
    }
  }, 60 * 60 * 1000);
}

export function stopSessionCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}