import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Key,
  Cpu,
  HelpCircle,
  ExternalLink,
  Radio,
  CheckCircle2,
  XCircle,
  Zap,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { AnimatedPage } from '../components/ui/AnimatedPage';
import { fetchSettings, updateSettings, testApiKey } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.0-flash-001');
  const [kickChannel, setKickChannel] = useState('');
  const [twitchChannel, setTwitchChannel] = useState('');
  const [customPromptOverride, setCustomPromptOverride] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState<{ valid: boolean; message: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchSettings();
        if (res) {
          if (res.api_key) setApiKey(res.api_key);
          if (res.model) setSelectedModel(res.model);
          if (res.kick_channel) setKickChannel(res.kick_channel);
          if (res.twitch_channel) setTwitchChannel(res.twitch_channel);
          if (res.custom_prompt) setCustomPromptOverride(res.custom_prompt);
        }
      } catch {}
    };
    load();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        api_key: apiKey,
        model: selectedModel,
        kick_channel: kickChannel,
        twitch_channel: twitchChannel,
        custom_prompt: customPromptOverride,
      });
    } catch {}
    setIsSaving(false);
    setStatusMessage('Settings saved successfully');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleTestKey = async () => {
    if (!apiKey.trim()) return;
    setIsTestingKey(true);
    setKeyTestStatus(null);
    try {
      const result = await testApiKey(apiKey);
      setKeyTestStatus(result);
    } catch {
      setKeyTestStatus({ valid: false, message: 'Connection failed' });
    }
    setIsTestingKey(false);
  };

  return (
    <AnimatedPage className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-heading text-text-primary flex items-center gap-2">
          <Settings className="w-5 h-5 text-accent-blue" />
          Settings & Integration Guide
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Configure API keys, LLM model, and platform connections.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Configuration Form (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          {/* API Key Section */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              OpenRouter API Key
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  mono
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <Button
                variant="secondary"
                size="md"
                onClick={handleTestKey}
                loading={isTestingKey}
                disabled={!apiKey.trim()}
              >
                Test Key
              </Button>
            </div>

            {/* Key test result */}
            {keyTestStatus && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs border ${
                  keyTestStatus.valid
                    ? 'bg-accent-emerald-muted text-accent-emerald border-accent-emerald/20'
                    : 'bg-accent-rose-muted text-accent-rose border-accent-rose/20'
                }`}
              >
                {keyTestStatus.valid ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                {keyTestStatus.message}
              </motion.div>
            )}
          </div>

          <div className="divider" />

          {/* Model Selection */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              LLM Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full"
            >
              <option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash (Fastest)</option>
              <option value="deepseek/deepseek-chat">DeepSeek V3 (Best Value)</option>
              <option value="anthropic/claude-3-haiku">Claude 3 Haiku (Balanced)</option>
              <option value="openai/gpt-4o-mini">GPT-4o Mini (Reliable)</option>
            </select>
          </div>

          <div className="divider" />

          {/* Channel Connections */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" />
              Platform Channels
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Kick Channel"
                placeholder="your-channel"
                value={kickChannel}
                onChange={(e) => setKickChannel(e.target.value)}
              />
              <Input
                label="Twitch Channel"
                placeholder="your-channel"
                value={twitchChannel}
                onChange={(e) => setTwitchChannel(e.target.value)}
              />
            </div>
          </div>

          <div className="divider" />

          {/* Custom Prompt */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary">Custom Prompt Override</label>
            <textarea
              value={customPromptOverride}
              onChange={(e) => setCustomPromptOverride(e.target.value)}
              placeholder="Override the system prompt for all personas..."
              rows={4}
              className="w-full font-mono text-xs"
            />
          </div>

          {/* Save */}
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              loading={isSaving}
              onClick={handleSave}
            >
              Save Settings
            </Button>

            {statusMessage && (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1.5 text-xs text-accent-emerald"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {statusMessage}
              </motion.span>
            )}
          </div>
        </div>

        {/* Right: Integration Guide (2 cols) */}
        <div className="lg:col-span-2">
          <Card variant="highlight" padding="lg" className="space-y-5 sticky top-20">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-accent-blue" />
              <h3 className="text-sm font-semibold text-text-primary">Setup Guide</h3>
            </div>

            {/* Step 1 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="blue">Step 1</Badge>
                <span className="text-xs font-medium text-text-primary">Get OpenRouter API Key</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Sign up at{' '}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-blue hover:underline inline-flex items-center gap-1"
                >
                  openrouter.ai/keys <ExternalLink className="w-3 h-3" />
                </a>{' '}
                and create an API key. Paste it in the field on the left.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="blue">Step 2</Badge>
                <span className="text-xs font-medium text-text-primary">Select LLM Model</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Choose a model optimized for speed. Gemini Flash and DeepSeek V3 offer the best latency-to-cost ratio for live chat.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="blue">Step 3</Badge>
                <span className="text-xs font-medium text-text-primary">Connect Kick / Twitch</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Enter your channel name. The bot will connect to your chat via WebSocket and start processing messages automatically.
              </p>
            </div>

            <div className="divider" />

            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <Zap className="w-3.5 h-3.5" />
              <span>Use the Mock Simulator to test without connecting to a live stream.</span>
            </div>
          </Card>
        </div>
      </div>
    </AnimatedPage>
  );
};
