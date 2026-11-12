/* board5-engine.test.mjs
 * ---------------------------------------------------------------------------
 * Rules checks for the 5-player engine, run with:
 *
 *     node "dist/js/board5-engine.test.mjs"
 *
 * No browser and no DOM - board5-engine.js is pure, which is the point of
 * keeping it separate from the page. Exits non-zero if anything fails.
 * ---------------------------------------------------------------------------
 */

import {
  CONFIG,
  PLAYERS,
  withSquareCells,
  ringCells,
  startIndices,
  entryIndices,
} from "./board5-geometry.js";
import { createGame, buildPaths, buildSafeCells, YARD, tokenId } from "./board5-engine.js";

const cfg = withSquareCells({ ...CONFIG, longArc: 51, shortArc: 21, frame: 0 });
let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails++;
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${extra ? "  " + extra : ""}`);
};

/* ---- paths --------------------------------------------------------------- */
const paths = buildPaths(cfg);
const ring = ringCells(cfg);
const starts = startIndices(cfg);
const entries = entryIndices(cfg);

console.log("ring", ring.length, "starts", starts.join(","), "entries", entries.join(","));

ok("five paths", Object.keys(paths).length === 5);
PLAYERS.forEach((p, i) => {
  const path = paths[p.id];
  const ringPart = path.filter((c) => /^c\d+$/.test(c));
  ok(
    `${p.id} path`,
    path.length === 70 &&
      ringPart.length === 64 &&
      new Set(ringPart).size === 64 &&
      path[0] === `c${starts[i] + 1}` &&
      path[63] === `c${entries[i] + 1}` &&
      path[64] === `${p.id[0]}c1` &&
      path[68] === `${p.id[0]}c5` &&
      path[69] === `${p.id}_home`,
    `len ${path.length} ring ${ringPart.length} start ${path[0]} entry@63 ${path[63]} end ${path[69]}`,
  );
});

// the one ring cell each owner never walks is the cell just past their own tip
PLAYERS.forEach((p, i) => {
  const missing = ring
    .map((_, n) => `c${n + 1}`)
    .filter((id) => !paths[p.id].includes(id));
  ok(`${p.id} skips exactly one ring cell`, missing.length === 1, missing.join(""));
});

// every ring cell is reachable by somebody
const covered = new Set(Object.values(paths).flat().filter((c) => /^c\d+$/.test(c)));
ok("all 65 ring cells used by someone", covered.size === 65, `${covered.size}`);

// home columns are private
const homeIds = Object.values(paths).flat().filter((c) => /^[a-z]c\d+$/.test(c));
ok("25 private home-column cells", new Set(homeIds).size === 25, `${new Set(homeIds).size}`);

/* ---- safe cells ---------------------------------------------------------- */
const safe = buildSafeCells(cfg);
ok("10 safe cells", safe.size === 10, [...safe].join(" "));
ok(
  "every start is safe",
  starts.every((s) => safe.has(`c${s + 1}`)),
);

/* ---- rules --------------------------------------------------------------- */
// capture
{
  const g = createGame({ cfg });
  const red = tokenId("red", 1);
  const blue = tokenId("blue", 1);
  // put blue on a non-safe ring cell that red can reach
  const redPath = g.pathOf("red");
  const target = redPath[4]; // c5, not a start, not start+8
  ok("target not safe", !g.isSafe(target), target);
  g.state.positions[blue] = g.pathOf("blue").indexOf(target);
  ok("blue parked on it", g.cellOf(blue) === target);
  g.state.positions[red] = 1;
  g.state.turn = "red";
  const r = g.move(red, 3);
  ok("red captured blue", r.captured.includes(blue) && g.state.positions[blue] === YARD);
  ok("capture grants another turn", r.extraTurn && g.state.turn === "red");
}

// safe cell shields
{
  const g = createGame({ cfg });
  const red = tokenId("red", 1);
  const blue = tokenId("blue", 1);
  const target = g.pathOf("red")[8]; // c9 - the starred cell
  ok("c9 is safe", g.isSafe(target), target);
  g.state.positions[blue] = g.pathOf("blue").indexOf(target);
  g.state.positions[red] = 5;
  g.state.turn = "red";
  const r = g.move(red, 3);
  ok("no capture on a safe cell", r.captured.length === 0 && g.state.positions[blue] !== YARD);
}

// block of two survives
{
  const g = createGame({ cfg });
  const red = tokenId("red", 1);
  const target = g.pathOf("red")[4];
  const bluePos = g.pathOf("blue").indexOf(target);
  g.state.positions[tokenId("blue", 1)] = bluePos;
  g.state.positions[tokenId("blue", 2)] = bluePos;
  g.state.positions[tokenId("green", 1)] = g.pathOf("green").indexOf(target);
  g.state.positions[red] = 1;
  g.state.turn = "red";
  const r = g.move(red, 3);
  ok(
    "block of two blues survives, lone green does not",
    !r.captured.includes(tokenId("blue", 1)) && r.captured.includes(tokenId("green", 1)),
    r.captured.join(" "),
  );
}

// yard needs a 6
{
  const g = createGame({ cfg });
  ok("no moves without a 6", g.movesFor("red", 4).length === 0);
  ok("all four leave on a 6", g.movesFor("red", 6).length === 4);
  const r = g.move(tokenId("red", 1), 6);
  ok("start cell is the path head", r.landed === g.pathOf("red")[0]);
  ok("6 keeps the turn", g.state.turn === "red");
}

// exact finish
{
  const g = createGame({ cfg });
  const red = tokenId("red", 1);
  g.state.positions[red] = 67; // two short of 69
  g.state.turn = "red";
  ok("overshoot rejected", g.movesFor("red", 3).includes(red) === false);
  ok("exact roll offered", g.movesFor("red", 2).includes(red));
  const r = g.move(red, 2);
  ok("reached home", r.reachedHome && r.extraTurn);
}

// finishing all four places the player and passes the turn
{
  const g = createGame({ cfg });
  g.state.turn = "red";
  [1, 2, 3].forEach((n) => (g.state.positions[tokenId("red", n)] = 69));
  g.state.positions[tokenId("red", 4)] = 67;
  const r = g.move(tokenId("red", 4), 2);
  ok("red placed 1st", r.finished && r.finished.position === 1, JSON.stringify(r.finished));
  ok("turn handed on despite reaching home", !r.extraTurn && g.state.turn !== "red");
  ok("not over with four still playing", !g.state.over);
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
  ok("third 6 is burned", a.value === 6 && b.value === 6 && c.value !== 6, `${a.value},${b.value},${c.value}`);
  ok("streak reset", g.state.sixStreak.red === 0);
}

/* ---- full games ---------------------------------------------------------- */
function playOut(seed, seats) {
  let s = seed;
  const rng = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const g = createGame({ cfg, colors: seats, rng });
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

for (const seats of [undefined, ["red", "green", "yellow"], ["red", "blue"]]) {
  const label = seats ? seats.join("+") : "all five";
  const { g, turns } = playOut(7, seats);
  const n = seats ? seats.length : 5;
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
  if (!g.state.over || g.state.winners.length !== 5) {
    ok(`seed ${seed}`, false, `${turns} rolls`);
  }
}
ok("40 random five-player games all terminate", true, `longest ${worst} rolls`);

console.log(fails ? `\n${fails} FAILED` : "\nall green");
process.exit(fails ? 1 : 0);
