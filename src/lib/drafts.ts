"use client";

import { DEMO_MODE, DEMO_USER } from "@/lib/demo";
import { getUser } from "@/lib/session";

/**
 * Unsent 記一筆 forms, kept in this browser so closing the dialog by accident (or reloading the
 * page) never loses what was typed. One draft per slot: "new-income", "new-expense", or
 * "edit-<record id>". Drafts are per signed-in account, cleared when the record is saved and
 * when that account signs out, so the next person on a shared phone doesn't see them.
 *
 * Storage can be unavailable (private mode, full quota); then drafts silently don't persist.
 */

export type DraftValues = Record<string, string>;

const PREFIX = "cinderella-draft:";

function key(slot: string): string | null {
  const email = DEMO_MODE ? DEMO_USER.email : getUser()?.email;
  return email ? `${PREFIX}${email}:${slot}` : null;
}

export function readDraft(slot: string): DraftValues | null {
  const k = key(slot);
  if (!k) return null;
  try {
    const raw = window.localStorage.getItem(k);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as DraftValues) : null;
  } catch {
    return null;
  }
}

export function saveDraft(slot: string, form: HTMLFormElement) {
  const k = key(slot);
  if (!k) return;
  const values: DraftValues = {};
  new FormData(form).forEach((value, name) => {
    if (typeof value === "string") values[name] = value;
  });
  try {
    window.localStorage.setItem(k, JSON.stringify(values));
  } catch {
    // ignore
  }
}

export function clearDraft(slot: string) {
  const k = key(slot);
  if (!k) return;
  try {
    window.localStorage.removeItem(k);
  } catch {
    // ignore
  }
}

/** Remove every draft of one account (on sign-out). */
export function clearDraftsFor(email: string) {
  try {
    const mine = `${PREFIX}${email}:`;
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(mine)) window.localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}
