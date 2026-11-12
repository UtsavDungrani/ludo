/* boardn-debug.js
 * ---------------------------------------------------------------------------
 * The polygonal-board counterpart of game-debug.js, for 5 and 6 seats alike.
 *
 * Same contract as the 4-player board: a `window.LudoDebug` console object, the
 * `?debug=1` switch, the "Ludo Debug" pill, and the choice remembered under the
 * same localStorage key - so turning it on once covers both boards.
 *
 * The commands differ where the boards do. There is no placeTokenDirect that
 * reparents a div here; a token is placed by telling the engine where it is and
 * redrawing. Added on top: `labels()`, which writes the cell numbers onto the
 * board, because a 65- or 78-cell ring is hard to read off a screenshot.
 * ---------------------------------------------------------------------------
 */

const STORAGE_KEY = "ludo-debug-enabled";

function setDebugMode(enabled, seats, persist = true) {
  if (persist) {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  }

  const existing = document.getElementById("ludo-debug-marker");
  if (existing) existing.remove();

  if (!enabled) return;

  const pill = document.createElement("div");
  pill.id = "ludo-debug-marker";
  pill.textContent = `Ludo Debug (${seats}p)`;
  Object.assign(pill.style, {
    position: "fixed",
    bottom: "12px",
    right: "12px",
    zIndex: "1000",
    padding: "8px 12px",
    borderRadius: "9999px",
    background: "#111827",
    color: "#fff",
    fontSize: "12px",
  });
  document.body.appendChild(pill);
}

/**
 * `ctx` is the live controller: the engine plus the few functions that drive
 * the page, so debug commands go through exactly the same code a click does.
 */
