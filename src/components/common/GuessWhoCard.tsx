import React from 'react';
import type { Player, FrameColor } from '../../types';
import { getAvatarById } from '../../data/avatars';
import { Check, X } from 'lucide-react';
import { sound } from '../../utils/sound';

interface GuessWhoCardProps {
  player: Player;
  selected?: boolean;
  onSelect?: (player: Player) => void;
  onDelete?: (playerId: string) => void;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  showDelete?: boolean;
}

export const GuessWhoCard: React.FC<GuessWhoCardProps> = ({
  player,
  selected = false,
  onSelect,
  onDelete,
  size = 'md',
  interactive = true,
  showDelete = false,
}) => {
  const avatar = getAvatarById(player.avatarId);
  const frameColor: FrameColor = player.frameColor || avatar.frameColor || 'blue';

  const frameClasses: Record<FrameColor, string> = {
    blue: 'guess-who-frame',
    red: 'guess-who-frame guess-who-frame-red',
    yellow: 'guess-who-frame guess-who-frame-yellow',
    green: 'guess-who-frame guess-who-frame-green',
    purple: 'guess-who-frame bg-gradient-to-b from-[#a29bfe] to-[#6c5ce7] shadow-[#6c5ce7]/35',
  };

  const sizeClasses = {
    sm: 'w-24 sm:w-28',
    md: 'w-28 sm:w-36',
    lg: 'w-36 sm:w-44',
  }[size];

  const avatarHeightClasses = {
    sm: 'h-20',
    md: 'h-24 sm:h-28',
    lg: 'h-32 sm:h-36',
  }[size];

  const handleClick = () => {
    if (interactive && onSelect) {
      sound.playPop();
      onSelect(player);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playPop();
    if (onDelete) {
      onDelete(player.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        relative select-none transition-all duration-200
        ${sizeClasses}
        ${interactive ? 'cursor-pointer active:scale-95 hover:-translate-y-1' : ''}
        ${selected ? 'ring-4 ring-purple-400 ring-offset-2 scale-[1.02]' : 'opacity-85 hover:opacity-100'}
      `}
    >
      {/* Qui est-ce ? Plastic Flip Frame */}
      <div className={`${frameClasses[frameColor]} flex flex-col items-center`}>
        {/* Top flap hinge notch */}
        <div className="w-8 h-1.5 bg-white/40 rounded-full mb-1"></div>

        {/* Inner Card */}
        <div className={`w-full ${avatarHeightClasses} guess-who-card-inner relative flex items-center justify-center p-1`}>
          {avatar.svg('w-full h-full object-contain')}
        </div>

        {/* Bottom Name Label Slot */}
        <div className="w-full mt-2 bg-white rounded-lg py-1 px-1.5 shadow-inner text-center border border-black/5">
          <p className="font-heading font-bold text-xs sm:text-sm text-slate-800 truncate">
            {player.name}
          </p>
        </div>

        {/* Selected Checkmark Badge */}
        {selected && (
          <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md border-2 border-white animate-bounce">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
        )}

        {/* Delete Player Button (if enabled) */}
        {showDelete && onDelete && (
          <button
            onClick={handleDelete}
            className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md border border-white hover:bg-rose-600 active:scale-90"
            title="Supprimer ce profil"
            aria-label="Supprimer ce profil"
          >
            <X className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        )}
      </div>
    </div>
  );
};
