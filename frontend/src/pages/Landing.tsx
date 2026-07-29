import React from 'react';
import { Button } from '../components/ui/Button';

interface LandingPageProps {
  onEnter: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  return (
    <div className="relative min-h-screen overflow-hidden text-text-primary">
      <div className="absolute inset-0 bg-brand-atmosphere" />
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_20%_20%,rgba(62,207,142,0.25),transparent_50%),radial-gradient(ellipse_at_80%_0%,rgba(240,199,94,0.18),transparent_45%)]" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-24">
        <p className="font-display text-5xl md:text-7xl tracking-tight leading-[0.95]">
          StreamAI
        </p>
        <p className="mt-6 max-w-xl text-lg text-text-secondary">
          Your live chat co-host. Filters noise, answers from your Knowledge Base, and posts
          replies into Kick, Twitch, and YouTube — without wasting tokens on “gg”.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button variant="primary" size="md" onClick={onEnter}>
            Open dashboard
          </Button>
          <a href="#pricing" className="inline-flex items-center px-4 text-sm text-accent-emerald">
            See pricing
          </a>
        </div>

        <div className="mt-24 grid md:grid-cols-3 gap-8" id="features">
          {[
            ['Cost filter', 'Heuristic drop of chatter before the LLM ever runs.'],
            ['Live replies', 'Answers land in chat — not only on a dashboard.'],
            ['Crypto billing', 'Oxapay Free / Pro / Agency with fair reply quotas.'],
          ].map(([t, b]) => (
            <div key={t}>
              <h3 className="font-display text-xl">{t}</h3>
              <p className="text-sm text-text-secondary mt-2">{b}</p>
            </div>
          ))}
        </div>

        <div className="mt-24" id="pricing">
          <h2 className="font-display text-3xl">Simple plans</h2>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            {[
              ['Free', '1 platform · 50 replies/day'],
              ['Pro', 'All platforms · 2k replies/day'],
              ['Agency', 'Teams · multi-streamer'],
            ].map(([name, desc]) => (
              <div key={name} className="border border-border rounded-lg p-5 bg-surface-1/60">
                <p className="font-display text-2xl">{name}</p>
                <p className="text-sm text-text-secondary mt-2">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
