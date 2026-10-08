# Chapter 18, Game 1 (`c18-p1`): latest screenshots

**How this works**

1. ChatGPT writes the text in `site/src/singular/content/chapters/c18-eigen/game1-copy.ts`, on a branch named `chatgpt/...`.
2. Claude puts it in the game word for word, plays the game, and replaces the screenshots below.
3. Older rounds stay in this folder's git history.

---

**This round: Claude rewrote the text (not ChatGPT)**

- The owner asked for the whole of Chapter 18 in plain maths, written the way a textbook writes it.
- So `game1-copy.ts` was rewritten by Claude. ChatGPT's `b17f025` wording is no longer used.
- The rules are in `docs/singular/ch18-plain-style.md`. In short:
  - maths words only (no pulse, Anchor, flight plan);
  - vectors stacked; a number multiplying a vector sits on its left; the matrix sits on the left;
  - every question is an equation with one box: $A\mathbf v = \boxed{?}\,\mathbf v$;
  - feedback shows the calculation: $2\begin{bmatrix}1\\1\end{bmatrix} = \begin{bmatrix}2\\2\end{bmatrix}$, not $\begin{bmatrix}3\\3\end{bmatrix}$.
- No dialogue around Game 1.
- The ship is hidden until the first vector, and the boxes start empty, so nothing suggests "go right".

Played on desktop, 1440 × 900. No console errors. Phone not checked.

**Preview of the whole chapter:** https://claude.ai/artifact/DrxF9oVAPp7dHmnemGBaww

- It opens at the start of Chapter 18.
- It is private to the owner.

---

## Screenshots

**1. First screen** — `1-first-screen.jpg`

**2. First test, $\mathbf v = \begin{bmatrix}1\\0\end{bmatrix}$** — `2-first-test.jpg`

**3. Wrong answer, 2** — `3-wrong-answer.jpg`

**4. Correct answer, 3** — `4-correct-answer.jpg`

**5. Both lines found** — `5-both-found.jpg`

---

**Text now behind "?" (shown only when the player asks)**

- `GAME1_UI.help`

**Known problems**

- None seen in this round.
