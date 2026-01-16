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