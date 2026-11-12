# Structure: A2 additions

| Path                                            | Owner | Note                                                     |
| ----------------------------------------------- | ----- | -------------------------------------------------------- |
| src/lib/policy/executor.ts                      | A2    | Only code path that calls lib/paypal                     |
| src/lib/policy/executor.test.ts                 | A2    | Gate, approval, price re-check, error mapping tests      |
| src/lib/policy/architecture.test.ts             | A2    | Fails CI if anything but the executor imports lib/paypal |
| src/contracts/cart.ts, payment-order.ts, api.ts | A2    | Extra contracts, need team approval                      |
| scripts/ (verify-env.ts, warm.ts)               | A2    | Env check and Render warm-up                             |
| drizzle.config.ts                               | A2    | Neon migrations (pnpm db:push)                           |
| src/lib/paypal/                                 | A1    | Mock with agreed signatures, A1 replaces                 |
| src/app/api/orders/                             | A1    | Routes call the executor                                 |
