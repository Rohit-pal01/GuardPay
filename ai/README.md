# Mandate

> **Mandate lets an AI agent shop and pay for you with real PayPal payments, while code, not the model, enforces your spending limits.**

Built for the **PayPal AI Hackathon 2026**.

[![CI](https://github.com/example/mandate/actions/workflows/ci.yml/badge.svg)](https://github.com/example/mandate/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Architecture

```
Browser (Next.js UI)
 │ SSE stream of AgentEvents         │ PayPal JS Buttons
 ▼                                   ▼
Next.js API routes ─────────────────► lib/paypal (create/capture)
 │                                   ▲
 ▼                                   │
lib/agent (Buyer Agent, LLM) ───────► lib/policy (Mandate check) ──► ONLY path to payment
 │                    │
 ▼                    ▼
lib/search (Channel3) lib/negotiation (Seller Agent)
 │
 ▼
lib/db (audit log, mandates, carts, orders)
```

### Core Design Rules
1. **The LLM proposes, code disposes**: The agent can never call PayPal capture directly. Only the server-side executor can, and only after the Policy Engine returns `allow` or a recorded human approval.
2. **Product text is untrusted**: Titles and descriptions are passed to the LLM strictly as sanitized data, never as prompt instructions.
3. **Every step emits an AgentEvent**: Real-time observability over Server-Sent Events (SSE) into an immutable audit trail.
4. **Mock-First & Demo Insurance**: Full offline replay fidelity via `USE_MOCKS=true` and `DEMO_MODE=replay`.

---

## Quickstart

### Prerequisites
- Node.js >= 20.x
- pnpm >= 9.x

### Setup
```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment variables
cp .env.example .env

# 3. Run unit test suite
pnpm test

# 4. Start development server
pnpm dev
```

---

## API Routes (Agent & Negotiation)

| Route | Method | Payload | Description |
|---|---|---|---|
| `/api/agent/run` | POST | `{ request, mandateId }` | SSE stream of `AgentEvent`s (intent, search, rank, cart) |
| `/api/negotiate/start` | POST | `{ candidateId, mandateId }` | SSE stream of multi-turn buyer/seller negotiation turns |

---

## Testing & Quality
```bash
pnpm test                 # Run all Vitest suites
pnpm exec tsc --noEmit    # Static TypeScript verification
```

---

## License
MIT

