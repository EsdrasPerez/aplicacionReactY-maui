/** Formatea en quetzales: Q1,234.50 (sin depender de Intl, igual en Android/iOS/web). */
export const moneda = (monto: number) => {
  const n = Number(monto) || 0;
  const [entera, decimales] = Math.abs(n).toFixed(2).split(".");
  const conMiles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${n < 0 ? "-" : ""}Q${conMiles}.${decimales}`;
};

/** Fecha corta dd/mm/aaaa hh:mm en hora local; vacío si no es válida. */
export const fechaCorta = (iso: string) => {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** Colores por estado de la orden (Pendiente / Despachada / Rechazada). */
export function colorEstado(estado: string): { fondo: string; texto: string } {
  const e = estado.toLowerCase();
  if (e.startsWith("despach") || e.startsWith("entreg")) return { fondo: "#e8f5e9", texto: "#1b5e20" };
  if (e.startsWith("rechaz") || e.startsWith("cancel")) return { fondo: "#fdecea", texto: "#b71c1c" };
  return { fondo: "#fff8e1", texto: "#8d6e00" }; // Pendiente u otro
}
