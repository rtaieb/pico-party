import React, { useState, useEffect, useRef } from 'react';
import type { Player, PlayerRanking } from '../../../types';
import { ClayButton } from '../../common/ClayButton';
import { GuessWhoCard } from '../../common/GuessWhoCard';
import {
  Target,
  CloudFog,
  Play,
  ArrowRight,
  Trophy,
  Sparkles,
  Compass,
  RotateCcw,
} from 'lucide-react';
import { sound } from '../../../utils/sound';

interface TargetGameProps {
  players: Player[];
  onFinish: (rankings: PlayerRanking[]) => void;
  onExit?: () => void;
}

type Phase = 'setup' | 'player_ready' | 'memorize' | 'aiming' | 'shooting' | 'review_player';

type MapPresetId = 'prairie' | 'canyon' | 'billard';

interface Point {
  x: number;
  y: number;
}

interface Obstacle {
  id: string;
  x: number;
  y: number;
  radius: number;
  kind: 'cloud_rock' | 'bumper';
}

interface BoardLayout {
  target: Point;
  obstacles: Obstacle[];
}

interface PlayerTargetAttempt {
  player: Player;
  layout: BoardLayout;
  trajectory: Point[];
  finalPos: Point | null;
  distancePx: number;
  accuracyPct: number;
  bounces: number;
  launchAngleDeg: number;
  launchPowerPct: number;
}

const BOARD_SIZE = 400;
const LAUNCH_ORIGIN: Point = { x: 200, y: 342 };
const PUCK_RADIUS = 11;
const TARGET_OUTER_RADIUS = 44;
const MEMORIZE_SECONDS = 4;

const MAP_PRESETS: {
  id: MapPresetId;
  name: string;
  subtitle: string;
  badge: string;
}[] = [
  {
    id: 'prairie',
    name: 'Prairie Calme',
    subtitle: '1 obstacle central • Idéal pour découvrir',
    badge: '⭐ Facile',
  },
  {
    id: 'canyon',
    name: 'Canyon des Nuages',
    subtitle: '2 obstacles en quinconce • Tir de précision',
    badge: '⭐⭐ Moyen',
  },
  {
    id: 'billard',
    name: 'Archipel Rebonds',
    subtitle: '3 obstacles • Utilisez les rebonds !',
    badge: '⭐⭐⭐ Expert',
  },
];

function generateLayout(preset: MapPresetId): BoardLayout {
  if (preset === 'prairie') {
    return {
      target: { x: 275, y: 96 },
      obstacles: [
        {
          id: 'obs-1',
          x: 225,
          y: 210,
          radius: 26,
          kind: 'cloud_rock',
        },
      ],
    };
  }

  if (preset === 'canyon') {
    // Matches screenshot #1: target in upper corner, 2 cloud-rock obstacles
    return {
      target: { x: 292, y: 94 },
      obstacles: [
        {
          id: 'obs-1',
          x: 146,
          y: 178,
          radius: 27,
          kind: 'cloud_rock',
        },
        {
          id: 'obs-2',
          x: 242,
          y: 234,
          radius: 25,
          kind: 'cloud_rock',
        },
      ],
    };
  }

  // 'billard'
  return {
    target: { x: 200, y: 88 },
    obstacles: [
      {
        id: 'obs-1',
        x: 200,
        y: 172,
        radius: 25,
        kind: 'bumper',
      },
      {
        id: 'obs-2',
        x: 118,
        y: 236,
        radius: 24,
        kind: 'cloud_rock',
      },
      {
        id: 'obs-3',
        x: 282,
        y: 236,
        radius: 24,
        kind: 'cloud_rock',
      },
    ],
  };
}

function computeAccuracy(distancePx: number): number {
  // Within 6px is 100%, linear/smooth dropoff up to 240px
  if (distancePx <= 4) return 100;
  const maxDist = 250;
  const raw = Math.max(0, 1 - (distancePx - 4) / maxDist);
  const curved = Math.pow(raw, 0.85) * 100;
  return Math.round(curved * 10) / 10;
}

