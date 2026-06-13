/**
 * Formats a date into a human-readable string (e.g. "Jun 13, 2026").
 */
export function formatDate(
  value: Date | string | number,
  locale = "en-US",
): string {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
