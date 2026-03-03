// script.js
let currentImage = null;
let currentDifficulty = 16; // default 4x4
let pieces = [];
let moves = 0;
let startTime = null;
let timerInterval = null;
let isGameActive = false;

// DOM Elements
const mainMenu = document.getElementById('main-menu');
const puzzleGame = document.getElementById('puzzle-game');
const setupArea = document.getElementById('setup-area');
const gameBoardArea = document.getElementById('game-board-area');
const puzzleContainer = document.getElementById('puzzle-container');
const imageInput = document.getElementById('image-input');
const imagePreview = document.getElementById('image-preview');
const dropZone = document.getElementById('drop-zone');
const startBtn = document.getElementById('start-btn');
const successModal = document.getElementById('success-modal');
const hintBtn = document.getElementById('hint-btn');
const hintOverlay = document.getElementById('hint-overlay');
const hintImage = document.getElementById('hint-image');

// Stone Match Elements
const stoneGame = document.getElementById('stone-game');
const stoneContainer = document.getElementById('stone-container');
const stoneScoreDisplay = document.getElementById('stone-score');
const stoneRemainDisplay = document.getElementById('stone-remain');
const stoneHighScoreDisplay = document.getElementById('stone-high-score');

// Stone Match State (4399 version)
let stoneGrid = [];
const stoneRows = 8;
const stoneCols = 8;
let stoneScore = 0;
let stoneHighScore = localStorage.getItem('stoneHighScore') || 0;
let draggedOperator = null;

// --- Navigation ---
function showMenu() {
    mainMenu.classList.remove('hidden');
    puzzleGame.classList.add('hidden');
    stoneGame.classList.add('hidden');
    successModal.classList.add('hidden');
    stopTimer();
}

function showGame(gameId) {
    mainMenu.classList.add('hidden');
    if (gameId === 'puzzle') {
        puzzleGame.classList.remove('hidden');
        showSetup();
    } else if (gameId === 'stone') {
        stoneGame.classList.remove('hidden');
        initStoneGame();
    }
}

function showSetup() {
    setupArea.classList.remove('hidden');
    gameBoardArea.classList.add('hidden');
    successModal.classList.add('hidden');
    stopTimer();
}

function showGameBoard() {
    setupArea.classList.add('hidden');
    gameBoardArea.classList.remove('hidden');
    document.getElementById('current-difficulty').innerText = currentDifficulty;
    initPuzzle();
}

// --- Image Upload ---
imageInput.addEventListener('change', handleImageUpload);

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('bg-blue-100');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('bg-blue-100');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('bg-blue-100');
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

function handleImageUpload(e) {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
}

function handleFile(file) {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        currentImage = e.target.result;
        imagePreview.src = currentImage;
        imagePreview.classList.remove('hidden');
        dropZone.classList.add('has-image');
        startBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

// --- Difficulty ---
function setDifficulty(numPieces) {
    currentDifficulty = numPieces;
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.pieces) === numPieces);
    });
}

// --- Puzzle Logic ---
startBtn.addEventListener('click', showGameBoard);

function initPuzzle() {
    puzzleContainer.innerHTML = '';
    moves = 0;
    updateMoves();
    startTimer();
    isGameActive = true;

    // Calculate grid size based on total pieces
    let cols, rows;
    if (currentDifficulty === 16) { cols = 4; rows = 4; }
    else if (currentDifficulty === 32) { cols = 8; rows = 4; }
    else if (currentDifficulty === 64) { cols = 8; rows = 8; }
    else if (currentDifficulty === 128) { cols = 16; rows = 8; }
    else { cols = Math.sqrt(currentDifficulty); rows = cols; }

    const containerSize = puzzleContainer.offsetWidth - 4; // Padding/border adjustment
    
    puzzleContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    puzzleContainer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    // Create pieces
    pieces = [];
    for (let i = 0; i < currentDifficulty; i++) {
        const piece = document.createElement('div');
        piece.className = 'puzzle-piece';
        piece.dataset.index = i;
        piece.draggable = true;
        
        // Background positioning
        const r = Math.floor(i / cols);
        const c = i % cols;
        const bgX = (c / (cols - 1)) * 100;
        const bgY = (r / (rows - 1)) * 100;

        piece.style.backgroundImage = `url(${currentImage})`;
        piece.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;
        piece.style.backgroundPosition = `${bgX}% ${bgY}%`;
        piece.style.width = '100%';
        piece.style.height = '100%';
        
        pieces.push(piece);
    }

    // Shuffle and display
    const shuffledPieces = [...pieces].sort(() => Math.random() - 0.5);
    shuffledPieces.forEach(piece => {
        puzzleContainer.appendChild(piece);
    });

    // Add Drag & Drop Listeners
    setupDragAndDrop();
}

