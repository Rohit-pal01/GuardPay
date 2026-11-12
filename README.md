# GuardPay: Safe Agentic Commerce with PayPal

> **Tell an AI agent what to buy.** It searches real products, ranks them, explains why, and pays through PayPal **only** inside strict limits you set (your Mandate), or after you tap approve[span_0](start_span)[span_0](end_span).

---

## 🚀 The Core Differentiator
**The LLM proposes, but code disposes[span_1](start_span)[span_1](end_span).** 
Handing an AI an open credit card is a massive security risk. GuardPay solves this by keeping deterministic safety guardrails entirely in pure TypeScript functions outside the LLM. The agent can *never* call PayPal capture directly—a strict Policy Engine checks your Mandate first[span_2](start_span)[span_2](end_span)[span_3](start_span)[span_3](end_span).

---

## ✨ Key Features
* **Natural-Language Constraints:** Parsed seamlessly into strict JSON using Zod-validated outputs[span_4](start_span)[span_4](end_span).
* **Real Product Search:** Powered by the Channel3 API[span_5](start_span)[span_5](end_span).
* **Intelligent Candidate Ranking:** Returns top options with plain-English reasoning shown directly in the UI[span_6](start_span)[span_6](end_span).
* **Deterministic Policy Engine:** Pure code checks per-purchase caps, session totals, category allow-lists, blocked merchants, and delivery dates (`allow` / `needs_approval` / `deny`)[span_7](start_span)[span_7](end_span).
* **Secure PayPal Checkout:** Real sandbox payment execution via PayPal Orders v2 and `@paypal/react-paypal-js` buttons[span_8](start_span)[span_8](end_span).
* **Full Audit Trail:** Live event timeline streaming every step and decision made by the agent[span_9](start_span)[span_9](end_span)[span_10](start_span)[span_10](end_span).

---

## 🛠️ Tech Stack
* **Framework:** Next.js (App Router) + Tailwind CSS + shadcn/ui[span_11](start_span)[span_11](end_span)
* **Language:** TypeScript everywhere[span_12](start_span)[span_12](end_span)
* **AI SDK:** Vercel AI SDK (`ai`) with Google Gemini Flash (Primary) and Groq / Llama (Fallback)[span_13](start_span)[span_13](end_span)
* **Product Search:** Channel3 API[span_14](start_span)[span_14](end_span)
* **Payments:** PayPal Sandbox REST API (Orders v2) & Agent Toolkit[span_15](start_span)[span_15](end_span)
* **Database & ORM:** Neon PostgreSQL + Drizzle ORM[span_16](start_span)[span_16](end_span)
* **Hosting & CI:** Render & GitHub Actions[span_17](start_span)[span_17](end_span)

---

## ⚙️ Environment Variables
Create a `.env` file in the root directory based on `.env.example`:

```env
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_ENV=sandbox
CHANNEL3_API_KEY=your_channel3_api_key
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
LLM_MODEL=gemini-1.5-flash
DATABASE_URL=your_neon_postgres_connection_string
APP_BASE_URL=http://localhost:3000
USE_MOCKS=false
DEMO_MODE=false
