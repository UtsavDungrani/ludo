import { PLAYABLE_COLORS, gameState } from "./game-state.js";
import {
  checkCollision,
  placeTokenDirect as placeTokenDirectInternal,
  resetAllTokensToHome,
  rollDice,
} from "./game-movement.js";
import {
  diceButton,
  diceFace,
  resetDiceButtons,
  updateCellClasses,
} from "./game-ui.js";

function setDebugMode(enabled, persist = true) {
  if (persist) {
    localStorage.setItem("ludo-debug-enabled", enabled ? "1" : "0");
  }

  const marker = document.getElementById("ludo-debug-marker");
  if (marker) {
    marker.remove();
  }

  if (enabled) {
    const debugMarker = document.createElement("div");
    debugMarker.id = "ludo-debug-marker";
    debugMarker.textContent = "Ludo Debug";
    debugMarker.style.position = "fixed";
    debugMarker.style.bottom = "12px";
    debugMarker.style.right = "12px";
    debugMarker.style.zIndex = "1000";
    debugMarker.style.padding = "8px 12px";
    debugMarker.style.borderRadius = "9999px";
    debugMarker.style.background = "#111827";
    debugMarker.style.color = "#fff";
    debugMarker.style.fontSize = "12px";
    document.body.appendChild(debugMarker);
  }
}

