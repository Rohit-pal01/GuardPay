// FR-A2-32: re-verify every env var name on the hosted URL's environment. Never prints values.
const REQUIRED = [
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "NEXT_PUBLIC_PAYPAL_CLIENT_ID",
  "PAYPAL_ENV",
  "CHANNEL3_API_KEY",
  "GEMINI_API_KEY",
  "GROQ_API_KEY",
  "LLM_MODEL",
  "DATABASE_URL",
  "APP_BASE_URL",
  "USE_MOCKS",
  "DEMO_MODE",
];
const missing = REQUIRED.filter((k) => !process.env[k]);
for (const k of REQUIRED)
  console.log(`${process.env[k] ? "set    " : "MISSING"} ${k}`);
if (process.env.PAYPAL_ENV && process.env.PAYPAL_ENV !== "sandbox") {
  console.error('PAYPAL_ENV must be "sandbox".');
  process.exit(1);
}
if (process.env.USE_MOCKS === "true")
  console.warn("warning: USE_MOCKS=true (mock PayPal in use).");
if (!process.env.DATABASE_URL)
  console.warn(
    "warning: no DATABASE_URL, audit log will NOT survive restarts.",
  );
process.exit(missing.length ? 1 : 0);
