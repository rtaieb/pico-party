export type Difficulty = 'easy' | 'normal' | 'hard';
export type NoteFigure = 'noire' | 'croche' | 'double';

export const TEMPO_BPM = 80;
export const BEAT_MS = (60 / TEMPO_BPM) * 1000; // 750 ms for a quarter note (noire) at 80 BPM
export const TOLERANCE_PERFECT_MS = 10; // ±10ms = 100% of note points
export const MAX_ERROR_MS = 300; // ≥300ms error = 0% for that note
export const TIMEOUT_AFTER_LAST_NOTE_MS = 5000; // 5s after theoretical last note

export const NOTE_DURATIONS_MS: Record<NoteFigure, number> = {
  noire: BEAT_MS, // 750 ms
  croche: BEAT_MS / 2, // 375 ms
  double: BEAT_MS / 4, // 187.5 ms
};

export const NOTE_LABELS: Record<NoteFigure, string> = {
  noire: 'Noire',
  croche: 'Croche',
  double: 'Double-croche',
};

export interface RhythmNote {
  index: number;
  figure: NoteFigure;
  durationMs: number; // interval to the NEXT note (for the last note, its nominal ring duration)
  targetTimestampMs: number; // cumulative time from the 1st note (t0 = 0)
}

export interface RhythmPattern {
  roundNumber: number; // 1-indexed
  totalRounds: number;
  difficulty: Difficulty;
  notes: RhythmNote[];
  totalDurationMs: number; // timestamp of the last note (T_{N-1})
  proportionsUsed: {
    noire: number;
    croche: number;
    double: number;
  };
}

export interface NoteEvaluation {
  index: number;
  figure: NoteFigure;
  status: 'tapped' | 'missed';
  targetIntervalMs: number | null; // null for the 1st note (t0 anchor)
  actualIntervalMs: number | null;
  diffMs: number | null; // signed difference: actualInterval - targetInterval
  absErrorMs: number | null;
  isPerfect: boolean; // within ±10ms (or 1st note anchor)
  noteWeightPct: number; // 100 / N
  earnedPct: number; // 0 to 100 / N
  accuracyRatio: number; // 0 to 1
  playerTimestampMs: number | null;
}

export interface RhythmAttemptEvaluation {
  scorePercentage: number; // 0 to 100 (rounded to 1 decimal or integer)
  scoreExact: number;
  tappedCount: number;
  targetCount: number;
  missedCount: number;
  perfectCount: number;
  avgErrorMs: number;
  timedOut: boolean;
  noteEvaluations: NoteEvaluation[];
  feedback: string;
}

/**
 * Computes the number of notes and the shifted percentages of Noires / Croches / Doubles-croches
 * for a given difficulty and round progression.
 */
export function getRoundParameters(
  difficulty: Difficulty,
  roundIndex: number, // 0-indexed (0 = Tour 1)
  totalRounds: number
): {
  noteCount: number;
  proportions: { noire: number; croche: number; double: number };
} {
  // Progression factor p in [0, 1] from Tour 1 (p=0) to last tour (p=1)
  const p = totalRounds <= 1 ? 0 : Math.max(0, Math.min(1, roundIndex / (totalRounds - 1)));

  if (difficulty === 'easy') {
    // Facile : de 5 notes (Tour 1) à 8 notes (dernier tour)
    // Base : 70 % Noires, 30 % Croches.
    // Variation par tour : moins de noires (-20% max), plus de croches (+20% max).
    const noteCount = Math.round(5 + p * (8 - 5));
    const noire = Math.round(70 - p * 20);
    const croche = 100 - noire;
    return {
      noteCount,
      proportions: { noire, croche, double: 0 },
    };
  }

  if (difficulty === 'normal') {
    // Normal : de 8 notes (Tour 1) à 10 notes (dernier tour)
    // Base : 45 % Noires, 40 % Croches, 15 % Doubles-croches.
    // Variation par tour : moins de noires (-18% max), plus de croches (+8% max) et doubles-croches (+10% max).
    const noteCount = Math.round(8 + p * (10 - 8));
    const noire = Math.round(45 - p * 18);
    const croche = Math.round(40 + p * 8);
    const double = Math.max(0, 100 - noire - croche);
    return {
      noteCount,
      proportions: { noire, croche, double },
    };
  }

  // Difficile : de 6 notes (Tour 1) à 15 notes (dernier tour)
  // Base : 20 % Noires, 40 % Croches, 40 % Doubles-croches.
  // Variation par tour : moins de noires (-14% max), plus de croches (+4% max) et doubles-croches (+10% max).
  const noteCount = Math.round(6 + p * (15 - 6));
  const noire = Math.max(5, Math.round(20 - p * 14));
  const croche = Math.round(40 + p * 4);
  const double = Math.max(0, 100 - noire - croche);
  return {
    noteCount,
    proportions: { noire, croche, double },
  };
}

