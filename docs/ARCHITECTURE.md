# Architecture

## Message pipeline

1. **Ingest** — Kick Pusher WS / Twitch EventSub / YouTube Live Chat / Mock Simulator
2. **Normalize** — `AbstractChatConnector.normalize_message`
3. **Quota check** — Free/Pro daily AI reply limits (Oxapay entitlement)
4. **Intent filter** — drop gg/lol/emotes/short reactions; pass questions
5. **Moderation (pre)** — blocklist / unsafe patterns
6. **RAG** — pgvector similarity over Knowledge Base (OpenRouter embeddings when key present)
7. **Memory** — Redis sliding window per `channel_id` + username
8. **Persona** — compile system prompt + optional override
9. **LLM** — OpenRouter `google/gemini-3.5-flash-lite`
10. **Moderation (post)** — refuse unsafe outbound
11. **Dispatch** — platform `send_message` + WS broadcast + DB analytics

## Services layout

| Path | Role |
|------|------|
| `backend/app/connectors/` | Platform plugins + manager |
| `backend/app/services/` | Filter, RAG, OpenRouter, persona, AI engine, moderation, billing |
| `backend/app/api/v1/` | REST routers |
| `backend/app/api/websocket.py` | Dashboard live feed |
| `backend/app/core/` | Config, DB, Redis, security |
| `frontend/src/pages/` | Dashboard screens |
| `frontend/src/services/` | API + WS clients |

## Tenancy (Phase 1+)

- `users` own workspaces/settings and channels
- JWT protects REST and WS
- Platform OAuth tokens encrypted at rest
