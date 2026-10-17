export type ShapeType = 'circle' | 'triangle' | 'star' | 'stickman' | 'face';

export interface Point {
  x: number;
  y: number;
}

export interface ComparisonResult {
  accuracyPercentage: number;
  shapeScore: number;
  coverageScore: number;
  penaltyPixels: number;
  feedback: string;
}

export const CANVAS_SIZE = 340;
export const BRUSH_WIDTH = 10; // 10px circular brush as requested by user

const GRID_SIZE = 100; // 100x100 raster simulation grid
const SCALE = GRID_SIZE / CANVAS_SIZE; // ~ 0.294
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE; // 3.4 px per cell

// Sample points along a straight line segment
const sampleLine = (p1: Point, p2: Point, count: number): Point[] => {
  const points: Point[] = [];
  for (let i = 0; i <= count; i++) {
    const t = count === 0 ? 0 : i / count;
    points.push({
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t,
    });
  }
  return points;
};

// Sample points along a circle
const sampleCircle = (cx: number, cy: number, r: number, count: number): Point[] => {
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI;
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  }
  return points;
};

// Dense reference points for each target shape
export const getTargetShapePoints = (shape: ShapeType): Point[] => {
  const points: Point[] = [];

  if (shape === 'circle') {
    return sampleCircle(170, 170, 95, 140);
  }

  if (shape === 'triangle') {
    const r = 110;
    const v1 = { x: 170, y: 170 - r };
    const v2 = { x: 170 + r * Math.cos(Math.PI / 6), y: 170 + r * Math.sin(Math.PI / 6) };
    const v3 = { x: 170 - r * Math.cos(Math.PI / 6), y: 170 + r * Math.sin(Math.PI / 6) };

    points.push(...sampleLine(v1, v2, 45));
    points.push(...sampleLine(v2, v3, 45));
    points.push(...sampleLine(v3, v1, 45));
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
      points.push(...sampleLine(starVertices[i], starVertices[i + 1], 15));
    }
    return points;
  }

  if (shape === 'stickman') {
    // Head circle
    points.push(...sampleCircle(170, 75, 30, 45));
    // Body spine
    points.push(...sampleLine({ x: 170, y: 105 }, { x: 170, y: 205 }, 30));
    // Arms
    points.push(...sampleLine({ x: 105, y: 145 }, { x: 170, y: 135 }, 20));
    points.push(...sampleLine({ x: 170, y: 135 }, { x: 235, y: 145 }, 20));
    // Legs
    points.push(...sampleLine({ x: 170, y: 205 }, { x: 115, y: 290 }, 28));
    points.push(...sampleLine({ x: 170, y: 205 }, { x: 225, y: 290 }, 28));
    return points;
  }

  if (shape === 'face') {
    // Head circle
    points.push(...sampleCircle(170, 170, 95, 80));
    // Left eye
    points.push(...sampleCircle(130, 135, 9, 14));
    // Right eye
    points.push(...sampleCircle(210, 135, 9, 14));
    // Smile arc
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      const angle = Math.PI * 0.18 + t * Math.PI * 0.64;
      points.push({
        x: 170 + 52 * Math.cos(angle),
        y: 175 + 42 * Math.sin(angle),
      });
    }
    return points;
  }

  return points;
};

// Cache computed distance fields for shapes
const distanceFieldCache = new Map<ShapeType, Float32Array>();

/**
 * Builds a distance transform grid (100x100 cells) storing the exact Euclidean distance
 * in pixels to the closest point of the target shape.
 */
