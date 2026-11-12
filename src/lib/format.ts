/* =========================================================================
   Helpers de formato · moneda COP, fechas y utilidades de texto
   ========================================================================= */

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
export function money(value: number): string { return cop.format(value); }

export const expenseMonths = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Devuelve el mes (nombre) a partir de una fecha "YYYY-MM-DD". */
export function expenseMonth(date: string): string {
  return expenseMonths[Number(String(date || "").slice(5, 7)) - 1] || "Sin mes";
}

/** Formatea "2026-08-01" o "2026-08-01T00:00:00.000Z" -> "1 ago 2026"
    (toma solo la parte de fecha; sin corrimiento de zona horaria). */
export function formatDate(iso: string): string {
  const [y, m, d] = String(iso || "").slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso || "—";
  return `${d} ${(expenseMonths[m - 1] || "").slice(0, 3).toLowerCase()} ${y}`;
}

/** Fecha local "YYYY-MM-DD" (no UTC: en Colombia, después de las 19:00 toISOString ya es el día siguiente). */
export function localDateISO(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Iniciales (máx. 2) para el avatar del usuario. */
export function initials(name: string | undefined | null): string {
  return String(name || "").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "—";
}

/* ---- Horizonte de crecimiento (modelo de tres horizontes) ---------------- */
export const growthHorizons: { value: string; label: string }[] = [
  { value: "H1", label: "Horizonte 1 · Núcleo (corto plazo)" },
  { value: "H2", label: "Horizonte 2 · Emergente (mediano plazo)" },
  { value: "H3", label: "Horizonte 3 · Disruptivo (largo plazo)" },
];

/** Etiqueta legible del horizonte de crecimiento a partir de su código (H1/H2/H3). */
export function growthHorizonLabel(value: string): string {
  return growthHorizons.find((h) => h.value === value)?.label ?? (value || "Sin horizonte");
}
