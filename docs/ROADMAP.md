# Roadmap — AI Stream Assistant

## Phase 0 — Honesty foundation

- Docs & Cursor rules pack
- Align FE/BE API contracts
- Single AI pipeline + real WebSocket
- Gate demo mode; honest health
- Default model `google/gemini-3.5-flash-lite` server-side only

## Phase 1 — Soft-launch MVP

- Auth: email/password + Twitch/Kick/Google OAuth + JWT
- Encrypt secrets at rest; mask keys on GET
- Connectors API; Kick live inbound + outbound
- Moderation gate before chat send
- Oxapay Free/Pro entitlements + reply quotas
- Real analytics + RAG hygiene
- CI smoke tests

**Soft-launch gate:** Kick connected → bot replies in live chat to a KB question → Oxapay Pro checkout works.

## Phase 2 — Multi-platform + brand

- Twitch EventSub + Helix send
- YouTube Live chat connector
- Brand redesign, onboarding, marketing site (Vercel)
- Live Control, Billing, Message Log screens
- Ads only after reliable live demos

## Phase 3 — Scale

- Owner/Mod roles
- Agency workspaces
- Queue workers
- OBS overlay
- Observability (Sentry, usage dashboards)

## Execution order

1. Docs → 2. Contracts/WS → 3. Auth → 4. Kick E2E → 5. Oxapay → 6. Analytics/RAG → 7. Twitch/YouTube → 8. Brand → 9. Scale