export const getShapeDistanceField = (shape: ShapeType): Float32Array => {
  if (distanceFieldCache.has(shape)) {
    return distanceFieldCache.get(shape)!;
  }

  const targetPoints = getTargetShapePoints(shape);
  const grid = new Float32Array(GRID_SIZE * GRID_SIZE);

  for (let gy = 0; gy < GRID_SIZE; gy++) {
    const py = gy * CELL_SIZE + CELL_SIZE * 0.5;
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const px = gx * CELL_SIZE + CELL_SIZE * 0.5;

      let minDistanceSq = Infinity;
      for (let i = 0; i < targetPoints.length; i++) {
        const tp = targetPoints[i];
        const dx = px - tp.x;
        const dy = py - tp.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < minDistanceSq) {
          minDistanceSq = dSq;
        }
      }

      grid[gy * GRID_SIZE + gx] = Math.sqrt(minDistanceSq);
    }
  }

  distanceFieldCache.set(shape, grid);
  return grid;
};

/**
 * Exact Euclidean distance from point P to segment [A, B]
 */
const distToSegment = (p: Point, a: Point, b: Point): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
};

/**
 * Expected number of drawn grid cells for a single clean pass of each shape.
 * Used only to detect excessive over-drawing / double-tracing.
 */
const expectedDrawnPixels: Record<ShapeType, number> = {
  circle: 520,
  triangle: 500,
  star: 650,
  stickman: 520,
  face: 560,
};

/**
 * Normalized Scoring Engine based on Target Margins & Coverage:
 * 1. Precision per drawn pixel (average over all drawn pixels, impossible to inflate by drawing longer):
 *    - Distance <= 8px (Core / Max points): +1.0 pt
 *    - 8px < Distance <= 18px (Near Margin / Partial points): +0.55 pt
 *    - 18px < Distance <= 30px (Overflow / Dilutes average): -0.15 pt
 *    - Distance > 30px (Out of bounds / Penalty): -0.9 pt
 * 2. Target Shape Coverage (how much of the reference shape was actually traced):
 *    - Target point within <= 10px of user stroke: 100% covered
 *    - Target point within 10..18px of user stroke: 50% covered
 *    - Target point > 18px away: 0% covered
 */
