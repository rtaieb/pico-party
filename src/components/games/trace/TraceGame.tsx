import React, { useState, useEffect, useRef } from 'react';
import type { Player, PlayerRanking } from '../../../types';
import type { ShapeType, Point, ComparisonResult } from '../../../utils/shapeCompare';
import {
  CANVAS_SIZE,
  evaluateDrawnShape,
} from '../../../utils/shapeCompare';
import { ClayButton } from '../../common/ClayButton';
import {
  Sparkles,
  Eye,
  Undo2,
  Check,
  ArrowRight,
  Circle,
  Triangle,
  Star,
  User,
  Smile,
  Trash2,
  Play,
  Trophy,
} from 'lucide-react';
import { sound } from '../../../utils/sound';
import { ShapeHalosModal } from './ShapeHalosModal';

interface TraceGameProps {
  players: Player[];
  onFinish: (rankings: PlayerRanking[]) => void;
  onExit?: () => void;
}

type Phase = 'setup' | 'player_ready' | 'memorize' | 'drawing' | 'review_player';

interface PlayerTraceAttempt {
  player: Player;
  strokes: Point[][];
  evaluation: ComparisonResult | null;
}

const MEMORIZE_SECONDS = 6;

export const TraceGame: React.FC<TraceGameProps> = ({
  players,
  onFinish,
}) => {
  const [targetShape, setTargetShape] = useState<ShapeType>('circle');
  const [phase, setPhase] = useState<Phase>('setup');
  const [countdown, setCountdown] = useState<number>(MEMORIZE_SECONDS);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [attempts, setAttempts] = useState<PlayerTraceAttempt[]>([]);
  const [showHalosModal, setShowHalosModal] = useState<boolean>(false);

  // Canvas drawing state
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [strokes, setStrokes] = useState<Point[][]>([]);

  // Initialize attempts when players change
  useEffect(() => {
    setAttempts(
      players.map((p) => ({
        player: p,
        strokes: [],
        evaluation: null,
      }))
    );
  }, [players]);

  // 6s Memorization countdown for current player
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
          // Switch directly to drawing inside the exact same frame!
          setStrokes([]);
          setPhase('drawing');
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, countdown]);

  const handleStartSetup = () => {
    sound.playPop();
    setAttempts(
      players.map((p) => ({
        player: p,
        strokes: [],
        evaluation: null,
      }))
    );
    setCurrentPlayerIndex(0);
    setPhase('player_ready');
  };

  const handleStartPlayerMemorization = () => {
    sound.playPop();
    setCountdown(MEMORIZE_SECONDS);
    setStrokes([]);
    setPhase('memorize');
  };

  // Accurate coordinate converter without NaN
  const getCanvasCoords = (clientX: number, clientY: number): Point | null => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const x = ((clientX - rect.left) / rect.width) * CANVAS_SIZE;
    const y = ((clientY - rect.top) / rect.height) * CANVAS_SIZE;

    return {
      x: Math.max(0, Math.min(CANVAS_SIZE, Math.round(x * 10) / 10)),
      y: Math.max(0, Math.min(CANVAS_SIZE, Math.round(y * 10) / 10)),
    };
  };

  const handlePointerDown = (clientX: number, clientY: number) => {
    if (phase !== 'drawing') return;
    const pt = getCanvasCoords(clientX, clientY);
    if (!pt) return;
    setIsDrawing(true);
    setStrokes((prev) => [...prev, [pt]]);
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDrawing || phase !== 'drawing') return;
    const pt = getCanvasCoords(clientX, clientY);
    if (!pt) return;

    setStrokes((prev) => {
      if (prev.length === 0) return [[pt]];
      const lastStroke = prev[prev.length - 1];
      const updatedLastStroke = [...lastStroke, pt];
      return [...prev.slice(0, prev.length - 1), updatedLastStroke];
    });
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const handleUndo = () => {
    sound.playPop();
    setStrokes((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    sound.playPop();
    setStrokes([]);
  };

  const handleValidateDrawing = () => {
    if (strokes.flat().length < 5) return;
    sound.playPop();

    const evalResult = evaluateDrawnShape(strokes, targetShape);
    const updated = [...attempts];
    updated[currentPlayerIndex] = {
      player: players[currentPlayerIndex],
      strokes: [...strokes],
      evaluation: evalResult,
    };
    setAttempts(updated);
    setPhase('review_player');
  };

  const handleNextPlayerOrFinish = () => {
    sound.playPop();
    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex((i) => i + 1);
      setStrokes([]);
      setPhase('player_ready');
    } else {
      // Go to podium
      handleFinalizePodium();
    }
  };

  const handleFinalizePodium = () => {
    sound.playVictory();
    const sorted = [...attempts].sort(
      (a, b) => (b.evaluation?.accuracyPercentage || 0) - (a.evaluation?.accuracyPercentage || 0)
    );

    const rankings: PlayerRanking[] = sorted.map((att, idx) => ({
      playerId: att.player.id,
      rank: idx + 1,
      scoreText: `${att.evaluation?.accuracyPercentage || 0}%`,
      subText: att.evaluation?.feedback,
      highlight: idx === 0,
    }));

    onFinish(rankings);
  };

  // Convert points array to SVG path string
  const strokeToPath = (pts: Point[]): string => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y} L ${pts[0].x + 0.1} ${pts[0].y + 0.1}`;
    return `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');
  };

  // Render SVG target shape model
  const renderShapeSvg = (shape: ShapeType) => {
    if (shape === 'circle') {
      return (
        <circle
          cx="170"
          cy="170"
          r="95"
          fill="rgba(168, 85, 247, 0.12)"
          stroke="#9333ea"
          strokeWidth="6"
        />
      );
    }
    if (shape === 'triangle') {
      const r = 110;
      const v1 = `${170},${170 - r}`;
      const v2 = `${170 + r * Math.cos(Math.PI / 6)},${170 + r * Math.sin(Math.PI / 6)}`;
      const v3 = `${170 - r * Math.cos(Math.PI / 6)},${170 + r * Math.sin(Math.PI / 6)}`;
      return (
        <polygon
          points={`${v1} ${v2} ${v3}`}
          fill="rgba(168, 85, 247, 0.12)"
          stroke="#9333ea"
          strokeWidth="6"
          strokeLinejoin="round"
        />
      );
    }
    if (shape === 'star') {
      const outerR = 105;
      const innerR = 48;
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        pts.push(`${170 + r * Math.cos(angle)},${170 + r * Math.sin(angle)}`);
      }
      return (
        <polygon
          points={pts.join(' ')}
          fill="rgba(168, 85, 247, 0.12)"
          stroke="#9333ea"
          strokeWidth="6"
          strokeLinejoin="round"
        />
      );
    }
    if (shape === 'stickman') {
      return (
        <g stroke="#9333ea" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <circle cx="170" cy="75" r="30" fill="rgba(168, 85, 247, 0.12)" />
          <line x1="170" y1="105" x2="170" y2="205" />
          <line x1="105" y1="145" x2="170" y2="135" />
          <line x1="170" y1="135" x2="235" y2="145" />
          <line x1="170" y1="205" x2="115" y2="290" />
          <line x1="170" y1="205" x2="225" y2="290" />
        </g>
      );
    }
    if (shape === 'face') {
      return (
        <g stroke="#9333ea" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <circle cx="170" cy="170" r="95" fill="rgba(168, 85, 247, 0.12)" />
          <circle cx="130" cy="135" r="9" fill="#9333ea" />
          <circle cx="210" cy="135" r="9" fill="#9333ea" />
          <path d="M 125 195 Q 170 240 215 195" />
        </g>
      );
    }
    return null;
  };

  // Render SVG target shape in green overlay in review
  const renderReviewShapeSvg = (shape: ShapeType) => {
    if (shape === 'circle') {
      return (
        <circle
          cx="170"
          cy="170"
          r="95"
          fill="rgba(16, 185, 129, 0.15)"
          stroke="#10b981"
          strokeWidth="4"
          strokeDasharray="6 4"
        />
      );
    }
    if (shape === 'triangle') {
      const r = 110;
      const v1 = `${170},${170 - r}`;
      const v2 = `${170 + r * Math.cos(Math.PI / 6)},${170 + r * Math.sin(Math.PI / 6)}`;
      const v3 = `${170 - r * Math.cos(Math.PI / 6)},${170 + r * Math.sin(Math.PI / 6)}`;
      return (
        <polygon
          points={`${v1} ${v2} ${v3}`}
          fill="rgba(16, 185, 129, 0.15)"
          stroke="#10b981"
          strokeWidth="4"
          strokeDasharray="6 4"
          strokeLinejoin="round"
        />
      );
    }
    if (shape === 'star') {
      const outerR = 105;
      const innerR = 48;
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        pts.push(`${170 + r * Math.cos(angle)},${170 + r * Math.sin(angle)}`);
      }
      return (
        <polygon
          points={pts.join(' ')}
          fill="rgba(16, 185, 129, 0.15)"
          stroke="#10b981"
          strokeWidth="4"
          strokeDasharray="6 4"
          strokeLinejoin="round"
        />
      );
    }
    if (shape === 'stickman') {
      return (
        <g stroke="#10b981" strokeWidth="4" strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <circle cx="170" cy="75" r="30" fill="rgba(16, 185, 129, 0.12)" />
          <line x1="170" y1="105" x2="170" y2="205" />
          <line x1="105" y1="145" x2="170" y2="135" />
          <line x1="170" y1="135" x2="235" y2="145" />
          <line x1="170" y1="205" x2="115" y2="290" />
          <line x1="170" y1="205" x2="225" y2="290" />
        </g>
      );
    }
    if (shape === 'face') {
      return (
        <g stroke="#10b981" strokeWidth="4" strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <circle cx="170" cy="170" r="95" fill="rgba(16, 185, 129, 0.12)" />
          <circle cx="130" cy="135" r="9" fill="#10b981" />
          <circle cx="210" cy="135" r="9" fill="#10b981" />
          <path d="M 125 195 Q 170 240 215 195" />
        </g>
      );
    }
    return null;
  };

  const activePlayer = players[currentPlayerIndex];
  const activeAttempt = attempts[currentPlayerIndex];
  const totalPointsCount = strokes.reduce((acc, s) => acc + s.length, 0);

  const shapeList: { id: ShapeType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'circle', label: 'Cercle', icon: Circle },
    { id: 'triangle', label: 'Triangle', icon: Triangle },
    { id: 'star', label: 'Étoile', icon: Star },
    { id: 'stickman', label: 'Bonhomme', icon: User },
    { id: 'face', label: 'Visage', icon: Smile },
  ];

  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-300">
      {/* 1. SETUP PHASE */}
      {phase === 'setup' && (
        <div className="space-y-6">
          <div className="clay-card p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50 text-center">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-purple-500 text-white flex items-center justify-center shadow-md mb-3 border-2 border-white">
              <Sparkles className="w-9 h-9 stroke-[2.2]" />
            </div>
            <h2 className="font-heading font-bold text-2xl text-slate-800">
              Tracé Fantôme
            </h2>
            <p className="text-sm text-slate-600 max-w-xs mx-auto mt-1">
              La forme sera montrée pendant <strong>6 secondes</strong> à chaque joueur. Mémorisez bien et redessinez-la de mémoire !
            </p>
          </div>

          {/* Shape selection */}
          <div className="clay-card p-5">
            <label className="block font-heading font-bold text-sm text-slate-700 text-center mb-3">
              Choisissez la forme à reproduire
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {shapeList.map(({ id, label, icon: IconComponent }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    sound.playPop();
                    setTargetShape(id);
                  }}
                  className={`p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 font-heading font-bold transition-all cursor-pointer ${
                    targetShape === id
                      ? 'bg-purple-500 text-white shadow-lg ring-3 ring-purple-300 scale-105'
                      : 'bg-white hover:bg-purple-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  <IconComponent className="w-7 h-7 stroke-[2.2]" />
                  <span className="text-xs sm:text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <ClayButton
            onClick={handleStartSetup}
            variant="primary"
            size="xl"
            fullWidth
          >
            Lancer la partie ({players.length} joueur{players.length > 1 ? 's' : ''})
          </ClayButton>

          <button
            type="button"
            onClick={() => {
              sound.playPop();
              setShowHalosModal(true);
            }}
            className="w-full text-center text-xs font-bold text-purple-600 hover:text-purple-700 hover:underline flex items-center justify-center gap-1.5 py-1.5 cursor-pointer"
          >
            <span>💡 Voir le barème et les marges de score des 5 formes</span>
          </button>
        </div>
      )}

      {/* 2. PLAYER ROUND (UNIFIED FIXED FRAME: ZERO LAYOUT SHIFT BETWEEN MEMORIZE AND DRAWING) */}
      {phase !== 'setup' && (
        <div className="flex flex-col items-center space-y-4 text-center">
          {/* Fixed Player Info Bar */}
          <div className="w-full max-w-sm flex items-center justify-between bg-white/90 px-4 py-2 rounded-2xl border border-purple-100 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Joueur :</span>
              <span className="font-heading font-bold text-sm text-purple-700">
                {activePlayer.name}
              </span>
              <span className="text-[11px] text-slate-400">
                ({currentPlayerIndex + 1}/{players.length})
              </span>
            </div>
            <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full capitalize">
              {targetShape}
            </span>
          </div>

          {/* Status Message Strip - Fixed Height to prevent any vertical shift! */}
          <div className="h-7 flex items-center justify-center">
            {phase === 'player_ready' && (
              <span className="text-xs font-bold text-purple-600 animate-pulse">
                Appuie sur « Démarrer » pour observer la forme (6s)
              </span>
            )}
            {phase === 'memorize' && (
              <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5 bg-amber-50 px-3 py-0.5 rounded-full border border-amber-200">
                <Eye className="w-3.5 h-3.5" /> Mémorisation : {countdown}s restante{countdown > 1 ? 's' : ''}
              </span>
            )}
            {phase === 'drawing' && (
              <span className="text-xs font-semibold text-slate-500">
                Dessinez de mémoire au doigt ou à la souris
              </span>
            )}
            {phase === 'review_player' && activeAttempt?.evaluation && (
              <span className="text-xs font-bold text-purple-700">
                Score : {activeAttempt.evaluation.accuracyPercentage}% ({activeAttempt.evaluation.feedback})
              </span>
            )}
          </div>

          {/* THE FIXED CANVAS FRAME: EXACT SAME SIZE, EXACT SAME POSITION, NEVER JUMPS! */}
          <div className="clay-card p-3 bg-white border-2 border-purple-200 flex flex-col items-center justify-center relative shadow-lg">
            {/* Smooth 6s Countdown Progress Bar at top edge during memorization */}
            {phase === 'memorize' && (
              <div className="absolute top-1.5 left-4 right-4 h-1.5 bg-purple-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-amber-400 transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${(countdown / MEMORIZE_SECONDS) * 100}%` }}
                />
              </div>
            )}

            <div
              ref={containerRef}
              className={`
                w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] bg-[#faf7fc] rounded-2xl relative border-2 border-dashed border-purple-200 overflow-hidden shadow-inner flex items-center justify-center select-none
                ${phase === 'drawing' ? 'cursor-crosshair touch-none' : 'cursor-default'}
              `}
              onTouchStart={(e) => {
                if (phase !== 'drawing') return;
                const touch = e.touches[0];
                handlePointerDown(touch.clientX, touch.clientY);
              }}
              onTouchMove={(e) => {
                if (phase !== 'drawing') return;
                const touch = e.touches[0];
                handlePointerMove(touch.clientX, touch.clientY);
              }}
              onTouchEnd={handlePointerUp}
              onMouseDown={(e) => {
                if (phase !== 'drawing') return;
                handlePointerDown(e.clientX, e.clientY);
              }}
              onMouseMove={(e) => {
                if (phase !== 'drawing') return;
                handlePointerMove(e.clientX, e.clientY);
              }}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
            >
              {/* Reference Grid lines */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
                <div className="w-full h-[1px] bg-slate-400" />
                <div className="h-full w-[1px] bg-slate-400 absolute" />
              </div>

              {/* STAGE A: PLAYER READY (BLURRED / HIDDEN PLACEHOLDER) */}
              {phase === 'player_ready' && (
                <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shadow-sm">
                    <Eye className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-lg text-slate-800">
                      Prêt, {activePlayer.name} ?
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Le dessin apparaîtra pendant 6 secondes dans ce cadre, puis s'effacera !
                    </p>
                  </div>
                </div>
              )}

              {/* STAGE B: MEMORIZE (TARGET SHAPE DISPLAYED RIGHT HERE) */}
              {phase === 'memorize' && (
                <svg
                  viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
                  className="w-full h-full absolute inset-0 pointer-events-none animate-in fade-in duration-200"
                >
                  {renderShapeSvg(targetShape)}
                </svg>
              )}

              {/* STAGE C: DRAWING (USER'S REAL-TIME DRAWING IN THE EXACT SAME FRAME) */}
              {phase === 'drawing' && (
                <>
                  <svg
                    viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
                    className="w-full h-full absolute inset-0 pointer-events-none"
                  >
                    {strokes.map((stroke, sIdx) => (
                      <path
                        key={sIdx}
                        d={strokeToPath(stroke)}
                        fill="none"
                        stroke="#9333ea"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                  </svg>

                  {strokes.length === 0 && (
                    <div className="pointer-events-none text-slate-400 text-xs font-semibold flex flex-col items-center gap-1.5 px-4 text-center">
                      <span className="text-3xl">✍️</span>
                      <span>Tracez la forme au doigt ou à la souris</span>
                      <span className="text-[11px] text-slate-400">
                        (Pinceau 10px • Le gribouillage hors-piste fait perdre des points !)
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* STAGE D: REVIEW (GREEN MODEL + PURPLE DRAWING OVERLAY) */}
              {phase === 'review_player' && activeAttempt && (
                <svg
                  viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
                  className="w-full h-full absolute inset-0 pointer-events-none"
                >
                  {/* 1. Target model in green dashed */}
                  {renderReviewShapeSvg(targetShape)}

                  {/* 2. User's drawing in purple (10px) */}
                  {activeAttempt.strokes.map((stroke, sIdx) => (
                    <path
                      key={sIdx}
                      d={strokeToPath(stroke)}
                      fill="none"
                      stroke="#9333ea"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.8"
                    />
                  ))}
                </svg>
              )}
            </div>

            {/* In Review Phase: Legend & Details underneath canvas */}
            {phase === 'review_player' && activeAttempt?.evaluation && (
              <div className="flex flex-col items-center gap-1.5 mt-2 pt-2 border-t border-slate-100 w-full">
                <div className="flex items-center justify-center gap-4 text-xs font-bold w-full">
                  <span className="flex items-center gap-1 text-emerald-600 text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block border border-emerald-600" />
                    Modèle cible (vert)
                  </span>
                  <span className="flex items-center gap-1 text-purple-600 text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                    Ton tracé 10px (violet)
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                  <span>Forme couverte : {activeAttempt.evaluation.coverageScore}%</span>
                  {activeAttempt.evaluation.penaltyPixels > 30 && (
                    <span className="text-rose-500 font-bold">
                      Débordements hors-piste détectés
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Fixed Controls Area Below Frame */}
          <div className="w-full max-w-sm pt-1">
            {/* 1. Ready button */}
            {phase === 'player_ready' && (
              <ClayButton
                onClick={handleStartPlayerMemorization}
                variant="primary"
                size="lg"
                fullWidth
              >
                <Play className="w-5 h-5 fill-current mr-1" />
                Afficher le modèle (6s)
              </ClayButton>
            )}

            {/* 2. Memorizing indicator button */}
            {phase === 'memorize' && (
              <div className="py-2.5 px-4 rounded-full bg-purple-100 text-purple-700 font-heading font-bold text-sm">
                Mémorisez bien la position... {countdown}s
              </div>
            )}

            {/* 3. Drawing action buttons */}
            {phase === 'drawing' && (
              <div className="flex items-center gap-2">
                <ClayButton
                  onClick={handleUndo}
                  variant="ghost"
                  size="md"
                  disabled={strokes.length === 0}
                  title="Annuler le dernier trait"
                >
                  <Undo2 className="w-4 h-4 mr-1" />
                  Annuler
                </ClayButton>

                <button
                  onClick={handleClear}
                  disabled={strokes.length === 0}
                  className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 disabled:opacity-40 flex items-center justify-center cursor-pointer transition-all active:scale-95 flex-shrink-0"
                  title="Tout effacer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <ClayButton
                  onClick={handleValidateDrawing}
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={totalPointsCount < 5}
                >
                  <Check className="w-5 h-5 mr-1" />
                  Valider mon dessin
                </ClayButton>
              </div>
            )}

            {/* 4. Review next action button */}
            {phase === 'review_player' && (
              <ClayButton
                onClick={handleNextPlayerOrFinish}
                variant="primary"
                size="lg"
                fullWidth
              >
                {currentPlayerIndex < players.length - 1 ? (
                  <>
                    <span>Au tour de {players[currentPlayerIndex + 1].name}</span>
                    <ArrowRight className="w-5 h-5 ml-1" />
                  </>
                ) : (
                  <>
                    <Trophy className="w-5 h-5 mr-1" />
                    <span>Voir le Podium Final !</span>
                  </>
                )}
              </ClayButton>
            )}
          </div>
        </div>
      )}

      {/* Scoring halos & shapes modal */}
      <ShapeHalosModal
        isOpen={showHalosModal}
        onClose={() => setShowHalosModal(false)}
        initialShape={targetShape}
      />
    </div>
  );
};
