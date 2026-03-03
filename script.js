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
const stoneTargetDisplay = document.getElementById('stone-target');
const stoneStageDisplay = document.getElementById('stone-stage');
const stoneRemainDisplay = document.getElementById('stone-remain');

// Stone Match State
let stoneGrid = [];
const stoneRows = 10;
const stoneCols = 10;
const stoneColors = ['red', 'blue', 'green', 'yellow', 'purple'];
let stoneScore = 0;
let stoneStage = 1;
let stoneTarget = 1000;

// --- Navigation ---
function showMenu() {
    mainMenu.classList.remove('hidden');
    puzzleGame.classList.add('hidden');
    stoneGame.classList.add('hidden');
    successModal.classList.add('hidden');
    puzzleGame.classList.remove('flex');
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

// --- Stone Match Logic ---
function initStoneGame() {
    stoneScore = 0;
    stoneStage = 1;
    stoneTarget = 1000;
    startNewStage();
}

function startNewStage() {
    stoneContainer.innerHTML = '';
    stoneContainer.style.gridTemplateColumns = `repeat(${stoneCols}, 1fr)`;
    stoneGrid = [];
    
    // Generate Grid
    for (let r = 0; r < stoneRows; r++) {
        stoneGrid[r] = [];
        for (let c = 0; c < stoneCols; c++) {
            const color = stoneColors[Math.floor(Math.random() * stoneColors.length)];
            stoneGrid[r][c] = color;
        }
    }
    
    renderStoneGrid();
    updateStoneStats();
}

function renderStoneGrid() {
    stoneContainer.innerHTML = '';
    let remainCount = 0;
    
    for (let r = 0; r < stoneRows; r++) {
        for (let c = 0; c < stoneCols; c++) {
            const stone = document.createElement('div');
            const color = stoneGrid[r][c];
            stone.className = `stone ${color ? 'stone-' + color : 'empty'}`;
            
            if (color) {
                remainCount++;
                stone.onclick = () => handleStoneClick(r, c);
                stone.onmouseover = () => highlightGroup(r, c, true);
                stone.onmouseout = () => highlightGroup(r, c, false);
            }
            
            stoneContainer.appendChild(stone);
        }
    }
    stoneRemainDisplay.innerText = remainCount;
}

function handleStoneClick(r, c) {
    const color = stoneGrid[r][c];
    if (!color) return;

    const connected = findConnected(r, c, color);
    if (connected.length < 2) return;

    // Calculate Score: (n-1)^2 * 10
    const points = Math.pow(connected.length - 1, 2) * 10;
    stoneScore += points;
    
    // Visual effect before removal
    connected.forEach(([row, col]) => {
        const index = row * stoneCols + col;
        stoneContainer.children[index].classList.add('removing');
    });

    setTimeout(() => {
        connected.forEach(([row, col]) => {
            stoneGrid[row][col] = null;
        });
        
        applyGravity();
        shiftColumns();
        renderStoneGrid();
        updateStoneStats();
        checkGameOver();
    }, 200);
}

function findConnected(r, c, color) {
    const connected = [];
    const stack = [[r, c]];
    const visited = new Set();

    while (stack.length > 0) {
        const [currR, currC] = stack.pop();
        const key = `${currR},${currC}`;
        if (visited.has(key)) continue;
        visited.add(key);

        if (stoneGrid[currR][currC] === color) {
            connected.push([currR, currC]);
            // Check neighbors
            const neighbors = [[currR-1, currC], [currR+1, currC], [currR, currC-1], [currR, currC+1]];
            neighbors.forEach(([nR, nC]) => {
                if (nR >= 0 && nR < stoneRows && nC >= 0 && nC < stoneCols) {
                    stack.push([nR, nC]);
                }
            });
        }
    }
    return connected;
}

function highlightGroup(r, c, shouldHighlight) {
    const color = stoneGrid[r][c];
    if (!color) return;
    
    const connected = findConnected(r, c, color);
    if (connected.length < 2) return;
    
    connected.forEach(([row, col]) => {
        const index = row * stoneCols + col;
        if (stoneContainer.children[index]) {
            stoneContainer.children[index].classList.toggle('highlight', shouldHighlight);
        }
    });
}

function applyGravity() {
    for (let c = 0; c < stoneCols; c++) {
        let emptyRow = stoneRows - 1;
        for (let r = stoneRows - 1; r >= 0; r--) {
            if (stoneGrid[r][c] !== null) {
                const color = stoneGrid[r][c];
                stoneGrid[r][c] = null;
                stoneGrid[emptyRow][c] = color;
                emptyRow--;
            }
        }
    }
}

function shiftColumns() {
    let emptyCol = 0;
    for (let c = 0; c < stoneCols; c++) {
        let isColumnEmpty = true;
        for (let r = 0; r < stoneRows; r++) {
            if (stoneGrid[r][c] !== null) {
                isColumnEmpty = false;
                break;
            }
        }

        if (!isColumnEmpty) {
            if (emptyCol !== c) {
                for (let r = 0; r < stoneRows; r++) {
                    stoneGrid[r][emptyCol] = stoneGrid[r][c];
                    stoneGrid[r][c] = null;
                }
            }
            emptyCol++;
        }
    }
}

function updateStoneStats() {
    stoneScoreDisplay.innerText = stoneScore;
    stoneStageDisplay.innerText = stoneStage;
    stoneTargetDisplay.innerText = stoneTarget;
    
    // Add visual feedback if target reached
    if (stoneScore >= stoneTarget) {
        stoneScoreDisplay.classList.add('text-green-600');
    } else {
        stoneScoreDisplay.classList.remove('text-green-600');
    }
}

function checkGameOver() {
    let hasMove = false;
    for (let r = 0; r < stoneRows; r++) {
        for (let c = 0; c < stoneCols; c++) {
            const color = stoneGrid[r][c];
            if (color) {
                const neighbors = [[r-1, c], [r+1, c], [r, c-1], [r, c+1]];
                for (const [nR, nC] of neighbors) {
                    if (nR >= 0 && nR < stoneRows && nC >= 0 && nC < stoneCols && stoneGrid[nR][nC] === color) {
                        hasMove = true;
                        break;
                    }
                }
            }
            if (hasMove) break;
        }
        if (hasMove) break;
    }

    if (!hasMove) {
        handleGameOver();
    }
}

function handleGameOver() {
    const remain = parseInt(stoneRemainDisplay.innerText);
    let bonus = 0;
    
    // Original-style bonus for remaining stones
    if (remain < 10) {
        bonus = 2000 - (remain * 200);
        if (remain === 0) bonus = 5000; // Jackpot
    }
    
    if (bonus > 0) {
        stoneScore += bonus;
        updateStoneStats();
        alert(`没有可以消除的石头了！\n剩余石头: ${remain}\n获得额外奖分: ${bonus}`);
    } else {
        alert(`没有可以消除的石头了！\n剩余石头: ${remain}\n没有额外奖励。`);
    }

    if (stoneScore >= stoneTarget) {
        stoneStage++;
        stoneTarget += 2000;
        alert(`恭喜过关！即将开始第 ${stoneStage} 关。\n目标分数: ${stoneTarget}`);
        startNewStage();
    } else {
        alert(`得分未达标，游戏结束！\n最终得分: ${stoneScore}`);
        initStoneGame();
    }
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
