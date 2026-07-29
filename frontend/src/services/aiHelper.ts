import axios from 'axios';
import { fetchSettings, fetchKnowledgeBase } from './api';

export const processUserChatMessage = async (
  userText: string,
  personaName: string = 'Sarcastic Gamer'
): Promise<{ isFiltered: boolean; botReply: string | null }> => {
  const lower = userText.toLowerCase().trim();

  // 1. Heuristic Intent Filter: Identify chatter noise vs real questions
  const noiseKeywords = ['gg', 'lol', 'lmao', 'nice', 'hype', 'w', 'f', 'pog', 'poggers', 'kekw'];
  const isOnlyNoise = noiseKeywords.some(k => lower === k || lower.startsWith(k + ' ') || lower.endsWith(' ' + k));
  
  if (isOnlyNoise && lower.length < 15 && !lower.includes('?')) {
    return { isFiltered: true, botReply: null };
  }

  // 2. Load streamer settings and Knowledge Base
  const settings = await fetchSettings();
  const kbItems = await fetchKnowledgeBase();
  const apiKey = settings?.openrouter_api_key?.trim();
  const model = settings?.llm_model || 'google/gemini-2.0-flash-001';

  const kbContextString = Array.isArray(kbItems)
    ? kbItems.map((k: any) => `${k.title} (${k.category}): ${k.content}`).join('\n')
    : 'GPU: NVIDIA RTX 4090, CPU: Intel i9-14900K, RAM: 64GB DDR5, Discord: https://discord.gg/streamer';

  // 3. If OpenRouter API key is available, generate real AI response via OpenRouter
  if (apiKey && apiKey.startsWith('sk-or-v1-')) {
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: model,
          messages: [
            {
              role: 'system',
              content: `You are StreamBot AI, a live stream co-host. Persona: "${personaName}". Keep answers under 20 words, energetic, and helpful.\nStreamer Knowledge Base:\n${kbContextString}\n${settings?.custom_prompt ? 'Custom Rules: ' + settings.custom_prompt : ''}`
            },
            {
              role: 'user',
              content: userText
            }
          ],
          temperature: 0.7,
          max_tokens: 60
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://ai-stream-assistant.vercel.app',
            'X-Title': 'AI Stream Assistant',
            'Content-Type': 'application/json'
          },
          timeout: 8000
        }
      );

      const reply = response.data?.choices?.[0]?.message?.content?.trim();
      if (reply) {
        return { isFiltered: false, botReply: reply };
      }
    } catch (err) {
      console.warn('Direct OpenRouter AI completion failed, falling back to Knowledge Base matching:', err);
    }
  }

  // 4. Fallback Knowledge Base / Persona matcher if no key or offline
  if (lower.includes('gpu') || lower.includes('pc') || lower.includes('spec') || lower.includes('hardware')) {
    const specKb = kbItems.find((k: any) => k.category === 'hardware') || kbItems[0];
    return {
      isFiltered: false,
      botReply: `Streamer Specs: ${specKb?.content || 'NVIDIA RTX 4090, Intel i9-14900K, 64GB DDR5 RAM'}`
    };
  }

  if (lower.includes('discord') || lower.includes('link') || lower.includes('server') || lower.includes('social')) {
    const socialKb = kbItems.find((k: any) => k.category === 'socials') || kbItems[1];
    return {
      isFiltered: false,
      botReply: `Join our official Discord community: ${socialKb?.content || 'https://discord.gg/streamer'}!`
    };
  }

  if (lower.includes('mouse') || lower.includes('keyboard') || lower.includes('headset')) {
    return {
      isFiltered: false,
      botReply: `Streamer uses the Logitech G Pro X Superlight mouse and Apex Pro TKL keyboard!`
    };
  }

  if (lower.includes('schedule') || lower.includes('when') || lower.includes('time')) {
    return {
      isFiltered: false,
      botReply: `We stream Mon-Fri at 6 PM EST! Make sure to drop a follow!`
    };
  }

  // Default persona-flavored answer
  if (personaName.includes('Sarcastic')) {
    return {
      isFiltered: false,
      botReply: `Bro really asked "${userText}" in chat 😂 Check !specs or !discord!`
    };
  } else if (personaName.includes('Hype')) {
    return {
      isFiltered: false,
      botReply: `LETS GOOO! 🔥 Thanks for asking! Check out the socials & specs in bio!`
    };
  } else {
    return {
      isFiltered: false,
      botReply: `Thanks for the question! Streamer setup and links are available in !specs and !discord.`
    };
  }
};
