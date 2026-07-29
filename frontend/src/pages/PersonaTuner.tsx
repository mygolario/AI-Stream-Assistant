import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Sparkles, Sliders, CheckCircle2 } from 'lucide-react';

import { Button } from '../components/ui/Button';
import { AnimatedPage } from '../components/ui/AnimatedPage';
import { useStreamContext } from '../context/StreamContext';
import { fetchPersonas, activatePersona, updateSettings, createPersona } from '../services/api';

export interface PersonaPreset {
  id?: number;
  name: string;
  description?: string;
  emoji?: string;
  defaultPrompt?: string;
  system_prompt?: string;
  temperature?: number;
}

const defaultPresets: PersonaPreset[] = [
  {
    name: 'Sarcastic Gamer',
    description: 'Witty, playful, and slightly roasting. Keeps chat fun with gaming humor.',
    emoji: '🎮',
    defaultPrompt: 'You are a witty, sarcastic gaming co-host. Keep responses short, funny, and roast-friendly.',
  },
  {
    name: 'Friendly Assistant',
    description: 'Warm, helpful, and welcoming. Perfect for community-oriented streams.',
    emoji: '🤝',
    defaultPrompt: 'You are a friendly, helpful stream assistant. Be warm, welcoming, and informative.',
  },
  {
    name: 'Hype-Man',
    description: 'High energy, excitable, and keeps the chat pumped. Great for tournaments.',
    emoji: '🔥',
    defaultPrompt: 'You are an enthusiastic hype-man! Use lots of energy and emojis. GET HYPED!',
  },
  {
    name: 'Professional',
    description: 'Clean, concise, and informative. Ideal for educational or tech streams.',
    emoji: '💼',
    defaultPrompt: 'You are a professional, concise assistant. Give accurate, well-structured answers.',
  },
];

export const PersonaTunerPage: React.FC = () => {
  const { activePersona, setActivePersona } = useStreamContext();
  const [selectedPersona, setSelectedPersona] = useState(activePersona);
  const [customPrompt, setCustomPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [presets, setPresets] = useState<PersonaPreset[]>(defaultPresets);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchPersonas();
        if (Array.isArray(res) && res.length > 0) {
          setPresets(
            res.map((p: any) => ({
              id: p.id,
              name: p.name,
              description: p.system_prompt?.slice(0, 80),
              emoji: '🎙️',
              defaultPrompt: p.system_prompt,
              system_prompt: p.system_prompt,
              temperature: p.temperature,
            }))
          );
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const preset = presets.find((p) => p.name === selectedPersona);
    if (preset) setCustomPrompt(preset.defaultPrompt || preset.system_prompt || '');
  }, [selectedPersona, presets]);

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const match = presets.find((p) => p.name === selectedPersona);
      if (match?.id) {
        await activatePersona(match.id);
        await updateSettings({ custom_prompt_override: customPrompt });
      } else {
        const created = await createPersona({
          name: selectedPersona,
          system_prompt: customPrompt,
          temperature,
        });
        if (created?.id) await activatePersona(created.id);
      }
      setActivePersona(selectedPersona);
      setStatusMessage('Persona configuration saved');
    } catch (e: any) {
      setStatusMessage(e?.response?.data?.detail || e?.message || 'Save failed');
    }
    setIsSaving(false);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <AnimatedPage className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-heading text-text-primary flex items-center gap-2">
          <Bot className="w-5 h-5 text-accent-blue" />
          Bot Persona
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Configure your AI co-host personality, prompt, and creativity level.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Persona Presets (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Persona Presets
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {presets.map((preset, i) => {
              const isSelected = selectedPersona === preset.name;
              return (
                <motion.div
                  key={preset.name}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                >
                  <button
                    onClick={() => setSelectedPersona(preset.name)}
                    className={`
                      w-full text-left p-4 rounded-lg border transition-all duration-150
                      ${isSelected
                        ? 'bg-accent-blue-muted border-accent-blue/30 border-l-2 border-l-accent-blue'
                        : 'bg-surface-1 border-border hover:border-border-hover hover:bg-surface-2'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg">{preset.emoji}</span>
                      <span className={`text-sm font-medium ${isSelected ? 'text-accent-blue' : 'text-text-primary'}`}>
                        {preset.name}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-accent-blue ml-auto" />
                      )}
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {preset.description}
                    </p>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right: Configuration (2 cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* System Prompt */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-text-tertiary" />
              System Prompt Override
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={6}
              className="w-full font-mono text-xs bg-surface-1 border border-border rounded-md p-3 text-text-primary placeholder:text-text-tertiary hover:border-border-hover focus:border-accent-blue focus:ring-1 focus:ring-accent-blue outline-none transition-colors"
              placeholder="Custom system prompt..."
            />
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-text-tertiary" />
                Creativity Temperature
              </label>
              <span className="font-mono text-xs text-accent-blue font-medium">
                {temperature.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1.2}
              step={0.05}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-text-tertiary">
              <span>Precise (0.1)</span>
              <span>Creative (1.2)</span>
            </div>
          </div>

          {/* Save */}
          <Button
            variant="primary"
            size="lg"
            loading={isSaving}
            onClick={handleSave}
            className="w-full"
          >
            Save Persona Configuration
          </Button>

          {/* Status */}
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-accent-emerald-muted text-accent-emerald text-xs border border-accent-emerald/20"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {statusMessage}
            </motion.div>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
};
