import dotenv from "dotenv";
dotenv.config();

export function getSmtpSettings() {
  return {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    fromName: process.env.SMTP_FROM_NAME || "Mitgliederportal",
    fromEmail: process.env.SMTP_FROM_EMAIL || ""
  };
}

export function getMailLayoutHtml() {
  return {
    headerHtml: process.env.EMAIL_HEADER_HTML || "",
    footerHtml: process.env.EMAIL_FOOTER_HTML || ""
  };
}

export function isSmtpConfigured() {
  const smtp = getSmtpSettings();
  return !!(smtp.host && smtp.user && smtp.pass && smtp.fromEmail);
}