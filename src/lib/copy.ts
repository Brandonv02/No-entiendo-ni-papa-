/** Frases de Papito, la mascota. Humor cercano, nunca burla. */
export const SLOGAN = "Hoy no entiendes nada. Mañana, un poquito menos.";

export const CORRECT = ["¡Eso, parce!", "¡Qué berraquera!", "¡Así se hace!", "¡Pura papa… digo, pura pro!", "¡Bien ahí, crack!", "¡Ese inglés va tomando forma!"];
export const WRONG = [
  "Casi, casi. Hasta Papito se equivoca.",
  "Uy, ni modo. Así se aprende.",
  "Tranqui: el error es parte del plan.",
  "Esa se nos escapó, pero ya la sabes.",
  "Sin drama. La próxima va.",
];
export const DONE_GOOD = ["¡Lección superada! Papito está orgulloso.", "¡Qué nivel! Ya entiendes un poquito más.", "¡Eso fue un golazo!"];
export const DONE_RETRY = ["Aún no la tienes, pero vas cerca. Repasa y vuelve a intentar.", "Falta poquito. Repite la lección y te sale."];

export function pick<T>(arr: readonly T[], n: number): T {
  return arr[Math.abs(n) % arr.length] as T;
}

export function greeting(hour: number): string {
  if (hour < 6) return "¡Madrugador!";
  if (hour < 12) return "¡Buenos días!";
  if (hour < 19) return "¡Buenas tardes!";
  return "¡Buenas noches!";
}

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  if (m < 1) return `${totalSeconds} s`;
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}
