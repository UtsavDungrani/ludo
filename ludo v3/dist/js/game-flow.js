import {
  COLORS,
  PATHS,
  PLAYABLE_COLORS,
  PLAYER_NAMES,
  TOKEN_POSITIONS,
  TOKENS,
  gameState,
  getPlayerName,
  resetGameState,
} from "./game-state.js";
import {
  applyYardSlot,
  displayLoserImage,
  displayWinnerImage,
  hideCurrentDice,
  hideDice,
  resetDiceButtons,
  setAllDiceFaces,
  showNextDice,
  showTemporaryMessage,
  updateCellClasses,
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

function checkWinCondition(color) {
  const tokensInHome = TOKENS[color].filter((tokenId) => {
    const token = document.getElementById(tokenId);
    return token && token.parentElement.id === `${color}_home`;
  }).length;

  const totalPlayers = PLAYABLE_COLORS.length;

  if (tokensInHome === 4) {
    gameState.gameWinners.push(color);

    if (totalPlayers === 2) {
      const loser = PLAYABLE_COLORS.find(
        (activeColor) => activeColor !== color,
      );
      showTemporaryMessage(
        `Game Over!\n${getPlayerName(color)} wins!\n${getPlayerName(loser)} loses!`,
      );
      displayWinnerImage(color, 1);
      displayLoserImage(loser);

      PLAYABLE_COLORS.forEach((activeColor) => {
        hideDice(activeColor);
      });

      return true;
    }

    if (totalPlayers === 3 || totalPlayers === 4) {
      const winningPosition = gameState.gameWinners.length;
      showTemporaryMessage(
        `${getPlayerName(color)} finished in position ${winningPosition}!`,
      );
      displayWinnerImage(color, winningPosition);

      if (gameState.gameWinners.length === totalPlayers - 1) {
        const lastPlayer = PLAYABLE_COLORS.find(
          (activeColor) => !gameState.gameWinners.includes(activeColor),
        );
        gameState.gameWinners.push(lastPlayer);
        showTemporaryMessage(
          `Game Over!\n${gameState.gameWinners
            .map(
              (winnerColor, index) =>
                `${index + 1}. ${getPlayerName(winnerColor)}`,
            )
            .join("\n")}`,
        );
        gameState.gameWinners.forEach((winnerColor, index) => {
          displayWinnerImage(winnerColor, index + 1);
        });
        displayLoserImage(lastPlayer);

        PLAYABLE_COLORS.forEach((activeColor) => {
          hideDice(activeColor);
        });

        return true;
      }

      let nextPlayerIndex =
        (PLAYABLE_COLORS.indexOf(gameState.currentTurn) + 1) %
        PLAYABLE_COLORS.length;
      while (gameState.gameWinners.includes(PLAYABLE_COLORS[nextPlayerIndex])) {
        nextPlayerIndex = (nextPlayerIndex + 1) % PLAYABLE_COLORS.length;
      }

      gameState.currentTurn = PLAYABLE_COLORS[nextPlayerIndex];
      const currentPlayerElement = document.getElementById("currentPlayer");
      if (currentPlayerElement) {
        currentPlayerElement.textContent = `${getPlayerName(gameState.currentTurn)}'s turn`;
      }

      const sharedDiceContainer = document.getElementById("dice_con");
      if (sharedDiceContainer) {
        sharedDiceContainer.classList.remove("hidden");
      }

      setAllDiceFaces(gameState.lastDiceRotation);
      resetDiceButtons();
    }

    return true;
  }

  return false;
}

function setupInitialGameState() {
  resetGameState();

  COLORS.forEach((color) => {
    const playerNameElement = document.getElementById(`player-${color}`);

    if (PLAYABLE_COLORS.includes(color)) {
      if (playerNameElement) {
        playerNameElement.textContent = getPlayerName(color);
        playerNameElement.style.display = "block";
      }

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

      TOKENS[color].forEach((tokenId) => {
        const token = document.getElementById(tokenId);
        if (token) {
          token.style.display = "none";
        }
      });
    }
  });

  gameState.currentTurn = PLAYABLE_COLORS[0];

  const currentPlayerElement = document.getElementById("currentPlayer");
  if (currentPlayerElement) {
    currentPlayerElement.textContent = `${getPlayerName(gameState.currentTurn)}'s turn`;
  }

  const firstPlayerDiceContainer = document.getElementById("dice_con");
  if (firstPlayerDiceContainer) {
    firstPlayerDiceContainer.classList.remove("hidden");
  }

  setAllDiceFaces(gameState.lastDiceRotation);
  resetDiceButtons();
  updateCellClasses();
}

export { checkWinCondition, handleNextTurn, setupInitialGameState };
