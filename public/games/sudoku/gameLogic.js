/**
 * Sudoku Game Logic
 * 
 * Giao tiếp với App chính qua postMessage:
 *   INIT      → Vào cửa (tốn P-Coin)
 *   IN-GAME   → Xài item cục bộ
 *   GAME OVER → Báo kết quả
 *   SYNC      → App chính gọi API lên AWS chốt sổ
 */

// Gửi message lên parent (App chính)
function sendToApp(type, data) {
  window.parent.postMessage({ game: 'sudoku', type, data }, '*');
}

// Lắng nghe message từ App chính
window.addEventListener('message', (event) => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'INIT':
      console.log('Game initialized with data:', data);
      startGame();
      break;
    case 'USE_ITEM':
      console.log('Item used:', data);
      break;
    default:
      break;
  }
});

function startGame() {
  // TODO: Implement sudoku logic
  sendToApp('IN-GAME', { status: 'started' });
  
  document.querySelector('.status').textContent = 'Game started! Fill in the grid.';
}

function endGame(score) {
  sendToApp('GAME OVER', { score, completed: true });
}

window.endGame = endGame;

// Auto-init khi load trong iframe
sendToApp('INIT', { requestEntry: true });
