# Concepts

Games for learning maths by moving things.

**Play:** https://novakai-one.github.io/Concepts/

| Game | Topic |
|---|---|
| [SINGULAR](https://novakai-one.github.io/Concepts/singular/) | Linear algebra: vectors, matrices, eigenvalues and more |

## Run it locally

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:5173/singular/.

## Layout

Each game has its own folders: `site/<game>/` (page), `site/src/<game>/` (code), `site/public/<game>/` (assets), `tools/<game>/`, `tests/<game>/`, `docs/<game>/`.
`CLAUDE.md` holds the working rules.

Third-party code keeps its own licence: three.js, KaTeX and Pyodide (installed from npm), and the Inter, JetBrains Mono and Space Grotesk fonts.
