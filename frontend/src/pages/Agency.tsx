import React, { useEffect, useState } from 'react';
import { AnimatedPage } from '../components/ui/AnimatedPage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { createOrganization, fetchMyOrganization } from '../services/api';
import { apiErrorMessage } from '../utils/apiError';

export const AgencyPage: React.FC = () => {
  const [org, setOrg] = useState<any>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setOrg(await fetchMyOrganization());
      setError(null);
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Unable to load agency workspace'));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    try {
      await createOrganization(name);
      await load();
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Create failed — Pro/Agency required'));
    }
  };

  return (
    <AnimatedPage className="space-y-6">
      <div>
        <h2 className="text-heading font-display">Agency</h2>
        <p className="text-sm text-text-secondary mt-1">
          Multi-streamer workspaces and mod seats (Phase 3 foundation).
        </p>
      </div>
      {error && <p className="text-accent-rose text-sm">{error}</p>}
      {org?.organization ? (
        <Card className="p-4 space-y-2">
          <p className="font-display text-xl">{org.organization.name}</p>
          <p className="text-xs text-text-tertiary">slug: {org.organization.slug}</p>
          <p className="text-sm text-text-secondary">Members: {org.members?.length ?? 0}</p>
        </Card>
      ) : (
        <Card className="p-4 space-y-3 max-w-md">
          <Input label="Organization name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button variant="primary" onClick={create}>
            Create agency workspace
          </Button>
        </Card>
      )}
    </AnimatedPage>
  );
};
