import React, { useEffect, useState } from 'react';
import { AnimatedPage } from '../components/ui/AnimatedPage';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  connectPlatform,
  disconnectPlatform,
  fetchConnectorStatus,
  updateSettings,
  fetchSettings,
} from '../services/api';

export const LiveControlPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setStatus(await fetchConnectorStatus());
      const s = await fetchSettings();
      setMuted(Boolean(s.bot_muted));
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Unable to load connector status');
    }
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, []);

  const toggleMute = async () => {
    const next = !muted;
    await updateSettings({ bot_muted: next });
    setMuted(next);
  };

  const platforms = ['kick', 'twitch', 'youtube'] as const;

  return (
    <AnimatedPage className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-heading font-display">Live Control</h2>
          <p className="text-sm text-text-secondary mt-1">Connect platforms, mute the bot, watch status.</p>
        </div>
        <Button variant={muted ? 'danger' : 'secondary'} onClick={toggleMute}>
          {muted ? 'Unmute bot' : 'Mute bot'}
        </Button>
      </div>
      {error && <p className="text-accent-rose text-sm">{error}</p>}
      <div className="grid md:grid-cols-3 gap-4">
        {platforms.map((p) => {
          const conn = status?.connectors?.[p];
          const allowed = status?.allowed_platforms?.includes(p);
          return (
            <Card key={p} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display capitalize">{p}</h3>
                <Badge variant={conn?.connected ? 'emerald' : 'default'}>
                  {conn?.connected ? 'Live' : 'Offline'}
                </Badge>
              </div>
              <p className="text-xs text-text-tertiary">Channel: {conn?.channel_id || '—'}</p>
              {!allowed && <p className="text-xs text-accent-amber">Upgrade to Pro to use {p}.</p>}
              <div className="flex gap-2">
                <Button size="sm" variant="primary" disabled={!allowed} onClick={() => connectPlatform(p).then(refresh)}>
                  Connect
                </Button>
                <Button size="sm" variant="secondary" onClick={() => disconnectPlatform(p).then(refresh)}>
                  Disconnect
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      <Card className="p-4 text-sm text-text-secondary">
        OBS overlay URL: <code className="text-accent-emerald">/api/v1/overlay/obs</code> — add as Browser Source.
      </Card>
    </AnimatedPage>
  );
};