/**
 * Generates a rhythmic pattern at 80 BPM for a given round and difficulty.
 */
export function generateRhythmPattern(
  difficulty: Difficulty,
  roundIndex: number,
  totalRounds: number
): RhythmPattern {
  const { noteCount, proportions } = getRoundParameters(difficulty, roundIndex, totalRounds);

  // Number of intervals between N notes is N - 1, plus 1 final note figure
  // We build a pool of figures matching the target proportions so every round
  // faithfully reflects the difficulty & round shift while remaining random in order.
  const figures: NoteFigure[] = [];
  const intervalCount = Math.max(1, noteCount - 1);

  const exactNoires = (proportions.noire / 100) * intervalCount;
  const exactCroches = (proportions.croche / 100) * intervalCount;
  const exactDoubles = (proportions.double / 100) * intervalCount;

  let countNoires = Math.floor(exactNoires);
  let countCroches = Math.floor(exactCroches);
  let countDoubles = Math.floor(exactDoubles);

  // Distribute remaining intervals using fractional remainders + slight randomness
  const remainders: { type: NoteFigure; rem: number }[] = [
    { type: 'noire' as NoteFigure, rem: exactNoires - countNoires + Math.random() * 0.15 },
    { type: 'croche' as NoteFigure, rem: exactCroches - countCroches + Math.random() * 0.15 },
    {
      type: 'double' as NoteFigure,
      rem: proportions.double > 0 ? exactDoubles - countDoubles + Math.random() * 0.15 : -1,
    },
  ].sort((a, b) => b.rem - a.rem);

  let idx = 0;
  while (countNoires + countCroches + countDoubles < intervalCount) {
    const pick = remainders[idx % remainders.length].type;
    if (pick === 'noire') countNoires++;
    else if (pick === 'croche') countCroches++;
    else if (proportions.double > 0) countDoubles++;
    else countNoires++;
    idx++;
  }

  for (let i = 0; i < countNoires; i++) figures.push('noire');
  for (let i = 0; i < countCroches; i++) figures.push('croche');
  for (let i = 0; i < countDoubles; i++) figures.push('double');

  // Fisher-Yates shuffle for a fresh rhythm order
  for (let i = figures.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [figures[i], figures[j]] = [figures[j], figures[i]];
  }

  // Final note gets a nominal figure (noire) since it's the last hit
  figures.push('noire');

  const notes: RhythmNote[] = [];
  let cumulativeMs = 0;

  for (let i = 0; i < noteCount; i++) {
    const fig = figures[i] || 'noire';
    const durationMs = NOTE_DURATIONS_MS[fig];
    notes.push({
      index: i,
      figure: fig,
      durationMs,
      targetTimestampMs: cumulativeMs,
    });
    if (i < noteCount - 1) {
      cumulativeMs += durationMs;
    }
  }

  return {
    roundNumber: roundIndex + 1,
    totalRounds,
    difficulty,
    notes,
    totalDurationMs: cumulativeMs,
    proportionsUsed: proportions,
  };
}

/**
 * Evaluates a player's tapped timestamps (relative to first tap t0 = 0)
 * using Option A (Intervals Δt between consecutive notes):
 * - Each note represents 100% / N of the score.
 * - Any missing note deducts 100% / N (gets 0%).
 * - Within ±10ms of the target interval = 100% of that note's weight.
 * - Beyond 10ms = linear decay down to 0% at MAX_ERROR_MS (300ms).
 */
