import crypto from "crypto";
import fs from "fs";
import path from "path";
import { sqliteRun, sqliteGet, sqliteAll } from "../db/sqlite.js";
import { getPool } from "../db/mssql.js";
import { sendEmail } from "./emailService.js";
import { AppError } from "../middleware/errorHandler.js";

export async function getNotificationsForUser(email) {
  // Member-IDs für diese Email holen
  const pool = await getPool();
  const result = await pool
    .request()
    .input("email", email)
    .query(`
      SELECT MitgliedID
      FROM dbo.tbl_Mitglied
      WHERE Email = @email AND Geloescht = 0
    `);
  
  const memberIds = (result.recordset || []).map(r => String(r.MitgliedID));
  
  // Alle Benachrichtigungen
  const notifications = await sqliteAll(
    "SELECT * FROM notifications ORDER BY datetime(createdAt) DESC"
  );
  
  // Gelesene Status
  const reads = await sqliteAll(
    "SELECT notificationId, readAt FROM notification_reads WHERE email = ?",
    [email.toLowerCase()]
  );
  
  const readMap = new Map(reads.map(r => [r.notificationId, r.readAt]));
  
  // Filtern nach Targets
  const visible = notifications
    .map(n => ({
      id: n.id,
      title: n.title,
      bodyText: n.bodyText,
      bodyHtml: n.bodyHtml || "",
      createdAt: n.createdAt,
      createdBy: n.createdBy,
      sendEmail: !!n.sendEmail,
      targets: safeJsonParse(n.targetsJson, []),
      attachments: safeJsonParse(n.attachmentsJson, []),
      readAt: readMap.get(n.id) || null
    }))
    .filter(n => targetsMatch(n.targets, email, memberIds));
  
  const unreadCount = visible.filter(n => !n.readAt).length;
  
  return {
    unreadCount,
    items: visible
  };
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value || JSON.stringify(fallback));
  } catch (error) {
    console.error("Ungültiges JSON in Benachrichtigungen:", error);
    return fallback;
  }
}

function targetsMatch(targets, email, memberIds) {
  for (const t of targets) {
    if (t.type === "all") return true;
    if (t.type === "email" && String(t.value).toLowerCase() === email.toLowerCase()) {
      return true;
    }
    if (t.type === "mitglied_id" && memberIds.includes(String(t.value))) {
      return true;
    }
  }
  return false;
}

export async function markAsRead(notificationId, email) {
  await sqliteRun(
    `INSERT OR REPLACE INTO notification_reads (email, notificationId, readAt)
     VALUES (?, ?, ?)`,
    [email.toLowerCase(), notificationId, new Date().toISOString()]
  );
}

export async function createNotification(data) {
  const {
    title,
    bodyText,
    bodyHtml,
    sendEmail: shouldSendEmail,
    targets,
    attachments,
    createdBy
  } = data;
  
  if (!title || !targets || targets.length === 0) {
    throw new AppError("Titel und Targets erforderlich", 400);
  }
  
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await sqliteRun(
    `INSERT INTO notifications 
     (id, title, bodyText, bodyHtml, createdAt, createdBy, sendEmail, targetsJson, attachmentsJson)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      title,
      bodyText,
      bodyHtml || "",
      now,
      createdBy,
      shouldSendEmail ? 1 : 0,
      JSON.stringify(targets),
      JSON.stringify(attachments)
    ]
  );
  
  // Email versenden wenn gewünscht
  if (shouldSendEmail) {
    try {
      await sendNotificationEmails(id, title, bodyText, bodyHtml, targets, attachments);
    } catch (error) {
      console.error("Email-Versand fehlgeschlagen:", error);
      // Nicht abbrechen, Benachrichtigung wurde erstellt
    }
  }
  
  return id;
}

async function sendNotificationEmails(id, title, bodyText, bodyHtml, targets, attachments) {
  const pool = await getPool();
  
  // Emails aus Targets extrahieren
  const directEmails = targets
    .filter(t => t.type === "email")
    .map(t => String(t.value).trim())
    .filter(Boolean);
  
  const memberIds = targets
    .filter(t => t.type === "mitglied_id")
    .map(t => String(t.value).trim())
    .filter(Boolean);
  
  let memberEmails = [];
  
  if (memberIds.length > 0) {
    const params = memberIds.map((_, i) => `@id${i}`).join(", ");
    const request = pool.request();
    memberIds.forEach((id, i) => request.input(`id${i}`, id));
    
    const result = await request.query(`
      SELECT DISTINCT Email
      FROM dbo.tbl_Mitglied
      WHERE Geloescht = 0 AND MitgliedID IN (${params})
    `);
    
    memberEmails = (result.recordset || []).map(r => String(r.Email).trim()).filter(Boolean);
  }
  
  // Bei "all" alle Emails holen
  if (targets.some(t => t.type === "all")) {
    const result = await pool.request().query(`
      SELECT DISTINCT Email
      FROM dbo.tbl_Mitglied
      WHERE Geloescht = 0 AND Email IS NOT NULL AND Email != ''
    `);
    
    const allEmails = (result.recordset || []).map(r => String(r.Email).trim());
    memberEmails.push(...allEmails);
  }
  
  // Unique Emails
  const emails = [...new Set([...directEmails, ...memberEmails].map(e => e.toLowerCase()))];
  
  if (emails.length === 0) return;
  
  // HTML erstellen
  const mainHtml = bodyHtml || `<div style="white-space:pre-wrap">${escapeHtml(bodyText)}</div>`;
  
  const attList = attachments.length
    ? `<p><strong>Anhänge:</strong></p><ul>${attachments.map(a => `<li>${escapeHtml(a.name)}</li>`).join("")}</ul>`
    : "";
  
  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.6">
      <h2 style="margin:0 0 12px 0">${escapeHtml(title)}</h2>
      ${mainHtml}
      ${attList}
    </div>
  `;
  
  // Emails versenden
  for (const to of emails) {
    try {
      await sendEmail({
        to,
        subject: title,
        html
      });
    } catch (error) {
      console.error(`Email an ${to} fehlgeschlagen:`, error.message);
    }
  }
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

export async function deleteNotification(id) {
  // Anhänge löschen
  const notif = await sqliteGet("SELECT attachmentsJson FROM notifications WHERE id = ?", [id]);
  
  if (notif) {
    try {
      const attachments = JSON.parse(notif.attachmentsJson || "[]");
      for (const att of attachments) {
        const filename = att.url?.split("/uploads/")[1];
        if (filename) {
          const filepath = path.join(process.cwd(), "uploads", filename);
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
        }
      }
    } catch (error) {
      console.error("Fehler beim Löschen von Anhängen:", error);
    }
  }
  
  // DB Einträge löschen
  await sqliteRun("DELETE FROM notifications WHERE id = ?", [id]);
  await sqliteRun("DELETE FROM notification_reads WHERE notificationId = ?", [id]);
}
