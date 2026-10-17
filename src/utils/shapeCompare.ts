export type ShapeType = 'circle' | 'triangle' | 'star' | 'stickman' | 'face';

export interface Point {
  x: number;
  y: number;
}

export interface OrientedPoint {
  x: number;
  y: number;
  ux: number;
  uy: number;
}

export interface ComparisonResult {
  accuracyPercentage: number;
  shapeScore: number;
  coverageScore: number;
  penaltyPixels: number;
  feedback: string;
}

export const CANVAS_SIZE = 340;
export const BRUSH_WIDTH = 10;

// Sample oriented points along a straight line segment [p1, p2]
const sampleOrientedLine = (p1: Point, p2: Point, count: number): OrientedPoint[] => {
  const points: OrientedPoint[] = [];
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  for (let i = 0; i <= count; i++) {
    const t = count === 0 ? 0 : i / count;
    points.push({
      x: p1.x + dx * t,
      y: p1.y + dy * t,
      ux,
      uy,
    });
  }
  return points;
};

// Sample oriented points along a circle
const sampleOrientedCircle = (cx: number, cy: number, r: number, count: number): OrientedPoint[] => {
  const points: OrientedPoint[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI;
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      // Tangent vector (-sin, cos)
      ux: -Math.sin(angle),
      uy: Math.cos(angle),
    });
  }
  return points;
};

// Dense oriented reference points for each target shape
export const getTargetOrientedPoints = (shape: ShapeType): OrientedPoint[] => {
  const points: OrientedPoint[] = [];

  if (shape === 'circle') {
    return sampleOrientedCircle(170, 170, 95, 180);
  }

  if (shape === 'triangle') {
    const r = 110;
    const v1 = { x: 170, y: 170 - r };
    const v2 = { x: 170 + r * Math.cos(Math.PI / 6), y: 170 + r * Math.sin(Math.PI / 6) };
    const v3 = { x: 170 - r * Math.cos(Math.PI / 6), y: 170 + r * Math.sin(Math.PI / 6) };

    points.push(...sampleOrientedLine(v1, v2, 60));
    points.push(...sampleOrientedLine(v2, v3, 60));
    points.push(...sampleOrientedLine(v3, v1, 60));
    return points;
  }

  if (shape === 'star') {
    const outerR = 105;
    const innerR = 48;
    const starVertices: Point[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      starVertices.push({
        x: 170 + r * Math.cos(angle),
        y: 170 + r * Math.sin(angle),
      });
    }
    starVertices.push(starVertices[0]);

    for (let i = 0; i < 10; i++) {
      points.push(...sampleOrientedLine(starVertices[i], starVertices[i + 1], 22));
    }
    return points;
  }

  if (shape === 'stickman') {
    // Head circle
    points.push(...sampleOrientedCircle(170, 75, 30, 55));
    // Body spine
    points.push(...sampleOrientedLine({ x: 170, y: 105 }, { x: 170, y: 205 }, 35));
    // Arms
    points.push(...sampleOrientedLine({ x: 105, y: 145 }, { x: 170, y: 135 }, 25));
    points.push(...sampleOrientedLine({ x: 170, y: 135 }, { x: 235, y: 145 }, 25));
    // Legs
    points.push(...sampleOrientedLine({ x: 170, y: 205 }, { x: 115, y: 290 }, 32));
    points.push(...sampleOrientedLine({ x: 170, y: 205 }, { x: 225, y: 290 }, 32));
    return points;
  }

  if (shape === 'face') {
    // Head circle
    points.push(...sampleOrientedCircle(170, 170, 95, 110));
    // Left eye
    points.push(...sampleOrientedCircle(130, 135, 9, 20));
    // Right eye
    points.push(...sampleOrientedCircle(210, 135, 9, 20));
    // Smile arc: M 125 195 Q 170 240 215 195
    const p0 = { x: 125, y: 195 };
    const p1 = { x: 170, y: 240 };
    const p2 = { x: 215, y: 195 };
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const x = mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x;
      const y = mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y;
      const dx = 2 * mt * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
      const dy = 2 * mt * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
      const len = Math.hypot(dx, dy) || 1;
      points.push({ x, y, ux: dx / len, uy: dy / len });
    }
    return points;
  }

  return points;
};

export const getTargetShapePoints = (shape: ShapeType): Point[] => {
  return getTargetOrientedPoints(shape).map(({ x, y }) => ({ x, y }));
};

/**
 * Resamples user strokes at uniform ~3px steps and computes local tangent direction (ux, uy)
 * for each sampled user point.
 */
