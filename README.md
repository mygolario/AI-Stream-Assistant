# AI Stream Assistant

Enterprise-style AI co-host for live streamers (Kick, Twitch, YouTube): filters chat noise, answers Knowledge Base questions in **live chat**, and tracks analytics. Users subscribe via **Oxapay** crypto; AI runs on OpenRouter (`google/gemini-3.5-flash-lite`) server-side.

## Quick start

See [docs/RUNBOOK.md](docs/RUNBOOK.md).

```bash
cp .env.example .env
docker compose up -d postgres redis
cd backend && pip install -r requirements.txt && alembic upgrade head
uvicorn app.main:app --reload --port 8000

cd frontend && npm install && npm run dev
```

- API docs: http://localhost:8000/docs  
- Dashboard: http://localhost:3000  

## Docs

| Doc | Purpose |
|-----|---------|
| [PROJECT_CONTEXT](docs/PROJECT_CONTEXT.md) | Vision & principles |
| [PROJECT_RULES](docs/PROJECT_RULES.md) | Engineering rules |
| [AGENT_RULES](docs/AGENT_RULES.md) | Agent/automation rules |
| [ROADMAP](docs/ROADMAP.md) | Phases |
| [FEATURE_BACKLOG](docs/FEATURE_BACKLOG.md) | Core / Basic / AI |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Pipeline |
| [API_CONTRACTS](docs/API_CONTRACTS.md) | REST/WS shapes |
| [SECURITY](docs/SECURITY.md) | Auth & secrets |
| [BILLING_OXAPAY](docs/BILLING_OXAPAY.md) | Subscriptions |
| [RUNBOOK](docs/RUNBOOK.md) | Local & deploy |

## Stack

FastAPI · PostgreSQL/pgvector · Redis · React/Vite/Tailwind · OpenRouter · Oxapay
