const buttonred=document.getElementById('rollButtonred');
const buttongreen=document.getElementById('rollButtongreen');
const buttonyellow=document.getElementById('rollButtonyellow');
const buttonblue=document.getElementById('rollButtonblue');

const diceConRed=document.getElementById('dice_con_red');
const diceConGreen=document.getElementById('dice_con_green');
const diceConYellow=document.getElementById('dice_con_yellow');
const diceConBlue=document.getElementById('dice_con_blue');

let currentTurn='red';
let previousValue=0;

const tokens={
    red:['token-red-1', 'token-red-2', 'token-red-3', 'token-red-4'],
    green:['token-green-1', 'token-green-2', 'token-green-3', 'token-green-4'],
    yellow:['token-yellow-1', 'token-yellow-2', 'token-yellow-3', 'token-yellow-4'],
    blue:['token-blue-1', 'token-blue-2', 'token-blue-3', 'token-blue-4']
};

const paths={
    red:['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'c13', 'c14', 'c15', 'c16', 'c17', 'c18', 'c19', 'c20', 'c21', 'c22', 'c23', 'c24', 'c25', 'c26', 'c27', 'c28', 'c29', 'c30', 'c31', 'c32', 'c33', 'c34', 'c35', 'c36', 'c37', 'c38', 'c39', 'c40', 'c41', 'c42', 'c43', 'c44', 'c45', 'c46', 'c47', 'c48', 'c49', 'c50', 'c51', 'rc1', 'rc2', 'rc3', 'rc4', 'rc5', 'red_home'],
    green:['c14', 'c15', 'c16', 'c17', 'c18', 'c19', 'c20', 'c21', 'c22', 'c23', 'c24', 'c25', 'c26', 'c27', 'c28', 'c29', 'c30', 'c31', 'c32', 'c33', 'c34', 'c35', 'c36', 'c37', 'c38', 'c39', 'c40', 'c41', 'c42', 'c43', 'c44', 'c45', 'c46', 'c47', 'c48', 'c49', 'c50', 'c51', 'c52', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'gc1', 'gc2', 'gc3', 'gc4', 'gc5', 'green_home'],
    yellow:['c27', 'c28', 'c29', 'c30', 'c31', 'c32', 'c33', 'c34', 'c35', 'c36', 'c37', 'c38', 'c39', 'c40', 'c41', 'c42', 'c43', 'c44', 'c45', 'c46', 'c47', 'c48', 'c49', 'c50', 'c51', 'c52', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'c13', 'c14', 'c15', 'c16', 'c17', 'c18', 'c19', 'c20', 'c21', 'c22', 'c23', 'c24', 'c25', 'yc1', 'yc2', 'yc3', 'yc4', 'yc5', 'yellow_home'],
    blue:['c40', 'c41', 'c42', 'c43', 'c44', 'c45', 'c46', 'c47', 'c48', 'c49', 'c50', 'c51', 'c52', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'c13', 'c14', 'c15', 'c16', 'c17', 'c18', 'c19', 'c20', 'c21', 'c22', 'c23', 'c24', 'c25', 'c26', 'c27', 'c28', 'c29', 'c30', 'c31', 'c32', 'c33', 'c34', 'c35', 'c36', 'c37', 'c38', 'bc1', 'bc2', 'bc3', 'bc4', 'bc5', 'blue_home']
};

let tokenPositions={
    red:{},
    green:{},
    yellow:{},
    blue:{}
};

// Initialize token positions for all colors
function initializeTokenPositions() 
{
    Object.keys(tokens).forEach(color=>{
        tokens[color].forEach(tokenId=>tokenPositions[color][tokenId]=-1);
    });
}

initializeTokenPositions();

let gameWinners=[];

// Main function to handle dice rolling
function rollDice(dice, button) 
{
    // Disable the button immediately
    button.disabled=true;

    const randomValue=Math.floor(Math.random()*6)+1;
    let rotation;

    // Set dice rotation based on the rolled value
    switch(randomValue) 
    {
        case 1:rotation='rotateX(0deg) rotateY(0deg)'; break;
        case 2:rotation='rotateX(0deg) rotateY(180deg)'; break;
        case 3:rotation='rotateX(0deg) rotateY(90deg)'; break;
        case 4:rotation='rotateX(0deg) rotateY(-90deg)'; break;
        case 5:rotation='rotateX(90deg) rotateY(0deg)'; break;
        case 6:rotation='rotateX(-90deg) rotateY(0deg)'; break;
    }
    console.log(randomValue);
    dice.style.transform=rotation;

    // Re-roll if the same value is rolled twice in a row
    if(randomValue===previousValue) 
    {
        rollDice(dice, button);
    } 
    else 
    {
        previousValue=randomValue;
        const color=getColorFromDice(dice);

        // Get available tokens that can be moved
        const availableTokens=getAvailableTokens(color, randomValue);

        // Handle token selection based on available moves
        if(availableTokens.length===1) 
        {
            // Only one token can move, so automatically select it
            handleTokenSelection(availableTokens[0], color, randomValue);
        } 
        else if(availableTokens.length>1) 
        {
            // Multiple tokens can move, let the player choose
            showTokenSelection(color, randomValue);
        }
        else 
        {
            // No tokens can move, move to the next player's turn
            setTimeout(()=>{
                hideCurrentDice();
                showNextDice();
            }, 1000);
        }
    }
}

function getAvailableTokens(color, diceValue) 
{
    return tokens[color].filter(tokenId=>{
        const currentPos=tokenPositions[color][tokenId];
        return(currentPos===-1 && diceValue===6)||(currentPos!==-1 && currentPos+diceValue<paths[color].length);
    });
}

function showTokenSelection(color, diceValue) 
{
    const availableTokens=getAvailableTokens(color, diceValue);
    availableTokens.forEach(tokenId=>{
        const token=document.getElementById(tokenId);
        token.classList.add('selectable');
        token.onclick=()=>handleTokenSelection(tokenId, color, diceValue);
    });
}

function handleTokenSelection(tokenId, color, diceValue) 
{
    const path=paths[color];
    let currentPos=tokenPositions[color][tokenId];
    let newPos;

    if(currentPos===-1) 
    {
        if(diceValue===6) 
        {
            newPos=0;
        } 
        else 
        {
            alert("You need to roll a 6 to move this token out.");
            return;
        }
    } 
    else 
    {
        newPos=currentPos+diceValue;
    }

    let capturedToken=false;
    let reachedHome=false;
    if(newPos<path.length) 
    {
        moveTokenCellByCell(tokenId, color, currentPos, newPos, 0, (finalPos)=>{
            capturedToken=checkCollision(tokenId, color, path[finalPos]);
            reachedHome=path[finalPos]===`${color}_home`;
            const playerWon=checkWinCondition(color);
            if(!playerWon) 
            {
                handleNextTurn(diceValue, capturedToken, reachedHome);
            }
        });
    } 
    else 
    {
        const playerWon=checkWinCondition(color);
        if(!playerWon) 
        {
            handleNextTurn(diceValue, capturedToken, reachedHome);
        }
    }

    // Remove selection from all tokens
    Object.values(tokens).flat().forEach(id=>{
        const token=document.getElementById(id);
        token.classList.remove('selectable');
        token.onclick=null;
    });
}

// Move token cell by cell with animation
function moveTokenCellByCell(tokenId, color, start, end, current, callback) 
{
    if(current>end-start) 
    {
        tokenPositions[color][tokenId]=end;
        if(callback) callback(end);
        return;
    }

    const path=paths[color];
    const currentCell=path[start+current];
    moveToken(tokenId, currentCell);

    setTimeout(()=>{
        moveTokenCellByCell(tokenId, color, start, end, current+1, callback);
    }, 500);
}

// Check for collisions with other tokens
function checkCollision(tokenId, color, cellId) 
{
    const cell=document.getElementById(cellId);
    const tokens=Array.from(cell.getElementsByClassName('token'));
    let capturedToken=false;

    if(tokens.length>1 && !isSafeCell(cellId)) 
    {
        // Count tokens of each color in the cell
        const tokenCounts=tokens.reduce((counts, token)=>{
            const tokenColor=token.id.split('-')[1];
            counts[tokenColor]=(counts[tokenColor]||0)+1;
            return counts;
        }, {});

        // Check if there's a block (2 or more tokens of the same color)
        const blockColor=Object.keys(tokenCounts).find(c=>tokenCounts[c]>1);

        if(blockColor) 
        {
            // If there's a block, capture all tokens not part of the block or the moving token
            tokens.forEach(token=>{
                const tokenColor=token.id.split('-')[1];
                if(tokenColor!==blockColor && tokenColor!==color) 
                {
                    sendTokenHome(token.id);
                    capturedToken=true;
                }
            });
        } 
        else 
        {
            // If no block, capture all tokens of different colors
            tokens.forEach(token=>{
                const tokenColor=token.id.split('-')[1];
                if(tokenColor!==color) 
                {
                    sendTokenHome(token.id);
                    capturedToken=true;
                }
            });
        }
    }

    return capturedToken;
}

// Check if a cell is a safe cell
function isSafeCell(cellId) 
{
    const safeCells=['c1', 'c14', 'c27', 'c40', 'c9', 'c22', 'c35', 'c48'];
    return safeCells.includes(cellId);
}

// Send a token back to its home position
function sendTokenHome(tokenId) 
{
    const color=tokenId.split('-')[1];
    const token=document.getElementById(tokenId);
    const homeContainer=document.getElementById(`${color}-h`);

    token.parentNode.removeChild(token);
    homeContainer.appendChild(token);
    token.style.margin='19px';

    // Reset token position in tokenPositions
    tokenPositions[color][tokenId]=-1;
}

function getColorFromDice(dice) 
{
    if(dice===document.getElementById('dicered')) return 'red';
    if(dice===document.getElementById('dicegreen')) return 'green';
    if(dice===document.getElementById('diceyellow')) return 'yellow';
    if(dice===document.getElementById('diceblue')) return 'blue';
}

function moveToken(tokenId, cellId) 
{
    const token=document.getElementById(tokenId);
    const cell=document.getElementById(cellId);
    
    if(token && cell) 
    {
        token.parentNode.removeChild(token);
        cell.appendChild(token);
        token.style.margin='0';
    }
}

function hideCurrentDice() 
{
    switch(currentTurn) 
    {
        case 'red':diceConRed.classList.add('hidden'); break;
        case 'green':diceConGreen.classList.add('hidden'); break;
        case 'yellow':diceConYellow.classList.add('hidden'); break;
        case 'blue':diceConBlue.classList.add('hidden'); break;
    }
}

function showNextDice() 
{
    do {
        switch(currentTurn) 
        {
            case 'red':currentTurn='green'; break;
            case 'green':currentTurn='yellow'; break;
            case 'yellow':currentTurn='blue'; break;
            case 'blue':currentTurn='red'; break;
        }
    }while(gameWinners.includes(currentTurn));

    const diceContainer=document.getElementById(`dice_con_${currentTurn}`);
    diceContainer.classList.remove('hidden');
    resetDiceButtons();
}

function resetDiceButtons() 
{
    buttonred.disabled=currentTurn!=='red'||gameWinners.includes('red');
    buttongreen.disabled=currentTurn!=='green'||gameWinners.includes('green');
    buttonyellow.disabled=currentTurn!=='yellow'||gameWinners.includes('yellow');
    buttonblue.disabled=currentTurn!=='blue'||gameWinners.includes('blue');
}

// Handle the next turn based on dice value and token capture
function handleNextTurn(diceValue, capturedToken, reachedHome) 
{
    setTimeout(()=>{
        if(diceValue===6||capturedToken||reachedHome) 
        {
            let message="";
            if(diceValue===6) message="You rolled a 6!";
            else if(capturedToken) message="You captured a token!";
            else if(reachedHome) message="Your token reached home!";
            alert(`${message} You get another turn.`);
            resetDiceButtons();
        } 
        else 
        {
            hideCurrentDice();
            showNextDice();
        }
    }, 500);
}

// Check if a player has won the game
function checkWinCondition(color) 
{
    const allTokensHome=tokens[color].every(tokenId =>
        tokenPositions[color][tokenId]===paths[color].length - 1
    );

    if(allTokensHome && !gameWinners.includes(color)) 
    {
        gameWinners.push(color);
        const rank=gameWinners.length;
        setTimeout(()=>{
            alert(`${color.charAt(0).toUpperCase()+color.slice(1)} player finishes ${getRankSuffix(rank)}!`);
            hideDice(color);

            // Add background image for the first, second, and third place winners
            if(rank<=3) 
            {
                const homeContainer=document.getElementById(`${color}-h`);
                homeContainer.style.backgroundImage=`url('../img/win${rank}.jpg')`;
                homeContainer.style.backgroundSize='cover';
                homeContainer.style.backgroundPosition='center';
            }

            if(gameWinners.length===3) 
            {
                alert("Game Over! Top 3 players have finished.");
                endGame();
            } 
            else 
            {
                hideCurrentDice();
                showNextDice();
            }
        }, 500);
        return true;
    }
    return false;
}

// Get the suffix for ranking (1st, 2nd, 3rd, etc.)
function getRankSuffix(rank) 
{
    if(rank===1) return "1st";
    if(rank===2) return "2nd";
    if(rank===3) return "3rd";
    return `${rank}th`;
}

// Hide the dice for a specific color
function hideDice(color) 
{
    const diceContainer=document.getElementById(`dice_con_${color}`);
    diceContainer.classList.add('hidden');
    const button=document.getElementById(`rollButton${color}`);
    button.disabled=true;
}

// End the game and display final rankings
function endGame() 
{
    // Disable all dice and buttons
    ['red', 'green', 'yellow', 'blue'].forEach(color=>{
        hideDice(color);
    });
    
    // Display final rankings
    let message="Final Rankings:\n";
    gameWinners.forEach((color, index)=>{
        message+=`${getRankSuffix(index+1)}: ${color.charAt(0).toUpperCase()+color.slice(1)}\n`;
    });

    // Identify the loser
    const loser=['red', 'green', 'yellow', 'blue'].find(color=>!gameWinners.includes(color));

    if(loser) {
        // Set the loser's home container background to looser.jpg
        const loserContainer=document.getElementById(`${loser}-h`);
        loserContainer.style.backgroundImage="url('../img/looser.jpg')";
        loserContainer.style.backgroundSize='cover';
        loserContainer.style.backgroundPosition='center';

        message+=`\nLoser: ${loser.charAt(0).toUpperCase()+loser.slice(1)}`;
    }

    alert(message);
    
    // TODO: Add code here to reset the game or provide an option to start a new game
}

buttonred.addEventListener('click', ()=>rollDice(document.getElementById('dicered'), buttonred));
buttongreen.addEventListener('click', ()=>rollDice(document.getElementById('dicegreen'), buttongreen));
buttonyellow.addEventListener('click', ()=>rollDice(document.getElementById('diceyellow'), buttonyellow));
buttonblue.addEventListener('click', ()=>rollDice(document.getElementById('diceblue'), buttonblue));
