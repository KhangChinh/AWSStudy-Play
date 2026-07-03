//placeholder
/**
 * Minesweeper Game Logic
 * 
 * Giao tiếp với App chính qua postMessage:
 *   INIT      → Vào cửa (tốn P-Coin)
 *   IN-GAME   → Xài item cục bộ
 *   GAME OVER → Báo kết quả
 *   SYNC      → App chính gọi API lên AWS chốt sổ
 */

// Gửi message lên parent (App chính)
function sendToApp(type, data) {
  window.parent.postMessage({ game: 'minesweeper', type, data }, '*');
}

// Lắng nghe message từ App chính
window.addEventListener('message', (event) => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'INIT':
      // Nhận xác nhận đã trừ phí, bắt đầu game
      console.log('Game initialized with data:', data);
      startGame();
      break;
    case 'USE_ITEM':
      // Nhận item từ inventory (hint, extra life...)
      console.log('Item used:', data);
      break;
    default:
      break;
  }
});

function startGame() {
  // TODO: Implement minesweeper logic
  sendToApp('IN-GAME', { status: 'started' });
  
  document.querySelector('.status').textContent = 'Game started! Click to play.';
}

function endGame(score) {
  sendToApp('GAME OVER', { score, completed: true });
}

window.endGame = endGame;

// Auto-init khi load trong iframe
sendToApp('INIT', { requestEntry: true });
