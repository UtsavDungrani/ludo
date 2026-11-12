/* boardn-render.js
 * ---------------------------------------------------------------------------
 * Draws a polygonal board - five seats or six - in the SAME visual language
 * as the 4-player board:
 * white plate, 1px black cell borders, Tailwind area colours, black-bordered
 * tokens carrying star.svg, star_secure.svg on safe cells, arrow_*_5p.svg on
 * each home entrance, player names outside the board.
 *
 * Nothing here counts seats for itself: the roster comes in on `cfg.players`,
 * so the same calls draw the 5-player decagon and the 6-player dodecagon.
 *
 * No decoration of its own - every colour and stroke here traces back to
 * main.css or game.html.
 * ---------------------------------------------------------------------------
 */

import {
  CONFIG,
  INK,
  STROKE,
  pointAt,
  sectorAngle,
  sectorArc,
  columnAngle,
  outlinePoints,
  offsetPolygon,
  toPoints,
  armQuad,
  finishTriangle,
  ringCells,
  startIndices,
  entryIndices,
  homeCells,
  yardRegion,
  longApothem,
  yardPad,
  tokenSpots,
  cellSize,
} from "./boardn-geometry.js";

const NS = "http://www.w3.org/2000/svg";
const IMG = "../img";

function el(name, attrs = {}, parent = null) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  if (parent) parent.appendChild(node);
  return node;
}

const centroid = (pts) =>
  pts.reduce((a, p) => ({ x: a.x + p.x / pts.length, y: a.y + p.y / pts.length }), { x: 0, y: 0 });

/** Drop an asset into a cell, centred, optionally rotated. */
function icon(parent, href, c, size, rotate = 0) {
  return el("image", {
    href,
    x: c.x - size / 2,
    y: c.y - size / 2,
    width: size,
    height: size,
    transform: rotate ? `rotate(${rotate} ${c.x} ${c.y})` : null,
  }, parent);
}

/* --- the board plate ----------------------------------------------------- */

export function renderFrame(svg, cfg = CONFIG) {
  svg.setAttribute("viewBox", `0 0 ${cfg.size} ${cfg.size}`);
  svg.innerHTML = "";

  const outer = outlinePoints(cfg.R, cfg);
  el("polygon", {
    points: toPoints(outer),
    fill: "#ffffff",
    stroke: INK,
    "stroke-width": STROKE.board,
    "stroke-linejoin": "round",
  }, el("g", { id: "plate" }, svg));

  /* Each name gets its own container outside the board, turned to sit flat
     against that player's edge and butted up against it. */
  const labels = el("g", { id: "labels" }, svg);
  cfg.players.forEach((p, i) => {
    const a = sectorAngle(i, cfg);
    const w = 190;
    const h = 44;
    const at = pointAt(a, longApothem(cfg) + h / 2, cfg);

    // Lying flat against the edge puts the plates on the far side of the board
    // upside down. Turning those two a further half turn leaves the plate in
    // exactly the same place - it is symmetric - and stands the name back up.
    let turn = ((a - 90 + 180) % 360) - 180;
    if (turn > 90 || turn < -90) turn += 180;

    const box = el("g", {
      transform: `rotate(${turn} ${at.x} ${at.y})`,
      "data-label": p.id,
    }, labels);
    el("rect", {
      x: at.x - w / 2,
      y: at.y - h / 2,
      width: w,
      height: h,
      rx: 8,
      fill: p.color,
      stroke: INK,
      "stroke-width": STROKE.yard,
    }, box);
    el("text", {
      x: at.x,
      y: at.y,
      fill: INK,
      "font-size": 24,
      "font-family": "system-ui, sans-serif",
      "font-weight": 700,
      "text-anchor": "middle",
      "dominant-baseline": "central",
    }, box).textContent = `Player ${p.name}`;
  });

  /* construction guides, hidden unless toggled */
  const guides = el("g", { id: "guides", opacity: 0 }, svg);
  el("circle", {
    cx: cfg.cx, cy: cfg.cy, r: cfg.R,
    fill: "none", stroke: "#f43f5e", "stroke-width": 1.5, "stroke-dasharray": "6 6",
  }, guides);
  cfg.players.forEach((_, i) => {
    const to = pointAt(sectorAngle(i, cfg) + sectorArc(cfg) / 2, cfg.R, cfg);
    el("line", {
      x1: cfg.cx, y1: cfg.cy, x2: to.x, y2: to.y,
      stroke: "#f43f5e", "stroke-width": 1.5, "stroke-dasharray": "6 6",
    }, guides);
  });
  outer.forEach((p) => el("circle", { cx: p.x, cy: p.y, r: 6, fill: "#f43f5e" }, guides));

  return { outer };
}

