/** Date and money helpers. The salon runs on Taiwan time regardless of where the server is. */

export const TIME_ZONE = "Asia/Taipei";

/** Today's date in Taiwan as YYYY-MM-DD. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

/** Current Taiwan timestamp as "YYYY-MM-DD HH:mm:ss" — readable in the spreadsheet. */
export function nowStamp(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

export function isISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function isISOMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function monthOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Six-week calendar grid (Sunday first) covering `month`, as ISO dates.
 * Leading/trailing days from neighbouring months are included so every row is full.
 */
export function calendarDays(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  const lastOfMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const weeks = Math.ceil((first.getUTCDay() + lastOfMonth) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

const ntd = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 });

export function formatNTD(amount: number): string {
  const rounded = Math.round(amount);
  return `${rounded < 0 ? "−" : ""}NT$${ntd.format(Math.abs(rounded))}`;
}

export function formatSigned(amount: number): string {
  const rounded = Math.round(amount);
  return `${rounded >= 0 ? "+" : "−"}${ntd.format(Math.abs(rounded))}`;
}

export function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${y} 年 ${Number(m)} 月`;
}

export function formatDateLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const weekday = "日一二三四五六"[d.getUTCDay()];
  return `${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日（${weekday}）`;
}