export const evaluateDrawnShape = (
  strokes: Point[][],
  shape: ShapeType
): ComparisonResult => {
  const validStrokes = strokes
    .map((s) => s.filter((p) => !isNaN(p.x) && !isNaN(p.y)))
    .filter((s) => s.length > 0);
  const allPoints = validStrokes.flat();

  if (allPoints.length < 5 || typeof document === 'undefined') {
    return {
      accuracyPercentage: 0,
      shapeScore: 0,
      coverageScore: 0,
      penaltyPixels: 0,
      feedback: 'Dessin incomplet ou vide !',
    };
  }

  const distField = getShapeDistanceField(shape);
  const targetPoints = getTargetShapePoints(shape);

  // 1. Render user strokes with a 10px circular brush onto offscreen grid
  const canvas = document.createElement('canvas');
  canvas.width = GRID_SIZE;
  canvas.height = GRID_SIZE;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return {
      accuracyPercentage: 50,
      shapeScore: 50,
      coverageScore: 50,
      penaltyPixels: 0,
      feedback: 'Bien joué !',
    };
  }

  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = BRUSH_WIDTH * SCALE;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const stroke of validStrokes) {
    ctx.beginPath();
    ctx.moveTo(stroke[0].x * SCALE, stroke[0].y * SCALE);
    if (stroke.length === 1) {
      ctx.lineTo((stroke[0].x + 0.2) * SCALE, (stroke[0].y + 0.2) * SCALE);
    } else {
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x * SCALE, stroke[i].y * SCALE);
      }
    }
    ctx.stroke();
  }

  const imgData = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE).data;

  // 2. Per-pixel Precision calculation (normalized by totalDrawnPixels)
  let scoreSum = 0;
  let penaltyPixels = 0;
  let totalDrawnPixels = 0;

  for (let gy = 0; gy < GRID_SIZE; gy++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const idx = gy * GRID_SIZE + gx;
      const alpha = imgData[idx * 4 + 3];

      if (alpha > 40) {
        totalDrawnPixels++;
        const d = distField[idx];

        if (d <= 8) {
          // Zone 1 : Cœur du tracé (Max points)
          scoreSum += 1.0;
        } else if (d <= 18) {
          // Zone 2 : Marge de tolérance (Points partiels)
          scoreSum += 0.55;
        } else if (d <= 30) {
          // Zone 3 : Débordement (Légère pénalité + dilue la moyenne)
          scoreSum -= 0.15;
        } else {
          // Zone 4 : Hors-piste (Forte pénalité)
          scoreSum -= 0.9;
          penaltyPixels++;
        }
      }
    }
  }

  if (totalDrawnPixels === 0) {
    return {
      accuracyPercentage: 0,
      shapeScore: 0,
      coverageScore: 0,
      penaltyPixels: 0,
      feedback: 'Aucun tracé détecté !',
    };
  }

  // Average precision per drawn pixel, strictly bounded in [0, 1]
  const precisionRatio = Math.max(0, Math.min(1, scoreSum / totalDrawnPixels));

  // 3. Exact Coverage check using point-to-segment distance from each target point to user strokes
  let weightedCoveredPoints = 0;
  let strictCoveredPoints = 0;

  for (let i = 0; i < targetPoints.length; i++) {
    const tp = targetPoints[i];
    let minDist = Infinity;

    for (const stroke of validStrokes) {
      if (stroke.length === 1) {
        const d = Math.hypot(tp.x - stroke[0].x, tp.y - stroke[0].y);
        if (d < minDist) minDist = d;
      } else {
        for (let j = 0; j < stroke.length - 1; j++) {
          const d = distToSegment(tp, stroke[j], stroke[j + 1]);
          if (d < minDist) minDist = d;
        }
      }
    }

    if (minDist <= 10) {
      weightedCoveredPoints += 1.0;
      strictCoveredPoints += 1;
    } else if (minDist <= 18) {
      weightedCoveredPoints += 0.5;
    }
  }

  const coverageRatio = weightedCoveredPoints / targetPoints.length;
  const strictCoveragePercentage = Math.round((strictCoveredPoints / targetPoints.length) * 100);

  // 4. Final score computation combining precision (50%) and coverage (50%),
  //    with a progressive penalty if less than 50% of the shape is covered or if over-drawn.
  let finalPercentage = 0;
  if (precisionRatio > 0 && coverageRatio > 0.05) {
    const completenessFactor = Math.min(1, coverageRatio / 0.5);
    const overdrawRatio = totalDrawnPixels / (expectedDrawnPixels[shape] || 550);
    const overdrawPenalty = overdrawRatio > 1.35 ? Math.max(0.2, 1 - (overdrawRatio - 1.35) * 0.7) : 1;

    const combinedRatio = (precisionRatio * 0.5 + coverageRatio * 0.5) * completenessFactor * overdrawPenalty;
    finalPercentage = Math.round(Math.min(99, Math.max(0, combinedRatio * 100)));
  }

  // Heavy out-of-bounds penalty if more than 30% of the drawing is > 30px away
  if (penaltyPixels > totalDrawnPixels * 0.3) {
    finalPercentage = Math.max(0, Math.round(finalPercentage * 0.35));
  }

  let feedback = 'Pas mal !';
  if (finalPercentage >= 85) feedback = 'Incroyable fidélité ! 🎯';
  else if (finalPercentage >= 70) feedback = 'Superbe coup de crayon ! ✨';
  else if (finalPercentage >= 50) feedback = 'Bien joué, forme reconnaissable ! 👍';
  else if (finalPercentage >= 25) feedback = 'Un peu décalé ou trop de débordements ! 😄';
  else if (penaltyPixels > 45) feedback = 'Trop de hors-piste / gribouillis ! 🛑';
  else feedback = 'Forme incomplète, réessayez ! 🎨';

  return {
    accuracyPercentage: finalPercentage,
    shapeScore: Math.round(precisionRatio * 100),
    coverageScore: strictCoveragePercentage,
    penaltyPixels,
    feedback,
  };
};
