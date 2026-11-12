import {
  COLORS,
  PLAYABLE_COLORS,
  PLAYER_COLORS,
  PLAYER_NAMES,
  SAFE_CELLS,
  gameState,
  getNextActivePlayer,
  getPlayerName,
} from "./game-state.js";

const diceButton = document.getElementById("rollButton");
const diceContainer = document.getElementById("dice_con");
const diceFace = document.getElementById("dice");

function setAllDiceFaces(rotation) {
  if (diceFace) {
    diceFace.style.transform = rotation;
  }
}

function getYardSlot(tokenId) {
  const index = Number.parseInt(String(tokenId).split("-")[2], 10);

  if (!Number.isInteger(index) || index < 1) {
    return null;
  }

  const zeroBased = index - 1;

  return {
    row: Math.floor(zeroBased / 2) + 1,
    column: (zeroBased % 2) + 1,
  };
}

// Tokens waiting in the yard must keep a fixed slot. Without this the CSS grid
// reflows the remaining tokens after one leaves, so the gap always shows up in
// the last slot and it looks like tokens leave home in a fixed order instead of
// the one the player clicked.
function applyYardSlot(tokenId) {
  const token = document.getElementById(tokenId);
  const slot = getYardSlot(tokenId);

  if (!token || !slot) {
    return;
  }

  token.style.gridRowStart = String(slot.row);
  token.style.gridColumnStart = String(slot.column);
}

function clearYardSlot(tokenId) {
  const token = document.getElementById(tokenId);

  if (!token) {
    return;
  }

  token.style.gridRowStart = "";
  token.style.gridColumnStart = "";
}

function moveToken(tokenId, cellId) {
  const token = document.getElementById(tokenId);
  const cell = document.getElementById(cellId);

  if (token && cell) {
    token.parentNode.removeChild(token);
    cell.appendChild(token);
    clearYardSlot(tokenId);
    token.style.margin = "0";
    updateCellClasses();
  }
}

// The turn banner wears the current player's colour, the same way the
// 5-player board does, so whose turn it is reads at a glance.
function updateCurrentPlayerBanner() {
  const banner = document.getElementById("currentPlayer");

  if (!banner) {
    return;
  }

  const color = gameState.currentTurn;
  banner.textContent = `${getPlayerName(color)}'s turn`;

  const swatch = PLAYER_COLORS[color];
  if (swatch) {
    banner.style.background = swatch;
    // White on yellow is unreadable, so that one gets dark text.
    banner.style.color = color === "yellow" ? "#111827" : "#ffffff";
  }
}

function setBannerResult(text) {
  const banner = document.getElementById("currentPlayer");

  if (!banner) {
    return;
  }

  banner.textContent = text;
  banner.style.background = "#111827";
  banner.style.color = "#ffffff";
}

function hideCurrentDice() {
  if (diceContainer) {
    diceContainer.classList.add("hidden");
  }

  if (diceButton) {
    diceButton.disabled = true;
  }
}

function showNextDice() {
  if (PLAYABLE_COLORS.length === 0 || gameState.gameOver) {
    hideCurrentDice();
    return;
  }

  // The old loop could fall out still pointing at a finished player, which left
  // the dice disabled with nobody able to roll.
  const nextTurn = getNextActivePlayer(gameState.currentTurn);

  if (!nextTurn) {
    hideCurrentDice();
    return;
  }

  gameState.currentTurn = nextTurn;

  if (diceContainer) {
    diceContainer.classList.remove("hidden");
  }

  setAllDiceFaces(gameState.lastDiceRotation);

  updateCurrentPlayerBanner();

  resetDiceButtons();
}

function resetDiceButtons() {
  if (diceButton) {
    diceButton.disabled =
      gameState.gameOver ||
      gameState.gameWinners.includes(gameState.currentTurn);
  }
}

function showTemporaryMessage(message) {
  let messageContainer = document.getElementById("temporary-message");

  if (!messageContainer) {
    messageContainer = document.createElement("div");
    messageContainer.id = "temporary-message";
    messageContainer.style.position = "fixed";
    messageContainer.style.top = "24px";
    messageContainer.style.left = "50%";
    messageContainer.style.transform = "translateX(-50%)";
    messageContainer.style.zIndex = "1000";
    messageContainer.style.background = "rgba(17, 24, 39, 0.92)";
    messageContainer.style.color = "#fff";
    messageContainer.style.padding = "12px 16px";
    messageContainer.style.borderRadius = "12px";
    messageContainer.style.whiteSpace = "pre-line";
    messageContainer.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.25)";
    document.body.appendChild(messageContainer);
  }

  messageContainer.textContent = message;
  clearTimeout(messageContainer._hideTimer);
  messageContainer._hideTimer = setTimeout(() => {
    messageContainer.remove();
  }, 2500);
}

function setYardSlotsVisible(color, visible) {
  const homeElement = document.getElementById(`${color}-h`);

  if (!homeElement) {
    return;
  }

  homeElement.querySelectorAll(".token-slot").forEach((slot) => {
    slot.style.display = visible ? "" : "none";
  });
}

