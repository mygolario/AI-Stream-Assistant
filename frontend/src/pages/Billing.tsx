import React, { useEffect, useState } from 'react';
import { AnimatedPage } from '../components/ui/AnimatedPage';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { checkoutPlan, fetchBillingPlan, sandboxActivate } from '../services/api';
import { apiErrorMessage } from '../utils/apiError';

export const BillingPage: React.FC = () => {
  const [plan, setPlan] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setPlan(await fetchBillingPlan());
      setError(null);
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Sign in to view billing'));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const upgrade = async (target: 'pro' | 'agency') => {
    setBusy(true);
    try {
      const invoice = await checkoutPlan(target);
      if (invoice.sandbox || !invoice.payment_url?.startsWith('http')) {
        await sandboxActivate(target);
        await load();
      } else {
        window.location.href = invoice.payment_url;
      }
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Checkout failed'));
    }
    setBusy(false);
  };

  return (
    <AnimatedPage className="space-y-6">
      <div>
        <h2 className="text-heading font-display">Billing</h2>
        <p className="text-sm text-text-secondary mt-1">Crypto subscriptions via Oxapay. Free → Pro → Agency.</p>
      </div>
      {error && <p className="text-accent-rose text-sm">{error}</p>}
      {plan && (
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-text-secondary">Current plan</p>
            <p className="text-xl font-display capitalize">{plan.plan}</p>
            <p className="text-xs text-text-tertiary mt-1">
              {plan.quota?.used_today ?? 0} / {plan.quota?.daily_limit ?? 0} AI replies today
            </p>
          </div>
          <Badge variant="emerald">{(plan.quota?.platforms || []).join(', ')}</Badge>
        </Card>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <h3 className="font-display text-lg">Pro — $19/mo</h3>
          <ul className="text-sm text-text-secondary space-y-1">
            <li>Kick + Twitch + YouTube</li>
            <li>2,000 AI replies / day</li>
            <li>Custom persona + analytics</li>
          </ul>
          <Button variant="primary" loading={busy} onClick={() => upgrade('pro')}>
            Upgrade with Oxapay
          </Button>
        </Card>
        <Card className="p-5 space-y-3">
          <h3 className="font-display text-lg">Agency — $79/mo</h3>
          <ul className="text-sm text-text-secondary space-y-1">
            <li>Multi-streamer workspaces</li>
            <li>Mod seats</li>
            <li>Shared KB templates</li>
          </ul>
          <Button variant="secondary" loading={busy} onClick={() => upgrade('agency')}>
            Go Agency
          </Button>
        </Card>
      </div>
    </AnimatedPage>
  );
};