/* --- yards, arms, centre ------------------------------------------------- */

export function renderSkeleton(svg, cfg = CONFIG) {
  const g = el("g", { id: "skeleton" }, svg);

  const arms = el("g", { id: "arms" }, g);
  cfg.players.forEach((p, i) => {
    el("polygon", {
      points: toPoints(armQuad(i, cfg)),
      fill: "#ffffff",
      stroke: INK,
      "stroke-width": STROKE.cell,
      "data-arm": p.id,
    }, arms);
  });

  const yards = el("g", { id: "yards" }, g);
  cfg.players.forEach((p, i) => {
    el("polygon", {
      points: toPoints(offsetPolygon(yardRegion(i, cfg), cfg.gap, cfg)),
      fill: p.color,
      stroke: INK,
      "stroke-width": STROKE.yard,
      "stroke-linejoin": "round",
      "data-yard": p.id,
    }, yards);
    el("polygon", {
      points: toPoints(yardPad(i, cfg)),
      fill: "#ffffff",
      stroke: INK,
      "stroke-width": STROKE.cell,
      "stroke-linejoin": "round",
    }, yards);

    // A disc under every waiting spot, so a yard still shows where its tokens
    // belong once they have left it. Same idea as .token-slot on the 4-player
    // board: the size of a token, painted underneath it, so it shows through
    // only while the spot is empty.
    const slots = el("g", { "data-slots": p.id }, yards);
    tokenSpots(i, cfg).forEach((spot, n) => {
      el("circle", {
        cx: spot.x,
        cy: spot.y,
        r: spot.r,
        fill: "#ffffff",
        stroke: "rgba(0, 0, 0, 0.3)",
        "stroke-width": STROKE.token,
        "data-slot": n + 1,
      }, slots);
    });

  });

  const centre = el("g", { id: "centre" }, g);
  cfg.players.forEach((p, i) => {
    el("polygon", {
      points: toPoints(finishTriangle(i, cfg)),
      fill: p.color,
      stroke: INK,
      "stroke-width": STROKE.cell,
      "data-finish": p.id,
    }, centre);
  });

  return g;
}

/* --- the track ----------------------------------------------------------- */

export function renderTrack(svg, cfg = CONFIG) {
  const g = el("g", { id: "track" }, svg);
  const ring = ringCells(cfg);
  const starts = startIndices(cfg);
  const entries = entryIndices(cfg);

  const startOf = new Map();
  const safeOf = new Map();
  starts.forEach((s, i) => {
    startOf.set(s, cfg.players[i]);
    safeOf.set((s + 8) % ring.length, cfg.players[i]); // the c9 / c22 / c35 / c48 pattern
  });
  const entryOf = new Map();
  entries.forEach((e, i) => entryOf.set(e, i));

  const homes = el("g", { id: "home-columns" }, g);
  cfg.players.forEach((p, i) => {
    homeCells(i, cfg).forEach((c) => {
      el("polygon", {
        points: toPoints(c.quad),
        fill: p.color,
        stroke: INK,
        "stroke-width": STROKE.cell,
        "data-home": p.id,
      }, homes);
    });
  });

  const lane = el("g", { id: "ring" }, g);
  ring.forEach((c) => {
    const owner = startOf.get(c.index);
    el("polygon", {
      points: toPoints(c.quad),
      fill: owner ? owner.color : "#ffffff",
      stroke: INK,
      "stroke-width": STROKE.cell,
      "data-cell": c.index,
    }, lane);

    const mid = centroid(c.quad);
    const size = cfg.cell * 0.68;
    if (safeOf.has(c.index)) icon(lane, `${IMG}/star_secure.svg`, mid, size);

    if (entryOf.has(c.index)) {
      const owner = entryOf.get(c.index);
      // arrow_*_5p.svg points straight down, so turn it to face the centre
      const turn = columnAngle(owner, cfg) + 90;
      icon(lane, `${IMG}/arrow_${cfg.players[owner].id}_5p.svg`, mid, size, turn);
    }
  });

  return g;
}

