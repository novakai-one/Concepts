# Chapter 18: what we fixed, and why

**Read this before you change any chapter.**

- Git history shows the small changes. This file shows the reasons.
- It comes from the owner's own words while playing Chapter 18 over three days.
- Quotes are the owner's words, with spelling tidied.

---

## In one minute

- The owner learns by **seeing things move** and **typing numbers to test an idea**.
- The old Chapter 18 failed because the owner spent **90% of the time working out the screen**, not the maths.
- The causes:
  - clutter (27 things on one screen);
  - story words and odd phrasing in place of maths words;
  - long explanations;
  - visuals that did not mean anything;
  - answers you could guess.
- What fixed it:
  - a calm screen;
  - textbook words and notation;
  - type a vector, apply the matrix, watch where it lands;
  - about ten short practice rounds.
- The biggest agent mistake: **checking each part, never the whole screen**, and optimising for tests instead of the learner.

---

## 1. Who the learner is

- A computer science student, learning linear algebra from the start, up to university level.
- Wants to understand **why** it works, not memorise formulas.
- Plays on **Commander** (typing numbers, not dragging):
  > "I think dragging might reduce learning and thinking."
- Often **skips the story**. Every game must make sense without it.
  > "Ensure it works even if I skip story and only play in Commander."
- Plays on **phone and desktop**.

---

## 2. How the owner learns

**Pictures and movement**

> "The visuals are helping vs me reading it. And I like the moving things."

> "The whole point is to have visuals to learn."

**Trying numbers and being wrong**

> "I did 2 0 and it went to 10 8 and then 2 0.5 went to 12, 10.5 … I then on my own was able to be wrong visually … now I'm being forced to work through the pattern."

- The owner did not need to be told. They found the pattern by trying.

**Many short rounds**

- About ten rounds per idea, each with new numbers.
- This is where the idea finally clicked (see section 6).

**Not from explanations**

> "The thing that was getting in the way of my learning is your attempt to explain things - creating confusion."

> "Overall less is more with the drama and instructions."

**Real maths notation**

> "Try and write things in the same way that I'm likely to see it in the real world and in maths. Vectors get stacked. Multipliers outside of vectors. Matrices on the left then vector."

---

## 3. What went wrong, in the order the owner found it

**1. Not knowing what to do**

> "There's a lot on the screen and I'm unsure what I need to do or what I'm being asked."

- Why it mattered: no maths can start until the task is clear.

**2. "Show me" gave the answer with no reason**

> "It found two purple lines so I'm unsure why they were the right answer."

- Why: an answer without a reason teaches nothing.

**3. Pictures that explained nothing**

> "Why is my arrow pointing up and left. What does the yellow have to do with my green."

- Nothing on the picture said what each colour meant.
- The game chose the starting vector, so it looked random.

**4. Working the interface, not the maths. And guessing worked.**

> "I am still spending 90% of my time trying to figure out what to do in the game, and ultimately I can just guess and get it right half the time."

> "The second eigenvector I got immediately just by leaving the test 1 0 in there."

- The default value was the answer. That is a free win, and it teaches nothing.

**5. Only one practice**

> "A lot of time trying to figure out how to work the system, a little bit of time thinking and then just one practice."

**6. Names before meaning**

> "A student doesn't even know what an eigenvalue is."

- The drills used "eigenvector" before the player had found one.

**7. Meaningless visuals**

> "I am looking at 2 arrows and a line … I'll just click the ones where the green and yellow line are on the dotted line."

> "It's meaningless visuals."

- Six charts at once, three lines each, no labels, nothing moving.
- The player could match lines by eye. The chart was an answer key, not a lesson.

**8. Vectors written sideways**

> "Why are the vectors written horizontally - vectors should be written vertically."

**9. Clutter**

> "Almost 50% of the screen is covered with instructions. There are perhaps 17 things on the screen screaming for my attention."

> "The labels overlap with all of the beams … I don't know why I constantly need the title on every screen and then the menu never hides."

- A count of that screen found **27 things**. See section 4.

**10. Story words and bad English**

> "'Which lines does the pulse not turn?' It's horrible English."

> "'How many lines does this shear keep' is the worst wording."

> "The use of the game pulses and terminology has overshadowed any learning."

- The player had to learn two languages at once: the game's and the maths.

**11. A start that pointed the wrong way**

> "It made it seem like I needed to send the green line straight to the right, so when I did 1 0 the first time it seemed like I needed to keep going that way."

**12. Questions with no reference point**

> "Round 2 asked for my multiplier of -2, -2, but vs what."

> "For round 3 I don't understand what line 1, 1 × 3 means."

- A number was asked for without the equation it belonged to.

---

## 4. Why the screen got cluttered

**What was on one screen (27 things)**

- The act label and the chapter title.
- A goal card with a heading, a sentence, 3 goals and 3 stars.
- Log, Case board, Codex, Settings, Menu.
- The matrix, two help sentences, the vector boxes and Test.
- Number-entry help, a result line, a colour legend.
- A question box, an orange feedback message.
- Labels on the green arrow, the yellow arrow, the answer ring, the line, the Anchor.
- A beam glow.
- Reset, Hint, Show me, Skip.

**Why it happened**

- Each part was added for a good reason. Nobody judged the total.
- The agent checked parts one at a time: "Is this text right? Is this vector stacked?"
- It never asked: **"Is this screen calm, and can a person read it?"**
- Every fix **added** something: one more label, one more help line, one more button. Nothing was removed.

