import { diceButton, diceFace } from "./js/game-ui.js";
import { setupDebugTools } from "./js/game-debug.js";
import { rollDice } from "./js/game-movement.js";
import { setupInitialGameState } from "./js/game-flow.js";

setupInitialGameState();

if (diceButton && diceFace) {
  diceButton.addEventListener("click", () => rollDice(diceFace, diceButton));
}

setupDebugTools();
