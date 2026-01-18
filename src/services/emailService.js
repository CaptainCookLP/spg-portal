import nodemailer from "nodemailer";
import { getSmtpSettings, getMailLayoutHtml, isSmtpConfigured } from "../config/email.js";
import { AppError } from "../middleware/errorHandler.js";

function stripHtml(html) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function sendEmail({ to, subject, html, text, attachments = [] }) {
  if (!isSmtpConfigured()) {
    throw new AppError("SMTP nicht konfiguriert", 500);
  }
  
  const smtp = getSmtpSettings();
  const layout = getMailLayoutHtml();
  
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass
    }
  });
  
  const fullHtml = `
    ${layout.headerHtml || ""}
    ${html}
    ${layout.footerHtml || ""}
  `;
  
  await transporter.sendMail({
    from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
    to,
    subject,
    text: text || stripHtml(fullHtml),
    html: fullHtml,
    attachments
  });
}

export async function sendTestEmail(to) {
  const html = `
    <div style="font-family:system-ui,sans-serif;padding:20px">
      <h2>SMTP Test</h2>
      <p>Dies ist eine Testmail vom Mitgliederportal.</p>
      <p><small>Gesendet am: ${new Date().toLocaleString("de-DE")}</small></p>
    </div>
  `;
  
  await sendEmail({
    to,
    subject: "SMTP Test – Mitgliederportal",
    html
  });
}

export async function sendPasswordResetEmail(to, resetUrl) {
  const orgName = process.env.ORG_NAME || "Mitgliederportal";
  
  const html = `
    <div style="font-family:system-ui,sans-serif;padding:20px;max-width:600px">
      <h2>Passwort zurücksetzen</h2>
      <p>Hallo,</p>
      <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts im ${orgName} gestellt.</p>
      
      <p style="margin-top:30px">
        <a href="${escapeHtml(resetUrl)}" 
           style="display:inline-block;background-color:#b91c1c;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold">
          Passwort zurücksetzen
        </a>
      </p>
      
      <p style="color:#666;font-size:14px;margin-top:20px">
        Dieser Link ist 24 Stunden gültig.
      </p>
      
      <p style="color:#999;font-size:12px;margin-top:20px">
        Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.
      </p>
      
      <hr style="border:none;border-top:1px solid #eee;margin:30px 0">
      <p style="color:#999;font-size:12px">
        <small>Gesendet am: ${new Date().toLocaleString("de-DE")}</small>
      </p>
    </div>
  `;
  
  await sendEmail({
    to,
    subject: `${orgName} – Passwort zurücksetzen`,
    html
  });
}

function escapeHtml(str) {
  const chars = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  };
  return String(str).replace(/[&<>"']/g, char => chars[char]);
}