# Working on this repository

This is a solo learning project: games for learning maths. The owner learns by playing them.
The first game is **SINGULAR** (linear algebra), in `site/src/singular`. More games will follow, each in its own folders.
Success is one thing: **the owner understands the maths on the screen.** It is not test coverage, and it is not tidy code.

The repository is **public**, and merging to `main` publishes the live site.

**Read first:** `docs/singular/ch18-why.md`.
- It explains how the owner learns, what went wrong in Chapter 18, and what fixed it.
- Every chapter rebuild follows it, and its checklist.

---

## 1. What to optimise for

- **The whole screen, as the owner sees it.** Judge every change from a screenshot of the full screen.
  - "Every part is on the screen" is not the test.
  - The test: could a learner see what to do and what it means in about five seconds?
- **What helps the owner**
  - Pictures and moving things.
  - Finding the idea themselves, by trying values.
  - Calm, uncluttered screens.
  - About ten short practice rounds per new idea (Chapter 18's "Practice: ten short rounds" is the model).
  - Commander with typed answers only. Start with a few achievable examples, then require real working and varied attempts at university-level maths.
  - Movement must reveal a mathematical relationship: a submitted vector, angle, transformation, area or order. Avoid decorative motion as a substitute for teaching.
- **What gets in the way**
  - Jargon and story words standing in for maths words.
  - Long instructions.
  - Clutter: extra panels, boxes, buttons and repeated text.
- **Less is more.** Cut words before adding them.
- **If you are a helper agent:** your usual defaults are wrong here.
  - Do not write tests or optimise for them. Open the screen and look.
  - Do not write complete explanations. One short sentence beats three.
  - Do not invent phrasing. Use the words a textbook uses.

## 2. How the maths is written

Follow `docs/singular/ch18-plain-style.md` in every chapter you touch:

- Use maths words (matrix, vector, eigenvalue), not story words.
- Write it the way a textbook does:
  - vectors are stacked columns;
  - a number multiplying a vector sits outside it, on the left;
  - the matrix sits on the left of the vector.
- Every question is an equation with one box to fill.
- Feedback shows the calculation.

## 3. Checks: keep them light

- `npm run build` must pass. It runs the type check and the build, and the site cannot deploy without it.
- Do **not** write new test suites. `npm test` runs the existing ones; if one breaks because wording changed, update it.
- The real check is screenshots in a browser (Playwright with the pre-installed Chromium).
  - Look at each screenshot as the owner would, before reporting.

## 4. Scope

- Do what the owner asked. Do not rebuild a chapter unless the owner asks for that chapter.
- If a bigger change seems needed, say so in two lines and wait.

## 5. Reporting to the owner

- Review gameplay in **Commander**, using typed numbers. Dragging is not the owner's workflow.
- Show one problem's screenshots and findings at a time when calibrating a rebuild.
- Before working on Chapter 4, read `docs/singular/reviews/c04-first-three/review.json` for the typed-only rebuild, teaching rationale and current verification limits.
- Few words.
  - Bullets, bold headings on their own line, blank lines between sections.
- Screenshots one at a time, each with a short comment on what to notice.
- Say plainly what was not done or not checked.

## 6. Never

- Never republish the old production artifacts `GJA9T9nmKE8HxSLm37AWmz` or `3YB6RZN1TBihrZQ51qiwdF`. Previews go to a separate artifact.
- Never delete the project, branches or other work.
- Never put AI model names or IDs in anything pushed to the repository.
- Never push personal details (names, emails) or secrets: everything here is public.

## 7. Git flow

1. Make a new branch from `origin/main`.
2. Push with `git push -u origin <branch>`.
3. Open a PR into `main` and merge it once the build passes and the screens look right.
   - Merging runs `.github/workflows/pages.yml`, which publishes the live site.
   - When merging through the GitHub tools, `expectedHeadSha` must be the full 40-character SHA.

## 8. Where things are

- Live site: https://novakai-one.github.io/Concepts/ (the game is at `singular/`).
- Each game has the same set of folders:

  | What | Where |
  |---|---|
  | Page | `site/<game>/index.html` |
  | Code | `site/src/<game>/` |
  | Assets | `site/public/<game>/` |
  | Tools | `tools/<game>/` |
  | Tests | `tests/<game>/` |
  | Design notes | `docs/<game>/` |

- Shared helpers are in `site/src/lib/`. The front page that lists the games is `site/index.html`.
- SINGULAR:
  - Chapters are in `site/src/singular/content/chapters/<id>/`. Each `index.ts` lists the chapter's beats in order.
  - Textbook topic names (chapter map and search) are in `site/src/singular/content/topics.ts`.
  - Open any part directly with `singular/?chapter=c18&beat=3`.
  - In the browser console, `window.__game` offers:
    - `goto(id, beat)`, `solve()`, `state()`, `setAnimSpeed(x)`.
- Run locally:
  1. `npm install`
  2. `npm run dev`
  3. Open http://localhost:5173/singular/
- To build a preview page for a change that is not merged:
  1. `npm run build`
  2. `node tools/singular/artifact.mjs dist <outdir>`
  3. Publish `<outdir>/index.html` as a separate preview artifact.
