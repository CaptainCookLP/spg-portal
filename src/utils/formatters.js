export function maskIban(iban) {
  const cleaned = String(iban || "").replace(/\s+/g, "");
  
  if (!cleaned) return "";
  
  if (cleaned.length <= 8) {
    return cleaned.replace(/.(?=.{2})/g, "•");
  }
  
  return cleaned.slice(0, 4) + "••••••••••" + cleaned.slice(-4);
}

export function maskBic(bic) {
  const cleaned = String(bic || "").replace(/\s+/g, "");
  
  if (!cleaned) return "";
  
  if (cleaned.length <= 4) return "••••";
  
  return cleaned.slice(0, 4) + "••••";
}

export function formatCurrency(cents) {
  const euros = (cents || 0) / 100;
  return euros.toFixed(2).replace(".", ",") + " €";
}

export function formatDate(dateStr) {
  if (!dateStr) return "-";
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return String(dateStr);
  
  return date.toLocaleDateString("de-DE");
}

export function formatDateTime(dateStr) {
  if (!dateStr) return "-";
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return String(dateStr);
  
  return date.toLocaleString("de-DE");
}