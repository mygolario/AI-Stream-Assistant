# Agent Rules — AI Stream Assistant

## Before coding

1. Read `docs/PROJECT_CONTEXT.md`, `docs/PROJECT_RULES.md`, and `docs/ROADMAP.md`.
2. Prefer fixing FE↔BE contracts and live connectors over adding UI chrome.
3. Do not invent “done” status for incomplete connectors (Kick send, Twitch subscribe, YouTube).

## Verification

After meaningful backend changes:

```bash
cd backend && .\venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py"
```

After meaningful frontend changes:

```bash
cd frontend && npm run build
```

## Secrets

- Never commit `.env` or real API keys.
- Never call OpenRouter from frontend code.
- Rotate keys if they appear in logs or shared machines.

## Scope discipline

- Do not expand into Celery/agency/OBS until roadmap Phase 3 unless explicitly asked.
- Keep English-only product copy.
- Update `docs/FEATURE_BACKLOG.md` when shipping or deferring features.
