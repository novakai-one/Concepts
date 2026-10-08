// Entry point for the game page.
import 'katex/dist/katex.min.css';
import './styles/game.css';
import './styles/screens.css';
import { App } from './game/app';

const root = document.getElementById('stage')!;
const loading = document.getElementById('loading');

try {
  const app = new App(root);
  loading?.classList.add('done');
  window.setTimeout(() => loading?.remove(), 900);
  void app.boot();
} catch (e) {
  console.error(e);
  if (loading) loading.innerHTML = `<p>This game needs WebGL 2. Try a recent Chrome, Edge, Firefox or Safari.</p><pre>${String(e)}</pre>`;
}