export const TargetGame: React.FC<TargetGameProps> = ({ players, onFinish }) => {
  const [preset, setPreset] = useState<MapPresetId>('canyon');
  const [phase, setPhase] = useState<Phase>('setup');
  const [countdown, setCountdown] = useState<number>(MEMORIZE_SECONDS);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [attempts, setAttempts] = useState<PlayerTargetAttempt[]>([]);

  // Aiming state
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [aimAngleDeg, setAimAngleDeg] = useState<number>(0); // 0 = straight up, + = right, - = left
  const [aimPowerPct, setAimPowerPct] = useState<number>(0); // 0..100

  // Live animation state during 'shooting'
  const [livePuck, setLivePuck] = useState<Point>(LAUNCH_ORIGIN);
  const [liveTrail, setLiveTrail] = useState<Point[]>([]);
  const animRef = useRef<number | null>(null);

  const previewLayout = generateLayout(preset);
  const currentAttempt = attempts[currentPlayerIndex];
  const activeLayout = currentAttempt?.layout || previewLayout;

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Memorize countdown timer
  useEffect(() => {
    if (phase !== 'memorize') return;

    if (countdown <= 2 && countdown > 0) {
      sound.playBeep(countdown === 1);
    }

    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          sound.playVanish();
          setAimAngleDeg(0);
          setAimPowerPct(0);
          setLivePuck(LAUNCH_ORIGIN);
          setLiveTrail([]);
          setPhase('aiming');
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, countdown]);

  const handleStartMatch = () => {
    sound.playPop();
    const sharedLayout = generateLayout(preset);
    const initialAttempts: PlayerTargetAttempt[] = players.map((player) => ({
      player,
      layout: sharedLayout,
      trajectory: [],
      finalPos: null,
      distancePx: 0,
      accuracyPct: 0,
      bounces: 0,
      launchAngleDeg: 0,
      launchPowerPct: 0,
    }));
    setAttempts(initialAttempts);
    setCurrentPlayerIndex(0);
    setPhase('player_ready');
  };

  const handleStartMemorize = () => {
    sound.playPop();
    setCountdown(MEMORIZE_SECONDS);
    setLivePuck(LAUNCH_ORIGIN);
    setLiveTrail([]);
    setPhase('memorize');
  };

  const getBoardCoords = (clientX: number, clientY: number): Point | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * BOARD_SIZE,
      y: ((clientY - rect.top) / rect.height) * BOARD_SIZE,
    };
  };

  const updateAimFromPoint = (pt: Point) => {
    const dx = pt.x - LAUNCH_ORIGIN.x;
    const dy = pt.y - LAUNCH_ORIGIN.y;

    // Support both classic pullback (dragging below launcher) and direct forward drag (dragging above launcher)
    let dirX = dx;
    let dirY = dy;
    let dist = Math.hypot(dx, dy);
    let maxDist = 210;

    if (dy > 8) {
      // Player is pulling the slingshot DOWNWARD (classic slingshot pullback)
      dirX = -dx;
      dirY = -dy;
      maxDist = 68;
    } else if (dy > -12 && Math.abs(dx) < 12) {
      setAimPowerPct(0);
      return;
    }

    // Clamp direction to upward hemisphere (-75 deg to +75 deg from straight up)
    const rawAngleRad = Math.atan2(dirX, -dirY); // 0 = straight up (0, -1)
    const maxAngleRad = (75 * Math.PI) / 180;
    const clampedRad = Math.max(-maxAngleRad, Math.min(maxAngleRad, rawAngleRad));
    const deg = Math.round((clampedRad * 180) / Math.PI);

    const power = Math.min(100, Math.max(10, Math.round((dist / maxDist) * 100)));
    setAimAngleDeg(deg);
    setAimPowerPct(power);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'aiming') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getBoardCoords(e.clientX, e.clientY);
    if (!pt) return;
    setIsDragging(true);
    updateAimFromPoint(pt);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || phase !== 'aiming') return;
    const pt = getBoardCoords(e.clientX, e.clientY);
    if (!pt) return;
    updateAimFromPoint(pt);
  };

  const handlePointerUp = () => {
    if (!isDragging || phase !== 'aiming') return;
    setIsDragging(false);

    if (aimPowerPct < 15) {
      // Too weak, reset slingshot
      setAimPowerPct(0);
      setAimAngleDeg(0);
      return;
    }

    launchPuck(aimAngleDeg, aimPowerPct);
  };

  const launchPuck = (angleDeg: number, powerPct: number) => {
    sound.playSlingshot();
    setPhase('shooting');

    const rad = (angleDeg * Math.PI) / 180;
    // Tuned initial speed so 70-85% reaches upper area nicely
    const speed = 3.2 + (powerPct / 100) * 11.2;
    let vx = Math.sin(rad) * speed;
    let vy = -Math.cos(rad) * speed;
    let x = LAUNCH_ORIGIN.x;
    let y = LAUNCH_ORIGIN.y;

    const trail: Point[] = [{ x, y }];
    let bounces = 0;
    let stepCount = 0;
    const wallMin = 24;
    const wallMax = BOARD_SIZE - 24;
    const friction = 0.972;

    const step = () => {
      stepCount++;
      // Sub-stepping for accurate obstacle collision
      const subSteps = 2;
      let bouncedThisFrame = false;

      for (let s = 0; s < subSteps; s++) {
        x += vx / subSteps;
        y += vy / subSteps;

        // Wall collisions
        if (x < wallMin) {
          x = wallMin;
          vx = Math.abs(vx) * 0.85;
          bouncedThisFrame = true;
        } else if (x > wallMax) {
          x = wallMax;
          vx = -Math.abs(vx) * 0.85;
          bouncedThisFrame = true;
        }

        if (y < wallMin) {
          y = wallMin;
          vy = Math.abs(vy) * 0.85;
          bouncedThisFrame = true;
        } else if (y > wallMax) {
          y = wallMax;
          vy = -Math.abs(vy) * 0.85;
          bouncedThisFrame = true;
        }

        // Obstacle collisions
        for (const obs of activeLayout.obstacles) {
          const dx = x - obs.x;
          const dy = y - obs.y;
          const dist = Math.hypot(dx, dy);
          const minDist = PUCK_RADIUS + obs.radius;
          if (dist < minDist && dist > 0.001) {
            const nx = dx / dist;
            const ny = dy / dist;
            // Push puck outside obstacle
            x = obs.x + nx * (minDist + 0.5);
            y = obs.y + ny * (minDist + 0.5);
            // Reflect velocity
            const dot = vx * nx + vy * ny;
            if (dot < 0) {
              const restitution = obs.kind === 'bumper' ? 1.05 : 0.88;
              vx = (vx - 2 * dot * nx) * restitution;
              vy = (vy - 2 * dot * ny) * restitution;
              bouncedThisFrame = true;
            }
          }
        }
      }

      if (bouncedThisFrame) {
        bounces++;
        sound.playBounce();
      }

      vx *= friction;
      vy *= friction;

      if (stepCount % 2 === 0) {
        trail.push({ x, y });
      }

      setLivePuck({ x, y });
      setLiveTrail([...trail]);

      const currentSpeed = Math.hypot(vx, vy);
      if (currentSpeed > 0.14 && stepCount < 180) {
        animRef.current = requestAnimationFrame(step);
      } else {
        // Finished sliding!
        const finalPos = { x: Math.round(x), y: Math.round(y) };
        trail.push(finalPos);
        const distPx = Math.round(
          Math.hypot(finalPos.x - activeLayout.target.x, finalPos.y - activeLayout.target.y)
        );
        const acc = computeAccuracy(distPx);

        if (acc >= 80) {
          sound.playVictory();
        } else {
          sound.playBuzzer();
        }

        setAttempts((prev) =>
          prev.map((att, idx) =>
            idx === currentPlayerIndex
              ? {
                  ...att,
                  trajectory: trail,
                  finalPos,
                  distancePx: distPx,
                  accuracyPct: acc,
                  bounces,
                  launchAngleDeg: angleDeg,
                  launchPowerPct: powerPct,
                }
              : att
          )
        );
        setPhase('review_player');
      }
    };

    animRef.current = requestAnimationFrame(step);
  };

  const handleNextPlayerOrFinish = () => {
    sound.playPop();
    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex((i) => i + 1);
      setPhase('player_ready');
    } else {
      // Compute rankings sorted by highest accuracyPct (then smallest distancePx)
      const sorted = [...attempts].sort((a, b) => {
        if (b.accuracyPct !== a.accuracyPct) return b.accuracyPct - a.accuracyPct;
        return a.distancePx - b.distancePx;
      });

      const rankings: PlayerRanking[] = sorted.map((att, index) => ({
        playerId: att.player.id,
        rank: index + 1,
        scoreText: `${att.accuracyPct.toFixed(1)} %`,
        subText: `Écart : ${att.distancePx} px${
          att.bounces > 0 ? ` • ${att.bounces} rebond${att.bounces > 1 ? 's' : ''}` : ''
        }`,
        highlight: index === 0,
      }));

      onFinish(rankings);
    }
  };

  // Compute pulled-back puck position during aiming
  const aimRad = (aimAngleDeg * Math.PI) / 180;
  const pullbackOffset = isDragging ? (aimPowerPct / 100) * 26 : 0;
  const aimingPuckPos: Point = {
    x: LAUNCH_ORIGIN.x - Math.sin(aimRad) * pullbackOffset,
    y: LAUNCH_ORIGIN.y + Math.cos(aimRad) * pullbackOffset,
  };

  const aimingArrowEnd: Point = {
    x: LAUNCH_ORIGIN.x + Math.sin(aimRad) * (35 + (aimPowerPct / 100) * 95),
    y: LAUNCH_ORIGIN.y - Math.cos(aimRad) * (35 + (aimPowerPct / 100) * 95),
  };

  const getFeedbackBadge = (acc: number) => {
    if (acc >= 95) return { text: 'Dans le mille ! 🎯', color: 'bg-emerald-500 text-white' };
    if (acc >= 82) return { text: 'Excellent tir ! ✨', color: 'bg-emerald-500 text-white' };
    if (acc >= 65) return { text: 'Bien visé ! 👍', color: 'bg-amber-400 text-slate-900' };
    if (acc >= 40) return { text: 'Pas mal ! 🧭', color: 'bg-sky-400 text-white' };
    return { text: 'Perdu dans le brouillard ! 🌫️', color: 'bg-rose-400 text-white' };
  };

  // ============================================================================
  // RENDER: PHASE 1 — SETUP
  // ============================================================================
  if (phase === 'setup') {
    return (
      <div className="space-y-5 pb-20 animate-in fade-in duration-300">
        {/* Game Banner */}
        <div className="clay-card p-5 bg-gradient-to-br from-sky-100 via-indigo-50 to-white text-center relative overflow-hidden">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-400 text-white flex items-center justify-center shadow-md mb-2 border-2 border-white">
            <Target className="w-8 h-8 stroke-[2.2]" />
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-700 mb-1">
            <Compass className="w-3 h-3" /> Orientation & Mémoire spatiale
          </span>
          <h1 className="font-heading font-black text-2xl text-slate-800">
            Cible Fantôme
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xs mx-auto">
            Repérez la cible et les obstacles pendant <strong>4 secondes</strong>, puis tirez au lance-pierre dans le brouillard !
          </p>
        </div>

        {/* Map Preset Selector */}
        <div className="space-y-2.5">
          <label className="block font-heading font-bold text-sm text-slate-700 px-1">
            Choisissez votre arène :
          </label>
          <div className="grid grid-cols-1 gap-2.5">
            {MAP_PRESETS.map((item) => {
              const selected = preset === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    sound.playPop();
                    setPreset(item.id);
                  }}
                  className={`clay-card p-3.5 text-left transition-all cursor-pointer flex items-center justify-between ${
                    selected
                      ? 'border-2 border-sky-500 bg-sky-50/70 scale-[1.01]'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-base text-slate-800">
                        {item.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-sky-700 border border-sky-100">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{item.subtitle}</p>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selected
                        ? 'border-sky-500 bg-sky-500 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {selected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Start Button */}
        <ClayButton
          onClick={handleStartMatch}
          variant="primary"
          size="xl"
          fullWidth
        >
          <Play className="w-5 h-5 fill-current mr-1" />
          C'est parti ! ({players.length} joueur{players.length > 1 ? 's' : ''})
        </ClayButton>
      </div>
    );
  }

  // ============================================================================
  // RENDER: PHASE 2 — PLAYER READY (PASS-AND-PLAY TRANSITION)
  // ============================================================================
  if (phase === 'player_ready' && currentAttempt) {
    return (
      <div className="space-y-6 py-4 text-center animate-in fade-in duration-300">
        <div className="clay-card p-6 bg-gradient-to-b from-white to-sky-50/60 space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-700">
            Joueur {currentPlayerIndex + 1} sur {players.length}
          </span>

          <div className="flex justify-center py-2">
            <GuessWhoCard
              player={currentAttempt.player}
              size="lg"
              interactive={false}
            />
          </div>

          <h2 className="font-heading font-black text-2xl text-slate-800">
            Au tour de {currentAttempt.player.name} !
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xs mx-auto">
            Prépare-toi : tu vas avoir <strong>{MEMORIZE_SECONDS} secondes</strong> pour mémoriser l'emplacement de la cible et des obstacles avant que le brouillard ne tombe.
          </p>

          <div className="pt-2">
            <ClayButton
              onClick={handleStartMemorize}
              variant="primary"
              size="xl"
              fullWidth
            >
              <Sparkles className="w-5 h-5 mr-1.5" />
              Voir la carte ({MEMORIZE_SECONDS}s)
            </ClayButton>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: PHASES 3, 4, 5 — MEMORIZE / AIMING / SHOOTING / REVIEW_PLAYER
  // ============================================================================
  const showTargetAndObstacles = phase === 'memorize' || phase === 'review_player' || phase === 'shooting';
  const fogOpacityClass =
    phase === 'aiming'
      ? 'opacity-100'
      : phase === 'shooting'
      ? 'opacity-75 transition-opacity duration-500'
      : 'opacity-0 pointer-events-none transition-opacity duration-500';

  return (
    <div className="space-y-4 pb-16 animate-in fade-in duration-200">
      {/* Top Status Bar (Matches Screenshots 1 & 2) */}
      <div className="flex items-center justify-between gap-2">
        {/* Player Pill */}
        {currentAttempt && (
          <div className="clay-badge px-3.5 py-2 bg-gradient-to-r from-sky-100 to-blue-100 border-white flex items-center gap-2 shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
            <span className="font-heading font-bold text-xs sm:text-sm text-slate-800">
              Tour de <span className="text-sky-700">{currentAttempt.player.name}</span>{' '}
              <span className="text-slate-500 font-normal">
                ({currentPlayerIndex + 1}/{players.length})
              </span>
            </span>
          </div>
        )}

        {/* Phase Pill */}
        {phase === 'memorize' && (
          <div className="clay-badge px-3.5 py-2 bg-gradient-to-r from-orange-400 to-amber-500 text-white font-heading font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md animate-pulse">
            <span>Mémorisez la carte !</span>
            <span className="px-2 py-0.5 rounded-full bg-black/20 font-black">
              {countdown}s
            </span>
          </div>
        )}

        {phase === 'aiming' && (
          <div className="clay-badge px-3.5 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-heading font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md">
            <CloudFog className="w-4 h-4" />
            <span>Brouillard actif</span>
          </div>
        )}

        {phase === 'shooting' && (
          <div className="clay-badge px-3.5 py-2 bg-sky-500 text-white font-heading font-bold text-xs sm:text-sm">
            Glissade en cours...
          </div>
        )}

        {phase === 'review_player' && currentAttempt && (
          <div className="clay-badge px-3.5 py-2 bg-emerald-500 text-white font-heading font-bold text-xs sm:text-sm">
            Précision : {currentAttempt.accuracyPct.toFixed(1)} %
          </div>
        )}
      </div>

      {/* Main Claymorphic Square Game Board */}
      <div className="clay-card p-3 sm:p-4 bg-[#f5efe6] border-4 border-white shadow-xl relative">
        <div
          ref={boardRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative w-full aspect-square rounded-2xl overflow-hidden bg-[#f8f3eb] shadow-inner border-2 border-[#eaddcf] select-none ${
            phase === 'aiming' ? 'cursor-grab active:cursor-grabbing touch-none' : ''
          }`}
        >
          {/* SVG Game Layer (400x400 coordinate space) */}
          <svg
            viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
            className="w-full h-full block"
          >
            <defs>
              {/* Soft Grid Pattern */}
              <pattern
                id="clay-grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="#e5d7c6"
                  strokeWidth="1.5"
                />
              </pattern>

              {/* Target Glow Filter */}
              <filter id="target-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#f59e0b" floodOpacity="0.45" />
              </filter>

              {/* Soft Clay Drop Shadow for Obstacles & Puck */}
              <filter id="clay-drop" x="-25%" y="-25%" width="150%" height="150%">
                <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#64748b" floodOpacity="0.28" />
              </filter>
            </defs>

            {/* 1. Background Grid */}
            <rect width={BOARD_SIZE} height={BOARD_SIZE} fill="url(#clay-grid)" />

            {/* 2. Target Bullseye (Visible in memorize & review) */}
            {showTargetAndObstacles && (
              <g
                transform={`translate(${activeLayout.target.x}, ${activeLayout.target.y})`}
                filter="url(#target-glow)"
              >
                {/* Outer Ring */}
                <circle r={TARGET_OUTER_RADIUS} fill="#fff7ed" stroke="#fdba74" strokeWidth="3" />
                <circle r={33} fill="#f97316" />
                <circle r={22} fill="#ffffff" />
                <circle r={12} fill="#fb923c" />
                <circle r={5.5} fill="#fde047" />
              </g>
            )}

            {/* 3. Obstacles (Clouds & Rocks / Bumpers) */}
            {showTargetAndObstacles &&
              activeLayout.obstacles.map((obs) => (
                <g
                  key={obs.id}
                  transform={`translate(${obs.x}, ${obs.y})`}
                  filter="url(#clay-drop)"
                >
                  {obs.kind === 'cloud_rock' ? (
                    <>
                      {/* Rock behind cloud */}
                      <circle
                        cx={10}
                        cy={-6}
                        r={obs.radius * 0.62}
                        fill="#a8a29e"
                        stroke="#d6d3d1"
                        strokeWidth="2"
                      />
                      {/* Fluffy Clay Cloud */}
                      <ellipse
                        cx={-4}
                        cy={4}
                        rx={obs.radius}
                        ry={obs.radius * 0.72}
                        fill="#e0f2fe"
                        stroke="#ffffff"
                        strokeWidth="3"
                      />
                      <circle cx={-12} cy={0} r={obs.radius * 0.5} fill="#f0f9ff" />
                      <circle cx={4} cy={-2} r={obs.radius * 0.55} fill="#ffffff" />
                    </>
                  ) : (
                    <>
                      {/* Bouncy Pillar Bumper */}
                      <circle
                        r={obs.radius}
                        fill="#c084fc"
                        stroke="#ffffff"
                        strokeWidth="4"
                      />
                      <circle r={obs.radius * 0.55} fill="#f3e8ff" />
                    </>
                  )}
                </g>
              ))}

            {/* 4. Trajectory Dotted Path (Shooting & Review) */}
            {(phase === 'shooting' || phase === 'review_player') && (
              <>
                {(() => {
                  const pts =
                    phase === 'shooting'
                      ? liveTrail
                      : currentAttempt?.trajectory || [];
                  if (pts.length < 2) return null;
                  const d = pts
                    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
                    .join(' ');
                  return (
                    <path
                      d={d}
                      fill="none"
                      stroke="#64748b"
                      strokeWidth="3.5"
                      strokeDasharray="6 6"
                      strokeLinecap="round"
                    />
                  );
                })()}
              </>
            )}

            {/* 5. Fog Layer (Covers the upper board during 'aiming' phase!) */}
            <g className={fogOpacityClass}>
              {/* Soft Pastel Purple-Blue Mist */}
              <rect
                x="0"
                y="0"
                width={BOARD_SIZE}
                height={295}
                fill="#c7d2fe"
                fillOpacity="0.96"
              />
              {/* Soft gradient edge near launcher */}
              <rect
                x="0"
                y="270"
                width={BOARD_SIZE}
                height="48"
                fill="#c7d2fe"
                fillOpacity="0.7"
                rx="20"
              />
              {/* Decorative 3D Cloud Puffs inside the Fog */}
              <g fill="#e0e7ff" opacity="0.9">
                <ellipse cx="95" cy="95" rx="58" ry="34" />
                <ellipse cx="130" cy="85" rx="45" ry="30" />
                <ellipse cx="290" cy="110" rx="68" ry="38" />
                <ellipse cx="210" cy="185" rx="75" ry="42" />
                <ellipse cx="85" cy="220" rx="52" ry="30" />
                <ellipse cx="320" cy="225" rx="56" ry="32" />
              </g>
              <g fill="#eef2ff" opacity="0.85">
                <ellipse cx="195" cy="75" rx="60" ry="32" />
                <ellipse cx="145" cy="160" rx="54" ry="28" />
                <ellipse cx="275" cy="175" rx="50" ry="28" />
              </g>
            </g>

            {/* 6. Slingshot Base & Elastic Bands */}
            <g filter="url(#clay-drop)">
              {/* Slingshot Wooden Base */}
              <ellipse
                cx={LAUNCH_ORIGIN.x}
                cy={388}
                rx={42}
                ry={26}
                fill="#d97706"
                stroke="#fde68a"
                strokeWidth="2"
              />
              {/* Left & Right Forks */}
              <path
                d={`M ${LAUNCH_ORIGIN.x - 16} 375 Q ${LAUNCH_ORIGIN.x - 26} 345 ${LAUNCH_ORIGIN.x - 24} 325`}
                fill="none"
                stroke="#b45309"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d={`M ${LAUNCH_ORIGIN.x + 16} 375 Q ${LAUNCH_ORIGIN.x + 26} 345 ${LAUNCH_ORIGIN.x + 24} 325`}
                fill="none"
                stroke="#b45309"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <circle cx={LAUNCH_ORIGIN.x - 24} cy={325} r={6} fill="#fde68a" />
              <circle cx={LAUNCH_ORIGIN.x + 24} cy={325} r={6} fill="#fde68a" />

              {/* Elastic Bands connected to the puck when in memorize/aiming */}
              {(phase === 'memorize' || phase === 'aiming') && (
                <>
                  <line
                    x1={LAUNCH_ORIGIN.x - 24}
                    y1={325}
                    x2={aimingPuckPos.x}
                    y2={aimingPuckPos.y}
                    stroke="#fef08a"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <line
                    x1={LAUNCH_ORIGIN.x + 24}
                    y1={325}
                    x2={aimingPuckPos.x}
                    y2={aimingPuckPos.y}
                    stroke="#fef08a"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </>
              )}
            </g>

            {/* 7. Aiming Dotted Arrow & Angle/Power Readout (During 'aiming') */}
            {phase === 'aiming' && aimPowerPct >= 15 && (
              <g>
                <line
                  x1={LAUNCH_ORIGIN.x}
                  y1={LAUNCH_ORIGIN.y}
                  x2={aimingArrowEnd.x}
                  y2={aimingArrowEnd.y}
                  stroke="#4338ca"
                  strokeWidth="4"
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                />
                <circle
                  cx={aimingArrowEnd.x}
                  cy={aimingArrowEnd.y}
                  r={6}
                  fill="#4338ca"
                />
              </g>
            )}

            {/* 8. The Player's Puck */}
            {(() => {
              const puckPt =
                phase === 'shooting'
                  ? livePuck
                  : phase === 'review_player' && currentAttempt?.finalPos
                  ? currentAttempt.finalPos
                  : aimingPuckPos;

              return (
                <g
                  transform={`translate(${puckPt.x}, ${puckPt.y})`}
                  filter="url(#clay-drop)"
                >
                  <circle
                    r={PUCK_RADIUS + 2}
                    fill="#06b6d4"
                    stroke="#ffffff"
                    strokeWidth="3"
                  />
                  <circle r={PUCK_RADIUS - 3} fill="#22d3ee" />
                </g>
              );
            })()}

            {/* 9. Distance Measurement Line on Result Screen (Matches Screenshot #3) */}
            {phase === 'review_player' && currentAttempt?.finalPos && (
              <g>
                <line
                  x1={currentAttempt.finalPos.x}
                  y1={currentAttempt.finalPos.y}
                  x2={activeLayout.target.x}
                  y2={activeLayout.target.y}
                  stroke="#1e293b"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                />
                {/* Distance Tag Pill */}
                <g
                  transform={`translate(${
                    (currentAttempt.finalPos.x + activeLayout.target.x) / 2
                  }, ${Math.max(
                    28,
                    (currentAttempt.finalPos.y + activeLayout.target.y) / 2 - 16
                  )})`}
                >
                  <rect
                    x="-54"
                    y="-14"
                    width="108"
                    height="24"
                    rx="12"
                    fill="#1e293b"
                  />
                  <text
                    x="0"
                    y="2"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="Fredoka, sans-serif"
                  >
                    Écart : {currentAttempt.distancePx} px
                  </text>
                </g>
              </g>
            )}
          </svg>

          {/* Floating Angle & Power HUD Pill when aiming */}
          {phase === 'aiming' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-md border border-indigo-100 text-xs font-heading font-bold text-indigo-950 whitespace-nowrap">
                {aimPowerPct >= 15 ? (
                  <>
                    Angle : {aimAngleDeg > 0 ? `+${aimAngleDeg}°` : `${aimAngleDeg}°`} &nbsp;|&nbsp; Puissance :{' '}
                    <span className="text-sky-600">{aimPowerPct} %</span>
                  </>
                ) : (
                  <span>Glissez sur le plateau pour viser et doser !</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Instruction or Review Card */}
      {phase === 'memorize' && (
        <div className="clay-card p-3.5 text-center bg-amber-50/90 border border-amber-200">
          <p className="font-heading font-bold text-sm text-amber-900">
            👀 Observez bien la cible et les obstacles avant l'arrivée du brouillard !
          </p>
        </div>
      )}

      {phase === 'aiming' && (
        <div className="clay-card p-3.5 text-center bg-white/95">
          <p className="font-heading font-bold text-sm text-slate-700">
            🎯 Tirez et relâchez pour propulser le palet !
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Astuce : tirez l'élastique vers le bas ou glissez directement vers la cible.
          </p>
        </div>
      )}

      {/* Result Card (Matches Screenshot #3) */}
      {phase === 'review_player' && currentAttempt && (
        <div className="clay-card p-5 bg-white text-center space-y-3 animate-in zoom-in-95 duration-200">
          <div className="text-2xl">🎉</div>
          <h3 className="font-heading font-black text-2xl text-slate-800">
            Précision : {currentAttempt.accuracyPct.toFixed(1)} %
          </h3>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span
              className={`px-3.5 py-1 rounded-full font-heading font-bold text-xs shadow-sm ${
                getFeedbackBadge(currentAttempt.accuracyPct).color
              }`}
            >
              {getFeedbackBadge(currentAttempt.accuracyPct).text}
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-xs">
              Écart : {currentAttempt.distancePx} px
            </span>
            {currentAttempt.bounces > 0 && (
              <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-bold text-xs">
                {currentAttempt.bounces} rebond{currentAttempt.bounces > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="pt-2 flex items-center gap-2">
            {players.length === 1 && (
              <button
                onClick={handleStartMemorize}
                className="px-4 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Réessayer</span>
              </button>
            )}
            <ClayButton
              onClick={handleNextPlayerOrFinish}
              variant="mint"
              size="lg"
              fullWidth
            >
              {currentPlayerIndex < players.length - 1 ? (
                <>
                  <span>Joueur suivant</span>
                  <ArrowRight className="w-5 h-5 ml-1.5" />
                </>
              ) : (
                <>
                  <Trophy className="w-5 h-5 mr-1.5" />
                  <span>Voir le Podium !</span>
                </>
              )}
            </ClayButton>
          </div>
        </div>
      )}
    </div>
  );
};
