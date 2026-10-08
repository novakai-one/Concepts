// Acts of the story (GDD §6.1). Act 10 is the Epilogue.
// subtitle: the maths each act covers, in textbook words (shown on the chapter map).
import type { ActDef } from '../game/types';

export const ACTS: ActDef[] = [
  { num: 0, title: 'Prologue', subtitle: 'Start here', palette: 'void' },
  { num: 1, title: 'Drift', subtitle: 'Vectors, span, independence', palette: 'default' },
  { num: 2, title: 'Signal', subtitle: 'Dot and cross products, lines and planes', palette: 'teal' },
  { num: 3, title: 'The Ledger', subtitle: 'Linear systems and row reduction', palette: 'gold' },
  { num: 4, title: 'The Pulse', subtitle: 'Matrices, inverses, determinants', palette: 'violet' },
  { num: 5, title: 'Collapse', subtitle: 'Subspaces, basis, rank', palette: 'ember' },
  { num: 6, title: 'The Wrong Grid', subtitle: 'Change of basis', palette: 'copper' },
  { num: 7, title: 'Lines That Hold', subtitle: 'Eigenvalues, diagonalisation, Markov chains', palette: 'teal' },
  { num: 8, title: 'Shadows', subtitle: 'Orthogonality and least squares', palette: 'default' },
  { num: 9, title: 'Singular', subtitle: 'Symmetric matrices, SVD, PCA', palette: 'void' },
  { num: 10, title: 'Epilogue', subtitle: 'Linear algebra in AI', palette: 'gold' },
];
