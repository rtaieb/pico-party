import React, { useState } from 'react';
import { Volume2, VolumeX, ArrowLeft } from 'lucide-react';
import { sound } from '../../utils/sound';

interface HeaderProps {
  title?: string;
  onBack?: () => void;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onBack,
  showBack = false,
}) => {
  const [isMuted, setIsMuted] = useState(!sound.enabled);

  const toggleSound = () => {
    sound.enabled = !sound.enabled;
    setIsMuted(!sound.enabled);
    if (sound.enabled) {
      sound.playPop();
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-md bg-white/70 border-b border-purple-100/60 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {showBack && onBack ? (
          <button
            onClick={() => {
              sound.playPop();
              onBack();
            }}
            className="w-10 h-10 rounded-full bg-white/90 shadow-sm border border-purple-100 flex items-center justify-center text-slate-700 active:scale-90 transition-transform cursor-pointer"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5 text-purple-600" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-300 via-pink-300 to-purple-400 flex items-center justify-center shadow-md shadow-purple-300/30 border border-white">
              <span className="text-xl">🎈</span>
            </div>
            <div>
              <span className="font-heading text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 bg-clip-text text-transparent">
                PicoParty
              </span>
              <span className="hidden sm:inline-block text-[11px] font-semibold text-purple-400 ml-2 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                Local Multi
              </span>
            </div>
          </div>
        )}

        {showBack && title && (
          <h2 className="font-heading font-semibold text-base sm:text-lg text-slate-800 line-clamp-1">
            {title}
          </h2>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleSound}
          className="w-10 h-10 rounded-full bg-white/90 shadow-sm border border-purple-100 flex items-center justify-center text-slate-600 active:scale-90 transition-transform cursor-pointer"
          title={isMuted ? 'Activer le son' : 'Couper le son'}
          aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-slate-400" />
          ) : (
            <Volume2 className="w-5 h-5 text-purple-600" />
          )}
        </button>
      </div>
    </header>
  );
};
