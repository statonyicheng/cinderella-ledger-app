import "server-only";

/**
 * Server-side configuration. Every value comes from the environment (`.env.local` locally,
 * the Vercel project settings in production) — nothing secret is ever committed.
 * See `.env.example` for what each one is and where to get it.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name} (see .env.example)`);
  }
  return value;
}

export const env = {
  get authSecret() {
    const secret = required("AUTH_SECRET");
    if (secret.length < 32) {
      throw new Error("AUTH_SECRET must be at least 32 characters (generate one with `openssl rand -base64 32`).");
    }
    return secret;
  },
  get googleOAuthClientId() {
    return required("GOOGLE_OAUTH_CLIENT_ID");
  },
  get googleOAuthClientSecret() {
    return required("GOOGLE_OAUTH_CLIENT_SECRET");
  },
  /** Public origin of the deployment, e.g. https://cinderella-ledger.vercel.app. Optional locally. */
  get appUrl() {
    return process.env.APP_URL?.replace(/\/$/, "");
  },
  /**
   * Lower-cased Gmail addresses allowed to sign in. Fails closed: an empty list lets nobody in.
   */
  get allowedEmails() {
    return (process.env.ALLOWED_EMAILS ?? "")
      .split(/[,\s]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  },
  get serviceAccountEmail() {
    return required("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  },
  /** Vercel and .env files store the key with literal "\n" sequences — restore real newlines. */
  get serviceAccountPrivateKey() {
    return required("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\\n/g, "\n");
  },
  get sheetId() {
    return required("GOOGLE_SHEET_ID");
  },
};
