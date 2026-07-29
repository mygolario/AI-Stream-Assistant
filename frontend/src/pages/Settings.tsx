import React, { useState, useEffect } from 'react';
import {
  Settings,
  Key,
  HelpCircle,
  ExternalLink,
  Radio,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { AnimatedPage } from '../components/ui/AnimatedPage';
import { fetchSettings, updateSettings, testApiKey, connectPlatform } from '../services/api';

const DEFAULT_MODEL = 'google/gemini-3.5-flash-lite';

export const SettingsPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [kickChannel, setKickChannel] = useState('');
  const [twitchChannel, setTwitchChannel] = useState('');
  const [youtubeChannel, setYoutubeChannel] = useState('');
  const [kickToken, setKickToken] = useState('');
  const [twitchToken, setTwitchToken] = useState('');
  const [youtubeToken, setYoutubeToken] = useState('');
  const [customPromptOverride, setCustomPromptOverride] = useState('');
  const [botMuted, setBotMuted] = useState(false);
  const [mentionOnly, setMentionOnly] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState<{ valid: boolean; message: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchSettings();
        if (res.openrouter_api_key) setApiKey(res.openrouter_api_key);
        if (res.kick_channel_id) setKickChannel(res.kick_channel_id);
        if (res.twitch_channel_id) setTwitchChannel(res.twitch_channel_id);
        if (res.youtube_channel_id) setYoutubeChannel(res.youtube_channel_id);
        if (res.custom_prompt_override) setCustomPromptOverride(res.custom_prompt_override);
        setBotMuted(Boolean(res.bot_muted));
        setMentionOnly(Boolean(res.mention_only));
      } catch (e: any) {
        setErrorMessage(e?.message || 'Failed to load settings');
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await updateSettings({
        openrouter_api_key: apiKey.includes('…') ? undefined : apiKey,
        selected_model: DEFAULT_MODEL,
        kick_channel_id: kickChannel,
        twitch_channel_id: twitchChannel,
        youtube_channel_id: youtubeChannel,
        kick_bot_token: kickToken || undefined,
        twitch_bot_token: twitchToken || undefined,
        youtube_bot_token: youtubeToken || undefined,
        custom_prompt_override: customPromptOverride,
        bot_muted: botMuted,
        mention_only: mentionOnly,
      });
      setStatusMessage('Settings saved');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e: any) {
      setErrorMessage(e?.response?.data?.detail || e?.message || 'Save failed');
    }
    setIsSaving(false);
  };

  const handleTestKey = async () => {
    if (!apiKey.trim() || apiKey.includes('…')) return;
    setIsTestingKey(true);
    try {
      setKeyTestStatus(await testApiKey(apiKey));
    } catch {
      setKeyTestStatus({ valid: false, message: 'Connection failed' });
    }
    setIsTestingKey(false);
  };

  const handleConnect = async (platform: string) => {
    try {
      await handleSave();
      const res = await connectPlatform(platform);
      setStatusMessage(`${platform} connected: ${res.connected}`);
    } catch (e: any) {
      setErrorMessage(e?.response?.data?.detail || `Failed to connect ${platform}`);
    }
  };

  return (
    <AnimatedPage className="space-y-6">
      <div>
        <h2 className="text-heading text-text-primary flex items-center gap-2 font-display">
          <Settings className="w-5 h-5 text-accent-emerald" />
          Settings & Integrations
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Model locked to {DEFAULT_MODEL}. Connect Kick, Twitch, or YouTube for live replies.
        </p>
      </div>

      {statusMessage && <Badge variant="emerald">{statusMessage}</Badge>}
      {errorMessage && <Badge variant="rose">{errorMessage}</Badge>}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="space-y-3">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              OpenRouter API Key (operator)
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input mono type="password" placeholder="sk-or-v1-..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              </div>
              <Button variant="secondary" size="md" onClick={handleTestKey} loading={isTestingKey} disabled={!apiKey.trim()}>
                Test Key
              </Button>
            </div>
            {keyTestStatus && (
              <div className={`flex items-center gap-2 text-sm ${keyTestStatus.valid ? 'text-accent-emerald' : 'text-accent-rose'}`}>
                {keyTestStatus.valid ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {keyTestStatus.message}
              </div>
            )}
          </div>

          <Card className="space-y-3 p-4">
            <div className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" /> Channels
            </div>
            <Input label="Kick channel ID" value={kickChannel} onChange={(e) => setKickChannel(e.target.value)} />
            <Input label="Kick bot token" type="password" value={kickToken} onChange={(e) => setKickToken(e.target.value)} />
            <Button variant="secondary" size="sm" onClick={() => handleConnect('kick')}>Connect Kick</Button>
            <Input label="Twitch channel ID" value={twitchChannel} onChange={(e) => setTwitchChannel(e.target.value)} />
            <Input label="Twitch bot OAuth" type="password" value={twitchToken} onChange={(e) => setTwitchToken(e.target.value)} />
            <Button variant="secondary" size="sm" onClick={() => handleConnect('twitch')}>Connect Twitch</Button>
            <Input label="YouTube channel / live chat ID" value={youtubeChannel} onChange={(e) => setYoutubeChannel(e.target.value)} />
            <Input label="YouTube OAuth token" type="password" value={youtubeToken} onChange={(e) => setYoutubeToken(e.target.value)} />
            <Button variant="secondary" size="sm" onClick={() => handleConnect('youtube')}>Connect YouTube</Button>
          </Card>

          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary">Custom prompt override</label>
            <textarea
              className="w-full min-h-[100px] bg-surface-1 border border-border rounded-md p-3 text-sm text-text-primary"
              value={customPromptOverride}
              onChange={(e) => setCustomPromptOverride(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={botMuted} onChange={(e) => setBotMuted(e.target.checked)} />
            Mute bot (no live replies)
          </label>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={mentionOnly} onChange={(e) => setMentionOnly(e.target.checked)} />
            Mention / !ask only
          </label>

          <Button variant="primary" onClick={handleSave} loading={isSaving}>Save settings</Button>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-accent-emerald" /> Kick setup
            </h3>
            <ol className="text-sm text-text-secondary space-y-2 list-decimal list-inside">
              <li>Create a Kick bot account and API token.</li>
              <li>Paste chatroom / channel ID above.</li>
              <li>Click Connect Kick — bot will reply in live chat.</li>
            </ol>
            <a className="text-accent-emerald text-sm inline-flex items-center gap-1" href="https://docs.kick.com" target="_blank" rel="noreferrer">
              Kick docs <ExternalLink className="w-3 h-3" />
            </a>
          </Card>
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">Twitch setup</h3>
            <ol className="text-sm text-text-secondary space-y-2 list-decimal list-inside">
              <li>Register a Twitch app; enable EventSub chat scopes.</li>
              <li>Paste broadcaster user ID + bot OAuth token.</li>
              <li>Connect Twitch from this panel.</li>
            </ol>
          </Card>
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">YouTube setup</h3>
            <ol className="text-sm text-text-secondary space-y-2 list-decimal list-inside">
              <li>Enable YouTube Data API liveChat.</li>
              <li>Paste live chat ID + OAuth token.</li>
              <li>Connect YouTube (Pro plan).</li>
            </ol>
          </Card>
        </div>
      </div>
    </AnimatedPage>
  );
};
