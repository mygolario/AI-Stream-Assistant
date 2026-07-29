# Billing — Oxapay

## Plans

| Plan | Platforms | AI replies / day | Personas | Notes |
|------|-----------|------------------|----------|-------|
| Free | 1 | 50 | 1 preset | Simulator + basic analytics |
| Pro | Kick + Twitch + YouTube | 2000 (fair use) | Custom + presets | Full analytics, document upload |
| Agency | Multi-streamer | Custom | Shared KB | Phase 3 |

## Flow

1. `POST /api/v1/billing/checkout` with `{ "plan": "pro" }`
2. Backend creates Oxapay invoice with callback URL
3. User pays crypto
4. Oxapay hits `POST /api/v1/billing/webhook`
5. Signature verified → set `users.plan = pro`, `plan_expires_at`
6. Entitlement middleware enforces quotas before Stage-2 LLM

## Env

```
OXAPAY_MERCHANT_API_KEY=
OXAPAY_CALLBACK_URL=https://api.example.com/api/v1/billing/webhook
OXAPAY_SANDBOX=true
```

## Entitlement checks

- Free users: one connected platform; daily reply counter in Redis `quota:{user_id}:{date}`
- Pro: all platforms until expiry
- Exceeded quota → skip LLM, optional dashboard notice
