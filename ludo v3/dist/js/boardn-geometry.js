/* boardn-geometry.js
 * ---------------------------------------------------------------------------
 * Pure geometry for the polygonal Ludo boards. No DOM, no rendering.
 *
 * One file serves every seat count. The whole board derives from one idea:
 * 2n points on a single circle, with the arcs between them alternating
 * long / short.
 *
 *   n x (longArc + shortArc) = 360   ->  the outline always closes.
 *
 * Each player owns one 360/n sector. A sector is centred on a LONG edge
 * (the player's front edge, where their home base will sit); the SHORT edges
 * are the corner cuts where two neighbouring sectors meet. Five players give
 * a decagon, six a dodecagon; nothing below is written for a fixed n.
 *
 * The roster lives on the config as `players`, and every angle is derived
 * from its length, so adding a seat is a one-line change.
 * ---------------------------------------------------------------------------
 */

/* Seats in board order, going clockwise on screen from the bottom.
 *
 * Colours are taken from the 4-player board, not invented. game.html uses the
 * Tailwind classes bg-red-500 / bg-green-500 / bg-yellow-400 / bg-blue-500 for
 * board areas, while main.css gives TOKENS their own saturated CSS colours.
 * Purple follows the arrow_purple_5p.svg asset already in img/; orange is the
 * sixth seat and has a matching arrow drawn the same way.
 */
export const ALL_PLAYERS = [
  { id: "red",     name: "Red",     color: "#ef4444", token: "red" },
  { id: "green",   name: "Green",   color: "#22c55e", token: "green" },
  { id: "yellow",  name: "Yellow",  color: "#facc15", token: "rgb(221,221,72)" },
  { id: "blue",    name: "Blue",    color: "#3b82f6", token: "blue" },
  { id: "purple",  name: "Purple",  color: "#a855f7", token: "purple" },
  { id: "orange",  name: "Orange",  color: "#f97316", token: "#f97316" },
  { id: "cyan",    name: "Cyan",    color: "#06b6d4", token: "#06b6d4" },
  { id: "magenta", name: "Magenta", color: "#db2777", token: "#db2777" },
  { id: "lime",    name: "Lime",    color: "#84cc16", token: "#84cc16" },
  { id: "slate",   name: "Slate",   color: "#64748b", token: "#64748b" },
];

/* Every id above starts with a different letter, and that is load-bearing:
 * the engine names a home cell after its owner's initial (red -> rc1 .. rc5),
 * the way the 4-player board does. Hence "magenta" and not "pink" - purple
 * already owns p - and "slate" and not "brown", since blue owns b. */

/** Seat counts this file lays out. */
export const SEAT_COUNTS = [4, 5, 6, 7, 8, 9, 10];

/** The first `n` seats, in board order. */
export const playersFor = (n) => ALL_PLAYERS.slice(0, n);

/** The 5-player roster, which is what CONFIG defaults to. */
export const PLAYERS = playersFor(5);

/**
 * Long / short arc per seat count.
 *
 * The pair must sum to 360/n or the outline will not close, and the short arc
 * has to stay wide enough for a 3-cell arm to fit across the corner cut it
 * ends on - below that withSquareCells() has to clamp the arm and the track
 * cells stop being square (see the clamp there for the exact limit, which is
 * about 50.93 deg on five seats).
 *
 * Every pair below is the longest long edge that still sits inside that limit,
 * rounded down to a whole degree, so every track cell on every board is
 * exactly square:
 *
 *    4 x (67 + 23)      = 360        8 x (27 + 18) = 360
 *    5 x (50 + 22)      = 360        9 x (23 + 17) = 360
 *    6 x (40 + 20)      = 360       10 x (19 + 17) = 360
 *    7 x (32 + 19.4286) = 360
 *
 * The long edge is a bit over twice the short one on the small boards and
 * closes on it as seats are added. That is not a choice: an arm is 3 cells
 * wide and 6 cells long whatever n is, so the corner cut it lands on cannot
 * shrink along with the sector. By ten seats the outline is nearly a regular
 * 20-gon, which is what square cells cost at that count.
 */
