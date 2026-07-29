# Original User Request

## Initial Request — 2026-07-29T12:13:59Z

AI Stream Assistant is an enterprise-grade, real-time AI Chat Manager, Co-Host, and Analytics SaaS platform for live streamers (Kick, Twitch, YouTube). It connects to live stream chats, uses heuristic cost-filtering to eliminate LLM token waste on chatter noise, answers viewer queries using a streamer Knowledge Base (RAG), and interacts using customizable personas via OpenRouter.

Working directory: c:\Ario Vibe Coding\AI Stream Assistant
Integrity mode: development

## Requirements

### R1. Backend Infrastructure & Platform Connectors
Build an async FastAPI backend with PostgreSQL (`pgvector`), Redis context memory, and Celery workers. Implement a modular plugin architecture for stream chat connectors starting with Kick (Pusher WebSocket / Webhook) and Twitch (EventSub), plus a built-in Mock Stream Simulator for 1-click local testing without requiring live stream keys.

### R2. AI Engine, Cost Filter & OpenRouter RAG Service
Implement a 2-stage message processing pipeline:
1. **Heuristic Intent Filter**: Drop non-actionable chatter (emojis, "gg", "lol", short reactions) to save costs.
2. **OpenRouter AI Engine**: Dynamic prompt compilation incorporating sliding Redis chat memory + `pgvector` similarity search over the Streamer Knowledge Base (PC specs, FAQ, rules, social links) + Customizable Persona Presets (Sarcastic Gamer, Friendly Assistant, Hype-Man, Professional). Support streamer-configurable OpenRouter models (defaulting to ultra-fast models like `google/gemini-2.0-flash-001` / `deepseek/deepseek-chat`).

### R3. Modern Streamer Management Dashboard
Build a high-aesthetic Vite + React frontend dashboard with dark mode and glassmorphism styling featuring:
- **Live Chat Monitor**: Real-time stream monitor with 1-click Mock Stream Simulator.
- **Knowledge Base Visual Manager**: FAQ, PC specs, Links, and Document chunking.
- **Bot Personality & Persona Tuner**: Preset selectors + custom prompt override.
- **Analytics Overview**: Metrics for total messages, AI responses, and token cost savings.
- **API Configuration & Integration Guide**: Simple step-by-step instructions for Kick API / OpenRouter setup.

---

## Acceptance Criteria

### Backend & AI Pipeline
- [ ] FastAPI backend starts cleanly and exposes OpenAPI documentation at `/docs`.
- [ ] Heuristic intent filter correctly filters out non-question chatter (>85% noise drop rate).
- [ ] OpenRouter API integration correctly answers Knowledge Base questions using `pgvector` RAG context.
- [ ] Redis sliding memory maintains conversation context across multiple chat turns per viewer.
- [ ] Mock Stream Simulator successfully pushes simulated viewer messages and receives bot responses.

### Streamer Dashboard & UI
- [ ] React dashboard renders smoothly with modern dark-mode aesthetic.
- [ ] Streamers can add, edit, and delete Knowledge Base items and select Bot Personas.
- [ ] Streamers can input their OpenRouter API key and select/customize target LLM models.
- [ ] Step-by-step Kick API integration guide is accessible directly from the settings panel.
