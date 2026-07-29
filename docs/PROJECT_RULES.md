# Project Rules — AI Stream Assistant

## API contracts

- Frontend field names must match backend schemas exactly.
- Settings: `openrouter_api_key`, `selected_model`, `kick_channel_id`, `twitch_channel_id`, `youtube_channel_id`, `custom_prompt_override`.
- Settings update method: `PUT /api/v1/settings`.
- Simulator start body: `{ "interval_seconds": number }` (not `rate`).
- Analytics response uses backend shape (`total_messages`, `filtered_messages`, `ai_responses_sent`, `estimated_tokens_saved`, `filter_rate_percentage`).
- Document breaking API changes in `docs/API_CONTRACTS.md`.

## Honesty

- Do not return fake “healthy” / “saved successfully” when requests fail.
- Demo mode must be explicit (`VITE_DEMO_MODE=true` or equivalent). Default: backend is source of truth.
- No client-side parallel AI path or client-side simulator when backend is online.

## AI & secrets

- Default model: `google/gemini-3.5-flash-lite`.
- OpenRouter calls only from the backend.
- Encrypt OAuth tokens and sensitive secrets at rest.
- Mask API keys on GET responses.

## Code style

- Python: async FastAPI, SQLAlchemy async, Alembic migrations for schema changes.
- TypeScript/React: imports at top of file; exhaustive switches with `never` default where unions are used.
- Prefer structured logging over `print()`.

## Testing gates

- Intent filter must keep ≥85% noise drop on chatter samples.
- Contract tests for settings/simulator/analytics shapes.
- Frontend production build must succeed (`npm run build`).
