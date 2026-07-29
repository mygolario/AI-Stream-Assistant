import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Bot, Sparkles, Sliders, CheckCircle2 } from 'lucide-react';
import { fetchPersonas, updateSettings } from '../services/api';
import { useStreamContext } from '../context/StreamContext';

export interface PersonaPreset {
  id: string;
  name: string;
  desc: string;
  prompt?: string;
}

const defaultPresets: PersonaPreset[] = [
  { id: '1', name: 'Sarcastic Gamer', desc: 'Witty, edgy banter, uses gaming terms.', prompt: 'You are a sarcastic gamer co-host who uses edgy banter, gamer lingo, and keeps chat entertained.' },
  { id: '2', name: 'Friendly Assistant', desc: 'Polite, helpful, warm tone for general chat.', prompt: 'You are a friendly, helpful assistant co-host with a warm, welcoming tone for all viewers.' },
  { id: '3', name: 'Hype-Man', desc: 'HIGH ENERGY! ALL CAPS OCCASIONALLY! Hyped for every kill!', prompt: 'You are an ultra-high-energy hype-man co-host! Respond with excitement and hype for every stream moment!' },
  { id: '4', name: 'Professional', desc: 'Concise, clear, non-distracting answers.', prompt: 'You are a professional stream moderator co-host. Provide concise, clear, and informative answers.' },
];

export const PersonaTunerPage: React.FC = () => {
  const { activePersona, setActivePersona } = useStreamContext();
  const [selectedPersona, setSelectedPersona] = useState<string>(activePersona || 'Sarcastic Gamer');
  const [customPrompt, setCustomPrompt] = useState<string>(
    'You are a witty, energetic co-host who speaks gamer lingo and keeps viewers hyped!'
  );
  const [temperature, setTemperature] = useState<number>(0.7);
  const [presets, setPresets] = useState<PersonaPreset[]>(defaultPresets);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadPersonas = async () => {
      try {
        const data = await fetchPersonas();
        if (Array.isArray(data) && data.length > 0) {
          setPresets(data);
        }
      } catch (err) {
        console.warn('API fetchPersonas failed, maintaining default presets:', err);
      }
    };
    loadPersonas();
  }, []);

  const handleSelectPreset = (preset: PersonaPreset) => {
    setSelectedPersona(preset.name);
    setActivePersona(preset.name);
    if (preset.prompt) {
      setCustomPrompt(preset.prompt);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      await updateSettings({
        persona: selectedPersona,
        system_prompt: customPrompt,
        temperature,
      });
      setActivePersona(selectedPersona);
      setStatusMessage('Persona configuration saved successfully!');
    } catch (err) {
      console.warn('API updateSettings failed, updated state locally:', err);
      setActivePersona(selectedPersona);
      setStatusMessage('Persona updated locally.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <Bot className="w-6 h-6 text-purple-400" />
            <span>Bot Personality & Persona Tuner</span>
          </h2>
          <p className="text-sm text-slate-400">Select preset stream personalities or customize system prompt parameters.</p>
        </div>
        {statusMessage && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-1.5 animate-pulse">
            <CheckCircle2 className="w-4 h-4" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Preset Selector */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-200">Preset Personas</h3>
          <div className="space-y-3">
            {presets.map((preset) => (
              <GlassCard
                key={preset.id}
                className={`cursor-pointer transition-all ${
                  selectedPersona === preset.name
                    ? 'border-purple-500 bg-purple-950/20'
                    : 'hover:border-slate-700'
                }`}
              >
                <div onClick={() => handleSelectPreset(preset)}>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-slate-200 text-sm">{preset.name}</h4>
                    {selectedPersona === preset.name && (
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] rounded border border-purple-500/30">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{preset.desc}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Custom Prompt Override */}
        <GlassCard className="space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-200 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>System Prompt Override</span>
            </h3>

            <textarea
              rows={6}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 resize-none font-mono"
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center space-x-1">
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  <span>Creativity Temperature</span>
                </span>
                <span className="font-mono text-purple-400">{temperature}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.2"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full accent-purple-500 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-purple-900/30 disabled:opacity-50"
          >
            {isSaving ? 'Saving Persona...' : 'Save Persona Configuration'}
          </button>
        </GlassCard>
      </div>
    </div>
  );
};
