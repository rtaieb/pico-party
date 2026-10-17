import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Player, PlayerRanking } from '../../../types';
import { GuessWhoCard } from '../../common/GuessWhoCard';
import { ClayButton } from '../../common/ClayButton';
import {
  Volume2,
  RotateCcw,
  ArrowRight,
  Trophy,
  AlertCircle,
} from 'lucide-react';
import { sound } from '../../../utils/sound';
import {
  type Difficulty,
  type RhythmPattern,
  type RhythmAttemptEvaluation,
  TIMEOUT_AFTER_LAST_NOTE_MS,
  generateRhythmPattern,
  evaluateRhythmAttempt,
} from '../../../utils/rhythmLogic';

interface RhythmGameProps {
  players: Player[];
  onFinish: (rankings: PlayerRanking[]) => void;
  onExit?: () => void;
}

type Step = 'setup' | 'playing' | 'player_result';

interface PlayerRoundRecord {
  roundNumber: number;
  evaluation: RhythmAttemptEvaluation;
}

const DIFFICULTY_META: Record<
  Difficulty,
  {
    label: string;
  }
> = {
  easy: {
    label: 'Facile',
  },
  normal: {
    label: 'Normal',
  },
  hard: {
    label: 'Difficile',
  },
};

export const RhythmGame: React.FC<RhythmGameProps> = ({ players, onFinish }) => {
  // Setup state
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [totalRounds, setTotalRounds] = useState<number>(3);
  const [step, setStep] = useState<Step>('setup');

  // Round & Player turn state
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(0); // 0-indexed
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [currentPattern, setCurrentPattern] = useState<RhythmPattern | null>(null);

  // Store all evaluations by playerId -> array of round records
  const [historyByPlayer, setHistoryByPlayer] = useState<Record<string, PlayerRoundRecord[]>>({});
  const [lastEvaluation, setLastEvaluation] = useState<RhythmAttemptEvaluation | null>(null);

  // Playback / Listening state
  const [hasListenedOnce, setHasListenedOnce] = useState<boolean>(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [previewBeadIndex, setPreviewBeadIndex] = useState<number>(-1);
  const [drumBounce, setDrumBounce] = useState<boolean>(false);

  // Player Tapping state
  const [playerTapsMs, setPlayerTapsMs] = useState<number[]>([]);
  const [tapRippleKey, setTapRippleKey] = useState<number>(0);
  const [remainingGraceSec, setRemainingGraceSec] = useState<number | null>(null);

  // Refs for accurate high-precision timing and cleanup
  const previewTimersRef = useRef<number[]>([]);
  const firstTapTimeRef = useRef<number | null>(null);
  const playerTapsRef = useRef<number[]>([]);
  const timeoutTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const isTurnFinishedRef = useRef<boolean>(false);

  const clearAllTimers = useCallback(() => {
    previewTimersRef.current.forEach((id) => window.clearTimeout(id));
    previewTimersRef.current = [];
    if (timeoutTimerRef.current !== null) {
      window.clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // Reset turn state for the active player
  const preparePlayerTurn = useCallback(() => {
    clearAllTimers();
    setHasListenedOnce(false);
    setIsPlayingPreview(false);
    setPreviewBeadIndex(-1);
    setDrumBounce(false);
    setPlayerTapsMs([]);
    playerTapsRef.current = [];
    firstTapTimeRef.current = null;
    isTurnFinishedRef.current = false;
    setRemainingGraceSec(null);
    setLastEvaluation(null);
  }, [clearAllTimers]);

  // Start the game from setup
  const handleStartGame = () => {
    sound.playPop();
    const initialHistory: Record<string, PlayerRoundRecord[]> = {};
    players.forEach((p) => {
      initialHistory[p.id] = [];
    });
    setHistoryByPlayer(initialHistory);

    const firstPattern = generateRhythmPattern(difficulty, 0, totalRounds);
    setCurrentPattern(firstPattern);
    setCurrentRoundIndex(0);
    setCurrentPlayerIndex(0);
    preparePlayerTurn();
    setStep('playing');
  };

  // Trigger a short visual bounce on the 3D drum
  const triggerDrumBounce = useCallback(() => {
    setDrumBounce(true);
    const id = window.setTimeout(() => setDrumBounce(false), 150);
    previewTimersRef.current.push(id);
  }, []);

  // Listen / Re-listen to the current round's rhythm (allowed at will before first tap)
  const handleListenRhythm = () => {
    if (!currentPattern || playerTapsRef.current.length > 0) return;

    // Clear any ongoing preview
    previewTimersRef.current.forEach((id) => window.clearTimeout(id));
    previewTimersRef.current = [];

    setIsPlayingPreview(true);
    setPreviewBeadIndex(-1);

    currentPattern.notes.forEach((note, idx) => {
      const timerId = window.setTimeout(() => {
        sound.playDrumHit(false);
        setPreviewBeadIndex(idx);
        triggerDrumBounce();
      }, note.targetTimestampMs + 80);
      previewTimersRef.current.push(timerId);
    });

    // End of preview
    const finishPreviewId = window.setTimeout(() => {
      setIsPlayingPreview(false);
      setHasListenedOnce(true);
      setPreviewBeadIndex(-1);
    }, currentPattern.totalDurationMs + 550);
    previewTimersRef.current.push(finishPreviewId);
  };

  // Finalize the current player's attempt (either on reaching N notes or after 5s timeout)
  const finishPlayerAttempt = useCallback(
    (tapsMs: number[], timedOut: boolean) => {
      if (isTurnFinishedRef.current || !currentPattern) return;
      isTurnFinishedRef.current = true;
      clearAllTimers();

      if (timedOut) {
        sound.playTimeout();
      }

      const evaluation = evaluateRhythmAttempt(currentPattern, tapsMs, timedOut);
      setLastEvaluation(evaluation);

      const activePlayer = players[currentPlayerIndex];
      setHistoryByPlayer((prev) => {
        const existing = prev[activePlayer.id] || [];
        return {
          ...prev,
          [activePlayer.id]: [
            ...existing,
            {
              roundNumber: currentRoundIndex + 1,
              evaluation,
            },
          ],
        };
      });

      setStep('player_result');
    },
    [clearAllTimers, currentPattern, currentPlayerIndex, currentRoundIndex, players]
  );

  // Player taps the big "TAP !" pad
  const handlePlayerTap = useCallback(() => {
    if (
      step !== 'playing' ||
      !currentPattern ||
      !hasListenedOnce ||
      isPlayingPreview ||
      isTurnFinishedRef.current
    ) {
      return;
    }

    const now = performance.now();
    sound.playDrumHit(true);
    triggerDrumBounce();
    setTapRippleKey((k) => k + 1);

    const N = currentPattern.notes.length;

    if (firstTapTimeRef.current === null) {
      // 1st tap: anchors t0 = 0ms and schedules the auto-stop timeout
      // (totalDurationMs + 5000ms after the last note they should have made)
      firstTapTimeRef.current = now;
      const updatedTaps = [0];
      playerTapsRef.current = updatedTaps;
      setPlayerTapsMs(updatedTaps);

      if (N <= 1) {
        finishPlayerAttempt(updatedTaps, false);
        return;
      }

      const totalAllowedMs = currentPattern.totalDurationMs + TIMEOUT_AFTER_LAST_NOTE_MS;
      const deadline = now + totalAllowedMs;

      // Timeout 5s after the theoretical last note
      timeoutTimerRef.current = window.setTimeout(() => {
        finishPlayerAttempt(playerTapsRef.current, true);
      }, totalAllowedMs);

      // Update grace countdown indicator during the last 5 seconds
      countdownIntervalRef.current = window.setInterval(() => {
        const remainingMs = deadline - performance.now();
        if (remainingMs <= TIMEOUT_AFTER_LAST_NOTE_MS && remainingMs > 0) {
          setRemainingGraceSec(Math.ceil(remainingMs / 1000));
        } else {
          setRemainingGraceSec(null);
        }
      }, 150);
    } else {
      // Subsequent tap
      const elapsedMs = now - firstTapTimeRef.current;
      const updatedTaps = [...playerTapsRef.current, elapsedMs];
      playerTapsRef.current = updatedTaps;
      setPlayerTapsMs(updatedTaps);

      // Stop immediately once the player has made the right number of notes (N)
      if (updatedTaps.length >= N) {
        finishPlayerAttempt(updatedTaps, false);
      }
    }
  }, [
    step,
    currentPattern,
    hasListenedOnce,
    isPlayingPreview,
    triggerDrumBounce,
    finishPlayerAttempt,
  ]);

  // Allow Spacebar / Enter to tap during playing phase
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (step !== 'playing') return;
      if (e.code === 'Space' || e.code === 'Enter') {
        if (hasListenedOnce && !isPlayingPreview && !e.repeat) {
          e.preventDefault();
          handlePlayerTap();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, hasListenedOnce, isPlayingPreview, handlePlayerTap]);

  // Proceed to next player or next round or final podium
  const handleNextStep = () => {
    sound.playPop();

    const isLastPlayerOfRound = currentPlayerIndex >= players.length - 1;
    const isLastRound = currentRoundIndex >= totalRounds - 1;

    if (!isLastPlayerOfRound) {
      // Next player on the SAME rhythm for this round
      setCurrentPlayerIndex((idx) => idx + 1);
      preparePlayerTurn();
      setStep('playing');
    } else if (!isLastRound) {
      // Next round: generate a new rhythm with updated note count & proportions
      const nextRoundIdx = currentRoundIndex + 1;
      const nextPattern = generateRhythmPattern(difficulty, nextRoundIdx, totalRounds);
      setCurrentRoundIndex(nextRoundIdx);
      setCurrentPlayerIndex(0);
      setCurrentPattern(nextPattern);
      preparePlayerTurn();
      setStep('playing');
    } else {
      // All rounds finished -> compute final rankings across all rounds
      sound.playVictory();
      const playerSummaries = players.map((p) => {
        const records = historyByPlayer[p.id] || [];
        const avgScore =
          records.length > 0
            ? records.reduce((sum, r) => sum + r.evaluation.scoreExact, 0) / records.length
            : 0;
        const avgError =
          records.length > 0
            ? Math.round(
                records.reduce((sum, r) => sum + r.evaluation.avgErrorMs, 0) / records.length
              )
            : 999;
        const roundedScore = Math.round(avgScore * 10) / 10;

        const roundBreakdown = records
          .map((r) => `T${r.roundNumber}: ${Math.round(r.evaluation.scorePercentage)}%`)
          .join(' • ');

        return {
          player: p,
          avgScore,
          roundedScore,
          avgError,
          roundBreakdown,
        };
      });

      // Sort by highest average score percentage, then lowest average ms error
      playerSummaries.sort((a, b) => {
        if (Math.abs(b.avgScore - a.avgScore) > 0.05) {
          return b.avgScore - a.avgScore;
        }
        return a.avgError - b.avgError;
      });

      const rankings: PlayerRanking[] = playerSummaries.map((item, idx) => ({
        playerId: item.player.id,
        rank: idx + 1,
        scoreText: `${item.roundedScore}%`,
        subText: `${item.roundBreakdown} (Écart moy. ±${item.avgError}ms)`,
        highlight: idx === 0,
      }));

      onFinish(rankings);
    }
  };

  const activePlayer = players[currentPlayerIndex];
  const isLastPlayerOfRound = currentPlayerIndex >= players.length - 1;
  const isLastRound = currentRoundIndex >= totalRounds - 1;
  const hasStartedTapping = playerTapsMs.length > 0;

  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-300">
      {/* =====================================================================
          1. SETUP SCREEN (DIFFICULTY & NUMBER OF ROUNDS)
         ===================================================================== */}
      {step === 'setup' && (
        <div className="space-y-5">
          {/* Hero Banner */}
          <div className="clay-card p-6 bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 text-center border-2 border-white">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white flex items-center justify-center shadow-md mb-3 border-2 border-white">
              <span className="text-3xl" role="img" aria-label="Tam-Tam">
                🥁
              </span>
            </div>
            <h2 className="font-heading font-bold text-2xl text-slate-800">
              Tam-Tam Studio
            </h2>
            <p className="text-sm text-slate-600 max-w-xs mx-auto mt-1">
              Écoutez le rythme et reproduisez-le sur le tam-tam !
            </p>
          </div>

          {/* Difficulty Selector */}
          <div className="clay-card p-5 space-y-3">
            <label className="block font-heading font-bold text-sm text-slate-700 text-center">
              Niveau de difficulté
            </label>

            <div className="grid grid-cols-3 gap-2.5">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((diff) => {
                const meta = DIFFICULTY_META[diff];
                const isSelected = difficulty === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => {
                      sound.playPop();
                      setDifficulty(diff);
                    }}
                    className={`py-3 px-2 rounded-2xl flex items-center justify-center font-heading transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-b from-teal-500 to-emerald-600 text-white shadow-lg ring-3 ring-teal-200 scale-105'
                        : 'bg-white hover:bg-teal-50/60 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span className="font-bold text-sm">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Number of Rounds Selector (Default 3) */}
          <div className="clay-card p-5">
            <label className="block font-heading font-bold text-sm text-slate-700 text-center mb-3">
              Nombre de tours
            </label>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {[1, 3, 5, 7].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    sound.playPop();
                    setTotalRounds(r);
                  }}
                  className={`py-2.5 rounded-2xl font-heading font-bold text-base transition-all cursor-pointer ${
                    totalRounds === r
                      ? 'bg-teal-500 text-white shadow-md ring-3 ring-teal-200 scale-105'
                      : 'bg-white hover:bg-teal-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  {r} {r > 1 ? 'tours' : 'tour'}
                </button>
              ))}
            </div>

            {/* Custom stepper */}
            <div className="flex items-center justify-between gap-3 px-2">
              <span className="text-xs font-semibold text-slate-500">Personnalisé :</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    sound.playPop();
                    setTotalRounds((r) => Math.max(1, r - 1));
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  -
                </button>
                <span className="font-heading font-bold text-base text-teal-700 min-w-[4.5rem] text-center">
                  {totalRounds} tour{totalRounds > 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    sound.playPop();
                    setTotalRounds((r) => Math.min(10, r + 1));
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Players Order Preview */}
          <div className="clay-card p-4">
            <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
              Ordre de passage ({players.length} joueur{players.length > 1 ? 's' : ''})
            </p>
            <div className="flex items-center gap-2 overflow-x-auto py-2">
              {players.map((p, idx) => (
                <div key={p.id} className="flex-shrink-0 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-teal-600 mb-1">
                    #{idx + 1}
                  </span>
                  <GuessWhoCard player={p} size="sm" interactive={false} />
                </div>
              ))}
            </div>
          </div>

          <ClayButton
            onClick={handleStartGame}
            variant="primary"
            size="xl"
            fullWidth
          >
            Lancer la partie ({totalRounds} tour{totalRounds > 1 ? 's' : ''} •{' '}
            {DIFFICULTY_META[difficulty].label})
          </ClayButton>
        </div>
      )}

      {/* =====================================================================
          2. PLAYING SCREEN — DESIGN 1 "TAM-TAM STUDIO"
         ===================================================================== */}
      {step === 'playing' && currentPattern && (
        <div className="rounded-3xl p-4 sm:p-5 bg-gradient-to-b from-[#dcfce7] via-[#ccfbf1] to-[#e0f2fe] border-2 border-white shadow-inner space-y-5 text-center">
          {/* Top Tour & Player Pill Header (Matches Design 1 Mockup) */}
          <div className="space-y-2">
            <div className="font-heading font-extrabold text-sm sm:text-base text-slate-800 tracking-tight">
              Tour {currentRoundIndex + 1}/{totalRounds} - {DIFFICULTY_META[difficulty].label}
            </div>

            <div className="inline-flex items-center gap-2.5 bg-white/95 px-4 py-1.5 rounded-full shadow-md border-2 border-white">
              <div className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold text-xs">
                {currentPlayerIndex + 1}
              </div>
              <span className="font-heading font-bold text-sm text-slate-800">
                Joueur : {activePlayer.name}
              </span>
              <span className="text-[11px] font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                {currentPattern.notes.length} notes
              </span>
            </div>
          </div>

          {/* Center White 3D Clay Card with Bouncing Drum, Listen Button & Progress Beads */}
          <div className="clay-card p-6 bg-white/95 border-2 border-white shadow-xl max-w-xs mx-auto space-y-5">
            {/* 3D Turquoise Drum Illustration with Sound Waves */}
            <div className="relative h-32 flex items-center justify-center">
              {/* Left Sound Waves */}
              <div
                className={`flex items-center gap-1 mr-2 transition-opacity duration-150 ${
                  drumBounce || isPlayingPreview ? 'opacity-100' : 'opacity-35'
                }`}
              >
                <span
                  className={`w-1.5 h-14 rounded-full bg-teal-300 transition-transform duration-150 ${
                    drumBounce ? 'scale-y-110' : 'scale-y-90'
                  }`}
                />
                <span
                  className={`w-1.5 h-10 rounded-full bg-teal-400 transition-transform duration-150 ${
                    drumBounce ? 'scale-y-125' : 'scale-y-95'
                  }`}
                />
                <span
                  className={`w-1.5 h-6 rounded-full bg-teal-500 transition-transform duration-150 ${
                    drumBounce ? 'scale-y-125' : 'scale-y-100'
                  }`}
                />
              </div>

              {/* 3D Drum SVG */}
              <div
                className={`transition-transform duration-150 ${
                  drumBounce ? 'scale-110 -translate-y-1.5' : 'scale-100'
                }`}
              >
                <svg
                  viewBox="0 0 140 120"
                  className="w-32 h-28 drop-shadow-md overflow-visible"
                >
                  {/* Drum shadow */}
                  <ellipse cx="70" cy="108" rx="42" ry="7" fill="rgba(13, 148, 136, 0.18)" />

                  {/* Drum Body (Rotated slightly like Design 1) */}
                  <g transform="rotate(8 70 65)">
                    {/* Bottom Rim */}
                    <ellipse cx="70" cy="84" rx="42" ry="15" fill="#0f766e" />
                    {/* Cylinder Body */}
                    <path
                      d="M 28 50 L 28 84 A 42 15 0 0 0 112 84 L 112 50 Z"
                      fill="#2dd4bf"
                    />
                    {/* Vertical Stripes / Lugs */}
                    <line x1="42" y1="56" x2="42" y2="92" stroke="#ccfbf1" strokeWidth="3.5" strokeLinecap="round" />
                    <line x1="60" y1="60" x2="60" y2="96" stroke="#ccfbf1" strokeWidth="3.5" strokeLinecap="round" />
                    <line x1="80" y1="60" x2="80" y2="96" stroke="#ccfbf1" strokeWidth="3.5" strokeLinecap="round" />
                    <line x1="98" y1="56" x2="98" y2="92" stroke="#ccfbf1" strokeWidth="3.5" strokeLinecap="round" />

                    {/* Top Rim */}
                    <ellipse cx="70" cy="50" rx="44" ry="16" fill="#14b8a6" />
                    {/* Drum Skin */}
                    <ellipse
                      cx="70"
                      cy="50"
                      rx="37"
                      ry="12"
                      fill={drumBounce ? '#fef08a' : '#ccfbf1'}
                    />

                    {/* Drumsticks */}
                    <line
                      x1="34"
                      y1="14"
                      x2="62"
                      y2="46"
                      stroke="#0d9488"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    />
                    <circle cx="63" cy="47" r="5" fill="#0f766e" />

                    <line
                      x1="108"
                      y1="20"
                      x2="78"
                      y2="47"
                      stroke="#0d9488"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    />
                    <circle cx="77" cy="48" r="5" fill="#0f766e" />
                  </g>
                </svg>
              </div>

              {/* Right Sound Waves */}
              <div
                className={`flex items-center gap-1 ml-2 transition-opacity duration-150 ${
                  drumBounce || isPlayingPreview ? 'opacity-100' : 'opacity-35'
                }`}
              >
                <span
                  className={`w-1.5 h-6 rounded-full bg-teal-500 transition-transform duration-150 ${
                    drumBounce ? 'scale-y-125' : 'scale-y-100'
                  }`}
                />
                <span
                  className={`w-1.5 h-10 rounded-full bg-teal-400 transition-transform duration-150 ${
                    drumBounce ? 'scale-y-125' : 'scale-y-95'
                  }`}
                />
                <span
                  className={`w-1.5 h-14 rounded-full bg-teal-300 transition-transform duration-150 ${
                    drumBounce ? 'scale-y-110' : 'scale-y-90'
                  }`}
                />
              </div>
            </div>

            {/* Listen / Re-listen Button (Unlimited before first tap) */}
            <div>
              <button
                type="button"
                onClick={handleListenRhythm}
                disabled={hasStartedTapping}
                className={`w-full py-2.5 px-4 rounded-2xl font-heading font-bold text-sm transition-all flex items-center justify-center gap-2 border-2 ${
                  hasStartedTapping
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    : isPlayingPreview
                    ? 'bg-teal-100 text-teal-800 border-teal-300 shadow-inner cursor-pointer'
                    : !hasListenedOnce
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-white shadow-md hover:brightness-105 animate-pulse cursor-pointer'
                    : 'bg-teal-50 hover:bg-teal-100 text-teal-900 border-teal-200 shadow-sm cursor-pointer active:scale-95'
                }`}
              >
                {isPlayingPreview ? (
                  <>
                    <Volume2 className="w-4 h-4 animate-bounce text-teal-700" />
                    <span>Écoute en cours... ({previewBeadIndex + 1}/{currentPattern.notes.length})</span>
                  </>
                ) : !hasListenedOnce ? (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>Écouter le rythme</span>
                  </>
                ) : hasStartedTapping ? (
                  <span>Reproduction en cours...</span>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 text-teal-700" />
                    <span>Réécouter le rythme</span>
                  </>
                )}
              </button>
            </div>

            {/* Glowing Progress Beads (N notes) */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center gap-2 px-1">
                {currentPattern.notes.map((note, idx) => {
                  const isLitByPlayer = idx < playerTapsMs.length;
                  const isLitByPreview = isPlayingPreview && idx <= previewBeadIndex;
                  const isLit = isLitByPlayer || isLitByPreview;

                  return (
                    <div
                      key={note.index}
                      className={`w-5 h-5 rounded-full transition-all duration-150 ${
                        isLit
                          ? 'bg-emerald-400 border-2 border-white shadow-[0_0_12px_rgba(52,211,153,0.9)] scale-110'
                          : 'bg-slate-200 border-2 border-slate-300/60'
                      }`}
                    />
                  );
                })}
              </div>

              <div className="text-[11px] font-semibold text-slate-500">
                {hasStartedTapping ? (
                  <span className="text-teal-700 font-bold">
                    {playerTapsMs.length} / {currentPattern.notes.length} notes tapées
                  </span>
                ) : hasListenedOnce ? (
                  <span>
                    Prêt ! Tape les <strong>{currentPattern.notes.length} notes</strong> sur le bouton ci-dessous
                  </span>
                ) : (
                  <span>Écoute d'abord le rythme avant de jouer</span>
                )}
              </div>
            </div>
          </div>

          {/* 5-second Grace Timeout Indicator if player paused before finishing all notes */}
          <div className="min-h-6 flex items-center justify-center">
            {remainingGraceSec !== null && (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300 animate-pulse">
                <AlertCircle className="w-3.5 h-3.5" />
                Fin du tour automatique dans {remainingGraceSec}s...
              </span>
            )}
          </div>

          {/* Huge Circular 3D Tactile Drum Pad "TAP !" (Design 1 Centerpiece) */}
          <div className="py-2 flex items-center justify-center relative">
            {/* Concentric Ripple Waves on Tap */}
            {tapRippleKey > 0 && (
              <div
                key={tapRippleKey}
                className="w-48 h-48 rounded-full border-4 border-teal-400/60 absolute pointer-events-none animate-ping"
              />
            )}

            {/* Side acoustic arcs around the button */}
            <div className="relative flex items-center justify-center">
              <button
                type="button"
                disabled={!hasListenedOnce || isPlayingPreview}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handlePlayerTap();
                }}
                className={`w-44 h-44 sm:w-48 sm:h-48 rounded-full font-heading font-black text-3xl sm:text-4xl transition-all select-none touch-none flex flex-col items-center justify-center gap-1 relative ${
                  !hasListenedOnce || isPlayingPreview
                    ? 'bg-slate-200 text-slate-400 border-8 border-slate-300 opacity-60 cursor-not-allowed'
                    : 'bg-gradient-to-b from-[#34d399] to-[#0d9488] text-teal-950 border-[10px] border-[#0f766e] shadow-[0_12px_0_#115e59,0_20px_30px_rgba(13,148,136,0.35)] active:translate-y-2 active:shadow-[0_4px_0_#115e59,0_10px_15px_rgba(13,148,136,0.25)] cursor-pointer'
                }`}
              >
                {/* Inner glossy rim highlight */}
                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-2 border-white/40 flex flex-col items-center justify-center pointer-events-none">
                  <span className="tracking-wider drop-shadow-sm">TAP !</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-teal-900/80 mt-0.5">
                    {!hasListenedOnce
                      ? 'Écoute requise'
                      : isPlayingPreview
                      ? 'Écoute...'
                      : `${playerTapsMs.length}/${currentPattern.notes.length}`}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          3. PLAYER RESULT SCREEN (SCORE + DESIGN 1 DOT COMPARISON STRIP)
         ===================================================================== */}
      {step === 'player_result' && currentPattern && lastEvaluation && (
        <div className="space-y-5 text-center animate-in zoom-in-95 duration-200">
          {/* Score Summary Card */}
          <div className="clay-card p-6 bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 border-2 border-white">
            <div className="flex justify-center mb-2">
              <GuessWhoCard player={activePlayer} size="sm" interactive={false} />
            </div>

            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
              Tour {currentRoundIndex + 1}/{totalRounds} • Score de {activePlayer.name}
            </span>

            <div className="mt-1">
              <div className="font-heading font-black text-5xl text-slate-800 tracking-tight">
                {lastEvaluation.scorePercentage}%
              </div>
              <p className="text-sm font-bold text-teal-800 mt-1">
                {lastEvaluation.feedback}
              </p>
            </div>

            {/* Key Metrics Badges */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <div className="bg-white px-3 py-1.5 rounded-xl border border-teal-100 text-xs font-bold text-slate-700">
                Notes :{' '}
                <span className="text-teal-700">
                  {lastEvaluation.tappedCount}/{lastEvaluation.targetCount}
                </span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-xl border border-teal-100 text-xs font-bold text-slate-700">
                Écart moy. :{' '}
                <span className="text-teal-700">±{lastEvaluation.avgErrorMs} ms</span>
              </div>
            </div>
          </div>

          {/* Simplified Dot Strip (Single Colored Dot + ms Difference) */}
          <div className="clay-card p-4 bg-white border-2 border-teal-100 text-left space-y-3">
            <h4 className="font-heading font-bold text-xs text-slate-600 uppercase tracking-wider">
              Détail note par note
            </h4>

            {/* Visual Dot Strip + Per-Note Timing */}
            <div className="overflow-x-auto pb-2">
              <div className="flex items-stretch gap-2 min-w-fit">
                {lastEvaluation.noteEvaluations.map((ne, idx) => {
                  const isStart = idx === 0;
                  const isMissed = ne.status === 'missed';
                  const sign = (ne.diffMs || 0) >= 0 ? '+' : '';
                  const diffRounded = ne.diffMs !== null ? Math.round(ne.diffMs) : null;

                  return (
                    <div
                      key={ne.index}
                      className={`min-w-[3.8rem] p-2.5 rounded-2xl border flex flex-col items-center justify-between gap-2 text-center ${
                        isMissed
                          ? 'bg-rose-50/70 border-rose-200'
                          : ne.isPerfect
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-slate-400">
                        #{idx + 1}
                      </span>

                      {/* Single Player Colored Dot */}
                      <div className="my-0.5">
                        {isMissed ? (
                          <div className="w-4 h-4 rounded-full border-2 border-dashed border-rose-400 flex items-center justify-center text-[9px] text-rose-500 font-bold">
                            ✕
                          </div>
                        ) : (
                          <div
                            className={`w-4 h-4 rounded-full shadow-sm ${
                              ne.isPerfect ? 'bg-teal-500' : 'bg-amber-500'
                            }`}
                          />
                        )}
                      </div>

                      {/* Timing Difference Label */}
                      <div className="text-[11px] font-heading font-bold">
                        {isMissed ? (
                          <span className="text-rose-500">Manquée</span>
                        ) : isStart ? (
                          <span className="text-teal-700">0ms</span>
                        ) : (
                          <span
                            className={
                              ne.isPerfect ? 'text-teal-600' : 'text-amber-700'
                            }
                          >
                            {sign}
                            {diffRounded}ms
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Multiplayer Round Standings */}
          {players.length > 1 && (
            <div className="clay-card p-4 text-left">
              <h4 className="font-heading font-bold text-xs text-slate-500 uppercase mb-2 px-1">
                Scores du Tour {currentRoundIndex + 1}/{totalRounds}
              </h4>
              <div className="space-y-1.5">
                {players.slice(0, currentPlayerIndex + 1).map((p) => {
                  const records = historyByPlayer[p.id] || [];
                  const currentRoundRecord = records.find(
                    (r) => r.roundNumber === currentRoundIndex + 1
                  );
                  if (!currentRoundRecord) return null;
                  const avgTotal =
                    records.reduce((s, r) => s + r.evaluation.scorePercentage, 0) /
                    records.length;

                  return (
                    <div
                      key={p.id}
                      className={`p-2.5 rounded-xl flex items-center justify-between text-xs ${
                        p.id === activePlayer.id
                          ? 'bg-teal-100/80 font-bold text-teal-950'
                          : 'bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-teal-700 font-bold">
                          Tour : {currentRoundRecord.evaluation.scorePercentage}%
                        </span>
                        {totalRounds > 1 && (
                          <span className="text-[11px] text-slate-500">
                            (Moy. {Math.round(avgTotal * 10) / 10}%)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Next Action Button */}
          <div className="pt-1">
            <ClayButton
              onClick={handleNextStep}
              variant="primary"
              size="xl"
              fullWidth
            >
              {!isLastPlayerOfRound ? (
                <>
                  <span>Joueur suivant : {players[currentPlayerIndex + 1].name}</span>
                  <ArrowRight className="w-5 h-5 ml-1" />
                </>
              ) : !isLastRound ? (
                <>
                  <span>
                    Passer au Tour {currentRoundIndex + 2}/{totalRounds}
                  </span>
                  <ArrowRight className="w-5 h-5 ml-1" />
                </>
              ) : (
                <>
                  <Trophy className="w-5 h-5 mr-1" />
                  <span>Voir le Podium Final !</span>
                </>
              )}
            </ClayButton>
          </div>
        </div>
      )}
    </div>
  );
};
