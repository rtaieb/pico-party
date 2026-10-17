import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { GameId, Player, PlayerRanking } from '../../types';
import { getGameById } from '../../data/games';
import { GuessWhoCard } from '../common/GuessWhoCard';
import { ClayButton } from '../common/ClayButton';
import { Trophy, RotateCcw, Home, Users, Crown } from 'lucide-react';
import { sound } from '../../utils/sound';

interface PodiumScreenProps {
  gameId: GameId;
  players: Player[];
  rankings: PlayerRanking[];
  onReplay: () => void;
  onChangeGame: () => void;
  onChangePlayers: () => void;
}

export const PodiumScreen: React.FC<PodiumScreenProps> = ({
  gameId,
  players,
  rankings,
  onReplay,
  onChangeGame,
  onChangePlayers,
}) => {
  const game = getGameById(gameId);

  useEffect(() => {
    sound.playVictory();

    // Launch cheerful pastel confetti!
    const duration = 2.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ff9aa2', '#fed330', '#8de8cd', '#b8a4f9', '#a29bfe'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ff9aa2', '#fed330', '#8de8cd', '#b8a4f9', '#a29bfe'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const getPlayer = (id: string): Player => {
    return players.find((p) => p.id === id) || players[0];
  };

  const first = rankings[0];
  const second = rankings[1];
  const third = rankings[2];

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Celebration Header */}
      <div className="clay-card p-6 bg-gradient-to-br from-amber-100 via-pink-50 to-purple-100 text-center relative overflow-hidden">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-400 text-slate-900 flex items-center justify-center shadow-lg shadow-amber-300/40 mb-3 border-2 border-white animate-bounce">
          <Trophy className="w-9 h-9 stroke-[2.2]" />
        </div>

        <h1 className="font-heading font-black text-2xl sm:text-3xl text-slate-800">
          Podium Final !
        </h1>
        <p className="text-sm font-semibold text-purple-700 mt-1">
          {game.title}
        </p>
      </div>

      {/* Visual Podium Top 3 */}
      <div className="pt-8 pb-4">
        <div className="flex items-end justify-center gap-2 sm:gap-4 px-2">
          {/* 2nd Place */}
          {second && (
            <div className="flex flex-col items-center flex-1 max-w-[110px] sm:max-w-[130px]">
              <div className="relative mb-2">
                <GuessWhoCard
                  player={getPlayer(second.playerId)}
                  size="sm"
                  interactive={false}
                />
                <div className="absolute -top-3 -right-2 w-7 h-7 rounded-full bg-slate-300 text-slate-800 flex items-center justify-center font-heading font-bold text-xs shadow-md border-2 border-white">
                  2e
                </div>
              </div>
              <div className="w-full h-24 bg-gradient-to-b from-slate-200 to-slate-300 rounded-t-2xl shadow-inner flex flex-col items-center justify-center p-2 text-center border-t-2 border-white">
                <span className="font-heading font-black text-lg text-slate-700">
                  {second.scoreText}
                </span>
                <span className="text-[10px] text-slate-500 truncate w-full">
                  {getPlayer(second.playerId).name}
                </span>
              </div>
            </div>
          )}

          {/* 1st Place (Center & Tallest) */}
          {first && (
            <div className="flex flex-col items-center flex-1 max-w-[125px] sm:max-w-[150px] -mt-6">
              <div className="relative mb-2">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-500 animate-bounce">
                  <Crown className="w-7 h-7 fill-amber-400" />
                </div>
                <GuessWhoCard
                  player={getPlayer(first.playerId)}
                  size="md"
                  interactive={false}
                />
                <div className="absolute -top-3 -right-2 w-8 h-8 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center font-heading font-black text-sm shadow-md border-2 border-white">
                  1er
                </div>
              </div>
              <div className="w-full h-32 bg-gradient-to-b from-amber-300 to-amber-400 rounded-t-2xl shadow-inner flex flex-col items-center justify-center p-2 text-center border-t-2 border-white">
                <span className="font-heading font-black text-xl text-slate-900">
                  {first.scoreText}
                </span>
                <span className="text-xs font-bold text-slate-800 truncate w-full">
                  {getPlayer(first.playerId).name}
                </span>
                <span className="text-[10px] text-amber-800 font-semibold mt-0.5">
                  Vainqueur ! 🏆
                </span>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {third && (
            <div className="flex flex-col items-center flex-1 max-w-[110px] sm:max-w-[130px]">
              <div className="relative mb-2">
                <GuessWhoCard
                  player={getPlayer(third.playerId)}
                  size="sm"
                  interactive={false}
                />
                <div className="absolute -top-3 -right-2 w-7 h-7 rounded-full bg-amber-600/80 text-white flex items-center justify-center font-heading font-bold text-xs shadow-md border-2 border-white">
                  3e
                </div>
              </div>
              <div className="w-full h-20 bg-gradient-to-b from-amber-600/30 to-amber-700/40 rounded-t-2xl shadow-inner flex flex-col items-center justify-center p-2 text-center border-t-2 border-white">
                <span className="font-heading font-black text-lg text-slate-800">
                  {third.scoreText}
                </span>
                <span className="text-[10px] text-slate-600 truncate w-full">
                  {getPlayer(third.playerId).name}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Complete Rankings List */}
      <div className="space-y-2">
        <h3 className="font-heading font-bold text-sm text-slate-600 px-2 uppercase tracking-wide">
          Détails des scores
        </h3>
        {rankings.map((r) => {
          const p = getPlayer(r.playerId);
          return (
            <div
              key={r.playerId}
              className={`clay-card p-3 flex items-center justify-between gap-3 ${
                r.rank === 1 ? 'border-2 border-amber-300 bg-amber-50/50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 font-heading font-extrabold text-base text-slate-400 text-center">
                  #{r.rank}
                </span>
                <GuessWhoCard player={p} size="sm" interactive={false} />
                <div>
                  <h4 className="font-heading font-bold text-sm text-slate-800">
                    {p.name}
                  </h4>
                  {r.subText && (
                    <span className="text-[11px] text-slate-500">
                      {r.subText}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="font-heading font-black text-lg text-purple-700">
                  {r.scoreText}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons Floating at bottom on mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/85 backdrop-blur-md border-t border-purple-100 z-20 flex justify-center">
        <div className="w-full max-w-md flex items-center gap-2">
          <ClayButton
            onClick={onReplay}
            variant="primary"
            size="lg"
            fullWidth
          >
            <RotateCcw className="w-5 h-5 mr-1" />
            Rejouer
          </ClayButton>

          <button
            onClick={onChangePlayers}
            className="w-12 h-12 rounded-full bg-white shadow-md border border-purple-100 flex items-center justify-center text-slate-600 active:scale-90 flex-shrink-0 cursor-pointer"
            title="Changer les joueurs"
            aria-label="Changer les joueurs"
          >
            <Users className="w-5 h-5 text-purple-600" />
          </button>

          <button
            onClick={onChangeGame}
            className="w-12 h-12 rounded-full bg-white shadow-md border border-purple-100 flex items-center justify-center text-slate-600 active:scale-90 flex-shrink-0 cursor-pointer"
            title="Menu principal"
            aria-label="Menu principal"
          >
            <Home className="w-5 h-5 text-purple-600" />
          </button>
        </div>
      </div>
    </div>
  );
};
