// `npm run demo` — start the dev server in demo mode (in-memory ledger, auto sign-in).
// Works the same on Windows, macOS and Linux, unlike `NEXT_PUBLIC_LEDGER_DEMO=1 next dev` in a package script.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const port = process.argv[2] ?? "3100";

const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "-p", port], {
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_LEDGER_DEMO: "1" },
});
child.on("exit", (code) => process.exit(code ?? 0));
