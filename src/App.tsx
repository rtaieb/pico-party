import React, { useState, useEffect } from 'react';
import type { GameId, Player, ScreenState, PlayerRanking } from './types';
import { Header } from './components/common/Header';
import { GameCatalogScreen } from './components/games/GameCatalogScreen';
import { PlayerSelectScreen } from './components/players/PlayerSelectScreen';
import { ChronoGame } from './components/games/chrono/ChronoGame';
import { TraceGame } from './components/games/trace/TraceGame';
import { RhythmGame } from './components/games/rhythm/RhythmGame';
import { TargetGame } from './components/games/target/TargetGame';
import { PodiumScreen } from './components/games/PodiumScreen';
import {
  getStoredPlayers,
  savePlayer,
  deletePlayer,
  getLastSelectedPlayerIds,
  saveLastSelectedPlayerIds,
} from './utils/storage';

export const App: React.FC = () => {
  const [screenState, setScreenState] = useState<ScreenState>({
    type: 'GAME_SELECTION',
  });

  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  // Load persisted players and selection on mount
  useEffect(() => {
    const stored = getStoredPlayers();
    setPlayers(stored);

    const lastSelected = getLastSelectedPlayerIds();
    // Filter to only include existing players
    const valid = lastSelected.filter((id) => stored.some((p) => p.id === id));
    if (valid.length > 0) {
      setSelectedPlayerIds(valid);
    } else if (stored.length > 0) {
      setSelectedPlayerIds(stored.slice(0, 2).map((p) => p.id));
    }
  }, []);

  // Save selected players whenever they change
  const handleTogglePlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) => {
      let updated: string[];
      if (prev.includes(playerId)) {
        updated = prev.filter((id) => id !== playerId);
      } else {
        updated = [...prev, playerId];
      }
      saveLastSelectedPlayerIds(updated);
      return updated;
    });
  };

  const handleSelectAll = () => {
    const allIds = players.map((p) => p.id);
    setSelectedPlayerIds(allIds);
    saveLastSelectedPlayerIds(allIds);
  };

  const handleAddPlayer = (newPlayer: Player) => {
    const updated = savePlayer(newPlayer);
    setPlayers(updated);
    // Automatically select the newly created player
    setSelectedPlayerIds((prev) => {
      const next = [...prev, newPlayer.id];
      saveLastSelectedPlayerIds(next);
      return next;
    });
  };

  const handleDeletePlayer = (playerId: string) => {
    const updated = deletePlayer(playerId);
    setPlayers(updated);
    setSelectedPlayerIds((prev) => {
      const next = prev.filter((id) => id !== playerId);
      saveLastSelectedPlayerIds(next);
      return next;
    });
  };

  // Navigation handlers
  const handleSelectGame = (gameId: GameId) => {
    setScreenState({
      type: 'PLAYER_SELECTION',
      gameId,
    });
  };

  const handleStartGame = () => {
    if (screenState.type !== 'PLAYER_SELECTION') return;
    setScreenState({
      type: 'IN_GAME',
      gameId: screenState.gameId,
      selectedPlayerIds,
    });
  };

  const handleFinishGame = (rankings: PlayerRanking[]) => {
    if (screenState.type !== 'IN_GAME') return;
    setScreenState({
      type: 'PODIUM',
      gameId: screenState.gameId,
      selectedPlayerIds: screenState.selectedPlayerIds,
      results: rankings,
    });
  };

  const handleReplay = () => {
    if (screenState.type !== 'PODIUM') return;
    setScreenState({
      type: 'IN_GAME',
      gameId: screenState.gameId,
      selectedPlayerIds,
    });
  };

  const handleChangeGame = () => {
    setScreenState({ type: 'GAME_SELECTION' });
  };

  const handleChangePlayers = () => {
    if (screenState.type === 'PODIUM' || screenState.type === 'IN_GAME') {
      setScreenState({
        type: 'PLAYER_SELECTION',
        gameId: screenState.gameId,
      });
    } else {
      setScreenState({ type: 'GAME_SELECTION' });
    }
  };

  const handleBack = () => {
    if (screenState.type === 'PLAYER_SELECTION') {
      setScreenState({ type: 'GAME_SELECTION' });
    } else if (screenState.type === 'IN_GAME') {
      setScreenState({
        type: 'PLAYER_SELECTION',
        gameId: screenState.gameId,
      });
    } else if (screenState.type === 'PODIUM') {
      setScreenState({ type: 'GAME_SELECTION' });
    }
  };

  // Filter selected player objects for current game session
  const activeGamePlayers = players.filter((p) =>
    selectedPlayerIds.includes(p.id)
  );

  return (
    <div className="min-h-screen bg-[#f3edf7] text-slate-800 flex justify-center">
      {/* Mobile-first main application container */}
      <main className="w-full max-w-md min-h-screen bg-[#faf6f0] shadow-2xl sm:border-x sm:border-purple-100 flex flex-col relative overflow-x-hidden">
        {/* Global sticky header */}
        <Header
          showBack={screenState.type !== 'GAME_SELECTION'}
          onBack={handleBack}
          title={
            screenState.type === 'PLAYER_SELECTION'
              ? 'Choix des Joueurs'
              : screenState.type === 'IN_GAME'
              ? 'Partie en cours'
              : screenState.type === 'PODIUM'
              ? 'Podium'
              : undefined
          }
        />

        {/* Screen Content Viewport */}
        <div className="flex-1 p-4 sm:p-5">
          {/* SCREEN 1: GAME SELECTION */}
          {screenState.type === 'GAME_SELECTION' && (
            <GameCatalogScreen
              onSelectGame={handleSelectGame}
              playerCount={players.length}
            />
          )}

          {/* SCREEN 2: PLAYER SELECTION */}
          {screenState.type === 'PLAYER_SELECTION' && (
            <PlayerSelectScreen
              gameId={screenState.gameId}
              players={players}
              selectedPlayerIds={selectedPlayerIds}
              onTogglePlayer={handleTogglePlayer}
              onSelectAll={handleSelectAll}
              onAddPlayer={handleAddPlayer}
              onDeletePlayer={handleDeletePlayer}
              onStartGame={handleStartGame}
              onBack={handleBack}
            />
          )}

          {/* SCREEN 3: IN GAME */}
          {screenState.type === 'IN_GAME' && (
            <>
              {screenState.gameId === 'chrono' && (
                <ChronoGame
                  players={activeGamePlayers}
                  onFinish={handleFinishGame}
                  onExit={handleBack}
                />
              )}

              {screenState.gameId === 'trace' && (
                <TraceGame
                  players={activeGamePlayers}
                  onFinish={handleFinishGame}
                  onExit={handleBack}
                />
              )}

              {screenState.gameId === 'rhythm' && (
                <RhythmGame
                  players={activeGamePlayers}
                  onFinish={handleFinishGame}
                  onExit={handleBack}
                />
              )}

              {screenState.gameId === 'target' && (
                <TargetGame
                  players={activeGamePlayers}
                  onFinish={handleFinishGame}
                  onExit={handleBack}
                />
              )}
            </>
          )}

          {/* SCREEN 4: PODIUM */}
          {screenState.type === 'PODIUM' && (
            <PodiumScreen
              gameId={screenState.gameId}
              players={players}
              rankings={screenState.results}
              onReplay={handleReplay}
              onChangeGame={handleChangeGame}
              onChangePlayers={handleChangePlayers}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
