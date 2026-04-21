export function normalizePhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export function normalizeWhatsAppPhone(value) {
  const digits = normalizePhoneDigits(value);

  if (!digits) {
    return "";
  }

  if (digits.startsWith("55")) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

export function isValidWhatsAppPhone(value) {
  const normalized = normalizeWhatsAppPhone(value);

  if (!normalized.startsWith("55")) {
    return false;
  }

  return normalized.length === 12 || normalized.length === 13;
}
