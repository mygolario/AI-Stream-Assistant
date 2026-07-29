"""
backend/app/services/openrouter.py
Async OpenRouter Client for executing LLM completions with model selection,
error handling, and token usage calculation.
"""

import httpx
import logging
from typing import List, Dict, Any, Optional, Tuple
from app.core.config import settings

logger = logging.getLogger(__name__)


class OpenRouterClient:
    """
    Async HTTP client targeting OpenRouter /chat/completions API endpoint.
    """

    OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

    def __init__(self, timeout_seconds: float = 10.0):
        self.timeout_seconds = timeout_seconds

    async def generate_chat_response(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 250
    ) -> Tuple[str, int, str]:
        """
        Execute OpenRouter Chat Completion API call.
        Returns: Tuple[response_text, tokens_used, model_used]
        """
        effective_key = api_key or settings.OPENROUTER_API_KEY
        effective_model = model or settings.DEFAULT_OPENROUTER_MODEL

        # Fallback offline simulation if no API key is configured
        if not effective_key:
            logger.info("No OpenRouter API key found. Returning simulated offline AI response.")
            simulated_reply = self._generate_simulated_fallback(messages)
            estimated_tokens = int(len(simulated_reply.split()) * 1.3) + 40
            return (simulated_reply, estimated_tokens, f"{effective_model} (simulated)")

        headers = {
            "Authorization": f"Bearer {effective_key}",
            "HTTP-Referer": "https://aistreamassistant.local",
            "X-Title": "AI Stream Assistant",
            "Content-Type": "application/json"
        }

        payload = {
            "model": effective_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(self.OPENROUTER_URL, headers=headers, json=payload)

                if response.status_code == 200:
                    data = response.json()
                    choice = data["choices"][0]["message"]["content"]
                    usage = data.get("usage", {})
                    tokens_used = usage.get("total_tokens", int(len(choice.split()) * 1.3) + 30)
                    return (choice.strip(), tokens_used, effective_model)

                elif response.status_code == 401:
                    logger.error("OpenRouter API Error: Invalid API key (HTTP 401)")
                    return ("⚠️ OpenRouter API Key is invalid. Please update in Settings.", 0, effective_model)

                elif response.status_code == 429:
                    logger.warning("OpenRouter API Error: Rate limited (HTTP 429)")
                    return ("⚠️ OpenRouter rate limit reached. Retrying shortly!", 0, effective_model)

                else:
                    logger.error(f"OpenRouter Error HTTP {response.status_code}: {response.text}")
                    simulated_reply = self._generate_simulated_fallback(messages)
                    return (simulated_reply, 50, f"{effective_model} (fallback)")

        except httpx.TimeoutException:
            logger.error("OpenRouter API request timed out.")
            return ("⚠️ AI model timed out. Try asking again!", 0, effective_model)
        except Exception as e:
            logger.error(f"OpenRouter client exception: {e}")
            simulated_reply = self._generate_simulated_fallback(messages)
            return (simulated_reply, 50, f"{effective_model} (fallback)")

    def _generate_simulated_fallback(self, messages: List[Dict[str, str]]) -> str:
        """Helper to generate persona-aware fallback responses during testing/offline execution."""
        last_user_msg = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                last_user_msg = m.get("content", "")
                break

        msg_lower = last_user_msg.lower()
        if "gpu" in msg_lower or "specs" in msg_lower or "pc" in msg_lower:
            return "Current setup is running a Ryzen 7 7800X3D and RTX 4080 Super! Absolute beast for 1440p gaming."
        elif "schedule" in msg_lower or "when" in msg_lower or "live" in msg_lower:
            return "Streams are live Mon-Fri starting at 6 PM EST! Don't forget to hit follow!"
        elif "discord" in msg_lower or "server" in msg_lower:
            return "Join our discord server at discord.gg/streamer for community games and updates!"
        elif "rank" in msg_lower or "valorant" in msg_lower or "game" in msg_lower:
            return "Currently sitting at Diamond 2 in Valorant! Grinding for Immortal this week."
        elif "monitor" in msg_lower or "screen" in msg_lower:
            return "Using a 27-inch 1440p 240Hz OLED monitor! Ultra smooth gameplay."
        elif "mic" in msg_lower or "microphone" in msg_lower or "obs" in msg_lower:
            return "Streaming using Shure SM7B into a GoXLR setup with custom OBS audio filters!"
        else:
            return "Thanks for asking! Check out the stream info panels below for full details!"


openrouter_client = OpenRouterClient()
