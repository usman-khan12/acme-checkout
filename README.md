# acme-checkout

Checkout and support service for Acme storefronts. Express API that takes
payments through Stripe, uses OpenAI for support-ticket classification and
refund triage, and sends order notifications over vendor REST APIs.

```bash
npm install
npm run typecheck
npm start
```

Routes:

| Route | What |
|---|---|
| `POST /checkout/session` | Hosted checkout for a storefront cart |
| `POST /checkout/refund` | Support-initiated refund |
| `POST /webhooks/stripe` | Signed v2 event stream |
| `POST /support/classify` | Ticket classification |
| `POST /triage` | Refund triage agent |
| `GET /transcripts/:fileId/raw` | Call transcript fetch |
| `GET /finance/payouts` | Payout export |

Nightly jobs live in `src/jobs`. Slack and Resend are called over plain HTTP
from `src/lib/notify.ts` rather than through their SDKs; payout reporting in
`src/lib/payouts.ts` hits the Stripe REST API directly because the finance
export needs the raw response shape.
