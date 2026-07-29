# Feature Backlog

## Core (soft launch)

- [x] Auth (email + Twitch/Kick/Google OAuth)
- [x] Encrypted secrets + server-side Gemini only
- [x] Knowledge Base CRUD + RAG
- [x] Balanced heuristic cost filter
- [x] Live chat inbound + outbound (Kick first; Twitch/YouTube wired)
- [x] Backend-only mock simulator
- [x] Personas (presets + custom prompt)
- [x] Free/Pro via Oxapay + reply quotas
- [x] Live Chat Monitor + real WS
- [x] Real analytics
- [x] Health, logging, README/runbook
- [x] English-only copy

## Basic (Phase 2+)

- [x] Twitch + YouTube connectors
- [x] Multi-channel foundation (workspace_channels + settings IDs)
- [x] Bot mute / mention-only mode
- [ ] @mention-only polish / `!ask` UX copy
- [x] Onboarding wizard + platform guides
- [ ] Message audit log UI
- [x] Billing portal
- [x] Landing/marketing + waitlist entry
- [x] Brand redesign + honest errors
- [x] CI workflow
- [ ] Document upload → chunk → embed
- [ ] Blacklist words / ignore users UI
- [ ] Bot only when live webhook

## AI

- [x] `google/gemini-3.5-flash-lite` everywhere
- [x] KB-first with general-knowledge toggle (default off)
- [x] Redis sliding memory per viewer
- [x] Pre/post chat moderation
- [ ] Suggested KB from unanswered questions
- [ ] Smart per-user cooldown
- [ ] Intent classes expansion
- [ ] Hype vs support mode
- [x] Daily token/reply budget governor
- [x] Embedding path + vector index migration
- [ ] Post-stream summary (Pro)
- [ ] Multi-turn clarifications
- [x] Toxicity/spam rule moderation

## Later / agency

- [x] Agency org + mod invite foundation
- [ ] Agency dashboard polish
- [ ] SSO, audit exports
- [x] Redis job worker (Celery alternative)
- [ ] Multi-language
- [ ] Native mobile
- [x] OBS browser overlay