function setupDebugTools() {
  const storedEnabled = localStorage.getItem("ludo-debug-enabled") === "1";
  const debugParam = new URLSearchParams(window.location.search).get("debug");

  let queryEnabled = null;
  if (debugParam !== null) {
    const normalized = debugParam.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      queryEnabled = true;
    } else if (["0", "false", "no", "off"].includes(normalized)) {
      queryEnabled = false;
    }
  }

  window.LudoDebug = {
    help() {
      console.log("LudoDebug methods:", Object.keys(window.LudoDebug));
      console.log(
        "LudoDebug.dice methods:",
        Object.keys(window.LudoDebug.dice),
      );
    },
    toggle(enabled = localStorage.getItem("ludo-debug-enabled") !== "1") {
      setDebugMode(enabled, true);
    },
    status() {
      return {
        currentTurn: gameState.currentTurn,
        winners: [...gameState.gameWinners],
        playableColors: [...PLAYABLE_COLORS],
        sixStreakByColor: { ...gameState.sixStreakByColor },
        dice: {
          lastValue: gameState.lastDiceValue,
          lastRotation: gameState.lastDiceRotation,
        },
      };
    },
    reset() {
      resetAllTokensToHome();
      updateCellClasses();
      resetDiceButtons();
    },
    placeTokenDirect(tokenId, colorOrCell, maybeCell) {
      const cellId = typeof maybeCell === "string" ? maybeCell : colorOrCell;

      if (typeof tokenId !== "string" || typeof cellId !== "string") {
        return {
          ok: false,
          reason:
            "Usage: LudoDebug.placeTokenDirect(\"token-red-1\", \"c9\") or LudoDebug.placeTokenDirect(\"token-red-1\", \"red\", \"c9\")",
        };
      }

      const token = document.getElementById(tokenId);
      const cell = document.getElementById(cellId);
      if (!token) {
        return { ok: false, reason: `Token not found: ${tokenId}` };
      }
      if (!cell) {
        return { ok: false, reason: `Cell not found: ${cellId}` };
      }

      placeTokenDirectInternal(tokenId, cellId);
      updateCellClasses();

      return {
        ok: true,
        tokenId,
        cellId,
        parentId: token.parentElement ? token.parentElement.id : null,
      };
    },
    collision: checkCollision,
    dice: {
      _autoSelectPendingToken() {
        const selectableToken = document.querySelector(".token.selectable");
        if (selectableToken && typeof selectableToken.onclick === "function") {
          selectableToken.click();
          return true;
        }
        return false;
      },
      state() {
        return {
          currentTurn: gameState.currentTurn,
          buttonDisabled: Boolean(diceButton && diceButton.disabled),
          sixStreakForCurrentTurn:
            gameState.sixStreakByColor[gameState.currentTurn],
          lastValue: gameState.lastDiceValue,
          lastRotation: gameState.lastDiceRotation,
        };
      },
      roll() {
        if (!diceButton || !diceFace) {
          return { ok: false, reason: "Dice UI not found." };
        }
        if (diceButton.disabled) {
          if (window.LudoDebug.dice._autoSelectPendingToken()) {
            return {
              ok: false,
              reason:
                "Token selection was pending. Auto-selected first token. Wait for movement, then roll again.",
            };
          }
          return { ok: false, reason: "Roll is disabled for current turn." };
        }

        rollDice(diceFace, diceButton);
        return { ok: true };
      },
      rollTo(value) {
        if (!diceButton || !diceFace) {
          return { ok: false, reason: "Dice UI not found." };
        }
        if (diceButton.disabled) {
          if (window.LudoDebug.dice._autoSelectPendingToken()) {
            return {
              ok: false,
              reason:
                "Token selection was pending. Auto-selected first token. Wait for movement, then run rollTo again.",
            };
          }
          return { ok: false, reason: "Roll is disabled for current turn." };
        }
        if (!Number.isInteger(value) || value < 1 || value > 6) {
          return {
            ok: false,
            reason: "Value must be an integer between 1 and 6.",
          };
        }

        rollDice(diceFace, diceButton, value);
        return { ok: true, forcedValue: value };
      },
      async rollSeries(values, delayMs = 1700) {
        if (!Array.isArray(values) || values.length === 0) {
          return { ok: false, reason: "Provide an array of dice values." };
        }

        for (const value of values) {
          const result = window.LudoDebug.dice.rollTo(value);

          if (!result.ok) {
            if (result.reason.includes("Token selection was pending")) {
              await new Promise((resolve) => setTimeout(resolve, delayMs));
              const retry = window.LudoDebug.dice.rollTo(value);
              if (!retry.ok) {
                return {
                  ok: false,
                  reason: retry.reason,
                  failedValue: value,
                };
              }
            } else {
              return {
                ok: false,
                reason: result.reason,
                failedValue: value,
              };
            }
          }

          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        return { ok: true, values: [...values] };
      },
    },
    scenarios: {
      overlap2() {
        resetAllTokensToHome();
        placeTokenDirectInternal("token-red-1", "c9");
        placeTokenDirectInternal("token-red-2", "c9");
        updateCellClasses();
        return { scenario: "overlap2", cell: "c9" };
      },
      overlap4() {
        resetAllTokensToHome();
        placeTokenDirectInternal("token-red-1", "c22");
        placeTokenDirectInternal("token-green-1", "c22");
        placeTokenDirectInternal("token-yellow-1", "c22");
        placeTokenDirectInternal("token-blue-1", "c22");
        updateCellClasses();
        return { scenario: "overlap4", cell: "c22" };
      },
      captureTest() {
        resetAllTokensToHome();
        placeTokenDirectInternal("token-red-1", "c20");
        placeTokenDirectInternal("token-red-2", "c20");
        placeTokenDirectInternal("token-blue-1", "c20");
        const result = checkCollision("token-red-1", "red", "c20");
        updateCellClasses();
        return { scenario: "captureTest", cell: "c20", captured: result };
      },
      safeCellTest() {
        resetAllTokensToHome();
        placeTokenDirectInternal("token-red-1", "c9");
        placeTokenDirectInternal("token-blue-1", "c9");
        const result = checkCollision("token-red-1", "red", "c9");
        updateCellClasses();
        return {
          scenario: "safeCellTest",
          cell: "c9",
          safeCell: true,
          captured: result,
        };
      },
    },
  };

  const shouldEnable = queryEnabled ?? storedEnabled;
  if (shouldEnable) {
    // Query-string activation is session-only unless user toggles explicitly.
    setDebugMode(true, queryEnabled === null);
    console.info("Ludo debug mode enabled. Run LudoDebug.help() for commands.");
    window.LudoDebug.help();
  } else if (queryEnabled === false) {
    setDebugMode(false, false);
    console.info("Ludo debug mode disabled via ?debug=0");
  }
}

export { setupDebugTools };