function setupDragAndDrop() {
    let draggedElement = null;

    puzzleContainer.addEventListener('dragstart', (e) => {
        if (!isGameActive) return;
        draggedElement = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.setData('text/plain', e.target.dataset.index);
    });

    puzzleContainer.addEventListener('dragend', (e) => {
        e.target.classList.remove('dragging');
    });

    puzzleContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    puzzleContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetElement = e.target.closest('.puzzle-piece');
        
        if (targetElement && draggedElement && targetElement !== draggedElement) {
            // Swap elements in the DOM
            const draggedIndex = Array.from(puzzleContainer.children).indexOf(draggedElement);
            const targetIndex = Array.from(puzzleContainer.children).indexOf(targetElement);
            
            const allPieces = Array.from(puzzleContainer.children);
            
            // Re-order DOM
            if (draggedIndex < targetIndex) {
                targetElement.after(draggedElement);
            } else {
                targetElement.before(draggedElement);
            }
            
            moves++;
            updateMoves();
            checkWin();
        }
    });

    // Touch Support
    let touchSource = null;
    
    puzzleContainer.addEventListener('touchstart', (e) => {
        if (!isGameActive) return;
        const touch = e.touches[0];
        touchSource = document.elementFromPoint(touch.clientX, touch.clientY).closest('.puzzle-piece');
        if (touchSource) {
            touchSource.classList.add('dragging');
        }
    }, { passive: false });

    puzzleContainer.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Prevent scroll
    }, { passive: false });

    puzzleContainer.addEventListener('touchend', (e) => {
        if (!touchSource) return;
        touchSource.classList.remove('dragging');
        
        const touch = e.changedTouches[0];
        const targetElement = document.elementFromPoint(touch.clientX, touch.clientY).closest('.puzzle-piece');
        
        if (targetElement && touchSource && targetElement !== touchSource) {
            const draggedIndex = Array.from(puzzleContainer.children).indexOf(touchSource);
            const targetIndex = Array.from(puzzleContainer.children).indexOf(targetElement);
            
            if (draggedIndex < targetIndex) {
                targetElement.after(touchSource);
            } else {
                targetElement.before(touchSource);
            }
            
            moves++;
            updateMoves();
            checkWin();
        }
        touchSource = null;
    });
}

function checkWin() {
    const currentPieces = Array.from(puzzleContainer.children);
    const isWin = currentPieces.every((piece, index) => {
        return parseInt(piece.dataset.index) === index;
    });

    if (isWin) {
        handleWin();
    }
}

function handleWin() {
    isGameActive = false;
    stopTimer();
    
    document.getElementById('final-moves').innerText = moves;
    document.getElementById('final-time').innerText = document.getElementById('timer').innerText;
    
    setTimeout(() => {
        successModal.classList.remove('hidden');
        successModal.classList.add('flex');
    }, 500);
}

function resetPuzzle() {
    initPuzzle();
}

// --- Hint ---
hintBtn.addEventListener('click', () => {
    hintImage.src = currentImage;
    hintOverlay.classList.remove('hidden');
    hintOverlay.classList.add('flex');
});

function hideHint() {
    hintOverlay.classList.add('hidden');
    hintOverlay.classList.remove('flex');
}

// --- Stone Match Logic (4399 version) ---
function initStoneGame() {
    stoneScore = 0;
    stoneHighScoreDisplay.innerText = stoneHighScore;
    updateStoneStats();
    
    stoneContainer.innerHTML = '';
    stoneContainer.style.gridTemplateColumns = `repeat(${stoneCols}, 1fr)`;
    stoneGrid = [];

    // Initialize grid with random numbers 1-6 (avoiding immediate matches)
    for (let r = 0; r < stoneRows; r++) {
        stoneGrid[r] = [];
        for (let c = 0; c < stoneCols; c++) {
            let val;
            do {
                val = Math.floor(Math.random() * 6) + 1;
            } while (isImmediateMatch(r, c, val));
            stoneGrid[r][c] = val;
        }
    }
    
    renderStoneGrid();
    setupOperatorDrag();
}

function isImmediateMatch(r, c, val) {
    if (c >= 2 && stoneGrid[r][c-1] === val && stoneGrid[r][c-2] === val) return true;
    if (r >= 2 && stoneGrid[r-1][c] === val && stoneGrid[r-2][c] === val) return true;
    return false;
}

function renderStoneGrid() {
    stoneContainer.innerHTML = '';
    for (let r = 0; r < stoneRows; r++) {
        for (let c = 0; c < stoneCols; c++) {
            const stone = document.createElement('div');
            const val = stoneGrid[r][c];
            stone.className = `stone stone-n${val}`;
            stone.innerText = val;
            stone.dataset.row = r;
            stone.dataset.col = c;
            
            // Drag and drop listeners for the stone (as a drop target)
            stone.addEventListener('dragover', (e) => e.preventDefault());
            stone.addEventListener('dragenter', (e) => {
                e.preventDefault();
                stone.classList.add('drag-over');
            });
            stone.addEventListener('dragleave', () => stone.classList.remove('drag-over'));
            stone.addEventListener('drop', handleOperatorDrop);
            
            // Simple click to increment (as per some versions of the game)
            stone.onclick = () => handleStoneClick(r, c);
            
            stoneContainer.appendChild(stone);
        }
    }
}

