export function queueActionLabel(action, title) {
  const normalizedTitle = String(title).trim().replace(/\s+/g, " ");
  return normalizedTitle ? `${action}: ${normalizedTitle}` : action;
}