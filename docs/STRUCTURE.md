# Repository File Structure & Ownership Map

## Team Ownership Matrix
- **Member A (Payments & Guardrails)**: `src/lib/paypal/`, `src/lib/policy/`, `src/lib/db/`, `src/contracts/`
- **Member B (AI Agent Engineer)**: `src/lib/agent/`, `src/lib/search/`, `src/lib/negotiation/`, `src/lib/llm/`, `src/app/api/agent/`, `src/app/api/negotiate/`, `fixtures/`
- **Member C (Frontend & Demo Lead)**: `src/app/`, `src/components/`, `docs/`, deployment & presentation

---

## Canonical File Tree

```
mandate/
├── .env.example
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── vitest.config.ts
├── .github/
│   └── CODEOWNERS
├── docs/
│   ├── PLAN.md
│   ├── STRUCTURE.md
│   ├── DEMO_SCRIPT.md
│   └── SUBMISSION.md
├── fixtures/
│   ├── channel3-headphones.json    # Channel3 real & test product fixture
│   ├── recorded-llm.json           # LLM replay outputs for demo insurance
│   └── recorded-negotiation.json   # Multi-turn negotiation replay turns
├── tests/
│   ├── buyer-agent.test.ts         # End-to-end agent workflow & SSE events
│   ├── negotiation.test.ts         # Multi-turn haggle & floor/ceiling guardrails
│   ├── parse-intent.test.ts        # Intent parser & budget extraction
│   ├── sanitize.test.ts            # Untrusted data & prompt-injection defense
│   └── search-filter-rank.test.ts  # Channel3 catalog filtering & rank scoring
└── src/
    ├── contracts/                  # Single source of truth (Zod schemas + TS types)
    │   ├── api.ts
    │   ├── cart.ts
    │   ├── events.ts
    │   ├── index.ts
    │   ├── mandate.ts
    │   ├── negotiation.ts
    │   ├── payment-order.ts
    │   ├── policy-decision.ts
    │   └── product.ts
    ├── lib/
    │   ├── agent/                  # Buyer Agent (Member B)
    │   │   ├── buyer-agent.ts      # Agent workflow & SSE generator
    │   │   ├── explain.ts          # Top-3 "why this one" plain-English explanations
    │   │   ├── index.ts
    │   │   ├── parse-intent.ts     # Natural language -> structured constraints
    │   │   ├── prompts.ts          # Agent & safety system prompts
    │   │   ├── sanitize.ts         # Untrusted product data defense
    │   │   └── tools.ts            # searchProducts, rankCandidates, buildCart
    │   ├── db/                     # DB / Repository stubs (Member A)
    │   │   ├── audit-repo.ts
    │   │   ├── cart-repo.ts
    │   │   ├── index.ts
    │   │   └── mandate-repo.ts
    │   ├── llm/                    # Model routing & replay (Member B)
    │   │   ├── index.ts
    │   │   ├── model.ts            # Gemini Flash / Groq / Mock switch
    │   │   └── replay.ts           # Demo replay caching & offline playback
    │   ├── negotiation/            # Multi-Turn Haggling (Member B)
    │   │   ├── index.ts
    │   │   ├── loop.ts             # 4-round code-enforced negotiation loop
    │   │   ├── prompts.ts          # Seller/buyer negotiation prompts
    │   │   └── seller-agent.ts     # Merchant agent with hidden cost floor
    │   ├── paypal/                 # PayPal integration (Member A)
    │   │   ├── capture.ts          # Capture an approved order and verify the PayPal reply
    │   │   ├── client.ts           # Sandbox access token and request helper
    │   │   ├── errors.test.ts      # PaypalError mapping tests
    │   │   ├── errors.ts           # PaypalError codes: declined, expired, duplicate_capture, unknown
    │   │   ├── index.ts            # createOrder, getOrder, captureOrder (agreed interface)
    │   │   ├── mock.ts             # Mock PayPal, used only when USE_MOCKS=true
    │   │   ├── orders.ts           # Create order (totals checked in cents)
    │   │   └── paypal-flow.test.ts # Real-mode flow tests on a fake PayPal
    │   ├── policy/                 # Policy Engine & Guardrails (Member A2)
    │   │   ├── engine.ts           # Pure deterministic policy evaluator
    │   │   ├── rules.ts            # Policy rules (caps, categories, merchants, expiration, parity)
    │   │   ├── executor.ts         # Server-side safety gate: calls PayPal create/capture, verifies DB approvals
    │   │   └── index.ts
    │   └── search/                 # Product search (Member B)
    │       ├── channel3.ts         # Channel3 client & fallback
    │       ├── filter.ts           # Deterministic budget/delivery/category filters
    │       ├── index.ts
    │       ├── mock.ts             # Channel3 fixture reader
    │       └── rank.ts             # Multi-factor score & ranking
    └── app/
        ├── layout.tsx
        ├── page.tsx
        └── api/
            ├── agent/run/route.ts       # POST /api/agent/run (SSE stream)
            └── negotiate/start/route.ts # POST /api/negotiate/start (SSE stream)
```

