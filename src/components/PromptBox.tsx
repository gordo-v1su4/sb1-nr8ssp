import React, { useState } from 'react';
import { Sparkles, Plus, X, MessageSquareText } from 'lucide-react';

interface Prompt {
  id: string;
  text: string;
  style: string;
  weight: number;
}

export function PromptBox() {
  const [useLyrics, setUseLyrics] = useState(true);
  const [lyricsWeight, setLyricsWeight] = useState(0.5);
  const [prompts, setPrompts] = useState<Prompt[]>([
    { id: '1', text: '', style: 'cinematic', weight: 0.8 }
  ]);

  const addPrompt = () => {
    setPrompts([...prompts, { 
      id: Date.now().toString(),
      text: '',
      style: 'cinematic',
      weight: 0.8
    }]);
  };

  const updatePrompt = (id: string, field: keyof Prompt, value: string | number) => {
    setPrompts(prompts.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const removePrompt = (id: string) => {
    setPrompts(prompts.filter(p => p.id !== id));
  };

  return (
    <div className="glass rounded-2xl p-4 space-y-4">
      <div className="menu-button flex items-center gap-3 p-3 rounded-xl">
        <div className="flex items-center gap-2">
          <MessageSquareText className="w-4 h-4" style={{ color: 'var(--accent-color)' }} />
          <span className="text-sm">Use extracted lyrics</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer ml-auto">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={useLyrics}
            onChange={(e) => setUseLyrics(e.target.checked)}
          />
          <div className="w-9 h-5 bg-white/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-color)]"></div>
        </label>
        {useLyrics && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">Weight:</span>
            <input
              type="number"
              value={lyricsWeight}
              onChange={(e) => setLyricsWeight(parseFloat(e.target.value))}
              min="0"
              max="1"
              step="0.1"
              className="input-outlined w-20 rounded-lg px-3 py-1 text-sm"
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        {prompts.map((prompt) => (
          <div key={prompt.id} className="flex gap-2">
            <input
              type="text"
              value={prompt.text}
              onChange={(e) => updatePrompt(prompt.id, 'text', e.target.value)}
              placeholder="Enter your prompt..."
              className="input-outlined flex-1 rounded-lg px-3 py-2 text-sm"
            />
            
            <select
              value={prompt.style}
              onChange={(e) => updatePrompt(prompt.id, 'style', e.target.value)}
              className="input-outlined w-32 rounded-lg px-3 py-2 text-sm"
            >
              <option value="cinematic">Cinematic</option>
              <option value="anime">Anime</option>
              <option value="abstract">Abstract</option>
              <option value="realistic">Realistic</option>
            </select>

            <input
              type="number"
              value={prompt.weight}
              onChange={(e) => updatePrompt(prompt.id, 'weight', parseFloat(e.target.value))}
              min="0"
              max="1"
              step="0.1"
              className="input-outlined w-20 rounded-lg px-3 py-2 text-sm"
            />

            <button
              onClick={() => removePrompt(prompt.id)}
              className="control-button p-2 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addPrompt}
        className="control-button w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm">Add Prompt</span>
      </button>
    </div>
  );
}