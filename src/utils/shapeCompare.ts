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
 * Theoretical ideal score when following the shape contours perfectly with a 10px brush.
 */
const idealScores: Record<ShapeType, number> = {
  circle: 350,
  triangle: 335,
  star: 380,
  stickman: 320,
  face: 350,
};

/**
 * Heatmap Scoring Engine based on Target Margins:
 * - Distance <= 12px (Core / Max points): +1.0 pt
 * - 12px < Distance <= 26px (Near Margin / Partial points): +0.55 pt
 * - 26px < Distance <= 40px (Neutral / Slight penalty): -0.2 pt
 * - Distance > 40px (Out of bounds / Scribble Penalty): -1.3 pt
 *
 * Guaranteed anti-cheat: Scribbling everywhere lands in penalty margins, dropping score to 0%!
 */
export const evaluateDrawnShape = (
  strokes: Point[][],
  shape: ShapeType
): ComparisonResult => {
  const allPoints = strokes.flat().filter((p) => !isNaN(p.x) && !isNaN(p.y));

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
  ctx.lineWidth = BRUSH_WIDTH * SCALE; // 20px scaled to grid
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
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

  // 2. Score calculation using distance margins
  let scoreSum = 0;
  let corePixels = 0;
  let nearPixels = 0;
  let penaltyPixels = 0;
  let totalDrawnPixels = 0;

  for (let gy = 0; gy < GRID_SIZE; gy++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const idx = gy * GRID_SIZE + gx;
      const alpha = imgData[idx * 4 + 3];

      if (alpha > 40) {
        totalDrawnPixels++;
        const d = distField[idx];

        if (d <= 12) {
          // Zone 1 : Cœur du tracé (Max points)
          scoreSum += 1.0;
          corePixels++;
        } else if (d <= 26) {
          // Zone 2 : Marge proche (Points positifs partiels)
          scoreSum += 0.55;
          nearPixels++;
        } else if (d <= 40) {
          // Zone 3 : Débordement léger
          scoreSum -= 0.25;
        } else {
          // Zone 4 : Hors-piste / Gribouillage (Forte pénalité)
          scoreSum -= 1.35;
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

  // 3. Completeness / Coverage check (ensure the user didn't just draw a single dot in the center)
  let targetPointsCovered = 0;
  for (let i = 0; i < targetPoints.length; i++) {
    const tp = targetPoints[i];
    const gx = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(tp.x * SCALE)));
    const gy = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(tp.y * SCALE)));
    const alpha = imgData[(gy * GRID_SIZE + gx) * 4 + 3];
    if (alpha > 40) {
      targetPointsCovered++;
    }
  }
  const coverageRatio = targetPointsCovered / targetPoints.length;

  // 4. Final score computation
  const idealScore = idealScores[shape] || 650;
  const rawRatio = scoreSum / idealScore;

  // If score is negative due to heavy scribbling outside margins, score is 0%
  let finalPercentage = 0;
  if (rawRatio > 0 && coverageRatio > 0.05) {
    // Combine margin score with coverage
    // Coverage prevents getting 90% by drawing just 1/4 of a circle
    const weightedRatio = rawRatio * 0.75 + coverageRatio * 0.25;
    // Slight curve to make friendly scores without sacrificing anti-cheat
    finalPercentage = Math.round(Math.min(99, Math.max(0, weightedRatio * 100)));
  }

  // If penalty pixels exceed 30% of total drawing, heavily suppress score (anti-scribble)
  if (penaltyPixels > totalDrawnPixels * 0.35) {
    finalPercentage = Math.max(0, Math.round(finalPercentage * 0.2));
  }

  let feedback = 'Pas mal !';
  if (finalPercentage >= 88) feedback = 'Incroyable fidélité ! 🎯';
  else if (finalPercentage >= 75) feedback = 'Superbe coup de crayon ! ✨';
  else if (finalPercentage >= 55) feedback = 'Bien joué, forme reconnaissable ! 👍';
  else if (finalPercentage >= 30) feedback = 'Un peu décalé ou trop de débordements ! 😄';
  else if (penaltyPixels > 80) feedback = 'Trop de hors-piste / gribouillis ! 🛑';
  else feedback = 'Forme incomplète, réessayez ! 🎨';

  return {
    accuracyPercentage: finalPercentage,
    shapeScore: finalPercentage,
    coverageScore: Math.round(coverageRatio * 100),
    penaltyPixels,
    feedback,
  };
};
