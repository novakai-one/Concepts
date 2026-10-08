import { defineConfig, type Plugin } from 'vite';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const root = resolve(here, 'site');

// Every .html file under site/ is a page (multi-page app).
function findPages(dir: string, out: Record<string, string> = {}): Record<string, string> {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (name === 'node_modules' || name === 'public' || name === 'src') continue;
    if (statSync(full).isDirectory()) findPages(full, out);
    else if (name.endsWith('.html') && !name.startsWith('_')) out[relative(root, full).replace(/\.html$/, '')] = full; // _name.html = dev only
  }
  return out;
}

// With hot reload off, a newly added chapter file must still reach the chapter registry's glob.
function chapterWatch(): Plugin {
  return {
    name: 'chapter-watch',
    configureServer(server) {
      const reg = resolve(root, 'src/singular/game/registry.ts');
      const bust = (f: string) => {
        if (!f.includes('/content/chapters/')) return;
        server.moduleGraph.getModulesByFile(reg)?.forEach((m) => server.moduleGraph.invalidateModule(m));
      };
      server.watcher.on('add', bust);
      server.watcher.on('unlink', bust);
    },
  };
}

export default defineConfig({
  plugins: [chapterWatch()],
  root,
  base: './', // relative URLs: works on GitHub Pages under any sub-path
  build: {
    outDir: resolve(here, 'dist'),
    emptyOutDir: true,
    rollupOptions: { input: findPages(root) },
    chunkSizeWarningLimit: 1200,
  },
  // No hot reload: several tools edit files while browser tests run; a reload would break them.
  server: { port: 5173, hmr: false },
});