export const ARCS = {
  4: { longArc: 67, shortArc: 23 },
  5: { longArc: 50, shortArc: 22 },
  6: { longArc: 40, shortArc: 20 },
  7: { longArc: 32, shortArc: 360 / 7 - 32 },
  8: { longArc: 27, shortArc: 18 },
  9: { longArc: 23, shortArc: 17 },
  10: { longArc: 19, shortArc: 17 },
};

export const CONFIG = {
  size: 1000,       // viewBox is 0 0 size size
  cx: 500,
  cy: 500,
  R: 470,           // circumradius - every outer point is this far from centre
  ...ARCS[5],
  frame: 0,         // the 4-player board has no frame band; yards reach the edge
  startAngle: 90,   // player 0 sits at the bottom of the screen (SVG y grows down)
  players: PLAYERS, // the roster, and therefore the seat count
};

/* The 4-player board is 600px across a 15-cell grid; these are its 1px / 2px
 * / 3px strokes expressed in this board's 1000-unit viewBox. */
export const INK = "#000000";
export const STROKE = { cell: 1.67, board: 1.67, yard: 3.33, token: 5 };

/** Degrees of board one player owns: 72 on five seats, 60 on six. */
export const sectorArc = (cfg = CONFIG) => 360 / cfg.players.length;

/* --- primitives ---------------------------------------------------------- */

export const rad = (deg) => (deg * Math.PI) / 180;

/** A point at `radius` from the board centre, at `angleDeg` (0 = east, cw). */
export function pointAt(angleDeg, radius, cfg = CONFIG) {
  return {
    x: cfg.cx + radius * Math.cos(rad(angleDeg)),
    y: cfg.cy + radius * Math.sin(rad(angleDeg)),
  };
}

/** Centre angle of player `i`'s sector (and of their long front edge). */
export function sectorAngle(i, cfg = CONFIG) {
  return cfg.startAngle + i * sectorArc(cfg);
}

/* --- the outline --------------------------------------------------------- */

/**
 * The 2n angles of the outline, in order.
 * Player i owns the long edge from (centre - longArc/2) to (centre + longArc/2);
 * the short edge that follows bridges to player i+1.
 */
export function outlineAngles(cfg = CONFIG) {
  const half = cfg.longArc / 2;
  const out = [];
  for (let i = 0; i < cfg.players.length; i++) {
    const c = sectorAngle(i, cfg);
    out.push({ angle: c - half, player: i, role: "long-start" });
    out.push({ angle: c + half, player: i, role: "long-end" });
  }
  return out;
}

/** The 2n outline points at a given radius (defaults to the board radius). */
export function outlinePoints(radius = CONFIG.R, cfg = CONFIG) {
  return outlineAngles(cfg).map((a) => ({
    ...pointAt(a.angle, radius, cfg),
    ...a,
  }));
}

/** The 2n edges, each tagged "long" (a player's front) or "short" (a corner). */
export function outlineEdges(radius = CONFIG.R, cfg = CONFIG) {
  const pts = outlinePoints(radius, cfg);
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return {
      a: p,
      b: q,
      kind: p.role === "long-start" ? "long" : "short",
      player: p.player,
      index: i + 1, // 1-based: odd = long, even = short
    };
  });
}

/* --- polygon helpers ----------------------------------------------------- */

/** "M x,y L x,y ... Z" for an array of {x,y}. */
export function toPath(points) {
  return (
    points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ") + " Z"
  );
}

/** "x,y x,y ..." for <polygon points="">. */
export function toPoints(points) {
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

/**
 * Drop points that repeat. The arms meet the centre polygon exactly at its
 * vertices, so a yard's corner points can coincide; a zero-length edge has no
 * direction and would poison every offset derived from it.
 */
export function dedupe(points, eps = 1e-6) {
  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > eps) out.push(p);
  }
  while (out.length > 1 && Math.hypot(out[0].x - out[out.length - 1].x, out[0].y - out[out.length - 1].y) <= eps) {
    out.pop();
  }
  return out;
}

/**
 * Inward offset of a convex polygon by `t` px, edge by edge.
 *
 * Scaling the radius instead would give a band that is thinner along the long
 * edges than the short ones; offsetting each edge keeps the band a constant
 * thickness all the way round, which is what a frame needs.
 */
