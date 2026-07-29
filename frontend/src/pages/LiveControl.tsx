import React, { useEffect, useState } from 'react';
import { AnimatedPage } from '../components/ui/AnimatedPage';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import {
  connectPlatform,
  disconnectPlatform,
  fetchConnectorStatus,
  updateSettings,
  fetchSettings,
} from '../services/api';

type Platform = 'kick' | 'twitch' | 'youtube';

export const LiveControlPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [channels, setChannels] = useState<Record<Platform, string>>({
    kick: '',
    twitch: '',
    youtube: '',
  });
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const next = await fetchConnectorStatus();
      setStatus(next);
      try {
        const s = await fetchSettings();
        setMuted(Boolean(s.bot_muted));
        setChannels({
          kick: s.kick_channel_id || '',
          twitch: s.twitch_channel_id || '',
          youtube: s.youtube_channel_id || '',
        });
      } catch {
        // settings may be unavailable; connector status still usable
      }
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

  const handleConnect = async (p: Platform) => {
    setBusy(p);
    setError(null);
    setInfo(null);
    // #region agent log
    fetch('http://127.0.0.1:7942/ingest/e3668dee-f4dc-494a-9139-847d0d2fe9e3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2cb32b'},body:JSON.stringify({sessionId:'2cb32b',runId:'post-fix',hypothesisId:'A',location:'LiveControl.tsx:connect',message:'connect clicked',data:{platform:p,hasChannel:Boolean(channels[p]?.trim())},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    try {
      if (!channels[p]?.trim()) {
        setError(`Enter a ${p} channel ID before connecting.`);
        return;
      }
      const res = await connectPlatform(p, { channel_id: channels[p].trim() });
      if (res?.message) setInfo(res.message);
      else if (res?.connected) setInfo(`${p} connected.`);
      else setInfo(`${p} channel saved (not live yet).`);
      await refresh();
    } catch (e: any) {
      // #region agent log
      fetch('http://127.0.0.1:7942/ingest/e3668dee-f4dc-494a-9139-847d0d2fe9e3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2cb32b'},body:JSON.stringify({sessionId:'2cb32b',runId:'post-fix',hypothesisId:'A',location:'LiveControl.tsx:connect:error',message:'connect failed',data:{platform:p,status:e?.response?.status,detail:e?.response?.data?.detail},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setError(e?.response?.data?.detail || e?.message || `Failed to connect ${p}`);
    } finally {
      setBusy(null);
    }
  };

  const handleDisconnect = async (p: Platform) => {
    setBusy(p);
    setError(null);
    try {
      await disconnectPlatform(p);
      await refresh();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || `Failed to disconnect ${p}`);
    } finally {
      setBusy(null);
    }
  };

  const platforms: Platform[] = ['kick', 'twitch', 'youtube'];

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
      {info && <p className="text-accent-amber text-sm">{info}</p>}
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
              <Input
                label="Channel ID"
                placeholder={p === 'kick' ? 'Kick channel / chatroom id' : `${p} channel id`}
                value={channels[p]}
                onChange={(e) => setChannels((prev) => ({ ...prev, [p]: e.target.value }))}
                mono
              />
              <p className="text-xs text-text-tertiary">
                Connected as: {conn?.channel_id || channels[p] || '—'}
              </p>
              {!allowed && <p className="text-xs text-accent-amber">Upgrade to Pro to use {p}.</p>}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!allowed || busy === p}
                  loading={busy === p}
                  onClick={() => handleConnect(p)}
                >
                  Connect
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy === p}
                  onClick={() => handleDisconnect(p)}
                >
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
