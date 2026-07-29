import React, { useState } from 'react';
import { AnimatedPage } from '../components/ui/AnimatedPage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { login, register } from '../services/api';
import { apiErrorMessage } from '../utils/apiError';

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
    if (mode === 'register' && password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, displayName);
      onAuthed();
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Auth failed'));
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
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={mode === 'register' ? 'At least 8 characters' : undefined}
        />
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
