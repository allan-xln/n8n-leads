export function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function normalizedIncludes(source, target) {
  const normalizedSource = normalizeText(source);
  const normalizedTarget = normalizeText(target);

  if (!normalizedSource || !normalizedTarget) {
    return false;
  }

  return normalizedSource.includes(normalizedTarget) || normalizedTarget.includes(normalizedSource);
}

export function uniqueCompactStrings(values = []) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}
