/**
 * Client-side AI helper disabled — all AI runs server-side via OpenRouter.
 * Kept as a no-op export so accidental imports fail loudly in demo mode only.
 */
export async function processUserChatMessage(_text: string, _persona?: string) {
  throw new Error(
    'Client-side AI is disabled. Send messages through the WebSocket / backend pipeline.'
  );
}
