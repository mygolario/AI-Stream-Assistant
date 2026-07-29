# Security

## Principles

1. All mutating and data APIs require authentication (except health, billing webhook, OAuth callbacks).
2. Platform OpenRouter key lives **only on the server** (env / encrypted DB). Never expose to the browser as a writable streamer-owned key for production billing mode — streamers subscribe; operator pays OpenRouter.
3. OAuth access tokens encrypted at rest (`Fernet` / `SECRET_KEY`-derived).
4. Mask secrets on GET (`sk-or-…****`).
5. Rate-limit auth, test-key, and chat process endpoints.
6. Moderate inbound and outbound chat content before LLM spend / send.
7. CORS allowlist production frontend origins only.

## Auth methods

- Email/password (bcrypt/argon2 hashed)
- OAuth: Twitch, Kick, Google
- JWT bearer for REST; token query param for WS

## Threat notes

- Open WebSocket without auth is forbidden in production.
- Do not log full API keys or OAuth tokens.
- Validate Oxapay webhook signatures before upgrading plans.
