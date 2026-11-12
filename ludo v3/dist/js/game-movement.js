import {
  PATHS,
  PLAYABLE_COLORS,
  TOKEN_POSITIONS,
  TOKENS,
  gameState,
} from "./game-state.js";
import {
  applyYardSlot,
  clearYardSlot,
  hideCurrentDice,
  moveToken,
  resetDiceButtons,
  setAllDiceFaces,
  showNextDice,
} from "./game-ui.js";
import { checkWinCondition, handleNextTurn } from "./game-flow.js";
import { isSafeCell, updateCellClasses } from "./game-ui.js";

// Base orientation that brings the wanted face to the front.
const DICE_FACE_ROTATIONS = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: 180 },
  3: { x: 0, y: 90 },
  4: { x: 0, y: -90 },
  5: { x: 90, y: 0 },
  6: { x: -90, y: 0 },
};

// Two extra whole turns per roll. Whole turns land on the same face, so the die
// still settles on `value` while visibly tumbling on the way there.
const DICE_SPIN_DEGREES = 720;

function getDiceRotation(value, spinTurns = 0) {
  const base = DICE_FACE_ROTATIONS[value] || DICE_FACE_ROTATIONS[1];
  const spin = DICE_SPIN_DEGREES * spinTurns;

  return `rotateX(${base.x + spin}deg) rotateY(${base.y + spin}deg)`;
}

function rollDice(dice, button, forcedValue) {
  if (gameState.gameOver) {
    button.disabled = true;
    return;
  }

  button.disabled = true;

  const color = gameState.currentTurn;
  const randomValue =
    Number.isInteger(forcedValue) && forcedValue >= 1 && forcedValue <= 6
      ? forcedValue
      : Math.floor(Math.random() * 6) + 1;
  let diceValue = randomValue;

  if (diceValue === 6) {
    gameState.sixStreakByColor[color] += 1;

    if (gameState.sixStreakByColor[color] === 3) {
      diceValue = Math.floor(Math.random() * 5) + 1;
      gameState.sixStreakByColor[color] = 0;
    }
  } else {
    gameState.sixStreakByColor[color] = 0;
  }

  gameState.diceSpinTurns += 1;
  const rotation = getDiceRotation(diceValue, gameState.diceSpinTurns);

  gameState.lastDiceValue = diceValue;
  gameState.lastDiceRotation = rotation;
  setAllDiceFaces(rotation);

  const availableTokens = getAvailableTokens(color, diceValue);

  if (availableTokens.length === 1) {
    handleTokenSelection(availableTokens[0], color, diceValue);
  } else if (availableTokens.length > 1) {
    showTokenSelection(color, diceValue);
  } else {
    setTimeout(() => {
      hideCurrentDice();
      showNextDice();
    }, 1000);
  }
}

function getAvailableTokens(color, diceValue) {
  return TOKENS[color].filter((tokenId) => {
    const currentPos = TOKEN_POSITIONS[color][tokenId];
    return (
      (currentPos === -1 && diceValue === 6) ||
      (currentPos !== -1 && currentPos + diceValue < PATHS[color].length)
    );
  });
}

function showTokenSelection(color, diceValue) {
  const availableTokens = getAvailableTokens(color, diceValue);

  availableTokens.forEach((tokenId) => {
    const token = document.getElementById(tokenId);
    if (token) {
      token.classList.add("selectable");
      token.onclick = () => handleTokenSelection(tokenId, color, diceValue);
    }
  });
}

function handleTokenSelection(tokenId, color, diceValue) {
  const path = PATHS[color];
  const currentPos = TOKEN_POSITIONS[color][tokenId];
  let newPos;

  if (currentPos === -1) {
    if (diceValue === 6) {
      newPos = 0;
    } else {
      alert("You need to roll a 6 to move this token out.");
      return;
    }
  } else {
    newPos = currentPos + diceValue;
  }

  let capturedToken = false;
  let reachedHome = false;

  if (newPos < path.length) {
    moveTokenCellByCell(tokenId, color, currentPos, newPos, 0, (finalPos) => {
      capturedToken = checkCollision(tokenId, color, path[finalPos]);
      reachedHome = path[finalPos] === `${color}_home`;
      const playerWon = checkWinCondition(color);
      if (!playerWon) {
        handleNextTurn(diceValue, capturedToken, reachedHome);
      }
    });
  } else {
    const playerWon = checkWinCondition(color);
    if (!playerWon) {
      handleNextTurn(diceValue, capturedToken, reachedHome);
    }
  }

  Object.values(TOKENS)
    .flat()
    .forEach((id) => {
      const token = document.getElementById(id);
      if (token) {
        token.classList.remove("selectable");
        token.onclick = null;
      }
    });
}

