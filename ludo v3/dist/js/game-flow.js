import {
  COLORS,
  PLAYABLE_COLORS,
  TOKENS,
  gameState,
  getNextActivePlayer,
  getPlayerName,
  getUnfinishedPlayers,
  resetGameState,
} from "./game-state.js";
import {
  applyYardSlot,
  clearResultImage,
  displayLoserImage,
  displayWinnerImage,
  hideCurrentDice,
  hideDice,
  resetDiceButtons,
  setAllDiceFaces,
  setBannerResult,
  setYardSlotsVisible,
  showNextDice,
  showTemporaryMessage,
  updateCellClasses,
  updateCurrentPlayerBanner,
} from "./game-ui.js";

function handleNextTurn(diceValue, capturedToken, reachedHome) {
  setTimeout(() => {
    if (diceValue === 6 || capturedToken || reachedHome) {
      let message = "";
      if (diceValue === 6) message = "You rolled a 6!";
      else if (capturedToken) message = "You captured a token!";
      else if (reachedHome) message = "Your token reached home!";
      showTemporaryMessage(`${message} You get another turn.`);
      resetDiceButtons();
    } else {
      hideCurrentDice();
      showNextDice();
    }
  }, 100);
}

function finishGame() {
  gameState.gameOver = true;
  hideDice();

  const [winner] = gameState.gameWinners;
  if (winner) {
    setBannerResult(`${getPlayerName(winner)} wins!`);
  }
}

// Podium image for everyone except the player left in last place, who gets the
// loser image. Only win1..win3 exist, and with at most four players the last
// place is always the one without a podium image, so no position can exceed 3.
function applyFinalStandings() {
  const lastIndex = gameState.gameWinners.length - 1;

  gameState.gameWinners.forEach((winnerColor, index) => {
    if (index === lastIndex && gameState.gameWinners.length > 1) {
      displayLoserImage(winnerColor);
    } else {
      displayWinnerImage(winnerColor, index + 1);
    }
  });
}

function announceFinalStandings() {
  if (PLAYABLE_COLORS.length === 2) {
    const [winner, loser] = gameState.gameWinners;
    showTemporaryMessage(
      `Game Over!\n${getPlayerName(winner)} wins!\n${getPlayerName(loser)} loses!`,
    );
    return;
  }

  showTemporaryMessage(
    `Game Over!\n${gameState.gameWinners
      .map((winnerColor, index) => `${index + 1}. ${getPlayerName(winnerColor)}`)
      .join("\n")}`,
  );
}

function checkWinCondition(color) {
  // A stale move callback can land after the game is decided; without these
  // guards the colour gets pushed into gameWinners twice.
  if (gameState.gameOver || gameState.gameWinners.includes(color)) {
    return true;
  }

  const tokensInHome = TOKENS[color].filter((tokenId) => {
    const token = document.getElementById(tokenId);
    return token && token.parentElement.id === `${color}_home`;
  }).length;

  if (tokensInHome !== TOKENS[color].length) {
    return false;
  }

  gameState.gameWinners.push(color);
  const position = gameState.gameWinners.length;
  const stillPlaying = getUnfinishedPlayers();

  // One player left means the game is decided: they take last place.
  if (stillPlaying.length <= 1) {
    if (stillPlaying.length === 1) {
      gameState.gameWinners.push(stillPlaying[0]);
    }

    announceFinalStandings();
    applyFinalStandings();
    finishGame();
    return true;
  }

  showTemporaryMessage(
    `${getPlayerName(color)} finished in position ${position}!`,
  );
  displayWinnerImage(color, position);

  const nextPlayer = getNextActivePlayer(gameState.currentTurn);

  if (!nextPlayer) {
    finishGame();
    return true;
  }

  gameState.currentTurn = nextPlayer;
  updateCurrentPlayerBanner();

  const sharedDiceContainer = document.getElementById("dice_con");
  if (sharedDiceContainer) {
    sharedDiceContainer.classList.remove("hidden");
  }

  setAllDiceFaces(gameState.lastDiceRotation);
  resetDiceButtons();

  return true;
}

function setupInitialGameState() {
  resetGameState();

  COLORS.forEach((color) => {
    clearResultImage(color);
    const playerNameElement = document.getElementById(`player-${color}`);

    if (PLAYABLE_COLORS.includes(color)) {
      if (playerNameElement) {
        playerNameElement.textContent = getPlayerName(color);
        playerNameElement.style.display = "block";
      }

      setYardSlotsVisible(color, true);

      TOKENS[color].forEach((tokenId) => {
        const token = document.getElementById(tokenId);
        if (token) {
          token.style.display = "block";
          applyYardSlot(tokenId);
        }
      });
    } else {
      if (playerNameElement) {
        playerNameElement.style.display = "none";
      }

      setYardSlotsVisible(color, false);

      TOKENS[color].forEach((tokenId) => {
        const token = document.getElementById(tokenId);
        if (token) {
          token.style.display = "none";
        }
      });
    }
  });

  gameState.currentTurn = PLAYABLE_COLORS[0];

  updateCurrentPlayerBanner();

  const firstPlayerDiceContainer = document.getElementById("dice_con");
  if (firstPlayerDiceContainer) {
    firstPlayerDiceContainer.classList.remove("hidden");
  }

  setAllDiceFaces(gameState.lastDiceRotation);
  resetDiceButtons();
  updateCellClasses();
}

export { checkWinCondition, handleNextTurn, setupInitialGameState };
