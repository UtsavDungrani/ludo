const COLORS = ["red", "green", "yellow", "blue"];

const TOKENS = {
  red: ["token-red-1", "token-red-2", "token-red-3", "token-red-4"],
  green: ["token-green-1", "token-green-2", "token-green-3", "token-green-4"],
  yellow: [
    "token-yellow-1",
    "token-yellow-2",
    "token-yellow-3",
    "token-yellow-4",
  ],
  blue: ["token-blue-1", "token-blue-2", "token-blue-3", "token-blue-4"],
};

const PATHS = {
  red: [
    "c1",
    "c2",
    "c3",
    "c4",
    "c5",
    "c6",
    "c7",
    "c8",
    "c9",
    "c10",
    "c11",
    "c12",
    "c13",
    "c14",
    "c15",
    "c16",
    "c17",
    "c18",
    "c19",
    "c20",
    "c21",
    "c22",
    "c23",
    "c24",
    "c25",
    "c26",
    "c27",
    "c28",
    "c29",
    "c30",
    "c31",
    "c32",
    "c33",
    "c34",
    "c35",
    "c36",
    "c37",
    "c38",
    "c39",
    "c40",
    "c41",
    "c42",
    "c43",
    "c44",
    "c45",
    "c46",
    "c47",
    "c48",
    "c49",
    "c50",
    "c51",
    "rc1",
    "rc2",
    "rc3",
    "rc4",
    "rc5",
    "red_home",
  ],
  green: [
    "c14",
    "c15",
    "c16",
    "c17",
    "c18",
    "c19",
    "c20",
    "c21",
    "c22",
    "c23",
    "c24",
    "c25",
    "c26",
    "c27",
    "c28",
    "c29",
    "c30",
    "c31",
    "c32",
    "c33",
    "c34",
    "c35",
    "c36",
    "c37",
    "c38",
    "c39",
    "c40",
    "c41",
    "c42",
    "c43",
    "c44",
    "c45",
    "c46",
    "c47",
    "c48",
    "c49",
    "c50",
    "c51",
    "c52",
    "c1",
    "c2",
    "c3",
    "c4",
    "c5",
    "c6",
    "c7",
    "c8",
    "c9",
    "c10",
    "c11",
    "c12",
    "gc1",
    "gc2",
    "gc3",
    "gc4",
    "gc5",
    "green_home",
  ],
  yellow: [
    "c27",
    "c28",
    "c29",
    "c30",
    "c31",
    "c32",
    "c33",
    "c34",
    "c35",
    "c36",
    "c37",
    "c38",
    "c39",
    "c40",
    "c41",
    "c42",
    "c43",
    "c44",
    "c45",
    "c46",
    "c47",
    "c48",
    "c49",
    "c50",
    "c51",
    "c52",
    "c1",
    "c2",
    "c3",
    "c4",
    "c5",
    "c6",
    "c7",
    "c8",
    "c9",
    "c10",
    "c11",
    "c12",
    "c13",
    "c14",
    "c15",
    "c16",
    "c17",
    "c18",
    "c19",
    "c20",
    "c21",
    "c22",
    "c23",
    "c24",
    "c25",
    "yc1",
    "yc2",
    "yc3",
    "yc4",
    "yc5",
    "yellow_home",
  ],
  blue: [
    "c40",
    "c41",
    "c42",
    "c43",
    "c44",
    "c45",
    "c46",
    "c47",
    "c48",
    "c49",
    "c50",
    "c51",
    "c52",
    "c1",
    "c2",
    "c3",
    "c4",
    "c5",
    "c6",
    "c7",
    "c8",
    "c9",
    "c10",
    "c11",
    "c12",
    "c13",
    "c14",
    "c15",
    "c16",
    "c17",
    "c18",
    "c19",
    "c20",
    "c21",
    "c22",
    "c23",
    "c24",
    "c25",
    "c26",
    "c27",
    "c28",
    "c29",
    "c30",
    "c31",
    "c32",
    "c33",
    "c34",
    "c35",
    "c36",
    "c37",
    "c38",
    "bc1",
    "bc2",
    "bc3",
    "bc4",
    "bc5",
    "blue_home",
  ],
};

const SAFE_CELLS = ["c1", "c14", "c27", "c40", "c9", "c22", "c35", "c48"];

const PLAYER_NAMES = JSON.parse(localStorage.getItem("playerNames") || "{}");
const ACTIVE_COLORS = Object.keys(PLAYER_NAMES);
const PLAYABLE_COLORS = ACTIVE_COLORS.length > 0 ? ACTIVE_COLORS : COLORS;

const TOKEN_POSITIONS = {
  red: {},
  green: {},
  yellow: {},
  blue: {},
};

const SIX_STREAK_BY_COLOR = {
  red: 0,
  green: 0,
  yellow: 0,
  blue: 0,
};

const gameState = {
  currentTurn: PLAYABLE_COLORS[0],
  lastDiceValue: null,
  lastDiceRotation: "rotateX(0deg) rotateY(0deg)",
  // Grows by one on every roll so each roll gets a larger absolute rotation
  // than the last. That guarantees a transform delta even when the same number
  // comes up twice, so the tumble animation always plays.
  diceSpinTurns: 0,
  sixStreakByColor: SIX_STREAK_BY_COLOR,
  gameWinners: [],
};

function getPlayerName(color) {
  return (
    PLAYER_NAMES[color] ||
    `Player ${color.charAt(0).toUpperCase() + color.slice(1)}`
  );
}

function initializeTokenPositions() {
  COLORS.forEach((color) => {
    TOKENS[color].forEach((tokenId) => {
      TOKEN_POSITIONS[color][tokenId] = -1;
    });
  });
}

function resetTokenPositions() {
  COLORS.forEach((color) => {
    TOKENS[color].forEach((tokenId) => {
      TOKEN_POSITIONS[color][tokenId] = -1;
    });
  });
}

function resetGameState() {
  resetTokenPositions();
  gameState.currentTurn = PLAYABLE_COLORS[0];
  gameState.lastDiceValue = null;
  gameState.lastDiceRotation = "rotateX(0deg) rotateY(0deg)";
  gameState.diceSpinTurns = 0;
  COLORS.forEach((color) => {
    gameState.sixStreakByColor[color] = 0;
  });
  gameState.gameWinners.length = 0;
}

initializeTokenPositions();

export {
  ACTIVE_COLORS,
  COLORS,
  PATHS,
  PLAYABLE_COLORS,
  PLAYER_NAMES,
  SAFE_CELLS,
  TOKEN_POSITIONS,
  TOKENS,
  gameState,
  getPlayerName,
  initializeTokenPositions,
  resetGameState,
  resetTokenPositions,
};
