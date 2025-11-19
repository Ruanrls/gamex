/**
 * Formats an ISO date string to Brazilian Portuguese format
 *
 * @param dateString - ISO 8601 date string (e.g., "2024-01-15T10:30:00Z")
 * @param includeTime - Whether to include time in the output (default: false)
 * @returns Formatted date string in pt-BR locale
 *
 * @example
 * ```typescript
 * formatDate("2024-01-15T10:30:00Z") // "15 de janeiro de 2024"
 * formatDate("2024-01-15T10:30:00Z", true) // "15 de janeiro de 2024 às 10:30"
 * ```
 */
export function formatDate(dateString: string, includeTime = false): string {
  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return "Data inválida";
    }

    if (includeTime) {
      return date.toLocaleString("pt-BR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Data inválida";
  }
}

/**
 * Formats a date to a short format (DD/MM/YYYY)
 *
 * @param dateString - ISO 8601 date string
 * @returns Short formatted date string
 *
 * @example
 * ```typescript
 * formatDateShort("2024-01-15T10:30:00Z") // "15/01/2024"
 * ```
 */
export function formatDateShort(dateString: string): string {
  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return "Data inválida";
    }

    return date.toLocaleDateString("pt-BR");
  } catch {
    return "Data inválida";
  }
}