**The rule now**

- Judge the full screenshot, as the owner sees it.
- About 6 things on screen at once (9 at most).
- The chart is the main thing. Text is secondary.
- Nothing sits on top of the lines in the chart.

---

## 5. What fixed it

**Calm screen** (`calm: true` on the chapter)

- The title shows briefly, then fades.
- One ☰ menu. Only ☰, **Hint** and **More** show.
- The goal card folds to one line, such as "Goal · 1 of 3".
- Reset, Show me and Skip sit behind **More**. Fixed help sits behind **?**.
- A new message replaces the old one. Messages never stack up.
- At most 2 small labels on the chart, with no dark boxes, away from the lines.
- The glow is turned down, so the lines do not shout.

**Maths words and textbook notation**

- Matrix $A$, vector $\mathbf v$, apply $A$, line through $\mathbf v$.
- No pulse, Anchor, beacon or other story words in anything the player must read.
- Vectors stacked. A number sits outside the vector, on the left. The matrix sits on the left of the vector.
- Full rules: `docs/singular/ch18-plain-style.md`.

**Type, apply, watch** (Game 1)

- The boxes start empty. The player types any vector and presses **Apply $A$**.
- The grid moves and carries the vector with it. The player sees where it lands.
- A miss shows the calculation: $A\begin{bmatrix}1\\0\end{bmatrix} = \begin{bmatrix}2\\1\end{bmatrix}$. Off the line.
- The player finds the special vectors. The game does not hand them over.

**One colour, one meaning**

- Green = $\mathbf v$. Yellow = $A\mathbf v$. Labelled on the chart, not in a key.

**Every question is an equation with one box**

- $A\begin{bmatrix}1\\1\end{bmatrix} = \boxed{\ ?\ }\begin{bmatrix}1\\1\end{bmatrix}$
- Never "the multiplier" on its own.

**Feedback is the calculation plus a few words**

- A wrong answer shows what the player's number gives, next to what is true.

**Name it after finding it**

- "Eigenvector" and "eigenvalue" appear only after the player has found two such vectors.
- The name card quotes the player's own equations.

**Ten short rounds**

- "Practice: ten short rounds", each with a new matrix.
- Includes the cases that break the pattern: a negative number, a shear (one line), a rotation (no lines).
- The last rounds need the real calculation, not a guess.

---

## 6. The turning point

> "After doing the first puzzle and finally solving the eigenvector for round 9/10 using a quadratic formula - the one with
> $\begin{bmatrix}4&-2\\1&1\end{bmatrix}$ -
> … all of the 'vectors on the same line' finally clicked."

> "I am now excited to keep the project going."

**Why it worked**

- The same idea, ten times, with new numbers each time.
- The early rounds could be found by trying. Round 9 needed real working.
- The screen was calm, so all the effort went into the maths.

---

## 7. What a learning game needs

1. **The interface disappears.** A new player knows what to do within about 5 seconds, without reading a paragraph.
2. **Try first, then see.** Commit to an answer before the game shows it.
3. **Guessing must not pay.** Typed answers, not picked ones. Defaults are never the answer.
4. **Many short rounds, each a bit different.** About ten per idea.
5. **Help fades.** Shown once, then with a hint, then alone.
6. **A wrong answer gets a reason.** Show the calculation, not just "wrong".
7. **Name it last.** The word comes after the idea.

---

## 8. Mistakes agents made. Do not repeat them.

1. **Optimising for tests and logical correctness** instead of the learner.
   > "The priority is playability and design fidelity, not test coverage or documentation."
2. **Judging parts, not the whole screen.**
   > "I am looking for the overall screen - is that even possible for you to do."
3. **Over-explaining.** Long goal paragraphs, "complete" explanations, three sentences where one will do.
4. **Inventing phrasing.** "Pulse", "keep", "Anchor", "two pulses remain". Use the words a textbook uses.
5. **Using a term before the player has earned it.**
6. **Visuals as decoration or as an answer key.** Every line on the chart must mean something the player can see.
7. **Adding, never removing.** Each fix made the screen busier.
8. **Forgetting who the learner is** after a long session was summarised.
   > "It seems like during compaction at some stage you have forgotten what this project even is and who the user is."
   - This file and `CLAUDE.md` exist to stop that.
9. **Reporting badly.** Many screenshots at once, long status answers, approving changes without looking.
   > "Give me 1 screenshot with your commentary, then the next screenshot."
10. **Copying from an old branch.** Moving the game lost the latest Chapter 18 for a while. Always start from the latest `main`.
11. **Running reviews instead of letting the owner play.** The owner opening the game is the real test.

---

## 9. Checklist for every rebuilt chapter

Open each screen in a browser and look at the whole screenshot.

- [ ] Within 5 seconds, is it clear what to do?
- [ ] About 6 things on screen (9 at most)?
- [ ] No story words in anything the player must read?
- [ ] Vectors stacked; numbers on the left of vectors; the matrix on the left of the vector?
- [ ] Every question is an equation with one box?
- [ ] Every message is one short sentence, plus the calculation?
- [ ] Feedback shows the calculation?
- [ ] Guessing or leaving the defaults cannot pass?
- [ ] The term is named only after the player found the idea?
- [ ] About ten practice rounds, with new numbers and the cases that break the pattern?
- [ ] Works with the story skipped, on Commander, on a phone?