/* --- tokens -------------------------------------------------------------- */

export function renderTokens(svg, cfg = CONFIG) {
  const g = el("g", { id: "tokens" }, svg);
  cfg.players.forEach((p, i) => {
    tokenSpots(i, cfg).forEach((s, n) => {
      // Drawn around (0,0) and put in place by a transform: a move is then a
      // single attribute change, which CSS can also transition.
      const t = el("g", {
        id: `token-${p.id}-${n + 1}`,
        "data-player": p.id,
        "data-token": n + 1,
        class: `token token-${p.id}`,
        transform: `translate(${s.x} ${s.y})`,
      }, g);
      el("circle", {
        cx: 0, cy: 0, r: s.r,
        fill: p.token,
        stroke: INK,
        "stroke-width": STROKE.token,
      }, t);
      icon(t, `${IMG}/star.svg`, { x: 0, y: 0 }, s.r * 1.7);
    });
  });
  return g;
}

/* --- where a token can stand --------------------------------------------- */

/**
 * Every cell id the engine can name, mapped to the point a token sits on:
 * all 13n ring cells, each colour's 5 home-column cells, and each finish.
 * Ids match boardn-engine.js, which in turn matches the 4-player naming.
 */
export function trackPoints(cfg = CONFIG) {
  const points = new Map();

  ringCells(cfg).forEach((c) => points.set(`c${c.index + 1}`, centroid(c.quad)));

  cfg.players.forEach((p, i) => {
    homeCells(i, cfg).forEach((c, s) => points.set(`${p.id[0]}c${s + 1}`, centroid(c.quad)));
    points.set(`${p.id}_home`, centroid(finishTriangle(i, cfg)));
  });

  return points;
}

/** The four waiting spots in each colour's yard, token 1 first. */
export function yardPoints(cfg = CONFIG) {
  const spots = {};
  cfg.players.forEach((p, i) => {
    spots[p.id] = tokenSpots(i, cfg);
  });
  return spots;
}

/**
 * Put every token where the game says it is.
 *
 * `cellOf` returns a cell id, or null for a token still in its yard. Several
 * tokens on one cell are fanned out and shrunk, the way updateCellClasses()
 * does it on the 4-player board, so a stack stays readable.
 */
export function placeTokens(svg, cellOf, cfg = CONFIG, cache = {}) {
  const points = cache.points || trackPoints(cfg);
  const yard = cache.yard || yardPoints(cfg);
  const step = cellSize(cfg).across;

  const byCell = new Map();
  const all = [];
  cfg.players.forEach((p) => {
    for (let n = 1; n <= 4; n++) {
      const id = `token-${p.id}-${n}`;
      const node = svg.getElementById ? svg.getElementById(id) : document.getElementById(id);
      if (!node) continue;
      const cell = cellOf(id);
      all.push({ id, node, color: p.id, n, cell });
      if (cell) {
        if (!byCell.has(cell)) byCell.set(cell, []);
        byCell.get(cell).push(id);
      }
    }
  });

  all.forEach((t) => {
    if (!t.cell) {
      const spot = yard[t.color][t.n - 1];
      t.node.setAttribute("transform", `translate(${spot.x} ${spot.y})`);
      return;
    }

    const at = points.get(t.cell);
    if (!at) return;

    const share = byCell.get(t.cell);
    const slot = share.indexOf(t.id);
    const side = Math.ceil(Math.sqrt(share.length));
    const scale = share.length === 1 ? 1 : Math.min(0.62, 1.1 / side);
    const gap = step * 0.3;
    const dx = side === 1 ? 0 : ((slot % side) - (side - 1) / 2) * gap;
    const dy = side === 1 ? 0 : (Math.floor(slot / side) - (side - 1) / 2) * gap;

    t.node.setAttribute(
      "transform",
      `translate(${at.x + dx} ${at.y + dy}) scale(${scale})`,
    );
  });

  return { points, yard };
}
