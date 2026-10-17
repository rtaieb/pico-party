import React, { useState, useEffect, useRef } from 'react';
import type { Player, PlayerRanking } from '../../../types';
import { GuessWhoCard } from '../../common/GuessWhoCard';
import { ClayButton } from '../../common/ClayButton';
import { Timer, Play, ArrowRight, Trophy } from 'lucide-react';
import { sound } from '../../../utils/sound';

interface ChronoGameProps {
  players: Player[];
  onFinish: (rankings: PlayerRanking[]) => void;
  onExit?: () => void;
}

type Step = 'setup' | 'ready' | 'running' | 'player_result';

interface PlayerAttempt {
  player: Player;
  targetSeconds: number;
  buzzedAtMs: number | null;
  differenceMs: number | null;
}

export const ChronoGame: React.FC<ChronoGameProps> = ({
  players,
  onFinish,
}) => {
  const [targetSeconds, setTargetSeconds] = useState<number>(5);
  const [step, setStep] = useState<Step>('setup');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [attempts, setAttempts] = useState<PlayerAttempt[]>([]);

  const startTimeRef = useRef<number>(0);

  // Initialize attempts when players change
  useEffect(() => {
    setAttempts(
      players.map((p) => ({
        player: p,
        targetSeconds,
        buzzedAtMs: null,
        differenceMs: null,
      }))
    );
  }, [players, targetSeconds]);

  const handleStartGameSetup = () => {
    sound.playPop();
    setAttempts(
      players.map((p) => ({
        player: p,
        targetSeconds,
        buzzedAtMs: null,
        differenceMs: null,
      }))
    );
    setCurrentPlayerIndex(0);
    setStep('ready');
  };

  // Player starts the chrono directly (no countdown)
  const handleStartPlayerChrono = () => {
    sound.playPop();
    startTimeRef.current = performance.now();
    setStep('running');
  };

  // Player presses buzzer (stops chrono)
  const handleBuzzer = () => {
    if (step !== 'running') return;

    sound.playBuzzer();
    const finishTime = performance.now();
    const elapsedMs = finishTime - startTimeRef.current;
    const targetMs = targetSeconds * 1000;
    const diffMs = Math.abs(elapsedMs - targetMs);

    const activePlayer = players[currentPlayerIndex];

    const updated = [...attempts];
    updated[currentPlayerIndex] = {
      player: activePlayer,
      targetSeconds,
      buzzedAtMs: elapsedMs,
      differenceMs: diffMs,
    };
    setAttempts(updated);

    // Show score immediately to the player!
    setStep('player_result');
  };

  // Proceed to next player
  const handleNextPlayer = () => {
    sound.playPop();
    setCurrentPlayerIndex((idx) => idx + 1);
    setStep('ready');
  };

  // When all players are done, go to final podium
  const handleFinalizeRankings = () => {
    sound.playVictory();
    // Sort attempts by lowest difference in ms
    const sorted = [...attempts].sort((a, b) => (a.differenceMs || 0) - (b.differenceMs || 0));

    const rankings: PlayerRanking[] = sorted.map((att, index) => {
      const buzzedSec = ((att.buzzedAtMs || 0) / 1000).toFixed(2);
      const diffSec = ((att.differenceMs || 0) / 1000).toFixed(2);
      const isAhead = (att.buzzedAtMs || 0) >= targetSeconds * 1000;
      const sign = isAhead ? '+' : '-';

      return {
        playerId: att.player.id,
        rank: index + 1,
        scoreText: `${buzzedSec}s`,
        subText: `Écart : ${sign}${diffSec}s (Cible ${targetSeconds}s)`,
        highlight: index === 0,
      };
    });

    onFinish(rankings);
  };

  const activePlayer = players[currentPlayerIndex];
  const activeAttempt = attempts[currentPlayerIndex];
  const isLastPlayer = currentPlayerIndex >= players.length - 1;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. SETUP STATE */}
      {step === 'setup' && (
        <div className="space-y-6">
          <div className="clay-card p-6 bg-gradient-to-br from-amber-50 to-orange-50 text-center">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-400 text-slate-900 flex items-center justify-center shadow-md mb-3 border-2 border-white">
              <Timer className="w-9 h-9 stroke-[2.2]" />
            </div>
            <h2 className="font-heading font-bold text-2xl text-slate-800">
              Chrono Mystère
            </h2>
            <p className="text-sm text-slate-600 max-w-xs mx-auto mt-1">
              Réglez la durée cible. Le chrono est totalement masqué : appuyez sur le bouton dès que vous pensez que le temps est écoulé !
            </p>
          </div>

          {/* Target seconds selection */}
          <div className="clay-card p-5">
            <label className="block font-heading font-bold text-sm text-slate-700 text-center mb-3">
              Combien de secondes ?
            </label>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {[3, 5, 7, 10].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => {
                    sound.playPop();
                    setTargetSeconds(sec);
                  }}
                  className={`py-3 rounded-2xl font-heading font-bold text-lg transition-all cursor-pointer ${
                    targetSeconds === sec
                      ? 'bg-amber-400 text-slate-900 shadow-md ring-3 ring-amber-300 scale-105'
                      : 'bg-white hover:bg-amber-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>

            {/* Custom stepper */}
            <div className="flex items-center justify-between gap-3 px-2">
              <span className="text-xs font-semibold text-slate-500">Personnalisé :</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    sound.playPop();
                    setTargetSeconds((s) => Math.max(1, s - 1));
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  -
                </button>
                <span className="font-heading font-bold text-lg text-amber-600 min-w-[3rem] text-center">
                  {targetSeconds} sec
                </span>
                <button
                  onClick={() => {
                    sound.playPop();
                    setTargetSeconds((s) => Math.min(30, s + 1));
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Players in order */}
          <div className="clay-card p-4">
            <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
              Ordre de passage ({players.length} joueur{players.length > 1 ? 's' : ''})
            </p>
            <div className="flex items-center gap-2 overflow-x-auto py-2">
              {players.map((p, idx) => (
                <div key={p.id} className="flex-shrink-0 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-purple-600 mb-1">
                    #{idx + 1}
                  </span>
                  <GuessWhoCard player={p} size="sm" interactive={false} />
                </div>
              ))}
            </div>
          </div>

          <ClayButton
            onClick={handleStartGameSetup}
            variant="yellow"
            size="xl"
            fullWidth
          >
            C'est parti ! ({targetSeconds} secondes)
          </ClayButton>
        </div>
      )}

      {/* 2. READY STATE (NO COUNTDOWN - EXPLICIT START BUTTON) */}
      {step === 'ready' && (
        <div className="min-h-[60vh] flex flex-col items-center justify-between py-4 text-center">
          <div className="w-full space-y-4">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
              Joueur {currentPlayerIndex + 1} sur {players.length}
            </span>

            <div className="flex justify-center pt-2">
              <GuessWhoCard player={activePlayer} size="md" interactive={false} />
            </div>

            <div>
              <h2 className="font-heading font-bold text-2xl text-slate-800">
                À toi de jouer, {activePlayer.name} !
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Objectif : Arrêter le chrono pile à <strong>{targetSeconds} secondes</strong>.
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Le chrono sera complètement invisible. Fiez-vous à votre intuition !
              </p>
            </div>
          </div>

          <div className="w-full max-w-xs pt-6">
            <ClayButton
              onClick={handleStartPlayerChrono}
              variant="primary"
              size="xl"
              fullWidth
            >
              <Play className="w-6 h-6 fill-current mr-1" />
              Démarrer le chrono
            </ClayButton>
          </div>
        </div>
      )}

      {/* 3. RUNNING STATE (NO COUNTDOWN, CHRONO FULLY HIDDEN, NO ANIMATION, NO SOUND) */}
      {step === 'running' && (
        <div className="min-h-[65vh] flex flex-col items-center justify-between py-4 text-center">
          {/* Static Header Badge */}
          <div className="flex items-center gap-2 bg-white/90 px-4 py-2 rounded-full border border-purple-100 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Joueur :</span>
            <span className="font-heading font-bold text-sm text-purple-700">
              {activePlayer.name}
            </span>
            <span className="text-xs text-slate-400">
              (Cible : {targetSeconds}s)
            </span>
          </div>

          {/* Fully Hidden Timer Card - completely static, no animation, no counter */}
          <div className="w-full max-w-xs my-6">
            <div className="clay-card p-8 bg-white border-2 border-purple-100 shadow-md text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
                <Timer className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-xl text-slate-800">
                Chrono en cours...
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Comptez dans votre tête et appuyez sur le bouton quand vous pensez atteindre {targetSeconds} secondes !
              </p>
            </div>
          </div>

          {/* Static Buzzer Button */}
          <div className="w-full max-w-xs">
            <button
              onClick={handleBuzzer}
              className="w-full h-36 sm:h-44 rounded-3xl bg-gradient-to-b from-rose-500 to-red-600 text-white font-heading font-black text-3xl sm:text-4xl shadow-xl shadow-rose-500/30 border-4 border-white active:scale-95 transition-transform cursor-pointer flex flex-col items-center justify-center gap-1.5"
            >
              <div className="w-12 h-1.5 bg-white/50 rounded-full mb-1"></div>
              <span>STOP !</span>
              <span className="text-xs font-bold uppercase tracking-widest text-rose-100">
                Appuyer pour arrêter
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 4. PLAYER RESULT STATE (SHOWN DIRECTLY TO PLAYER AFTER PRESSING BUZZER!) */}
      {step === 'player_result' && activeAttempt && activeAttempt.buzzedAtMs !== null && (
        <div className="space-y-6 text-center animate-in zoom-in-95 duration-200">
          {/* Result Card */}
          <div className="clay-card p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50">
            <div className="flex justify-center mb-3">
              <GuessWhoCard player={activePlayer} size="sm" interactive={false} />
            </div>

            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
              Score de {activePlayer.name}
            </span>

            {/* Time Stopped Display */}
            <div className="mt-2">
              <div className="font-heading font-black text-5xl text-slate-800 tracking-tight">
                {((activeAttempt.buzzedAtMs || 0) / 1000).toFixed(2)}s
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                pour une cible de <strong>{targetSeconds}.00s</strong>
              </p>
            </div>

            {/* Absolute Difference Badge */}
            <div className="mt-4 inline-flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-purple-100">
              <span className="text-xs font-bold text-slate-500">Écart :</span>
              <span className="font-heading font-extrabold text-lg text-purple-700">
                {(activeAttempt.buzzedAtMs || 0) >= targetSeconds * 1000 ? '+' : '-'}
                {((activeAttempt.differenceMs || 0) / 1000).toFixed(2)}s
              </span>
            </div>

            {/* Fun appreciation */}
            <p className="text-sm font-bold text-slate-700 mt-3">
              {(activeAttempt.differenceMs || 0) < 200
                ? '🎯 Incroyable ! Précision de métronome !'
                : (activeAttempt.differenceMs || 0) < 500
                ? '✨ Très impressionnant, tout près !'
                : (activeAttempt.differenceMs || 0) < 1000
                ? '👍 Bien joué, joli sens du rythme !'
                : (activeAttempt.buzzedAtMs || 0) < targetSeconds * 1000
                ? '⚡ Un peu trop pressé !'
                : '🐢 Un peu trop patient !'}
            </p>
          </div>

          {/* Recap of played players so far if multiplayer */}
          {players.length > 1 && (
            <div className="clay-card p-4 text-left">
              <h4 className="font-heading font-bold text-xs text-slate-500 uppercase mb-2 px-1">
                Scores de la manche ({currentPlayerIndex + 1}/{players.length} joueur{players.length > 1 ? 's' : ''})
              </h4>
              <div className="space-y-2">
                {attempts.slice(0, currentPlayerIndex + 1).map((att) => {
                  if (att.buzzedAtMs === null) return null;
                  const isCur = att.player.id === activePlayer.id;
                  const buzzedSec = (att.buzzedAtMs / 1000).toFixed(2);
                  const diffSec = ((att.differenceMs || 0) / 1000).toFixed(2);
                  const isAhead = att.buzzedAtMs >= targetSeconds * 1000;

                  return (
                    <div
                      key={att.player.id}
                      className={`p-2.5 rounded-xl flex items-center justify-between text-xs ${
                        isCur ? 'bg-purple-100/80 font-bold' : 'bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className="truncate">{att.player.name}</span>
                      <div className="flex items-center gap-3">
                        <span>{buzzedSec}s</span>
                        <span className="text-purple-700 font-semibold min-w-[3.5rem] text-right">
                          {isAhead ? '+' : '-'}{diffSec}s
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Next action button */}
          <div className="pt-2">
            {!isLastPlayer ? (
              <ClayButton
                onClick={handleNextPlayer}
                variant="primary"
                size="xl"
                fullWidth
              >
                <span>Joueur suivant : {players[currentPlayerIndex + 1].name}</span>
                <ArrowRight className="w-5 h-5 ml-1" />
              </ClayButton>
            ) : (
              <ClayButton
                onClick={handleFinalizeRankings}
                variant="primary"
                size="xl"
                fullWidth
              >
                <Trophy className="w-5 h-5 mr-1" />
                <span>Voir le Podium Final !</span>
              </ClayButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
