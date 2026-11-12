/* boardn-game.js
 * ---------------------------------------------------------------------------
 * The page controller for a polygonal board: draws it, runs a game on it, and
 * keeps the two in step. game5.html and game6.html both load this file; the
 * only difference between them is the seat count they declare.
 *
 * It is the counterpart of script.js + game-ui.js for the 4-player board, but
 * the split is different. There the DOM is the state; here boardn-engine.js
 * holds the state and this file only ever reflects it, so every redraw is
 * "ask the engine where things are, put them there".
 * ---------------------------------------------------------------------------
 */

import { boardConfig, SEAT_COUNTS } from "./boardn-geometry.js";
import {
  renderFrame,
  renderSkeleton,
  renderTrack,
  renderTokens,
  placeTokens,
  trackPoints,
  yardPoints,
} from "./boardn-render.js";
import { createGame } from "./boardn-engine.js";
import { setupDebugN } from "./boardn-debug.js";

const STEP_MS = 170; // one cell of travel
const BEAT_MS = 420; // pause after a move before the turn moves on

const svg = document.getElementById("board");
const banner = document.getElementById("currentPlayer");
const diceFace = document.getElementById("dice");
const rollButton = document.getElementById("rollButton");
const standingsBox = document.getElementById("standings");

/* How many sides the board has. The page says so with data-players on <body>,
   and ?n= overrides it, so one file can be opened as any of the boards - which
   is how boardn.html links to the counts that have no page of their own. The
   fallback is 5 rather than SEAT_COUNTS[0], so a page that declares nothing
   keeps the board it has always drawn. */
function seatCount() {
  const fromQuery = Number(new URLSearchParams(location.search).get("n"));
  const fromPage = Number(document.body.dataset.players);
  const want = SEAT_COUNTS.includes(fromQuery)
    ? fromQuery
    : SEAT_COUNTS.includes(fromPage)
      ? fromPage
      : 5;
  return want;
}

const cfg = boardConfig(seatCount());
const roster = cfg.players;

/* Seats come from the setup page; with nothing stored, every side plays. */
const storedNames = JSON.parse(localStorage.getItem("playerNames") || "{}");
const known = roster.map((p) => p.id);
const seated = known.filter((c) => storedNames[c]);
const seats = seated.length >= 2 ? seated : known;

const game = createGame({ cfg, colors: seats, names: storedNames });
const colorOf = (id) => roster.find((p) => p.id === id);

let cache = {};
let busy = false;

/* --- drawing -------------------------------------------------------------- */

function drawBoard() {
  renderFrame(svg, cfg);
  renderSkeleton(svg, cfg);
  renderTrack(svg, cfg);
  renderTokens(svg, cfg);
  cache = { points: trackPoints(cfg), yard: yardPoints(cfg) };

  roster.forEach((p) => {
    const plate = svg.querySelector(`[data-label="${p.id}"]`);
    if (plate) {
      const label = plate.querySelector("text");
      if (label) label.textContent = game.name(p.id);
      plate.setAttribute("opacity", seats.includes(p.id) ? 1 : 0.28);
    }

    const sitting = seats.includes(p.id);
    for (let n = 1; n <= 4; n++) {
      const node = document.getElementById(`token-${p.id}-${n}`);
      if (node) node.style.display = sitting ? "" : "none";
    }
    const yard = svg.querySelector(`[data-yard="${p.id}"]`);
    if (yard && !sitting) yard.setAttribute("opacity", 0.35);

    // An empty seat should not advertise four empty waiting spots.
    const slots = svg.querySelector(`[data-slots="${p.id}"]`);
    if (slots) slots.style.display = sitting ? "" : "none";
  });
}

function refresh() {
  placeTokens(svg, (id) => game.cellOf(id), cfg, cache);
}

function setBanner(text, color) {
  if (!banner) return;
  banner.textContent = text;
  const p = colorOf(color);
  if (p) {
    banner.style.background = p.color;
    banner.style.color = p.id === "yellow" ? "#111827" : "#ffffff";
  }
}

function flash(message) {
  let box = document.getElementById("flash");
  if (!box) {
    box = document.createElement("div");
    box.id = "flash";
    document.body.appendChild(box);
  }
  box.textContent = message;
  box.classList.add("show");
  clearTimeout(box._timer);
  box._timer = setTimeout(() => box.classList.remove("show"), 2400);
}

function showStandings() {
  if (!standingsBox) return;
  const places = game.state.winners;
  if (!places.length) {
    standingsBox.innerHTML = "";
    return;
  }
  standingsBox.innerHTML = places
    .map((c, i) => {
      const p = colorOf(c);
      const last = game.state.over && i === places.length - 1 && places.length > 1;
      return `<li><span class="chip" style="background:${p.color}"></span>${
        last ? "last" : `${i + 1}${["st", "nd", "rd", "th", "th"][i] || "th"}`
      } &middot; ${game.name(c)}</li>`;
    })
    .join("");
}

