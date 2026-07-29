import React, { useState } from 'react';
import { AnimatedPage } from '../components/ui/AnimatedPage';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const steps = [
  { title: 'Create your account', body: 'Sign in with email or Twitch / Kick / Google.' },
  { title: 'Add Knowledge Base FAQs', body: 'PC specs, Discord, schedule — the facts viewers ask about.' },
  { title: 'Pick a persona', body: 'Sarcastic Gamer, Friendly Assistant, Hype-Man, or Professional.' },
  { title: 'Connect a platform', body: 'Start with Kick, then Twitch and YouTube on Pro.' },
  { title: 'Go live', body: 'Unmute the bot on Live Control and watch replies in chat.' },
];

interface OnboardingPageProps {
  onDone: () => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onDone }) => {
  const [step, setStep] = useState(0);

  return (
    <AnimatedPage className="max-w-2xl mx-auto space-y-6 py-8">
      <p className="font-display text-3xl tracking-tight">Welcome to StreamAI</p>
      <p className="text-text-secondary">Five steps to an honest live co-host.</p>
      <div className="space-y-3">
        {steps.map((s, i) => (
          <Card
            key={s.title}
            className={`p-4 transition ${i === step ? 'border-accent-emerald' : 'opacity-60'}`}
          >
            <p className="text-xs uppercase tracking-wider text-text-tertiary">Step {i + 1}</p>
            <h3 className="font-display text-lg mt-1">{s.title}</h3>
            <p className="text-sm text-text-secondary mt-1">{s.body}</p>
          </Card>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </Button>
        {step < steps.length - 1 ? (
          <Button variant="primary" onClick={() => setStep((s) => s + 1)}>
            Next
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() => {
              localStorage.setItem('asa_onboarded', '1');
              onDone();
            }}
          >
            Enter dashboard
          </Button>
        )}
      </div>
    </AnimatedPage>
  );
};
