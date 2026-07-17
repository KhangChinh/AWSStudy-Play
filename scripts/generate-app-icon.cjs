const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

app.whenReady().then(async () => {
  const root = path.resolve(__dirname, '..');
  const svg = fs.readFileSync(path.join(root, 'public', 'favicon.svg'), 'utf8');
  const svgData = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  const html = `<style>html,body{margin:0;width:256px;height:256px;background:transparent;display:grid;place-items:center}img{width:232px;height:232px;object-fit:contain}</style><img src="${svgData}">`;
  const win = new BrowserWindow({ width: 256, height: 256, show: true, transparent: true, frame: false });
  await win.loadURL(`data:text/html;base64,${Buffer.from(html).toString('base64')}`);
  await new Promise(resolve => setTimeout(resolve, 250));
  const icon = await win.webContents.capturePage();

  const outputDir = path.join(root, 'build');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'icon.png'), icon.toPNG());
  win.destroy();
  app.quit();
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
