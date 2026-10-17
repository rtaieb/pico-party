import React, { useState } from 'react';
import type { ShapeType } from '../../../utils/shapeCompare';
import { X, Sparkles, Check, AlertTriangle, XCircle, Grid, Maximize2 } from 'lucide-react';
import { sound } from '../../../utils/sound';

interface ShapeHalosModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialShape?: ShapeType;
}

export const ShapeHalosModal: React.FC<ShapeHalosModalProps> = ({
  isOpen,
  onClose,
  initialShape = 'circle',
}) => {
  const [selectedShape, setSelectedShape] = useState<ShapeType>(initialShape);
  const [viewMode, setViewMode] = useState<'all' | 'single'>('all');

  if (!isOpen) return null;

  const shapes: { id: ShapeType; label: string; icon: string }[] = [
    { id: 'circle', label: 'Cercle', icon: '⚪' },
    { id: 'triangle', label: 'Triangle', icon: '🔺' },
    { id: 'star', label: 'Étoile', icon: '⭐' },
    { id: 'stickman', label: 'Bonhomme', icon: '🧍' },
    { id: 'face', label: 'Visage', icon: '😊' },
  ];

  const renderHalosSvgContent = (shape: ShapeType) => {
    switch (shape) {
      case 'circle':
        return (
          <>
            {/* Zone 3 Débordement (épaisseur 80px = rayon 40px) */}
            <circle cx="170" cy="170" r="95" fill="none" stroke="rgba(251, 146, 60, 0.3)" strokeWidth="80" />
            {/* Zone 2 Tolérance (épaisseur 52px = rayon 26px) */}
            <circle cx="170" cy="170" r="95" fill="none" stroke="rgba(250, 204, 21, 0.45)" strokeWidth="52" />
            {/* Zone 1 Cœur (épaisseur 24px = rayon 12px) */}
            <circle cx="170" cy="170" r="95" fill="none" stroke="rgba(16, 185, 129, 0.75)" strokeWidth="24" />
            {/* Ligne médiane cible */}
            <circle cx="170" cy="170" r="95" fill="none" stroke="#047857" strokeWidth="2.5" />
            {/* Exemple Pinceau 10px posé */}
            <circle cx="265" cy="170" r="5" fill="#9333ea" stroke="#ffffff" strokeWidth="1.5" />
            <text x="265" y="196" fontSize="9" fontWeight="bold" fill="#7e22ce" textAnchor="middle">
              Pinceau 10px
            </text>
          </>
        );

      case 'triangle':
        return (
          <>
            {/* Points triangle : (170, 60), (265.26, 225), (74.74, 225) */}
            <polygon
              points="170,60 265.26,225 74.74,225"
              fill="none"
              stroke="rgba(251, 146, 60, 0.3)"
              strokeWidth="80"
              strokeLinejoin="round"
            />
            <polygon
              points="170,60 265.26,225 74.74,225"
              fill="none"
              stroke="rgba(250, 204, 21, 0.45)"
              strokeWidth="52"
              strokeLinejoin="round"
            />
            <polygon
              points="170,60 265.26,225 74.74,225"
              fill="none"
              stroke="rgba(16, 185, 129, 0.75)"
              strokeWidth="24"
              strokeLinejoin="round"
            />
            <polygon
              points="170,60 265.26,225 74.74,225"
              fill="none"
              stroke="#047857"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Exemple Pinceau 10px */}
            <circle cx="170" cy="60" r="5" fill="#9333ea" stroke="#ffffff" strokeWidth="1.5" />
            <text x="170" y="44" fontSize="9" fontWeight="bold" fill="#7e22ce" textAnchor="middle">
              Pinceau 10px
            </text>
          </>
        );

      case 'star': {
        const outerR = 105;
        const innerR = 48;
        const pts: string[] = [];
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          pts.push(`${(170 + r * Math.cos(angle)).toFixed(1)},${(170 + r * Math.sin(angle)).toFixed(1)}`);
        }
        const ptsStr = pts.join(' ');
        return (
          <>
            <polygon
              points={ptsStr}
              fill="none"
              stroke="rgba(251, 146, 60, 0.3)"
              strokeWidth="70"
              strokeLinejoin="round"
            />
            <polygon
              points={ptsStr}
              fill="none"
              stroke="rgba(250, 204, 21, 0.45)"
              strokeWidth="48"
              strokeLinejoin="round"
            />
            <polygon
              points={ptsStr}
              fill="none"
              stroke="rgba(16, 185, 129, 0.75)"
              strokeWidth="24"
              strokeLinejoin="round"
            />
            <polygon
              points={ptsStr}
              fill="none"
              stroke="#047857"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Exemple Pinceau 10px sur une pointe */}
            <circle cx="170" cy="65" r="5" fill="#9333ea" stroke="#ffffff" strokeWidth="1.5" />
          </>
        );
      }

      case 'stickman':
        return (
          <>
            {/* Zone Débordement */}
            <g
              fill="none"
              stroke="rgba(251, 146, 60, 0.3)"
              strokeWidth="70"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="170" cy="75" r="30" />
              <line x1="170" y1="105" x2="170" y2="205" />
              <line x1="105" y1="145" x2="170" y2="135" />
              <line x1="170" y1="135" x2="235" y2="145" />
              <line x1="170" y1="205" x2="115" y2="290" />
              <line x1="170" y1="205" x2="225" y2="290" />
            </g>
            {/* Zone Tolérance */}
            <g
              fill="none"
              stroke="rgba(250, 204, 21, 0.45)"
              strokeWidth="48"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="170" cy="75" r="30" />
              <line x1="170" y1="105" x2="170" y2="205" />
              <line x1="105" y1="145" x2="170" y2="135" />
              <line x1="170" y1="135" x2="235" y2="145" />
              <line x1="170" y1="205" x2="115" y2="290" />
              <line x1="170" y1="205" x2="225" y2="290" />
            </g>
            {/* Zone Cœur */}
            <g
              fill="none"
              stroke="rgba(16, 185, 129, 0.75)"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="170" cy="75" r="30" />
              <line x1="170" y1="105" x2="170" y2="205" />
              <line x1="105" y1="145" x2="170" y2="135" />
              <line x1="170" y1="135" x2="235" y2="145" />
              <line x1="170" y1="205" x2="115" y2="290" />
              <line x1="170" y1="205" x2="225" y2="290" />
            </g>
            {/* Ligne médiane */}
            <g
              fill="none"
              stroke="#047857"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="170" cy="75" r="30" />
              <line x1="170" y1="105" x2="170" y2="205" />
              <line x1="105" y1="145" x2="170" y2="135" />
              <line x1="170" y1="135" x2="235" y2="145" />
              <line x1="170" y1="205" x2="115" y2="290" />
              <line x1="170" y1="205" x2="225" y2="290" />
            </g>
            {/* Exemple Pinceau 10px posé sur la main droite */}
            <circle cx="235" cy="145" r="5" fill="#9333ea" stroke="#ffffff" strokeWidth="1.5" />
          </>
        );

      case 'face':
        return (
          <>
            {/* Zone Débordement */}
            <g
              fill="none"
              stroke="rgba(251, 146, 60, 0.3)"
              strokeWidth="70"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="170" cy="170" r="95" />
              <circle cx="130" cy="135" r="9" />
              <circle cx="210" cy="135" r="9" />
              <path d="M 125 195 Q 170 240 215 195" />
            </g>
            {/* Zone Tolérance */}
            <g
              fill="none"
              stroke="rgba(250, 204, 21, 0.45)"
              strokeWidth="48"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="170" cy="170" r="95" />
              <circle cx="130" cy="135" r="9" />
              <circle cx="210" cy="135" r="9" />
              <path d="M 125 195 Q 170 240 215 195" />
            </g>
            {/* Zone Cœur */}
            <g
              fill="none"
              stroke="rgba(16, 185, 129, 0.75)"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="170" cy="170" r="95" />
              <circle cx="130" cy="135" r="9" />
              <circle cx="210" cy="135" r="9" />
              <path d="M 125 195 Q 170 240 215 195" />
            </g>
            {/* Ligne médiane */}
            <g
              fill="none"
              stroke="#047857"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="170" cy="170" r="95" />
              <circle cx="130" cy="135" r="9" />
              <circle cx="210" cy="135" r="9" />
              <path d="M 125 195 Q 170 240 215 195" />
            </g>
            {/* Exemple Pinceau 10px posé sur le sourire */}
            <circle cx="170" cy="217" r="5" fill="#9333ea" stroke="#ffffff" strokeWidth="1.5" />
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="clay-card bg-white w-full max-w-2xl max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden shadow-2xl border-2 border-purple-200 my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-purple-100 pb-3 mb-4 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-slate-800">
                Marges de Score & Formes Cibles
              </h3>
              <p className="text-xs text-slate-500">
                Visualisation des 4 zones du barème (pinceau 10px)
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playPop();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center justify-between gap-2 mb-4 flex-shrink-0">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => {
                sound.playPop();
                setViewMode('all');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Les 5 formes</span>
            </button>
            <button
              onClick={() => {
                sound.playPop();
                setViewMode('single');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'single'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Vue détaillée</span>
            </button>
          </div>

          <div className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200 flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
            <span>Pinceau : 10px (rond)</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto space-y-4 pr-1">
          {/* Mode 1 : Gallery with all 5 shapes */}
          {viewMode === 'all' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {shapes.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center hover:border-purple-300 transition-all"
                >
                  <div className="font-heading font-bold text-xs text-slate-700 mb-1 flex items-center gap-1">
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </div>
                  <div className="w-[170px] h-[170px] bg-rose-50/70 rounded-xl relative border border-rose-200/60 overflow-hidden flex items-center justify-center shadow-inner">
                    <svg viewBox="0 0 340 340" className="w-full h-full">
                      {renderHalosSvgContent(s.id)}
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mode 2 : Single shape detailed view */}
          {viewMode === 'single' && (
            <div className="space-y-3">
              {/* Shape buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {shapes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      sound.playPop();
                      setSelectedShape(s.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold transition-all cursor-pointer ${
                      selectedShape === s.id
                        ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-300'
                        : 'bg-slate-100 hover:bg-purple-50 text-slate-700'
                    }`}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>

              {/* Large Canvas */}
              <div className="flex flex-col items-center">
                <div className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] bg-rose-50/80 rounded-2xl relative border-2 border-rose-200 shadow-inner overflow-hidden flex items-center justify-center">
                  <div className="absolute top-2 left-2 text-[10px] font-bold text-rose-500 bg-rose-100/80 px-2 py-0.5 rounded-md pointer-events-none">
                    Hors-piste (-1.35 pt)
                  </div>
                  <svg viewBox="0 0 340 340" className="w-full h-full">
                    {renderHalosSvgContent(selectedShape)}
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Scoring Table Summary */}
          <div className="clay-card p-3.5 bg-slate-50 border border-slate-200 space-y-2 mt-2">
            <h4 className="font-heading font-bold text-xs text-slate-700 uppercase tracking-wide">
              Barème des 4 marges concentriques
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div>
                  <div className="font-bold text-emerald-800">
                    Zone Cœur (Vert) : +1.0 pt
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Distance ≤ 12px • Pile sur la silhouette
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 border border-amber-200">
                <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <div>
                  <div className="font-bold text-amber-800">
                    Zone Tolérance (Jaune) : +0.55 pt
                  </div>
                  <div className="text-[11px] text-amber-700">
                    Distance 12 à 26px • Légère déviation
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-orange-50 border border-orange-200">
                <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                <div>
                  <div className="font-bold text-orange-800">
                    Débordement (Orange) : -0.25 pt
                  </div>
                  <div className="text-[11px] text-orange-700">
                    Distance 26 à 40px • Sortie de route
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-50 border border-rose-200">
                <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <div>
                  <div className="font-bold text-rose-800">
                    Hors-piste (Rouge) : -1.35 pt
                  </div>
                  <div className="text-[11px] text-rose-700">
                    Distance &gt; 40px • Gribouillage sanctionné à 0%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
