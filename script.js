const canvas = document.querySelector('#gameCanvas');
const context = canvas.getContext('2d');
const nextCanvas = document.querySelector('#nextCanvas');
const nextContext = nextCanvas.getContext('2d');
const overlay = document.querySelector('#overlay');
const overlayTitle = document.querySelector('#overlayTitle');
const startButton = document.querySelector('#startButton');
const pauseButton = document.querySelector('#pauseButton');
const restartButton = document.querySelector('#restartButton');

const COLS = 10;
const ROWS = 20;
const CELL = canvas.width / COLS;
const COLORS = ['#a5ffce', '#f7a8ff', '#ffd166', '#75d7ff', '#ff8a9b', '#b8a0ff', '#ffad66'];
const SHAPES = [
  [[1, 1, 1, 1]], [[1, 1], [1, 1]], [[0, 1, 0], [1, 1, 1]],
  [[0, 1, 1], [1, 1, 0]], [[1, 1, 0], [0, 1, 1]],
  [[1, 0, 0], [1, 1, 1]], [[0, 0, 1], [1, 1, 1]]
];

let board = createBoard();
let current = null;
let nextPiece = randomPiece();
let score = 0;
let lines = 0;
let level = 1;
let dropCounter = 0;
let lastTime = 0;
let dropInterval = 850;
let running = false;
let paused = false;

function createBoard() { return Array.from({ length: ROWS }, () => Array(COLS).fill(0)); }
function randomPiece() {
  const type = Math.floor(Math.random() * SHAPES.length);
  return { shape: SHAPES[type].map(row => [...row]), color: COLORS[type] };
}
function spawn() {
  current = nextPiece;
  nextPiece = randomPiece();
  current.x = Math.floor((COLS - current.shape[0].length) / 2);
  current.y = 0;
  drawNext();
  if (collides(current)) endGame();
}
function collides(piece, offsetX = 0, offsetY = 0, shape = piece.shape) {
  return shape.some((row, y) => row.some((value, x) => {
    if (!value) return false;
    const boardX = piece.x + x + offsetX;
    const boardY = piece.y + y + offsetY;
    return boardX < 0 || boardX >= COLS || boardY >= ROWS || (boardY >= 0 && board[boardY][boardX]);
  }));
}
function merge() { current.shape.forEach((row, y) => row.forEach((value, x) => { if (value && current.y + y >= 0) board[current.y + y][current.x + x] = current.color; })); }
function clearLines() {
  let count = 0;
  board = board.filter(row => { if (row.every(Boolean)) { count++; return false; } return true; });
  while (board.length < ROWS) board.unshift(Array(COLS).fill(0));
  if (count) { score += [0, 100, 300, 500, 800][count] * level; lines += count; level = Math.floor(lines / 10) + 1; dropInterval = Math.max(100, 850 - (level - 1) * 65); updateStats(); }
}
function move(dx) { if (running && !paused && !collides(current, dx, 0)) current.x += dx; }
function drop() { if (!running || paused) return; if (!collides(current, 0, 1)) { current.y++; score++; updateStats(); } else lockPiece(); dropCounter = 0; }
function hardDrop() { if (!running || paused) return; let distance = 0; while (!collides(current, 0, distance + 1)) distance++; current.y += distance; score += distance * 2; updateStats(); lockPiece(); dropCounter = 0; }
function rotate() {
  if (!running || paused) return;
  const rotated = current.shape[0].map((_, index) => current.shape.map(row => row[index]).reverse());
  const kicks = [0, -1, 1, -2, 2];
  const kick = kicks.find(offset => !collides(current, offset, 0, rotated));
  if (kick !== undefined) { current.x += kick; current.shape = rotated; }
}
function lockPiece() { merge(); clearLines(); spawn(); }
function endGame() { running = false; overlayTitle.textContent = 'Game over'; startButton.textContent = 'Play again'; overlay.classList.remove('hidden'); pauseButton.textContent = 'Ⅱ'; }
function startGame() { board = createBoard(); score = 0; lines = 0; level = 1; dropInterval = 850; nextPiece = randomPiece(); running = true; paused = false; overlay.classList.add('hidden'); updateStats(); spawn(); }
function togglePause() { if (!running) return; paused = !paused; pauseButton.textContent = paused ? '▶' : 'Ⅱ'; if (paused) { overlayTitle.textContent = 'Game paused'; startButton.textContent = 'Resume'; overlay.classList.remove('hidden'); } else overlay.classList.add('hidden'); }
function updateStats() { document.querySelector('#score').textContent = String(score).padStart(6, '0'); document.querySelector('#lines').textContent = String(lines).padStart(3, '0'); document.querySelector('#level').textContent = String(level).padStart(2, '0'); }
function drawCell(ctx, x, y, color, size) { ctx.fillStyle = color; ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(x * size + 2, y * size + 2, size - 4, 3); }
function draw() {
  context.fillStyle = '#0a0f1b'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = 'rgba(65, 82, 117, .22)'; context.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) { context.beginPath(); context.moveTo(x * CELL, 0); context.lineTo(x * CELL, canvas.height); context.stroke(); }
  for (let y = 0; y <= ROWS; y++) { context.beginPath(); context.moveTo(0, y * CELL); context.lineTo(canvas.width, y * CELL); context.stroke(); }
  board.forEach((row, y) => row.forEach((color, x) => color && drawCell(context, x, y, color, CELL)));
  if (current) current.shape.forEach((row, y) => row.forEach((value, x) => value && drawCell(context, current.x + x, current.y + y, current.color, CELL)));
}
function drawNext() { nextContext.fillStyle = '#0c1322'; nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height); const size = 22; const offsetX = (nextCanvas.width - nextPiece.shape[0].length * size) / 2; const offsetY = (nextCanvas.height - nextPiece.shape.length * size) / 2; nextPiece.shape.forEach((row, y) => row.forEach((value, x) => value && drawCell(nextContext, (offsetX / size) + x, (offsetY / size) + y, nextPiece.color, size))); }
function update(time = 0) { const delta = time - lastTime; lastTime = time; if (running && !paused) { dropCounter += delta; if (dropCounter > dropInterval) drop(); } draw(); requestAnimationFrame(update); }

startButton.addEventListener('click', () => paused ? togglePause() : startGame());
restartButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePause);
document.addEventListener('keydown', event => { const keys = { ArrowLeft: () => move(-1), ArrowRight: () => move(1), ArrowDown: drop, ArrowUp: rotate, ' ': hardDrop, p: togglePause, P: togglePause }; if (keys[event.key]) { event.preventDefault(); keys[event.key](); } });
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => ({ left: () => move(-1), right: () => move(1), down: drop, rotate, drop: hardDrop }[button.dataset.action])()));

drawNext(); updateStats(); requestAnimationFrame(update);
