# Runbook — Local Development

## Prerequisites

- Docker Desktop
- Node.js 18+
- Python 3.11+

## 1. Environment

```bash
cp .env.example .env
# Set POSTGRES_PASSWORD, OPENROUTER_API_KEY, SECRET_KEY, OXAPAY_MERCHANT_API_KEY, OAuth client IDs
```

## 2. Infrastructure + backend

```bash
docker compose up -d postgres redis
cd backend
python -m venv venv
.\venv\Scripts\activate   # Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Or full stack:

```bash
docker compose up --build
```

API docs: http://localhost:8000/docs  
Health: http://localhost:8000/health

## 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard: http://localhost:3000 (Vite proxy `/api` and `/ws` → `:8000`)

## 4. Demo mode

Set `VITE_DEMO_MODE=true` only for offline UI demos. Default is honest backend-backed mode.

## 5. Tests

```bash
cd backend
.\venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py"
cd ../frontend
npm run build
```

## 6. Deploy sketch

- Frontend → Vercel (`vercel.json` builds `frontend/`)
- Backend → Railway/Fly/Render with Postgres + Redis
- Set `CORS_ORIGINS` to the Vercel URL
