const playerCountButtons = document.querySelectorAll(".player-count-btn");
const colorButtons = document.querySelectorAll(".color-btn");
const playerNamesDiv = document.getElementById("playerNames");
const gameSetupForm = document.getElementById("gameSetupForm");
const colorSelectionDiv = document.getElementById("colorSelection");

let selectedColors = [];
let playerCount = 0;

// Seating order, and the order boardn-geometry.js lays its sectors out in, so
// the polygonal boards' yards line up with the names entered here. The first
// four are also the 4-player board's corners.
const SEAT_COLORS = ["red", "green", "yellow", "blue", "purple", "orange"];

// Seat counts that get a polygonal board of their own; anything less fits the
// square 4-player one.
const POLY_BOARDS = [5, 6];

function getDefaultColors(count) {
  return SEAT_COLORS.slice(0, count);
}

function updatePlayerInputs(count) {
  playerNamesDiv.innerHTML = "";

  for (let index = 1; index <= count; index += 1) {
    const playerInput = document.createElement("div");
    playerInput.className = "player-input flex items-center space-x-2";
    playerInput.innerHTML = `
      <div class="color-indicator w-6 h-6 rounded-full" style="background-color: ${selectedColors[index - 1] || "#e5e7eb"}"></div>
      <div class="flex-grow">
        <label for="player${index}" class="block text-sm font-medium text-gray-700">Player ${index} Name:</label>
        <input type="text" id="player${index}" name="player${index}" required class="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
      </div>
    `;
    playerNamesDiv.appendChild(playerInput);
  }

  playerNamesDiv.classList.remove("hidden");
}

playerCountButtons.forEach((button) => {
  button.addEventListener("click", () => {
    playerCount = Number.parseInt(button.getAttribute("data-players"), 10);

    playerCountButtons.forEach((btn) => btn.classList.remove("bg-indigo-800"));
    button.classList.add("bg-indigo-800");

    if (playerCount === 2) {
      colorSelectionDiv.classList.remove("hidden");
      playerNamesDiv.classList.add("hidden");
    } else {
      colorSelectionDiv.classList.add("hidden");
      selectedColors = getDefaultColors(playerCount);
      updatePlayerInputs(playerCount);
    }
  });
});

colorButtons.forEach((button) => {
  button.addEventListener("click", () => {
    colorButtons.forEach((btn) =>
      btn.classList.remove("ring-2", "ring-offset-2", "ring-black"),
    );
    button.classList.add("ring-2", "ring-offset-2", "ring-black");
    selectedColors = button.getAttribute("data-colors").split(",");
    updatePlayerInputs(playerCount);
  });
});

gameSetupForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (playerCount === 0) {
    alert("Please select the number of players before starting the game.");
    return;
  }

  if (playerCount === 2 && selectedColors.length === 0) {
    alert("Please select a color combination before starting the game.");
    return;
  }

  const playerNames = {};
  const inputs = playerNamesDiv.querySelectorAll('input[type="text"]');

  if (playerCount === 2) {
    playerNames[selectedColors[0]] = inputs[0].value;
    playerNames[selectedColors[1]] = inputs[1].value;
  } else {
    inputs.forEach((input, index) => {
      playerNames[selectedColors[index]] = input.value;
    });
  }

  const allNamesFilled = Object.values(playerNames).every(
    (name) => name.trim() !== "",
  );
  if (!allNamesFilled) {
    alert("Please enter names for all players.");
    return;
  }

  localStorage.setItem("playerNames", JSON.stringify(playerNames));
  localStorage.setItem("selectedColors", JSON.stringify(selectedColors));

  // Five players need the decagon board and six the dodecagon; two to four fit
  // the square one.
  window.location.href = POLY_BOARDS.includes(playerCount)
    ? `game${playerCount}.html`
    : "game.html";
});
