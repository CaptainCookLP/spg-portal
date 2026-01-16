import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.join(__dirname, "../../.env");

let cachedSettings = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 Minute

export function getPublicSettings() {
  const now = Date.now();
  
  if (cachedSettings && now - cacheTime < CACHE_TTL) {
    return cachedSettings;
  }
  
  cachedSettings = {
    siteTitle: process.env.SITE_TITLE || "Mitgliederportal",
    orgName: process.env.ORG_NAME || "",
    logoUrl: process.env.LOGO_URL || "",
    theme: {
      accent: process.env.ACCENT_COLOR || "#b91c1c",
      bg: process.env.BG_COLOR || "#f6f6f6",
      card: process.env.CARD_COLOR || "#ffffff",
      text: process.env.TEXT_COLOR || "#111827",
      muted: process.env.MUTED_COLOR || "#6b7280"
    },
    dsgvoUrl: process.env.DSGVO_URL || "",
    adminMenu: (process.env.ADMIN_MENU || "settings,smtp,system")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean),
    pwa: {
      name: process.env.PWA_NAME || "Mitgliederportal",
      shortName: process.env.PWA_SHORT_NAME || "Portal"
    }
  };
  
  cacheTime = now;
  return cachedSettings;
}

export function updateEnvFile(updates) {
  let content = "";
  
  if (fs.existsSync(ENV_PATH)) {
    content = fs.readFileSync(ENV_PATH, "utf8");
  }
  
  const lines = content.split(/\r?\n/);
  const keyToLineIdx = new Map();
  
  lines.forEach((line, i) => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) {
      keyToLineIdx.set(match[1], i);
    }
  });
  
  for (const [key, value] of Object.entries(updates)) {
    const safeValue = String(value ?? "");
    const needsQuotes = 
      safeValue.includes("\n") || 
      safeValue.includes(" ") || 
      safeValue.includes("#") || 
      safeValue.includes("=");
    
    const formatted = needsQuotes 
      ? `"${safeValue.replaceAll('"', '\\"')}"` 
      : safeValue;
    
    if (keyToLineIdx.has(key)) {
      lines[keyToLineIdx.get(key)] = `${key}=${formatted}`;
    } else {
      lines.push(`${key}=${formatted}`);
    }
    
    // Update process.env
    process.env[key] = String(value ?? "");
  }
  
  fs.writeFileSync(
    ENV_PATH, 
    lines.filter(Boolean).join("\n") + "\n", 
    "utf8"
  );
  
  // Cache invalidieren
  cachedSettings = null;
}

export function getAllSettings() {
  return {
    ...getPublicSettings(),
    smtp: {
      host: process.env.SMTP_HOST || "",
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
      user: process.env.SMTP_USER || "",
      pass: "", // Nie zurückgeben!
      fromName: process.env.SMTP_FROM_NAME || "",
      fromEmail: process.env.SMTP_FROM_EMAIL || ""
    },
    mailLayout: {
      headerHtml: process.env.EMAIL_HEADER_HTML || "",
      footerHtml: process.env.EMAIL_FOOTER_HTML || ""
    },
    adminMemberId: process.env.ADMIN_MEMBER_ID || ""
  };
}