# Project Context — AI Stream Assistant

## North star

Solo streamers connect Kick, Twitch, and YouTube. The bot filters chatter, answers FAQ from their Knowledge Base in **live chat**, and shows cost/analytics in a branded dashboard. Platform AI is billed via the operator’s OpenRouter key (`google/gemini-3.5-flash-lite`). Users pay via **Oxapay** crypto subscriptions.

## Product principles

1. **Honest product** — no silent mocks that look like success when the backend is down.
2. **Server-side AI only** — never call OpenRouter from the browser.
3. **Live chat out** — replies must post into platform chat, not only the dashboard.
4. **KB-first answers** — prefer Knowledge Base RAG; refuse inventing streamer facts.
5. **English only** for now.

## Architecture snapshot

```
Platform chat (Kick/Twitch/YouTube/Simulator)
  → Intent filter (balanced heuristics)
  → RAG (pgvector) + Redis viewer memory
  → Persona + Gemini Flash Lite (OpenRouter)
  → Moderation gate
  → Send to live chat + WebSocket dashboard + analytics
```

## Hosting

- Frontend: Vercel (SPA)
- Backend: containerized FastAPI (Railway / Fly / Render / VPS)
- Data: PostgreSQL + pgvector, Redis

## Non-goals (near term)

- Native mobile apps
- Multi-language chat
- Celery (use FastAPI async + Redis until scale demands workers)
- Agency white-label until traction

## Default model

`google/gemini-3.5-flash-lite` for all LLM features.
