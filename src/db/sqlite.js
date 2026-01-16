import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "../../data");
const DB_PATH = path.join(DATA_DIR, "portal.db");

let db = null;

export function getDb() {
  return db;
}

export function sqliteRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

export function sqliteGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function sqliteAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export async function initSqlite() {
  // Data-Ordner erstellen
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  // Datenbank öffnen
  db = new sqlite3.Database(DB_PATH);
  
  // Tabellen erstellen
  await createTables();
  
  console.log(`✓ SQLite DB: ${DB_PATH}`);
}

async function createTables() {
  // Sessions
  await sqliteRun(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      memberId TEXT,
      abteilungId TEXT,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      lastSeenAt TEXT NOT NULL
    )
  `);
  
  await sqliteRun(`
    CREATE INDEX IF NOT EXISTS idx_sessions_email 
    ON sessions(email)
  `);
  
  await sqliteRun(`
    CREATE INDEX IF NOT EXISTS idx_sessions_expires 
    ON sessions(expiresAt)
  `);
  
  // Credentials
  await sqliteRun(`
    CREATE TABLE IF NOT EXISTS credentials (
      email TEXT PRIMARY KEY,
      passwordHash TEXT NOT NULL,
      salt TEXT NOT NULL,
      iterations INTEGER NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // Password Reset Tokens
  await sqliteRun(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      usedAt TEXT
    )
  `);

  await sqliteRun(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_email 
    ON password_reset_tokens(email)
  `);

  await sqliteRun(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_expires 
    ON password_reset_tokens(expiresAt)
  `);
  
  // Notifications
  await sqliteRun(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      bodyText TEXT NOT NULL,
      bodyHtml TEXT,
      createdAt TEXT NOT NULL,
      createdBy TEXT NOT NULL,
      sendEmail INTEGER NOT NULL DEFAULT 0,
      targetsJson TEXT NOT NULL,
      attachmentsJson TEXT NOT NULL DEFAULT '[]'
    )
  `);
  
  // Notification Reads
  await sqliteRun(`
    CREATE TABLE IF NOT EXISTS notification_reads (
      email TEXT NOT NULL,
      notificationId TEXT NOT NULL,
      readAt TEXT NOT NULL,
      PRIMARY KEY (email, notificationId)
    )
  `);
  
  // Events
  await sqliteRun(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT '',
      startsAt TEXT NOT NULL,
      priceCents INTEGER NOT NULL DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      imagePath TEXT,
      isPublic INTEGER NOT NULL DEFAULT 0,
      targetAll INTEGER NOT NULL DEFAULT 1,
      targetAbteilungId TEXT,
      targetMemberIdsJson TEXT NOT NULL DEFAULT '[]',
      createdBy TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);
  
  // Event Registrations
  await sqliteRun(`
    CREATE TABLE IF NOT EXISTS event_registrations (
      eventId TEXT NOT NULL,
      email TEXT NOT NULL,
      memberId TEXT,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      PRIMARY KEY (eventId, email)
    )
  `);
  
  // Polls
  await sqliteRun(`
    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      question TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);
  
  // Poll Options
  await sqliteRun(`
    CREATE TABLE IF NOT EXISTS poll_options (
      id TEXT PRIMARY KEY,
      pollId TEXT NOT NULL,
      text TEXT NOT NULL
    )
  `);
  
  // Poll Votes
  await sqliteRun(`
    CREATE TABLE IF NOT EXISTS poll_votes (
      pollId TEXT NOT NULL,
      email TEXT NOT NULL,
      optionId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      PRIMARY KEY (pollId, email)
    )
  `);
}

export async function closeSqlite() {
  if (db) {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          console.error("Fehler beim Schließen von SQLite:", err);
          reject(err);
        } else {
          console.log("✓ SQLite geschlossen");
          db = null;
          resolve();
        }
      });
    });
  }
}