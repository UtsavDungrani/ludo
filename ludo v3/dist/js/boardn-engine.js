/* boardn-engine.js
 * ---------------------------------------------------------------------------
 * The polygonal-board game - five seats or six - with no DOM in it.
 *
 * game-state.js / game-movement.js keep the 4-player rules, but they keep them
 * in the page: a token's position is "which div is it inside", and a capture is
 * found by reading the cells' children. That works for a board made of divs. A
 * polygonal board is one SVG, so there are no containers to parent tokens into
 * and the same trick has nothing to hold on to.
 *
 * So the rules live here instead, over plain data, and the view is told what
 * changed. Same rules as the 4-player game, ported one at a time:
 *
 *   - a 6 is needed to bring a token out of the yard
 *   - three 6s in a row burns the third (re-rolled as 1-5)
 *   - a 6, a capture or reaching home earns another turn
 *   - landing on an opponent sends it back, unless the cell is safe
 *   - two tokens of one colour on a cell are a block and survive
 *   - the last cell must be reached exactly
 *
 * The path is generated from the geometry rather than written out: every ring
 * cell but one, from the player's start round to their own arm tip, then the 5
 * home column cells, then home. That is 70 entries on five seats and 83 on
 * six, where the 4-player board has 57.
 *
 * Seat count comes in on `cfg.players`; nothing below is written for a fixed n.
 * ---------------------------------------------------------------------------
 */

import {
  CONFIG,
  HOME_CELLS,
  ringCells,
  startIndices,
  entryIndices,
} from "./boardn-geometry.js";

export const YARD = -1;
export const TOKENS_PER_PLAYER = 4;

/** Cell id for ring index i. 1-based, so ring 0 is "c1" as on the 4-p board. */
export const ringId = (i) => `c${i + 1}`;

/** Cell id for step s of a colour's home column: "rc1".."rc5", "pc1".. */
export const homeId = (color, s) => `${color[0]}c${s + 1}`;

/** The colour's final resting place: "red_home", matching game-state.js. */
export const finishId = (color) => `${color}_home`;

/**
 * Every colour's route, as cell ids.
 *
 * Walk the ring from the colour's start cell until its own arm tip - the cell
 * the arrow points off - then turn inward down the home column. One ring cell
 * is never walked by its owner (the one just past the tip), exactly as red on
 * the 4-player board walks c1..c51 and never c52.
 */
export function buildPaths(cfg = CONFIG) {
  const ring = ringCells(cfg);
  const starts = startIndices(cfg);
  const entries = entryIndices(cfg);
  const paths = {};

  cfg.players.forEach((p, i) => {
    const path = [];
    let at = starts[i];

    for (;;) {
      path.push(ringId(at));
      if (at === entries[i]) break;
      at = (at + 1) % ring.length;
    }

    for (let s = 0; s < HOME_CELLS; s++) path.push(homeId(p.id, s));
    path.push(finishId(p.id));
    paths[p.id] = path;
  });

  return paths;
}

/**
 * Safe cells: every start, plus the cell 8 on from it. The 4-player board marks
 * c1/c14/c27/c40 and c9/c22/c35/c48 the same way, and because both boards run
 * 13 cells to a sector, "start + 8" lands on the matching cell here.
 */
export function buildSafeCells(cfg = CONFIG) {
  const ring = ringCells(cfg);
  const safe = new Set();

  startIndices(cfg).forEach((s) => {
    safe.add(ringId(s));
    safe.add(ringId((s + 8) % ring.length));
  });

  return safe;
}

/** The track as one object: what the engine and the view both read. */
export function buildTrack(cfg = CONFIG) {
  const ring = ringCells(cfg);
  return {
    ringLength: ring.length,
    starts: startIndices(cfg),
    entries: entryIndices(cfg),
    paths: buildPaths(cfg),
    safe: buildSafeCells(cfg),
  };
}

export const tokenId = (color, n) => `token-${color}-${n}`;
export const colorOf = (id) => id.split("-")[1];

/* --- the game ------------------------------------------------------------ */

/**
 * `colors` is the seating order; leave it out and every seat on `cfg` plays.
 * `rng` is injectable so a test can play a scripted game.
 */
