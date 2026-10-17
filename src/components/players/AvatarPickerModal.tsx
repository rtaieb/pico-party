import React, { useState } from 'react';
import { PRESET_AVATARS } from '../../data/avatars';
import type { PresetAvatar } from '../../data/avatars';
import type { FrameColor, Player } from '../../types';
import { ClayButton } from '../common/ClayButton';
import { X, Sparkles, Check } from 'lucide-react';
import { sound } from '../../utils/sound';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePlayer: (player: Player) => void;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  onClose,
  onSavePlayer,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<PresetAvatar>(PRESET_AVATARS[0]);
  const [frameColor, setFrameColor] = useState<FrameColor>(PRESET_AVATARS[0].frameColor);
  const [playerName, setPlayerName] = useState<string>(PRESET_AVATARS[0].name);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: PresetAvatar) => {
    sound.playPop();
    setSelectedPreset(preset);
    setFrameColor(preset.frameColor);
    // Suggest the default name if current name was also a default
    if (PRESET_AVATARS.some((p) => p.name === playerName) || !playerName.trim()) {
      setPlayerName(preset.name);
    }
  };

  const handleColorChange = (color: FrameColor) => {
    sound.playPop();
    setFrameColor(color);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = playerName.trim() || selectedPreset.name;

    const newPlayer: Player = {
      id: `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: finalName,
      avatarId: selectedPreset.id,
      frameColor,
      createdAt: Date.now(),
    };

    sound.playVictory();
    onSavePlayer(newPlayer);
    onClose();
  };

  const colorOptions: { color: FrameColor; label: string; bg: string }[] = [
    { color: 'blue', label: 'Bleu', bg: 'bg-blue-500' },
    { color: 'red', label: 'Rouge', bg: 'bg-rose-500' },
    { color: 'yellow', label: 'Jaune', bg: 'bg-amber-400' },
    { color: 'green', label: 'Vert', bg: 'bg-emerald-400' },
    { color: 'purple', label: 'Violet', bg: 'bg-purple-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#fcf9f4] rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border-2 border-white max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-purple-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎭</span>
            <h3 className="font-heading font-bold text-lg text-slate-800">
              Nouveau Joueur
            </h3>
          </div>
          <button
            onClick={() => {
              sound.playPop();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 active:scale-90"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Player Name Input */}
          <div>
            <label className="block font-heading font-semibold text-sm text-slate-700 mb-1.5">
              Pseudo du joueur
            </label>
            <input
              type="text"
              maxLength={15}
              placeholder="Ex: Raphaël, Alex, Chloé..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white border-2 border-purple-100 focus:border-purple-400 focus:outline-none font-semibold text-slate-800 shadow-inner text-base"
              autoFocus
            />
          </div>

          {/* Avatar Preset Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-heading font-semibold text-sm text-slate-700">
                Choisis ton avatar
              </label>
              <span className="text-xs text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-full">
                {PRESET_AVATARS.length} personnages
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2.5 sm:gap-3 max-h-56 overflow-y-auto p-1.5 rounded-2xl bg-white/60 border border-purple-100/60">
              {PRESET_AVATARS.map((preset) => {
                const isSelected = selectedPreset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`
                      relative p-1.5 rounded-xl flex flex-col items-center transition-all cursor-pointer
                      ${
                        isSelected
                          ? 'bg-purple-100/90 ring-3 ring-purple-500 shadow-md scale-105'
                          : 'bg-white hover:bg-purple-50/50 border border-slate-200/60'
                      }
                    `}
                  >
                    <div className="w-12 h-14 rounded-lg overflow-hidden flex items-center justify-center bg-slate-50">
                      {preset.svg('w-full h-full object-contain')}
                    </div>
                    <span className="text-[11px] font-heading font-semibold text-slate-700 mt-1 truncate w-full text-center">
                      {preset.name}
                    </span>
                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frame Color Selector */}
          <div>
            <label className="block font-heading font-semibold text-sm text-slate-700 mb-2">
              Couleur du clapet
            </label>
            <div className="flex items-center gap-3">
              {colorOptions.map((opt) => (
                <button
                  key={opt.color}
                  type="button"
                  onClick={() => handleColorChange(opt.color)}
                  className={`
                    w-9 h-9 rounded-xl ${opt.bg} flex items-center justify-center text-white shadow-sm transition-transform active:scale-90
                    ${frameColor === opt.color ? 'ring-3 ring-purple-600 ring-offset-2 scale-110' : 'opacity-70 hover:opacity-100'}
                  `}
                  title={opt.label}
                >
                  {frameColor === opt.color && <Check className="w-4 h-4 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <ClayButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={!playerName.trim()}
            >
              <Sparkles className="w-5 h-5 mr-1" />
              Créer le joueur
            </ClayButton>
          </div>
        </form>
      </div>
    </div>
  );
};