export function offsetPolygon(points, t, cfg = CONFIG) {
  points = dedupe(points);
  const n = points.length;
  // "inward" is decided against the polygon's OWN centroid, not the board
  // centre - yards and arms sit far off-centre and would otherwise skew.
  const c = points.reduce((a, p) => ({ x: a.x + p.x / n, y: a.y + p.y / n }), { x: 0, y: 0 });
  const lines = points.map((p, i) => {
    const q = points[(i + 1) % n];
    let dx = q.x - p.x;
    let dy = q.y - p.y;
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    // the normal that points back toward the board centre
    let nx = -dy;
    let ny = dx;
    if ((c.x - p.x) * nx + (c.y - p.y) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    return { px: p.x + nx * t, py: p.y + ny * t, dx, dy };
  });

  return lines.map((_, i) => {
    const L1 = lines[(i - 1 + n) % n];
    const L2 = lines[i];
    const den = L1.dx * L2.dy - L1.dy * L2.dx;
    const s = ((L2.px - L1.px) * L2.dy - (L2.py - L1.py) * L2.dx) / den;
    return { x: L1.px + L1.dx * s, y: L1.py + L1.dy * s };
  });
}

/* --- sanity check -------------------------------------------------------- */

export function describe(cfg = CONFIG) {
  const closes = cfg.players.length * (cfg.longArc + cfg.shortArc);
  const chord = (arc) => 2 * cfg.R * Math.sin(rad(arc) / 2);
  return {
    seats: cfg.players.length,
    closes: Math.abs(closes - 360) < 1e-9,
    points: 2 * cfg.players.length,
    longEdge: chord(cfg.longArc),
    shortEdge: chord(cfg.shortArc),
    ratio: chord(cfg.longArc) / chord(cfg.shortArc),
  };
}

/* ===========================================================================
 * Layer 2: the board skeleton - centre, arms, yards.
 *
 * This is the 4-player board generalised to five sides. On a square board each
 * player's yard sits in a corner and their home column runs down the middle of
 * the arm beside it - yard and arm are half a quadrant apart. Here the yard
 * sits on the player's LONG edge and the arm runs out to the CORNER CUT, which
 * is half a sector away. Same relationship, n-fold instead of four.
 * ===========================================================================
 */

Object.assign(CONFIG, {
  centerR: 112,      // circumradius of the central finish pentagon
  armHalf: 48,       // half-width of an arm (arm is 3 cells wide)
  cellsPerArm: 6,    // track cells along one flank of an arm (6 + tip + 6 = 13)
  yardDepth: 150,    // how far a yard reaches inward from the long edge
  gap: 0,            // yards meet the arms and the board edge directly, no white gap
  padInset: 32,      // colour band; the white triangle inside it carries the tokens
  tokenSpread: 0.58, // how far the three corner tokens sit toward the points
  columnDir: -1,     // arm on the low-angle side, so travel follows seating order
});

/** Direction of player i's arm: the corner cut half a sector off-centre. */
export function columnAngle(i, cfg = CONFIG) {
  return sectorAngle(i, cfg) + cfg.columnDir * (sectorArc(cfg) / 2);
}

/** Distance from centre to the middle of a long edge (a yard's outer rim). */
export function longApothem(cfg = CONFIG) {
  return cfg.R * Math.cos(rad(cfg.longArc / 2)) - cfg.frame;
}

/** Distance from centre to the middle of a corner cut (where an arm ends). */
export function shortApothem(cfg = CONFIG) {
  return cfg.R * Math.cos(rad(cfg.shortArc / 2)) - cfg.frame;
}

/**
 * The central finish polygon - a pentagon on five seats, a hexagon on six.
 * Its faces are perpendicular to the arms, so every arm meets it flush; its
 * vertices point down the sector centres.
 */
export function centerPolygon(cfg = CONFIG) {
  return cfg.players.map((_, i) => pointAt(sectorAngle(i, cfg), cfg.centerR, cfg));
}

/** The centre triangle player i's home column empties into. */
export function finishTriangle(i, cfg = CONFIG) {
  const a = columnAngle(i, cfg);
  return [
    { x: cfg.cx, y: cfg.cy },
    pointAt(a - sectorArc(cfg) / 2, cfg.centerR, cfg),
    pointAt(a + sectorArc(cfg) / 2, cfg.centerR, cfg),
  ];
}

/** Apothem of the centre polygon - where an arm starts. */
export function centerApothem(cfg = CONFIG) {
  return cfg.centerR * Math.cos(rad(sectorArc(cfg) / 2));
}

/** Player i's arm: a rectangle from the centre polygon out to its corner cut. */
export function armQuad(i, cfg = CONFIG) {
  const a = columnAngle(i, cfg);
  const u = { x: Math.cos(rad(a)), y: Math.sin(rad(a)) };   // outward
  const v = { x: -u.y, y: u.x };                             // across the arm
  const r0 = centerApothem(cfg);
  const r1 = shortApothem(cfg);
  const at = (r, s) => ({
    x: cfg.cx + u.x * r + v.x * s,
    y: cfg.cy + u.y * r + v.y * s,
  });
  return [at(r0, -cfg.armHalf), at(r1, -cfg.armHalf), at(r1, cfg.armHalf), at(r0, cfg.armHalf)];
}

/** The home column: the middle lane of an arm, in the player's colour. */
export function columnQuad(i, cfg = CONFIG) {
  const third = cfg.armHalf / 3;
  return armQuad(i, { ...cfg, armHalf: third });
}

/**
 * Player i's yard, centred on their long edge.
 *
 * It tapers inward because the two neighbouring arms close in as you approach
 * the centre - the inner half-width is derived from how much angular room is
 * actually left at that depth, so the yard can never collide with an arm.
 */
export function yardQuad(i, cfg = CONFIG) {
  const a = sectorAngle(i, cfg);
  const u = { x: Math.cos(rad(a)), y: Math.sin(rad(a)) };
  const v = { x: -u.y, y: u.x };
  // The yard reaches the long edge itself. On a real board the track wraps the
  // arm tips at the rim and never runs in front of a yard, so there is no lane
  // to leave clear here.
  const rOuter = longApothem(cfg);
  const rInner = rOuter - cfg.yardDepth;

  // half-width the arms leave free at a given depth, minus a gap
  const free = (r) => {
    const armAngular = Math.atan2(cfg.armHalf, r);          // arm's half-angle there
    const room = rad(sectorArc(cfg) / 2) - armAngular;      // angle left to the sector edge
    return Math.max(12, r * Math.tan(room) - cfg.gap);
  };

  const outerHalf = Math.min(
    (2 * cfg.R * Math.sin(rad(cfg.longArc) / 2)) / 2 - cfg.gap,
    free(rOuter)
  );
  const innerHalf = free(rInner);
  const at = (r, s) => ({
    x: cfg.cx + u.x * r + v.x * s,
    y: cfg.cy + u.y * r + v.y * s,
  });
  return [at(rOuter, -outerHalf), at(rOuter, outerHalf), at(rInner, innerHalf), at(rInner, -innerHalf)];
}

/** Named corners of an arm. "near" is the side facing sector i. */
export function armEdges(i, cfg = CONFIG) {
  const q = armQuad(i, cfg);
  return { nearInner: q[0], nearOuter: q[1], farOuter: q[2], farInner: q[3] };
}

/**
 * The full region a yard occupies: bounded outward by the player's long edge,
 * on each side by a neighbouring arm, and inward by the centre pentagon.
 * This is the true sector-minus-arms shape, so yards sit flush against the
 * arms the way they do on a real board.
 */
export function yardRegion(i, cfg = CONFIG) {
  const n = cfg.players.length;
  const inner = offsetPolygon(outlinePoints(cfg.R, cfg), cfg.frame, cfg);
  const pent = centerPolygon(cfg);
  const armAt = (want) => {
    let best = 0, bestD = Infinity;
    for (let j = 0; j < n; j++) {
      const d = Math.abs(((columnAngle(j, cfg) - want + 540) % 360) - 180);
      if (d < bestD) { bestD = d; best = j; }
    }
    return armEdges(best, cfg);
  };
  const armNext = armAt(sectorAngle(i, cfg) + sectorArc(cfg) / 2); // higher-angle side
  const armPrev = armAt(sectorAngle(i, cfg) - sectorArc(cfg) / 2); // lower-angle side

  return dedupe([
    inner[2 * i],       // long edge, start
    inner[2 * i + 1],   // long edge, end
    armNext.nearOuter,
    armNext.nearInner,
    pent[i],            // the arms meet the centre exactly here
    armPrev.farInner,
    armPrev.farOuter,
  ]);
}

/* ===========================================================================
 * Layer 3: the track.
 *
 * Generalised from the project's own 4-player model in game-state.js, where
 * red starts at c1 and green at c14 - 13 ring cells per player, then 5 home
 * cells. Five players gives a 65-cell ring, six a 78-cell one.
 *
 * Each arm is 3 lanes wide and 6 cells long:
 *   - the two flanking lanes are track (6 + 6)
 *   - the middle lane's OUTERMOST cell is track too (the tip), making 13
 *   - the middle lane's inner 5 cells are that player's home column
 *
 * Travel runs outward along the flank away from your yard, around the tip,
 * then inward along the flank beside your yard - so you start next to your own
 * home entrance and must go all the way round to come back to it.
 * ===========================================================================
 */

export const RING_PER_SECTOR = 13;
export const HOME_CELLS = 5;
export const CELLS_ALONG_ARM = 6;

/** Which side of arm i faces player i's own yard: +1 or -1. */
export function yardSide(i, cfg = CONFIG) {
  const d = ((sectorAngle(i, cfg) - columnAngle(i, cfg) + 540) % 360) - 180;
  return d > 0 ? 1 : -1;
}

/** One cell of an arm. lane is -1 / 0 / +1; k counts outward from 0 to 5. */
export function cellQuad(i, lane, k, cfg = CONFIG) {
  const a = columnAngle(i, cfg);
  const u = { x: Math.cos(rad(a)), y: Math.sin(rad(a)) };
  const v = { x: -u.y, y: u.x };
  const r0 = centerApothem(cfg);
  const r1 = shortApothem(cfg);
  const step = (r1 - r0) / CELLS_ALONG_ARM;
  const lw = (2 * cfg.armHalf) / 3;
  const rA = r0 + k * step;
  const rB = rA + step;
  const sA = lane * lw - lw / 2;
  const sB = lane * lw + lw / 2;
  const at = (r, s) => ({
    x: cfg.cx + u.x * r + v.x * s,
    y: cfg.cy + u.y * r + v.y * s,
  });
  return [at(rA, sA), at(rB, sA), at(rB, sB), at(rA, sB)];
}

/** The arm reached next when travelling along the ring. */
function nextArm(i, cfg = CONFIG) {
  const want = columnAngle(i, cfg) + yardSide(i, cfg) * sectorArc(cfg);
  let best = 0;
  let bestD = Infinity;
  for (let j = 0; j < cfg.players.length; j++) {
    const d = Math.abs(((columnAngle(j, cfg) - want + 540) % 360) - 180);
    if (d < bestD) { bestD = d; best = j; }
  }
  return best;
}

/**
 * The 13n-cell ring, in travel order, rotated so player 0's start cell is
 * index 0 - matching the c1/c14 numbering the 4-player game already uses.
 */
export function ringCells(cfg = CONFIG) {
  const cells = [];
  let arm = 0;
  for (let n = 0; n < cfg.players.length; n++) {
    const ys = yardSide(arm, cfg);
    for (let k = 0; k < CELLS_ALONG_ARM; k++) cells.push({ arm, lane: -ys, k });      // away from yard, outward
    cells.push({ arm, lane: 0, k: CELLS_ALONG_ARM - 1 });                              // the tip
    for (let k = CELLS_ALONG_ARM - 1; k >= 0; k--) cells.push({ arm, lane: ys, k });   // beside yard, inward
    arm = nextArm(arm, cfg);
  }

  // rotate so player 0's start (beside its yard, 2nd cell in from the rim) is 0
  const s0 = cells.findIndex(
    (c) => c.arm === 0 && c.lane === yardSide(0, cfg) && c.k === CELLS_ALONG_ARM - 2
  );
  const ring = cells.slice(s0).concat(cells.slice(0, s0));
  return ring.map((c, index) => ({ ...c, index, quad: cellQuad(c.arm, c.lane, c.k, cfg) }));
}

/** Ring index of each player's start cell. */
export function startIndices(cfg = CONFIG) {
  const ring = ringCells(cfg);
  return cfg.players.map((_, i) =>
    ring.findIndex(
      (c) => c.arm === i && c.lane === yardSide(i, cfg) && c.k === CELLS_ALONG_ARM - 2
    )
  );
}

/** Ring index of each player's home-column entrance (their arm's tip cell). */
export function entryIndices(cfg = CONFIG) {
  const ring = ringCells(cfg);
  return cfg.players.map((_, i) =>
    ring.findIndex((c) => c.arm === i && c.lane === 0 && c.k === CELLS_ALONG_ARM - 1)
  );
}

/** Player i's 5 home-column cells, from the rim inward (rc1 .. rc5). */
export function homeCells(i, cfg = CONFIG) {
  const out = [];
  for (let k = CELLS_ALONG_ARM - 2; k >= 0; k--) {
    out.push({ arm: i, lane: 0, k, quad: cellQuad(i, 0, k, cfg) });
  }
  return out;
}

/* ===========================================================================
 * Layer 4: token pads.
 *
 * A yard is a tapering five-sided region, so a pad size that looks right in
 * one spot overflows in another. Instead of guessing, fit the largest square
 * that genuinely fits: slide a candidate centre along the sector axis and
 * binary-search the half-size at each stop, keeping the best.
 * ===========================================================================
 */

/** Ray-casting point-in-polygon. Works for the yard's non-convex notch. */
export function pointInPolygon(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    const hits = a.y > p.y !== b.y > p.y;
    if (hits && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Distance from a point to a segment. */
function distToSeg(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

const polyCentroid = (pts) =>
  pts.reduce((a, p) => ({ x: a.x + p.x / pts.length, y: a.y + p.y / pts.length }), { x: 0, y: 0 });

/**
 * The yard read as a triangle: the two ends of the player's long edge, plus
 * the centre polygon's vertex. This is the shape the tokens arrange inside.
 */
export function yardTriangle(i, cfg = CONFIG) {
  const inner = offsetPolygon(outlinePoints(cfg.R, cfg), cfg.frame, cfg);
  const pent = centerPolygon(cfg);
  return [inner[2 * i], inner[2 * i + 1], pent[i]];
}

/**
 * Radius of the largest circle that fits in a yard triangle. Offsetting the
 * triangle inward by this much collapses it to a point, so it is the hard
 * ceiling on the colour band.
 */
export function yardInradius(i, cfg = CONFIG) {
  const [a, b, c] = yardTriangle(i, cfg);
  const d = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
  const s = (d(b, c) + d(a, c) + d(a, b)) / 2;
  const area = Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
  return area / s;
}

/**
 * The white pad inside the yard triangle.
 *
 * The band is clamped short of the inradius: past that the offset inverts and
 * the pad turns inside out, so the slider cannot break the board.
 */
export function yardPad(i, cfg = CONFIG) {
  const band = Math.min(cfg.padInset, yardInradius(i, cfg) * 0.92);
  return offsetPolygon(yardTriangle(i, cfg), band, cfg);
}

/**
 * Four waiting positions: one tucked toward each point of the triangle, and
 * one in the middle of those three.
 *
 * The radius is solved rather than guessed - the largest that keeps every
 * token inside the pad and clear of its neighbours.
 */
export function tokenSpots(i, cfg = CONFIG) {
  const pad = yardPad(i, cfg);
  const c = polyCentroid(pad);

  // Spread is solved, not fixed: push the three corner tokens too far out and
  // the pad edge limits them, too far in and they crowd each other. Sweep it
  // and keep whichever gives the largest token.
  const layout = (f) => {
    const spots = pad.map((v) => ({ x: c.x + (v.x - c.x) * f, y: c.y + (v.y - c.y) * f }));
    spots.push({ x: c.x, y: c.y });
    let rPair = Infinity;
    for (let a = 0; a < spots.length; a++) {
      for (let b = a + 1; b < spots.length; b++) {
        rPair = Math.min(rPair, Math.hypot(spots[a].x - spots[b].x, spots[a].y - spots[b].y) / 2);
      }
    }
    let rEdge = Infinity;
    for (const s of spots) {
      for (let k = 0; k < pad.length; k++) {
        rEdge = Math.min(rEdge, distToSeg(s, pad[k], pad[(k + 1) % pad.length]));
      }
    }
    // a 4-player token is 40px in a 40px cell, so never exceed one cell across
    return { spots, r: Math.min(Math.min(rPair, rEdge) * 0.92, (cfg.cell || Infinity) * 0.38) };
  };

  let best = layout(cfg.tokenSpread);
  for (let step = 0; step <= 40; step++) {
    const cand = layout(0.25 + (0.55 * step) / 40);
    if (cand.r > best.r) best = cand;
  }
  return best.spots.map((s) => ({ ...s, r: best.r }));
}

/* ===========================================================================
 * Square cells.
 *
 * Every 4-player version in this repo uses a square cell: board / 15, so
 * 40px at 600, 32px at 480, 24px at 360. Lane width and step length must
 * therefore be equal here too.
 *
 * Two constraints fix the whole scale:
 *   1. an arm is 3 cells wide and 6 cells long
 *   2. the n arms exactly fill the centre polygon's perimeter, so they meet
 *      at its faces with no gap and no overlap - n * 3c = n * 2 * centerR * sin(pi/n)
 *
 * That gives centreApothem = 1.5c * cot(pi/n). For n = 4 it returns 1.5 cells,
 * which is exactly the 3x3 centre of the square board - the same formula
 * reproduces the existing boards, so it is the right generalisation.
 * ===========================================================================
 */

/** Fill in armHalf / centerR / cell so that every track cell is square. */
export function withSquareCells(base = CONFIG) {
  const n = base.players.length;
  const half = Math.PI / n;
  const rim = base.R * Math.cos(rad(base.shortArc / 2)) - base.frame; // shortApothem
  const cell = rim / (CELLS_ALONG_ARM + 1.5 / Math.tan(half));

  // An arm ends at a corner cut, so it can never be wider than the cut is
  // there. Both scale with the rim, so the limit is a pure ratio, and it only
  // depends on the seat count: the short arc has to clear
  // 2 * atan(1.5 / (CELLS_ALONG_ARM + 1.5 * cot(pi/n))), which is 19.07 deg on
  // five seats (so a long edge past 50.93) and 19.81 on six. Both pairs in
  // ARCS sit inside it. Past it we clamp, so the arm lands exactly on the
  // board's vertices rather than poking through, and cells go a fraction
  // wider than tall instead.
  const room = rim * Math.tan(rad(base.shortArc / 2));
  const armHalf = Math.min(1.5 * cell, room);
  return {
    ...base,
    cell,
    armHalf,
    centerR: armHalf / Math.sin(half),
  };
}

/** Width x height of a track cell, for checking squareness. */
export function cellSize(cfg = CONFIG) {
  const r0 = centerApothem(cfg);
  const r1 = shortApothem(cfg);
  return {
    across: (2 * cfg.armHalf) / 3,
    along: (r1 - r0) / CELLS_ALONG_ARM,
  };
}

/* ===========================================================================
 * The one call a page needs.
 * ===========================================================================
 */

/**
 * A ready-to-draw config for `n` players: the right roster, the arc pair that
 * closes the outline for that count, and square track cells.
 *
 * `over` lets a page tweak anything on top (the design sliders pass their own
 * arcs), and it is applied before the cells are squared so the derived values
 * always match what was asked for.
 */
export function boardConfig(n = 5, over = {}) {
  const seats = Number(n);
  if (!ARCS[seats]) {
    throw new Error(`No arc pair for ${n} players; known: ${Object.keys(ARCS).join(", ")}`);
  }
  return withSquareCells({
    ...CONFIG,
    players: playersFor(seats),
    ...ARCS[seats],
    ...over,
  });
}
