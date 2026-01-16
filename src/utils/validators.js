export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(String(email).toLowerCase());
}

export function isValidPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

export function isValidDate(dateStr) {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

export function sanitizeFilename(filename) {
  return String(filename || "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 255);
}

export function sanitizeHtml(html) {
  // Basic sanitization - in Production use DOMPurify
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "");
}