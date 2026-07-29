# API Contracts

Base: `/api/v1`

## Auth

| Method | Path | Body / notes |
|--------|------|----------------|
| POST | `/auth/register` | `{ email, password, display_name? }` |
| POST | `/auth/login` | `{ email, password }` → `{ access_token, token_type, user }` |
| GET | `/auth/me` | Bearer JWT |
| GET | `/auth/oauth/{provider}` | `provider`: `twitch` \| `kick` \| `google` — redirect |
| GET | `/auth/oauth/{provider}/callback` | OAuth callback |

## Settings

| Method | Path | Fields |
|--------|------|--------|
| GET | `/settings` | Masked `openrouter_api_key`; `selected_model`, `active_persona_id`, `custom_prompt_override`, `kick_channel_id`, `twitch_channel_id`, `youtube_channel_id`, `bot_muted`, `general_knowledge_enabled` |
| PUT | `/settings` | Same field names |
| POST | `/settings/test-key` | `{ api_key }` |

## Simulator

| Method | Path | Body |
|--------|------|------|
| POST | `/simulator/start` | `{ interval_seconds, channel_id? }` |
| POST | `/simulator/stop` | — |
| GET | `/simulator/status` | — |

## Connectors

| Method | Path | Notes |
|--------|------|-------|
| POST | `/connectors/{platform}/connect` | `platform`: kick \| twitch \| youtube |
| POST | `/connectors/{platform}/disconnect` | |
| GET | `/connectors/status` | All connector states |

## Knowledge base / personas / chat / analytics

Unchanged REST shapes; personas use `name`, `system_prompt`, `temperature`, `is_preset`.

Analytics summary:

```json
{
  "total_messages": 0,
  "filtered_messages": 0,
  "ai_responses_sent": 0,
  "estimated_tokens_saved": 0,
  "filter_rate_percentage": 0.0,
  "platform_breakdown": { "kick": 0, "twitch": 0, "youtube": 0, "simulator": 0 }
}
```

Time series: `GET /analytics/time-series` → `{ points: [{ timestamp, message_count, ai_response_count, filtered_count }] }`

## Billing (Oxapay)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/billing/plan` | Current plan + quotas |
| POST | `/billing/checkout` | `{ plan: "pro" }` → payment URL |
| POST | `/billing/webhook` | Oxapay IPN (unsigned public with signature verify) |

## WebSocket

`WS /ws/chat?token=<jwt>`

Events:

- `{ type: "chat_message", data: { platform, username, message, is_filtered, ... } }`
- `{ type: "ai_response", data: { username, user_message, ai_response, tokens_used, ... } }`
- `{ type: "filtered", data: { ... } }`
