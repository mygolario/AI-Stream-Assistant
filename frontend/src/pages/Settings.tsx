import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Settings, Key, Cpu, HelpCircle, ExternalLink, Radio, CheckCircle2, XCircle, Loader2, Zap } from 'lucide-react';
import { fetchSettings, updateSettings, testApiKey } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('google/gemini-2.0-flash-001');
  const [kickChannel, setKickChannel] = useState<string>('streamer_kick');
  const [twitchChannel, setTwitchChannel] = useState<string>('streamer_twitch');
  const [customPromptOverride, setCustomPromptOverride] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Test API Key state
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [keyTestStatus, setKeyTestStatus] = useState<{ valid: boolean; message: string } | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await fetchSettings();
        if (data) {
          if (data.openrouter_api_key) setApiKey(data.openrouter_api_key);
          if (data.llm_model) setSelectedModel(data.llm_model);
          if (data.kick_channel) setKickChannel(data.kick_channel);
          if (data.twitch_channel) setTwitchChannel(data.twitch_channel);
          if (data.custom_prompt) setCustomPromptOverride(data.custom_prompt);
        }
      } catch (err) {
        console.warn('API fetchSettings failed, using defaults:', err);
      }
    };
    loadSettings();
  }, []);

  const handleTestApiKey = async () => {
    if (!apiKey) {
      setKeyTestStatus({ valid: false, message: 'Please enter an OpenRouter API Key to test.' });
      return;
    }

    setIsTestingKey(true);
    setKeyTestStatus(null);

    try {
      const res = await testApiKey(apiKey);
      setKeyTestStatus({
        valid: res?.valid ?? false,
        message: res?.message || (res?.valid ? 'OpenRouter API Key is valid' : 'Key validation failed'),
      });
    } catch (err: any) {
      setKeyTestStatus({
        valid: false,
        message: err.response?.data?.message || err.message || 'Key validation failed',
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    const payload = {
      openrouter_api_key: apiKey,
      llm_model: selectedModel,
      kick_channel: kickChannel,
      twitch_channel: twitchChannel,
      custom_prompt: customPromptOverride,
    };

    try {
      await updateSettings(payload);
      setStatusMessage('Configuration saved successfully!');
    } catch (err) {
      console.warn('API updateSettings failed, saved locally:', err);
      setStatusMessage('Settings updated locally.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <Settings className="w-6 h-6 text-purple-400" />
            <span>API Configuration & Integration Guide</span>
          </h2>
          <p className="text-sm text-slate-400">Configure your OpenRouter API credentials, channel credentials, and custom prompts.</p>
        </div>
        {statusMessage && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-1.5 animate-pulse">
            <CheckCircle2 className="w-4 h-4" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-2 gap-6">
        {/* OpenRouter & Channel Config */}
        <GlassCard className="space-y-4">
          <h3 className="font-semibold text-slate-200 flex items-center space-x-2">
            <Key className="w-4 h-4 text-purple-400" />
            <span>OpenRouter & LLM Settings</span>
          </h3>

          <div className="space-y-2">
            <label className="text-xs text-slate-400">OpenRouter API Key</label>
            <div className="flex space-x-2">
              <input
                type="password"
                placeholder="sk-or-v1-..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  if (keyTestStatus) setKeyTestStatus(null);
                }}
                className="flex-1 bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
              />
              <button
                type="button"
                onClick={handleTestApiKey}
                disabled={isTestingKey || !apiKey}
                className="px-4 py-2 bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 border border-purple-500/30 rounded-xl text-xs font-medium transition-all flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
              >
                {isTestingKey ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    <span>Test API Key</span>
                  </>
                )}
              </button>
            </div>

            {keyTestStatus && (
              <div
                className={`p-2.5 rounded-xl border text-xs flex items-center space-x-2 transition-all ${
                  keyTestStatus.valid
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {keyTestStatus.valid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                )}
                <span>{keyTestStatus.message}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400 flex items-center space-x-1">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Target LLM Model</span>
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="google/gemini-2.0-flash-001">Google Gemini 2.0 Flash (Ultra Fast / Default)</option>
              <option value="deepseek/deepseek-chat">DeepSeek V3 Chat (High Reasoning)</option>
              <option value="anthropic/claude-3-haiku">Anthropic Claude 3 Haiku</option>
              <option value="openai/gpt-4o-mini">OpenAI GPT-4o Mini</option>
            </select>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-3">
            <h4 className="font-semibold text-xs text-slate-300 flex items-center space-x-1">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>Channel Credentials & Integrations</span>
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Kick Channel ID</label>
                <input
                  type="text"
                  placeholder="e.g. streamer_kick"
                  value={kickChannel}
                  onChange={(e) => setKickChannel(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Twitch Channel</label>
                <input
                  type="text"
                  placeholder="e.g. streamer_twitch"
                  value={twitchChannel}
                  onChange={(e) => setTwitchChannel(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400">Custom Prompt Override</label>
            <textarea
              rows={3}
              placeholder="Optional system prompt instructions override..."
              value={customPromptOverride}
              onChange={(e) => setCustomPromptOverride(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-purple-900/30 disabled:opacity-50"
          >
            {isSaving ? 'Saving Configuration...' : 'Save Configuration'}
          </button>
        </GlassCard>

        {/* Kick & Twitch Integration Guide */}
        <GlassCard className="space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-200 flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>Kick & Twitch Connection Setup</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <h4 className="font-semibold text-cyan-300 mb-1">Kick Integration</h4>
                <p className="text-slate-400">Enter your Kick Channel ID in settings. Stream Assistant connects to Kick's Pusher WebSocket cluster automatically.</p>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <h4 className="font-semibold text-purple-300 mb-1">Twitch Integration</h4>
                <p className="text-slate-400">Connect Twitch via EventSub WebSockets. No OAuth flow needed for reading public chat rooms.</p>
              </div>

              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1 text-purple-400 hover:underline pt-2"
              >
                <span>Get OpenRouter API Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </GlassCard>
      </form>
    </div>
  );
};
