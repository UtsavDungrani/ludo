/* boardn-engine.test.mjs
 * ---------------------------------------------------------------------------
 * Rules and geometry checks for the polygonal boards, run with:
 *
 *     node "dist/js/boardn-engine.test.mjs"
 *
 * No browser and no DOM - boardn-engine.js is pure, which is the point of
 * keeping it separate from the page. Every check below runs once per seat
 * count, so the 6-player board is held to exactly the same rules as the
 * 5-player one. Exits non-zero if anything fails.
 * ---------------------------------------------------------------------------
 */

import {
  SEAT_COUNTS,
  boardConfig,
  describe,
  cellSize,
  ringCells,
  startIndices,
  entryIndices,
  tokenSpots,
  yardPad,
  pointInPolygon,
} from "./boardn-geometry.js";
import { createGame, buildPaths, buildSafeCells, YARD, tokenId } from "./boardn-engine.js";

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails++;
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${extra ? "  " + extra : ""}`);
};

for (const seats of SEAT_COUNTS) {
  const cfg = boardConfig(seats);
  const roster = cfg.players.map((p) => p.id);

  /* The three numbers every other expectation is derived from. 13 ring cells
   * per sector and 5 home cells are the 4-player board's proportions. */
  const RING = 13 * seats;
  const PATH = RING + 5; // ring minus one, plus 5 home cells, plus the finish
  const LAST = PATH - 1;

  console.log(`\n================ ${seats} players ================`);

  /* ---- the board itself -------------------------------------------------- */
  const d = describe(cfg);
  const cs = cellSize(cfg);
  ok("outline closes", d.closes, `${seats} x (${cfg.longArc} + ${cfg.shortArc}) = 360`);
  ok("2n outline points", d.points === 2 * seats, `${d.points}`);
  /* Exactly square, not approximately: withSquareCells() only clamps the arm
   * when the corner cut is too narrow for three cells, and both arc pairs in
   * ARCS are chosen to stay inside that limit. A cell that is off here means
   * someone picked a long edge the corner cut cannot carry. */
  ok(
    "track cells are square",
    Math.abs(cs.across - cs.along) < 0.01,
    `${cs.across.toFixed(2)} x ${cs.along.toFixed(2)}`,
  );
  /* The long edge has to stay the wider of the two, but not by a fixed
   * margin: the arm it has to leave room for is the same size whatever n is,
   * so the corner cut cannot shrink with the sector and the ratio falls as
   * seats are added - about 2.7 : 1 on four seats, about 1.1 : 1 on ten. */
  ok("long edge is the wider one", d.ratio > 1.05, `${d.ratio.toFixed(2)} : 1`);

  // the four waiting spots must genuinely fit inside each yard's white pad
  const spilled = cfg.players
    .map((_, i) => {
      const pad = yardPad(i, cfg);
      return tokenSpots(i, cfg).filter((s) => !pointInPolygon(s, pad)).length;
    })
    .reduce((a, b) => a + b, 0);
  ok("every yard token sits inside its pad", spilled === 0, `${spilled} outside`);

  // no two track cells may occupy the same place
  const ring = ringCells(cfg);
  const quads = new Set(
    ring.map((c) => c.quad.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("|")),
  );
  ok(`${RING} distinct ring cells`, ring.length === RING && quads.size === RING, `${ring.length}`);

  /* ---- paths ------------------------------------------------------------- */
  const paths = buildPaths(cfg);
  const starts = startIndices(cfg);
  const entries = entryIndices(cfg);

  console.log(`  ring ${ring.length}  starts ${starts.join(",")}  entries ${entries.join(",")}`);

  ok(`${seats} paths`, Object.keys(paths).length === seats);
  cfg.players.forEach((p, i) => {
    const path = paths[p.id];
    const ringPart = path.filter((c) => /^c\d+$/.test(c));
    ok(
      `${p.id} path`,
      path.length === PATH &&
        ringPart.length === RING - 1 &&
        new Set(ringPart).size === RING - 1 &&
        path[0] === `c${starts[i] + 1}` &&
        path[RING - 2] === `c${entries[i] + 1}` &&
        path[RING - 1] === `${p.id[0]}c1` &&
        path[RING + 3] === `${p.id[0]}c5` &&
        path[LAST] === `${p.id}_home`,
      `len ${path.length} ring ${ringPart.length} start ${path[0]} end ${path[LAST]}`,
    );
  });

  // the one ring cell each owner never walks is the cell just past their own tip
  cfg.players.forEach((p) => {
    const missing = ring.map((_, n) => `c${n + 1}`).filter((id) => !paths[p.id].includes(id));
    ok(`${p.id} skips exactly one ring cell`, missing.length === 1, missing.join(""));
  });

  // every ring cell is reachable by somebody
  const covered = new Set(
    Object.values(paths)
      .flat()
      .filter((c) => /^c\d+$/.test(c)),
  );
  ok(`all ${RING} ring cells used by someone`, covered.size === RING, `${covered.size}`);

  // home columns are private
  const homeIds = Object.values(paths)
    .flat()
    .filter((c) => /^[a-z]c\d+$/.test(c));
  ok(
    `${5 * seats} private home-column cells`,
    new Set(homeIds).size === 5 * seats,
    `${new Set(homeIds).size}`,
  );

  /* ---- safe cells -------------------------------------------------------- */
  const safe = buildSafeCells(cfg);
  ok(`${2 * seats} safe cells`, safe.size === 2 * seats, [...safe].join(" "));
  ok(
    "every start is safe",
    starts.every((s) => safe.has(`c${s + 1}`)),
  );

  /* ---- rules ------------------------------------------------------------- */
  // Two colours that are never the same seat, whichever board this is.
  const [A, B, C] = ["red", "blue", "green"];

  // capture
  {
    const g = createGame({ cfg });
    const red = tokenId(A, 1);
    const blue = tokenId(B, 1);
    const target = g.pathOf(A)[4]; // not a start, not start+8
    ok("target not safe", !g.isSafe(target), target);
    g.state.positions[blue] = g.pathOf(B).indexOf(target);
    ok("blue parked on it", g.cellOf(blue) === target);
    g.state.positions[red] = 1;
    g.state.turn = A;
    const r = g.move(red, 3);
    ok("red captured blue", r.captured.includes(blue) && g.state.positions[blue] === YARD);
    ok("capture grants another turn", r.extraTurn && g.state.turn === A);
  }

  // safe cell shields
  {
    const g = createGame({ cfg });
    const red = tokenId(A, 1);
    const blue = tokenId(B, 1);
    const target = g.pathOf(A)[8]; // c9 - the starred cell
    ok("c9 is safe", g.isSafe(target), target);
    g.state.positions[blue] = g.pathOf(B).indexOf(target);
    g.state.positions[red] = 5;
    g.state.turn = A;
    const r = g.move(red, 3);
    ok("no capture on a safe cell", r.captured.length === 0 && g.state.positions[blue] !== YARD);
  }

  // block of two survives
  {
    const g = createGame({ cfg });
    const red = tokenId(A, 1);
    const target = g.pathOf(A)[4];
    const bluePos = g.pathOf(B).indexOf(target);
    g.state.positions[tokenId(B, 1)] = bluePos;
    g.state.positions[tokenId(B, 2)] = bluePos;
    g.state.positions[tokenId(C, 1)] = g.pathOf(C).indexOf(target);
    g.state.positions[red] = 1;
    g.state.turn = A;
    const r = g.move(red, 3);
    ok(
      "block of two blues survives, lone green does not",
      !r.captured.includes(tokenId(B, 1)) && r.captured.includes(tokenId(C, 1)),
      r.captured.join(" "),
    );
  }

  // yard needs a 6
  {
    const g = createGame({ cfg });
    ok("no moves without a 6", g.movesFor(A, 4).length === 0);
    ok("all four leave on a 6", g.movesFor(A, 6).length === 4);
    const r = g.move(tokenId(A, 1), 6);
    ok("start cell is the path head", r.landed === g.pathOf(A)[0]);
    ok("6 keeps the turn", g.state.turn === A);
  }

  // exact finish
  {
    const g = createGame({ cfg });
    const red = tokenId(A, 1);
    g.state.positions[red] = LAST - 2;
    g.state.turn = A;
    ok("overshoot rejected", g.movesFor(A, 3).includes(red) === false);
    ok("exact roll offered", g.movesFor(A, 2).includes(red));
    const r = g.move(red, 2);
    ok("reached home", r.reachedHome && r.extraTurn);
  }

  // finishing all four places the player and passes the turn
  {
    const g = createGame({ cfg });
    g.state.turn = A;
    [1, 2, 3].forEach((n) => (g.state.positions[tokenId(A, n)] = LAST));
    g.state.positions[tokenId(A, 4)] = LAST - 2;
    const r = g.move(tokenId(A, 4), 2);
    ok("red placed 1st", r.finished && r.finished.position === 1, JSON.stringify(r.finished));
    ok("turn handed on despite reaching home", !r.extraTurn && g.state.turn !== A);
    ok("not over with others still playing", !g.state.over);
  }

  // three sixes in a row burns the third
  {
    const seq = [6, 6, 6, 3];
    let i = 0;
    const g = createGame({ cfg, rng: () => (seq[Math.min(i++, seq.length - 1)] - 1) / 6 + 1e-9 });
    const a = g.roll();
    g.move(a.moves[0], a.value);
    const b = g.roll();
    g.move(b.moves[0], b.value);
    const c = g.roll();
    ok(
      "third 6 is burned",
      a.value === 6 && b.value === 6 && c.value !== 6,
      `${a.value},${b.value},${c.value}`,
    );
    ok("streak reset", g.state.sixStreak[g.state.seats[0]] === 0);
  }

  /* ---- full games -------------------------------------------------------- */
  function playOut(seed, colors) {
    let s = seed;
    const rng = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const g = createGame({ cfg, colors, rng });
    let turns = 0;

    while (!g.state.over && turns < 200000) {
      turns++;
      const r = g.roll();
      if (!r) break;
      if (r.moves.length === 0) {
        g.pass();
        continue;
      }
      g.move(r.moves[Math.floor(rng() * r.moves.length)], r.value);
    }
    return { g, turns };
  }

  for (const colors of [undefined, [A, C, "yellow"], [A, B]]) {
    const label = colors ? colors.join("+") : `all ${seats}`;
    const { g, turns } = playOut(7, colors);
    const n = colors ? colors.length : seats;
    ok(
      `full game (${label}) ends with everyone placed`,
      g.state.over && g.state.winners.length === n && new Set(g.state.winners).size === n,
      `${turns} rolls, standings ${g.state.winners.join(" > ")}`,
    );
    const champ = g.state.winners[0];
    ok(
      `${label}: winner really has all four home`,
      g.state.tokens[champ].every((id) => g.cellOf(id) === `${champ}_home`),
    );
  }

  // many seeds, just checking nothing hangs or corrupts
  let worst = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const { g, turns } = playOut(seed);
    worst = Math.max(worst, turns);
    if (!g.state.over || g.state.winners.length !== seats) {
      ok(`seed ${seed}`, false, `${turns} rolls`);
    }
  }
  ok(`40 random ${seats}-player games all terminate`, true, `longest ${worst} rolls`);

  // the full roster really is the seat list the engine used
  ok("roster matches seat count", roster.length === seats, roster.join(","));
}

console.log(fails ? `\n${fails} FAILED` : "\nall green");
process.exit(fails ? 1 : 0);
