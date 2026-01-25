/**
 * Number Guessing Game
 *
 * An introductory CS program demonstrating fundamental programming concepts:
 * - Variables and data types
 * - Random number generation
 * - Conditional statements (if/else)
 * - Functions
 * - Event handling
 * - Arrays
 * - DOM manipulation
 */

// ============================================
// VARIABLES - Store the game state
// ============================================

let secretNumber;      // The number the player needs to guess
let attempts;          // How many guesses the player has made
let guessHistory;      // Array to store all previous guesses
let gameOver;          // Boolean to track if the game has ended

// ============================================
// DOM ELEMENTS - References to HTML elements
// ============================================

const guessInput = document.getElementById('guess-input');
const guessBtn = document.getElementById('guess-btn');
const feedback = document.getElementById('feedback');
const attemptsDisplay = document.getElementById('attempts');
const historyList = document.getElementById('guess-history');
const newGameBtn = document.getElementById('new-game-btn');

// ============================================
// FUNCTIONS - Reusable blocks of code
// ============================================

/**
 * Initialize a new game
 * This function resets all game variables to their starting values
 */
function initGame() {
    // Generate a random number between 1 and 100
    // Math.random() returns a decimal between 0 and 1
    // We multiply by 100, add 1, and round down with Math.floor()
    secretNumber = Math.floor(Math.random() * 100) + 1;

    attempts = 0;
    guessHistory = [];
    gameOver = false;

    // Reset the display
    feedback.textContent = '';
    feedback.className = '';
    attemptsDisplay.textContent = '';
    historyList.innerHTML = '';
    guessInput.value = '';
    guessInput.disabled = false;
    guessBtn.disabled = false;
    newGameBtn.classList.add('hidden');

    // Focus on the input field
    guessInput.focus();

    console.log('New game started! (Secret number logged for debugging)');
    console.log('Secret number:', secretNumber);
}

/**
 * Check if the player's guess is correct
 * Uses conditional statements (if/else) to compare values
 */
function checkGuess() {
    // Don't process if the game is over
    if (gameOver) return;

    // Get the player's guess from the input field
    const guess = parseInt(guessInput.value);

    // Validate the input
    if (isNaN(guess) || guess < 1 || guess > 100) {
        feedback.textContent = 'Please enter a valid number between 1 and 100!';
        feedback.className = 'error';
        return;
    }

    // Increment the attempt counter
    attempts++;

    // Add this guess to our history array
    guessHistory.push(guess);

    // Update the guess history display
    updateHistory();

    // ============================================
    // CONDITIONALS - Compare guess to secret number
    // ============================================

    if (guess === secretNumber) {
        // The player guessed correctly!
        feedback.textContent = `Congratulations! ${secretNumber} is correct!`;
        feedback.className = 'correct';
        endGame();
    } else if (guess < secretNumber) {
        // The guess is too low
        feedback.textContent = `${guess} is too low. Try a higher number!`;
        feedback.className = 'too-low';
    } else {
        // The guess is too high
        feedback.textContent = `${guess} is too high. Try a lower number!`;
        feedback.className = 'too-high';
    }

    // Update the attempts display
    attemptsDisplay.textContent = `Attempts: ${attempts}`;

    // Clear the input for the next guess
    guessInput.value = '';
    guessInput.focus();
}

/**
 * Update the guess history display
 * Demonstrates working with arrays and loops
 */
function updateHistory() {
    // Clear the current list
    historyList.innerHTML = '';

    // Loop through each guess in the history array
    for (let i = 0; i < guessHistory.length; i++) {
        // Create a new list item
        const li = document.createElement('li');
        const guess = guessHistory[i];

        // Add appropriate styling based on the guess
        if (guess < secretNumber) {
            li.textContent = `${guess} (too low)`;
            li.className = 'too-low';
        } else if (guess > secretNumber) {
            li.textContent = `${guess} (too high)`;
            li.className = 'too-high';
        } else {
            li.textContent = `${guess} (correct!)`;
            li.className = 'correct';
        }

        historyList.appendChild(li);
    }
}

/**
 * End the current game
 */
function endGame() {
    gameOver = true;
    guessInput.disabled = true;
    guessBtn.disabled = true;
    newGameBtn.classList.remove('hidden');
}

// ============================================
// EVENT LISTENERS - Respond to user actions
// ============================================

// When the "Guess!" button is clicked
guessBtn.addEventListener('click', checkGuess);

// When the Enter key is pressed in the input field
guessInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        checkGuess();
    }
});

// When the "Play Again" button is clicked
newGameBtn.addEventListener('click', initGame);

// ============================================
// START THE GAME
// ============================================

// Initialize the game when the page loads
initGame();