const resampleUserStrokes = (strokes: Point[][]): OrientedPoint[] => {
  const result: OrientedPoint[] = [];
  const step = 3;

  for (const rawStroke of strokes) {
    const stroke = rawStroke.filter((p) => !isNaN(p.x) && !isNaN(p.y));
    if (stroke.length < 2) continue;

    // First build evenly-spaced points along the polyline
    const spaced: Point[] = [stroke[0]];
    let carry = 0;

    for (let i = 0; i < stroke.length - 1; i++) {
      let a = stroke[i];
      const b = stroke[i + 1];
      let segLen = Math.hypot(b.x - a.x, b.y - a.y);
      if (segLen < 0.001) continue;

      while (carry + segLen >= step) {
        const need = step - carry;
        const t = need / segLen;
        const nx = a.x + (b.x - a.x) * t;
        const ny = a.y + (b.y - a.y) * t;
        spaced.push({ x: nx, y: ny });
        a = { x: nx, y: ny };
        segLen = Math.hypot(b.x - a.x, b.y - a.y);
        carry = 0;
      }
      carry += segLen;
    }

    if (spaced.length < 2) {
      spaced.push(stroke[stroke.length - 1]);
    }

    // Compute local smoothed tangent using window [i-2, i+2] to avoid finger jitter
    for (let i = 0; i < spaced.length; i++) {
      const prev = spaced[Math.max(0, i - 2)];
      const next = spaced[Math.min(spaced.length - 1, i + 2)];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      result.push({
        x: spaced[i].x,
        y: spaced[i].y,
        ux: dx / len,
        uy: dy / len,
      });
    }
  }

  return result;
};

/**
 * Strict Direction-Aware & Multiplicative Scoring Engine:
 *
 * 1. Direction Alignment (|cos(Δθ)|):
 *    - A user stroke that merely crosses a target line (e.g. drawing a circle across the 5 tips of a star)
 *      has a large angle difference (Δθ > 40°, |cos(Δθ)| < 0.76) and gets 0 credit!
 *
 * 2. Per-Point Precision (User -> Target):
 *    - Distance <= 8px AND aligned: up to +1.0 pt
 *    - Distance 8..16px AND aligned: up to +0.5 pt
 *    - Distance 16..26px: -0.25 pt
 *    - Distance > 26px (Out of bounds): -1.0 pt
 *
 * 3. Per-Point Coverage (Target -> User):
 *    - Only counts target points covered within <= 14px by a stroke moving in the same direction (Δθ <= 40°).
 *
 * 4. Multiplicative Combination & Hard Floor:
 *    - If strict coverage < 30% (e.g., circle on a star only touches tips = ~10% aligned coverage), score is 0%!
 */