export function evaluateRhythmAttempt(
  pattern: RhythmPattern,
  playerTimestampsMs: number[],
  timedOut: boolean = false
): RhythmAttemptEvaluation {
  const N = pattern.notes.length;
  const noteWeightPct = 100 / N;
  const noteEvaluations: NoteEvaluation[] = [];

  let totalEarnedPct = 0;
  let perfectCount = 0;
  let totalAbsError = 0;
  let intervalMeasuredCount = 0;

  // First, evaluate intervals for notes 1..N-1
  const intervalRatios: number[] = [];
  for (let i = 1; i < N; i++) {
    if (i < playerTimestampsMs.length) {
      const targetIntervalMs =
        pattern.notes[i].targetTimestampMs - pattern.notes[i - 1].targetTimestampMs;
      const actualIntervalMs = playerTimestampsMs[i] - playerTimestampsMs[i - 1];
      const diffMs = actualIntervalMs - targetIntervalMs;
      const absErrorMs = Math.abs(diffMs);

      let ratio = 0;
      if (absErrorMs <= TOLERANCE_PERFECT_MS) {
        ratio = 1;
      } else if (absErrorMs < MAX_ERROR_MS) {
        ratio = 1 - (absErrorMs - TOLERANCE_PERFECT_MS) / (MAX_ERROR_MS - TOLERANCE_PERFECT_MS);
      } else {
        ratio = 0;
      }
      intervalRatios.push(ratio);
    }
  }

  for (let i = 0; i < N; i++) {
    const targetNote = pattern.notes[i];
    const hasTapped = i < playerTimestampsMs.length;

    if (!hasTapped) {
      // Missing note: deducts 100% / N (earns 0%)
      noteEvaluations.push({
        index: i,
        figure: targetNote.figure,
        status: 'missed',
        targetIntervalMs:
          i > 0 ? targetNote.targetTimestampMs - pattern.notes[i - 1].targetTimestampMs : null,
        actualIntervalMs: null,
        diffMs: null,
        absErrorMs: null,
        isPerfect: false,
        noteWeightPct,
        earnedPct: 0,
        accuracyRatio: 0,
        playerTimestampMs: null,
      });
      continue;
    }

    if (i === 0) {
      // 1st note is the t0 start trigger: earns 100% of its share (unless player mashed all notes with 0% interval accuracy)
      const allIntervalsZero =
        intervalRatios.length > 0 && intervalRatios.every((r) => r === 0);
      const ratio = allIntervalsZero ? 0 : 1;
      const earned = ratio * noteWeightPct;
      totalEarnedPct += earned;
      if (ratio === 1) perfectCount++;

      noteEvaluations.push({
        index: 0,
        figure: targetNote.figure,
        status: 'tapped',
        targetIntervalMs: null,
        actualIntervalMs: 0,
        diffMs: 0,
        absErrorMs: 0,
        isPerfect: ratio === 1,
        noteWeightPct,
        earnedPct: earned,
        accuracyRatio: ratio,
        playerTimestampMs: playerTimestampsMs[0],
      });
    } else {
      const targetIntervalMs =
        targetNote.targetTimestampMs - pattern.notes[i - 1].targetTimestampMs;
      const actualIntervalMs = playerTimestampsMs[i] - playerTimestampsMs[i - 1];
      const diffMs = actualIntervalMs - targetIntervalMs;
      const absErrorMs = Math.abs(diffMs);

      let ratio = 0;
      const isPerfect = absErrorMs <= TOLERANCE_PERFECT_MS;
      if (isPerfect) {
        ratio = 1;
        perfectCount++;
      } else if (absErrorMs < MAX_ERROR_MS) {
        ratio = 1 - (absErrorMs - TOLERANCE_PERFECT_MS) / (MAX_ERROR_MS - TOLERANCE_PERFECT_MS);
      } else {
        ratio = 0;
      }

      const earned = ratio * noteWeightPct;
      totalEarnedPct += earned;
      totalAbsError += absErrorMs;
      intervalMeasuredCount++;

      noteEvaluations.push({
        index: i,
        figure: targetNote.figure,
        status: 'tapped',
        targetIntervalMs,
        actualIntervalMs,
        diffMs,
        absErrorMs,
        isPerfect,
        noteWeightPct,
        earnedPct: earned,
        accuracyRatio: ratio,
        playerTimestampMs: playerTimestampsMs[i],
      });
    }
  }

  const scoreExact = Math.max(0, Math.min(100, totalEarnedPct));
  const scorePercentage = Math.round(scoreExact * 10) / 10;
  const avgErrorMs =
    intervalMeasuredCount > 0 ? Math.round(totalAbsError / intervalMeasuredCount) : 0;
  const tappedCount = Math.min(N, playerTimestampsMs.length);
  const missedCount = N - tappedCount;

  let feedback = '';
  if (scorePercentage >= 98) {
    feedback = '🥁 Maître du Tam-Tam ! Tempo parfait !';
  } else if (scorePercentage >= 85) {
    feedback = '🔥 Superbe groove, quelle précision !';
  } else if (scorePercentage >= 65) {
    feedback = '👏 Bon sens du rythme !';
  } else if (missedCount > 0) {
    feedback = `⏱️ ${missedCount} note${missedCount > 1 ? 's' : ''} manquante${missedCount > 1 ? 's' : ''} (-${Math.round(missedCount * noteWeightPct)}%)`;
  } else {
    feedback = '🎶 Rythme un peu décalé, réécoute bien le tempo !';
  }

  return {
    scorePercentage,
    scoreExact,
    tappedCount,
    targetCount: N,
    missedCount,
    perfectCount,
    avgErrorMs,
    timedOut,
    noteEvaluations,
    feedback,
  };
}
