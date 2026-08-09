# acme-checkout

Checkout and support service for Acme storefronts. Express API that uses
OpenAI for support-ticket classification, refund triage, and call-transcript
handling.

```bash
npm install
npm run typecheck
npm start
```

Routes: `POST /support/classify`, `POST /triage`, `GET /transcripts/:fileId/raw`.
Nightly jobs live in `src/jobs`.
