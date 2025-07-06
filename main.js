// main.js - Blackjack Game Logic

// Card assets directory
const CARD_PATH = 'cards/';
const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
const RANKS = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10',
  'jack', 'queen', 'king', 'ace'
];

// Card image filename helper
function cardFilename(rank, suit) {
  if (rank === 'joker') return suit === 'red' ? 'red_joker.png' : 'black_joker.png';
  return `${rank}_of_${suit}.png`;
}

// Card value helper
function cardValue(card, currentTotal) {
  if (['jack', 'queen', 'king'].includes(card.rank)) return 10;
  if (card.rank === 'ace') {
    // Ace: 11 if it doesn't bust, else 1
    return (currentTotal + 11 > 21) ? 1 : 11;
  }
  return parseInt(card.rank);
}

// Deck generator
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

// Hand value calculation (handles Aces as 1 or 11)
function handValue(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.rank === 'ace') aces++;
    else total += cardValue(card, total);
  }
  // Add aces at the end
  for (let i = 0; i < aces; i++) {
    total += (total + 11 <= 21) ? 11 : 1;
  }
  return total;
}

// Blackjack check
function isBlackjack(hand) {
  return hand.length === 2 && handValue(hand) === 21;
}

// DOM helpers
function renderHand(container, hand, hideFirst = false) {
  container.innerHTML = '';
  hand.forEach((card, idx) => {
    if (hideFirst && idx === 0) {
      // Create a custom gray card with question mark for hidden card
      const hiddenCard = document.createElement('div');
      hiddenCard.className = 'w-16 h-24 rounded shadow flex items-center justify-center bg-gray-700 card-appear';
      hiddenCard.style.position = 'relative';
      
      // Add question mark
      const questionMark = document.createElement('span');
      questionMark.textContent = '?';
      questionMark.className = 'text-white text-4xl font-bold';
      questionMark.style.textShadow = '0 0 3px #000';
      
      hiddenCard.appendChild(questionMark);
      container.appendChild(hiddenCard);
    } else {
      const img = document.createElement('img');
      img.src = CARD_PATH + cardFilename(card.rank, card.suit);
      img.alt = `${card.rank} of ${card.suit}`;
      img.className = 'w-16 h-24 rounded shadow card-appear';
      container.appendChild(img);
    }
  });
}

// --- Accounting & Betting System ---
const BALANCE_KEY = 'webjack_balance';
const MIN_BET = 10;
const MAX_BET = 5000;
const MIN_BALANCE = 100;
let balance = 0;
let currentBet = 0;

function loadBalance() {
  const stored = localStorage.getItem(BALANCE_KEY);
  balance = stored ? Math.max(parseInt(stored), MIN_BALANCE) : 500;
  saveBalance();
}
function saveBalance() {
  localStorage.setItem(BALANCE_KEY, balance);
}
function updateBalanceUI() {
  document.getElementById('balance').textContent = balance;
}
function showRefill(show) {
  document.getElementById('refill-btn').classList.toggle('hidden', !show);
}
function resetBetUI() {
}

// Update current bet display
function updateCurrentBetDisplay() {
  document.getElementById('current-bet-amount').textContent = currentBet;
  // Also update the bet in the modal
  if (document.getElementById('modal-balance')) {
    document.getElementById('modal-balance').textContent = balance;
  }
}

function placeBet() {
  // This function is now unused (top bet input removed)
}

function refillBalance() {
  balance = MIN_BALANCE;
  saveBalance();
  updateBalanceUI();
  showRefill(false);
  resetBetUI();
  umami.track('balance-refilled', { amount: MIN_BALANCE });
}

// --- Game Logic Modifications ---
function startGame() {
  deck = createDeck();
  shuffle(deck);
  playerHand = [deck.pop(), deck.pop()];
  dealerHand = [deck.pop(), deck.pop()];
  gameOver = false;
  playerStands = false;
  updateUI();
  umami.track('game-started');
}

function newGame() {
  // Clear previous game state
  document.getElementById('result-message').textContent = '';
  currentBet = 0;
  updateCurrentBetDisplay(); // Reset the current bet display
  resetBetUI();
  
  // Show bet modal instead of starting right away
  showModal('bet-modal');
}