/* --- the die -------------------------------------------------------------- */

const FACE = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: 180 },
  3: { x: 0, y: 90 },
  4: { x: 0, y: -90 },
  5: { x: 90, y: 0 },
  6: { x: -90, y: 0 },
};

let spins = 0;

// Whole extra turns, so the die still settles on the rolled face while
// visibly tumbling - and a growing count means rolling the same number twice
// still changes the transform, so the animation always plays.
function spinTo(value) {
  spins += 1;
  const base = FACE[value] || FACE[1];
  const extra = 720 * spins;
  if (diceFace) {
    diceFace.style.transform = `rotateX(${base.x + extra}deg) rotateY(${base.y + extra}deg)`;
  }
}

function setRollEnabled(on) {
  if (rollButton) rollButton.disabled = !on || game.state.over;
}

/* --- interaction ---------------------------------------------------------- */

function clearChoices() {
  svg.querySelectorAll(".selectable").forEach((node) => {
    node.classList.remove("selectable");
    node.onclick = null;
  });
}

function offer(moves, dice) {
  clearChoices();
  moves.forEach((id) => {
    const node = document.getElementById(id);
    if (!node) return;
    node.classList.add("selectable");
    node.onclick = () => play(id, dice);
  });
}

function play(id, dice) {
  if (busy) return;
  busy = true;
  clearChoices();

  const result = game.move(id, dice);
  if (!result) {
    busy = false;
    return;
  }

  walk(result, () => {
    refresh();

    if (result.captured.length) {
      const who = result.captured
        .map((t) => game.name(game.colorOf(t)))
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(", ");
      flash(`Captured ${who}!`);
    } else if (result.reachedHome) {
      flash("A token is home!");
    } else if (result.extraTurn) {
      flash("You rolled a 6 - go again.");
    }

    if (result.finished) {
      flash(`${game.name(result.finished.color)} finishes ${result.finished.position}${
        ["st", "nd", "rd", "th", "th"][result.finished.position - 1] || "th"
      }!`);
      showStandings();
    }

    setTimeout(() => {
      busy = false;
      if (result.standings) {
        endGame(result.standings);
      } else {
        startTurn();
      }
    }, BEAT_MS);
  });
}

/** Step the token along its route one cell at a time, then hand back. */
function walk(result, done) {
  const node = document.getElementById(result.token);
  const cells = result.cells;
  let i = 0;

  const tick = () => {
    if (i >= cells.length) {
      done();
      return;
    }
    const at = cache.points.get(cells[i]);
    if (at && node) node.setAttribute("transform", `translate(${at.x} ${at.y})`);
    i += 1;
    setTimeout(tick, STEP_MS);
  };

  tick();
}

function startTurn() {
  if (game.state.over) return;
  setBanner(`${game.name(game.state.turn)}'s turn`, game.state.turn);
  setRollEnabled(true);
}

function endGame(places) {
  setRollEnabled(false);
  showStandings();
  if (banner) {
    banner.textContent = `${game.name(places[0])} wins!`;
    banner.style.background = "#111827";
    banner.style.color = "#ffffff";
  }
  flash(`Game over - ${game.name(places[0])} wins!`);
}

function onRoll(forced) {
  if (busy || game.state.over) return;
  setRollEnabled(false);

  const r = game.roll(forced);
  if (!r) {
    setRollEnabled(true);
    return;
  }

  spinTo(r.value);

  // Let the die land before anything moves.
  setTimeout(() => {
    if (r.moves.length === 0) {
      flash(`${game.name(r.color)} rolled ${r.value} - nothing to move.`);
      game.pass();
      startTurn();
      return;
    }
    if (r.moves.length === 1) {
      play(r.moves[0], r.value);
      return;
    }
    offer(r.moves, r.value);
  }, 1100);
}

/* --- boot ----------------------------------------------------------------- */

drawBoard();
refresh();
showStandings();
startTurn();

if (rollButton) rollButton.addEventListener("click", () => onRoll());

const resetButton = document.getElementById("resetButton");
if (resetButton) {
  resetButton.addEventListener("click", () => {
    clearChoices();
    busy = false;
    game.reset();
    refresh();
    showStandings();
    startTurn();
  });
}

// Debug tools get the live controller, so every command they expose goes
// through the same functions a click does.
const ctx = {
  game,
  svg,
  cfg,
  cache,
  rollButton,
  refresh,
  play,
  roll: onRoll,
  flash,
  showStandings,
  startTurn,
  endGame,
};

window.ludo = ctx;
window.ludo5 = ctx; // the name the 5-player page has always used
setupDebugN(ctx);
