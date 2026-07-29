import React, { useState } from 'react';
import { AnimatedPage } from '../components/ui/AnimatedPage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { login, register } from '../services/api';

interface AuthPageProps {
  onAuthed: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthed }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(null);
    // #region agent log
    fetch('http://127.0.0.1:7942/ingest/e3668dee-f4dc-494a-9139-847d0d2fe9e3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2cb32b'},body:JSON.stringify({sessionId:'2cb32b',runId:'post-fix',hypothesisId:'C',location:'Auth.tsx:submit',message:'auth submit clicked',data:{mode,host:window.location.host,href:window.location.href},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, displayName);
      onAuthed();
    } catch (e: any) {
      // #region agent log
      fetch('http://127.0.0.1:7942/ingest/e3668dee-f4dc-494a-9139-847d0d2fe9e3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2cb32b'},body:JSON.stringify({sessionId:'2cb32b',runId:'post-fix',hypothesisId:'D',location:'Auth.tsx:submit:catch',message:'auth UI caught error',data:{mode,status:e?.response?.status,detail:e?.response?.data?.detail,msg:e?.message},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setError(e?.response?.data?.detail || e?.message || 'Auth failed');
    }
    setLoading(false);
  };

  const oauth = (provider: string) => {
    window.location.href = `/api/v1/auth/oauth/${provider}`;
  };

  return (
    <AnimatedPage className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-8 rounded-xl border border-border bg-surface-1/80 backdrop-blur">
        <div>
          <p className="font-display text-3xl text-text-primary tracking-tight">StreamAI</p>
          <p className="text-text-secondary text-sm mt-2">
            Sign in to connect chat and go live with your AI co-host.
          </p>
        </div>
        {error && <p className="text-accent-rose text-sm">{error}</p>}
        {mode === 'register' && (
          <Input label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        )}
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button variant="primary" className="w-full" loading={loading} onClick={submit}>
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </Button>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" size="sm" onClick={() => oauth('google')}>Google</Button>
          <Button variant="secondary" size="sm" onClick={() => oauth('twitch')}>Twitch</Button>
          <Button variant="secondary" size="sm" onClick={() => oauth('kick')}>Kick</Button>
        </div>
        <button
          className="text-sm text-accent-emerald"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
        </button>
      </div>
    </AnimatedPage>
  );
};