function updateUI() {
  const dealerCardsDiv = document.getElementById('dealer-cards');
  const playerCardsDiv = document.getElementById('player-cards');
  const dealerStatus = document.getElementById('dealer-status');
  const playerStatus = document.getElementById('player-status');
  const resultMsg = document.getElementById('result-message');
  const hitBtn = document.getElementById('hit-btn');
  const standBtn = document.getElementById('stand-btn');
  const newGameBtn = document.getElementById('new-game-btn');

  // Update current bet display
  updateCurrentBetDisplay();

  // Dealer: hide first card if player hasn't stood or busted
  renderHand(dealerCardsDiv, dealerHand, !gameOver && !playerStands);
  renderHand(playerCardsDiv, playerHand);

  // --- Set dealer and player value in UI ---
  // Dealer value: show only second card if hidden, else total
  const dealerValueSpan = document.getElementById('dealer-value');
  if (!gameOver && !playerStands) {
    // Only show value of visible dealer card(s)
    if (dealerHand.length > 1) {
      dealerValueSpan.textContent = cardValue(dealerHand[1], 0);
    } else {
      dealerValueSpan.textContent = '0';
    }
  } else {
    dealerValueSpan.textContent = handValue(dealerHand);
  }
  // Player value: always show total
  document.getElementById('player-value').textContent = handValue(playerHand);
  // --- end value UI ---

  dealerStatus.textContent =
    (gameOver || playerStands)
      ? `Total: ${handValue(dealerHand)}`
      : 'One card hidden';
  playerStatus.textContent = `Total: ${handValue(playerHand)}`;

  // Disable game controls if no bet placed
  hitBtn.disabled = !currentBet || gameOver || playerStands;
  standBtn.disabled = !currentBet || gameOver || playerStands;
  newGameBtn.classList.toggle('hidden', !gameOver);

  // Show refill if broke
  showRefill(balance < MIN_BET);

  // Result message - don't show modal immediately, let showResultModal handle it with delay
  if (gameOver && currentBet) {
    let result = '';
    let winnings = 0;
    let payout = 0;
    let betAmount = currentBet; // Store the current bet before resetting

    if (isBlackjack(playerHand) && !isBlackjack(dealerHand)) {
      result = 'Blackjack! You win!';
      winnings = Math.floor(currentBet * 1.5);
      payout = currentBet + winnings; // bet back + 1.5x winnings
    } else if (isBlackjack(dealerHand) && !isBlackjack(playerHand)) {
      result = 'Dealer has Blackjack! You lose!';
      winnings = 0;
      payout = 0;
    } else if (handValue(playerHand) > 21) {
      result = 'Bust! You lose!';
      winnings = 0;
      payout = 0;
    } else if (handValue(dealerHand) > 21) {
      result = 'Dealer busts! You win!';
      winnings = currentBet;
      payout = currentBet * 2; // bet back + winnings
    } else if (handValue(playerHand) > handValue(dealerHand)) {
      result = 'You win!';
      winnings = currentBet;
      payout = currentBet * 2; // bet back + winnings
    } else if (handValue(playerHand) < handValue(dealerHand)) {
      result = 'You lose!';
      winnings = 0;
      payout = 0;
    } else {
      result = 'Push! (Tie)';
      winnings = 0;
      payout = currentBet; // bet returned
    }

    if (payout > 0) {
      balance += payout;
      saveBalance();
      updateBalanceUI();
    }

    setTimeout(() => showResultModal(betAmount, winnings, payout), 1500);

    currentBet = 0;
  }
}

function playerHit() {
  if (gameOver || playerStands || !currentBet) return;
  playerHand.push(deck.pop());
  if (handValue(playerHand) > 21) {
    gameOver = true;
    // Don't call showResultModal here, let updateUI handle it
  }
  updateUI();
}

function playerStand() {
  if (gameOver || !currentBet) return;
  playerStands = true;
  dealerTurn();
  // Don't call showResultModal here, let updateUI handle it
}

function dealerTurn() {
  while (handValue(dealerHand) < 17) {
    dealerHand.push(deck.pop());
  }
  gameOver = true;
  updateUI();
}

// Modal handling
function showModal(modalId) {
  document.getElementById(modalId).classList.remove('hidden');
  if (modalId === 'bet-modal') {
    document.getElementById('modal-bet-amount').value = MIN_BET;
  }
}

function hideModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

