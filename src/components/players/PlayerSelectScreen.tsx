import React, { useState } from 'react';
import type { GameId, Player } from '../../types';
import { getGameById } from '../../data/games';
import { GuessWhoCard } from '../common/GuessWhoCard';
import { ClayButton } from '../common/ClayButton';
import { AvatarPickerModal } from './AvatarPickerModal';
import { UserPlus, Play, CheckSquare, Trash2, AlertCircle } from 'lucide-react';
import { sound } from '../../utils/sound';

interface PlayerSelectScreenProps {
  gameId: GameId;
  players: Player[];
  selectedPlayerIds: string[];
  onTogglePlayer: (playerId: string) => void;
  onSelectAll: () => void;
  onAddPlayer: (player: Player) => void;
  onDeletePlayer: (playerId: string) => void;
  onStartGame: () => void;
  onBack: () => void;
}

export const PlayerSelectScreen: React.FC<PlayerSelectScreenProps> = ({
  gameId,
  players,
  selectedPlayerIds,
  onTogglePlayer,
  onSelectAll,
  onAddPlayer,
  onDeletePlayer,
  onStartGame,
  onBack,
}) => {
  const game = getGameById(gameId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);

  const selectedCount = selectedPlayerIds.length;
  const canStart = selectedCount >= 1;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Game Header Recap */}
      <div className="clay-card p-4 sm:p-5 bg-gradient-to-r from-purple-50 via-white to-pink-50 flex items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
            Jeu sélectionné
          </span>
          <h2 className="font-heading font-bold text-lg sm:text-xl text-slate-800">
            {game.title}
          </h2>
          <p className="text-xs text-slate-500 line-clamp-1">{game.subtitle}</p>
        </div>
        <button
          onClick={onBack}
          className="text-xs font-semibold text-purple-600 hover:text-purple-800 underline flex-shrink-0 cursor-pointer"
        >
          Changer de jeu
        </button>
      </div>

      {/* Players Selection Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="font-heading font-bold text-lg text-slate-800">
              Qui participe ?
            </h3>
            <p className="text-xs text-slate-500">
              Cochez les joueurs autour de l'écran
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playPop();
                setIsManageMode(!isManageMode);
              }}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                isManageMode
                  ? 'bg-rose-100 text-rose-700 font-bold'
                  : 'bg-white/80 text-slate-600 hover:bg-white'
              }`}
              title="Gérer les joueurs"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                sound.playPop();
                onSelectAll();
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/80 text-slate-600 hover:bg-white flex items-center gap-1 transition-all cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 text-purple-500" />
              <span>Tout cocher</span>
            </button>
          </div>
        </div>

        {/* Player Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {players.map((player) => {
            const isSelected = selectedPlayerIds.includes(player.id);
            return (
              <div key={player.id} className="flex justify-center">
                <GuessWhoCard
                  player={player}
                  selected={isSelected}
                  onSelect={() => onTogglePlayer(player.id)}
                  showDelete={isManageMode}
                  onDelete={() => onDeletePlayer(player.id)}
                  size="md"
                />
              </div>
            );
          })}

          {/* Add New Player Button Card */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                sound.playPop();
                setIsModalOpen(true);
              }}
              className="w-28 sm:w-36 h-40 sm:h-44 rounded-2xl border-2 border-dashed border-purple-300 hover:border-purple-500 bg-white/50 hover:bg-white/90 flex flex-col items-center justify-center gap-2 text-purple-600 cursor-pointer transition-all active:scale-95 group shadow-sm"
            >
              <div className="w-12 h-12 rounded-full bg-purple-100 group-hover:bg-purple-200 flex items-center justify-center transition-colors">
                <UserPlus className="w-6 h-6" />
              </div>
              <span className="font-heading font-bold text-xs sm:text-sm text-center px-2">
                + Nouveau Joueur
              </span>
              <span className="text-[10px] text-slate-400">
                Avatar Qui est-ce ?
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Multiplayer Info Tip */}
      <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/60 flex items-start gap-2.5 text-xs text-amber-800">
        <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
        <p>
          <strong>Conseil :</strong> Sélectionnez 2 joueurs ou plus pour une vraie confrontation locale ! Vous pouvez jouer à tour de rôle ou tous ensemble.
        </p>
      </div>

      {/* Floating Bottom Bar for Mobile Ergonomics */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/85 backdrop-blur-md border-t border-purple-100 z-20 flex justify-center">
        <div className="w-full max-w-md">
          <ClayButton
            onClick={() => {
              sound.playVictory();
              onStartGame();
            }}
            variant="primary"
            size="xl"
            fullWidth
            disabled={!canStart}
          >
            <Play className="w-6 h-6 fill-current" />
            <span>
              {canStart
                ? `Lancer la partie (${selectedCount} joueur${selectedCount > 1 ? 's' : ''})`
                : 'Sélectionnez au moins 1 joueur'}
            </span>
          </ClayButton>
        </div>
      </div>

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSavePlayer={(newPlayer) => {
          onAddPlayer(newPlayer);
        }}
      />
    </div>
  );
};
