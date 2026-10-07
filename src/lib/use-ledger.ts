"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { DEMO_MODE, DEMO_USER } from "@/lib/demo";
import {
  type ExpenseRecord,
  getPickList,
  getShopName,
  type IncomeRecord,
  listExpenses,
  listIncome,
  listWishes,
  type Wish,
} from "@/lib/ledger";
import { getDataVersion, getUser, type SessionUser, subscribe } from "@/lib/session";

/** The signed-in user (or the demo user), re-rendering whenever the session changes. */
export function useSessionUser(): SessionUser | null {
  const user = useSyncExternalStore(subscribe, getUser, () => null);
  return DEMO_MODE ? DEMO_USER : user;
}

function useDataVersion() {
  return useSyncExternalStore(subscribe, getDataVersion, () => 0);
}

export interface LedgerData {
  income: IncomeRecord[];
  expenses: ExpenseRecord[];
  lists: { services: string[]; paymentMethods: string[]; expenseCategories: string[] };
  shopName: string;
}

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

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}

async function loadLedger(): Promise<LedgerData> {
  // Sequential on purpose: the first call creates any missing tabs and seeds the pick-lists.
  const services = await getPickList("services");
  const [income, expenses, paymentMethods, expenseCategories, shopName] = await Promise.all([
    listIncome(),
    listExpenses(),
    getPickList("paymentMethods"),
    getPickList("expenseCategories"),
    getShopName(),
  ]);
  return { income, expenses, lists: { services, paymentMethods, expenseCategories }, shopName };
}

export function useLedger() {
  return useSheetQuery(loadLedger);
}

async function loadWishes(user: SessionUser): Promise<Wish[]> {
  return listWishes(user.email);
}

export function useWishes() {
  return useSheetQuery(loadWishes);
}
