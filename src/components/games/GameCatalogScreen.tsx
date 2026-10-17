import React from 'react';
import type { GameId } from '../../types';
import { MINI_GAMES } from '../../data/games';
import { Timer, Shapes, Drum, Target, Sparkles, Users, Lock, ChevronRight } from 'lucide-react';
import { sound } from '../../utils/sound';

interface GameCatalogScreenProps {
  onSelectGame: (gameId: GameId) => void;
  playerCount: number;
}

export const GameCatalogScreen: React.FC<GameCatalogScreenProps> = ({
  onSelectGame,
  playerCount,
}) => {
  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Hero Greeting Card */}
      <div className="clay-card p-6 bg-gradient-to-br from-amber-50 via-white to-purple-50 text-center relative overflow-hidden">
        <div className="absolute top-2 right-3 opacity-20 text-4xl animate-float">
          🎈
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 mb-2">
          <Sparkles className="w-3.5 h-3.5" /> Multijoueur Local
        </span>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-800 mb-1">
          À quoi joue-t-on ?
        </h1>
        <p className="text-sm text-slate-600 max-w-xs mx-auto">
          Choisis un mini-jeu, rassemble tes amis autour de l'écran et que le meilleur gagne !
        </p>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 bg-white/70 py-1.5 px-3 rounded-full w-fit mx-auto border border-purple-50">
          <Users className="w-3.5 h-3.5 text-purple-500" />
          <span>{playerCount} joueur{playerCount > 1 ? 's' : ''} enregistré{playerCount > 1 ? 's' : ''} en local</span>
        </div>
      </div>

      {/* Mini-Games List */}
      <div className="space-y-4">
        {MINI_GAMES.map((game) => {
          const isChrono = game.id === 'chrono';
          const isRhythm = game.id === 'rhythm';
          const isTarget = game.id === 'target';

          return (
            <div
              key={game.id}
              onClick={() => {
                sound.playPop();
                onSelectGame(game.id);
              }}
              className="clay-card p-5 cursor-pointer hover:scale-[1.01] active:scale-[0.98] transition-all relative overflow-hidden group"
            >
              {/* Decorative pastel corner glow */}
              <div
                className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-40 ${
                  isChrono
                    ? 'bg-amber-300'
                    : isRhythm
                    ? 'bg-teal-300'
                    : isTarget
                    ? 'bg-sky-300'
                    : 'bg-purple-300'
                }`}
              />

              <div className="flex items-start gap-4">
                {/* Game Icon */}
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0 border-2 border-white ${
                    isChrono
                      ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-900 shadow-amber-300/40'
                      : isRhythm
                      ? 'bg-gradient-to-tr from-teal-500 to-emerald-400 text-white shadow-teal-300/40'
                      : isTarget
                      ? 'bg-gradient-to-tr from-sky-500 to-indigo-400 text-white shadow-sky-300/40'
                      : 'bg-gradient-to-tr from-purple-500 to-pink-400 text-white shadow-purple-300/40'
                  }`}
                >
                  {isChrono ? (
                    <Timer className="w-8 h-8 stroke-[2.2]" />
                  ) : isRhythm ? (
                    <Drum className="w-8 h-8 stroke-[2.2]" />
                  ) : isTarget ? (
                    <Target className="w-8 h-8 stroke-[2.2]" />
                  ) : (
                    <Shapes className="w-8 h-8 stroke-[2.2]" />
                  )}
                </div>

                {/* Game Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {game.badge}
                    </span>
                    <span className="text-xs font-semibold text-purple-600 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      1 - 8 joueurs
                    </span>
                  </div>

                  <h2 className="font-heading font-bold text-xl text-slate-800">
                    {game.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mt-0.5">
                    {game.description}
                  </p>
                </div>
              </div>

              {/* Bottom Action Strip */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Parties rapides de 2 min
                </span>
                <div className="flex items-center gap-1 font-heading font-bold text-sm text-purple-600 group-hover:translate-x-1 transition-transform">
                  <span>Jouer</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}

        {/* Coming Soon Teaser */}
        <div className="clay-card p-5 opacity-60 border border-dashed border-purple-200 bg-slate-50/50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-500 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-slate-700 text-base">
              Prochain mini-jeu en préparation...
            </h3>
            <p className="text-xs text-slate-500">
              Tape-Taupe Furtif & Quiz Mémoire arrivent bientôt !
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