function setupOperatorDrag() {
    const operators = document.querySelectorAll('.operator-item');
    operators.forEach(op => {
        op.addEventListener('dragstart', (e) => {
            draggedOperator = op.dataset.op;
            op.classList.add('dragging');
        });
        op.addEventListener('dragend', () => {
            op.classList.remove('dragging');
            draggedOperator = null;
        });
    });
}

function handleOperatorDrop(e) {
    e.preventDefault();
    const stone = e.target.closest('.stone');
    if (!stone || !draggedOperator) return;
    
    stone.classList.remove('drag-over');
    const r = parseInt(stone.dataset.row);
    const c = parseInt(stone.dataset.col);
    
    // Apply math
    const opVal = parseInt(draggedOperator); // e.g., "+1" -> 1, "-1" -> -1
    let newVal = stoneGrid[r][c] + opVal;
    
    // Keep between 1 and 9
    if (newVal < 1) newVal = 1;
    if (newVal > 9) newVal = 9;
    
    stoneGrid[r][c] = newVal;
    checkAndEliminate();
}

function handleStoneClick(r, c) {
    // Basic click interaction: +1
    let newVal = stoneGrid[r][c] + 1;
    if (newVal > 9) newVal = 1;
    stoneGrid[r][c] = newVal;
    checkAndEliminate();
}

function checkAndEliminate() {
    let matches = findMatches();
    if (matches.size > 0) {
        eliminateMatches(matches);
    } else {
        renderStoneGrid();
    }
}

function findMatches() {
    const matches = new Set();
    
    // Horizontal
    for (let r = 0; r < stoneRows; r++) {
        for (let c = 0; c < stoneCols - 2; c++) {
            const val = stoneGrid[r][c];
            if (val && stoneGrid[r][c+1] === val && stoneGrid[r][c+2] === val) {
                matches.add(`${r},${c}`);
                matches.add(`${r},${c+1}`);
                matches.add(`${r},${c+2}`);
            }
        }
    }
    
    // Vertical
    for (let c = 0; c < stoneCols; c++) {
        for (let r = 0; r < stoneRows - 2; r++) {
            const val = stoneGrid[r][c];
            if (val && stoneGrid[r+1][c] === val && stoneGrid[r+2][c] === val) {
                matches.add(`${r},${c}`);
                matches.add(`${r+1},${c}`);
                matches.add(`${r+2},${c}`);
            }
        }
    }
    
    return matches;
}

function eliminateMatches(matches) {
    const matchArray = Array.from(matches).map(m => m.split(',').map(Number));
    
    // Add visual "matching" class
    matchArray.forEach(([r, c]) => {
        const index = r * stoneCols + c;
        stoneContainer.children[index].classList.add('matching');
    });

    // Score calculation
    const points = matchArray.length * 100;
    stoneScore += points;
    updateStoneStats();

    setTimeout(() => {
        // Clear grid cells
        matchArray.forEach(([r, c]) => {
            stoneGrid[r][c] = null;
        });
        
        applyGravity();
        fillEmptySpaces();
        
        // Check for cascades
        const nextMatches = findMatches();
        if (nextMatches.size > 0) {
            eliminateMatches(nextMatches);
        } else {
            renderStoneGrid();
        }
    }, 500);
}

function applyGravity() {
    for (let c = 0; c < stoneCols; c++) {
        let emptyRow = stoneRows - 1;
        for (let r = stoneRows - 1; r >= 0; r--) {
            if (stoneGrid[r][c] !== null) {
                const val = stoneGrid[r][c];
                stoneGrid[r][c] = null;
                stoneGrid[emptyRow][c] = val;
                emptyRow--;
            }
        }
    }
}

function fillEmptySpaces() {
    for (let r = 0; r < stoneRows; r++) {
        for (let c = 0; c < stoneCols; c++) {
            if (stoneGrid[r][c] === null) {
                stoneGrid[r][c] = Math.floor(Math.random() * 6) + 1;
            }
        }
    }
}

function updateStoneStats() {
    stoneScoreDisplay.innerText = stoneScore;
    if (stoneScore > stoneHighScore) {
        stoneHighScore = stoneScore;
        localStorage.setItem('stoneHighScore', stoneHighScore);
        stoneHighScoreDisplay.innerText = stoneHighScore;
    }
    // Update total eliminated count (optional, can be number of matches)
    stoneRemainDisplay.innerText = Math.floor(stoneScore / 100);
}

// --- Utilities ---
function updateMoves() {
    document.getElementById('moves').innerText = moves;
}

function startTimer() {
    stopTimer();
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('timer').innerText = `${mins}:${secs}`;
}

// Handle window resize to keep puzzle aspect ratio correct
window.addEventListener('resize', () => {
    if (isGameActive) {
        // Redraw puzzle to maintain size
        const gridSize = Math.sqrt(currentDifficulty);
        const containerSize = puzzleContainer.offsetWidth - 4;
        const pieceSize = containerSize / gridSize;
        // No need to change grid-template-columns as they use 1fr
    }
});
