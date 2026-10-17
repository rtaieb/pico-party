import type { FrameColor } from '../types';

export interface PresetAvatar {
  id: string;
  name: string;
  role: string;
  frameColor: FrameColor;
  svg: (className?: string) => React.ReactNode;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  {
    id: 'inspector',
    name: 'Gaston',
    role: "L'Inspecteur",
    frameColor: 'blue',
    svg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 110" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="110" fill="#f2f5f9" />
        {/* Body / Trench */}
        <path d="M25 110 L35 85 L65 85 L75 110 Z" fill="#b08b59" />
        <path d="M40 85 L50 95 L60 85 Z" fill="#ffffff" />
        <path d="M48 93 L50 105 L52 93 Z" fill="#c0392b" />
        {/* Head */}
        <circle cx="50" cy="55" r="22" fill="#ffd1b3" />
        <circle cx="28" cy="55" r="4" fill="#ffd1b3" />
        <circle cx="72" cy="55" r="4" fill="#ffd1b3" />
        {/* Eyes & Eyebrows */}
        <circle cx="43" cy="52" r="3" fill="#2d3436" />
        <circle cx="57" cy="52" r="3" fill="#2d3436" />
        <path d="M39 46 Q43 43 47 46" stroke="#5d4037" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M53 46 Q57 43 61 46" stroke="#5d4037" strokeWidth="2.5" strokeLinecap="round" />
        {/* Nose */}
        <path d="M50 51 L48 57 L52 57" stroke="#e08e6d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Big classic mustache */}
        <path d="M38 65 Q45 61 50 64 Q55 61 62 65 Q58 70 50 67 Q42 70 38 65 Z" fill="#4e342e" />
        {/* Fedora Hat */}
        <ellipse cx="50" cy="38" rx="28" ry="7" fill="#6d4c41" />
        <path d="M32 38 C32 20 40 18 50 18 C60 18 68 20 68 38 Z" fill="#795548" />
        <path d="M33 37 C40 35 60 35 67 37" stroke="#3e2723" strokeWidth="3" />
      </svg>
    ),
  },
  {
    id: 'hipster',
    name: 'Oscar',
    role: 'Le Hipster',
    frameColor: 'red',
    svg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 110" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="110" fill="#fdf7f2" />
        {/* Body */}
        <path d="M22 110 C26 86 40 85 50 85 C60 85 74 86 78 110 Z" fill="#2c3e50" />
        {/* Head */}
        <circle cx="50" cy="56" r="22" fill="#fedac2" />
        {/* Big ginger beard */}
        <path d="M33 58 C33 78 40 85 50 85 C60 85 67 78 67 58 Q59 62 50 62 Q41 62 33 58 Z" fill="#d35400" />
        {/* Mouth */}
        <path d="M46 68 Q50 71 54 68" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        {/* Round Glasses */}
        <circle cx="41" cy="51" r="7" stroke="#2c3e50" strokeWidth="2.5" fill="rgba(255,255,255,0.4)" />
        <circle cx="59" cy="51" r="7" stroke="#2c3e50" strokeWidth="2.5" fill="rgba(255,255,255,0.4)" />
        <line x1="48" y1="51" x2="52" y2="51" stroke="#2c3e50" strokeWidth="2.5" />
        <circle cx="41" cy="51" r="2.5" fill="#2c3e50" />
        <circle cx="59" cy="51" r="2.5" fill="#2c3e50" />
        {/* Mustard Yellow Beanie */}
        <path d="M30 44 C30 24 38 22 50 22 C62 22 70 24 70 44 Z" fill="#f39c12" />
        <rect x="27" y="40" width="46" height="8" rx="4" fill="#e67e22" />
      </svg>
    ),
  },
  {
    id: 'retro_lady',
    name: 'Colette',
    role: "L'Artiste",
    frameColor: 'yellow',
    svg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 110" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="110" fill="#fef9f3" />
        {/* Body */}
        <path d="M25 110 C29 88 40 86 50 86 C60 86 71 88 75 110 Z" fill="#e74c3c" />
        {/* Hair Back */}
        <circle cx="50" cy="54" r="25" fill="#2c3e50" />
        {/* Head */}
        <circle cx="50" cy="54" r="20" fill="#ffeaa7" />
        {/* Red Beret */}
        <ellipse cx="50" cy="36" rx="24" ry="12" fill="#c0392b" transform="rotate(-8 50 36)" />
        <circle cx="50" cy="24" r="2.5" fill="#962d22" />
        {/* Eyes & Lashes */}
        <circle cx="42" cy="52" r="3" fill="#2d3436" />
        <circle cx="58" cy="52" r="3" fill="#2d3436" />
        <path d="M39 48 Q42 45 45 48" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round" />
        <path d="M55 48 Q58 45 61 48" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round" />
        {/* Cheeks */}
        <circle cx="37" cy="57" r="3.5" fill="#fab1a0" opacity="0.6" />
        <circle cx="63" cy="57" r="3.5" fill="#fab1a0" opacity="0.6" />
        {/* Red Lips */}
        <path d="M46 64 Q50 67 54 64" stroke="#d63031" strokeWidth="3" strokeLinecap="round" />
        {/* Earrings */}
        <circle cx="28" cy="56" r="3" stroke="#f1c40f" strokeWidth="2" />
        <circle cx="72" cy="56" r="3" stroke="#f1c40f" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 'sailor',
    name: 'Barnabé',
    role: 'Le Capitaine',
    frameColor: 'blue',
    svg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 110" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="110" fill="#f0f7fb" />
        {/* Sailor striped shirt */}
        <path d="M22 110 C26 86 40 85 50 85 C60 85 74 86 78 110 Z" fill="#2980b9" />
        <rect x="30" y="92" width="40" height="4" fill="#ffffff" />
        <rect x="26" y="102" width="48" height="4" fill="#ffffff" />
        {/* Head */}
        <circle cx="50" cy="56" r="21" fill="#f7d794" />
        {/* White / Grey Beard & Mustache */}
        <path d="M34 60 C34 76 42 82 50 82 C58 82 66 76 66 60 Q58 64 50 64 Q42 64 34 60 Z" fill="#ecf0f1" />
        <path d="M40 64 Q45 61 50 63 Q55 61 60 64" stroke="#bdc3c7" strokeWidth="3" strokeLinecap="round" />
        {/* Eyes (twinkling) */}
        <path d="M41 52 Q44 49 47 52" stroke="#2c3e50" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M53 52 Q56 49 59 52" stroke="#2c3e50" strokeWidth="2.5" strokeLinecap="round" />
        {/* Sailor Cap */}
        <path d="M28 42 C28 26 36 24 50 24 C64 24 72 26 72 42 Z" fill="#1e3799" />
        <rect x="26" y="40" width="48" height="6" rx="2" fill="#0c2461" />
        <circle cx="50" cy="34" r="3" fill="#f6b93b" />
      </svg>
    ),
  },
  {
    id: 'curly_sporty',
    name: 'Maya',
    role: 'La Championne',
    frameColor: 'green',
    svg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 110" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="110" fill="#f0fbf7" />
        {/* Body */}
        <path d="M24 110 C28 87 40 86 50 86 C60 86 72 87 76 110 Z" fill="#00b894" />
        {/* Big Afro Hair */}
        <circle cx="50" cy="50" r="30" fill="#2d3436" />
        <circle cx="30" cy="40" r="12" fill="#2d3436" />
        <circle cx="70" cy="40" r="12" fill="#2d3436" />
        <circle cx="50" cy="28" r="14" fill="#2d3436" />
        {/* Head */}
        <circle cx="50" cy="56" r="20" fill="#c68642" />
        {/* Headband Fluo */}
        <path d="M30 48 Q50 44 70 48" stroke="#fdcb6e" strokeWidth="6" strokeLinecap="round" />
        {/* Big Eyes */}
        <circle cx="43" cy="55" r="3.5" fill="#2d3436" />
        <circle cx="57" cy="55" r="3.5" fill="#2d3436" />
        <circle cx="44" cy="54" r="1" fill="#ffffff" />
        <circle cx="58" cy="54" r="1" fill="#ffffff" />
        {/* Cheerful Smile */}
        <path d="M43 65 Q50 72 57 65" stroke="#2d3436" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M45 66 Q50 70 55 66" fill="#ffffff" />
      </svg>
    ),
  },
  {
    id: 'grandpa',
    name: 'Félix',
    role: 'Le Doyen',
    frameColor: 'purple',
    svg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 110" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="110" fill="#f8f4fb" />
        {/* Body */}
        <path d="M24 110 C28 87 40 86 50 86 C60 86 72 87 76 110 Z" fill="#6c5ce7" />
        {/* Bow tie */}
        <path d="M43 89 L47 92 L43 95 Z M57 89 L53 92 L57 95 Z" fill="#fdcb6e" />
        <circle cx="50" cy="92" r="2.5" fill="#f39c12" />
        {/* White Hair Sides */}
        <circle cx="30" cy="55" r="9" fill="#dfe6e9" />
        <circle cx="70" cy="55" r="9" fill="#dfe6e9" />
        {/* Head (Bald on top) */}
        <circle cx="50" cy="55" r="22" fill="#ffd1b3" />
        {/* Eyebrows bushy */}
        <path d="M38 46 Q43 43 47 46" stroke="#b2bec3" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M53 46 Q57 43 62 46" stroke="#b2bec3" strokeWidth="3.5" strokeLinecap="round" />
        {/* Half-moon spectacles */}
        <path d="M37 53 Q43 59 49 53 Z" fill="rgba(255,255,255,0.7)" stroke="#2d3436" strokeWidth="2" />
        <path d="M51 53 Q57 59 63 53 Z" fill="rgba(255,255,255,0.7)" stroke="#2d3436" strokeWidth="2" />
        <line x1="49" y1="53" x2="51" y2="53" stroke="#2d3436" strokeWidth="2" />
        {/* Friendly smile */}
        <path d="M45 66 Q50 70 55 66" stroke="#2d3436" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'cool_gamer',
    name: 'Sacha',
    role: 'Le Joueur',
    frameColor: 'red',
    svg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 110" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="110" fill="#fff5f5" />
        {/* Hoodie */}
        <path d="M22 110 C26 86 40 85 50 85 C60 85 74 86 78 110 Z" fill="#e17055" />
        {/* Head */}
        <circle cx="50" cy="55" r="21" fill="#fedac2" />
        {/* Backward Cap */}
        <path d="M30 48 C30 30 38 28 50 28 C62 28 70 30 70 48 Z" fill="#0984e3" />
        <path d="M40 28 L60 28 L66 22 L46 22 Z" fill="#074b83" />
        {/* Headphones over ears */}
        <rect x="25" y="48" width="6" height="16" rx="3" fill="#2d3436" />
        <rect x="69" y="48" width="6" height="16" rx="3" fill="#2d3436" />
        <path d="M28 48 C28 26 72 26 72 48" stroke="#2d3436" strokeWidth="4" fill="none" />
        {/* Eyes & Smirk */}
        <circle cx="43" cy="54" r="3" fill="#2d3436" />
        <circle cx="57" cy="54" r="3" fill="#2d3436" />
        <path d="M45 64 Q52 66 56 62" stroke="#2d3436" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'pop_star',
    name: 'Luna',
    role: 'La Rêveuse',
    frameColor: 'purple',
    svg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 110" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="110" fill="#faf5ff" />
        {/* Pink hair back */}
        <path d="M25 50 C18 70 24 95 35 100 L65 100 C76 95 82 70 75 50 Z" fill="#fd79a8" />
        {/* Body */}
        <path d="M25 110 C29 88 40 86 50 86 C60 86 71 88 75 110 Z" fill="#a29bfe" />
        {/* Head */}
        <circle cx="50" cy="54" r="20" fill="#ffd1b3" />
        {/* Bangs */}
        <path d="M30 48 C36 40 46 44 50 48 C54 44 64 40 70 48 C70 34 60 30 50 30 C40 30 30 34 30 48 Z" fill="#e84393" />
        {/* Star clip */}
        <polygon points="68,36 70,40 74,40 71,43 72,47 68,44 64,47 65,43 62,40 66,40" fill="#ffeaa7" />
        {/* Eyes */}
        <circle cx="43" cy="54" r="3" fill="#2d3436" />
        <circle cx="57" cy="54" r="3" fill="#2d3436" />
        {/* Smile & Blush */}
        <circle cx="38" cy="58" r="3" fill="#ff7675" opacity="0.5" />
        <circle cx="62" cy="58" r="3" fill="#ff7675" opacity="0.5" />
        <path d="M46 63 Q50 67 54 63" stroke="#d63031" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export const getAvatarById = (id: string): PresetAvatar => {
  return PRESET_AVATARS.find((a) => a.id === id) || PRESET_AVATARS[0];
};
