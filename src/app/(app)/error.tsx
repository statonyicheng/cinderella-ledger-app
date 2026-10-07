"use client";

/**
 * Most failures here are configuration (missing env vars, sheet not shared with the service
 * account) or Google being briefly unreachable — say so plainly instead of a blank page.
 */
export default function LedgerError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-lg p-6 text-center">
      <h1 className="text-xl">暫時讀不到帳本</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        系統連不上 Google Sheet。常見原因：環境變數還沒設定好，或試算表還沒分享給服務帳號。
        請稍後再試，或把下面的錯誤代碼提供給維護的人。
      </p>
      {error.digest ? <p className="mt-3 font-mono text-xs text-ink-muted">錯誤代碼：{error.digest}</p> : null}
      <button type="button" onClick={reset} className="btn btn-primary mt-5">
        重新載入
      </button>
    </div>
  );
}