function moveTokenCellByCell(tokenId, color, start, end, current, callback) {
  if (current > end - start) {
    TOKEN_POSITIONS[color][tokenId] = end;
    if (callback) callback(end);
    return;
  }

  const path = PATHS[color];
  const currentCell = path[start + current];
  moveToken(tokenId, currentCell);

  setTimeout(() => {
    moveTokenCellByCell(tokenId, color, start, end, current + 1, callback);
  }, 500);
}

function checkCollision(tokenId, color, cellId) {
  const cell = document.getElementById(cellId);
  const tokens = cell ? Array.from(cell.getElementsByClassName("token")) : [];
  let capturedToken = false;

  if (tokens.length > 1 && !isSafeCell(cellId)) {
    const tokenCounts = tokens.reduce((counts, token) => {
      const tokenColor = token.id.split("-")[1];
      counts[tokenColor] = (counts[tokenColor] || 0) + 1;
      return counts;
    }, {});

    const blockColor = Object.keys(tokenCounts).find(
      (tokenColor) => tokenCounts[tokenColor] > 1,
    );

    if (blockColor) {
      tokens.forEach((token) => {
        const tokenColor = token.id.split("-")[1];
        if (tokenColor !== blockColor && tokenColor !== color) {
          sendTokenHome(token.id);
          capturedToken = true;
        }
      });
    } else {
      tokens.forEach((token) => {
        const tokenColor = token.id.split("-")[1];
        if (tokenColor !== color) {
          sendTokenHome(token.id);
          capturedToken = true;
        }
      });
    }
  }

  return capturedToken;
}

function sendTokenHome(tokenId) {
  const color = tokenId.split("-")[1];
  const token = document.getElementById(tokenId);
  const homeContainer = document.getElementById(`${color}-h`);

  if (!token || !homeContainer) {
    return;
  }

  token.parentNode.removeChild(token);
  homeContainer.appendChild(token);
  applyYardSlot(tokenId);

  token.style.transform = "";
  token.style.margin = "";
  token.style.position = "relative";
  token.style.left = "";
  token.style.top = "";
  token.style.transformOrigin = "";
  token.style.margin = window.innerWidth < 768 ? "15px" : "19px";

  TOKEN_POSITIONS[color][tokenId] = -1;
  updateCellClasses();
}

function getAllTokenIds() {
  return Object.values(TOKENS).flat();
}

function getTokenColor(tokenId) {
  return tokenId.split("-")[1];
}

function placeTokenDirect(tokenId, cellId) {
  const token = document.getElementById(tokenId);
  const cell = document.getElementById(cellId);

  if (token && cell) {
    token.parentNode.removeChild(token);
    cell.appendChild(token);
    clearYardSlot(tokenId);
    token.style.margin = "0";
    TOKEN_POSITIONS[getTokenColor(tokenId)][tokenId] =
      PATHS[getTokenColor(tokenId)].indexOf(cellId);
  }
}

function resetAllTokensToHome() {
  getAllTokenIds().forEach((tokenId) => {
    const color = getTokenColor(tokenId);
    const homeContainer = document.getElementById(`${color}-h`);
    const token = document.getElementById(tokenId);

    if (token && homeContainer) {
      token.parentNode.removeChild(token);
      homeContainer.appendChild(token);
      applyYardSlot(tokenId);
      token.style.transform = "";
      token.style.margin = window.innerWidth < 768 ? "15px" : "19px";
      token.style.position = "relative";
      token.style.left = "";
      token.style.top = "";
      token.style.transformOrigin = "";
      TOKEN_POSITIONS[color][tokenId] = -1;
    }
  });

  updateCellClasses();
}

export {
  checkCollision,
  getAllTokenIds,
  getAvailableTokens,
  getTokenColor,
  handleTokenSelection,
  moveTokenCellByCell,
  placeTokenDirect,
  resetAllTokensToHome,
  rollDice,
  sendTokenHome,
  showTokenSelection,
};
