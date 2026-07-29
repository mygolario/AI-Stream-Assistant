"""OBS browser-source overlay feed."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from app.api.websocket import ws_manager

router = APIRouter()

# In-memory last replies for overlay polling
_LAST_REPLIES: list[dict] = []


def push_overlay_reply(payload: dict) -> None:
    _LAST_REPLIES.insert(0, payload)
    del _LAST_REPLIES[20:]


@router.get("/recent")
async def recent_replies():
    return {"replies": _LAST_REPLIES[:10]}


@router.get("/obs", response_class=HTMLResponse)
async def obs_overlay_page():
    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>StreamAI Overlay</title>
  <style>
    body { margin: 0; font-family: "Segoe UI", system-ui, sans-serif; background: transparent; color: #f4f0e6; }
    #feed { display: flex; flex-direction: column; gap: 8px; padding: 16px; max-width: 480px; }
    .item {
      background: linear-gradient(120deg, rgba(18,42,36,.88), rgba(10,22,28,.82));
      border-left: 3px solid #3ecf8e;
      padding: 10px 14px; border-radius: 4px;
      animation: in .4s ease;
    }
    .meta { font-size: 11px; opacity: .7; margin-bottom: 4px; letter-spacing: .04em; text-transform: uppercase; }
    .text { font-size: 18px; line-height: 1.35; }
    @keyframes in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  </style>
</head>
<body>
  <div id="feed"></div>
  <script>
    const feed = document.getElementById('feed');
    async function tick() {
      try {
        const res = await fetch('/api/v1/overlay/recent');
        const data = await res.json();
        feed.innerHTML = (data.replies || []).slice(0, 4).map(r =>
          `<div class="item"><div class="meta">AI answered @${r.username || 'viewer'}</div><div class="text">${(r.ai_response || r.message || '').replace(/</g,'&lt;')}</div></div>`
        ).join('');
      } catch (e) {}
    }
    tick();
    setInterval(tick, 2000);
  </script>
</body>
</html>"""
