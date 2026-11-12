// FR-A2-32: wake the Render instance (and DB connection) before recording. Usage: APP_BASE_URL=https://... pnpm warm
const base = process.env.APP_BASE_URL;
if (!base) {
  console.error("APP_BASE_URL is required.");
  process.exit(1);
}
for (let i = 1; i <= 5; i++) {
  const t = Date.now();
  try {
    const r = await fetch(`${base}/api/audit?sessionId=warmup`);
    console.log(`try ${i}: HTTP ${r.status} in ${Date.now() - t}ms`);
    if (r.ok) process.exit(0);
  } catch (e) {
    console.log(`try ${i}: ${(e as Error).message}`);
  }
  await new Promise((r) => setTimeout(r, 5000));
}
process.exit(1);
