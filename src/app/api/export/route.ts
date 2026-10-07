import { type NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/dal";
import { isISODate } from "@/lib/format";
import { listAllRecords } from "@/lib/ledger";

/**
 * CSV export of the ledger (optionally filtered like /records). Opens cleanly in Excel:
 * UTF-8 BOM for Chinese, and any cell starting with = + - @ is prefixed with ' so it can't
 * run as a formula (CSV injection).
 */
function cell(value: string | number) {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const p = request.nextUrl.searchParams;
  const type = p.get("type");
  const q = (p.get("q") ?? "").toLowerCase();
  const from = isISODate(p.get("from") ?? "") ? p.get("from")! : "";
  const to = isISODate(p.get("to") ?? "") ? p.get("to")! : "";

  const records = (await listAllRecords()).filter((r) => {
    if ((type === "income" || type === "expense") && r.kind !== type) return false;
    if (from && r.date < from) return false;
    if (to && r.date > to) return false;
    if (q) {
      const text = r.kind === "income" ? [r.customer, r.paymentMethod, r.note, ...r.items.map((i) => i.service)] : [r.category, r.note];
      if (!text.join(" ").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const header = ["日期", "類型", "項目/分類", "客人", "付款方式", "實收/金額", "耗材成本", "折扣", "備註", "建立者", "建立時間", "ID"];
  const rows = records.map((r) =>
    r.kind === "income"
      ? [r.date, "收入", r.items.map((i) => i.service).join("、"), r.customer, r.paymentMethod, r.amount, r.cost, r.discount, r.note, r.createdBy, r.createdAt, r.id]
      : [r.date, "成本", r.category, "", "", r.amount, "", "", r.note, r.createdBy, r.createdAt, r.id],
  );
  const csv = "﻿" + [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="cinderella-ledger-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
