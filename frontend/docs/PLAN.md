# Mandate: 48-Hour Hackathon Build Plan

## Team Roster
- **Member A**: Payments & Guardrails Engineer (Integrator, PayPal Orders v2, Policy Engine, DB/Neon)
- **Member B**: AI Agent Engineer (Buyer Agent, Channel3 Search, Buyer/Seller Negotiation, LLM routing, SSE streaming)
- **Member C**: Frontend, Product & Demo Lead (Next.js UI, Tailwind, Render deployment, Video & Devpost)

---

## Winning Differentiator
Current AI commerce demos either fail when faced with prompt injection or hallucinate pricing rules. **Mandate** enforces a strict separation of concerns:
> **The LLM proposes, code disposes.**

The model suggests product candidates, drafts carts, and haggles on price; plain, deterministic code enforces budget caps, merchant blacklists, and payment capture authorizations.

---

## Sprint Milestones
| Milestone | Timeline | Deliverable |
|---|---|---|
| **M0** | H0 – H2 | Skeleton committed, shared Zod contracts agreed, keys verified. |
| **M1** | H2 – H10 | Ugly vertical slice: request → search → cart → PayPal sandbox payment. |
| **M2** | H10 – H16 | Real agent pipeline: intent parser, Channel3 search, LLM top-3 ranking with explanations. |
| **M3** | H16 – H22 | Full safe flow: Mandate enforcement, policy badge, human approval gate, audit timeline. |
| **M4** | H22 – H28 | Autonomous mode & pre-authorized spending threshold. |
| **M5** | H28 – H34 | Live Buyer/Seller agent negotiation with settlement to PayPal. |
| **M6** | H34 – H40 | **CODE FREEZE**: Bug fixes only, replay mode verification, green test suites. |
| **M7** | H40 – H46 | Video recording (<3:00) & Devpost submission. |