function showResultModal(betAmount, winnings = 0, payout = 0) {
  if (!gameOver) return;

  const modalTitle = document.getElementById('result-modal-title');
  const modalMessage = document.getElementById('result-modal-message');

  let result = '';
  let titleClass = '';

  if (isBlackjack(playerHand) && !isBlackjack(dealerHand)) {
    result = 'Blackjack! You win!';
    titleClass = 'text-green-400';
  } else if (isBlackjack(dealerHand) && !isBlackjack(playerHand)) {
    result = 'Dealer has Blackjack! You lose!';
    titleClass = 'text-red-500';
  } else if (handValue(playerHand) > 21) {
    result = 'Bust! You lose!';
    titleClass = 'text-red-500';
  } else if (handValue(dealerHand) > 21) {
    result = 'Dealer busts! You win!';
    titleClass = 'text-green-400';
  } else if (handValue(playerHand) > handValue(dealerHand)) {
    result = 'You win!';
    titleClass = 'text-green-400';
  } else if (handValue(playerHand) < handValue(dealerHand)) {
    result = 'You lose!';
    titleClass = 'text-red-500';
  } else {
    result = 'Push! (Tie)';
    titleClass = 'text-yellow-400';
  }

  modalTitle.textContent = result;
  modalTitle.className = `text-3xl font-bold mb-2 ${titleClass}`;

  // winnings is the amount won (not including bet), betAmount is the original bet, payout is total returned
  if (result === 'Push! (Tie)') {
    modalMessage.textContent = `It's a tie. Your $${betAmount} bet is returned.`;
    umami.track('game-push', { bet: betAmount });
  } else if (winnings > 0) {
    modalMessage.textContent = `You won $${winnings} (Total returned: $${payout}).`;
    umami.track('game-win', { bet: betAmount, winnings, payout });
  } else {
    modalMessage.textContent = `You lost $${betAmount}.`;
    umami.track('game-lose', { bet: betAmount });
  }

  showModal('result-modal');
}

// Bet handling
function handleBetButton(amount) {
  const betInput = document.getElementById('modal-bet-amount');
  let currentValue = parseInt(betInput.value) || MIN_BET;
  
  if (amount === 'min') {
    betInput.value = MIN_BET;
  } else if (amount === 'max') {
    betInput.value = Math.min(balance, MAX_BET);
  } else if (amount === 'clear') {
    betInput.value = MIN_BET;
  } else {
    betInput.value = Math.min(Math.max(currentValue + amount, MIN_BET), Math.min(balance, MAX_BET));
  }
}

function placeBetFromModal() {
  const betInput = document.getElementById('modal-bet-amount');
  let bet = parseInt(betInput.value);
  if (isNaN(bet) || bet < MIN_BET) bet = MIN_BET;
  if (bet > MAX_BET) bet = MAX_BET;
  if (bet > balance) bet = balance;
  
  currentBet = bet;
  balance -= bet;
  saveBalance();
  updateBalanceUI();
  updateCurrentBetDisplay(); // Update the current bet display
  
  hideModal('bet-modal');
  umami.track('bet-placed', { amount: currentBet });
  startGame();
}

// Attach modal close logic
window.onload = function () {
  loadBalance();
  updateBalanceUI();
  updateCurrentBetDisplay(); // Initialize the current bet display

  // Game controls
  document.getElementById('hit-btn').onclick = playerHit;
  document.getElementById('stand-btn').onclick = playerStand;
  document.getElementById('new-game-btn').onclick = newGame;
  document.getElementById('refill-btn').onclick = refillBalance;

  // Modal controls
  document.getElementById('result-modal-close').onclick = () => {
    hideModal('result-modal');
    document.getElementById('new-game-btn').classList.remove('hidden');
  };

  // Bet modal controls
  document.getElementById('modal-place-bet-btn').onclick = placeBetFromModal;
  document.querySelectorAll('.bet-btn').forEach(btn => {
    btn.addEventListener('click', () => handleBetButton(parseInt(btn.dataset.amount) || btn.dataset.amount));
  });

  // Add handler for "Place Bet" button
  document.getElementById('open-bet-modal-btn').onclick = function () {
    showModal('bet-modal');
    document.getElementById('modal-bet-amount').value = MIN_BET;
    document.getElementById('modal-balance').textContent = balance;
  };

  resetBetUI();
  updateUI();
};