// The result image fills the yard, so anything still parked there has to go or
// it sits on top of the picture. Tokens out on the board are left alone.
function clearYardForResultImage(color) {
  const homeElement = document.getElementById(`${color}-h`);

  if (!homeElement) {
    return;
  }

  setYardSlotsVisible(color, false);
  homeElement.querySelectorAll(".token").forEach((token) => {
    token.style.display = "none";
  });
}

// Puts a yard back to a playable state after a result image was shown.
function clearResultImage(color) {
  const homeElement = document.getElementById(`${color}-h`);

  if (!homeElement) {
    return;
  }

  homeElement.style.backgroundImage = "";
  homeElement.style.backgroundSize = "";
  homeElement.style.backgroundPosition = "";
}

function displayWinnerImage(color, position) {
  const homeElement = document.getElementById(`${color}-h`);
  if (homeElement) {
    clearYardForResultImage(color);
    homeElement.style.backgroundImage = `url('../img/win${position}.jpg')`;
    homeElement.style.backgroundSize = "cover";
    homeElement.style.backgroundPosition = "center";
  }
}

function displayLoserImage(color) {
  const homeElement = document.getElementById(`${color}-h`);
  if (homeElement) {
    clearYardForResultImage(color);
    homeElement.style.backgroundImage = "url('../img/looser.jpg')";
    homeElement.style.backgroundSize = "cover";
    homeElement.style.backgroundPosition = "center";
  }
}

function hideDice(color) {
  if (diceContainer) {
    diceContainer.classList.add("hidden");
  }
  if (diceButton) {
    diceButton.disabled = true;
  }
}

function updateCellClasses() {
  const cells = document.querySelectorAll(".cell");

  cells.forEach((cell) => {
    const tokens = cell.querySelectorAll(".token");

    if (tokens.length === 0) {
      cell.classList.remove("multiple-tokens");
      return;
    }

    const count = tokens.length;
    const gridSize = Math.ceil(Math.sqrt(count));
    const step = 100 / (gridSize + 1);
    const scale = count === 1 ? 0.84 : Math.min(0.55, 0.9 / gridSize);

    if (count > 1) {
      cell.classList.add("multiple-tokens");
    } else {
      cell.classList.remove("multiple-tokens");
    }

    tokens.forEach((token, index) => {
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      const x = (col + 1) * step;
      const y = (row + 1) * step;

      token.style.position = "absolute";
      token.style.left = `${x}%`;
      token.style.top = `${y}%`;
      token.style.margin = "0";
      token.style.transformOrigin = "center";
      token.style.transform = `translate(-50%, -50%) scale(${scale})`;
    });
  });

  positionHomeTriangleTokens();
}

// Finished tokens park inside the colour's centre triangle. Positions are in
// the triangle's own space, where the clip-path puts the apex at (50%, 0) and
// the base along the bottom: one token just under the apex, the other three in
// a row parallel to the base. Each triangle is rotated by CSS, so the same
// numbers work for every colour.
const HOME_TOKEN_SLOTS = [
  { left: 50, top: 30 },
  { left: 27, top: 72 },
  { left: 50, top: 72 },
  { left: 73, top: 72 },
];

const HOME_TOKEN_SCALE = 0.45;

// Undoes each triangle's CSS rotation so the star on the token stays upright.
const HOME_TRIANGLE_ROTATION = {
  red: 90,
  green: 180,
  yellow: 270,
  blue: 0,
};

function positionHomeTriangleTokens() {
  COLORS.forEach((color) => {
    const triangle = document.getElementById(`${color}_home`);

    if (!triangle) {
      return;
    }

    const tokens = Array.from(triangle.querySelectorAll(".token"));
    const counterRotation = -(HOME_TRIANGLE_ROTATION[color] || 0);

    tokens.forEach((token, index) => {
      const slot =
        HOME_TOKEN_SLOTS[Math.min(index, HOME_TOKEN_SLOTS.length - 1)];

      token.style.position = "absolute";
      token.style.left = `${slot.left}%`;
      token.style.top = `${slot.top}%`;
      token.style.margin = "0";
      token.style.gridRowStart = "";
      token.style.gridColumnStart = "";
      token.style.transformOrigin = "center";
      token.style.transform = `translate(-50%, -50%) rotate(${counterRotation}deg) scale(${HOME_TOKEN_SCALE})`;
    });
  });
}

function isSafeCell(cellId) {
  return SAFE_CELLS.includes(cellId);
}

window.addEventListener("resize", () => {
  const tokens = document.querySelectorAll(".token");
  tokens.forEach((token) => {
    if (token.parentElement && token.parentElement.id.endsWith("-h")) {
      token.style.margin = window.innerWidth < 768 ? "15px" : "19px";
    }
  });
});

export {
  applyYardSlot,
  clearResultImage,
  clearYardSlot,
  diceButton,
  diceContainer,
  diceFace,
  displayLoserImage,
  displayWinnerImage,
  hideCurrentDice,
  getYardSlot,
  hideDice,
  isSafeCell,
  moveToken,
  positionHomeTriangleTokens,
  resetDiceButtons,
  setAllDiceFaces,
  setBannerResult,
  setYardSlotsVisible,
  showNextDice,
  showTemporaryMessage,
  updateCellClasses,
  updateCurrentPlayerBanner,
};