export const evaluateDrawnShape = (
  strokes: Point[][],
  shape: ShapeType
): ComparisonResult => {
  const userPoints = resampleUserStrokes(strokes);
  const targetPoints = getTargetOrientedPoints(shape);

  if (userPoints.length < 8 || targetPoints.length === 0) {
    return {
      accuracyPercentage: 0,
      shapeScore: 0,
      coverageScore: 0,
      penaltyPixels: 0,
      feedback: 'Dessin incomplet ou vide !',
    };
  }

  // 1. Evaluate Precision (User -> Target):
  //    For each user point, find its closest aligned target point:
  //    - d <= 4px (align >= 0.85): 1.0 (right on the line)
  //    - 4 < d <= 15px (align >= 0.85): 1.0 -> 0.55 (close to the line)
  //    - 15 < d <= 28px (align >= 0.92, strictly parallel <= 23°): 0.55 -> 0.10 (parallel shifted edge, e.g. triangle base drawn 22px lower)
  //    - Otherwise: negative penalty for wrong angle or out-of-bounds (> 28px)
  let precisionSum = 0;
  let penaltyPoints = 0;

  for (let i = 0; i < userPoints.length; i++) {
    const up = userPoints[i];
    let rawMinDist = Infinity;
    let closeAlignedDist = Infinity;
    let parallelShiftedDist = Infinity;

    for (let j = 0; j < targetPoints.length; j++) {
      const tp = targetPoints[j];
      const d = Math.hypot(up.x - tp.x, up.y - tp.y);
      if (d < rawMinDist) {
        rawMinDist = d;
      }
      const align = Math.abs(up.ux * tp.ux + up.uy * tp.uy);
      if (align >= 0.85 && d < closeAlignedDist) {
        closeAlignedDist = d;
      }
      if (align >= 0.92 && d < parallelShiftedDist) {
        parallelShiftedDist = d;
      }
    }

    if (closeAlignedDist <= 4) {
      precisionSum += 1.0;
    } else if (closeAlignedDist <= 15) {
      precisionSum += 1.0 - ((closeAlignedDist - 4) / 11) * 0.45;
    } else if (parallelShiftedDist <= 28 && parallelShiftedDist <= rawMinDist + 4) {
      // Parallel edge shifted by 15..28px (e.g. bottom of triangle drawn slightly lower)
      precisionSum += 0.55 - ((parallelShiftedDist - 15) / 13) * 0.45;
    } else if (rawMinDist <= 18) {
      // Close to a target line, but cutting across it at the wrong angle (> 31°, e.g. circle on star)
      precisionSum -= 0.5;
      penaltyPoints += 0.5;
    } else {
      // Out of bounds (> 28px or unaligned > 18px)
      const pen = Math.min(1.1, (rawMinDist - 18) / 16);
      precisionSum -= pen;
      if (rawMinDist > 28) {
        penaltyPoints += 1;
      }
    }
  }

  const precisionRatio = Math.max(0, Math.min(1, precisionSum / userPoints.length));

  // 2. Evaluate Coverage (Target -> User):
  //    For each target point, check distance to closest aligned user point
  let coveredWeight = 0;
  let strictCoveredCount = 0;

  for (let j = 0; j < targetPoints.length; j++) {
    const tp = targetPoints[j];
    let bestCloseDist = Infinity;
    let bestParallelDist = Infinity;

    for (let i = 0; i < userPoints.length; i++) {
      const up = userPoints[i];
      const align = Math.abs(up.ux * tp.ux + up.uy * tp.uy);
      if (align >= 0.85) {
        const d = Math.hypot(up.x - tp.x, up.y - tp.y);
        if (d < bestCloseDist) {
          bestCloseDist = d;
        }
        if (align >= 0.92 && d < bestParallelDist) {
          bestParallelDist = d;
        }
      }
    }

    if (bestCloseDist <= 4) {
      coveredWeight += 1.0;
      strictCoveredCount += 1.0;
    } else if (bestCloseDist <= 15) {
      const w = 1.0 - ((bestCloseDist - 4) / 11) * 0.45;
      coveredWeight += w;
      strictCoveredCount += bestCloseDist <= 10 ? 1.0 : 0.5;
    } else if (bestParallelDist <= 28) {
      const w = 0.55 - ((bestParallelDist - 15) / 13) * 0.45;
      coveredWeight += w;
      strictCoveredCount += 0.35;
    }
  }

  const coverageRatio = coveredWeight / targetPoints.length;
  const displayCoveragePercentage = Math.round((strictCoveredCount / targetPoints.length) * 100);

  // 3. Overdraw check (prevent drawing multiple passes to fish for coverage)
  const lengthRatio = userPoints.length / targetPoints.length;
  const overdrawFactor =
    lengthRatio > 1.3 ? Math.max(0, 1 - (lengthRatio - 1.3) * 0.9) : 1;

  // 4. Final Score using F1 Harmonic Mean (2*P*C / (P+C)) with strict cutoff for wrong shapes
  let finalPercentage = 0;

  if (coverageRatio >= 0.28 && displayCoveragePercentage >= 25 && precisionRatio >= 0.22) {
    const f1Score = (2 * precisionRatio * coverageRatio) / (precisionRatio + coverageRatio);
    const completenessRamp = coverageRatio < 0.55 ? (coverageRatio - 0.22) / 0.33 : 1.0;
    finalPercentage = Math.round(
      Math.min(99, Math.max(0, f1Score * completenessRamp * overdrawFactor * 100))
    );
  }

  // Proportional out-of-bounds penalty (smoothly reduces score when > 15% of stroke is > 28px out-of-bounds)
  const penaltyRatio = penaltyPoints / userPoints.length;
  if (penaltyRatio > 0.15) {
    const penaltyMultiplier = Math.max(0.15, 1 - (penaltyRatio - 0.15) * 1.6);
    finalPercentage = Math.round(finalPercentage * penaltyMultiplier);
  }

  let feedback = 'Pas mal !';
  if (finalPercentage >= 85) feedback = 'Incroyable fidélité ! 🎯';
  else if (finalPercentage >= 70) feedback = 'Superbe coup de crayon ! ✨';
  else if (finalPercentage >= 50) feedback = 'Bien joué, forme reconnaissable ! 👍';
  else if (finalPercentage >= 25) feedback = 'Un peu décalé ou trop de débordements ! 😄';
  else if (penaltyPoints > 25) feedback = 'Forme incorrecte ou hors-piste ! 🛑';
  else feedback = 'Forme incomplète, réessayez ! 🎨';

  return {
    accuracyPercentage: finalPercentage,
    shapeScore: Math.round(precisionRatio * 100),
    coverageScore: displayCoveragePercentage,
    penaltyPixels: Math.round(penaltyPoints),
    feedback,
  };
};

