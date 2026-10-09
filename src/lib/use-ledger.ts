"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { DEMO_MODE, DEMO_USER } from "@/lib/demo";
import { type LedgerSnapshot, loadLedgerSnapshot } from "@/lib/ledger";
import { getDataVersion, getUser, type SessionUser, subscribe } from "@/lib/session";

/** The signed-in user (or the demo user), re-rendering whenever the session changes. */
export function useSessionUser(): SessionUser | null {
  const user = useSyncExternalStore(subscribe, getUser, () => null);
  return DEMO_MODE ? DEMO_USER : user;
}

function useDataVersion() {
  return useSyncExternalStore(subscribe, getDataVersion, () => 0);
}

export type LedgerData = LedgerSnapshot;

type Loadable<T> =
  | { status: "loading"; data?: T }
  | { status: "ready"; data: T }
  | { status: "error"; error: string; data?: T };

/**
 * Load something from the sheet once there is a user, and again after every write.
 * Keeps showing the previous data while a reload is in flight, so the page doesn't flash.
 */
function useSheetQuery<T>(load: (user: SessionUser) => Promise<T>): Loadable<T> & { retry: () => void } {
  const user = useSessionUser();
  const version = useDataVersion();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Loadable<T>>({ status: "loading" });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setState((prev) => ({ status: "loading", data: prev.data }));
    load(user)
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch((error: unknown) => {
        console.error("[ledger]", error);
        if (cancelled) return;
        setState((prev) => ({
          status: "error",
          error: error instanceof Error ? error.message : "讀取帳本時發生錯誤",
          data: prev.data,
        }));
      });
    return () => {
      cancelled = true;
    };
    // `load` is a module-level function per caller; user/version/attempt drive reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, version, attempt]);

  const retry = useCallback(() => {
    cached = null; // 再試一次 always asks Google afresh
    setAttempt((n) => n + 1);
  }, []);
  return { ...state, retry };
}

/**
 * The last ledger read, shared by every page. Switching between 月曆 / 紀錄 / 報表 / 設定 within
 * FRESH_MS reuses it instead of asking Google again (each person gets 60 reads a minute). Any
 * write in this browser bumps the data version, which skips the cache; changes made on another
 * phone show up once the cached copy is older than FRESH_MS.
 */
const FRESH_MS = 30_000;
let cached: { key: string; at: number; promise: Promise<LedgerData> } | null = null;

function loadLedger(user: SessionUser): Promise<LedgerData> {
  const key = `${user.email}#${getDataVersion()}`;
  if (cached && cached.key === key && Date.now() - cached.at < FRESH_MS) return cached.promise;
  const promise = loadLedgerSnapshot().catch((error: unknown) => {
    if (cached?.promise === promise) cached = null; // don't keep serving a failure
    throw error;
  });
  cached = { key, at: Date.now(), promise };
  return promise;
}

export function useLedger() {
  return useSheetQuery(loadLedger);
}
