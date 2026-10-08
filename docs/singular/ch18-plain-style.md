# Chapter 18: plain-maths style rules

The owner's feedback after playing: the visuals and the moving pieces help; the explanations, the story
words and the clutter get in the way. "Less is more." Write the way maths is written in the real world.

These rules apply to every screen in Chapter 18.

---

**1. Words**

- Use maths words, not story words.
  - matrix $A$, vector $\mathbf v$, origin, apply $A$, line through $\mathbf v$, number, eigenvector, eigenvalue.
  - Never: pulse, Anchor, corridor, flight plan, launch plan, waypoint, beacon, channel, calibrate, heading.
- "Turned" is fine: the picture shows it.
- One instruction per message. One short sentence where possible.
- Say what the screen cannot show. Do not repeat what it already shows.

**2. Notation**

- Vectors are stacked: $\begin{bmatrix}1\\1\end{bmatrix}$. Use `tv()` / `tcol()`; never `(1, 1)` for a vector.
- A number multiplying a vector sits outside it, on the left: $3\begin{bmatrix}1\\1\end{bmatrix}$.
- The matrix sits on the left of the vector: $A\mathbf v$, $\begin{bmatrix}2&1\\1&2\end{bmatrix}\begin{bmatrix}1\\0\end{bmatrix}$.
- Applying $A$ twice is $A(A\mathbf v)$, written $A^2\mathbf v$ once the player has seen it.
- Points that are only positions (the origin) may stay $(0, 0)$.

**3. Questions**

- Every question is an equation with one box to fill: $\begin{bmatrix}3\\3\end{bmatrix} = \boxed{\ ?\ }\begin{bmatrix}1\\1\end{bmatrix}$.
- Never ask for "the multiplier" without the equation it belongs to.

**4. Feedback**

- Show the calculation, not a description of it: $A\mathbf v = \begin{bmatrix}2&1\\1&2\end{bmatrix}\begin{bmatrix}1\\0\end{bmatrix} = \begin{bmatrix}2\\1\end{bmatrix}$.
- A wrong answer shows what the player's number gives next to what is true.

**5. Screen**

- The chart is the main thing. About 6–9 things on screen at once.
- Chart labels: $\mathbf v$, $A\mathbf v$, and a found line's equation ($A\mathbf v = 3\mathbf v$). No dark boxes.
- Fixed help sits behind **?**. Reset, Show me and Skip sit behind **More**.

**6. Story**

- Dialogue is short and optional. It never carries an instruction the player needs.
