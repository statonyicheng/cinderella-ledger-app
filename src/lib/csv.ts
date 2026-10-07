import type { LedgerRecord } from "@/lib/ledger";

/**
 * Cells starting with = + - @ are prefixed with ' so Excel never runs them as formulas
 * (CSV injection); quotes, commas and newlines are escaped.
 */
function cell(value: string | number) {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function recordsToCsv(records: LedgerRecord[]): string {
  const header = ["日期", "類型", "項目/分類", "客人", "美甲師", "付款方式", "實收/金額", "耗材成本", "折扣", "備註", "建立者", "建立時間", "ID"];
  const rows = records.map((r) =>
    r.kind === "income"
      ? [r.date, "收入", r.items.map((i) => i.service).join("、"), r.customer, r.artist, r.paymentMethod, r.amount, r.cost, r.discount, r.note, r.createdBy, r.createdAt, r.id]
      : [r.date, "成本", r.category, "", "", "", r.amount, "", "", r.note, r.createdBy, r.createdAt, r.id],
  );
  // BOM so Excel opens the Chinese text as UTF-8.
  return "﻿" + [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}

/** Save a CSV in the browser (no server involved). */
export function downloadCsv(records: LedgerRecord[], filename: string) {
  const blob = new Blob([recordsToCsv(records)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