export function setupDebugN(ctx) {
  const { game, svg, cfg, refresh, play, roll, flash, showStandings, startTurn } = ctx;
  const seats = cfg.players.length;

  const ordinal = (n) => `${n}${["st", "nd", "rd", "th", "th"][n - 1] || "th"}`;
  const lastIndex = (color) => game.pathOf(color).length - 1;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Put a token on a cell without playing a move. */
  function place(token, cell) {
    const color = game.colorOf(token);
    if (!game.state.positions.hasOwnProperty(token)) {
      return { ok: false, reason: `No such token: ${token}` };
    }
    if (cell === null || cell === "yard") {
      game.state.positions[token] = -1;
      refresh();
      return { ok: true, token, cell: "yard" };
    }
    const at = game.pathOf(color).indexOf(cell);
    if (at === -1) {
      return { ok: false, reason: `${cell} is not on ${color}'s route` };
    }
    game.state.positions[token] = at;
    refresh();
    return { ok: true, token, cell, index: at };
  }

  function clearBoard() {
    Object.keys(game.state.positions).forEach((id) => {
      game.state.positions[id] = -1;
    });
    refresh();
  }

  /* Cell numbers drawn over the board - handy when reading a bug report. */
  function labels(on = !document.getElementById("debug-labels")) {
    const existing = document.getElementById("debug-labels");
    if (existing) existing.remove();
    if (!on) return { labels: false };

    const NS = "http://www.w3.org/2000/svg";
    const layer = document.createElementNS(NS, "g");
    layer.id = "debug-labels";
    svg.appendChild(layer);

    ctx.cache.points.forEach((at, id) => {
      const text = document.createElementNS(NS, "text");
      text.setAttribute("x", at.x);
      text.setAttribute("y", at.y);
      text.setAttribute("fill", "#be123c");
      text.setAttribute("font-size", 15);
      text.setAttribute("font-family", "monospace");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "central");
      text.setAttribute("pointer-events", "none");
      text.textContent = id.replace("_home", "*");
      layer.appendChild(text);
    });

    return { labels: true, cells: ctx.cache.points.size };
  }

  const scenarios = {
    /** n tokens of different colours on one cell, to check the fan-out. */
    overlap(n = seats, cell = "c22") {
      clearBoard();
      const placed = [];
      cfg.players.slice(0, n).forEach((p, i) => {
        const r = place(`token-${p.id}-${i + 1}`, cell);
        if (r.ok) placed.push(r.token);
      });
      return { scenario: "overlap", cell, placed };
    },

    /** Red runs onto a lone blue on a plain cell and should send it back. */
    captureTest() {
      clearBoard();
      const cell = game.pathOf("red")[4];
      place("token-blue-1", cell);
      place("token-red-1", game.pathOf("red")[1]);
      game.state.turn = "red";
      startTurn();
      play("token-red-1", 3);
      return { scenario: "captureTest", cell, safe: game.isSafe(cell) };
    },

    /** The same run onto a starred cell, where nothing should happen. */
    safeCellTest() {
      clearBoard();
      const cell = game.pathOf("red")[8];
      place("token-blue-1", cell);
      place("token-red-1", game.pathOf("red")[5]);
      game.state.turn = "red";
      startTurn();
      play("token-red-1", 3);
      return { scenario: "safeCellTest", cell, safe: game.isSafe(cell) };
    },

    /** Two blues are a block and survive; the lone green beside them does not. */
    blockTest() {
      clearBoard();
      const cell = game.pathOf("red")[4];
      place("token-blue-1", cell);
      place("token-blue-2", cell);
      place("token-green-1", cell);
      place("token-red-1", game.pathOf("red")[1]);
      game.state.turn = "red";
      startTurn();
      play("token-red-1", 3);
      return { scenario: "blockTest", cell };
    },

    /** Three tokens home and one on the doorstep: roll a 1 to finish for real. */
    almostWin(color = game.state.turn) {
      const end = lastIndex(color);
      game.state.tokens[color].forEach((id, i) => {
        game.state.positions[id] = i < 3 ? end : end - 1;
      });
      game.state.turn = color;
      refresh();
      startTurn();
      return {
        scenario: "almostWin",
        color,
        next: "LudoDebug.dice.rollTo(1), then click the highlighted token",
      };
    },

    /** Finish `color` now, through the real move so the standings update. */
    win(color = game.state.turn) {
      scenarios.almostWin(color);
      play(`token-${color}-4`, 1);
      return { scenario: "win", color };
    },

    /** Play everyone out, so the whole finishing order lands on screen. */
    async finishAll(delayMs = 900) {
      for (const color of game.state.seats) {
        if (game.state.over || game.state.winners.includes(color)) continue;
        scenarios.win(color);
        await wait(delayMs);
      }
      // Worded the way the panel words it, so the console and the screen agree
      // that the player left behind came last rather than placed.
      const places = game.state.winners;
      return {
        scenario: "finishAll",
        standings: places.map((c, i) =>
          game.state.over && i === places.length - 1 && places.length > 1
            ? `last ${game.name(c)}`
            : `${ordinal(i + 1)} ${game.name(c)}`,
        ),
        over: game.state.over,
      };
    },
  };

  const dice = {
    state() {
      return {
        turn: game.state.turn,
        pendingRoll: game.state.dice,
        buttonDisabled: Boolean(ctx.rollButton && ctx.rollButton.disabled),
        sixStreak: game.state.sixStreak[game.state.turn],
      };
    },
    /** Click the first highlighted token, for when a choice is waiting. */
    pick() {
      const node = document.querySelector("#board .selectable");
      if (!node) return { ok: false, reason: "Nothing is waiting to be chosen." };
      node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      return { ok: true, token: node.id };
    },
    roll() {
      if (game.state.over) return { ok: false, reason: "Game is over." };
      if (dice.pick().ok) {
        return { ok: false, reason: "A choice was pending; picked it. Roll again." };
      }
      roll();
      return { ok: true };
    },
    rollTo(value) {
      if (!Number.isInteger(value) || value < 1 || value > 6) {
        return { ok: false, reason: "Value must be an integer from 1 to 6." };
      }
      if (game.state.over) return { ok: false, reason: "Game is over." };
      if (dice.pick().ok) {
        return { ok: false, reason: "A choice was pending; picked it. Roll again." };
      }
      roll(value);
      return { ok: true, forcedValue: value };
    },
    async rollSeries(values, delayMs = 2200) {
      if (!Array.isArray(values) || !values.length) {
        return { ok: false, reason: "Provide an array of dice values." };
      }
      for (const value of values) {
        let r = dice.rollTo(value);
        if (!r.ok && r.reason.includes("pending")) {
          await wait(delayMs);
          r = dice.rollTo(value);
        }
        if (!r.ok) return { ok: false, reason: r.reason, failedValue: value };
        await wait(delayMs);
      }
      return { ok: true, values: [...values] };
    },
  };

  window.LudoDebug = {
    help() {
      console.log("LudoDebug:", Object.keys(window.LudoDebug).join(", "));
      console.log("LudoDebug.dice:", Object.keys(dice).join(", "));
      console.log("LudoDebug.scenarios:", Object.keys(scenarios).join(", "));
      console.log(
        `Board: ${seats} seats, ${game.track.ringLength} ring cells ` +
          `c1..c${game.track.ringLength}, home columns ` +
          cfg.players.map((p) => `${p.id[0]}c1..${p.id[0]}c5`).join(" / ") +
          ".",
      );
      console.log("Try: LudoDebug.labels(true), LudoDebug.scenarios.captureTest()");
    },
    toggle(enabled = localStorage.getItem(STORAGE_KEY) !== "1") {
      setDebugMode(enabled, seats, true);
      return { debug: enabled };
    },
    status() {
      const onBoard = {};
      Object.entries(game.state.positions).forEach(([id, pos]) => {
        if (pos !== -1) onBoard[id] = game.cellOf(id);
      });
      return {
        turn: game.state.turn,
        seats: [...game.state.seats],
        winners: [...game.state.winners],
        over: game.state.over,
        dice: game.state.dice,
        sixStreak: { ...game.state.sixStreak },
        onBoard,
      };
    },
    reset() {
      game.reset();
      labels(false);
      refresh();
      showStandings();
      startTurn();
      return window.LudoDebug.status();
    },
    place,
    clearBoard,
    labels,
    path(color = game.state.turn) {
      return game.pathOf(color);
    },
    safeCells() {
      return [...game.track.safe].sort(
        (a, b) => Number(a.slice(1)) - Number(b.slice(1)),
      );
    },
    turnTo(color) {
      if (!game.state.seats.includes(color)) {
        return { ok: false, reason: `${color} is not seated` };
      }
      game.state.turn = color;
      startTurn();
      return { ok: true, turn: color };
    },
    flash,
    game,
    cfg,
    dice,
    scenarios,
  };

  const param = new URLSearchParams(window.location.search).get("debug");
  let fromQuery = null;
  if (param !== null) {
    const v = param.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(v)) fromQuery = true;
    else if (["0", "false", "no", "off"].includes(v)) fromQuery = false;
  }

  const stored = localStorage.getItem(STORAGE_KEY) === "1";
  const enable = fromQuery ?? stored;

  if (enable) {
    setDebugMode(true, seats, fromQuery === null);
    console.info(`Ludo debug mode enabled (${seats}-player). Run LudoDebug.help().`);
    window.LudoDebug.help();
  } else if (fromQuery === false) {
    setDebugMode(false, seats, false);
    console.info("Ludo debug mode disabled via ?debug=0");
  }
}