export function createGame({ cfg = CONFIG, colors, names = {}, rng = Math.random } = {}) {
  const track = buildTrack(cfg);
  const seats = (colors && colors.length ? colors : cfg.players.map((p) => p.id)).filter(
    (c) => track.paths[c],
  );

  const positions = {};
  const tokens = {};
  seats.forEach((c) => {
    tokens[c] = [];
    for (let n = 1; n <= TOKENS_PER_PLAYER; n++) {
      const id = tokenId(c, n);
      tokens[c].push(id);
      positions[id] = YARD;
    }
  });

  const state = {
    seats,
    tokens,
    positions,
    names,
    turn: seats[0],
    dice: null,
    sixStreak: Object.fromEntries(seats.map((c) => [c, 0])),
    winners: [],
    over: false,
    // set while a roll is waiting to be spent, so a second roll cannot sneak in
    pending: false,
  };

  const pathOf = (color) => track.paths[color];
  const cellOf = (id) => {
    const pos = positions[id];
    return pos === YARD ? null : pathOf(colorOf(id))[pos];
  };

  const name = (color) =>
    state.names[color] || `Player ${color.charAt(0).toUpperCase() + color.slice(1)}`;

  const isSafe = (cell) => track.safe.has(cell);

  /** Ring cells are shared; a home column ("rc3") and a finish belong to one
   *  colour, so nothing can meet there and nothing can be captured there. */
  const isShared = (cell) => /^c\d+$/.test(cell || "");

  const finishedBy = (color) => pathOf(color).length - 1;

  const tokensOn = (cell) =>
    Object.keys(positions).filter((id) => cellOf(id) === cell);

  /** Which tokens this roll could legally move. */
  function movesFor(color, dice) {
    return tokens[color].filter((id) => {
      const pos = positions[id];
      if (pos === YARD) return dice === 6;
      return pos + dice < pathOf(color).length;
    });
  }

  /**
   * Roll. Mirrors the 4-player die, including the quirk that the third 6 in a
   * row is thrown away and re-rolled as 1-5 rather than simply forfeiting.
   */
  function roll(forced) {
    if (state.over || state.pending) return null;

    const color = state.turn;
    let value =
      Number.isInteger(forced) && forced >= 1 && forced <= 6
        ? forced
        : Math.floor(rng() * 6) + 1;

    if (value === 6) {
      state.sixStreak[color] += 1;
      if (state.sixStreak[color] === 3) {
        value = Math.floor(rng() * 5) + 1;
        state.sixStreak[color] = 0;
      }
    } else {
      state.sixStreak[color] = 0;
    }

    state.dice = value;
    const moves = movesFor(color, value);
    state.pending = moves.length > 0;

    return { color, value, moves };
  }

  /**
   * Capture, ported from checkCollision(): a colour with two or more tokens on
   * the cell is a block and stays put; everyone else who is not the mover goes
   * back to the yard.
   */
  function capturesAt(cell, mover) {
    if (!isShared(cell) || isSafe(cell)) return [];

    const here = tokensOn(cell);
    if (here.length <= 1) return [];

    const counts = {};
    here.forEach((id) => {
      const c = colorOf(id);
      counts[c] = (counts[c] || 0) + 1;
    });
    const block = Object.keys(counts).find((c) => counts[c] > 1);

    return here.filter((id) => {
      const c = colorOf(id);
      return c !== mover && (!block || c !== block);
    });
  }

  function hasFinished(color) {
    const end = finishedBy(color);
    return tokens[color].every((id) => positions[id] === end);
  }

  /**
   * Play `id` forward by `dice`. Returns everything the view needs to show it:
   * the cells stepped through, who was sent home, and whose turn it is next.
   */
  function move(id, dice = state.dice) {
    const color = colorOf(id);
    if (state.over || color !== state.turn) return null;
    if (!movesFor(color, dice).includes(id)) return null;

    const path = pathOf(color);
    const from = positions[id];
    const to = from === YARD ? 0 : from + dice;

    const steps = [];
    for (let p = from === YARD ? 0 : from + 1; p <= to; p++) steps.push(path[p]);

    positions[id] = to;

    const landed = path[to];
    const captured = capturesAt(landed, color);
    captured.forEach((victim) => {
      positions[victim] = YARD;
    });

    const reachedHome = to === finishedBy(color);

    let finished = null;
    if (hasFinished(color) && !state.winners.includes(color)) {
      state.winners.push(color);
      finished = { color, position: state.winners.length };
    }

    state.dice = null;
    state.pending = false;

    // A 6, a capture or a token reaching home earns another roll - but a player
    // who has just placed their last token hands over regardless, the way
    // checkWinCondition() does on the 4-player board.
    let extraTurn = dice === 6 || captured.length > 0 || reachedHome;
    const standings = finished ? settle() : null;

    if (standings) {
      extraTurn = false;
    } else {
      if (finished) extraTurn = false;
      if (!extraTurn) nextTurn();
    }

    return {
      token: id,
      color,
      from,
      to,
      cells: steps,
      landed,
      captured,
      reachedHome,
      extraTurn,
      finished,
      standings,
      turn: state.turn,
    };
  }

  /** Nobody to play against means the game is decided: last player is placed. */
  function settle() {
    const left = state.seats.filter((c) => !state.winners.includes(c));
    if (left.length > 1) return null;

    if (left.length === 1) state.winners.push(left[0]);
    state.over = true;
    state.dice = null;
    state.pending = false;
    return state.winners.slice();
  }

  function nextTurn() {
    if (state.over) return null;
    const at = state.seats.indexOf(state.turn);

    for (let step = 1; step <= state.seats.length; step++) {
      const next = state.seats[(at + step) % state.seats.length];
      if (!state.winners.includes(next)) {
        state.turn = next;
        return next;
      }
    }

    state.over = true;
    return null;
  }

  /** The roll was unplayable - nothing to spend, so the turn simply passes. */
  function pass() {
    if (state.over) return null;
    state.dice = null;
    state.pending = false;
    return nextTurn();
  }

  function reset() {
    Object.keys(positions).forEach((id) => {
      positions[id] = YARD;
    });
    state.turn = state.seats[0];
    state.dice = null;
    state.pending = false;
    state.winners.length = 0;
    state.over = false;
    state.seats.forEach((c) => {
      state.sixStreak[c] = 0;
    });
  }

  return {
    state,
    track,
    cellOf,
    colorOf,
    isSafe,
    isShared,
    movesFor,
    tokensOn,
    pathOf,
    name,
    roll,
    move,
    pass,
    nextTurn,
    reset,
  };
}
