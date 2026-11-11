# Structure (A2 zone, add C's and A1's parts in the same file)

| Path | Owner | Notes |
|---|---|---|
| src/contracts/{mandate,cart,payment-order,policy-decision,events,negotiation,api,index}.ts | A2 (changes need all-team PR) | zod schemas; `cart.ts`, `payment-order.ts`, `api.ts` added beyond the SRS list |
| src/lib/policy/{rules,engine,index,engine.test}.ts | A2 | pure rules, `checkPolicy`, `applyAgreedPrice` |
| src/lib/policy/executor.ts | A2 | NEW file: the only caller of createOrder/captureOrder |
| src/lib/policy/executor.test.ts | A2 | NEW file: gate/approval/price-recheck/error-mapping tests |
| src/lib/db/{schema,client,audit-repo,cart-repo,mandate-repo,index}.ts | A2 | order repo lives in cart-repo.ts |
| src/app/api/{mandate,cart/approve,audit}/route.ts | A2 | |
| src/lib/paypal/{index,errors}.ts | A1 | mock stub only, A1 replaces |

## Phase 0 stubs added by A2 (owners fill in; proposal, plan Section 7 was not in the SRS)
| Path | Owner |
|---|---|
| src/lib/{agent,search,llm,negotiation}/index.ts | B |
| src/components/ | C |
| src/app/api/order/{create,capture}/route.ts | A1 (already wired through the executor) |
| scripts/{verify-env,warm}.ts, .github/workflows/ci.yml, eslint.config.js | A2 (FR-A2-30/32, NFR-6) |
| src/lib/policy/architecture.test.ts | A2 (guards FR-A2-22) |
